# Utilidades dos testes de ponta a ponta: login por código de 6 dígitos (Mailpit local), SQL no banco local, checks.
import json, re, subprocess, time, urllib.request

BASE, MAIL = 'http://localhost:5173', 'http://127.0.0.1:56424'
resultados = []

def check(nome, cond):
    resultados.append(bool(cond)); print(('OK   ' if cond else 'FALHA ') + nome)

def resumo():
    print(f'{sum(resultados)}/{len(resultados)} verificações')
    if not all(resultados): raise SystemExit(1)

def sql(q):
    return subprocess.run(['docker', 'exec', 'supabase_db_epf-monitor', 'psql', '-U', 'postgres', '-tAc', q],
                          check=True, capture_output=True, text=True).stdout.strip()

def ids_emails(email):
    with urllib.request.urlopen(f'{MAIL}/api/v1/search?query=to:{email}') as r:
        return {m['ID'] for m in json.load(r)['messages']}

def codigo_recebido(email, antes):
    # Só e-mails que não existiam antes do clique: um código anterior já não vale.
    for _ in range(40):
        novos = ids_emails(email) - antes
        if novos:
            with urllib.request.urlopen(f'{MAIL}/api/v1/message/{novos.pop()}') as r:
                return re.search(r'\b\d{6}\b', json.load(r)['Text']).group(0)
        time.sleep(0.5)
    raise RuntimeError(f'e-mail não chegou para {email}')

def entrar(b, email, largura=1440):
    pg = b.new_context(viewport={'width': largura, 'height': 900}, locale='pt-BR').new_page()
    pg.goto(f'{BASE}/painel'); pg.get_by_label('E-mail institucional').fill(email)
    antes = ids_emails(email)
    pg.get_by_role('button', name='Receber código').click()
    pg.get_by_label('Código de acesso').fill(codigo_recebido(email, antes))
    pg.get_by_role('button', name='Entrar').click(); pg.locator('.epf-topo').wait_for()
    return pg
