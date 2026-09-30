begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(13);

create temp table s as select (r->>'sessao_id')::uuid as id, r->>'token' as tk
from (select iniciar_sessao('teste-norte', 91000001, 6::smallint, 'Maria Souza',
      (current_date - interval '13 years')::date) as r) x;

select throws_ok($$select salvar_bloco((select id from s), repeat('0', 64), 'A', '{}')$$, 'P0001', 'sessao_invalida', 'token errado');
select throws_ok($$select salvar_bloco((select id from s), (select tk from s), 'H', '{"H1":"Concordo"}')$$, 'P0001', 'bloco_invalido', 'bloco do 9º para aluno do 6º');
select throws_ok($$select salvar_bloco((select id from s), (select tk from s), 'A', '{"A2":"Branca","A9":"Não","B1":"Concordo"}')$$, 'P0001', 'item_invalido: B1', 'item de outro bloco');
select throws_ok($$select salvar_bloco((select id from s), (select tk from s), 'A', '{"A2":"Verde","A9":"Não"}')$$, 'P0001', 'valor_invalido: A2', 'opção inexistente');
select throws_ok($$select salvar_bloco((select id from s), (select tk from s), 'A', '{"A2":"Branca","A9":"Sim","A9_1":["Música","Dança","Teatro"]}')$$, 'P0001', 'valor_invalido: A9_1', 'escolhas acima do limite');
select throws_ok($$select salvar_bloco((select id from s), (select tk from s), 'A', '{"A2":"Branca"}')$$, 'P0001', 'obrigatorio_ausente: A9', 'obrigatório faltando');

select is((select salvar_bloco((select id from s), (select tk from s), 'A', '{"A2":"Preta","A9":"Sim","A9_1":["Música","Teatro"]}') -> 'blocos_salvos'),
  '["A"]'::jsonb, 'bloco A salvo');
select throws_ok($$select concluir((select id from s), (select tk from s))$$, 'P0001', 'blocos_pendentes', 'não conclui com B e G pendentes');

select lives_ok($$select salvar_bloco((select id from s), (select tk from s), 'B', '{"B1":"Concordo","B2":"Concordo muito"}')$$, 'salva B');
select salvar_bloco((select id from s), (select tk from s), 'G', '{"G1":"Não"}');
select lives_ok($$select concluir((select id from s), (select tk from s))$$, 'conclui sem a aberta opcional (I)');
select is((select status from sessao where id = (select id from s)), 'concluida', 'status concluída');
select throws_ok($$select salvar_bloco((select id from s), (select tk from s), 'I', '{"I1":"oi"}')$$, 'P0001', 'sessao_encerrada', 'não edita depois de concluir');
select throws_ok($$select iniciar_sessao('teste-norte', 91000001, 6::smallint, 'maria souza', (current_date - interval '13 years')::date)$$,
  'P0001', 'ja_respondeu', 'não responde duas vezes');

select * from finish();
rollback;
