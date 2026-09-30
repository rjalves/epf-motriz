import { describe, expect, it } from 'vitest'
import { csvEscolas, relatorioDiario } from './relatorio'

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
