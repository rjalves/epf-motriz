-- Convite feito no banco, sem Edge Function: cria o usuário já confirmado (entra com o código de
-- 6 dígitos do login) e o perfil, com as mesmas regras da função convidar-usuario.
-- O aviso à pessoa é o próprio e-mail do código, pedido pela tela logo depois.
create function public.convidar_usuario(p_email text, p_nome text, p_papel public.papel,
  p_rede uuid default null, p_regional uuid default null, p_co_inep integer default null) returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare
  v_email text := lower(btrim(p_email));
  v_id uuid := gen_random_uuid();
begin
  if auth.uid() is null or not pode_gerir(p_papel, p_rede) then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'email_invalido'; end if;
  if email_ja_cadastrado(v_email) then raise exception 'email_ja_cadastrado'; end if;

  -- O Auth completo exige várias colunas preenchidas; o banco de teste isolado tem um auth.users mínimo.
  if exists (select 1 from information_schema.columns
             where table_schema = 'auth' and table_name = 'users' and column_name = 'email_confirmed_at') then
    insert into auth.users (id, email, instance_id, aud, role, email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change)
    values (v_id, v_email, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now(), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('nome', btrim(p_nome)), '', '', '', '');
  else
    insert into auth.users (id, email) values (v_id, v_email);
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id') then
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (v_id::text, v_id, jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
            'email', now(), now(), now());
  end if;

  -- O gatilho perfil_escopo recusa escola/regional de outra rede (escopo_incoerente) e desfaz tudo.
  insert into perfil (user_id, papel, nome, rede_id, regional_id, co_inep, criado_por)
  values (v_id, p_papel, nullif(btrim(p_nome), ''), p_rede, p_regional, p_co_inep, auth.uid());
  insert into auditoria (user_id, acao, alvo) values (auth.uid(), 'convidar_usuario', v_email || ' (' || p_papel || ')');
  return v_id;
end $$;

revoke execute on function public.convidar_usuario(text, text, public.papel, uuid, uuid, integer) from public, anon;
grant execute on function public.convidar_usuario(text, text, public.papel, uuid, uuid, integer) to authenticated;
