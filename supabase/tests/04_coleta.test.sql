begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);

create temp table nasc as select (current_date - interval '11 years 1 day')::date as onze,
                                 (current_date - interval '14 years 1 day')::date as quatorze;

select throws_ok($$select iniciar_sessao('teste-norte', 91000001, 6::smallint, (select onze from nasc))$$,
  'P0001', 'autorizacao_necessaria', 'menor de 12 sem autorização');
create temp table s1 as select iniciar_sessao('teste-norte', 91000001, 6::smallint, (select onze from nasc),
  'joao@exemplo.com', '(84) 99999-0000', true) as r;
select is((select r->>'retomada' from s1), 'false', 'nova sessão');
select is((select idade from sessao where id = (select (r->>'sessao_id')::uuid from s1)), 11::smallint, 'sessão guarda só a idade');
select hasnt_column('public', 'sessao', 'nome', 'sessão não tem nome');
select is((select telefone from participante where sessao_id = (select (r->>'sessao_id')::uuid from s1)), '84999990000', 'telefone só com dígitos');

create temp table s2 as select iniciar_sessao('teste-norte', 91000001, 6::smallint, (select onze from nasc), null, null, true) as r;
select is((select r->>'retomada' from s2), 'false', 'sem nome não há retomada por identificação: cada início é novo');
select isnt((select r->>'sessao_id' from s2), (select r->>'sessao_id' from s1), 'mesma escola e nascimento geram outra sessão');
select is((select nome from participante where sessao_id = (select (r->>'sessao_id')::uuid from s1)), null, 'cadastro não guarda nome');

select throws_ok($$select iniciar_sessao('teste-norte', 92000001, 6::smallint, (select quatorze from nasc))$$,
  'P0001', 'escola_invalida', 'escola fora da campanha');
select throws_ok($$select iniciar_sessao('teste-norte', 91000001, 7::smallint, (select quatorze from nasc))$$,
  'P0001', 'serie_invalida', 'série não coberta');
select throws_ok($$select iniciar_sessao('teste-norte', 91000001, 9::smallint, '2020-01-01')$$,
  'P0001', 'idade_invalida', 'idade implausível');
select throws_ok($$select iniciar_sessao('teste-sul', 92000001, 9::smallint, (select quatorze from nasc))$$,
  'P0001', 'campanha_fechada', 'campanha fechada');

select registrar_recusa('teste-norte');
select is((select recusas from campanha where slug = 'teste-norte'), 1, 'recusa contada sem dado pessoal');
select is((select instrumento_da_campanha('teste-norte') -> 'campanha' ->> 'situacao'), 'aberta', 'instrumento público da campanha');

select * from finish();
rollback;
