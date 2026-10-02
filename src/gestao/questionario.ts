// Questionário: formato JSON (o que importar_instrumento grava), modelo Excel equivalente e validação.
import * as XLSX from 'xlsx'

export type Tipo = 'likert5' | 'unica' | 'multipla' | 'texto' | 'numero'
export type Item = {
  codigo: string; enunciado: string; orientacao: string | null; tipo: Tipo; opcoes: string[]
  max_escolhas: number | null; obrigatorio: boolean; reverso: boolean; construto: string | null
  depende_de: { item: string; valor: string } | null
}
export type Bloco = { codigo: string; titulo: string; introducao: string | null; series: number[] | null; itens: Item[] }
export type Questionario = { blocos: Bloco[] }

const TIPOS: Tipo[] = ['likert5', 'unica', 'multipla', 'texto', 'numero']
const COLS_BLOCOS = ['codigo', 'titulo', 'introducao', 'series']
const COLS_ITENS = ['bloco', 'codigo', 'enunciado', 'orientacao', 'tipo', 'opcoes', 'max_escolhas', 'obrigatorio',
  'reverso', 'construto', 'depende_de_item', 'depende_de_valor']

const INSTRUCOES = [
  ['Modelo de questionário EPF'],
  [],
  ['Preencha as abas "Blocos" e "Itens" e importe o arquivo em Configurar campanha → Questionário.'],
  ['O nome da nova versão é o nome do arquivo (ex.: "EPF 2026 v2.xlsx" vira "EPF 2026 v2").'],
  ['Não renomeie as abas nem as colunas. A ordem das linhas é a ordem em que o estudante vê.'],
  [],
  ['Aba Blocos'],
  ['codigo', 'Letra ou código curto do bloco (ex.: A). Único.'],
  ['titulo', 'Título que o estudante vê no topo da parte.'],
  ['introducao', 'Texto opcional antes das perguntas.'],
  ['series', 'Em branco = todas as séries. Para restringir, informe os anos separados por vírgula (ex.: 6 ou 6, 7).'],
  [],
  ['Aba Itens'],
  ['bloco', 'Código do bloco a que a pergunta pertence (precisa existir na aba Blocos).'],
  ['codigo', 'Código único da pergunta (ex.: A2). Aparece na exportação das respostas.'],
  ['enunciado', 'Texto da pergunta.'],
  ['orientacao', 'Texto de apoio opcional, mostrado abaixo da pergunta.'],
  ['tipo', 'likert5 (Discordo muito … Concordo muito), unica, multipla, texto ou numero.'],
  ['opcoes', 'Alternativas separadas por | (ex.: Sim | Não). Obrigatório para unica e multipla; em branco nos demais.'],
  ['max_escolhas', 'Só para multipla: quantas alternativas o estudante pode marcar. Em branco = sem limite.'],
  ['obrigatorio', 'sim ou não. Em branco = sim.'],
  ['reverso', 'sim se a escala é invertida na análise. Em branco = não.'],
  ['construto', 'Tema ou construto da pergunta, para a análise. Opcional.'],
  ['depende_de_item', 'Opcional: código de uma pergunta anterior. Esta só aparece se ela tiver a resposta abaixo.'],
  ['depende_de_valor', 'A alternativa da pergunta anterior que faz esta aparecer (ex.: Sim).'],
]

const texto = (v: unknown) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim())
const ouNulo = (v: unknown) => texto(v) || null

