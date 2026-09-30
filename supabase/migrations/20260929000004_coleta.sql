-- =============================================================================
-- 4. Campanha, plano amostral e coleta
-- =============================================================================

create table public.campanha (
  id uuid primary key default gen_random_uuid(),
  rede_id uuid not null references public.rede on delete cascade,
  numero smallint not null check (numero > 0),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  instrumento_versao_id uuid not null references public.instrumento_versao on update cascade,
  janela_inicio date not null,
  janela_fim date not null check (janela_fim >= janela_inicio),
  series smallint[] not null default '{6,9}',
  meta_pct numeric(3, 2) not null default 0.85 check (meta_pct > 0 and meta_pct <= 1),
  aberta boolean not null default false,
  recusas integer not null default 0,
  status_pactuacao text,
  observacao text,
  unique (rede_id, numero)
);
comment on table public.campanha is 'Aplicação da pesquisa numa rede. slug = endereço do link /responder/<slug>.';

create table public.escola_campanha (
  campanha_id uuid not null references public.campanha on delete cascade,
  co_inep integer not null references public.escola on delete cascade,
  in_amostra boolean not null,
  categoria text,
  qt_mat_6 integer not null default 0 check (qt_mat_6 >= 0),
  qt_mat_7 integer not null default 0 check (qt_mat_7 >= 0),
  qt_mat_8 integer not null default 0 check (qt_mat_8 >= 0),
  qt_mat_9 integer not null default 0 check (qt_mat_9 >= 0),
  turmas_6 integer,
  turmas_9 integer,
  meta_manual integer check (meta_manual >= 0),
  parecer text,
  justificativa text,
  primary key (campanha_id, co_inep)
);
comment on table public.escola_campanha is 'Plano amostral: escolas da campanha, matrículas e meta.';
create index escola_campanha_inep on public.escola_campanha (co_inep);

-- Pseudônimo: nada aqui identifica o estudante.
create table public.sessao (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references public.campanha on delete cascade,
  co_inep integer not null references public.escola,
  serie smallint not null check (serie between 6 and 9),
  idade smallint not null check (idade between 9 and 18),
  token_hash bytea not null,
  autorizacao_responsavel boolean not null default false,
  blocos_salvos text[] not null default '{}',
  status text not null default 'em_andamento' check (status in ('em_andamento', 'concluida', 'anulada')),
  iniciado_em timestamptz not null default now(),
  concluido_em timestamptz
);
comment on table public.sessao is 'Resposta de um estudante (pseudônimo). Sem nome, contato ou data de nascimento.';
create index sessao_campanha_escola on public.sessao (campanha_id, co_inep, status);

-- Dados pessoais. Único vínculo com as respostas: sessao_id. Só o admin acessa, por função auditada.
create table public.participante (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references public.campanha on delete cascade,
  co_inep integer not null references public.escola,
  serie smallint not null,
  nome text not null check (length(btrim(nome)) >= 3),
  nome_norm text generated always as (public.normaliza_nome(nome)) stored,
  data_nascimento date not null,
  email text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telefone text check (telefone ~ '^[0-9]{10,11}$'),
  sessao_id uuid not null unique references public.sessao on delete cascade,
  criado_em timestamptz not null default now(),
  unique (campanha_id, co_inep, nome_norm, data_nascimento)
);
comment on table public.participante is 'Cadastro pessoal do estudante (LGPD). Separado das respostas; leitura só pelo admin via ver_participantes().';

create table public.resposta_item (
  sessao_id uuid not null references public.sessao on delete cascade,
  item_id uuid not null references public.item,
  valor jsonb not null,
  respondido_em timestamptz not null default now(),
  primary key (sessao_id, item_id)
);
comment on table public.resposta_item is 'Resposta por item: "opção" | ["op1","op2"] | "texto" | número.';
create index resposta_item_item on public.resposta_item (item_id);

-- ---------- Funções públicas da coleta (chamadas pelo estudante, papel anon) ----------

