begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(10);

select iniciar_sessao('teste-norte', 91000001, 9::smallint, 14);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e"}', true);
select is((select count(*) from v_escola_status)::int, 1, 'ponto focal vê só a própria escola');
select is((select count(*) from participante)::int, 0, 'ponto focal não lê cadastro');
select is((select count(*) from sessao)::int, 0, 'ponto focal não lê sessões');
select is((select count(*) from perfil)::int, 1, 'vê só o próprio perfil');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
select is((select count(*) from v_campanha_resumo)::int, 1, 'gestor Norte vê só a campanha da rede');
select is((select count(*) from perfil)::int, 3, 'gestor vê os perfis da própria rede');
select throws_ok($$insert into escola (co_inep, rede_id, nome) values (1, '10000000-0000-0000-0000-000000000001', 'X')$$,
  '42501', null, 'gestor não escreve cadastro territorial');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
select is((select count(*) from participante)::int, 0, 'nem o admin lê participante direto (usa ver_participantes)');

reset role;
set local role anon;
select throws_ok($$select * from v_campanha_resumo$$, '42501', null, 'anon sem views');
select lives_ok($$select instrumento_da_campanha('teste-norte')$$, 'anon executa a RPC pública');

select * from finish();
rollback;
