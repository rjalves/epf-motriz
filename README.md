# epf-monitor

Plataforma da pesquisa **EPF — Engajamento, Pertencimento e Futuros**: o estudante responde o questionário pelo link da campanha, e a Motriz, as secretarias, as regionais, as escolas e os pesquisadores acompanham a coleta em tempo real, cada um vendo só o que o seu perfil permite.

- Manual do usuário, por perfil: `docs/manual-do-usuario.md`
- Contexto do projeto: `../docs/conhecimento-epf.md`
- Design (decisões, modelo, permissões): `../docs/superpowers/specs/2026-09-29-plataforma-epf-design.md`
- Modelo de dados e implantação do banco: `../database/modelo-de-dados.md`
- Design system (fonte das classes `.epf-*`): `../design-system/` — copiado em `src/design-system/`

## Estrutura

```
src/
  coleta/        ambiente do estudante: /responder/:slug (Responder, CadastroForm, BlocoForm, regras e API)
  gestao/        painel com login: /painel (Campanhas, Painel, PainelEscola, Configuracao, Usuarios)
  lib/           cliente Supabase e matriz de capacidades por perfil
  design-system/ tokens.css, components.css, assets (cópia de ../design-system)
supabase/
  migrations/    001–007 estrutura (iguais a ../database/001), 008 questionário EPF 2026, 009 redes, 010 correções (= ../database/003)
  tests/         pgTAP (92 verificações)
  functions/     convidar-usuario (Edge Function)
  seed.sql       dados de teste locais (Rede Norte/Sul, usuários @teste.org)
scripts/         testar-banco.sh, gerar-instrumento.ts, extrair-secao.py
e2e/             Playwright: estudante, gestão por perfil, configuração e convites
```

## Desenvolvimento

Requer Node 20+, Docker e Python 3 com Playwright (`pip install playwright && playwright install chromium`, só para os e2e).

```bash
npm install
npx supabase start -x realtime,storage-api,imgproxy,logflare,vector,supavisor,studio,postgres-meta
cp .env.example .env   # preencha com a API URL e a anon key que o comando acima imprime
npm run dev            # http://localhost:5173/responder/teste-norte  e  http://localhost:5173/painel
```

As portas locais do Supabase estão em 564xx (`supabase/config.toml`), porque 543xx e 553xx já eram usadas por outros projetos nesta máquina. Os códigos de acesso locais chegam no Mailpit: http://127.0.0.1:56424. Os convites saem pela API do Resend; localmente, `supabase/functions/.env` (git-ignorado, crie antes do `supabase start`) aponta para o Resend falso do e2e:

```
RESEND_API_URL=http://host.docker.internal:58025/emails
RESEND_API_KEY=re_teste
EMAIL_REMETENTE=EPF <nao-responda@teste.org>
```

Sem esse arquivo, o convite cria o acesso e a tela avisa que o e-mail não saiu.

Usuários de teste (entre com o código de 6 dígitos que chega no Mailpit): `admin@`, `pesquisa@`, `gestor.norte@`, `regional.n1@`, `escola.alfa@`, `gestor.sul@` + `teste.org`.

## Testes

```bash
npm test                   # unitários (Vitest): regras de cadastro, ramificação, capacidades, relatório, plano amostral, gerador
scripts/testar-banco.sh    # banco (pgTAP) num Postgres descartável: 92 verificações
e2e/rodar.sh /tmp          # ponta a ponta (com supabase start + npm run dev): 17 + 17 + 17 verificações
npm run build
```

## Implantação no Supabase autohospedado

O servidor recebeu a estrutura por `../database/001_estrutura_inicial.sql` e as redes por `002_dados_iniciais.sql`. Isso equivale às migrações 001–007 e 009 deste projeto. Faltam as correções da revisão (010) e o questionário (008).

**Antes de tudo:** troque `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY` e as outras credenciais de exemplo do `.env` do Supabase. As chaves que estão no servidor foram assinadas com o segredo público da documentação. Detalhes em `../database/modelo-de-dados.md` §7.