create function public.instrumento_da_campanha(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'campanha', jsonb_build_object(
      'slug', c.slug, 'rede', r.nome, 'janela_inicio', c.janela_inicio, 'janela_fim', c.janela_fim, 'series', c.series,
      'situacao', case when not c.aberta then 'fechada'
                       when current_date < c.janela_inicio then 'nao_iniciada'
                       when current_date > c.janela_fim then 'encerrada' else 'aberta' end),
    'escolas', (select coalesce(jsonb_agg(jsonb_build_object('co_inep', e.co_inep, 'nome', e.nome) order by e.nome), '[]')
                from escola_campanha ec join escola e using (co_inep) where ec.campanha_id = c.id),
    'blocos', (select coalesce(jsonb_agg(jsonb_build_object(
                 'codigo', b.codigo, 'titulo', b.titulo, 'introducao', b.introducao, 'series', b.series,
                 'itens', (select jsonb_agg(jsonb_build_object(
                             'codigo', i.codigo, 'enunciado', i.enunciado, 'orientacao', i.orientacao, 'tipo', i.tipo,
                             'opcoes', i.opcoes, 'max_escolhas', i.max_escolhas, 'obrigatorio', i.obrigatorio,
                             'depende_de', i.depende_de) order by i.ordem)
                           from item i where i.bloco_id = b.id)) order by b.ordem), '[]')
               from bloco b where b.versao_id = c.instrumento_versao_id))
  from campanha c join rede r on r.id = c.rede_id
  where c.slug = p_slug
$$;

create function public.iniciar_sessao(
  p_slug text, p_co_inep integer, p_serie smallint, p_nome text, p_nascimento date,
  p_email text default null, p_telefone text default null, p_autorizacao_responsavel boolean default false
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  c campanha; v_idade int; v_token bytea := gen_random_bytes(32); v_part participante; v_sessao sessao;
begin
  select * into c from campanha where slug = p_slug;
  if not found then raise exception 'campanha_inexistente' using errcode = 'P0001'; end if;
  if not c.aberta or current_date not between c.janela_inicio and c.janela_fim then
    raise exception 'campanha_fechada' using errcode = 'P0001'; end if;
  if not exists (select 1 from escola_campanha where campanha_id = c.id and co_inep = p_co_inep) then
    raise exception 'escola_invalida' using errcode = 'P0001'; end if;
  if not (p_serie = any (c.series)) then raise exception 'serie_invalida' using errcode = 'P0001'; end if;
  v_idade := idade_em(p_nascimento, current_date);
  if v_idade is null or v_idade not between 9 and 18 then raise exception 'idade_invalida' using errcode = 'P0001'; end if;
  if v_idade < 12 and not coalesce(p_autorizacao_responsavel, false) then
    raise exception 'autorizacao_necessaria' using errcode = 'P0001'; end if;

  select * into v_part from participante
  where campanha_id = c.id and co_inep = p_co_inep and nome_norm = normaliza_nome(p_nome) and data_nascimento = p_nascimento;
  if found then
    select * into v_sessao from sessao where id = v_part.sessao_id;
    if v_sessao.status <> 'em_andamento' then raise exception 'ja_respondeu' using errcode = 'P0001'; end if;
    -- Retomada: novo token (o antigo deixa de valer). Não devolve respostas já dadas.
    update sessao set token_hash = digest(v_token, 'sha256') where id = v_sessao.id;
    return jsonb_build_object('sessao_id', v_sessao.id, 'token', encode(v_token, 'hex'), 'retomada', true,
                              'serie', v_sessao.serie, 'blocos_salvos', to_jsonb(v_sessao.blocos_salvos));
  end if;

  insert into sessao (campanha_id, co_inep, serie, idade, token_hash, autorizacao_responsavel)
  values (c.id, p_co_inep, p_serie, v_idade, digest(v_token, 'sha256'), coalesce(p_autorizacao_responsavel, false))
  returning * into v_sessao;
  insert into participante (campanha_id, co_inep, serie, nome, data_nascimento, email, telefone, sessao_id)
  values (c.id, p_co_inep, p_serie, btrim(p_nome), p_nascimento, nullif(btrim(p_email), ''),
          nullif(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), ''), v_sessao.id);
  return jsonb_build_object('sessao_id', v_sessao.id, 'token', encode(v_token, 'hex'), 'retomada', false,
                            'serie', p_serie, 'blocos_salvos', '[]'::jsonb);
end $$;

create function public.registrar_recusa(p_slug text) returns void
language sql security definer set search_path = public as $$
  update campanha set recusas = recusas + 1 where slug = p_slug and aberta
$$;

