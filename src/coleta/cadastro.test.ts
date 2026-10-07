import { describe, expect, it } from 'vitest'
import { precisaAutorizacao, validarCadastro } from './cadastro'

const ok = { co_inep: 1, serie: 9, idade: '14', email: '', telefone: '', autorizacao: false }

describe('cadastro', () => {
  it('aceita e-mail e telefone vazios', () => {
    expect(validarCadastro(ok)).toEqual({})
  })
  it('pede a idade, não a data de nascimento nem o nome', () => {
    expect(Object.keys(ok)).toContain('idade')
    expect(Object.keys(ok)).not.toContain('nascimento')
    expect(Object.keys(ok)).not.toContain('nome')
  })
  it('exige autorização para menores de 12', () => {
    expect(precisaAutorizacao('11')).toBe(true)
    expect(precisaAutorizacao('12')).toBe(false)
    expect(precisaAutorizacao('')).toBe(false)
    expect(validarCadastro({ ...ok, serie: 6, idade: '11' }))
      .toEqual({ autorizacao: 'Para responder, seu responsável precisa ter autorizado.' })
  })
  it('valida campos obrigatórios e formatos opcionais', () => {
    const e = validarCadastro({ ...ok, co_inep: null, serie: null, idade: '', email: 'x@', telefone: '123' })
    expect(Object.keys(e).sort()).toEqual(['co_inep', 'email', 'idade', 'serie', 'telefone'])
    expect(e.idade).toBe('Informe a sua idade.')
  })
  it('aceita só número inteiro de 9 a 18', () => {
    for (const v of ['8', '19', '12.5', '12,5', 'doze', '-12']) expect(validarCadastro({ ...ok, idade: v }).idade).toBe('Confira a sua idade.')
    for (const v of ['9', '18', ' 13 ']) expect(validarCadastro({ ...ok, idade: v, autorizacao: true }).idade).toBeUndefined()
  })
})
