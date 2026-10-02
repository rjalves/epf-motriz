import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { lerQuestionarioXlsx, planilhaDoQuestionario, validarQuestionario, type Questionario } from './questionario'

const epf: Questionario = JSON.parse(readFileSync('supabase/instrumento/epf-2026-v1.json', 'utf8'))
const paraBuffer = (wb: XLSX.WorkBook) => XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
const copia = (): Questionario => structuredClone(epf)

// Monta uma planilha mínima a partir de linhas, no formato do modelo.
function planilha(blocos: unknown[][], itens: unknown[][]) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['codigo', 'titulo', 'introducao', 'series'], ...blocos]), 'Blocos')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['bloco', 'codigo', 'enunciado', 'orientacao', 'tipo', 'opcoes',
    'max_escolhas', 'obrigatorio', 'reverso', 'construto', 'depende_de_item', 'depende_de_valor'], ...itens]), 'Itens')
  return paraBuffer(wb)
}

describe('modelo Excel do questionário', () => {
  it('a planilha gerada do EPF 2026 volta idêntica ao JSON', () => {
    const r = lerQuestionarioXlsx(paraBuffer(planilhaDoQuestionario(epf)))
    expect(r.erros).toEqual([])
    expect(r.questionario).toEqual(epf)
  })

  it('o modelo tem as abas Instruções, Blocos e Itens', () => {
    expect(planilhaDoQuestionario(epf).SheetNames).toEqual(['Instruções', 'Blocos', 'Itens'])
  })

  it('lê séries, sim/não e opções separadas por barra', () => {
    const r = lerQuestionarioXlsx(planilha(
      [['A', 'Perfil', null, null], ['G', 'Só 6º e 7º', 'Intro', '6, 7']],
      [['A', 'A1', 'Pratica esporte?', null, 'unica', 'Sim | Não', null, 'sim', 'não', 'Perfil', null, null],
       ['A', 'A2', 'Qual?', null, 'multipla', 'Futebol|Vôlei | Outro', 2, 'não', null, null, 'A1', 'Sim'],
       ['G', 'G1', 'Gosto da escola.', null, 'likert5', null, null, null, 'SIM', null, null, null]]))
    expect(r.erros).toEqual([])
    const [a, g] = r.questionario!.blocos
    expect(g).toMatchObject({ codigo: 'G', introducao: 'Intro', series: [6, 7] })
    expect(a.series).toBeNull()
    expect(a.itens[1]).toMatchObject({ opcoes: ['Futebol', 'Vôlei', 'Outro'], max_escolhas: 2, obrigatorio: false,
      depende_de: { item: 'A1', valor: 'Sim' } })
    expect(g.itens[0]).toMatchObject({ tipo: 'likert5', opcoes: [], obrigatorio: true, reverso: true })
  })

  it('aponta a linha da planilha quando o item é de um bloco que não existe', () => {
    const r = lerQuestionarioXlsx(planilha([['A', 'Perfil', null, null]],
      [['A', 'A1', 'Ok?', null, 'texto', null, null, null, null, null, null, null],
       ['Z', 'Z1', 'Perdido', null, 'texto', null, null, null, null, null, null, null]]))
    expect(r.erros).toContain('Aba Itens, linha 3: o bloco "Z" não está na aba Blocos.')
  })

  it('aponta valor de sim/não que não entende', () => {
    const r = lerQuestionarioXlsx(planilha([['A', 'Perfil', null, null]],
      [['A', 'A1', 'Ok?', null, 'texto', null, null, 'talvez', null, null, null, null]]))
    expect(r.erros).toContain('Aba Itens, linha 2: "obrigatorio" deve ser sim ou não (veio "talvez").')
  })

  it('recusa arquivo sem as abas do modelo', () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['qualquer']]), 'EPF_2026')
    expect(lerQuestionarioXlsx(paraBuffer(wb)).erros[0]).toMatch(/abas "Blocos" e "Itens"/)
  })
})

describe('validação do questionário', () => {
  it('aceita o EPF 2026', () => {
    expect(validarQuestionario(epf)).toEqual([])
  })

  it('recusa JSON sem blocos', () => {
    expect(validarQuestionario({})).toEqual(['O arquivo não tem a lista "blocos".'])
  })

  it('recusa tipo de pergunta desconhecido', () => {
    const q = copia(); q.blocos[0].itens[0].tipo = 'escala' as never
    expect(validarQuestionario(q)).toContain('Item A2: tipo "escala" não existe. Use likert5, unica, multipla, texto ou numero.')
  })

  it('exige ao menos duas opções em escolha única ou múltipla', () => {
    const q = copia(); q.blocos[0].itens[0].opcoes = ['Branca']
    expect(validarQuestionario(q)).toContain('Item A2: escolha única ou múltipla precisa de ao menos 2 opções.')
  })

  it('recusa código de item repetido', () => {
    const q = copia(); q.blocos[1].itens[0].codigo = 'A2'
    expect(validarQuestionario(q)).toContain('Item A2: código repetido (cada item precisa de um código único).')
  })

  it('recusa condição que aponta para item ou opção inexistente', () => {
    const q = copia()
    const a9_1 = q.blocos[0].itens.find((i) => i.codigo === 'A9_1')!
    a9_1.depende_de = { item: 'A99', valor: 'Sim' }
    const a10_1 = q.blocos[0].itens.find((i) => i.codigo === 'A10_1')!
    a10_1.depende_de = { item: 'A10', valor: 'Talvez' }
    const erros = validarQuestionario(q)
    expect(erros).toContain('Item A9_1: depende do item "A99", que não existe antes dele.')
    expect(erros).toContain('Item A10_1: a opção "Talvez" não existe no item A10.')
  })

  it('recusa série fora de 6º a 9º e máximo de escolhas maior que as opções', () => {
    const q = copia(); q.blocos[0].series = [5]
    const b6 = q.blocos[1].itens.find((i) => i.codigo === 'B6')!
    b6.max_escolhas = 20
    const erros = validarQuestionario(q)
    expect(erros).toContain('Bloco A: séries devem ser de 6 a 9 (veio 5).')
    expect(erros).toContain('Item B6: máximo de escolhas (20) maior que o número de opções (9).')
  })
})
