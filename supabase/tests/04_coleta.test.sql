begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);


select throws_ok($$select iniciar_sessao('teste-norte', 91000001, 6::smallint, 11)$$,
  'P0001', 'autorizacao_necessaria', 'menor de 12 sem autorização');
create temp table s1 as select iniciar_sessao('teste-norte', 91000001, 6::smallint, 11,
  'joao@exemplo.com', '(84) 99999-0000', true) as r;
select is((select r->>'retomada' from s1), 'false', 'nova sessão');
select is((select idade from sessao where id = (select (r->>'sessao_id')::uuid from s1)), 11::smallint, 'sessão guarda só a idade');
select is((select data_nascimento from participante where sessao_id = (select (r->>'sessao_id')::uuid from s1)), null, 'cadastro não guarda data de nascimento, só a idade informada');
select is((select telefone from participante where sessao_id = (select (r->>'sessao_id')::uuid from s1)), '84999990000', 'telefone só com dígitos');

create temp table s2 as select iniciar_sessao('teste-norte', 91000001, 6::smallint, 11, null, null, true) as r;
select is((select r->>'retomada' from s2), 'false', 'sem nome não há retomada por identificação: cada início é novo');
select isnt((select r->>'sessao_id' from s2), (select r->>'sessao_id' from s1), 'mesma escola e idade geram outra sessão');
select is((select nome from participante where sessao_id = (select (r->>'sessao_id')::uuid from s1)), null, 'cadastro não guarda nome');

select throws_ok($$select iniciar_sessao('teste-norte', 92000001, 6::smallint, 14)$$,
  'P0001', 'escola_invalida', 'escola fora da campanha');
select throws_ok($$select iniciar_sessao('teste-norte', 91000001, 7::smallint, 14)$$,
  'P0001', 'serie_invalida', 'série não coberta');
select throws_ok($$select iniciar_sessao('teste-norte', 91000001, 9::smallint, 6)$$,
  'P0001', 'idade_invalida', 'idade fora de 9 a 18');
select throws_ok($$select iniciar_sessao('teste-sul', 92000001, 9::smallint, 14)$$,
  'P0001', 'campanha_fechada', 'campanha fechada');

select registrar_recusa('teste-norte');
select is((select recusas from campanha where slug = 'teste-norte'), 1, 'recusa contada sem dado pessoal');
select is((select instrumento_da_campanha('teste-norte') -> 'campanha' ->> 'situacao'), 'aberta', 'instrumento público da campanha');

select * from finish();
rollback;
