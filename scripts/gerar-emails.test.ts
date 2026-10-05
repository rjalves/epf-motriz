import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EMAILS, gerarEmails } from './gerar-emails'

const gerados = gerarEmails()

describe('modelos de e-mail do Auth', () => {
  it('cobre todos os e-mails que o Supabase Auth envia', () => {
    expect(EMAILS.map((e) => e.tipo).sort()).toEqual(['confirmation', 'email_change', 'invite', 'magic_link', 'reauthentication', 'recovery'])
  })

  it.each(Object.keys(gerados))('%s está atualizado em public/emails (rode npx tsx scripts/gerar-emails.ts)', (arquivo) => {
    expect(readFileSync(`public/emails/${arquivo}`, 'utf8')).toBe(gerados[arquivo])
  })

  it.each(EMAILS.map((e) => [e.tipo, e]))('%s: em português, com as variáveis que o Auth preenche', (_, e) => {
    const html = gerados[e.arquivo]
    expect(html).toContain('lang="pt-BR"')
    expect(html).toMatch(/Desenvolvido com Tecnologia Motriz/)
    expect(e.assunto).not.toMatch(/\b(magic|link|confirm|reset|invite|change)\b/i)
    for (const v of e.variaveis) expect(html).toContain(`{{ .${v} }}`)
    expect(html).not.toMatch(/Magic Link|Follow this link|Log In|Confirm your|Reset Password|You have been invited/)
  })
})
