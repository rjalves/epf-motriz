import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { gerarInstrumento } from './gerar-instrumento'

const linhas = () => {
  const wb = XLSX.read(readFileSync(new URL('./__fixtures__/questoes-formulario.xlsx', import.meta.url)), { type: 'buffer' })
  return XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null })
}

describe('gerarInstrumento', () => {
  const inst = gerarInstrumento(linhas())
  const bloco = (c: string) => inst.blocos.find((b) => b.codigo === c)!
  const item = (c: string) => inst.blocos.flatMap((b) => b.itens).find((i) => i.codigo === c)!

  it('gera os blocos A–I, com G só para o 6º e H só para o 9º', () => {
    expect(inst.blocos.map((b) => b.codigo)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'])
    expect(bloco('G').series).toEqual([6])
    expect(bloco('H').series).toEqual([9])
  })

  it('tira do questionário o que vem do cadastro (idade, série, escola)', () => {
    const codigos = inst.blocos.flatMap((b) => b.itens.map((i) => i.codigo))
    for (const c of ['A1', 'A5', 'A6']) expect(codigos).not.toContain(c)
  })

  it('preenche códigos faltantes pela posição, sem duplicar', () => {
    expect(item('E5').enunciado).toMatch(/^Eu me mantenho calmo/)
    expect(item('H2').enunciado).toBe('A escola me incentiva a continuar meus estudos e a concluir o Ensino Fundamental.')
    const codigos = inst.blocos.flatMap((b) => b.itens.map((i) => i.codigo))
    expect(new Set(codigos).size).toBe(codigos.length)
  })

  it('completa opções, limites e dependências das múltiplas escolhas', () => {
    expect(item('B6')).toMatchObject({ tipo: 'multipla', max_escolhas: 3 })
    expect(item('B6').opcoes).toHaveLength(9)
    expect(item('A9_1').depende_de).toEqual({ item: 'A9', valor: 'Sim' })
    expect(item('A4').opcoes).toContain('Transtorno do Espectro Autista (TEA).')
  })

  it('marca reversos e deixa as abertas opcionais', () => {
    expect(item('B11').reverso).toBe(true)
    expect(item('I1')).toMatchObject({ tipo: 'texto', obrigatorio: false })
  })
})