export function planilhaDoQuestionario(q: Questionario): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const instrucoes = XLSX.utils.aoa_to_sheet(INSTRUCOES)
  instrucoes['!cols'] = [{ wch: 18 }, { wch: 100 }]
  const blocos = XLSX.utils.aoa_to_sheet([COLS_BLOCOS,
    ...q.blocos.map((b) => [b.codigo, b.titulo, b.introducao, b.series?.join(', ') ?? null])])
  blocos['!cols'] = [{ wch: 8 }, { wch: 40 }, { wch: 60 }, { wch: 10 }]
  const itens = XLSX.utils.aoa_to_sheet([COLS_ITENS, ...q.blocos.flatMap((b) => b.itens.map((i) => [
    b.codigo, i.codigo, i.enunciado, i.orientacao, i.tipo, i.opcoes.length ? i.opcoes.join(' | ') : null,
    i.max_escolhas, i.obrigatorio ? 'sim' : 'não', i.reverso ? 'sim' : 'não', i.construto,
    i.depende_de?.item ?? null, i.depende_de?.valor ?? null]))])
  itens['!cols'] = [{ wch: 6 }, { wch: 8 }, { wch: 60 }, { wch: 30 }, { wch: 9 }, { wch: 60 },
    { wch: 12 }, { wch: 11 }, { wch: 8 }, { wch: 20 }, { wch: 15 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, instrucoes, 'Instruções')
  XLSX.utils.book_append_sheet(wb, blocos, 'Blocos')
  XLSX.utils.book_append_sheet(wb, itens, 'Itens')
  return wb
}

export function lerQuestionarioXlsx(arquivo: ArrayBuffer): { questionario?: Questionario; erros: string[] } {
  const wb = XLSX.read(arquivo, { type: 'array' })
  const aba = (nome: string) => wb.Sheets[wb.SheetNames.find((n) => n.trim().toLowerCase() === nome.toLowerCase()) ?? '']
  const [sb, si] = [aba('Blocos'), aba('Itens')]
  if (!sb || !si) return { erros: ['O arquivo precisa ter as abas "Blocos" e "Itens" do modelo. Baixe o modelo Excel e preencha nele.'] }

  const erros: string[] = []
  const linhas = (s: XLSX.WorkSheet, nome: string, cols: string[]) => {
    const [cab = [], ...corpo] = XLSX.utils.sheet_to_json<unknown[]>(s, { header: 1, defval: null, blankrows: true })
    const pos = cols.map((c) => (cab as unknown[]).map((h) => texto(h).toLowerCase()).indexOf(c))
    const faltam = cols.filter((_, k) => pos[k] < 0)
    if (faltam.length) erros.push(`Aba ${nome}: faltam as colunas ${faltam.join(', ')}.`)
    return corpo.map((l, k) => ({ n: k + 2, v: Object.fromEntries(cols.map((c, j) => [c, l[pos[j]] ?? null])) }))
      .filter((l) => Object.values(l.v).some((x) => texto(x)))
  }
  const lb = linhas(sb, 'Blocos', COLS_BLOCOS)
  const li = linhas(si, 'Itens', COLS_ITENS)
  if (erros.length) return { erros }

  const simNao = (v: unknown, padrao: boolean, campo: string, n: number) => {
    const t = texto(v).toLowerCase()
    if (!t) return padrao
    if (['sim', 's', 'x', 'true', '1'].includes(t)) return true
    if (['não', 'nao', 'n', 'false', '0'].includes(t)) return false
    erros.push(`Aba Itens, linha ${n}: "${campo}" deve ser sim ou não (veio "${texto(v)}").`)
    return padrao
  }

  const blocos: Bloco[] = lb.map(({ v }) => ({
    codigo: texto(v.codigo), titulo: texto(v.titulo), introducao: ouNulo(v.introducao),
    series: texto(v.series) ? texto(v.series).split(/[,;\s]+/).filter(Boolean).map(Number) : null, itens: [],
  }))
  for (const { n, v } of li) {
    const bloco = blocos.find((b) => b.codigo === texto(v.bloco))
    if (!bloco) { erros.push(`Aba Itens, linha ${n}: o bloco "${texto(v.bloco)}" não está na aba Blocos.`); continue }
    const max = texto(v.max_escolhas)
    bloco.itens.push({
      codigo: texto(v.codigo), enunciado: texto(v.enunciado), orientacao: ouNulo(v.orientacao),
      tipo: texto(v.tipo).toLowerCase() as Tipo,
      opcoes: texto(v.opcoes) ? String(v.opcoes).split('|').map(texto).filter(Boolean) : [],
      max_escolhas: max ? Number(max) : null,
      obrigatorio: simNao(v.obrigatorio, true, 'obrigatorio', n), reverso: simNao(v.reverso, false, 'reverso', n),
      construto: ouNulo(v.construto),
      depende_de: texto(v.depende_de_item) ? { item: texto(v.depende_de_item), valor: texto(v.depende_de_valor) } : null,
    })
  }
  const questionario = { blocos }
  erros.push(...validarQuestionario(questionario))
  return erros.length ? { erros } : { questionario, erros }
}

