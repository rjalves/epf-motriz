import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { pode } from '../../lib/capacidades'
import { buscarTodos } from '../../lib/paginar'
import { sb } from '../../lib/supabase'
import { csvEscolas, ordenarPorApoio, relatorioDiario, type EscolaStatus, type Resumo } from '../relatorio'
import type { Perfil } from '../usePerfil'
import { baixar, dataBR, fmt, Kpi, Meta, pct1, Status } from '../ui'
import LinkPesquisa from './LinkPesquisa'

type ResumoCompleto = Resumo & { numero: number; slug: string; janela_inicio: string; janela_fim: string; aberta: boolean
  sessoes: number; recusas: number; respondentes_fora_amostra: number; pct_meta: number | null
  regionais_amostra: number; regionais_iniciadas: number }
type Escola = EscolaStatus & { validos_6: number; validos_9: number; em_andamento: number }

const FILTROS: [string, string][] = [['', 'Todas'], ['nao_iniciada', 'Não iniciadas'], ['iniciada', 'Iniciadas'], ['concluida', 'Concluídas']]

export default function Painel({ perfil }: { perfil: Perfil }) {
  const { id } = useParams()
  const [resumo, setResumo] = useState<ResumoCompleto | null>(null)
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [regional, setRegional] = useState('')
  const [status, setStatus] = useState('')
  const [erro, setErro] = useState('')
  const [atualizado, setAtualizado] = useState<Date | null>(null)
  const [verRelatorio, setVerRelatorio] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const [r, escolas] = await Promise.all([
        sb.from('v_campanha_resumo').select('*').eq('campanha_id', id!).single(),
        buscarTodos<Escola>(async (de, ate) => {
          const { data, error } = await sb.from('v_escola_status').select('*').eq('campanha_id', id!).order('co_inep').range(de, ate)
          if (error) throw new Error(error.message)
          return data
        }),
      ])
      if (r.error) throw new Error(r.error.message)
      setErro(''); setResumo(r.data); setEscolas(ordenarPorApoio(escolas)); setAtualizado(new Date())
    } catch (e) { setErro((e as Error).message) }
  }, [id])
  useEffect(() => { carregar(); const t = setInterval(carregar, 60_000); return () => clearInterval(t) }, [carregar])

  const regionais = useMemo(() => [...new Set(escolas.map((e) => e.regional))].sort(), [escolas])
  const naAmostra = escolas.filter((e) => e.status !== 'fora_amostra')
  const conta = (s: string) => naAmostra.filter((e) => !s || e.status === s).length
  const visiveis = escolas.filter((e) => (!regional || e.regional === regional) && (!status || e.status === status))

  async function exportar() {
    try {
      const linhas = await buscarTodos(async (de, ate) => {
        const { data, error } = await sb.from('v_resposta_export').select('*').eq('campanha', resumo!.slug).order('sessao').order('item').range(de, ate)
        if (error) throw new Error(error.message)
        return data
      })
      const { error } = await sb.rpc('registrar_exportacao', { p_campanha: resumo!.slug })
      if (error) throw new Error(error.message)
      baixar(`EPF_${resumo!.slug}_respostas.json`, JSON.stringify(linhas), 'application/json')
    } catch (e) { setErro((e as Error).message) }
  }

  if (erro) return <div className="epf-aviso epf-aviso--erro" role="alert">Não foi possível carregar o painel: {erro} <button className="epf-btn epf-btn--secundario epf-btn--p" onClick={carregar}>Tentar de novo</button></div>
  if (!resumo) return <div className="epf-pilha" aria-busy="true" aria-label="Carregando"><span className="epf-esqueleto" style={{ height: 48, width: '50%' }} /><span className="epf-esqueleto" style={{ height: 180 }} /></div>

  const p = perfil.papel
  const dia = new Date().toLocaleDateString('pt-BR')
  const relatorio = relatorioDiario(resumo, dia)

  return (
    <div className="epf-pilha" style={{ gap: 24 }}>
      <div className="pagina-titulo">
        <div className="epf-pilha" style={{ gap: 8 }}>
          <nav aria-label="Trilha" className="epf-legenda"><Link className="epf-link" to="/painel">Campanhas</Link> / {resumo.rede}</nav>
          <h1 className="epf-h2">{resumo.rede} <span style={{ fontWeight: 400, color: 'var(--epf-texto-2)' }}>· Aplicação {resumo.numero}</span></h1>
          <div className="epf-linha epf-texto-2" style={{ fontSize: 14 }}>
            <span className={`epf-status epf-status--${resumo.aberta ? 'concluida' : 'fora'}`}>{resumo.aberta ? 'Coleta aberta' : 'Coleta fechada'}</span>
            <span>Janela {dataBR(resumo.janela_inicio)} – {dataBR(resumo.janela_fim)}</span>
          </div>
        </div>
        <div className="epf-pilha" style={{ alignItems: 'flex-end', gap: 10 }}>
          <span className="epf-legenda">{atualizado ? `Atualizado às ${atualizado.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · atualiza a cada minuto` : ''}</span>
          <div className="epf-linha">
            {pode(p, 'baixar_relatorio') && <button className="epf-btn epf-btn--primario" onClick={() => setVerRelatorio(!verRelatorio)} aria-expanded={verRelatorio}>Relatório diário</button>}
            {pode(p, 'baixar_relatorio') && <button className="epf-btn epf-btn--secundario" onClick={() => baixar(`EPF_${resumo.rede}_escolas_${dia.replace(/\//g, '-')}.csv`, csvEscolas(visiveis))}>Baixar CSV</button>}
            {pode(p, 'exportar_respostas') && <button className="epf-btn epf-btn--secundario" onClick={exportar}>Exportar respostas (pseudonimizadas)</button>}
            {pode(p, 'configurar_campanha') && <Link className="epf-btn epf-btn--secundario" to={`/painel/c/${id}/configurar`}>Configurar campanha</Link>}
          </div>
        </div>
      </div>

      <section className="grade-kpi" aria-label="Indicadores">
        <Kpi destaque rotulo="% da meta" valor={pct1(resumo.pct_meta)} progresso={resumo.pct_meta}
          nota={`${fmt(resumo.respondentes_amostra)} respostas válidas de ${fmt(resumo.meta_total)} esperadas · ${fmt(resumo.matriculas_amostra)} matrículas`} />
        <Kpi rotulo="Em andamento agora" valor={fmt(resumo.em_andamento)} nota={`começaram e ainda não enviaram · ${fmt(resumo.recusas)} recusas · ${fmt(resumo.respondentes_fora_amostra)} fora da amostra`} />
        <div className="epf-kpi">
          <span className="epf-kpi__rotulo">Escolas da amostra · {resumo.escolas_amostra}</span>
          <div className="epf-barra-status" aria-hidden="true">
            <span style={{ flexGrow: resumo.escolas_concluidas }} /><span style={{ flexGrow: resumo.escolas_iniciadas }} /><span style={{ flexGrow: resumo.escolas_nao_iniciadas }} />
          </div>
          <span className="epf-kpi__nota">{resumo.escolas_concluidas} concluídas · {resumo.escolas_iniciadas} iniciadas · {resumo.escolas_nao_iniciadas} não iniciadas</span>
        </div>
        <Kpi rotulo="Regionais" valor={`${resumo.regionais_iniciadas}/${resumo.regionais_amostra}`} nota="regionais já iniciaram a coleta" />
      </section>

      {verRelatorio && (
        <section className="epf-cartao relatorio" aria-label="Relatório diário">
          <pre>{relatorio}</pre>
          <div className="epf-pilha">
            <b>Relatório diário</b>
            <span className="epf-texto-2" style={{ fontSize: 14 }}>Texto do modelo 2.C do plano de comunicação, para o e-mail ao ponto focal. Anexe o CSV das escolas.</span>
            <button className="epf-btn epf-btn--primario" onClick={() => { navigator.clipboard.writeText(relatorio); setCopiado(true); setTimeout(() => setCopiado(false), 3000) }}>{copiado ? 'Texto copiado' : 'Copiar texto'}</button>
          </div>
        </section>
      )}

      {pode(p, 'ver_link_pesquisa') && <LinkPesquisa slug={resumo.slug} />}

      <section className="epf-pilha" aria-label="Escolas">
        <div className="pagina-titulo">
          <h2 className="epf-h4">Escolas <span style={{ fontWeight: 400, color: 'var(--epf-texto-2)' }}>· {visiveis.length}</span></h2>
          <div className="epf-linha">
            <div className="epf-linha" role="group" aria-label="Filtrar escolas por situação">
              {FILTROS.map(([k, rotulo]) => (
                <button key={k} className="epf-filtro" aria-pressed={status === k} onClick={() => setStatus(k)}>{rotulo} · {conta(k)}</button>
              ))}
            </div>
            {regionais.length > 1 && (
              <label className="epf-linha" style={{ fontSize: 14, fontWeight: 600 }}>Regional
                <select className="epf-select epf-select--p" style={{ width: 'auto' }} value={regional} onChange={(e) => setRegional(e.target.value)}>
                  <option value="">Todas</option>{regionais.map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
            )}
          </div>
        </div>
        {!visiveis.length ? (
          <div className="epf-estado"><b>Nenhuma escola neste filtro.</b></div>
        ) : (
          <div className="epf-tabela-moldura">
            <table className="epf-tabela">
              <thead><tr><th scope="col">Escola</th><th scope="col">Regional</th><th scope="col">Status</th><th scope="col" className="num">6º</th><th scope="col" className="num">9º</th><th scope="col" className="num">Em andamento</th><th scope="col">Válidas / meta</th><th scope="col" className="num">%</th></tr></thead>
              <tbody>{visiveis.map((e) => (
                <tr key={e.co_inep}>
                  <td><b>{e.nome}</b></td><td>{e.regional}</td><td><Status status={e.status} /></td>
                  <td className="num">{e.validos_6}</td><td className="num">{e.validos_9}</td><td className="num">{e.em_andamento}</td>
                  <td style={{ minWidth: 140 }}><Meta status={e.status} validos={e.validos} meta={e.meta} pct={e.pct_meta} /></td>
                  <td className="num">{e.pct_meta == null ? '—' : `${Math.round(e.pct_meta * 100)}%`}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
