-- =============================================================================
-- 2. Território e perfis
-- =============================================================================

create table public.rede (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  uf char(2) not null,
  esfera text not null default 'municipal' check (esfera in ('municipal', 'estadual')),
  pulso_matematica boolean not null default false
);
comment on table public.rede is 'Rede de ensino (secretaria municipal ou estadual).';

create table public.regional (
  id uuid primary key default gen_random_uuid(),
  rede_id uuid not null references public.rede on delete cascade,
  nome text not null,
  unique (rede_id, nome)
);
comment on table public.regional is 'Órgão regional, distrito ou zona da rede.';

create table public.escola (
  co_inep integer primary key,
  rede_id uuid not null references public.rede on delete cascade,
  regional_id uuid references public.regional on delete set null,
  nome text not null,
  municipio text,
  eti boolean,
  localizacao text,
  pct_ppi numeric(5, 4),
  latitude double precision,
  longitude double precision
);
comment on table public.escola is 'Escola identificada pelo código INEP.';
create index escola_rede on public.escola (rede_id);
create index escola_regional on public.escola (regional_id);

create type public.papel as enum ('admin', 'gestor_rede', 'regional', 'escola', 'pesquisador');

create table public.perfil (
  user_id uuid primary key references auth.users on delete cascade,
  papel public.papel not null,
  nome text,
  rede_id uuid references public.rede on delete cascade,
  regional_id uuid references public.regional on delete cascade,
  co_inep integer references public.escola on delete cascade,
  ativo boolean not null default true,
  criado_por uuid references auth.users on delete set null,
  criado_em timestamptz not null default now(),
  check (case papel
    when 'gestor_rede' then rede_id is not null and regional_id is null and co_inep is null
    when 'regional' then rede_id is not null and regional_id is not null and co_inep is null
    when 'escola' then rede_id is not null and co_inep is not null
    else rede_id is null and regional_id is null and co_inep is null end)
);
comment on table public.perfil is 'Papel e escopo de cada usuário do painel (1 por usuário).';
create index perfil_rede on public.perfil (rede_id);

-- A regional/escola do escopo tem de pertencer à rede do perfil.
create function public.valida_escopo_perfil() returns trigger
language plpgsql as $$
begin
  if (new.regional_id is not null and not exists (
        select 1 from public.regional where id = new.regional_id and rede_id = new.rede_id))
     or (new.co_inep is not null and not exists (
        select 1 from public.escola where co_inep = new.co_inep and rede_id = new.rede_id)) then
    raise exception 'escopo_incoerente' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger perfil_escopo before insert or update on public.perfil
for each row execute function public.valida_escopo_perfil();

create table public.auditoria (
  id bigint generated always as identity primary key,
  user_id uuid,
  acao text not null,
  alvo text,
  em timestamptz not null default now()
);
comment on table public.auditoria is 'Convites, mudanças de perfil, leitura de cadastro pessoal, importações.';
create index auditoria_em on public.auditoria (em desc);

-- ---------- Funções de permissão (security definer: leem perfil sem passar pelo RLS) ----------

create function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfil where user_id = auth.uid() and ativo and papel = 'admin')
$$;

create function public.ve_respostas() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfil where user_id = auth.uid() and ativo and papel in ('admin', 'pesquisador'))
$$;

create function public.pode_ver_rede(p_rede uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfil p where p.user_id = auth.uid() and p.ativo
                 and (p.papel in ('admin', 'pesquisador') or p.rede_id = p_rede))
$$;

-- Única fonte de verdade da visibilidade por escola (RLS e views usam esta função).
create function public.pode_ver_escola(p_inep integer) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfil p join escola e on e.co_inep = p_inep
    where p.user_id = auth.uid() and p.ativo and (
         p.papel in ('admin', 'pesquisador')
      or (p.papel = 'gestor_rede' and p.rede_id = e.rede_id)
      or (p.papel = 'regional' and p.regional_id = e.regional_id)
      or (p.papel = 'escola' and p.co_inep = e.co_inep)))
$$;

-- Rede que o usuário gere (evita recursão na policy de perfil).
create function public.rede_gerida() returns uuid
language sql stable security definer set search_path = public as $$
  select rede_id from perfil where user_id = auth.uid() and ativo and papel = 'gestor_rede'
$$;

create function public.pode_gerir(alvo_papel public.papel, alvo_rede uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfil p where p.user_id = auth.uid() and p.ativo and (
       p.papel = 'admin'
    or (p.papel = 'gestor_rede' and alvo_papel in ('regional', 'escola') and alvo_rede = p.rede_id)))
$$;

create function public.definir_ativo(p_user uuid, p_ativo boolean) returns void
language plpgsql security definer set search_path = public as $$
declare alvo perfil;
begin
  select * into alvo from perfil where user_id = p_user;
  if not found or p_user = auth.uid() or not pode_gerir(alvo.papel, alvo.rede_id) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  update perfil set ativo = p_ativo where user_id = p_user;
  insert into auditoria (user_id, acao, alvo)
  values (auth.uid(), case when p_ativo then 'ativar_usuario' else 'desativar_usuario' end, p_user::text);
end $$;

