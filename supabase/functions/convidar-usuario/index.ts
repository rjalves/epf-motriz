// Convida um usuário e cria o perfil. Quem chama precisa poder gerir o papel/rede pedidos (pode_gerir).
// O usuário nasce confirmado (entra com o código de 6 dígitos do login) e o aviso sai pela API do Resend.
import { createClient } from 'npm:@supabase/supabase-js@2'

const URL = Deno.env.get('SUPABASE_URL')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'
const RESEND_URL = Deno.env.get('RESEND_API_URL') ?? 'https://api.resend.com/emails'
const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
const REMETENTE = Deno.env.get('EMAIL_REMETENTE') ?? 'EPF <nao-responda@epf.motriz.org>'
const ROTULO: Record<string, string> = { admin: 'Admin Motriz', gestor_rede: 'Gestor da rede', regional: 'Regional', escola: 'Ponto focal da escola', pesquisador: 'Pesquisador' }
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
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
  // E-mail já cadastrado (ativo ou com convite pendente): recusa antes de chamar o Auth,
  // que reenviaria o convite e devolveria o usuário existente.
  const { data: existe, error: e0 } = await admin.rpc('email_ja_cadastrado', { p_email: email })
  if (e0) return json({ erro: e0.message }, 500)
  if (existe) return json({ erro: 'email_ja_cadastrado' }, 409)

  const { data: convite, error: e1 } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { nome } })
  if (e1) return json({ erro: e1.message }, 400)
  const { error: e2 } = await admin.from('perfil').insert({
    user_id: convite.user.id, papel, nome, rede_id, regional_id, co_inep, criado_por: user.id,
  })
  if (e2) {
    await admin.auth.admin.deleteUser(convite.user.id) // desfaz o convite recém-criado se o escopo for incoerente
    return json({ erro: e2.message.includes('escopo_incoerente') ? 'escopo_incoerente' : e2.message }, 400)
  }
  await admin.from('auditoria').insert({ user_id: user.id, acao: 'convidar_usuario', alvo: `${email} (${papel})` })
  return json({ ok: true, email_enviado: await avisar(email, nome ?? '', papel) }, 200)
})

// O acesso já vale sem o e-mail (o login é por código); por isso uma falha aqui não desfaz o convite.
async function avisar(email: string, nome: string, papel: string): Promise<boolean> {
  if (!RESEND_KEY) return false
  const painel = `${SITE}/painel`
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#0E2640;max-width:480px;line-height:1.5">
<p style="font-size:20px;font-weight:bold;margin:0 0 16px">EPF · Painel</p>
<p>Olá, ${esc(nome)}.</p>
<p>Você recebeu acesso ao painel da pesquisa EPF — Engajamento, Pertencimento e Futuros, com o perfil <b>${esc(ROTULO[papel] ?? papel)}</b>.</p>
<p>Para entrar, acesse <a href="${painel}" style="color:#0E2640">${painel}</a>, informe este e-mail e digite o código de 6 dígitos que enviaremos na hora.</p>
<p style="font-size:12px;color:#5E6B7B;border-top:1px solid #E6E1D6;padding-top:12px;margin-top:24px">Desenvolvido com Tecnologia Motriz</p></div>`
  try {
    const r = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: REMETENTE, to: [email], subject: 'Seu acesso ao painel EPF', html,
        text: `Olá, ${nome}. Você recebeu acesso ao painel EPF (${ROTULO[papel] ?? papel}). Acesse ${painel}, informe este e-mail e digite o código de 6 dígitos que enviaremos.` }),
    })
    if (!r.ok) console.error('resend', r.status, await r.text())
    return r.ok
  } catch (e) {
    console.error('resend', e)
    return false
  }
}
