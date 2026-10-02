// Gera o JSON do instrumento a partir do inventário do formulário (QUESTOES-FORMULARIO.xlsx)
// e a migração que o carrega. Uso: npx tsx scripts/gerar-instrumento.ts <xlsx> "<nome da versão>"
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import * as XLSX from 'xlsx'

import type { Bloco, Item, Questionario as Instrumento, Tipo } from '../src/gestao/questionario'

const TIPO: Record<string, Tipo> = { likert_5: 'likert5', 'categórico': 'unica', 'múltipla_escolha': 'multipla', texto_livre: 'texto' }
const FORA = new Set(['A1', 'A5', 'A6'])          // vêm do cadastro
const REVERSOS = new Set(['B11', 'G7'])
const SERIES: Record<string, number[]> = { G: [6], H: [9] }
const ATE_3 = 'Nessa pergunta, você pode escolher até 3 alternativas de resposta. Escolha as que mais tem a ver com você.'

// Opções que o inventário não traz — copiadas do instrumento (aba EPF_2026).
const COMPLEMENTOS: Record<string, Partial<Item>> = {
  A2: { opcoes: ['Branca', 'Preta', 'Amarela', 'Parda', 'Indígena', 'Prefiro não responder', 'Não sei'] },
  A3: { opcoes: ['Menina', 'Menino', 'Não binária', 'Outro', 'Prefiro não responder'],
        orientacao: 'Responda como se sente em relação a sua identidade como pessoa.' },
  A4: { opcoes: ['Não possuo deficiência e não preciso de apoios específicos.', 'Deficiência Física (ex: dificuldade de locomoção, uso de cadeira de rodas).',
    'Deficiência Visual (cegueira ou baixa visão).', 'Deficiência Auditiva ou Surdez.', 'Deficiência Intelectual.', 'Transtorno do Espectro Autista (TEA).',
    'Deficiência Múltipla (mais de uma deficiência associada).', 'Surdocegueira.', 'Outra condição que exige apoio (ex: Altas Habilidades/Superdotação).', 'Prefiro não responder.'] },
  A7: { opcoes: ['Tempo parcial (fico em apenas um período na escola)', 'Tempo integral (fico em mais de um período na escola)'] },
  A9_1: { opcoes: ['Música', 'Dança', 'Teatro', 'Desenho/pintura', 'Cultura digital (vídeos, edição, etc.)', 'Outra'],
          max_escolhas: 3, orientacao: ATE_3, obrigatorio: false, depende_de: { item: 'A9', valor: 'Sim' } },
  A9_2: { obrigatorio: false, depende_de: { item: 'A9', valor: 'Sim' } },
  A10_1: { opcoes: ['Grêmio estudantil', 'Clube/Projeto escolar', 'Esporte', 'Atividades culturais/artísticas', 'Outro'],
           max_escolhas: 3, orientacao: ATE_3, obrigatorio: false, depende_de: { item: 'A10', valor: 'Sim' } },
  B6: { opcoes: ['Relação com os amigos', 'Relação com professores', 'Poder ser quem eu sou', 'Participação da minha família',
    'Participar de atividades culturais/artísticas', 'Praticar esportes', 'Ser reconhecido pelos meus conhecimentos e aprendizados',
    'Ser reconhecido pelos meus talentos e habilidades', 'Outro'], max_escolhas: 3, orientacao: ATE_3 },
  D10: { opcoes: ['Atividades práticas, desafios ou resolução de problemas', 'Uso de tecnologia', 'Atividades em grupo',
    'Quando consigo entender a explicação do professor', 'Conteúdo tem a ver com a vida real',
    'Fazendo visitas, passeios e trabalhos fora da escola', 'Liberdade para opinar', 'Outro'], max_escolhas: 3, orientacao: ATE_3 },
}

const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()

export function gerarInstrumento(linhas: unknown[][]): Instrumento {
  const [cab, ...corpo] = linhas
  const col = (nome: string) => (cab as unknown[]).map(norm).indexOf(nome)
  const [cBloco, cTema, cCod, cTexto, cTipo, cOpc] =
    ['bloco', 'tema_construto', 'codigo_item', 'coluna_na_planilha_de_respostas', 'tipo', 'opcoes_de_resposta'].map(col)
  const blocos = new Map<string, Bloco>()

  for (const l of corpo) {
    const m = /^Bloco ([A-I]) — (.+)$/.exec(norm(l[cBloco]))
    if (!m) continue                                   // metadados e consentimento
    const [, letra, titulo] = m
    if (!blocos.has(letra)) blocos.set(letra, { codigo: letra, titulo, introducao: null, series: SERIES[letra] ?? null, itens: [] })
    const codigo = norm(l[cCod])
    if (FORA.has(codigo)) continue
    const enunciado = norm(l[cTexto]).replace(/([?.])1$/, '$1')   // "…Fundamental.1" = duplicata do ramo
    const tipo = TIPO[norm(l[cTipo])] ?? 'unica'
    const opcoes = norm(l[cOpc]).split(' | ').map(norm)
      .filter((o) => o && !o.startsWith('opções separadas') && o !== 'resposta aberta')
    blocos.get(letra)!.itens.push({
      codigo, enunciado, orientacao: null, tipo, opcoes: tipo === 'likert5' ? [] : opcoes,
      max_escolhas: null, obrigatorio: tipo !== 'texto', reverso: REVERSOS.has(codigo),
      construto: norm(l[cTema]) || null, depende_de: null,
    })
  }

  for (const b of blocos.values()) {
    // A9 aparece três vezes e A10 duas (pergunta e desdobramentos): A9, A9_1, A9_2; A10, A10_1.
    const vistos = new Map<string, number>()
    for (const i of b.itens) {
      if (!i.codigo) continue
      const n = (vistos.get(i.codigo) ?? 0) + 1
      vistos.set(i.codigo, n)
      if (n > 1) i.codigo = `${i.codigo}_${n - 1}`
    }
    // Sem código no inventário: letra do bloco + posição.
    b.itens.forEach((i, idx) => { if (!i.codigo) i.codigo = `${b.codigo}${idx + 1}` })
    for (const i of b.itens) Object.assign(i, COMPLEMENTOS[i.codigo] ?? {})
  }
  return { blocos: [...blocos.values()].sort((a, b) => a.codigo.localeCompare(b.codigo)) }
}

if (process.argv[1]?.endsWith('gerar-instrumento.ts')) {
  const [, , arquivo, nome] = process.argv
  const wb = XLSX.read(readFileSync(arquivo), { type: 'buffer' })
  const inst = gerarInstrumento(XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null }))
  const json = JSON.stringify(inst, null, 2)
  mkdirSync('supabase/instrumento', { recursive: true })
  writeFileSync('supabase/instrumento/epf-2026-v1.json', json)
  writeFileSync('supabase/migrations/20260929000008_instrumento_epf2026.sql',
    `select public._importar_instrumento('${nome.replace(/'/g, "''")}', $j$${json}$j$::jsonb);\n`)
  console.log(`${inst.blocos.length} blocos, ${inst.blocos.reduce((s, b) => s + b.itens.length, 0)} itens`)
}
