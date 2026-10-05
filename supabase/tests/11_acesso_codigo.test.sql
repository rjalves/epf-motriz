-- Login por código sem o Auth do Supabase: código com hash, tentativas, validade, sessão JWT e e-mail pelo Resend.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(19);

insert into config_privada (chave, valor) values ('jwt_secret', 'segredo-de-teste-com-pelo-menos-32-caracteres'),
  ('resend_api_key', 're_teste'), ('email_remetente', 'EPF <nao-responda@teste.org>'), ('site_url', 'http://localhost:5173'),
  ('resend_url', 'http://127.0.0.1:9/emails'), ('intervalo_codigo_segundos', '0')
on conflict (chave) do update set valor = excluded.valor;

-- Visitante (anon) pede o código e entra
set local role anon;
select throws_ok($$select pedir_codigo('ninguem@teste.org')$$, 'P0001', 'sem_acesso', 'e-mail sem acesso não recebe código');
select lives_ok($$select pedir_codigo(' Escola.Alfa@teste.org ')$$, 'e-mail com acesso recebe código');
select throws_ok($$select * from codigo_acesso$$, '42501', null, 'visitante não lê os códigos');
select throws_ok($$select * from config_privada$$, '42501', null, 'visitante não lê a configuração (chave do Resend)');
reset role;

select is((select count(*) from envio_email where para = 'escola.alfa@teste.org' and tipo = 'codigo')::int, 1, 'envio do código registrado');
select ok((select request_id is not null from envio_email where para = 'escola.alfa@teste.org'), 'e-mail entregue ao pg_net para o Resend');
select ok((select html like '%Seu código de acesso%' and html like '%482913%' and html like '%http://localhost:5173/painel%' and html not like '%{{%'
           from _montar_email('codigo', '{"Token":"482913","Email":"a@b.org"}')), 'e-mail montado com o modelo do EPF, variáveis preenchidas');

-- Código conhecido para testar a verificação
select _novo_codigo('escola.alfa@teste.org') as codigo \gset
set local role anon;
select is(entrar_com_codigo('escola.alfa@teste.org', '000000') ->> 'erro', 'codigo_invalido', 'código errado é recusado');
reset role;
select is((select tentativas from codigo_acesso where email = 'escola.alfa@teste.org'), 1, 'tentativa errada é contada');
set local role anon;
select is(entrar_com_codigo('ESCOLA.ALFA@teste.org', :'codigo') ->> 'user_id', '00000000-0000-0000-0000-00000000000e', 'código certo devolve a sessão do usuário');
select is(entrar_com_codigo('escola.alfa@teste.org', :'codigo') ->> 'erro', 'codigo_invalido', 'código só vale uma vez');
reset role;

-- Token: HS256 válido com o segredo, papel authenticated, validade de 12 h
select _novo_codigo('escola.alfa@teste.org') as codigo2 \gset
select entrar_com_codigo('escola.alfa@teste.org', :'codigo2') ->> 'access_token' as token \gset
select is(split_part(:'token', '.', 3),
  rtrim(translate(encode(hmac(split_part(:'token', '.', 1) || '.' || split_part(:'token', '.', 2),
    'segredo-de-teste-com-pelo-menos-32-caracteres', 'sha256'), 'base64'), E'+/\n', '-_'), '='), 'assinatura HS256 com o segredo do JWT');
select is(convert_from(decode(rpad(translate(split_part(:'token', '.', 2), '-_', '+/'),
  ((length(split_part(:'token', '.', 2)) + 3) / 4) * 4, '='), 'base64'), 'utf8')::jsonb ->> 'role', 'authenticated', 'token com papel authenticated');
select ok((convert_from(decode(rpad(translate(split_part(:'token', '.', 2), '-_', '+/'),
  ((length(split_part(:'token', '.', 2)) + 3) / 4) * 4, '='), 'base64'), 'utf8')::jsonb ->> 'exp')::bigint
  between extract(epoch from now() + interval '11 hours') and extract(epoch from now() + interval '13 hours'), 'sessão vale 12 horas');

-- Cinco erros bloqueiam o código; código vencido não vale
select _novo_codigo('escola.alfa@teste.org') as codigo3 \gset
select entrar_com_codigo('escola.alfa@teste.org', '000000') from generate_series(1, 5);
select is(entrar_com_codigo('escola.alfa@teste.org', :'codigo3') ->> 'erro', 'codigo_invalido', 'depois de 5 erros o código é descartado');
select _novo_codigo('escola.alfa@teste.org') as codigo4 \gset
update codigo_acesso set expira_em = now() - interval '1 minute' where email = 'escola.alfa@teste.org';
select is(entrar_com_codigo('escola.alfa@teste.org', :'codigo4') ->> 'erro', 'codigo_invalido', 'código vencido é recusado');

-- Perfil desativado não entra nem recebe código
update perfil set ativo = false where user_id = '00000000-0000-0000-0000-00000000000e';
select throws_ok($$select pedir_codigo('escola.alfa@teste.org')$$, 'P0001', 'sem_acesso', 'perfil desativado não recebe código');
update perfil set ativo = true where user_id = '00000000-0000-0000-0000-00000000000e';

-- Convite envia o e-mail de convite com código
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
select is(convidar_usuario('nova.escola@teste.org', 'Escola Beta', 'escola', '10000000-0000-0000-0000-000000000001', null, 91000002) ->> 'email_enviado',
  'true', 'convite cria o acesso e envia o e-mail');
reset role;
select ok((select count(*) = 1 from envio_email where para = 'nova.escola@teste.org' and tipo = 'convite')
  and (select html like '%Você foi convidado%' and html like '%Escola Beta%' and html like '%Ponto focal da escola%'
       from _montar_email('convite', '{"Token":"111222","Nome":"Escola Beta","Perfil":"Ponto focal da escola"}')),
  'convite registrado e e-mail com nome, perfil e código');

select * from finish();
rollback;
