begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);

-- agir como um usuário do seed (as duas formas que auth.uid() pode ler)
create function pg_temp.como(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, true),
         set_config('request.jwt.claims', json_build_object('sub', uid)::text, true)
$$;

select pg_temp.como('00000000-0000-0000-0000-00000000000e');
select ok(pode_ver_escola(91000001), 'escola vê a própria');
select ok(not pode_ver_escola(91000003), 'escola não vê outra da mesma regional');

select pg_temp.como('00000000-0000-0000-0000-00000000000d');
select ok(pode_ver_escola(91000003), 'regional vê escola da regional');
select ok(not pode_ver_escola(91000002), 'regional não vê outra regional');

select pg_temp.como('00000000-0000-0000-0000-00000000000c');
select ok(pode_ver_escola(91000002), 'gestor vê a rede toda');
select ok(not pode_ver_escola(92000001), 'gestor não vê outra rede');
select ok(pode_gerir('escola', '10000000-0000-0000-0000-000000000001'), 'gestor convida escola da rede');
select ok(not pode_gerir('admin', null), 'gestor não cria admin');
select ok(not pode_gerir('escola', '10000000-0000-0000-0000-000000000002'), 'gestor não convida para outra rede');
select lives_ok($$select definir_ativo('00000000-0000-0000-0000-00000000000e', false)$$, 'gestor desativa escola da rede');
select throws_ok($$select definir_ativo('00000000-0000-0000-0000-00000000000f', false)$$, '42501', null, 'gestor não desativa gestor de outra rede');

select pg_temp.como('00000000-0000-0000-0000-00000000000b');
select ok(pode_ver_escola(92000001), 'pesquisador vê todas');
select ok(not pode_gerir('escola', '10000000-0000-0000-0000-000000000001'), 'pesquisador não gere usuários');

select throws_ok(
  $$update perfil set rede_id = '10000000-0000-0000-0000-000000000002'
    where user_id = '00000000-0000-0000-0000-00000000000d'$$,
  'P0001', 'escopo_incoerente', 'regional de uma rede não pode apontar para outra rede');

select * from finish();
rollback;
