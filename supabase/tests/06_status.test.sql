begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(10);

-- 30 concluídas e 5 em andamento no 6º de ALFA; 70 concluídas em BETA (meta 34); 2 em GAMA (fora da amostra)
insert into sessao (campanha_id, co_inep, serie, idade, token_hash, status)
select '30000000-0000-0000-0000-000000000001', e, s, 12, '\x00', st
from (select 91000001 e, 6::smallint s, 'concluida' st, generate_series(1, 30) n
      union all select 91000001, 6::smallint, 'em_andamento', generate_series(1, 5)
      union all select 91000002, 9::smallint, 'concluida', generate_series(1, 70)
      union all select 91000003, 9::smallint, 'concluida', generate_series(1, 2)) x;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
select is((select meta from v_escola_status where co_inep = 91000001), 68, 'meta ALFA = round(0,85×80)');
select is((select status from v_escola_status where co_inep = 91000001), 'iniciada', 'ALFA amarela');
select is((select em_andamento from v_escola_status where co_inep = 91000001)::int, 5, 'em andamento à parte');
select is((select status from v_escola_status where co_inep = 91000002), 'concluida', 'BETA verde');
select is((select respondentes_amostra from v_campanha_resumo where slug = 'teste-norte')::int, 100, '30 + 70 na amostra');
select is((select respondentes_fora_amostra from v_campanha_resumo where slug = 'teste-norte')::int, 2, 'GAMA fora');
select is((select meta_total from v_campanha_resumo where slug = 'teste-norte')::int, 102, '68 + 34');
select is((select count(*) from ver_participantes('30000000-0000-0000-0000-000000000001', 91000001))::int, 0, 'admin consulta cadastro (auditado)');

-- regional do Núcleo 1 vê só ALFA e GAMA: a soma do resumo muda com o escopo
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d"}', true);
select is((select respondentes_amostra from v_campanha_resumo where slug = 'teste-norte')::int, 30, 'resumo recortado pelo escopo');
select is((select count(*) from v_resposta_export)::int, 0, 'regional não exporta respostas');

select * from finish();
rollback;
