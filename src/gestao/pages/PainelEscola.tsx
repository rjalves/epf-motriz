// Visão do ponto focal: só a própria escola, só contagens.
import { useEffect, useState } from 'react'
import { sb } from '../../lib/supabase'
import { dataBR, fmt, Kpi, Status } from '../ui'
import LinkPesquisa from './LinkPesquisa'

type Linha = { campanha_id: string; nome: string; validos_6: number; validos_9: number; em_andamento: number; meta: number
  validos: number; pct_meta: number | null; status: string }
type Campanha = { id: string; slug: string; janela_fim: string }

export default function PainelEscola({ coInep }: { coInep: number }) {
  const [linhas, setLinhas] = useState<(Linha & { campanha: Campanha })[] | null>(null)
  useEffect(() => {
    const carregar = async () => {
      const { data: e } = await sb.from('v_escola_status').select('*').eq('co_inep', coInep)
      const { data: c } = await sb.from('campanha').select('id,slug,janela_fim').eq('aberta', true)
      setLinhas((e ?? []).flatMap((x: Linha) => {
        const campanha = (c ?? []).find((k: Campanha) => k.id === x.campanha_id)
        return campanha ? [{ ...x, campanha }] : []
      }))
    }
    carregar()
    const t = setInterval(carregar, 60_000)
    return () => clearInterval(t)
  }, [coInep])

  if (!linhas) return <div className="epf-pilha" aria-busy="true" aria-label="Carregando"><span className="epf-esqueleto" style={{ height: 160 }} /></div>
  if (!linhas.length) return <div className="epf-estado"><b>Nenhuma coleta aberta para a sua escola agora.</b><span className="epf-texto-2">Quando a secretaria abrir a coleta, o link e o QR code aparecem aqui.</span></div>

  return (<>{linhas.map((l) => (
    <section key={l.campanha_id} className="epf-pilha" style={{ gap: 20 }}>
      <div className="epf-pilha" style={{ gap: 8 }}>
        <h1 className="epf-h2">{l.nome}</h1>
        <div className="epf-linha epf-texto-2" style={{ fontSize: 14 }}><Status status={l.status} /><span>Coleta aberta até {dataBR(l.campanha.janela_fim)}</span></div>
      </div>
      <div className="grade-kpi">
        <Kpi destaque rotulo="% da meta da escola" valor={l.pct_meta == null ? '—' : `${Math.round(l.pct_meta * 100)}%`} progresso={l.pct_meta}
          nota={`${fmt(l.validos)} de ${fmt(l.meta)} respostas · faltam ${fmt(Math.max(0, l.meta - l.validos))}`} />
        <Kpi rotulo="6º ano" valor={fmt(l.validos_6)} nota="respostas enviadas" />
        <Kpi rotulo="9º ano" valor={fmt(l.validos_9)} nota="respostas enviadas" />
        <Kpi rotulo="Respondendo agora" valor={fmt(l.em_andamento)} nota="começaram e ainda não enviaram" />
      </div>
      <LinkPesquisa slug={l.campanha.slug} />
      <div className="epf-cartao epf-cartao--painel epf-pilha">
        <h2 className="epf-h5">Na hora de aplicar</h2>
        <ul className="epf-texto-2" style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Um dispositivo com internet por estudante.</li>
          <li>Cada um vai até a tela "Obrigado por participar!".</li>
          <li>Menores de 12 anos precisam da autorização do responsável; guarde os termos assinados.</li>
          <li>Se a internet cair, é só abrir o link de novo no mesmo aparelho: a resposta continua de onde parou.</li>
        </ul>
      </div>
      <p className="epf-legenda">Você vê apenas quantos estudantes responderam. Nomes e respostas são confidenciais.</p>
    </section>))}</>)
}
