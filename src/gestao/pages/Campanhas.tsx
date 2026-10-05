import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { pode } from '../../lib/capacidades'
import { sb } from '../../lib/supabase'
import type { Perfil } from '../usePerfil'
import { dataBR, fmt, pct1 } from '../ui'

type Linha = { campanha_id: string; slug: string; sessoes: number; rede: string; numero: number; janela_inicio: string; janela_fim: string; aberta: boolean
  pct_meta: number | null; escolas_amostra: number; em_andamento: number; matriculas_amostra: number }

export default function Campanhas({ perfil }: { perfil: Perfil }) {
  const [linhas, setLinhas] = useState<Linha[] | null>(null)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  useEffect(() => {
    sb.from('v_campanha_resumo').select('campanha_id,slug,sessoes,rede,numero,janela_inicio,janela_fim,aberta,pct_meta,escolas_amostra,em_andamento,matriculas_amostra').order('rede')
      .then(({ data, error }) => (error ? setErro(error.message) : setLinhas(data)))
  }, [])

  // Irreversível: apaga plano, cadastros e respostas. Com respostas, pede o endereço do link digitado.
  async function excluir(l: Linha) {
    const nome = `${l.rede} · Aplicação ${l.numero}`
    const efeito = `Excluir a campanha ${nome}? O plano amostral, os cadastros e as respostas dos estudantes serão apagados e não há como desfazer.`
    if (l.sessoes > 0) {
      const digitado = prompt(`${efeito}\n\nEsta campanha tem ${l.sessoes} respostas de estudantes. Para confirmar, digite o endereço do link: ${l.slug}`)
      if (digitado === null) return
      if (digitado.trim() !== l.slug) return setAviso({ tipo: 'erro', texto: `O endereço digitado não confere com "${l.slug}". Nada foi excluído.` })
    } else if (!confirm(efeito)) return
    const { error } = await sb.rpc('excluir_campanha', { p_campanha: l.campanha_id })
    if (error) return setAviso({ tipo: 'erro', texto: `Não foi possível excluir a campanha: ${error.message}` })
    setLinhas((ls) => ls!.filter((x) => x.campanha_id !== l.campanha_id))
    setAviso({ tipo: 'sucesso', texto: `Campanha ${nome} excluída${l.sessoes ? `, com ${l.sessoes} respostas` : ''}.` })
  }

  if (erro) return <div className="epf-aviso epf-aviso--erro" role="alert">Não foi possível carregar as campanhas: {erro}</div>
  if (!linhas) return <div className="epf-pilha" aria-busy="true" aria-label="Carregando"><span className="epf-esqueleto" style={{ height: 40, width: '40%' }} /><span className="epf-esqueleto" style={{ height: 240 }} /></div>
  const abertas = linhas.filter((l) => l.aberta).length

  return (
    <div className="epf-pilha" style={{ gap: 28 }}>
      <div className="pagina-titulo">
        <h1 className="epf-h2">Campanhas de aplicação</h1>
        {pode(perfil.papel, 'configurar_campanha') && <Link className="epf-btn epf-btn--secundario" to="/painel/nova">Nova campanha</Link>}
      </div>
      {aviso && <div className={`epf-aviso epf-aviso--${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>{aviso.texto}</div>}
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
                <td>
                  <div className="epf-linha" style={{ flexWrap: 'nowrap' }}>
                    <Link className="epf-btn epf-btn--primario epf-btn--p" to={`/painel/c/${l.campanha_id}`}>Abrir painel</Link>
                    {pode(perfil.papel, 'excluir_campanha') && (
                      <button className="epf-btn epf-btn--secundario epf-btn--p btn-excluir" onClick={() => excluir(l)}
                        aria-label={`Excluir campanha ${l.rede} · Aplicação ${l.numero}`}>Excluir</button>
                    )}
                  </div>
                </td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
