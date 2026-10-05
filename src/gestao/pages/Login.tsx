import { useState, type FormEvent } from 'react'
import { salvarSessao } from '../../lib/sessao'
import { sb } from '../../lib/supabase'
import { Simbolo } from '../ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email')
  const [estado, setEstado] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function pedirCodigo(e?: FormEvent) {
    e?.preventDefault()
    setEnviando(true)
    // O banco confere o acesso, gera o código e envia o e-mail pela API do Resend.
    const { error } = await sb.rpc('pedir_codigo', { p_email: email })
    setEnviando(false)
    if (error) return setEstado({ tipo: 'erro', texto: error.message === 'aguarde'
      ? 'Aguarde um minuto antes de pedir outro código.'
      : error.message === 'sem_acesso'
        ? 'Não encontramos um acesso para este e-mail. Fale com o ponto focal da sua rede.'
        : `Não foi possível enviar o código agora. Tente de novo em instantes. (${error.message})` })
    setEtapa('codigo'); setCodigo('')
    setEstado({ tipo: 'sucesso', texto: `Enviamos um código de 6 dígitos para ${email}.` })
  }

  async function confirmar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    const { data, error } = await sb.rpc('entrar_com_codigo', { p_email: email, p_codigo: codigo })
    setEnviando(false)
    if (error || data?.erro) return setEstado({ tipo: 'erro', texto: data?.erro === 'sem_acesso'
      ? 'Seu acesso foi desativado. Fale com o ponto focal da sua rede.'
      : error ? `Não foi possível entrar agora. (${error.message})` : 'Código incorreto ou vencido. Confira o e-mail ou peça um novo código.' })
    salvarSessao(data)
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
            <p className="epf-legenda" style={{ margin: 0, color: 'inherit' }}>Desenvolvido por Tecnologia Motriz</p>
          </div>
        </div>
      </aside>
      <main className="login__form">
        <form onSubmit={etapa === 'email' ? pedirCodigo : confirmar} className="epf-pilha" style={{ gap: 24, width: '100%', maxWidth: 440 }}>
          <div className="epf-pilha" style={{ gap: 10 }}>
            <h2 className="epf-h3">Entrar no painel</h2>
            <p className="epf-texto-2" style={{ margin: 0 }}>Enviaremos um código de acesso para o seu e-mail. Não é preciso senha.</p>
          </div>
          {etapa === 'email' ? (<>
            <label className="epf-campo">E-mail institucional
              <input className="epf-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@secretaria.gov.br" autoComplete="email" />
            </label>
            <button className="epf-btn epf-btn--primario epf-btn--g epf-btn--bloco" disabled={enviando} aria-busy={enviando}>{enviando ? 'Enviando…' : 'Receber código'}</button>
          </>) : (<>
            <label className="epf-campo">Código de acesso
              <input className="epf-input epf-mono" style={{ fontSize: 28, letterSpacing: '0.4em', textAlign: 'center' }} required autoFocus
                inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} placeholder="000000"
                value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              <span className="epf-campo__ajuda">O código vale por 1 hora. Use sempre o mais recente.</span>
            </label>
            <button className="epf-btn epf-btn--primario epf-btn--g epf-btn--bloco" disabled={enviando || codigo.length !== 6} aria-busy={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
            <div className="epf-linha" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="epf-btn epf-btn--fantasma epf-btn--p" onClick={() => { setEtapa('email'); setEstado(null) }}>Trocar e-mail</button>
              <button type="button" className="epf-btn epf-btn--fantasma epf-btn--p" disabled={enviando} onClick={() => pedirCodigo()}>Reenviar código</button>
            </div>
          </>)}
          {estado && <div className={`epf-aviso epf-aviso--${estado.tipo}`} role={estado.tipo === 'erro' ? 'alert' : 'status'}>{estado.texto}</div>}
          <div className="epf-aviso epf-aviso--info">Acesso restrito a quem foi convidado pela Motriz ou pela secretaria. Cada rede vê apenas os próprios números, nunca as respostas individuais dos estudantes.</div>
        </form>
      </main>
    </div>
  )
}
