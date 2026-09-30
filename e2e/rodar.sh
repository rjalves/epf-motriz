#!/usr/bin/env bash
# Roda os três testes de ponta a ponta em sequência. Requer supabase start (com edge-runtime) e npm run dev.
set -e
cd "$(dirname "$0")"
SAIDA=${1:-/tmp}
python3 estudante.py "$SAIDA"
python3 gestao.py "$SAIDA"
python3 configuracao.py "$SAIDA"
