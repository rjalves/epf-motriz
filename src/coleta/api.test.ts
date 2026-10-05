import { describe, expect, it, vi } from 'vitest'
vi.mock('../lib/supabase', () => ({ sb: {} }))
import { mensagemErro } from './api'

describe('mensagemErro', () => {
  it('traduz códigos do servidor para a linguagem do estudante', () => {
    expect(mensagemErro('sessao_invalida')).toBe('Sua sessão expirou. Toque em Começar para responder de novo.')
    expect(mensagemErro('obrigatorio_ausente: B3')).toBe('Responda todas as perguntas desta parte para continuar.')
  })
  it('cai numa mensagem de conexão para erros desconhecidos', () => {
    expect(mensagemErro('Failed to fetch')).toBe('Não foi possível salvar. Verifique a internet e tente de novo.')
  })
})
