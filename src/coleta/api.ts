import { sb } from '../lib/supabase'
import type { Cadastro } from './cadastro'
import type { Bloco, Respostas } from './instrumento'

export type Campanha = { slug: string; rede: string; janela_inicio: string; janela_fim: string; series: number[]
  situacao: 'aberta' | 'fechada' | 'nao_iniciada' | 'encerrada' }
export type DadosColeta = { campanha: Campanha; escolas: { co_inep: number; nome: string }[]; blocos: Bloco[] }
export type Sessao = { sessao_id: string; token: string; retomada: boolean; serie: number; blocos_salvos: string[] }

const MENSAGENS: Record<string, string> = {
  campanha_inexistente: 'Link de pesquisa não encontrado. Confira o endereço com a sua escola.',
  campanha_fechada: 'Esta pesquisa não está aberta agora.',
  escola_invalida: 'Escolha a sua escola na lista.',
  serie_invalida: 'Esta pesquisa é para outros anos escolares.',
  idade_invalida: 'Confira a sua idade.',
  autorizacao_necessaria: 'Para responder, seu responsável precisa ter autorizado.',
  sessao_invalida: 'Sua sessão expirou. Toque em Começar para responder de novo.',
  sessao_encerrada: 'Esta resposta já foi enviada.',
  obrigatorio_ausente: 'Responda todas as perguntas desta parte para continuar.',
  blocos_pendentes: 'Ainda falta responder uma parte do questionário.',
}
export function mensagemErro(msg: string) {
  const chave = Object.keys(MENSAGENS).find((k) => msg.includes(k))
  return chave ? MENSAGENS[chave] : 'Não foi possível salvar. Verifique a internet e tente de novo.'
}

const chave = (slug: string) => `epf:sessao:${slug}`
function guardar(slug: string, s: Sessao | null) {
  try { if (s) localStorage.setItem(chave(slug), JSON.stringify(s)); else localStorage.removeItem(chave(slug)) } catch { /* modo privado */ }
}
export function sessaoGuardada(slug: string): Sessao | null {
  try { return JSON.parse(localStorage.getItem(chave(slug)) ?? 'null') } catch { return null }
}

async function rpc<T>(nome: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.rpc(nome, args)
  if (error) throw new Error(mensagemErro(error.message))
  return data as T
}

export async function carregar(slug: string) {
  const d = await rpc<DadosColeta | null>('instrumento_da_campanha', { p_slug: slug })
  if (!d) throw new Error(mensagemErro('campanha_inexistente'))
  return d
}

export async function iniciar(slug: string, c: Cadastro) {
  const s = await rpc<Sessao>('iniciar_sessao', {
    p_slug: slug, p_co_inep: c.co_inep, p_serie: c.serie, p_idade: Number(c.idade.trim()),
    p_email: c.email || null, p_telefone: c.telefone || null, p_autorizacao_responsavel: c.autorizacao,
  })
  guardar(slug, s)
  return s
}

export async function salvarBloco(slug: string, s: Sessao, bloco: string, r: Respostas) {
  const { blocos_salvos } = await rpc<{ blocos_salvos: string[] }>('salvar_bloco',
    { p_sessao: s.sessao_id, p_token: s.token, p_bloco: bloco, p_respostas: r })
  const nova = { ...s, blocos_salvos }
  guardar(slug, nova)
  return nova
}

export async function concluir(slug: string, s: Sessao) {
  await rpc('concluir', { p_sessao: s.sessao_id, p_token: s.token })
  guardar(slug, null)
}

export const esquecerSessao = (slug: string) => guardar(slug, null)
export const recusar = (slug: string) => rpc('registrar_recusa', { p_slug: slug })
