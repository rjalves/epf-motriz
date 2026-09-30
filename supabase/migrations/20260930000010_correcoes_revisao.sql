-- Correções da revisão final (30/09/2026). Também em ../database/003_correcoes_revisao.sql.

-- Assentimento: a sessão só é criada depois do aceite do TALE na tela; registra o momento.
alter table public.sessao add column if not exists assentiu_em timestamptz not null default now();
comment on column public.sessao.assentiu_em is 'Momento da criação da sessão, logo após o aceite do termo de assentimento (TALE).';

-- Coleta fechada ou janela encerrada também barram quem já começou (salvar e concluir).
create or replace function public.sessao_autorizada(p_sessao uuid, p_token text) returns public.sessao
language plpgsql stable security definer set search_path = public, extensions as $$
declare s sessao; c campanha;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'sessao_invalida' using errcode = 'P0001'; end if;
  select * into s from sessao where id = p_sessao and token_hash = digest(decode(p_token, 'hex'), 'sha256');
  if not found then raise exception 'sessao_invalida' using errcode = 'P0001'; end if;
  if s.status <> 'em_andamento' then raise exception 'sessao_encerrada' using errcode = 'P0001'; end if;
  select * into c from campanha where id = s.campanha_id;
  if not c.aberta or current_date not between c.janela_inicio and c.janela_fim then
    raise exception 'campanha_fechada' using errcode = 'P0001';
  end if;
  return s;
end $$;

-- Convite: a Edge Function recusa e-mail já cadastrado antes de chamar o Auth (evita apagar usuário alheio).
create function public.email_ja_cadastrado(p_email text) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from auth.users where lower(email) = lower(btrim(p_email)))
$$;
revoke execute on function public.email_ja_cadastrado(text) from public, anon, authenticated;
grant execute on function public.email_ja_cadastrado(text) to service_role;

-- Exportação de respostas fica registrada na auditoria.
create function public.registrar_exportacao(p_campanha text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not ve_respostas() then raise exception 'sem_permissao' using errcode = '42501'; end if;
  insert into auditoria (user_id, acao, alvo) values (auth.uid(), 'exportar_respostas', p_campanha);
end $$;

-- Importação do plano amostral: transacional, substitui (remove escolas ausentes do arquivo),
-- não move escola de outra rede e não apaga regional existente quando o arquivo não traz a coluna.
create function public.importar_plano(p_campanha uuid, p_escolas jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_rede uuid; e jsonb; v_reg uuid; v_existente uuid; n int := 0; removidas int;
begin
  if not eh_admin() then raise exception 'sem_permissao' using errcode = '42501'; end if;
  select rede_id into v_rede from campanha where id = p_campanha;
  if not found then raise exception 'campanha_inexistente' using errcode = 'P0001'; end if;

  for e in select * from jsonb_array_elements(p_escolas) loop
    select rede_id into v_existente from escola where co_inep = (e ->> 'co_inep')::int;
    if found and v_existente <> v_rede then
      raise exception 'escola_de_outra_rede: %', e ->> 'co_inep' using errcode = 'P0001';
    end if;
    v_reg := null;
    if coalesce(e ->> 'regional', '') <> '' then
      insert into regional (rede_id, nome) values (v_rede, e ->> 'regional')
      on conflict (rede_id, nome) do update set nome = excluded.nome
      returning id into v_reg;
    end if;
    insert into escola (co_inep, rede_id, regional_id, nome, municipio, eti, localizacao, pct_ppi, latitude, longitude)
    values ((e ->> 'co_inep')::int, v_rede, v_reg, e ->> 'nome', e ->> 'municipio', (e ->> 'eti')::boolean,
            e ->> 'localizacao', (e ->> 'pct_ppi')::numeric, (e ->> 'latitude')::float8, (e ->> 'longitude')::float8)
    on conflict (co_inep) do update set
      regional_id = coalesce(excluded.regional_id, escola.regional_id), nome = excluded.nome,
      municipio = coalesce(excluded.municipio, escola.municipio), eti = coalesce(excluded.eti, escola.eti),
      localizacao = coalesce(excluded.localizacao, escola.localizacao), pct_ppi = coalesce(excluded.pct_ppi, escola.pct_ppi),
      latitude = coalesce(excluded.latitude, escola.latitude), longitude = coalesce(excluded.longitude, escola.longitude);
    insert into escola_campanha (campanha_id, co_inep, in_amostra, categoria, qt_mat_6, qt_mat_9, turmas_6, turmas_9, parecer, justificativa)
    values (p_campanha, (e ->> 'co_inep')::int, coalesce((e ->> 'in_amostra')::boolean, true), e ->> 'categoria',
            coalesce((e ->> 'qt_mat_6')::numeric::int, 0), coalesce((e ->> 'qt_mat_9')::numeric::int, 0),
            (e ->> 'turmas_6')::numeric::int, (e ->> 'turmas_9')::numeric::int, e ->> 'parecer', e ->> 'justificativa')
    on conflict (campanha_id, co_inep) do update set
      in_amostra = excluded.in_amostra, categoria = excluded.categoria, qt_mat_6 = excluded.qt_mat_6, qt_mat_9 = excluded.qt_mat_9,
      turmas_6 = excluded.turmas_6, turmas_9 = excluded.turmas_9, parecer = excluded.parecer, justificativa = excluded.justificativa;
    n := n + 1;
  end loop;

  delete from escola_campanha where campanha_id = p_campanha
    and co_inep not in (select (x ->> 'co_inep')::int from jsonb_array_elements(p_escolas) x);
  get diagnostics removidas = row_count;
  insert into auditoria (user_id, acao, alvo) values (auth.uid(), 'importar_plano', p_campanha || ': ' || n || ' escolas, ' || removidas || ' removidas');
  return jsonb_build_object('escolas', n, 'removidas', removidas);
end $$;

grant execute on function public.registrar_exportacao(text), public.importar_plano(uuid, jsonb) to authenticated;
grant execute on function public.email_ja_cadastrado(text), public.registrar_exportacao(text), public.importar_plano(uuid, jsonb) to service_role;
