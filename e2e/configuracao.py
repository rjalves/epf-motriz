# Teste de ponta a ponta: configuração de campanha (admin) e gestão de usuários (gestor), incluindo o convite.
# Requer: supabase start + npm run dev. Uso: python3 e2e/configuracao.py /tmp
import json, os, re, sys, time
from playwright.sync_api import sync_playwright
from util import BASE, check, email_recebido, entrar, ids_emails, resumo, sql

OUT = sys.argv[1]
PLANO = os.path.join(os.path.dirname(__file__), '..', 'src', 'gestao', '__fixtures__', 'plano-natal.xlsx')
LIMPEZA = ("delete from escola_campanha where campanha_id = '30000000-0000-0000-0000-000000000001' and co_inep not in (91000001, 91000002, 91000003);"
           "delete from escola where rede_id = '10000000-0000-0000-0000-000000000001' and co_inep not in (91000001, 91000002, 91000003);"
           "delete from campanha where slug = 'teste-sul-2';"
           "delete from instrumento_versao where nome in ('EPF teste xlsx', 'EPF teste json');"
           "delete from auth.users where email in ('nova.escola@teste.org', 'x@teste.org', 'y@teste.org');"
           "update perfil set ativo = true; delete from auditoria;"
           "insert into escola_campanha (campanha_id, co_inep, in_amostra, qt_mat_6, qt_mat_9) values"
           " ('30000000-0000-0000-0000-000000000001', 91000001, true, 40, 40), ('30000000-0000-0000-0000-000000000001', 91000002, true, 20, 20),"
           " ('30000000-0000-0000-0000-000000000001', 91000003, false, 10, 10)"
           " on conflict (campanha_id, co_inep) do update set in_amostra = excluded.in_amostra, qt_mat_6 = excluded.qt_mat_6, qt_mat_9 = excluded.qt_mat_9;")
sql(LIMPEZA)

