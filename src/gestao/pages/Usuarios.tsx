import { useEffect, useState, type FormEvent } from 'react'
import { papeisConvidaveis, ROTULO_PAPEL, type Papel } from '../../lib/capacidades'
import { sb } from '../../lib/supabase'
import type { Perfil } from '../usePerfil'

type Linha = { user_id: string; nome: string | null; papel: Papel; rede_id: string | null; regional_id: string | null; co_inep: number | null; ativo: boolean }
const PAPEL_CLASSE: Record<Papel, string> = { admin: 'admin', gestor_rede: 'gestor', regional: 'regional', escola: 'escola', pesquisador: 'pesquisador' }
const DESCRICAO: Record<Papel, string> = {
  admin: 'Gerencia redes, campanhas e usuários; vê tudo.',
  gestor_rede: 'Vê a própria rede e convida regionais e escolas.',
  regional: 'Vê as escolas da sua regional e acompanha a adesão.',
  escola: 'Vê só a própria escola: link, QR e quantos responderam.',
  pesquisador: 'Exporta respostas sem nomes para análise.',
}

export default function Usuarios({ perfil }: { perfil: Perfil }) {
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [redes, setRedes] = useState<{ id: string; nome: string }[]>([])
  const [regionais, setRegionais] = useState<{ id: string; nome: string; rede_id: string }[]>([])
  const [escolas, setEscolas] = useState<{ co_inep: number; nome: string; rede_id: string }[]>([])
  const papeis = papeisConvidaveis(perfil.papel)
  const [novo, setNovo] = useState({ email: '', nome: '', papel: papeis[papeis.length - 1], rede_id: perfil.rede_id ?? '', regional_id: '', co_inep: '' })
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro' | 'atencao'; texto: string; desfazer?: () => void } | null>(null)
  const [enviando, setEnviando] = useState(false)

  const carregar = () => sb.from('perfil').select('user_id,nome,papel,rede_id,regional_id,co_inep,ativo').order('papel').then(({ data }) => setLinhas(data ?? []))
  useEffect(() => {
    carregar()
    sb.from('rede').select('id,nome').order('nome').then(({ data }) => setRedes(data ?? []))
    sb.from('regional').select('id,nome,rede_id').order('nome').then(({ data }) => setRegionais(data ?? []))
    sb.from('escola').select('co_inep,nome,rede_id').order('nome').then(({ data }) => setEscolas(data ?? []))
  }, [])

  async function convidar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    const precisaRede = !['admin', 'pesquisador'].includes(novo.papel)
    const { data, error } = await sb.functions.invoke('convidar-usuario', { body: {
      email: novo.email, nome: novo.nome, papel: novo.papel,
      rede_id: precisaRede ? novo.rede_id : null,
      regional_id: novo.papel === 'regional' ? novo.regional_id : null,
      co_inep: novo.papel === 'escola' ? Number(novo.co_inep) : null } })
    setEnviando(false)
    if (error) {
      // Erros da função vêm em "erro"; os do runtime (função não publicada, falha ao iniciar) vêm em "msg".
      const corpo = await (error as { context?: Response }).context?.json().catch(() => null)
      const motivo: string | null = corpo?.erro ?? (/entrypoint|InvalidWorkerCreation/.test(corpo?.msg ?? '')
        ? 'a função de convite não está publicada no servidor (convidar-usuario)' : corpo?.msg ?? null)
      const TEXTO: Record<string, string> = {
        email_ja_cadastrado: 'este e-mail já tem acesso ou um convite pendente',
        sem_permissao: 'seu perfil não pode convidar para este perfil ou rede',
        escopo_incoerente: 'a escola ou regional não pertence à rede escolhida',
      }
      return setAviso({ tipo: 'erro', texto: `Não foi possível convidar: ${(motivo && TEXTO[motivo]) ?? motivo ?? error.message}.` })
    }
    setAviso(data?.email_enviado
      ? { tipo: 'sucesso', texto: `Convite enviado para ${novo.email}.` }
      : { tipo: 'atencao', texto: `Acesso criado para ${novo.email}, mas o e-mail de convite não saiu. Avise a pessoa para entrar em ${location.origin}/painel com este e-mail.` })
    setNovo({ ...novo, email: '', nome: '' }); carregar()
  }

  async function definirAtivo(l: Linha, ativo: boolean) {
    const { error } = await sb.rpc('definir_ativo', { p_user: l.user_id, p_ativo: ativo })
    if (error) return setAviso({ tipo: 'erro', texto: 'Sem permissão para alterar este usuário.' })
    await carregar()
    setAviso({ tipo: 'sucesso', texto: ativo ? 'Acesso reativado.' : 'Acesso desativado.', desfazer: ativo ? undefined : () => definirAtivo(l, true) })
  }

  const escopo = (l: Linha) => l.co_inep ? escolas.find((x) => x.co_inep === l.co_inep)?.nome
    : l.regional_id ? regionais.find((r) => r.id === l.regional_id)?.nome
    : l.rede_id ? redes.find((r) => r.id === l.rede_id)?.nome : 'Todas as redes'

  return (
    <div className="epf-pilha" style={{ gap: 24 }}>
      <div className="epf-pilha" style={{ gap: 8 }}>
        <h1 className="epf-h2">Usuários e perfis</h1>
        <p className="epf-texto-2" style={{ margin: 0 }}>{perfil.papel === 'admin' ? 'Você gerencia todos os usuários.' : 'Você convida regionais e pontos focais das escolas da sua rede.'}</p>
      </div>
      {aviso && (
        <div className={`epf-aviso epf-aviso--${aviso.tipo}`} role="status">
          <span style={{ flex: 1 }}>{aviso.texto}</span>
          {aviso.desfazer && <button className="epf-btn epf-btn--fantasma epf-btn--p" onClick={aviso.desfazer}>Desfazer</button>}
        </div>
      )}
      <div className="grade-usuarios">
        <div className="epf-tabela-moldura">
          <table className="epf-tabela">
            <thead><tr><th scope="col">Nome</th><th scope="col">Perfil</th><th scope="col">Escopo</th><th scope="col">Situação</th><th scope="col"><span className="visualmente-oculto">Ações</span></th></tr></thead>
            <tbody>{linhas.map((l) => (
              <tr key={l.user_id}>
                <td><b>{l.nome ?? '—'}</b></td>
                <td><span className={`epf-papel epf-papel--${PAPEL_CLASSE[l.papel]}`}>{ROTULO_PAPEL[l.papel]}</span></td>
                <td>{escopo(l) ?? '—'}</td>
                <td><span className={`epf-status epf-status--${l.ativo ? 'concluida' : 'fora'}`}>{l.ativo ? 'Ativo' : 'Desativado'}</span></td>
                <td>{papeis.includes(l.papel) && l.user_id !== perfil.user_id && (
                  <button className="epf-btn epf-btn--secundario epf-btn--p" onClick={() => definirAtivo(l, !l.ativo)}>{l.ativo ? 'Desativar' : 'Reativar'}</button>
                )}</td>
              </tr>))}
            </tbody>
          </table>
        </div>

        <form onSubmit={convidar} className="epf-cartao epf-pilha" style={{ gap: 16, borderColor: 'var(--epf-noite)' }}>
          <h2 className="epf-h5">Convidar usuário</h2>
          <label className="epf-campo">E-mail institucional<input className="epf-input epf-input--p" type="email" required value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} /></label>
          <label className="epf-campo">Nome<input className="epf-input epf-input--p" required value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></label>
          <fieldset className="epf-grupo">
            <legend className="epf-campo" style={{ marginBottom: 6 }}>Perfil</legend>
            {papeis.map((pp) => (
              <label key={pp} className="epf-opcao" style={{ alignItems: 'flex-start' }}>
                <input type="radio" name="papel" checked={novo.papel === pp} onChange={() => setNovo({ ...novo, papel: pp })} />
                <span className="epf-pilha" style={{ gap: 2 }}><b>{ROTULO_PAPEL[pp]}</b><span className="epf-legenda">{DESCRICAO[pp]}</span></span>
              </label>
            ))}
          </fieldset>
          {!['admin', 'pesquisador'].includes(novo.papel) && perfil.papel === 'admin' && (
            <label className="epf-campo">Rede<select className="epf-select epf-select--p" required value={novo.rede_id} onChange={(e) => setNovo({ ...novo, rede_id: e.target.value })}>
              <option value="">Escolha</option>{redes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}</select></label>)}
          {novo.papel === 'regional' && (
            <label className="epf-campo">Regional<select className="epf-select epf-select--p" required value={novo.regional_id} onChange={(e) => setNovo({ ...novo, regional_id: e.target.value })}>
              <option value="">Escolha</option>{regionais.filter((r) => r.rede_id === novo.rede_id).map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}</select></label>)}
          {novo.papel === 'escola' && (
            <label className="epf-campo">Escola<select className="epf-select epf-select--p" required value={novo.co_inep} onChange={(e) => setNovo({ ...novo, co_inep: e.target.value })}>
              <option value="">Escolha</option>{escolas.filter((x) => x.rede_id === novo.rede_id).map((x) => <option key={x.co_inep} value={x.co_inep}>{x.nome}</option>)}</select></label>)}
          <button className="epf-btn epf-btn--primario" disabled={enviando} aria-busy={enviando}>{enviando ? 'Enviando…' : 'Enviar convite por e-mail'}</button>
          <p className="epf-legenda" style={{ margin: 0 }}>A pessoa recebe um e-mail com o endereço do painel e entra com um código enviado na hora. Convites e desativações ficam registrados na auditoria.</p>
        </form>
      </div>
    </div>
  )
}
