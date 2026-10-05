-- Login por código de 6 dígitos sem o Auth do Supabase: o banco gera o código, envia o e-mail direto
-- para a API do Resend (pg_net) com o modelo do EPF e, ao conferir o código, emite a sessão (JWT HS256
-- assinado com o mesmo segredo do Supabase, então RLS e auth.uid() continuam valendo).
create extension if not exists pg_net;

-- Configuração privada (chave do Resend, remetente, endereço do site). Ninguém lê pela API.
create table public.config_privada (chave text primary key, valor text not null);
comment on table public.config_privada is 'Segredos e parâmetros do envio de e-mail. Só o banco lê. Chaves: resend_api_key, email_remetente, site_url, resend_url, intervalo_codigo_segundos, jwt_secret (opcional).';
create table public.modelo_email (tipo text primary key, assunto text not null, html text not null);
comment on table public.modelo_email is 'Modelos de e-mail (gerados por scripts/gerar-emails.ts). Variáveis no formato {{ .Nome }}.';
create table public.codigo_acesso (
  email text primary key,
  codigo_hash bytea not null,
  expira_em timestamptz not null,
  tentativas integer not null default 0,
  enviado_em timestamptz not null default now()
);
comment on table public.codigo_acesso is 'Código de acesso pendente por e-mail (só o hash). Apagado ao entrar.';
create table public.envio_email (
  id bigserial primary key,
  para text not null,
  tipo text not null,
  request_id bigint,
  criado_em timestamptz not null default now()
);
comment on table public.envio_email is 'E-mails entregues ao pg_net. Resposta do Resend: net._http_response (id = request_id).';

alter table public.config_privada enable row level security;
alter table public.modelo_email enable row level security;
alter table public.codigo_acesso enable row level security;
alter table public.envio_email enable row level security;
revoke all on public.config_privada, public.modelo_email, public.codigo_acesso, public.envio_email from public, anon, authenticated;

create function public._config(p_chave text) returns text
language sql stable security definer set search_path = public as $$
  select nullif(btrim(valor), '') from config_privada where chave = p_chave
$$;

create function public._b64url(p bytea) returns text
language sql immutable as $$ select rtrim(translate(encode(p, 'base64'), E'+/\n', '-_'), '=') $$;

