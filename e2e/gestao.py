# Teste de ponta a ponta da área de gestão por perfil (Playwright + Mailpit local).
# Requer: supabase start (portas 564xx) + npm run dev (porta 5173). Uso: python3 e2e/gestao.py /tmp
import re, sys, time
from playwright.sync_api import sync_playwright
from util import BASE, check, entrar, resumo, sql

OUT = sys.argv[1]

# Dados de coleta: 30 concluídas no 6º de ALFA, 70 em BETA, 5 em andamento em ALFA
sql("delete from participante; delete from sessao;")
sql("""insert into sessao (campanha_id, co_inep, serie, idade, token_hash, status)
select '30000000-0000-0000-0000-000000000001', e, s, 12, '\\x00', st from (
  select 91000001 e, 6::smallint s, 'concluida' st, generate_series(1, 30) n
  union all select 91000001, 6::smallint, 'em_andamento', generate_series(1, 5)
  union all select 91000002, 9::smallint, 'concluida', generate_series(1, 70)) x""")

with sync_playwright() as p:
    b = p.chromium.launch()

    pg = b.new_page(); pg.goto(f'{BASE}/painel'); pg.get_by_label('E-mail institucional').fill('ninguem@teste.org')
    pg.get_by_role('button', name='Receber código').click()
    check('e-mail sem convite não recebe código', pg.get_by_text('Não encontramos um acesso para este e-mail').is_visible() or
          pg.get_by_text('Não encontramos um acesso para este e-mail').wait_for() is None)
    pg.get_by_label('E-mail institucional').fill('escola.alfa@teste.org'); pg.get_by_role('button', name='Receber código').click()
    pg.get_by_label('Código de acesso').fill('000000'); pg.get_by_role('button', name='Entrar').click()
    pg.get_by_text('Código incorreto ou vencido').wait_for()
    check('código errado é recusado e não entra', pg.locator('.epf-topo').count() == 0)
    pg.close(); time.sleep(1.5)  # intervalo mínimo entre códigos (max_frequency local = 1s)

    pg = entrar(b, 'escola.alfa@teste.org')
    pg.get_by_role('heading', name='EM ALFA').wait_for()
    check('ponto focal vai direto à própria escola', pg.get_by_role('link', name='Minha escola').is_visible())
    check('ponto focal vê o QR code', pg.get_by_role('img', name=re.compile('QR code')).is_visible())
    check('ponto focal não vê relatório nem menu Usuários', pg.get_by_role('button', name='Relatório diário').count() == 0 and pg.get_by_role('link', name='Usuários').count() == 0)
    check('ponto focal vê 44% da meta (30 de 68)', pg.get_by_text('44%').first.is_visible())
    pg.screenshot(path=f'{OUT}/g1-escola.png', full_page=True)

    pg = entrar(b, 'regional.n1@teste.org')
    pg.get_by_role('link', name='Abrir painel').first.click(); pg.get_by_role('heading', name=re.compile('^Escolas')).wait_for()
    linhas = pg.locator('table.epf-tabela tbody tr')
    check('regional vê só as escolas da regional (ALFA e GAMA)', linhas.count() == 2 and 'EM BETA' not in pg.locator('table.epf-tabela').inner_text())

    pg = entrar(b, 'gestor.norte@teste.org')
    pg.get_by_role('heading', name='Campanhas de aplicação').wait_for(); pg.locator('table.epf-tabela').wait_for()
    check('gestor vê só a campanha da própria rede', pg.locator('table.epf-tabela tbody tr').count() == 1 and 'Rede Norte' in pg.locator('table.epf-tabela').inner_text())
    check('gestor vê o menu Usuários', pg.get_by_role('link', name='Usuários').is_visible())
    pg.get_by_role('link', name='Abrir painel').click(); pg.get_by_role('heading', name=re.compile('^Escolas')).wait_for()
    check('gestor vê as 3 escolas da rede', pg.locator('table.epf-tabela tbody tr').count() == 3)
    check('ordem: quem precisa de apoio primeiro (ALFA iniciada antes de BETA concluída)',
          pg.locator('table.epf-tabela tbody tr').first.inner_text().startswith('EM ALFA'))
    pg.get_by_role('button', name='Relatório diário').click()
    check('relatório diário no modelo 2.C', 'Respostas concluídas até agora: 100' in pg.locator('.relatorio pre').inner_text())
    pg.get_by_role('button', name=re.compile('^Não iniciadas')).click()
    check('filtro por status', pg.locator('table.epf-tabela tbody tr').count() == 0 or 'Nenhuma escola' in pg.content())
    pg.get_by_role('button', name=re.compile('^Todas')).click()
    check('gestor não exporta respostas', pg.get_by_role('button', name=re.compile('Exportar respostas')).count() == 0)
    pg.screenshot(path=f'{OUT}/g2-painel-gestor.png', full_page=True)

    pg = entrar(b, 'pesquisa@teste.org')
    pg.get_by_role('link', name='Abrir painel').first.click(); pg.get_by_role('heading', name=re.compile('^Escolas')).wait_for()
    check('pesquisador exporta respostas', pg.get_by_role('button', name=re.compile('Exportar respostas')).is_visible())
    check('pesquisador não vê o link da pesquisa', pg.get_by_text('Link da pesquisa para os estudantes').count() == 0)

    pg = entrar(b, 'gestor.sul@teste.org')
    pg.get_by_role('heading', name='Campanhas de aplicação').wait_for(); pg.locator('table.epf-tabela').wait_for()
    check('gestor Sul não vê Rede Norte', 'Rede Norte' not in pg.content())
    b.close()
resumo()
