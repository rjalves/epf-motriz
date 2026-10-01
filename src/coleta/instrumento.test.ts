import { describe, expect, it } from 'vitest'
import { blocosDaSerie, itensVisiveis, pendencias, proximoBloco, respostasDoBloco, type Bloco } from './instrumento'

const A: Bloco = { codigo: 'A', titulo: 'Perfil', introducao: null, series: null, itens: [
  { codigo: 'A9', enunciado: 'Participa?', orientacao: null, tipo: 'unica', opcoes: ['Sim', 'Não'], max_escolhas: null, obrigatorio: true, depende_de: null },
  { codigo: 'A9_1', enunciado: 'Quais?', orientacao: null, tipo: 'multipla', opcoes: ['Música', 'Dança'], max_escolhas: 2, obrigatorio: false, depende_de: { item: 'A9', valor: 'Sim' } },
] }
const G: Bloco = { codigo: 'G', titulo: '6º', introducao: null, series: [6], itens: [] }
const H: Bloco = { codigo: 'H', titulo: '9º', introducao: null, series: [9], itens: [] }

describe('instrumento', () => {
  it('ramifica por série', () => {
    expect(blocosDaSerie([A, G, H], 6).map((b) => b.codigo)).toEqual(['A', 'G'])
    expect(blocosDaSerie([A, G, H], 7).map((b) => b.codigo)).toEqual(['A'])
  })
  it('esconde o item dependente e descarta a resposta escondida', () => {
    expect(itensVisiveis(A, { A9: 'Não' }).map((i) => i.codigo)).toEqual(['A9'])
    expect(respostasDoBloco(A, { A9: 'Não', A9_1: ['Música'] })).toEqual({ A9: 'Não' })
  })
  it('aponta obrigatórios pendentes', () => {
    expect(pendencias(A, {})).toEqual(['A9'])
    expect(pendencias(A, { A9: 'Sim' })).toEqual([])
  })
  it('retoma no primeiro bloco não salvo', () => {
    expect(proximoBloco([A, G], ['A'])).toBe(1)
    expect(proximoBloco([A, G], ['A', 'G'])).toBe(2)
  })
})
