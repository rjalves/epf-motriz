import * as XLSX from 'xlsx'

export type EscolaAmostra = {
  co_inep: number; nome: string; municipio: string | null; categoria: string | null; pct_ppi: number | null
  eti: boolean | null; localizacao: string | null; qt_mat_6: number; turmas_6: number | null; qt_mat_9: number
  turmas_9: number | null; parecer: string | null; justificativa: string | null; in_amostra: boolean
  regional: string | null; latitude: number | null; longitude: number | null
}
type Campo = Exclude<keyof EscolaAmostra, 'in_amostra'>

// Cabeçalhos da planilha da Germina (minúsculas, espaços colapsados). Primeiro match vence.
const CAMPOS: [Campo, RegExp][] = [
  ['co_inep', /^c[oó]digo inep/], ['nome', /^nome da escola/], ['municipio', /^munic/], ['categoria', /^categoria/],
  ['pct_ppi', /ppi/], ['eti', /tempo integral/], ['localizacao', /^localiza/],
  ['qt_mat_6', /matr[ií]culas.*6/], ['turmas_6', /turmas.*6/], ['qt_mat_9', /matr[ií]culas.*9/], ['turmas_9', /turmas.*9/],
  ['parecer', /^parecer/], ['justificativa', /^justificativa/], ['regional', /regional/],
  ['latitude', /^latitude/], ['longitude', /^lon?gitude/],
]
const OBRIGATORIOS: Campo[] = ['co_inep', 'nome', 'qt_mat_6', 'qt_mat_9']
const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
const txt = (v: unknown) => norm(v) || null
const num = (v: unknown) => { const s = norm(v).replace(',', '.'); return s === '' || Number.isNaN(Number(s)) ? null : Number(s) }

export function matrizParaAmostra(matriz: unknown[][]): EscolaAmostra[] {
  const iCab = matriz.findIndex((l) => (l ?? []).some((c) => /^c[oó]digo inep/i.test(norm(c))))
  if (iCab < 0) throw new Error('Cabeçalho "Código INEP" não encontrado no plano amostral')
  const nomes = matriz[iCab].map((c) => norm(c).toLowerCase())
  const col = Object.fromEntries(CAMPOS.map(([campo, re]) => [campo, nomes.findIndex((n) => re.test(n))])) as Record<Campo, number>
  for (const c of OBRIGATORIOS) if (col[c] < 0) throw new Error(`Coluna obrigatória ausente no plano amostral: ${c}`)
  const v = (l: unknown[], c: Campo) => (col[c] < 0 ? null : l[col[c]])
  return matriz.slice(iCab + 1).flatMap((l) => {
    const inep = num(v(l, 'co_inep'))
    if (inep === null) return []
    const parecer = txt(v(l, 'parecer'))
    const eti = num(v(l, 'eti'))
    return [{
      co_inep: Math.trunc(inep), nome: norm(v(l, 'nome')), municipio: txt(v(l, 'municipio')), categoria: txt(v(l, 'categoria')),
      pct_ppi: num(v(l, 'pct_ppi')), eti: eti === null ? null : eti === 1, localizacao: txt(v(l, 'localizacao')),
      qt_mat_6: Math.trunc(num(v(l, 'qt_mat_6')) ?? 0), turmas_6: num(v(l, 'turmas_6')),
      qt_mat_9: Math.trunc(num(v(l, 'qt_mat_9')) ?? 0), turmas_9: num(v(l, 'turmas_9')),
      parecer, justificativa: txt(v(l, 'justificativa')), in_amostra: !/^substitu/i.test(parecer ?? ''),
      regional: txt(v(l, 'regional')), latitude: num(v(l, 'latitude')), longitude: num(v(l, 'longitude')),
    }]
  })
}

export function lerPlanoAmostral(dados: ArrayBuffer | Uint8Array): EscolaAmostra[] {
  const wb = XLSX.read(new Uint8Array(dados), { type: 'array' })
  return matrizParaAmostra(XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null, blankrows: true }))
}
