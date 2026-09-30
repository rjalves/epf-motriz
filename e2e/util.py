# Utilidades dos testes de ponta a ponta: login por link mágico (Mailpit local), SQL no banco local, checks.
import json, re, subprocess, time, urllib.request

BASE, MAIL = 'http://localhost:5173', 'http://127.0.0.1:56424'
resultados = []

def check(nome, cond):
    resultados.append(bool(cond)); print(('OK   ' if cond else 'FALHA ') + nome)

def resumo():
    print(f'{sum(resultados)}/{len(resultados)} verificações')

def sql(q):
    return subprocess.run(['docker', 'exec', 'supabase_db_epf-monitor', 'psql', '-U', 'postgres', '-tAc', q],
                          check=True, capture_output=True, text=True).stdout.strip()

def agora():
    return time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime(time.time() - 2))

def email_recebido(email, desde):
    for _ in range(40):
        with urllib.request.urlopen(f'{MAIL}/api/v1/search?query=to:{email}') as r:
            msgs = [m for m in json.load(r)['messages'] if m['Created'] > desde]
        if msgs:
            with urllib.request.urlopen(f"{MAIL}/api/v1/message/{msgs[0]['ID']}") as r:
                return json.load(r)
        time.sleep(0.5)
    return None

def link_magico(email, desde):
    msg = email_recebido(email, desde)
    if not msg: raise RuntimeError(f'e-mail não chegou para {email}')
    return re.search(r'https?://\S+verify\S+', msg['Text']).group(0).replace('&amp;', '&')

def entrar(b, email, largura=1440):
    pg = b.new_context(viewport={'width': largura, 'height': 900}, locale='pt-BR').new_page()
    pg.goto(f'{BASE}/painel'); pg.get_by_label('E-mail institucional').fill(email)
    desde = agora()
    pg.get_by_role('button', name='Receber link de acesso').click()
    pg.get_by_text('Enviamos um link de acesso para o seu e-mail.').wait_for()
    pg.goto(link_magico(email, desde)); pg.locator('.epf-topo').wait_for()
    return pg
