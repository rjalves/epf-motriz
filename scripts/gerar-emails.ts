// Gera os modelos de e-mail do Supabase Auth (public/emails/*.html), em português e com a identidade do EPF.
// O site publica os arquivos; o Auth os busca pela URL (GOTRUE_MAILER_TEMPLATES_*). Uso: npx tsx scripts/gerar-emails.ts
import { writeFileSync } from 'node:fs'

export type Email = { tipo: string; arquivo: string; assunto: string; variaveis: string[] }

// tipo = nome no Auth (GOTRUE_MAILER_TEMPLATES_<TIPO> / [auth.email.template.<tipo>])
export const EMAILS: Email[] = [
  { tipo: 'magic_link', arquivo: 'codigo-acesso.html', assunto: 'Seu código de acesso ao painel EPF', variaveis: ['Token', 'SiteURL'] },
  { tipo: 'confirmation', arquivo: 'codigo-acesso.html', assunto: 'Seu código de acesso ao painel EPF', variaveis: ['Token', 'SiteURL'] },
  { tipo: 'invite', arquivo: 'convite.html', assunto: 'Você foi convidado para o painel EPF', variaveis: ['ConfirmationURL', 'SiteURL'] },
  { tipo: 'recovery', arquivo: 'recuperacao.html', assunto: 'Recuperação de acesso ao painel EPF', variaveis: ['Token', 'Email'] },
  { tipo: 'email_change', arquivo: 'troca-email.html', assunto: 'Confirme seu novo e-mail no painel EPF', variaveis: ['ConfirmationURL', 'Email', 'NewEmail'] },
  { tipo: 'reauthentication', arquivo: 'reautenticacao.html', assunto: 'Código de confirmação do painel EPF', variaveis: ['Token'] },
]

// Tokens do design system (design-system/tokens.css), inline porque programas de e-mail ignoram CSS externo.
const C = { noite: '#0E2640', coral: '#FF6A3D', ambar: '#FFC233', teal: '#16B8A8', marfim: '#FBF6EE', papel: '#FFFFFF',
  linha: '#E6E1D6', texto2: '#4A5A6E' }
const FONTE = "font-family:'Lexend',Arial,Helvetica,sans-serif;"

const titulo = (t: string, texto: string) => `
          <tr>
            <td style="padding:28px 32px 8px;${FONTE}color:${C.noite};">
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:700;color:${C.noite};">${t}</h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:${C.texto2};">${texto}</p>
            </td>
          </tr>`

const codigo = (nota: string) => `
          <tr>
            <td style="padding:0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.noite};border-radius:12px;">
                <tr>
                  <td align="center" style="padding:22px 12px;font-family:'IBM Plex Mono','Courier New',Courier,monospace;font-size:36px;line-height:1;font-weight:600;letter-spacing:10px;color:${C.papel};">{{ .Token }}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 0;${FONTE}font-size:14px;line-height:1.5;color:${C.texto2};text-align:center;">
              ${nota}
            </td>
          </tr>`

// primario = botão cheio (ação principal do e-mail); senão contorno (atalho para o painel).
const botao = (rotulo: string, href: string, primario = false) => `
          <tr>
            <td align="center" style="padding:24px 32px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:12px;border:2px solid ${C.noite};${primario ? `background-color:${C.noite};` : ''}">
                    <a href="${href}" style="display:inline-block;padding:12px 24px;${FONTE}font-size:15px;font-weight:600;color:${primario ? C.papel : C.noite};text-decoration:none;">${rotulo}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`

const nota = (texto: string) => `
          <tr>
            <td style="padding:16px 32px 0;${FONTE}font-size:13px;line-height:1.55;color:${C.texto2};text-align:center;">${texto}</td>
          </tr>`

const aviso = (destaque: string, texto: string) => `
          <tr>
            <td style="padding:28px 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.marfim};border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;${FONTE}font-size:14px;line-height:1.55;color:${C.noite};">
                    <strong>${destaque}</strong> ${texto}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`

const PAINEL = botao('Abrir o painel', '{{ .SiteURL }}/painel')

