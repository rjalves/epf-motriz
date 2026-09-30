// Convida um usuário e cria o perfil. Quem chama precisa poder gerir o papel/rede pedidos (pode_gerir).
import { createClient } from 'npm:@supabase/supabase-js@2'

const URL = Deno.env.get('SUPABASE_URL')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'
const cors = { 'Access-Control-Allow-Origin': SITE, 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' }
const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const { email, nome, papel, rede_id = null, regional_id = null, co_inep = null } = await req.json()
  if (!email || !papel) return json({ erro: 'email e papel são obrigatórios' }, 400)

  const chamador = createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: { user } } = await chamador.auth.getUser()
  const { data: pode } = await chamador.rpc('pode_gerir', { alvo_papel: papel, alvo_rede: rede_id })
  if (!user || !pode) return json({ erro: 'sem_permissao' }, 403)

  const admin = createClient(URL, SERVICE)
  const { data: convite, error: e1 } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${SITE}/painel` })
  if (e1) return json({ erro: e1.message }, 400)
  const { error: e2 } = await admin.from('perfil').insert({
    user_id: convite.user.id, papel, nome, rede_id, regional_id, co_inep, criado_por: user.id,
  })
  if (e2) {
    await admin.auth.admin.deleteUser(convite.user.id) // desfaz o convite se o escopo for incoerente
    return json({ erro: e2.message }, 400)
  }
  await admin.from('auditoria').insert({ user_id: user.id, acao: 'convidar_usuario', alvo: `${email} (${papel})` })
  return json({ ok: true }, 200)
})
