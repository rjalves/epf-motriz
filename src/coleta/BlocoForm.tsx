import { itensVisiveis, type Bloco, type Respostas } from './instrumento'

type Props = { bloco: Bloco; respostas: Respostas; faltando: string[]; onMudar: (codigo: string, v: Respostas[string]) => void }

// Intensidade visual da escala (reforço; o texto continua sendo a informação).
function Escala({ n }: { n: number }) {
  return <span className="epf-opcao__escala" aria-hidden="true">{[0, 1, 2, 3, 4].map((k) => <i key={k} className={k <= n ? 'on' : undefined} />)}</span>
}

export default function BlocoForm({ bloco, respostas, faltando, onMudar }: Props) {
  return (
    <div className="epf-pilha" style={{ gap: 28 }}>
      {bloco.introducao && <p className="epf-texto-2" style={{ margin: 0 }}>{bloco.introducao}</p>}
      {itensVisiveis(bloco, respostas).map((i) => {
        const v = respostas[i.codigo]
        const marcadas = Array.isArray(v) ? v : []
        const pendente = faltando.includes(i.codigo)
        return (
          <fieldset key={i.codigo} id={`pergunta-${i.codigo}`} className={`epf-grupo${i.depende_de ? ' epf-dependente' : ''}`}
            aria-invalid={pendente || undefined} aria-describedby={pendente ? `pendente-${i.codigo}` : undefined}>
            <legend className="epf-grupo__pergunta">{i.enunciado}</legend>
            {(i.orientacao || i.tipo === 'multipla') && (
              <p className="epf-grupo__orientacao">
                <span>{i.orientacao ?? `Escolha até ${i.max_escolhas} alternativas.`}</span>
                {i.tipo === 'multipla' && <span className="epf-grupo__contador" aria-live="polite">{marcadas.length} de {i.max_escolhas}</span>}
              </p>
            )}
            {(i.tipo === 'likert5' || i.tipo === 'unica') && i.opcoes.map((o, k) => (
              <label key={o} className="epf-opcao">
                <input type="radio" name={i.codigo} checked={v === o} onChange={() => onMudar(i.codigo, o)} />
                <span className="epf-opcao__texto">{o}</span>
                {i.tipo === 'likert5' && <Escala n={k} />}
              </label>
            ))}
            {i.tipo === 'multipla' && i.opcoes.map((o) => {
              const marcada = marcadas.includes(o)
              const cheio = !marcada && marcadas.length >= (i.max_escolhas ?? Infinity)
              return (
                <label key={o} className="epf-opcao">
                  <input type="checkbox" checked={marcada} disabled={cheio}
                    onChange={() => onMudar(i.codigo, marcada ? marcadas.filter((x) => x !== o) : [...marcadas, o])} />
                  <span className="epf-opcao__texto">{o}</span>
                </label>
              )
            })}
            {i.tipo === 'texto' && (
              <textarea className="epf-textarea" aria-label={i.enunciado} value={typeof v === 'string' ? v : ''} maxLength={2000}
                onChange={(e) => onMudar(i.codigo, e.target.value)} />
            )}
            {i.tipo === 'numero' && (
              <input className="epf-input" type="number" aria-label={i.enunciado} value={typeof v === 'number' ? v : ''}
                onChange={(e) => onMudar(i.codigo, Number(e.target.value))} />
            )}
            {pendente && <span className="epf-campo__erro" id={`pendente-${i.codigo}`}>Responda esta pergunta para continuar.</span>}
          </fieldset>
        )
      })}
    </div>
  )
}
