# Extrai do script consolidado (../database/001_estrutura_inicial.sql) o trecho entre dois marcadores.
# Uso: python3 scripts/extrair-secao.py "<início>" "<fim|FIM>" > supabase/migrations/<arquivo>.sql
import sys
src = open('../database/001_estrutura_inicial.sql', encoding='utf-8').read()
ini, fim = sys.argv[1], sys.argv[2]
a = src.index(ini)
b = len(src) if fim == 'FIM' else src.index(fim, a)
print(src[a:b].rstrip().removesuffix('commit;').rstrip() + '\n')
