-- =============================================================================
-- 3. Instrumento versionado
-- =============================================================================

create type public.tipo_item as enum ('likert5', 'unica', 'multipla', 'texto', 'numero');

create table public.instrumento_versao (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  criado_em timestamptz not null default now()
);
comment on table public.instrumento_versao is 'Versão do questionário. Revisão do instrumento = nova versão.';

create table public.bloco (
  id uuid primary key default gen_random_uuid(),
  versao_id uuid not null references public.instrumento_versao on delete cascade on update cascade,
  codigo text not null,
  titulo text not null,
  introducao text,
  ordem integer not null,
  series smallint[],
  unique (versao_id, codigo),
  unique (versao_id, ordem)
);
comment on table public.bloco is 'Parte do questionário (A–I). series null = todas; {6} = só 6º ano.';

create table public.item (
  id uuid primary key default gen_random_uuid(),
  bloco_id uuid not null references public.bloco on delete cascade,
  codigo text not null,
  ordem integer not null,
  enunciado text not null,
  orientacao text,
  tipo public.tipo_item not null,
  opcoes jsonb not null default '[]',
  max_escolhas integer check (max_escolhas > 0),
  obrigatorio boolean not null default true,
  reverso boolean not null default false,
  construto text,
  depende_de jsonb,
  unique (bloco_id, codigo),
  unique (bloco_id, ordem),
  check (tipo <> 'multipla' or max_escolhas is not null),
  check (tipo not in ('likert5', 'unica', 'multipla') or jsonb_array_length(opcoes) >= 2)
);
comment on table public.item is 'Pergunta. opcoes = lista de rótulos; depende_de = {"item":"A9","valor":"Sim"}.';

create function public._importar_instrumento(p_nome text, p_def jsonb) returns uuid
language plpgsql as $$
declare
  v uuid; b jsonb; bid uuid; i jsonb; bo int := 0; io int;
  likert constant jsonb := '["Discordo muito","Discordo","Mais ou menos","Concordo","Concordo muito"]';
begin
  insert into public.instrumento_versao (nome) values (p_nome) returning id into v;
  for b in select * from jsonb_array_elements(p_def -> 'blocos') loop
    bo := bo + 1;
    insert into public.bloco (versao_id, codigo, titulo, introducao, ordem, series)
    values (v, b ->> 'codigo', b ->> 'titulo', b ->> 'introducao', bo,
            case when jsonb_typeof(b -> 'series') = 'array'
                 then array(select jsonb_array_elements_text(b -> 'series'))::smallint[] end)
    returning id into bid;
    io := 0;
    for i in select * from jsonb_array_elements(b -> 'itens') loop
      io := io + 1;
      insert into public.item (bloco_id, codigo, ordem, enunciado, orientacao, tipo, opcoes, max_escolhas,
                               obrigatorio, reverso, construto, depende_de)
      values (bid, i ->> 'codigo', io, i ->> 'enunciado', i ->> 'orientacao', (i ->> 'tipo')::public.tipo_item,
              coalesce(nullif(i -> 'opcoes', '[]'::jsonb),
                       case when i ->> 'tipo' = 'likert5' then likert end, '[]'::jsonb),
              (i ->> 'max_escolhas')::int,
              coalesce((i ->> 'obrigatorio')::boolean, true),
              coalesce((i ->> 'reverso')::boolean, false),
              i ->> 'construto',
              case when jsonb_typeof(i -> 'depende_de') = 'object' then i -> 'depende_de' end);
    end loop;
  end loop;
  return v;
end $$;

create function public.importar_instrumento(p_nome text, p_def jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if not eh_admin() then raise exception 'sem_permissao' using errcode = '42501'; end if;
  insert into auditoria (user_id, acao, alvo) values (auth.uid(), 'importar_instrumento', p_nome);
  return _importar_instrumento(p_nome, p_def);
end $$;

