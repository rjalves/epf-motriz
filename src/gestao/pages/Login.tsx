import { useState, type FormEvent } from 'react'
import { sb } from '../../lib/supabase'
import { Simbolo } from '../ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    // shouldCreateUser: false — só entra quem foi convidado.
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/painel` } })
    setEnviando(false)
    setEstado(error
      ? { tipo: 'erro', texto: 'Não encontramos um acesso para este e-mail. Fale com o ponto focal da sua rede.' }
      : { tipo: 'sucesso', texto: 'Enviamos um link de acesso para o seu e-mail.' })
  }

  return (
    <div className="login">
      <aside className="login__marca epf-sobre-noite epf-brilho-teal">
        <div className="epf-faixa" aria-hidden="true"><i /></div>
        <div className="login__marca-conteudo">
          <span className="epf-marca epf-marca--inv"><Simbolo tamanho={60} /><span><span className="epf-marca__nome">EPF</span><span className="epf-marca__descritor">Engajamento, Pertencimento e Futuros</span></span></span>
          <div className="epf-pilha" style={{ gap: 20 }}>
            <h1 className="epf-h1">Acompanhe a participação escola a escola.</h1>
            <p className="epf-lead">Metas, escolas que precisam de apoio e o relatório diário da rede, num só lugar.</p>
          </div>
          <div className="epf-pilha" style={{ gap: 4, color: 'var(--epf-texto-inv-3)' }}>
            <p className="epf-legenda" style={{ margin: 0, color: 'inherit' }}>Realização Itaú Social · Articulação Motriz · Apoio técnico Germina</p>
            <p className="epf-legenda" style={{ margin: 0, color: 'inherit' }}>Desenvolvido com Tecnologia Motriz</p>
          </div>
        </div>
      </aside>
      <main className="login__form">
        <form onSubmit={entrar} className="epf-pilha" style={{ gap: 24, width: '100%', maxWidth: 440 }}>
          <div className="epf-pilha" style={{ gap: 10 }}>
            <h2 className="epf-h3">Entrar no painel</h2>
            <p className="epf-texto-2" style={{ margin: 0 }}>Enviaremos um link de acesso para o seu e-mail. Não é preciso senha.</p>
          </div>
          <label className="epf-campo">E-mail institucional
            <input className="epf-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@secretaria.gov.br" autoComplete="email" />
          </label>
          <button className="epf-btn epf-btn--primario epf-btn--g epf-btn--bloco" disabled={enviando} aria-busy={enviando}>{enviando ? 'Enviando…' : 'Receber link de acesso'}</button>
          {estado && <div className={`epf-aviso epf-aviso--${estado.tipo}`} role="status">{estado.texto}</div>}
          <div className="epf-aviso epf-aviso--info">Acesso restrito a quem foi convidado pela Motriz ou pela secretaria. Cada rede vê apenas os próprios números, nunca as respostas individuais dos estudantes.</div>
        </form>
      </main>
    </div>
  )
}
