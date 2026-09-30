import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { sb } from '../../lib/supabase'
import { lerPlanoAmostral, type EscolaAmostra } from '../amostra'
import LinkPesquisa from './LinkPesquisa'

type Campanha = { id?: string; rede_id: string; numero: number; slug: string; instrumento_versao_id: string
  janela_inicio: string; janela_fim: string; aberta: boolean; series: number[] }
type Aviso = { tipo: 'sucesso' | 'erro' | 'atencao'; texto: string } | null

async function enviarAmostra(redeId: string, campanhaId: string, escolas: EscolaAmostra[]) {
  const nomes = [...new Set(escolas.map((e) => e.regional).filter((r): r is string => !!r))]
  const regionais = new Map<string, string>()
  if (nomes.length) {
    const { data, error } = await sb.from('regional').upsert(nomes.map((nome) => ({ rede_id: redeId, nome })), { onConflict: 'rede_id,nome' }).select('id,nome')
    if (error) throw new Error(error.message)
    data.forEach((r) => regionais.set(r.nome, r.id))
  }
  const up = async (t: string, linhas: object[], onConflict: string) => {
    const { error } = await sb.from(t).upsert(linhas, { onConflict }); if (error) throw new Error(`${t}: ${error.message}`)
  }
  await up('escola', escolas.map((e) => ({ co_inep: e.co_inep, rede_id: redeId, regional_id: e.regional ? regionais.get(e.regional) : null,
    nome: e.nome, municipio: e.municipio, eti: e.eti, localizacao: e.localizacao, pct_ppi: e.pct_ppi, latitude: e.latitude, longitude: e.longitude })), 'co_inep')
  await up('escola_campanha', escolas.map((e) => ({ campanha_id: campanhaId, co_inep: e.co_inep, in_amostra: e.in_amostra, categoria: e.categoria,
    qt_mat_6: e.qt_mat_6, qt_mat_9: e.qt_mat_9, turmas_6: e.turmas_6, turmas_9: e.turmas_9, parecer: e.parecer, justificativa: e.justificativa })), 'campanha_id,co_inep')
}

