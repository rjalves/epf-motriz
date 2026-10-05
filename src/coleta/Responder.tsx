import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { carregar, concluir, esquecerSessao, iniciar, recusar, salvarBloco, sessaoGuardada, type DadosColeta, type Sessao } from './api'
import BlocoForm from './BlocoForm'
import CadastroForm from './CadastroForm'
import { blocosDaSerie, pendencias, proximoBloco, respostasDoBloco, type Respostas } from './instrumento'

type Tela = 'boas_vindas' | 'assentimento' | 'cadastro' | 'bloco' | 'fim' | 'recusou'

const Faixa = () => <div className="epf-faixa" aria-hidden="true"><i /></div>
const Simbolo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 180 108" aria-hidden="true">
    <path d="M20 96 Q90 96 160 26" stroke="currentColor" strokeOpacity=".38" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" fill="none" />
    <circle cx="34" cy="84" r="12" fill="#FF6A3D" /><circle cx="90" cy="60" r="12" fill="#FFC233" /><circle cx="146" cy="36" r="12" fill="#16B8A8" />
  </svg>
)
const Icone = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)

export default function Responder() {
  const { slug = '' } = useParams()
  const [dados, setDados] = useState<DadosColeta | null>(null)
  const [erroCarga, setErroCarga] = useState('')
  const [tela, setTela] = useState<Tela>('boas_vindas')
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [indice, setIndice] = useState(0)
  const [respostas, setRespostas] = useState<Respostas>({})
  const [faltando, setFaltando] = useState<string[]>([])
  const [aviso, setAviso] = useState<{ tipo: 'atencao' | 'erro'; texto: string } | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { carregar(slug).then(setDados).catch((e) => setErroCarga(e.message)) }, [slug])

  const blocos = useMemo(() => (dados && sessao ? blocosDaSerie(dados.blocos, sessao.serie) : []), [dados, sessao])
  const bloco = blocos[indice]
  const irPara = (t: Tela) => { setAviso(null); setTela(t); window.scrollTo(0, 0) }

  // Erros que encerram a sessão guardada neste aparelho: não adianta tentar retomá-la.
  const encerraSessao = (texto: string) => /expirou|já foi enviada/.test(texto)

  async function entrar(s: Sessao) {
    setSessao(s)
    const partes = blocosDaSerie(dados!.blocos, s.serie)
    const proximo = proximoBloco(partes, s.blocos_salvos)
    if (proximo >= partes.length) {
      // Todas as partes já estavam salvas: faltou só o envio final (ex.: a internet caiu nessa hora).
      try { await concluir(slug, s); irPara('fim') } catch (e) {
        const texto = (e as Error).message
        if (encerraSessao(texto)) esquecerSessao(slug)
        setAviso({ tipo: 'erro', texto })
      }
      return
    }
    setIndice(proximo)
    irPara('bloco')
    if (s.blocos_salvos.length) setAviso({ tipo: 'atencao', texto: 'Que bom que você voltou! Suas respostas estão guardadas. Continuando de onde você parou.' })
  }

  async function avancar() {
    const f = pendencias(bloco, respostas)
    setFaltando(f)
    if (f.length) {
      setAviso({ tipo: 'atencao', texto: 'Responda todas as perguntas desta parte para continuar.' })
      document.getElementById(`pergunta-${f[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSalvando(true); setAviso(null)
    try {
      const s = await salvarBloco(slug, sessao!, bloco.codigo, respostasDoBloco(bloco, respostas))
      setSessao(s)
      if (indice + 1 < blocos.length) { setIndice(indice + 1); window.scrollTo(0, 0) }
      else { await concluir(slug, s); irPara('fim') }
    } catch (e) {
      const texto = (e as Error).message
      if (encerraSessao(texto)) esquecerSessao(slug)
      setAviso({ tipo: 'erro', texto })
    } finally { setSalvando(false) }
  }

  if (!dados) {
    return (
      <div className="estudante"><Faixa />
        <main className="epf-coluna-estudante">
          {erroCarga
            ? <div className="epf-aviso epf-aviso--erro" role="alert">{erroCarga}</div>
            : <div className="epf-pilha" aria-busy="true" aria-label="Carregando"><span className="epf-esqueleto" style={{ width: '60%', height: 22 }} /><span className="epf-esqueleto" style={{ height: 120 }} /></div>}
        </main>
      </div>
    )
  }

  const aberta = dados.campanha.situacao === 'aberta'
  const guardada = sessaoGuardada(slug)

  if (tela === 'boas_vindas') {
    return (
      <div className="boas-vindas epf-sobre-noite epf-brilho-teal"><Faixa />
        <main>
          <Simbolo className="simbolo" />
          <h1>Olá!<br />Queremos te ouvir.</h1>
          <p>Este questionário é para entender como é o seu dia a dia na escola e o que você pensa sobre o seu futuro.</p>
          <div className="epf-linha" style={{ gap: 8 }}>
            <span className="epf-chip epf-chip--noite">Não é prova</span>
            <span className="epf-chip epf-chip--noite">Sem respostas certas ou erradas</span>
            <span className="epf-chip epf-chip--noite">Confidencial</span>
          </div>
        </main>
        <footer>
          {aberta ? (<>
            <button className="epf-btn epf-btn--destaque epf-btn--g epf-btn--bloco" onClick={() => (guardada ? entrar(guardada) : irPara('assentimento'))}>
              {guardada ? 'Continuar de onde parei' : 'Começar'}
            </button>
            {guardada && (
              <button className="epf-btn epf-btn--inv epf-btn--g epf-btn--bloco" onClick={() => { esquecerSessao(slug); setSessao(null); setRespostas({}); irPara('assentimento') }}>
                Não sou eu: nova resposta
              </button>
            )}
            {!guardada && <p style={{ fontSize: 14, textAlign: 'center' }}>Se parar no meio, abra este link de novo no mesmo celular ou computador: você continua de onde parou.</p>}
          </>) : (
            <div className="epf-aviso epf-aviso--info" role="status">
              {dados.campanha.situacao === 'nao_iniciada' ? 'A pesquisa ainda não começou.' : 'A pesquisa está encerrada. Obrigado!'}
            </div>
          )}
          <p style={{ fontSize: 13, textAlign: 'center', color: 'var(--epf-texto-inv-3)' }}>Pesquisa EPF · {dados.campanha.rede}</p>
        </footer>
      </div>
    )
  }

  return (
    <div className="estudante"><Faixa />
      {tela === 'bloco' && bloco && (
        <header className="estudante__topo"><div>
          <p className="epf-grupo__orientacao" style={{ margin: 0 }}>
            <span className="epf-sobrelinha">Parte {indice + 1} de {blocos.length}</span>
            {sessao && sessao.blocos_salvos.length > 0 && <span>Salvo</span>}
          </p>
          <div className="epf-progresso" role="progressbar" aria-label="Progresso do questionário" aria-valuemin={0} aria-valuemax={blocos.length} aria-valuenow={indice}>
            <span style={{ width: `${(100 * indice) / blocos.length}%` }} />
          </div>
        </div></header>
      )}

      <main className={`epf-coluna-estudante${tela === 'fim' ? ' conclusao' : ''}`}>
        {aviso && <div className={`epf-aviso epf-aviso--${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>{aviso.texto}</div>}

        {tela === 'assentimento' && (<>
          <span className="epf-sobrelinha">Antes de começar</span>
          <h1 className="epf-h3">Você aceita participar?</h1>
          <ul className="garantias">
            <li><Icone d="M5 12l5 5L20 7" /><span><b>É voluntário.</b> Você pode parar quando quiser, sem problema nenhum.</span></li>
            <li><Icone d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><span><b>É confidencial.</b> Você não informa seu nome. Ninguém da escola saberá o que você respondeu.</span></li>
            <li><Icone d="M12 21V3M5 10l7-7 7 7" /><span><b>Sua voz muda a escola.</b> A Secretaria vai usar as respostas para planejar melhorias junto com vocês.</span></li>
          </ul>
          <div className="estudante__acoes">
            <button className="epf-btn epf-btn--primario epf-btn--g epf-btn--bloco" onClick={() => irPara('cadastro')}>Sim, aceito participar</button>
            <button className="epf-btn epf-btn--secundario epf-btn--g epf-btn--bloco" onClick={() => { recusar(slug).catch(() => {}); irPara('recusou') }}>Não quero participar</button>
          </div>
        </>)}

        {tela === 'cadastro' && (<>
          <span className="epf-sobrelinha">Seus dados</span>
          <h1 className="epf-h3">Conte um pouco sobre você</h1>
          <CadastroForm escolas={dados.escolas} series={dados.campanha.series}
            onEnviar={async (c) => {
              try { setAviso(null); entrar(await iniciar(slug, c)) }
              catch (e) { setAviso({ tipo: 'erro', texto: (e as Error).message }); window.scrollTo(0, 0) }
            }} />
        </>)}

        {tela === 'bloco' && bloco && (<>
          <h1 className="epf-h3">{bloco.titulo}</h1>
          <BlocoForm bloco={bloco} respostas={respostas} faltando={faltando}
            onMudar={(k, v) => {
              setRespostas((r) => ({ ...r, [k]: v }))
              const restantes = faltando.filter((x) => x !== k)
              setFaltando(restantes)
              if (!restantes.length && aviso?.tipo === 'atencao' && faltando.length) setAviso(null)
            }} />
        </>)}

        {tela === 'fim' && (<>
          <span className="conclusao__check"><Icone d="M5 12l5 5L20 7" /></span>
          <span className="epf-sobrelinha">Respostas enviadas</span>
          <h1 className="epf-h3">Obrigado por participar!</h1>
          <p className="epf-lead">Sua voz vai ajudar a sua escola e a Secretaria a planejar melhorias junto com vocês.</p>
          <div className="epf-linha" style={{ justifyContent: 'center' }}>
            <span className="epf-chip epf-chip--engajamento">Engajamento</span>
            <span className="epf-chip epf-chip--pertencimento">Pertencimento</span>
            <span className="epf-chip epf-chip--futuros">Futuros</span>
          </div>
          <p className="epf-texto-2">Você já pode fechar esta página ou entregar o dispositivo para o próximo colega.</p>
          <button className="epf-btn epf-btn--secundario epf-btn--g epf-btn--bloco" onClick={() => {
            setSessao(null); setRespostas({}); setIndice(0); irPara('boas_vindas')
          }}>Nova resposta neste dispositivo</button>
        </>)}

        {tela === 'recusou' && (<>
          <h1 className="epf-h3">Tudo bem!</h1>
          <p className="epf-lead">Obrigado pela atenção. Você pode fechar esta página.</p>
        </>)}
      </main>

      {tela === 'bloco' && bloco && (
        <footer className="epf-rodape-fixo estudante__rodape"><div>
          {indice > 0 && (
            <button className="epf-btn epf-btn--secundario epf-btn--g epf-btn--icone" aria-label="Parte anterior"
              onClick={() => { setIndice(indice - 1); setFaltando([]); setAviso(null); window.scrollTo(0, 0) }}>
              <Icone d="M15 6l-6 6 6 6" />
            </button>
          )}
          <button className="epf-btn epf-btn--primario epf-btn--g" style={{ flex: 1 }} onClick={avancar} disabled={salvando} aria-busy={salvando}>
            {salvando ? 'Salvando…' : indice + 1 < blocos.length ? 'Salvar e continuar' : 'Enviar respostas'}
          </button>
        </div></footer>
      )}
    </div>
  )
}
