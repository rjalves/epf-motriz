import { describe, expect, it } from 'vitest'
import { idade, validarCadastro } from './cadastro'

const hoje = new Date('2026-10-10T12:00:00')
const ok = { co_inep: 1, serie: 9, nascimento: '2012-03-01', email: '', telefone: '', autorizacao: false }

describe('cadastro', () => {
  it('calcula a idade pelo aniversário', () => {
    expect(idade('2014-10-11', hoje)).toBe(11)
    expect(idade('2014-10-10', hoje)).toBe(12)
  })
  it('aceita e-mail e telefone vazios', () => {
    expect(validarCadastro(ok, hoje)).toEqual({})
  })
  it('exige autorização para menores de 12', () => {
    expect(validarCadastro({ ...ok, serie: 6, nascimento: '2015-05-01' }, hoje))
      .toEqual({ autorizacao: 'Para responder, seu responsável precisa ter autorizado.' })
  })
  it('valida campos obrigatórios e formatos opcionais', () => {
    const e = validarCadastro({ ...ok, co_inep: null, serie: null, nascimento: '', email: 'x@', telefone: '123' }, hoje)
    expect(Object.keys(e).sort()).toEqual(['co_inep', 'email', 'nascimento', 'serie', 'telefone'])
  })
  it('não pede o nome do estudante', () => {
    expect(Object.keys(ok)).not.toContain('nome')
    expect(validarCadastro(ok, hoje)).toEqual({})
  })
  it('recusa data de nascimento implausível', () => {
    expect(validarCadastro({ ...ok, nascimento: '2020-01-01' }, hoje).nascimento).toBe('Confira a sua data de nascimento.')
  })
})
