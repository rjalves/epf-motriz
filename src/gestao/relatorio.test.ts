import { describe, expect, it } from 'vitest'
import { csvEscolas, ordenarPorApoio, relatorioDiario } from './relatorio'

const resumo = { rede: 'Rede Exemplo', respondentes_amostra: 13, matriculas_amostra: 380, meta_total: 323, em_andamento: 7,
  escolas_amostra: 4, escolas_concluidas: 0, escolas_iniciadas: 4, escolas_nao_iniciadas: 0 }

describe('relatorioDiario', () => {
  it('segue o template 2.C com os números da campanha', () => {
    const t = relatorioDiario(resumo, '06/10')
    expect(t).toContain('participação na pesquisa EPF (Rede Exemplo) em 06/10')
    expect(t).toContain('Respostas concluídas até agora: 13 (3,4%)')
    expect(t).toContain('Em andamento: 7')
    expect(t).toContain('- AMARELO (1 a 84%, iniciaram): 4 escolas (100%)')
  })
  it('não divide por zero', () => {
    expect(relatorioDiario({ ...resumo, matriculas_amostra: 0, escolas_amostra: 0 }, '01/10')).toContain('13 (0%)')
  })
})

describe('csvEscolas', () => {
  it('gera CSV com BOM, ; e cor do status', () => {
    const csv = csvEscolas([{ co_inep: 1, nome: 'EM "A"', regional: 'Norte', status: 'iniciada', validos: 5, meta: 98, pct_meta: 0.051 }])
    expect(csv.startsWith('﻿"INEP";"Escola"')).toBe(true)
    expect(csv).toContain('"1";"EM ""A""";"Norte";"AMARELO";"5";"98";"5,1"')
  })
})

describe('ordenarPorApoio', () => {
  it('põe quem mais precisa de apoio primeiro e quem está fora da amostra por último', () => {
    const e = (co_inep: number, status: string, pct_meta: number | null) => ({ co_inep, nome: String(co_inep), regional: '', status, validos: 0, meta: 0, pct_meta })
    const ordem = ordenarPorApoio([e(1, 'fora_amostra', null), e(2, 'concluida', 1.2), e(3, 'iniciada', 0.4), e(4, 'nao_iniciada', 0)])
    expect(ordem.map((x) => x.co_inep)).toEqual([4, 3, 2, 1])
  })
})
