-- Exclusão de campanha: só admin, apaga plano, cadastros e respostas, e fica na auditoria.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(7);

create temp table s as select (iniciar_sessao('teste-norte', 91000001, 9::smallint, (current_date - interval '14 years')::date) ->> 'sessao_id')::uuid as id;
grant select on s to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
select throws_ok($$select excluir_campanha('30000000-0000-0000-0000-000000000001')$$, '42501', 'sem_permissao', 'gestor da rede não exclui campanha');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
select is(excluir_campanha('30000000-0000-0000-0000-000000000001') ->> 'sessoes', '1', 'admin exclui e recebe o total de respostas apagadas');
select throws_ok($$select excluir_campanha('30000000-0000-0000-0000-000000000001')$$, 'P0001', 'campanha_inexistente', 'campanha já excluída');
reset role;

select is((select count(*) from campanha where slug = 'teste-norte')::int, 0, 'campanha apagada');
select is((select count(*) from escola_campanha where campanha_id = '30000000-0000-0000-0000-000000000001')::int, 0, 'plano amostral apagado');
select is((select count(*) from sessao where id = (select id from s))::int + (select count(*) from participante where sessao_id = (select id from s))::int, 0,
  'respostas e cadastro dos estudantes apagados');
select is((select alvo from auditoria where acao = 'excluir_campanha'), 'teste-norte (1 sessões)', 'exclusão registrada na auditoria');

select * from finish();
rollback;