1. **Correções da revisão e questionário EPF 2026** (conexão direta na porta 5432, como `postgres`):
   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ../database/003_correcoes_revisao.sql
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260929000008_instrumento_epf2026.sql
   ```
2. **Histórico de migrações**, para `supabase db push` futuros não reaplicarem o que já existe:
   ```bash
   npx supabase migration repair --db-url "$DATABASE_URL" --status applied 20260929000001 20260929000002 20260929000003 20260929000004 20260929000005 20260929000006 20260929000007 20260929000008 20260929000009 20260930000010
   ```
3. **Edge Function:** copie `supabase/functions/convidar-usuario/` para `volumes/functions/` do docker-compose do Supabase. No serviço `functions`, defina:
   ```
   SITE_URL=https://deploy-epf.9bkmfg.easypanel.host
   RESEND_API_KEY=<chave do Resend>
   EMAIL_REMETENTE=EPF <nao-responda@epf.motriz.org>
   ```
4. **Auth (login por código de 6 dígitos, e-mails pelo Resend):** no `.env` do Supabase:
   ```
   SITE_URL=https://deploy-epf.9bkmfg.easypanel.host
   ADDITIONAL_REDIRECT_URLS=https://deploy-epf.9bkmfg.easypanel.host/painel
   DISABLE_SIGNUP=true
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=465
   SMTP_USER=resend
   SMTP_PASS=<chave do Resend>
   SMTP_ADMIN_EMAIL=nao-responda@epf.motriz.org
   SMTP_SENDER_NAME=EPF
   ```
   E no `environment:` do serviço `auth` no `docker-compose.yml` (o `.env` sozinho não chega ao contêiner), para o e-mail trazer o código, em português e com a identidade do EPF:
   ```yaml
   GOTRUE_MAILER_TEMPLATES_MAGIC_LINK: https://deploy-epf.9bkmfg.easypanel.host/emails/codigo-acesso.html
   GOTRUE_MAILER_SUBJECTS_MAGIC_LINK: Seu código de acesso ao painel EPF
   GOTRUE_MAILER_TEMPLATES_CONFIRMATION: https://deploy-epf.9bkmfg.easypanel.host/emails/codigo-acesso.html
   GOTRUE_MAILER_SUBJECTS_CONFIRMATION: Seu código de acesso ao painel EPF
   GOTRUE_MAILER_OTP_LENGTH: 6
   ```
   Confira no console do `auth`: `printenv GOTRUE_MAILER_TEMPLATES_MAGIC_LINK` deve imprimir a URL. Se o e-mail chegar em inglês, ela não está no contêiner.
   O modelo é `public/emails/codigo-acesso.html`, publicado pelo próprio frontend. O remetente precisa ser de um domínio verificado no Resend.
5. **Frontend (Easypanel):** serviço *App* apontando para este repositório, build por **Dockerfile** (nginx com fallback de SPA, porta 80). Em *Environment*, defina `VITE_SUPABASE_URL` e a `VITE_SUPABASE_ANON_KEY` **nova** — viram build args e são embutidas no build; sem elas o build falha de propósito.
6. **Primeiro admin:** convide pelo Studio e rode
   ```sql
   insert into public.perfil (user_id, papel, nome) select id, 'admin', 'Motriz' from auth.users where email = '<e-mail>';
   ```

## Operação por campanha

1. **Campanha** (admin): Campanhas → Nova campanha → rede, número, endereço do link, versão do questionário, janela e séries.
2. **Plano amostral:** Configurar campanha → importar o `.xlsx` da Germina. Parecer "Substituir…" tira a escola da amostra.
3. **Usuários:** convide o gestor da rede; ele convida as regionais e os pontos focais das escolas.
4. **Abrir a coleta:** interruptor "Coleta aberta" na configuração. Link e QR aparecem para os perfis de rede e escola.
5. **Durante a janela:** Relatório diário (modelo 2.C) + CSV das escolas para o ponto focal da secretaria.
6. **Nova versão do questionário:** `npx tsx scripts/gerar-instrumento.ts <xlsx> "<nome>"`, revise `supabase/instrumento/*.json` e importe pela Configuração.

## Privacidade (LGPD)

- Nomes e contatos ficam em `participante`, separados das respostas. Só o admin consulta, por `ver_participantes()`, e cada consulta fica em `auditoria`.
- Pedido de exclusão de titular: `delete from participante where sessao_id = '<id>'` (respostas pseudônimas continuam); para apagar tudo, `delete from sessao where id = '<id>'`.
- Menores de 12 anos confirmam a autorização do responsável; a escola guarda o termo assinado.

## Pendências conhecidas

- Conciliar os códigos de itens com a Germina antes da Aplicação 1 (ver plano, "Pendência de conteúdo").
- Validação jurídica do Itaú Social: menores de 12 anos e troca de "anônima" por "confidencial" na comunicação.
- O design system é copiado de `../design-system`: ao alterar lá, copie de novo `tokens.css`, `components.css` e `assets/`.
