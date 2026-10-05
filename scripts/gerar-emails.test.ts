import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EMAILS, gerarMigracao, MIGRACAO } from './gerar-emails'

const sql = gerarMigracao()

describe('modelos de e-mail do EPF', () => {
  it('a migração está atualizada (rode npx tsx scripts/gerar-emails.ts)', () => {
    expect(readFileSync(MIGRACAO, 'utf8')).toBe(sql)
  })

  it('tem os e-mails de código de acesso e de convite', () => {
    expect(EMAILS.map((e) => e.tipo)).toEqual(['codigo', 'convite'])
  })

  it.each(EMAILS.map((e) => [e.tipo, e]))('%s: em português, com as variáveis preenchidas pelo banco', (_, e) => {
    const html = sql.split('$html$').find((t) => t.startsWith('<!doctype') && t.includes(`<title>${e.assunto}</title>`))!
    expect(html).toContain('lang="pt-BR"')
    expect(html).toContain('Desenvolvido por Tecnologia Motriz')
    expect(html).toContain('/emails/epf-simbolo.png')
    for (const v of e.variaveis) expect(html).toContain(`{{ .${v} }}`)
    expect(html).not.toMatch(/Magic Link|Follow this link|Log In|ConfirmationURL/)
  })
})
