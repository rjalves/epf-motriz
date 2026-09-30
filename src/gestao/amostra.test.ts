import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { lerPlanoAmostral, matrizParaAmostra } from './amostra'

describe('matrizParaAmostra', () => {
  it('acha o cabeçalho abaixo de linha vazia e lê colunas opcionais', () => {
    const m = [[], ['Código INEP', 'Nome da Escola', 'Quantidade matrículas\n6º ano', 'Quantidade de matrículas\n9º ano', 'Órgão Regional'],
      [24058807.0, 'ESC MUL CELESTINO PIMENTEL', 119, 73, 'Norte']]
    expect(matrizParaAmostra(m)[0]).toMatchObject({ co_inep: 24058807, qt_mat_6: 119, qt_mat_9: 73, regional: 'Norte', in_amostra: true })
  })
  it('parecer "Substituir…" tira a escola da amostra', () => {
    const m = [['Código INEP', 'Nome da Escola', 'Quantidade matrículas 6º ano', 'Quantidade de matrículas 9º ano', 'Parecer SME Natal'],
      [1, 'A', 1, 0, 'Substituir da amostra']]
    expect(matrizParaAmostra(m)[0].in_amostra).toBe(false)
  })
})

describe('lerPlanoAmostral', () => {
  it('importa o plano de Natal: 20 escolas, 19 na amostra', () => {
    const e = lerPlanoAmostral(readFileSync(new URL('./__fixtures__/plano-natal.xlsx', import.meta.url)))
    expect(e).toHaveLength(20)
    expect(e.filter((x) => x.in_amostra)).toHaveLength(19)
    expect(e.reduce((s, x) => s + x.qt_mat_6, 0)).toBe(2661)
  })
})
