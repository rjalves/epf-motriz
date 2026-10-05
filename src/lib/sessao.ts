// Sessão do painel emitida pelo banco (entrar_com_codigo): JWT de 12 h guardado no navegador.
import { useEffect, useState } from 'react'

export type Sessao = { access_token: string; expires_at: number; user_id: string; email: string }
const CHAVE = 'epf-sessao'
const ouvintes = new Set<(s: Sessao | null) => void>()

export function sessaoAtual(): Sessao | null {
  try {
    const s: Sessao | null = JSON.parse(localStorage.getItem(CHAVE) ?? 'null')
    return s && s.expires_at * 1000 > Date.now() ? s : null
  } catch { return null }
}

export function salvarSessao(s: Sessao) {
  localStorage.setItem(CHAVE, JSON.stringify(s)); ouvintes.forEach((f) => f(s))
}

export function sair() {
  localStorage.removeItem(CHAVE); ouvintes.forEach((f) => f(null))
}

export function useSessao() {
  const [sessao, setSessao] = useState(sessaoAtual)
  useEffect(() => {
    ouvintes.add(setSessao)
    const fim = sessao ? setTimeout(sair, sessao.expires_at * 1000 - Date.now()) : undefined
    return () => { ouvintes.delete(setSessao); clearTimeout(fim) }
  }, [sessao])
  return sessao
}
