import { useState, type FormEvent } from 'react'
import { precisaAutorizacao, validarCadastro, type Cadastro } from './cadastro'

type Props = { escolas: { co_inep: number; nome: string }[]; series: number[]; onEnviar: (c: Cadastro) => Promise<void> }

export default function CadastroForm({ escolas, series, onEnviar }: Props) {
  const [c, setC] = useState<Cadastro>({ co_inep: null, serie: null, idade: '', email: '', telefone: '', autorizacao: false })
  const [erros, setErros] = useState<Partial<Record<keyof Cadastro, string>>>({})
  const [enviando, setEnviando] = useState(false)
  const muda = <K extends keyof Cadastro>(k: K, v: Cadastro[K]) => {
    setC((x) => ({ ...x, [k]: v }))
    setErros((e) => ({ ...e, [k]: undefined }))
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const v = validarCadastro(c)
    setErros(v)
    const primeiro = Object.keys(v)[0]
    if (primeiro) return document.getElementById(`campo-${primeiro}`)?.focus()
    setEnviando(true)
    try { await onEnviar(c) } finally { setEnviando(false) }
  }

  const erro = (k: keyof Cadastro) => erros[k] && <span className="epf-campo__erro" id={`erro-${k}`}>{erros[k]}</span>
  const invalido = (k: keyof Cadastro) => ({ 'aria-invalid': erros[k] ? true : undefined, 'aria-describedby': erros[k] ? `erro-${k}` : undefined })

  return (
    <form onSubmit={enviar} noValidate className="epf-pilha" style={{ gap: 18 }}>
      <label className="epf-campo">Sua escola
        <select id="campo-co_inep" className="epf-select" value={c.co_inep ?? ''} {...invalido('co_inep')}
          onChange={(e) => muda('co_inep', e.target.value ? Number(e.target.value) : null)}>
          <option value="">Escolha na lista</option>
          {escolas.map((x) => <option key={x.co_inep} value={x.co_inep}>{x.nome}</option>)}
        </select>
        {erro('co_inep')}
      </label>
      <fieldset className="epf-grupo" aria-invalid={erros.serie ? true : undefined}>
        <legend className="epf-campo" style={{ marginBottom: 6 }}>Em que ano você estuda?</legend>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))`, gap: 10 }}>
          {series.map((s, i) => (
            <label key={s} className="epf-opcao">
              <input id={i === 0 ? 'campo-serie' : undefined} type="radio" name="serie" checked={c.serie === s} onChange={() => muda('serie', s)} />
              <span className="epf-opcao__texto">{s}º ano</span>
            </label>
          ))}
        </div>
        {erro('serie')}
      </fieldset>
      <label className="epf-campo">Sua idade
        <input id="campo-idade" className="epf-input" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off"
          placeholder="Ex.: 12" style={{ maxWidth: 140 }} value={c.idade}
          onChange={(e) => muda('idade', e.target.value.replace(/\D/g, ''))} {...invalido('idade')} />
        <span className="epf-campo__ajuda">Em anos completos, só o número.</span>
        {erro('idade')}
      </label>
      {precisaAutorizacao(c.idade) && (
        <label className="epf-opcao epf-opcao--aviso">
          <input id="campo-autorizacao" type="checkbox" checked={c.autorizacao} onChange={(e) => muda('autorizacao', e.target.checked)} {...invalido('autorizacao')} />
          <span><b>Você tem menos de 12 anos.</b> Confirme: meu pai, minha mãe ou meu responsável autorizou que eu participe desta pesquisa.</span>
        </label>
      )}
      {erro('autorizacao')}
      <label className="epf-campo">E-mail <span className="epf-campo__opcional">opcional</span>
        <input id="campo-email" className="epf-input" type="email" value={c.email} onChange={(e) => muda('email', e.target.value)} autoComplete="email" placeholder="seu@email.com" {...invalido('email')} />
        {erro('email')}
      </label>
      <label className="epf-campo">Telefone <span className="epf-campo__opcional">opcional</span>
        <input id="campo-telefone" className="epf-input" type="tel" inputMode="tel" value={c.telefone} onChange={(e) => muda('telefone', e.target.value)} placeholder="(DDD) número" {...invalido('telefone')} />
        {erro('telefone')}
      </label>
      <div className="epf-aviso epf-aviso--sucesso">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /></svg>
        Você não informa seu nome. Idade, e-mail e telefone ficam separados das suas respostas.
      </div>
      <button className="epf-btn epf-btn--primario epf-btn--g epf-btn--bloco" disabled={enviando} aria-busy={enviando}>
        {enviando ? 'Enviando…' : 'Começar o questionário'}
      </button>
    </form>
  )
}
