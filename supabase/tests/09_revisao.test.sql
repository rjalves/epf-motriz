-- Correções da revisão final (coleta fechada, assentimento, e-mail cadastrado, exportação auditada, importação do plano).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);

-- Sessão com token conhecido
create temp table bruno as select (iniciar_sessao('teste-norte', 91000001, 9::smallint, 14) ->> 'sessao_id')::uuid as id;
update sessao set token_hash = digest(decode(repeat('cd', 32), 'hex'), 'sha256') where id = (select id from bruno);

select ok((select assentiu_em is not null from sessao where id = (select id from bruno)), 'sessão registra o momento do assentimento');

update campanha set aberta = false where slug = 'teste-norte';
select throws_ok($$select salvar_bloco((select id from bruno), repeat('cd', 32), 'A', '{"A2":"Preta","A9":"Não"}')$$,
  'P0001', 'campanha_fechada', 'coleta fechada barra o salvamento de quem já começou');
select throws_ok($$select concluir((select id from bruno), repeat('cd', 32))$$,
  'P0001', 'campanha_fechada', 'coleta fechada barra a conclusão');
update campanha set aberta = true, janela_fim = current_date - 1, janela_inicio = current_date - 10 where slug = 'teste-norte';
select throws_ok($$select salvar_bloco((select id from bruno), repeat('cd', 32), 'A', '{"A2":"Preta","A9":"Não"}')$$,
  'P0001', 'campanha_fechada', 'janela encerrada barra o salvamento');
update campanha set janela_inicio = current_date - 1, janela_fim = current_date + 30 where slug = 'teste-norte';

select ok(email_ja_cadastrado('  ADMIN@teste.org '), 'e-mail já cadastrado é reconhecido (sem diferenciar maiúsculas)');
select ok(not email_ja_cadastrado('ninguem@teste.org'), 'e-mail novo não é reconhecido');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d"}', true);
select throws_ok($$select email_ja_cadastrado('admin@teste.org')$$, '42501', null, 'usuário comum não consulta e-mails cadastrados');
select throws_ok($$select registrar_exportacao('teste-norte')$$, '42501', null, 'regional não registra exportação');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
select lives_ok($$select registrar_exportacao('teste-norte')$$, 'pesquisador registra a exportação');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
select throws_ok($$select importar_plano('30000000-0000-0000-0000-000000000001', '[]')$$, '42501', null, 'gestor não importa plano');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
select throws_ok($$select importar_plano('30000000-0000-0000-0000-000000000001',
  '[{"co_inep":92000001,"nome":"EM DELTA","in_amostra":true,"qt_mat_6":10,"qt_mat_9":10}]')$$,
  'P0001', 'escola_de_outra_rede: 92000001', 'não move escola de outra rede');
select is(importar_plano('30000000-0000-0000-0000-000000000001',
  '[{"co_inep":91000001,"nome":"EM ALFA","in_amostra":true,"qt_mat_6":40,"qt_mat_9":40,"regional":null},
    {"co_inep":91000009,"nome":"EM NOVA","in_amostra":true,"qt_mat_6":10,"qt_mat_9":10,"regional":"Núcleo 3"}]'),
  '{"escolas": 2, "removidas": 2}'::jsonb, 'substitui o plano: 2 escolas, remove as 2 ausentes');
select is((select regional_id from escola where co_inep = 91000001), '20000000-0000-0000-0000-000000000001'::uuid, 'arquivo sem regional não apaga a regional existente');
reset role;
select is((select count(*) from auditoria where acao in ('importar_plano', 'exportar_respostas'))::int, 2, 'importação e exportação ficam na auditoria');

select * from finish();
rollback;