with sync_playwright() as p:
    b = p.chromium.launch()

    pg = entrar(b, 'admin@teste.org')
    pg.goto(f'{BASE}/painel/c/30000000-0000-0000-0000-000000000001/configurar')
    pg.get_by_role('heading', name='Configurar campanha').wait_for()
    pg.locator('input[type=file][accept=".xlsx"]').set_input_files(PLANO)
    pg.get_by_text('20 escolas importadas; 19 na amostra.').wait_for()
    check('importa o plano de Natal (20 escolas, 19 na amostra)', True)
    check('mostra a escola substituída e o motivo', pg.get_by_text('ESC MUL PROF REGINALDO FERREIRA NETO saiu da amostra: Não possui Anos Finais.').is_visible())
    check('importar de novo substitui o plano (estudante vê só as 20 escolas do arquivo)', int(sql("select jsonb_array_length(instrumento_da_campanha('teste-norte')->'escolas')")) == 20)
    pg.screenshot(path=f'{OUT}/c1-configuracao.png', full_page=True)

    pg.goto(f'{BASE}/painel/nova'); pg.get_by_role('heading', name='Nova campanha').wait_for()
    pg.get_by_label('Rede').select_option(label='Rede Sul')
    pg.get_by_label('Aplicação nº').fill('2')
    pg.get_by_label('Início da janela').fill('2026-11-01'); pg.get_by_label('Fim da janela').fill('2026-11-15')
    pg.get_by_label('Endereço do link').fill('teste-sul-2')
    pg.get_by_label('Versão do questionário').select_option(label='EPF 2026 v1')
    pg.get_by_role('button', name='Criar campanha').click()
    pg.get_by_role('heading', name='Configurar campanha').wait_for()
    check('cria campanha nova e abre a configuração', sql("select count(*) from campanha where slug = 'teste-sul-2'") == '1')

    # Questionário: baixar os modelos, importar em Excel e em JSON, nome repetido e arquivo fora do modelo.
    importar = pg.locator('input[accept=".xlsx,.json"]')
    def aviso_apos(arquivo):
        importar.set_input_files(arquivo)
        pg.get_by_text(re.compile('importada:|Não foi possível importar')).first.wait_for()
        return pg.locator('.epf-aviso').first.inner_text()
    with pg.expect_download() as d: pg.get_by_role('button', name='Baixar modelo Excel').click()
    xlsx = os.path.join(OUT, 'EPF teste xlsx.xlsx'); d.value.save_as(xlsx)
    with pg.expect_download() as d: pg.get_by_role('link', name='Baixar modelo JSON').click()
    js = os.path.join(OUT, 'EPF teste json.json'); d.value.save_as(js)
    check('baixa os modelos Excel e JSON', open(xlsx, 'rb').read(2) == b'PK' and len(json.load(open(js))['blocos']) == 9)
    check('importa questionário pelo modelo Excel', 'Versão "EPF teste xlsx" importada: 9 blocos e 84 perguntas' in aviso_apos(xlsx))
    check('nova versão aparece na lista', pg.locator('select').nth(1).locator('option', has_text='EPF teste xlsx').count() == 1)
    check('importa questionário pelo modelo JSON', 'Versão "EPF teste json" importada: 9 blocos e 84 perguntas' in aviso_apos(js))
    check('mesmo nome de versão é recusado', 'já existe uma versão chamada "EPF teste json"' in aviso_apos(js))
    check('planilha fora do modelo é recusada com orientação', 'abas "Blocos" e "Itens"' in aviso_apos(PLANO))
    check('itens importados pelo Excel iguais aos da versão original', sql(
        "select count(*) from (select i.codigo, i.tipo, i.opcoes, i.depende_de from item i join bloco b on b.id = i.bloco_id"
        " join instrumento_versao v on v.id = b.versao_id where v.nome = 'EPF teste xlsx'"
        " except select i.codigo, i.tipo, i.opcoes, i.depende_de from item i join bloco b on b.id = i.bloco_id"
        " join instrumento_versao v on v.id = b.versao_id where v.nome = 'EPF 2026 v1') x") == '0')

    # Excluir campanha (admin): com respostas, pede o endereço do link digitado; texto errado não apaga.
    sql("update campanha set aberta = true, janela_inicio = current_date - 1, janela_fim = current_date + 30 where slug = 'teste-sul-2';"
        "insert into escola_campanha (campanha_id, co_inep, in_amostra, qt_mat_9) select id, 92000001, true, 10 from campanha where slug = 'teste-sul-2';")
    sql("select iniciar_sessao('teste-sul-2', 92000001, 9::smallint, 14) from generate_series(1, 2)")
    pg.goto(f'{BASE}/painel'); linha = pg.locator('tr', has_text='Aplicação 2'); linha.wait_for()
    check('admin vê Excluir ao lado de Abrir painel', linha.get_by_role('link', name='Abrir painel').is_visible()
          and linha.get_by_role('button', name=re.compile('^Excluir')).is_visible())
    dialogos = []
    def responder(texto):
        def f(d): dialogos.append(d.message); d.accept(texto)
        pg.once('dialog', f)
    responder('outra-coisa'); linha.get_by_role('button', name=re.compile('^Excluir')).click()
    pg.get_by_text('não confere').wait_for()
    check('confirmação avisa quantas respostas serão apagadas', '2 respostas' in dialogos[0])
    check('texto errado não exclui', sql("select count(*) from campanha where slug = 'teste-sul-2'") == '1')
    responder('teste-sul-2'); linha.get_by_role('button', name=re.compile('^Excluir')).click()
    pg.get_by_text('excluída').wait_for()
    check('campanha excluída com as respostas', sql("select count(*) from campanha where slug = 'teste-sul-2'") == '0'
          and pg.locator('tr', has_text='Aplicação 2').count() == 0)
    check('exclusão registrada na auditoria', sql("select alvo from auditoria where acao = 'excluir_campanha'") == 'teste-sul-2 (2 sessões)')

    pg = entrar(b, 'gestor.norte@teste.org')
    pg.get_by_role('link', name='Usuários').click(); pg.locator('tr', has_text='Gestor Norte').wait_for()
    perfis = [pg.locator('fieldset label').nth(i).inner_text().split('\n')[0] for i in range(pg.locator('fieldset label').count())]
    check('gestor só convida Regional e Ponto focal', perfis == ['Regional', 'Ponto focal da escola'])
    check('gestor não tem botão para o próprio perfil', 'Gestor Norte' in pg.locator('table').inner_text() and pg.locator('tr', has_text='Gestor Norte').get_by_role('button').count() == 0)
    pg.get_by_label('E-mail institucional').fill('nova.escola@teste.org'); pg.get_by_label('Nome', exact=True).fill('Escola Beta')
    pg.get_by_label('Ponto focal da escola').check(); pg.locator('form select').last.select_option(label='EM BETA')
    antes = ids_emails('nova.escola@teste.org')
    pg.get_by_role('button', name='Enviar convite por e-mail').click()
    pg.get_by_text(re.compile('Convite enviado|Não foi possível convidar|não saiu')).wait_for()
    check('convite criado pelo banco, sem Edge Function', pg.get_by_text('Convite enviado para nova.escola@teste.org').is_visible())
    check('perfil criado com o escopo certo', sql("select papel || ':' || co_inep from perfil p join auth.users u on u.id = p.user_id where u.email = 'nova.escola@teste.org'") == 'escola:91000002')
    convite = email_recebido('nova.escola@teste.org', antes)
    check('convite sai pela API do Resend com o modelo do EPF', convite['caminho'] == '/emails' and convite['auth'] == 'Bearer re_teste'
          and convite['subject'] == 'Você foi convidado para o painel EPF' and 'Escola Beta' in convite['html']
          and 'Ponto focal da escola' in convite['html'] and re.search(r'\b\d{6}\b', convite['html']) is not None)
    time.sleep(1.5)  # intervalo mínimo entre códigos para o mesmo e-mail (max_frequency local = 1s)
    convidado = entrar(b, 'nova.escola@teste.org')
    check('convidado entra com o código como ponto focal', 'ponto focal da escola' in convidado.locator('.epf-topo').inner_text().lower())
    convidado.context.close()
    check('convite registrado na auditoria', sql("select count(*) from auditoria where acao = 'convidar_usuario' and alvo like 'nova.escola%'") == '1')

    # Outro gestor tenta convidar o mesmo e-mail: recusado, e o usuário existente fica como estava.
    pg_sul = entrar(b, 'gestor.sul@teste.org')
    pg_sul.get_by_role('link', name='Usuários').click(); pg_sul.locator('tr', has_text='Gestor Sul').wait_for()
    pg_sul.get_by_label('E-mail institucional').fill('Nova.Escola@teste.org'); pg_sul.get_by_label('Nome', exact=True).fill('Intruso')
    pg_sul.get_by_label('Ponto focal da escola').check(); pg_sul.locator('form select').last.select_option(label='EM DELTA')
    pg_sul.get_by_role('button', name='Enviar convite por e-mail').click()
    pg_sul.get_by_text(re.compile('Convite enviado|Não foi possível convidar')).wait_for()
    check('convite duplicado é recusado com explicação', pg_sul.get_by_text('este e-mail já tem acesso').is_visible())
    check('usuário convidado antes continua com o mesmo perfil',
          sql("select papel || ':' || co_inep from perfil p join auth.users u on u.id = p.user_id where u.email = 'nova.escola@teste.org'") == 'escola:91000002')

    pg.locator('tr', has_text='Escola Alfa').get_by_role('button', name='Desativar').click()
    pg.get_by_text('Acesso desativado.').wait_for()
    check('desativa ponto focal da rede', sql("select ativo from perfil where user_id = '00000000-0000-0000-0000-00000000000e'") == 'f')
    pg.get_by_role('button', name='Desfazer').click(); pg.get_by_text('Acesso reativado.').wait_for()
    check('desfazer reativa', sql("select ativo from perfil where user_id = '00000000-0000-0000-0000-00000000000e'") == 't')
    pg.screenshot(path=f'{OUT}/c2-usuarios.png', full_page=True)
    b.close()
sql(LIMPEZA)  # não deixa as escolas importadas afetarem os outros testes
resumo()
