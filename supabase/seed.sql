-- Fixture de desenvolvimento e testes. Nada aqui vai para produção.
-- Usuários de teste. A stack completa (Auth) exige várias colunas preenchidas; o banco de teste
-- isolado (supabase/postgres sem o serviço de Auth) tem um auth.users mínimo. Insere conforme o que existe.
create temp table usuarios_teste (id uuid, email text);
insert into usuarios_teste values
  ('00000000-0000-0000-0000-00000000000a', 'admin@teste.org'),
  ('00000000-0000-0000-0000-00000000000b', 'pesquisa@teste.org'),
  ('00000000-0000-0000-0000-00000000000c', 'gestor.norte@teste.org'),
  ('00000000-0000-0000-0000-00000000000d', 'regional.n1@teste.org'),
  ('00000000-0000-0000-0000-00000000000e', 'escola.alfa@teste.org'),
  ('00000000-0000-0000-0000-00000000000f', 'gestor.sul@teste.org');
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'email_confirmed_at') then
    insert into auth.users (id, email, instance_id, aud, role, email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change)
    select id, email, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}', '', '', '', '' from usuarios_teste;
  else
    insert into auth.users (id, email) select id, email from usuarios_teste;
  end if;
end $$;
drop table usuarios_teste;

-- Identidade de e-mail para o login por link mágico na stack local (a tabela não existe no banco de teste isolado).
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id') then
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    select id::text, id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
    from auth.users where email like '%@teste.org';
  end if;
end $$;

insert into rede (id, nome, uf) values
  ('10000000-0000-0000-0000-000000000001', 'Rede Norte', 'XX'),
  ('10000000-0000-0000-0000-000000000002', 'Rede Sul', 'YY');
insert into regional (id, rede_id, nome) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Núcleo 1'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Núcleo 2'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Núcleo Sul');
insert into escola (co_inep, rede_id, regional_id, nome) values
  (91000001, '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'EM ALFA'),
  (91000002, '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'EM BETA'),
  (91000003, '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'EM GAMA'),
  (92000001, '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'EM DELTA');

insert into perfil (user_id, papel, nome, rede_id, regional_id, co_inep) values
  ('00000000-0000-0000-0000-00000000000a', 'admin', 'Admin', null, null, null),
  ('00000000-0000-0000-0000-00000000000b', 'pesquisador', 'Pesquisa', null, null, null),
  ('00000000-0000-0000-0000-00000000000c', 'gestor_rede', 'Gestor Norte', '10000000-0000-0000-0000-000000000001', null, null),
  ('00000000-0000-0000-0000-00000000000d', 'regional', 'Regional N1', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', null),
  ('00000000-0000-0000-0000-00000000000e', 'escola', 'Escola Alfa', '10000000-0000-0000-0000-000000000001', null, 91000001),
  ('00000000-0000-0000-0000-00000000000f', 'gestor_rede', 'Gestor Sul', '10000000-0000-0000-0000-000000000002', null, null);

select _importar_instrumento('Teste v1', $j${"blocos":[
  {"codigo":"A","titulo":"Perfil e contexto","series":null,"itens":[
    {"codigo":"A2","enunciado":"Qual é sua cor ou raça?","tipo":"unica","opcoes":["Branca","Preta"]},
    {"codigo":"A9","enunciado":"Você participa de atividades artísticas ou culturais?","tipo":"unica","opcoes":["Sim","Não"]},
    {"codigo":"A9_1","enunciado":"De quais atividades você participa?","tipo":"multipla","opcoes":["Música","Dança","Teatro"],
     "max_escolhas":2,"obrigatorio":false,"depende_de":{"item":"A9","valor":"Sim"}}]},
  {"codigo":"B","titulo":"Vínculo e acolhimento","series":null,"itens":[
    {"codigo":"B1","enunciado":"Eu gosto de ir para a escola.","tipo":"likert5"},
    {"codigo":"B2","enunciado":"Na minha escola, me sinto bem.","tipo":"likert5"}]},
  {"codigo":"G","titulo":"Transições (6º ano)","series":[6],"itens":[
    {"codigo":"G1","enunciado":"Precisei mudar de escola no 6º ano.","tipo":"unica","opcoes":["Sim","Não"]}]},
  {"codigo":"H","titulo":"Transições (9º ano)","series":[9],"itens":[
    {"codigo":"H1","enunciado":"Estou conseguindo acompanhar as aulas deste ano.","tipo":"likert5"}]},
  {"codigo":"I","titulo":"Perguntas abertas","series":null,"itens":[
    {"codigo":"I1","enunciado":"O que mais faz você se sentir bem na escola?","tipo":"texto","obrigatorio":false}]}
]}$j$::jsonb);
-- id fixo para os testes (bloco.versao_id acompanha por on update cascade)
update instrumento_versao set id = '40000000-0000-0000-0000-000000000001' where nome = 'Teste v1';

insert into campanha (id, rede_id, numero, slug, instrumento_versao_id, janela_inicio, janela_fim, aberta) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, 'teste-norte',
   '40000000-0000-0000-0000-000000000001', current_date - 1, current_date + 30, true),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 1, 'teste-sul',
   '40000000-0000-0000-0000-000000000001', current_date - 1, current_date + 30, false);
insert into escola_campanha (campanha_id, co_inep, in_amostra, qt_mat_6, qt_mat_9) values
  ('30000000-0000-0000-0000-000000000001', 91000001, true, 40, 40),
  ('30000000-0000-0000-0000-000000000001', 91000002, true, 20, 20),
  ('30000000-0000-0000-0000-000000000001', 91000003, false, 10, 10),
  ('30000000-0000-0000-0000-000000000002', 92000001, true, 30, 30);
