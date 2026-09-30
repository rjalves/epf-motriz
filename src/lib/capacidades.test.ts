import { describe, expect, it } from 'vitest'
import { papeisConvidaveis, pode } from './capacidades'

describe('pode', () => {
  it('espelha a matriz de permissões da spec', () => {
    expect(pode('admin', 'configurar_campanha')).toBe(true)
    expect(pode('gestor_rede', 'configurar_campanha')).toBe(false)
    expect(pode('escola', 'ver_link_pesquisa')).toBe(true)
    expect(pode('escola', 'baixar_relatorio')).toBe(false)
    expect(pode('pesquisador', 'exportar_respostas')).toBe(true)
    expect(pode('gestor_rede', 'exportar_respostas')).toBe(false)
    expect(pode('pesquisador', 'ver_link_pesquisa')).toBe(false)
    expect(pode(null, 'ver_painel')).toBe(false)
  })
  it('gestor só convida regional e escola; regional não convida', () => {
    expect(papeisConvidaveis('gestor_rede')).toEqual(['regional', 'escola'])
    expect(papeisConvidaveis('regional')).toEqual([])
    expect(papeisConvidaveis('admin')).toHaveLength(5)
  })
})
