import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import Responder from './coleta/Responder'
import { pode, ROTULO_PAPEL } from './lib/capacidades'
import { sb } from './lib/supabase'
import { usePerfil } from './gestao/usePerfil'
import { Simbolo } from './gestao/ui'
import Login from './gestao/pages/Login'
import Campanhas from './gestao/pages/Campanhas'
import Painel from './gestao/pages/Painel'
import PainelEscola from './gestao/pages/PainelEscola'
import Configuracao from './gestao/pages/Configuracao'
import Usuarios from './gestao/pages/Usuarios'

const PAPEL_CLASSE = { admin: 'admin', gestor_rede: 'gestor', regional: 'regional', escola: 'escola', pesquisador: 'pesquisador' } as const

function Gestao() {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [pronto, setPronto] = useState(false)
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => { setSessao(data.session); setPronto(true) })
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])
  const { perfil, carregando } = usePerfil(sessao)

  if (!pronto) return null
  if (!sessao) return <Login />
  if (carregando) return <main className="epf-pagina" style={{ paddingTop: 40 }}><span className="epf-esqueleto" style={{ display: 'block', height: 120 }} /></main>
  if (!perfil) {
    return (
      <main className="epf-pagina" style={{ paddingTop: 64, maxWidth: 720 }}>
        <div className="epf-estado">
          <b>Seu acesso ainda não foi liberado ou foi desativado.</b>
          <span className="epf-texto-2">Fale com o ponto focal da sua rede.</span>
          <button className="epf-btn epf-btn--secundario epf-btn--p" onClick={() => sb.auth.signOut()}>Sair</button>
        </div>
      </main>
    )
  }
  const p = perfil.papel
  return (
    <>
      <div className="epf-faixa epf-faixa--p" aria-hidden="true"><i /></div>
      <header className="epf-topo">
        <div className="epf-linha" style={{ gap: 32 }}>
          <Link className="epf-marca" to="/painel" aria-label="EPF — página inicial do painel">
            <Simbolo /><span className="epf-marca__nome">EPF <span style={{ fontWeight: 400, color: 'var(--epf-texto-2)' }}>· Painel</span></span>
          </Link>
          <nav className="epf-topo__nav" aria-label="Principal">
            <NavLink to="/painel" end>{p === 'escola' ? 'Minha escola' : 'Campanhas'}</NavLink>
            {pode(p, 'gerir_usuarios') && <NavLink to="/painel/usuarios">Usuários</NavLink>}
          </nav>
        </div>
        <div className="epf-linha">
          <span className={`epf-papel epf-papel--${PAPEL_CLASSE[p]}`}>{ROTULO_PAPEL[p]}</span>
          <span className="epf-legenda topo-email">{sessao.user.email}</span>
          <button className="epf-btn epf-btn--fantasma epf-btn--p" onClick={() => sb.auth.signOut()}>Sair</button>
        </div>
      </header>
      <main className="epf-pagina conteudo-painel">
        <Routes>
          <Route index element={p === 'escola' ? <PainelEscola coInep={perfil.co_inep!} /> : <Campanhas perfil={perfil} />} />
          <Route path="c/:id" element={<Painel perfil={perfil} />} />
          {pode(p, 'configurar_campanha') && <Route path="c/:id/configurar" element={<Configuracao />} />}
          {pode(p, 'configurar_campanha') && <Route path="nova" element={<Configuracao />} />}
          {pode(p, 'gerir_usuarios') && <Route path="usuarios" element={<Usuarios perfil={perfil} />} />}
          <Route path="*" element={<Navigate to="/painel" />} />
        </Routes>
      </main>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/responder/:slug" element={<Responder />} />
        <Route path="/painel/*" element={<Gestao />} />
        <Route path="*" element={<Navigate to="/painel" />} />
      </Routes>
    </BrowserRouter>
  )
}
