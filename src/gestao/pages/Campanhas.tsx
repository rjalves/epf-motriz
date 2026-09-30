import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { pode } from '../../lib/capacidades'
import { sb } from '../../lib/supabase'
import type { Perfil } from '../usePerfil'
import { dataBR, fmt, pct1 } from '../ui'

type Linha = { campanha_id: string; rede: string; numero: number; janela_inicio: string; janela_fim: string; aberta: boolean
  pct_meta: number | null; escolas_amostra: number; em_andamento: number; matriculas_amostra: number }

export default function Campanhas({ perfil }: { perfil: Perfil }) {
  const [linhas, setLinhas] = useState<Linha[] | null>(null)
  const [erro, setErro] = useState('')
  useEffect(() => {
    sb.from('v_campanha_resumo').select('campanha_id,rede,numero,janela_inicio,janela_fim,aberta,pct_meta,escolas_amostra,em_andamento,matriculas_amostra').order('rede')
      .then(({ data, error }) => (error ? setErro(error.message) : setLinhas(data)))
  }, [])

  if (erro) return <div className="epf-aviso epf-aviso--erro" role="alert">Não foi possível carregar as campanhas: {erro}</div>
  if (!linhas) return <div className="epf-pilha" aria-busy="true" aria-label="Carregando"><span className="epf-esqueleto" style={{ height: 40, width: '40%' }} /><span className="epf-esqueleto" style={{ height: 240 }} /></div>
  const abertas = linhas.filter((l) => l.aberta).length

  return (
    <div className="epf-pilha" style={{ gap: 28 }}>
      <div className="pagina-titulo">
        <h1 className="epf-h2">Campanhas de aplicação</h1>
        {pode(perfil.papel, 'configurar_campanha') && <Link className="epf-btn epf-btn--secundario" to="/painel/nova">Nova campanha</Link>}
      </div>
      <div className="faixa-numeros">
        <div><span className="epf-dado">{linhas.length}</span><span className="epf-texto-2">campanhas visíveis para você</span></div>
        <div><span className="epf-dado">{fmt(linhas.reduce((s, l) => s + l.escolas_amostra, 0))}</span><span className="epf-texto-2">escolas na amostra</span></div>
        <div><span className="epf-dado">{fmt(linhas.reduce((s, l) => s + l.matriculas_amostra, 0))}</span><span className="epf-texto-2">matrículas de 6º e 9º ano</span></div>
        <div><span className="epf-dado" style={{ color: 'var(--epf-teal-texto)' }}>{abertas}</span><span className="epf-texto-2">em coleta agora</span></div>
      </div>
      {!linhas.length ? (
        <div className="epf-estado"><b>Nenhuma campanha disponível para o seu perfil.</b><span className="epf-texto-2">Quando a Motriz criar a campanha da sua rede, ela aparece aqui.</span></div>
      ) : (
        <div className="epf-tabela-moldura">
          <table className="epf-tabela">
            <thead><tr><th scope="col">Rede</th><th scope="col">Situação</th><th scope="col">Janela</th><th scope="col" className="num">Escolas</th><th scope="col" className="num">Em andamento</th><th scope="col">% da meta</th><th scope="col"><span className="visualmente-oculto">Ações</span></th></tr></thead>
            <tbody>{linhas.map((l) => (
              <tr key={l.campanha_id}>
                <td><b>{l.rede}</b><div className="epf-legenda">Aplicação {l.numero}</div></td>
                <td><span className={`epf-status epf-status--${l.aberta ? 'concluida' : 'fora'}`}>{l.aberta ? 'Coleta aberta' : 'Fechada'}</span></td>
                <td>{dataBR(l.janela_inicio)} – {dataBR(l.janela_fim)}</td>
                <td className="num">{l.escolas_amostra}</td>
                <td className="num">{fmt(l.em_andamento)}</td>
                <td style={{ minWidth: 180 }}>
                  <div className="epf-meta epf-meta--concluida">{pct1(l.pct_meta)}<div className="epf-meta__barra"><span style={{ width: `${Math.min(100, (l.pct_meta ?? 0) * 100)}%` }} /></div></div>
                </td>
                <td><Link className="epf-btn epf-btn--primario epf-btn--p" to={`/painel/c/${l.campanha_id}`}>Abrir painel</Link></td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