-- Monta assunto e HTML do modelo trocando {{ .Variavel }}; valores escapados para HTML.
create function public._montar_email(p_tipo text, p_vars jsonb, out assunto text, out html text)
language plpgsql stable security definer set search_path = public as $$
declare k text; v text;
begin
  select m.assunto, m.html into assunto, html from modelo_email m where m.tipo = p_tipo;
  if html is null then raise exception 'modelo_email_inexistente: %', p_tipo; end if;
  p_vars := jsonb_build_object('SiteURL', coalesce(_config('site_url'), 'http://localhost:5173')) || p_vars;
  for k, v in select key, value from jsonb_each_text(p_vars) loop
    v := replace(replace(replace(replace(coalesce(v, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
    html := replace(html, '{{ .' || k || ' }}', v);
    assunto := replace(assunto, '{{ .' || k || ' }}', v);
  end loop;
end $$;

-- Entrega o e-mail ao pg_net (assíncrono) para a API do Resend.
create function public._enviar_email(p_para text, p_tipo text, p_vars jsonb) returns bigint
language plpgsql volatile security definer set search_path = public, extensions as $$
declare m record; v_chave text := _config('resend_api_key'); v_req bigint;
begin
  if v_chave is null then raise exception 'email_nao_configurado'; end if;
  select * into m from _montar_email(p_tipo, p_vars);
  v_req := net.http_post(
    url := coalesce(_config('resend_url'), 'https://api.resend.com/emails'),
    body := jsonb_build_object('from', coalesce(_config('email_remetente'), 'EPF <nao-responda@epf.motriz.org>'),
                               'to', jsonb_build_array(p_para), 'subject', m.assunto, 'html', m.html),
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_chave, 'Content-Type', 'application/json'));
  insert into envio_email (para, tipo, request_id) values (p_para, p_tipo, v_req);
  return v_req;
end $$;

-- Gera um código novo para o e-mail (substitui o anterior) e devolve o código em claro só para quem chamou.
create function public._novo_codigo(p_email text) returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare v text := lpad((('x' || lpad(encode(gen_random_bytes(4), 'hex'), 16, '0'))::bit(64)::bigint % 1000000)::text, 6, '0');
begin
  insert into codigo_acesso (email, codigo_hash, expira_em, tentativas, enviado_em)
  values (p_email, digest(p_email || ':' || v, 'sha256'), now() + interval '1 hour', 0, now())
  on conflict (email) do update set codigo_hash = excluded.codigo_hash, expira_em = excluded.expira_em,
    tentativas = 0, enviado_em = excluded.enviado_em;
  return v;
end $$;

create function public._usuario_com_acesso(p_email text) returns uuid
language sql stable security definer set search_path = public, auth as $$
  select u.id from auth.users u join perfil p on p.user_id = u.id where lower(u.email) = p_email and p.ativo limit 1
$$;

create function public._jwt(p_claims jsonb) returns text
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_segredo text := coalesce(_config('jwt_secret'), nullif(current_setting('app.settings.jwt_secret', true), ''));
  v_dados text;
begin
  if v_segredo is null then raise exception 'jwt_nao_configurado'; end if;
  v_dados := _b64url(convert_to('{"alg":"HS256","typ":"JWT"}', 'utf8')) || '.' || _b64url(convert_to(p_claims::text, 'utf8'));
  return v_dados || '.' || _b64url(hmac(v_dados, v_segredo, 'sha256'));
end $$;

-- Visitante pede o código: só para e-mail com perfil ativo, no máximo um a cada intervalo.
create function public.pedir_codigo(p_email text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare v_email text := lower(btrim(p_email));
begin
  if _usuario_com_acesso(v_email) is null then raise exception 'sem_acesso'; end if;
  if exists (select 1 from codigo_acesso where email = v_email
             and enviado_em > now() - make_interval(secs => coalesce(_config('intervalo_codigo_segundos')::int, 60))) then
    raise exception 'aguarde';
  end if;
  perform _enviar_email(v_email, 'codigo', jsonb_build_object('Token', _novo_codigo(v_email), 'Email', v_email));
end $$;

-- Confere o código (5 tentativas, 1 hora, uso único) e devolve a sessão de 12 horas.
-- Não levanta exceção no erro, para a contagem de tentativas não ser desfeita.
create function public.entrar_com_codigo(p_email text, p_codigo text) returns jsonb
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_email text := lower(btrim(p_email));
  c codigo_acesso;
  v_user uuid;
  v_exp bigint := extract(epoch from now() + interval '12 hours')::bigint;
begin
  select * into c from codigo_acesso where email = v_email for update;
  if not found or c.expira_em < now() then return jsonb_build_object('erro', 'codigo_invalido'); end if;
  if c.codigo_hash <> digest(v_email || ':' || btrim(coalesce(p_codigo, '')), 'sha256') then
    if c.tentativas + 1 >= 5 then delete from codigo_acesso where email = v_email;
    else update codigo_acesso set tentativas = tentativas + 1 where email = v_email; end if;
    return jsonb_build_object('erro', 'codigo_invalido');
  end if;
  delete from codigo_acesso where email = v_email;
  v_user := _usuario_com_acesso(v_email);
  if v_user is null then return jsonb_build_object('erro', 'sem_acesso'); end if;
  return jsonb_build_object('user_id', v_user, 'email', v_email, 'expires_at', v_exp,
    'access_token', _jwt(jsonb_build_object('aud', 'authenticated', 'role', 'authenticated', 'sub', v_user, 'email', v_email,
                                            'iat', extract(epoch from now())::bigint, 'exp', v_exp)));
end $$;

-- Convite: além de criar o acesso, envia o e-mail de convite com um código de primeiro acesso.
drop function if exists public.convidar_usuario(text, text, public.papel, uuid, uuid, integer);
create function public.convidar_usuario(p_email text, p_nome text, p_papel public.papel,
  p_rede uuid default null, p_regional uuid default null, p_co_inep integer default null) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  v_email text := lower(btrim(p_email));
  v_id uuid := gen_random_uuid();
  v_enviado boolean := true;
begin
  if auth.uid() is null or not pode_gerir(p_papel, p_rede) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'email_invalido'; end if;
  if email_ja_cadastrado(v_email) then raise exception 'email_ja_cadastrado'; end if;

  -- auth.users continua sendo a lista de usuários (perfil.user_id aponta para ela).
  if exists (select 1 from information_schema.columns
             where table_schema = 'auth' and table_name = 'users' and column_name = 'email_confirmed_at') then
    insert into auth.users (id, email, instance_id, aud, role, email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change)
    values (v_id, v_email, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now(), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('nome', btrim(p_nome)), '', '', '', '');
  else
    insert into auth.users (id, email) values (v_id, v_email);
  end if;

  insert into perfil (user_id, papel, nome, rede_id, regional_id, co_inep, criado_por)
  values (v_id, p_papel, nullif(btrim(p_nome), ''), p_rede, p_regional, p_co_inep, auth.uid());
  insert into auditoria (user_id, acao, alvo) values (auth.uid(), 'convidar_usuario', v_email || ' (' || p_papel || ')');

  begin  -- falha no envio não desfaz o acesso: a pessoa pode pedir o código na tela de login
    perform _enviar_email(v_email, 'convite', jsonb_build_object('Token', _novo_codigo(v_email), 'Email', v_email,
      'Nome', coalesce(nullif(btrim(p_nome), ''), v_email),
      'Perfil', case p_papel when 'admin' then 'Admin Motriz' when 'gestor_rede' then 'Gestor da rede'
                  when 'regional' then 'Regional' when 'escola' then 'Ponto focal da escola' else 'Pesquisador' end));
  exception when others then v_enviado := false;
  end;
  return jsonb_build_object('user_id', v_id, 'email_enviado', v_enviado);
end $$;

revoke execute on function public._config(text), public._montar_email(text, jsonb), public._enviar_email(text, text, jsonb),
  public._novo_codigo(text), public._usuario_com_acesso(text), public._jwt(jsonb) from public, anon, authenticated;
revoke execute on function public.pedir_codigo(text), public.entrar_com_codigo(text, text),
  public.convidar_usuario(text, text, public.papel, uuid, uuid, integer) from public;
grant execute on function public.pedir_codigo(text), public.entrar_com_codigo(text, text) to anon, authenticated;
grant execute on function public.convidar_usuario(text, text, public.papel, uuid, uuid, integer) to authenticated;
