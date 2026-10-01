// Espelho da matriz de permissões da spec (§6). Só decide o que MOSTRAR; quem garante é o RLS.
export type Papel = 'admin' | 'gestor_rede' | 'regional' | 'escola' | 'pesquisador'
export type Acao =
  | 'configurar_campanha' | 'importar_amostra' | 'ver_painel' | 'ver_link_pesquisa'
  | 'baixar_relatorio' | 'exportar_respostas' | 'gerir_usuarios'

const MATRIZ: Record<Acao, Papel[]> = {
  configurar_campanha: ['admin'],
  importar_amostra: ['admin'],
  ver_painel: ['admin', 'gestor_rede', 'regional', 'escola', 'pesquisador'],
  ver_link_pesquisa: ['admin', 'gestor_rede', 'regional', 'escola'],
  baixar_relatorio: ['admin', 'gestor_rede', 'regional', 'pesquisador'],
  exportar_respostas: ['admin', 'pesquisador'],
  gerir_usuarios: ['admin', 'gestor_rede'],
}

export const ROTULO_PAPEL: Record<Papel, string> = {
  admin: 'Admin Motriz', gestor_rede: 'Gestor da rede', regional: 'Regional', escola: 'Ponto focal da escola', pesquisador: 'Pesquisador',
}

export const pode = (papel: Papel | null, acao: Acao) => papel !== null && MATRIZ[acao].includes(papel)

export function papeisConvidaveis(papel: Papel): Papel[] {
  if (papel === 'admin') return ['admin', 'gestor_rede', 'regional', 'escola', 'pesquisador']
  if (papel === 'gestor_rede') return ['regional', 'escola']
  return []
}
