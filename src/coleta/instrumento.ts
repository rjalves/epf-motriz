export type Tipo = 'likert5' | 'unica' | 'multipla' | 'texto' | 'numero'
export type Item = {
  codigo: string; enunciado: string; orientacao: string | null; tipo: Tipo; opcoes: string[]
  max_escolhas: number | null; obrigatorio: boolean; depende_de: { item: string; valor: string } | null
}
export type Bloco = { codigo: string; titulo: string; introducao: string | null; series: number[] | null; itens: Item[] }
export type Respostas = Record<string, string | string[] | number>

export const blocosDaSerie = (blocos: Bloco[], serie: number) => blocos.filter((b) => !b.series || b.series.includes(serie))

export const itensVisiveis = (bloco: Bloco, r: Respostas) =>
  bloco.itens.filter((i) => !i.depende_de || r[i.depende_de.item] === i.depende_de.valor)

const vazio = (v: Respostas[string] | undefined) => v === undefined || v === '' || (Array.isArray(v) && v.length === 0)

export const pendencias = (bloco: Bloco, r: Respostas) =>
  itensVisiveis(bloco, r).filter((i) => i.obrigatorio && vazio(r[i.codigo])).map((i) => i.codigo)

export const respostasDoBloco = (bloco: Bloco, r: Respostas): Respostas =>
  Object.fromEntries(itensVisiveis(bloco, r).filter((i) => !vazio(r[i.codigo])).map((i) => [i.codigo, r[i.codigo]]))

export function proximoBloco(blocos: Bloco[], salvos: string[]) {
  const i = blocos.findIndex((b) => !salvos.includes(b.codigo))
  return i < 0 ? blocos.length : i
}