// Regras que o banco não confere (ele só grava): mensagens para quem preencheu o arquivo.
export function validarQuestionario(q: unknown): string[] {
  const blocos = (q as Questionario | null)?.blocos
  if (!Array.isArray(blocos)) return ['O arquivo não tem a lista "blocos".']
  if (!blocos.length) return ['O questionário precisa de ao menos um bloco.']
  const erros: string[] = []
  const codigosBlocos = new Set<string>()
  const anteriores = new Map<string, Item>()

  for (const b of blocos) {
    const nomeB = `Bloco ${b?.codigo || '(sem código)'}`
    if (!b?.codigo) erros.push(`${nomeB}: falta o código do bloco.`)
    else if (codigosBlocos.has(b.codigo)) erros.push(`${nomeB}: código repetido.`)
    codigosBlocos.add(b?.codigo)
    if (!texto(b?.titulo)) erros.push(`${nomeB}: falta o título.`)
    for (const s of b?.series ?? []) if (![6, 7, 8, 9].includes(s)) erros.push(`${nomeB}: séries devem ser de 6 a 9 (veio ${s}).`)
    if (!Array.isArray(b?.itens) || !b.itens.length) { erros.push(`${nomeB}: o bloco não tem perguntas.`); continue }

    for (const i of b.itens) {
      const nome = `Item ${i?.codigo || `(sem código, bloco ${b.codigo})`}`
      if (!i?.codigo) erros.push(`${nome}: falta o código.`)
      else if (anteriores.has(i.codigo)) erros.push(`${nome}: código repetido (cada item precisa de um código único).`)
      if (!texto(i?.enunciado)) erros.push(`${nome}: falta o enunciado.`)
      const opcoes = Array.isArray(i?.opcoes) ? i.opcoes : []
      if (!TIPOS.includes(i?.tipo)) erros.push(`${nome}: tipo "${i?.tipo ?? ''}" não existe. Use likert5, unica, multipla, texto ou numero.`)
      else if ((i.tipo === 'unica' || i.tipo === 'multipla') && opcoes.length < 2)
        erros.push(`${nome}: escolha única ou múltipla precisa de ao menos 2 opções.`)
      else if ((i.tipo === 'texto' || i.tipo === 'numero') && opcoes.length) erros.push(`${nome}: ${i.tipo} não tem opções; deixe em branco.`)
      if (i?.max_escolhas != null) {
        if (i.tipo !== 'multipla') erros.push(`${nome}: máximo de escolhas só vale para multipla.`)
        else if (!Number.isInteger(i.max_escolhas) || i.max_escolhas < 1) erros.push(`${nome}: máximo de escolhas deve ser um número inteiro a partir de 1.`)
        else if (i.max_escolhas > opcoes.length)
          erros.push(`${nome}: máximo de escolhas (${i.max_escolhas}) maior que o número de opções (${opcoes.length}).`)
      }
      if (i?.depende_de) {
        const alvo = anteriores.get(i.depende_de.item)
        if (!alvo) erros.push(`${nome}: depende do item "${i.depende_de.item}", que não existe antes dele.`)
        else if (!alvo.opcoes.includes(i.depende_de.valor)) erros.push(`${nome}: a opção "${i.depende_de.valor}" não existe no item ${alvo.codigo}.`)
      }
      if (i?.codigo && !anteriores.has(i.codigo)) anteriores.set(i.codigo, i)
    }
  }
  return erros
}