export default function Configuracao() {
  const { id } = useParams()
  const navegar = useNavigate()
  const [c, setC] = useState<Campanha | null>(null)
  const [redes, setRedes] = useState<{ id: string; nome: string }[]>([])
  const [versoes, setVersoes] = useState<{ id: string; nome: string }[]>([])
  const [plano, setPlano] = useState<{ total: number; amostra: number; substituidas: { nome: string; justificativa: string | null }[] } | null>(null)
  const [aviso, setAviso] = useState<Aviso>(null)
  const [salvando, setSalvando] = useState(false)

  const carregarVersoes = () => sb.from('instrumento_versao').select('id,nome').order('criado_em', { ascending: false }).then(({ data }) => setVersoes(data ?? []))
  const carregarPlano = useCallback(async () => {
    if (!id) return
    const { data } = await sb.from('escola_campanha').select('in_amostra,justificativa,parecer,escola(nome)').eq('campanha_id', id)
    const linhas = (data ?? []) as unknown as { in_amostra: boolean; justificativa: string | null; parecer: string | null; escola: { nome: string } }[]
    setPlano({ total: linhas.length, amostra: linhas.filter((l) => l.in_amostra).length,
      substituidas: linhas.filter((l) => !l.in_amostra && l.parecer).map((l) => ({ nome: l.escola.nome, justificativa: l.justificativa })) })
  }, [id])

  useEffect(() => {
    sb.from('rede').select('id,nome').order('nome').then(({ data }) => setRedes(data ?? []))
    carregarVersoes()
    if (id) {
      sb.from('campanha').select('id,rede_id,numero,slug,instrumento_versao_id,janela_inicio,janela_fim,aberta,series').eq('id', id).single().then(({ data }) => setC(data))
      carregarPlano()
    } else setC({ rede_id: '', numero: 1, slug: '', instrumento_versao_id: '', janela_inicio: '', janela_fim: '', aberta: false, series: [6, 9] })
  }, [id, carregarPlano])

  async function salvar(e: FormEvent, extra: Partial<Campanha> = {}) {
    e.preventDefault()
    setSalvando(true)
    const { data, error } = await sb.from('campanha').upsert({ ...c!, ...extra }).select('id').single()
    setSalvando(false)
    if (error) return setAviso({ tipo: 'erro', texto: error.message.includes('campanha_slug_key') ? 'Esse endereço de link já está em uso por outra campanha.' : `Não foi possível salvar: ${error.message}` })
    setC({ ...c!, ...extra })
    setAviso({ tipo: 'sucesso', texto: 'Campanha salva.' })
    if (!id) navegar(`/painel/c/${data.id}/configurar`)
  }

  async function alternarColeta(e: FormEvent) {
    if (c!.aberta && !confirm('Fechar a coleta agora? Estudantes que estão respondendo não conseguirão enviar.')) return
    await salvar(e, { aberta: !c!.aberta })
  }

  async function arquivo(e: ChangeEvent<HTMLInputElement>, tipo: 'amostra' | 'instrumento') {
    const f = e.target.files?.[0]; if (!f) return
    try {
      setAviso({ tipo: 'atencao', texto: 'Lendo arquivo…' })
      if (tipo === 'amostra') {
        const escolas = lerPlanoAmostral(await f.arrayBuffer())
        await enviarAmostra(c!.rede_id, id!, escolas)
        await carregarPlano()
        setAviso({ tipo: 'sucesso', texto: `${escolas.length} escolas importadas; ${escolas.filter((x) => x.in_amostra).length} na amostra.` })
      } else {
        const { error } = await sb.rpc('importar_instrumento', { p_nome: f.name.replace(/\.json$/, ''), p_def: JSON.parse(await f.text()) })
        if (error) throw new Error(error.message)
        await carregarVersoes()
        setAviso({ tipo: 'sucesso', texto: 'Nova versão do questionário importada. Selecione-a acima para usá-la.' })
      }
    } catch (err) { setAviso({ tipo: 'erro', texto: `Não foi possível importar: ${(err as Error).message}` }) } finally { e.target.value = '' }
  }

  if (!c) return <div className="epf-esqueleto" style={{ height: 200 }} aria-busy="true" aria-label="Carregando" />
  const campo = <K extends keyof Campanha>(k: K, v: Campanha[K]) => setC({ ...c, [k]: v })
  const serie = (s: number, marcada: boolean) => campo('series', marcada ? [...c.series, s].sort() : c.series.filter((x) => x !== s))

  return (
    <div className="epf-pilha" style={{ gap: 24 }}>
      <div className="pagina-titulo">
        <div className="epf-pilha" style={{ gap: 8 }}>
          <nav aria-label="Trilha" className="epf-legenda"><Link className="epf-link" to="/painel">Campanhas</Link>{id && <> / <Link className="epf-link" to={`/painel/c/${id}`}>Painel</Link></>} / Configurar</nav>
          <h1 className="epf-h2">{id ? 'Configurar campanha' : 'Nova campanha'}</h1>
        </div>
        {id && (
          <button type="button" className="epf-switch" role="switch" aria-checked={c.aberta} onClick={alternarColeta}>
            <span className="epf-switch__trilho" />{c.aberta ? 'Coleta aberta' : 'Coleta fechada'}
          </button>
        )}
      </div>
      {aviso && <div className={`epf-aviso epf-aviso--${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>{aviso.texto}</div>}

      <div className="grade-config">
        <form onSubmit={(e) => salvar(e)} className="epf-cartao epf-pilha" style={{ gap: 18 }}>
          <h2 className="epf-h5">Dados da campanha</h2>
          <div className="grade-campos">
            <label className="epf-campo">Rede
              <select className="epf-select epf-select--p" required value={c.rede_id} onChange={(e) => campo('rede_id', e.target.value)}>
                <option value="">Escolha</option>{redes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select></label>
            <label className="epf-campo">Aplicação nº
              <input className="epf-input epf-input--p" type="number" min={1} required value={c.numero} onChange={(e) => campo('numero', Number(e.target.value))} /></label>
            <label className="epf-campo">Início da janela
              <input className="epf-input epf-input--p" type="date" required value={c.janela_inicio} onChange={(e) => campo('janela_inicio', e.target.value)} /></label>
            <label className="epf-campo">Fim da janela
              <input className="epf-input epf-input--p" type="date" required value={c.janela_fim} onChange={(e) => campo('janela_fim', e.target.value)} /></label>
            <label className="epf-campo">Endereço do link
              <input className="epf-input epf-input--p epf-mono" required pattern="[a-z0-9\-]{3,60}" value={c.slug} onChange={(e) => campo('slug', e.target.value)} placeholder="natal-2026-1" />
              <span className="epf-campo__ajuda">Letras minúsculas, números e hífen. Vira /responder/{c.slug || '…'}</span></label>
            <label className="epf-campo">Versão do questionário
              <select className="epf-select epf-select--p" required value={c.instrumento_versao_id} onChange={(e) => campo('instrumento_versao_id', e.target.value)}>
                <option value="">Escolha</option>{versoes.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select></label>
          </div>
          <fieldset className="epf-grupo">
            <legend className="epf-campo" style={{ marginBottom: 6 }}>Séries que respondem</legend>
            <div className="epf-linha">
              {[6, 7, 8, 9].map((s) => (
                <label key={s} className="epf-opcao" style={{ minHeight: 44 }}>
                  <input type="checkbox" checked={c.series.includes(s)} onChange={(e) => serie(s, e.target.checked)} /><span>{s}º ano</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button className="epf-btn epf-btn--primario" style={{ alignSelf: 'flex-start' }} disabled={salvando} aria-busy={salvando}>{salvando ? 'Salvando…' : id ? 'Salvar alterações' : 'Criar campanha'}</button>
        </form>

        <div className="epf-pilha" style={{ gap: 24 }}>
          {id && (
            <section className="epf-cartao epf-pilha" aria-label="Plano amostral">
              <h2 className="epf-h5">Plano amostral</h2>
              {plano && plano.total > 0 ? (<>
                <div className="grade-campos">
                  <span className="epf-pilha" style={{ gap: 2 }}><span className="epf-dado" style={{ fontSize: 28 }}>{plano.total}</span><span className="epf-legenda">escolas no plano</span></span>
                  <span className="epf-pilha" style={{ gap: 2 }}><span className="epf-dado" style={{ fontSize: 28, color: 'var(--epf-teal-texto)' }}>{plano.amostra}</span><span className="epf-legenda">na amostra</span></span>
                </div>
                {plano.substituidas.map((s) => <div key={s.nome} className="epf-aviso epf-aviso--erro">{s.nome} saiu da amostra{s.justificativa ? `: ${s.justificativa}` : ''}.</div>)}
              </>) : <p className="epf-texto-2" style={{ margin: 0 }}>Nenhuma escola importada ainda.</p>}
              <label className="epf-btn epf-btn--secundario epf-btn--p" style={{ alignSelf: 'flex-start' }}>
                {plano?.total ? 'Substituir pelo arquivo novo (.xlsx)' : 'Importar plano amostral (.xlsx da Germina)'}
                <input type="file" accept=".xlsx" className="visualmente-oculto" onChange={(e) => arquivo(e, 'amostra')} />
              </label>
            </section>
          )}
          <section className="epf-cartao epf-pilha" aria-label="Questionário">
            <h2 className="epf-h5">Questionário</h2>
            <p className="epf-texto-2" style={{ margin: 0 }}>Uma revisão do questionário vira uma versão nova; campanhas antigas continuam com a versão com que foram aplicadas.</p>
            <label className="epf-btn epf-btn--secundario epf-btn--p" style={{ alignSelf: 'flex-start' }}>
              Importar nova versão (.json)
              <input type="file" accept=".json" className="visualmente-oculto" onChange={(e) => arquivo(e, 'instrumento')} />
            </label>
          </section>
        </div>
      </div>
      {id && c.slug && <LinkPesquisa slug={c.slug} />}
      <div className="epf-aviso epf-aviso--sucesso">Cadastro do estudante: nome, escola, ano e data de nascimento obrigatórios; e-mail e telefone opcionais. Os dados pessoais ficam separados das respostas e só o admin Motriz consulta, com registro em auditoria.</div>
    </div>
  )
}
