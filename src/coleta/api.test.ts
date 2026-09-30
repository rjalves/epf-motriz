import { describe, expect, it, vi } from 'vitest'
vi.mock('../lib/supabase', () => ({ sb: {} }))
import { mensagemErro } from './api'

describe('mensagemErro', () => {
  it('traduz códigos do servidor para a linguagem do estudante', () => {
    expect(mensagemErro('ja_respondeu')).toBe('Você já respondeu esta pesquisa. Obrigado!')
    expect(mensagemErro('obrigatorio_ausente: B3')).toBe('Responda todas as perguntas desta parte para continuar.')
  })
  it('cai numa mensagem de conexão para erros desconhecidos', () => {
    expect(mensagemErro('Failed to fetch')).toBe('Não foi possível salvar. Verifique a internet e tente de novo.')
  })
})
