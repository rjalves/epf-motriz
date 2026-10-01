// Peças visuais compartilhadas pelas telas de gestão (sobre as classes do design system).
import type { ReactNode } from 'react'

export const Simbolo = ({ tamanho = 46 }: { tamanho?: number }) => (
  <svg width={tamanho} height={tamanho * 0.6} viewBox="0 0 180 108" aria-hidden="true">
    <path d="M20 96 Q90 96 160 26" stroke="currentColor" strokeOpacity=".35" strokeWidth="3" strokeDasharray="2.5 9" strokeLinecap="round" fill="none" />
    <circle cx="34" cy="84" r="14" fill="#FF6A3D" /><circle cx="90" cy="60" r="14" fill="#FFC233" /><circle cx="146" cy="36" r="14" fill="#16B8A8" />
  </svg>
)

export function Kpi({ rotulo, valor, nota, destaque, progresso }: { rotulo: string; valor: ReactNode; nota: ReactNode; destaque?: boolean; progresso?: number | null }) {
  return (
    <div className={`epf-kpi${destaque ? ' epf-kpi--destaque' : ''}`}>
      <span className="epf-kpi__rotulo">{rotulo}</span>
      <span className="epf-kpi__valor">{valor}</span>
      {progresso != null && (
        <div className="epf-progresso" role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progresso * 100)}>
          <span style={{ width: `${Math.min(100, progresso * 100)}%` }} />
        </div>
      )}
      <span className="epf-kpi__nota">{nota}</span>
    </div>
  )
}

const STATUS: Record<string, [string, string]> = {
  concluida: ['concluida', 'Concluída'], iniciada: ['iniciada', 'Iniciada'],
  nao_iniciada: ['nao-iniciada', 'Não iniciada'], fora_amostra: ['fora', 'Fora da amostra'],
}
export const Status = ({ status }: { status: string }) => {
  const [classe, rotulo] = STATUS[status] ?? ['fora', status]
  return <span className={`epf-status epf-status--${classe}`}>{rotulo}</span>
}
export const Meta = ({ status, validos, meta, pct }: { status: string; validos: number; meta: number; pct: number | null }) => {
  const classe = (STATUS[status] ?? ['fora'])[0]
  return (
    <div className={`epf-meta epf-meta--${classe}`}>{validos} / {meta}
      <div className="epf-meta__barra"><span style={{ width: `${Math.min(100, (pct ?? 0) * 100)}%` }} /></div>
    </div>
  )
}

export const fmt = (n: number) => n.toLocaleString('pt-BR')
export const pct1 = (p: number | null) => (p == null ? '—' : `${(p * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`)
export const dataBR = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—')

export function baixar(nome: string, conteudo: string, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  Object.assign(document.createElement('a'), { href: url, download: nome }).click()
  URL.revokeObjectURL(url)
}
