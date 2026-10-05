import { useEffect, useState } from 'react'
import type { Papel } from '../lib/capacidades'
import type { Sessao } from '../lib/sessao'
import { sb } from '../lib/supabase'

export type Perfil = { user_id: string; papel: Papel; nome: string | null; rede_id: string | null; co_inep: number | null; ativo: boolean }

export function usePerfil(sessao: Sessao | null) {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    if (!sessao) { setPerfil(null); setCarregando(false); return }
    setCarregando(true)
    sb.from('perfil').select('user_id,papel,nome,rede_id,co_inep,ativo').eq('user_id', sessao.user_id).maybeSingle()
      .then(({ data }) => { setPerfil(data?.ativo ? data : null); setCarregando(false) })
  }, [sessao])
  return { perfil, carregando }
}
