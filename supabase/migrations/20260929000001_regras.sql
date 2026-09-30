create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

-- =============================================================================
-- 1. Funções de regra (imutáveis; usadas em colunas geradas)
-- =============================================================================

create function public.normaliza_texto(t text) returns text
language sql immutable as $$
  select nullif(upper(regexp_replace(btrim(t), '\s+', ' ', 'g')), '')
$$;
comment on function public.normaliza_texto(text) is 'Trim, espaços colapsados e maiúsculas; vazio vira null.';

-- O dicionário explícito torna unaccent utilizável numa função immutable.
create function public.normaliza_nome(t text) returns text
language sql immutable as $$
  select public.normaliza_texto(extensions.unaccent('extensions.unaccent'::regdictionary, t))
$$;
comment on function public.normaliza_nome(text) is 'Chave de deduplicação do estudante: "João  Silva" = "JOAO SILVA".';

create function public.idade_em(nascimento date, referencia date) returns int
language sql immutable as $$
  select extract(year from age(referencia, nascimento))::int
$$;

