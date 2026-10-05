import { createClient } from '@supabase/supabase-js'
import { sessaoAtual } from './sessao'

// Sem o Auth do Supabase: o token vem da sessão do painel; sem sessão (estudante), vale a anon key.
export const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY,
  { accessToken: async () => sessaoAtual()?.access_token ?? null })
