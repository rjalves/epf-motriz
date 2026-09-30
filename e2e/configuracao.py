# Teste de ponta a ponta: configuração de campanha (admin) e gestão de usuários (gestor), incluindo a Edge Function de convite.
# Requer: supabase start com edge-runtime + npm run dev. Uso: python3 e2e/configuracao.py /tmp
import os, re, sys
from playwright.sync_api import sync_playwright
from util import BASE, agora, check, email_recebido, entrar, resumo, sql

OUT = sys.argv[1]
PLANO = os.path.join(os.path.dirname(__file__), '..', 'src', 'gestao', '__fixtures__', 'plano-natal.xlsx')
LIMPEZA = ("delete from escola_campanha where campanha_id = '30000000-0000-0000-0000-000000000001' and co_inep not in (91000001, 91000002, 91000003);"
           "delete from escola where rede_id = '10000000-0000-0000-0000-000000000001' and co_inep not in (91000001, 91000002, 91000003);"
           "delete from campanha where slug = 'teste-sul-2';"
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

    pg = entrar(b, 'gestor.norte@teste.org')
    pg.get_by_role('link', name='Usuários').click(); pg.locator('tr', has_text='Gestor Norte').wait_for()
    perfis = [pg.locator('fieldset label').nth(i).inner_text().split('\n')[0] for i in range(pg.locator('fieldset label').count())]
    check('gestor só convida Regional e Ponto focal', perfis == ['Regional', 'Ponto focal da escola'])
    check('gestor não tem botão para o próprio perfil', 'Gestor Norte' in pg.locator('table').inner_text() and pg.locator('tr', has_text='Gestor Norte').get_by_role('button').count() == 0)
    pg.get_by_label('E-mail institucional').fill('nova.escola@teste.org'); pg.get_by_label('Nome', exact=True).fill('Escola Beta')
    pg.get_by_label('Ponto focal da escola').check(); pg.locator('form select').last.select_option(label='EM BETA')
    desde = agora()
    pg.get_by_role('button', name='Enviar convite por e-mail').click()
    pg.get_by_text(re.compile('Convite enviado|Não foi possível convidar')).wait_for()
    check('convite enviado pela Edge Function', pg.get_by_text('Convite enviado para nova.escola@teste.org.').is_visible())
    check('perfil criado com o escopo certo', sql("select papel || ':' || co_inep from perfil p join auth.users u on u.id = p.user_id where u.email = 'nova.escola@teste.org'") == 'escola:91000002')
    check('e-mail de convite chegou', email_recebido('nova.escola@teste.org', desde) is not None)
    check('convite registrado na auditoria', sql("select count(*) from auditoria where acao = 'convidar_usuario' and alvo like 'nova.escola%'") == '1')

    chamar = """async (corpo) => {
      const chave = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'))
      const token = JSON.parse(localStorage.getItem(chave)).access_token
      const r = await fetch('http://127.0.0.1:56421/functions/v1/convidar-usuario', { method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      return [r.status, await r.json()]
    }"""
    st, corpo = pg.evaluate(chamar, {'email': 'x@teste.org', 'papel': 'admin'})
    check('função recusa gestor criando admin (403)', st == 403 and corpo.get('erro') == 'sem_permissao')
    st, corpo = pg.evaluate(chamar, {'email': 'y@teste.org', 'papel': 'escola', 'rede_id': '10000000-0000-0000-0000-000000000001', 'co_inep': 92000001})
    check('função recusa escola de outra rede e desfaz o convite', st == 400 and sql("select count(*) from auth.users where email = 'y@teste.org'") == '0')
    # Convite duplicado: outro gestor convida o mesmo e-mail pendente — não pode apagar o usuário existente
    pg_sul = entrar(b, 'gestor.sul@teste.org')
    st, corpo = pg_sul.evaluate(chamar, {'email': 'nova.escola@teste.org', 'nome': 'Intruso', 'papel': 'escola',
                                         'rede_id': '10000000-0000-0000-0000-000000000002', 'co_inep': 92000001})
    check('convite duplicado é recusado (409)', st == 409 and corpo.get('erro') == 'email_ja_cadastrado')
    check('usuário convidado antes continua existindo com o mesmo perfil',
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
