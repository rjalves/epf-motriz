begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(6);

select is((select count(*) from bloco where versao_id = '40000000-0000-0000-0000-000000000001')::int, 5, 'seed: 5 blocos');
select is((select series from bloco where versao_id = '40000000-0000-0000-0000-000000000001' and codigo = 'G'), '{6}'::smallint[], 'G só para 6º');
select is((select jsonb_array_length(opcoes) from item where codigo = 'B1'
           and bloco_id in (select id from bloco where versao_id = '40000000-0000-0000-0000-000000000001')), 5, 'likert5 recebe as 5 opções');
select is((select depende_de->>'item' from item where codigo = 'A9_1'
           and bloco_id in (select id from bloco where versao_id = '40000000-0000-0000-0000-000000000001')), 'A9', 'dependência gravada');
select throws_ok($$insert into item (bloco_id, codigo, ordem, enunciado, tipo, opcoes)
  select id, 'X1', 99, 'x', 'multipla', '["a","b"]' from bloco where codigo = 'A' limit 1$$,
  '23514', null, 'múltipla exige max_escolhas');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
select throws_ok($$select importar_instrumento('x', '{"blocos":[]}')$$, '42501', null, 'só admin importa');

select * from finish();
rollback;
