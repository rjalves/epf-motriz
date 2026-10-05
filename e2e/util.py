# Utilidades dos testes de ponta a ponta: login por código de 6 dígitos, SQL no banco local, checks.
# O banco envia os e-mails pela API do Resend (pg_net); aqui um Resend falso recebe e guarda cada envio.
# O seed local aponta config_privada.resend_url para http://host.docker.internal:58025/emails.
import json, re, subprocess, threading, time
from http.server import BaseHTTPRequestHandler, HTTPServer

BASE = 'http://localhost:5173'
resultados = []
enviados = []  # corpos recebidos pelo Resend falso: from, to, subject, html (+ caminho e auth)

class _ResendFalso(BaseHTTPRequestHandler):
    def do_POST(self):
        corpo = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        enviados.append({'caminho': self.path, 'auth': self.headers.get('Authorization'), **corpo})
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers()
        self.wfile.write(b'{"id":"falso"}')
    def log_message(self, *a): pass
threading.Thread(target=HTTPServer(('0.0.0.0', 58025), _ResendFalso).serve_forever, daemon=True).start()

def check(nome, cond):
    resultados.append(bool(cond)); print(('OK   ' if cond else 'FALHA ') + nome)

def resumo():
    print(f'{sum(resultados)}/{len(resultados)} verificações')
    if not all(resultados): raise SystemExit(1)

def sql(q):
    return subprocess.run(['docker', 'exec', 'supabase_db_epf-monitor', 'psql', '-U', 'postgres', '-tAc', q],
                          check=True, capture_output=True, text=True).stdout.strip()

def ids_emails(email):
    return {i for i, e in enumerate(enviados) if e.get('to') == [email]}

def email_recebido(email, antes):
    # Só e-mails que chegaram depois do clique: um código anterior já não vale.
    for _ in range(40):
        novos = ids_emails(email) - antes
        if novos: return enviados[max(novos)]
        time.sleep(0.5)
    raise RuntimeError(f'e-mail não chegou para {email}')

def codigo_recebido(email, antes):
    return re.search(r'\b\d{6}\b', email_recebido(email, antes)['html']).group(0)

def entrar(b, email, largura=1440):
    pg = b.new_context(viewport={'width': largura, 'height': 900}, locale='pt-BR').new_page()
    pg.goto(f'{BASE}/painel'); pg.get_by_label('E-mail institucional').fill(email)
    antes = ids_emails(email)
    pg.get_by_role('button', name='Receber código').click()
    pg.get_by_label('Código de acesso').fill(codigo_recebido(email, antes))
    pg.get_by_role('button', name='Entrar').click(); pg.locator('.epf-topo').wait_for()
    return pg
