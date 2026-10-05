#!/usr/bin/env bash
# Publica a Edge Function convidar-usuario no Supabase autohospedado (Easypanel) e confere as variáveis.
# Uso (de dentro de epf-monitor): scripts/publicar-funcao.sh root@34.67.172.27
set -euo pipefail
ALVO=${1:?informe o acesso SSH, ex.: root@34.67.172.27}
ORIGEM=supabase/functions/convidar-usuario/index.ts
[ -f "$ORIGEM" ] || { echo "Rode de dentro da pasta epf-monitor."; exit 1; }

# A pasta das funções é a que já contém o exemplo "hello".
HELLO=$(ssh "$ALVO" 'find /etc/easypanel -path "*volumes/functions/hello/index.ts" 2>/dev/null | head -1')
[ -n "$HELLO" ] || { echo "Não encontrei volumes/functions/hello no servidor."; exit 1; }
DIR=$(dirname "$(dirname "$HELLO")")
echo "Pasta das funções: $DIR"

ssh "$ALVO" "mkdir -p '$DIR/convidar-usuario'"
scp -q "$ORIGEM" "$ALVO:$DIR/convidar-usuario/index.ts"
echo "Função copiada: $DIR/convidar-usuario/index.ts"

echo "Variáveis no contêiner de funções:"
ssh "$ALVO" 'c=$(docker ps --format "{{.Names}}" | grep -m1 -E "functions|edge-runtime"); echo "  contêiner: $c"
  for v in SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY SITE_URL RESEND_API_KEY EMAIL_REMETENTE; do
    if docker exec "$c" printenv "$v" >/dev/null 2>&1; then echo "  $v: ok"; else echo "  $v: FALTA"; fi
  done'
echo "Se alguma variável FALTA: acrescente em functions → environment no docker-compose.yml (ex.: SITE_URL: \${SITE_URL}) e faça Deploy."
