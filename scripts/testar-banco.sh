#!/usr/bin/env bash
# Sobe um Postgres do Supabase descartável, aplica migrações + seed e roda os testes pgTAP.
# Uso: scripts/testar-banco.sh [arquivo.test.sql ...]   (sem argumentos: todos)
set -uo pipefail
cd "$(dirname "$0")/.."
NOME=epf-monitor-db-teste; PORTA=54398; IMG=supabase/postgres:15.8.1.060
URL="postgresql://postgres:teste@localhost:$PORTA/postgres"
docker rm -f $NOME >/dev/null 2>&1
docker run -d --name $NOME -e POSTGRES_PASSWORD=teste -p $PORTA:5432 $IMG >/dev/null || exit 1
for _ in $(seq 1 60); do docker exec $NOME pg_isready -U postgres -h localhost >/dev/null 2>&1 && break; sleep 1; done; sleep 4
falhou=0
for m in supabase/migrations/*.sql; do
  [ -e "$m" ] || continue
  psql "$URL" -v ON_ERROR_STOP=1 -q -f "$m" >/dev/null 2>/tmp/epf-mig.err || { echo "MIGRAÇÃO FALHOU: $m"; cat /tmp/epf-mig.err; falhou=1; break; }
done
if [ $falhou = 0 ] && [ -f supabase/seed.sql ]; then
  psql "$URL" -v ON_ERROR_STOP=1 -q -f supabase/seed.sql >/dev/null 2>/tmp/epf-seed.err || { echo "SEED FALHOU"; cat /tmp/epf-seed.err; falhou=1; }
fi
if [ $falhou = 0 ]; then
  testes=("$@"); [ ${#testes[@]} -eq 0 ] && testes=(supabase/tests/*.test.sql)
  for t in "${testes[@]}"; do
    saida=$(psql "$URL" -q -X -A -t -f "$t" 2>&1)
    total=$(printf '%s\n' "$saida" | grep -cE '^(not )?ok [0-9]')
    ruins=$(printf '%s\n' "$saida" | grep -E '^not ok|ERROR|# Looks like|planned')
    if [ -n "$ruins" ] || [ "$total" = 0 ]; then echo "FAIL $t"; printf '%s\n' "$ruins" | head -20; falhou=1
    else echo "ok   $t ($total testes)"; fi
  done
fi
docker rm -f $NOME >/dev/null 2>&1
exit $falhou
