-- Convite feito no banco (sem Edge Function): permissão, e-mail único, escopo e auditoria.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(11);

set local role authenticated;
-- Gestor da Rede Norte
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);

select lives_ok($$select convidar_usuario(' Nova.Escola@Teste.org ', 'Escola Beta', 'escola', '10000000-0000-0000-0000-000000000001', null, 91000002)$$,
  'gestor convida ponto focal de escola da própria rede');
select throws_ok($$select convidar_usuario('nova.escola@teste.org', 'De novo', 'escola', '10000000-0000-0000-0000-000000000001', null, 91000002)$$,
  'P0001', 'email_ja_cadastrado', 'e-mail já cadastrado é recusado (sem diferenciar maiúsculas)');
select throws_ok($$select convidar_usuario('chefe@teste.org', 'Chefe', 'admin', null, null, null)$$,
  '42501', 'sem_permissao', 'gestor não cria admin');
select throws_ok($$select convidar_usuario('x@teste.org', 'X', 'escola', '10000000-0000-0000-0000-000000000001', null, 92000001)$$,
  'P0001', 'escopo_incoerente', 'escola de outra rede é recusada');
select throws_ok($$select convidar_usuario('sem-arroba', 'Y', 'regional', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', null)$$,
  'P0001', 'email_invalido', 'e-mail inválido é recusado');

-- Regional não convida ninguém
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d"}', true);
select throws_ok($$select convidar_usuario('z@teste.org', 'Z', 'escola', '10000000-0000-0000-0000-000000000001', null, 91000001)$$,
  '42501', 'sem_permissao', 'regional não convida');

-- Admin convida pesquisador (sem rede)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
select lives_ok($$select convidar_usuario('analista@teste.org', 'Analista', 'pesquisador', null, null, null)$$, 'admin convida pesquisador');

set local role anon;
select throws_ok($$select convidar_usuario('w@teste.org', 'W', 'escola', null, null, null)$$, '42501', null, 'visitante sem login não executa');

reset role;
select is((select p.papel || ':' || p.co_inep || ':' || p.criado_por from perfil p join auth.users u on u.id = p.user_id
           where u.email = 'nova.escola@teste.org'),
  'escola:91000002:00000000-0000-0000-0000-00000000000c', 'perfil criado com escopo e autor, e-mail gravado em minúsculas');
select is((select count(*) from auth.users where email in ('x@teste.org', 'chefe@teste.org', 'sem-arroba'))::int, 0,
  'convite recusado não deixa usuário criado');
select is((select count(*) from auditoria where acao = 'convidar_usuario')::int, 2, 'convites feitos ficam na auditoria');

select * from finish();
rollback;