const layout = (assunto: string, previa: string, conteudo: string) => `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${assunto}</title>
  <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700&family=IBM+Plex+Mono:wght@600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:${C.marfim};">
  <!-- Pré-visualização na caixa de entrada -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${previa}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.marfim};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background-color:${C.papel};border:1px solid ${C.linha};border-radius:16px;overflow:hidden;">

          <!-- Faixa tricolor: Engajamento, Pertencimento, Futuros -->
          <tr>
            <td style="padding:0;font-size:0;line-height:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="33%" height="6" style="background-color:${C.coral};font-size:0;line-height:0;">&nbsp;</td>
                  <td width="34%" height="6" style="background-color:${C.ambar};font-size:0;line-height:0;">&nbsp;</td>
                  <td width="33%" height="6" style="background-color:${C.teal};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Marca -->
          <tr>
            <td style="padding:28px 32px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;">
                    <img src="{{ .SiteURL }}/emails/epf-simbolo.png" width="60" height="36" alt="" style="display:block;border:0;">
                  </td>
                  <td style="vertical-align:middle;${FONTE}color:${C.noite};">
                    <div style="font-size:20px;font-weight:700;line-height:1.1;">EPF</div>
                    <div style="font-size:12px;line-height:1.4;color:${C.texto2};">Engajamento, Pertencimento e Futuros</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
${conteudo}

          <!-- Rodapé -->
          <tr>
            <td style="padding:20px 32px 24px;border-top:1px solid ${C.linha};${FONTE}font-size:12px;line-height:1.6;color:${C.texto2};">
              Realização Itaú Social · Articulação Motriz · Apoio técnico Germina<br>
              Desenvolvido com Tecnologia Motriz<br>
              Este é um e-mail automático. Não é preciso responder.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

const CONTEUDO: Record<string, { previa: string; corpo: string }> = {
  'codigo-acesso.html': {
    previa: 'Use o código {{ .Token }} para entrar no painel da pesquisa EPF. Ele vale por 1 hora.',
    corpo: titulo('Seu código de acesso', 'Você tem acesso ao painel da pesquisa EPF. Para entrar, abra o painel, informe este e-mail e digite o código abaixo.')
      + codigo('Vale por 1 hora e só pode ser usado uma vez. Se vencer, peça outro na tela de login.')
      + PAINEL
      + aviso('Não pediu este código?', 'Ignore este e-mail: ninguém entra no painel sem ele. Não compartilhe o código com outras pessoas, nem com a equipe da pesquisa.'),
  },
  'convite.html': {
    previa: 'Você recebeu acesso ao painel da pesquisa EPF.',
    corpo: titulo('Você foi convidado', 'Você recebeu acesso ao painel da pesquisa EPF — Engajamento, Pertencimento e Futuros, para acompanhar a participação dos estudantes.')
      + botao('Aceitar convite', '{{ .ConfirmationURL }}', true)
      + nota('Depois, entre sempre por <a href="{{ .SiteURL }}/painel" style="color:#0E2640;">{{ .SiteURL }}/painel</a> com este e-mail. A cada acesso enviamos um código de 6 dígitos; não há senha.')
      + aviso('Não esperava este convite?', 'Ignore este e-mail. Nenhum acesso é liberado sem que você aceite.'),
  },
  'recuperacao.html': {
    previa: 'Use o código {{ .Token }} para recuperar seu acesso ao painel EPF.',
    corpo: titulo('Recuperar seu acesso', 'Recebemos um pedido para recuperar o acesso de {{ .Email }} ao painel da pesquisa EPF. Digite o código abaixo na tela de login.')
      + codigo('Vale por 1 hora e só pode ser usado uma vez.')
      + PAINEL
      + aviso('Não pediu?', 'Ignore este e-mail. Seu acesso continua como estava.'),
  },
  'troca-email.html': {
    previa: 'Confirme o novo e-mail de acesso ao painel EPF.',
    corpo: titulo('Confirme seu novo e-mail', 'Recebemos um pedido para trocar o e-mail de acesso ao painel EPF de {{ .Email }} para {{ .NewEmail }}.')
      + botao('Confirmar novo e-mail', '{{ .ConfirmationURL }}', true)
      + aviso('Não pediu essa troca?', 'Ignore este e-mail e avise o ponto focal da sua rede. O e-mail de acesso só muda depois da confirmação.'),
  },
  'reautenticacao.html': {
    previa: 'Use o código {{ .Token }} para confirmar a operação no painel EPF.',
    corpo: titulo('Confirme que é você', 'Para concluir a operação no painel da pesquisa EPF, digite o código abaixo.')
      + codigo('Vale por poucos minutos e só pode ser usado uma vez.')
      + aviso('Não reconhece este pedido?', 'Ignore este e-mail. Nada muda sem o código.'),
  },
}

export function gerarEmails(): Record<string, string> {
  return Object.fromEntries(Object.entries(CONTEUDO).map(([arquivo, { previa, corpo }]) =>
    [arquivo, layout(EMAILS.find((e) => e.arquivo === arquivo)!.assunto, previa, corpo)]))
}

if (process.argv[1]?.endsWith('gerar-emails.ts')) {
  for (const [arquivo, html] of Object.entries(gerarEmails())) writeFileSync(`public/emails/${arquivo}`, html)
  console.log(`${Object.keys(CONTEUDO).length} modelos gravados em public/emails/`)
}
