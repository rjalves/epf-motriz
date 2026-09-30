import { describe, expect, it } from 'vitest'
import { buscarTodos } from './paginar'

describe('buscarTodos', () => {
  it('busca página a página até a última, sem truncar no limite do servidor', async () => {
    const dados = Array.from({ length: 2501 }, (_, i) => i)
    const pedidos: [number, number][] = []
    const todos = await buscarTodos(async (de, ate) => { pedidos.push([de, ate]); return dados.slice(de, ate + 1) }, 1000)
    expect(todos).toHaveLength(2501)
    expect(pedidos).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
  })
  it('propaga o erro de uma página', async () => {
    await expect(buscarTodos(async () => { throw new Error('falhou') })).rejects.toThrow('falhou')
  })
})
