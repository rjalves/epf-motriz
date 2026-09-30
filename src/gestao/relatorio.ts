export type Resumo = {
  rede: string; respondentes_amostra: number; matriculas_amostra: number; meta_total: number; em_andamento: number
  escolas_amostra: number; escolas_concluidas: number; escolas_iniciadas: number; escolas_nao_iniciadas: number
}
export type EscolaStatus = { co_inep: number; nome: string; regional: string; status: string; validos: number; meta: number; pct_meta: number | null }

export const COR_STATUS: Record<string, string> = {
  concluida: 'VERDE', iniciada: 'AMARELO', nao_iniciada: 'VERMELHO', fora_amostra: 'FORA DA AMOSTRA',
}
const pct = (a: number, b: number) => `${(b ? (100 * a) / b : 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

export function relatorioDiario(r: Resumo, dia: string): string {
  const escolas = (n: number) => `${n} escolas (${pct(n, r.escolas_amostra)})`
  return [
    'Prezado(a),', '',
    `Segue o panorama da participação na pesquisa EPF (${r.rede}) em ${dia}.`, '',
    `Total de estudantes (6º + 9º) nas escolas da amostra: ${r.matriculas_amostra}`,
    `Respostas concluídas até agora: ${r.respondentes_amostra} (${pct(r.respondentes_amostra, r.matriculas_amostra)})`,
    `Em andamento: ${r.em_andamento}`,
    `Meta: ${r.meta_total} respostas (${pct(r.respondentes_amostra, r.meta_total)} atingido)`, '',
    'Escolas por status:',
    `- VERDE (>= 85% responderam): ${escolas(r.escolas_concluidas)}`,
    `- AMARELO (1 a 84%, iniciaram): ${escolas(r.escolas_iniciadas)}`,
    `- VERMELHO (0%, não iniciaram): ${escolas(r.escolas_nao_iniciadas)}`,
    `Total de escolas: ${r.escolas_amostra}`, '',
    'Segue anexa a lista de escolas por status.', '',
    'Seguimos acompanhando. Qualquer orientação, à disposição.',
  ].join('\n')
}

export function csvEscolas(linhas: EscolaStatus[]): string {
  const c = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const cab = ['INEP', 'Escola', 'Regional', 'Status', 'Respostas válidas', 'Meta', '% da meta']
  const corpo = linhas.map((l) => [l.co_inep, l.nome, l.regional, COR_STATUS[l.status] ?? l.status, l.validos, l.meta,
    l.pct_meta == null ? '' : (l.pct_meta * 100).toFixed(1).replace('.', ',')].map(c).join(';'))
  return '﻿' + [cab.map(c).join(';'), ...corpo].join('\r\n')
}

// Ordem do painel: menor % da meta primeiro; escolas fora da amostra (sem meta) por último.
export const ordenarPorApoio = <T extends EscolaStatus>(escolas: T[]): T[] =>
  [...escolas].sort((a, b) =>
    Number(a.status === 'fora_amostra') - Number(b.status === 'fora_amostra') || (a.pct_meta ?? 0) - (b.pct_meta ?? 0))
