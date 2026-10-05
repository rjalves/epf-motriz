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
  tests/         pgTAP (129 verificações)
  seed.sql       dados de teste locais (Rede Norte/Sul, usuários @teste.org)
scripts/         testar-banco.sh, gerar-instrumento.ts, extrair-secao.py
e2e/             Playwright: estudante, gestão por perfil, configuração e convites
```

## Desenvolvimento

Requer Node 20+, Docker e Python 3 com Playwright (`pip install playwright && playwright install chromium`, só para os e2e).

```bash
npm install
npx supabase start -x realtime,storage-api,imgproxy,logflare,vector,supavisor,studio,postgres-meta,edge-runtime
cp .env.example .env   # preencha com a API URL e a anon key que o comando acima imprime
npm run dev            # http://localhost:5173/responder/teste-norte  e  http://localhost:5173/painel
```

As portas locais do Supabase estão em 564xx (`supabase/config.toml`), porque 543xx e 553xx já eram usadas por outros projetos nesta máquina. Localmente os e-mails (código e convite) vão para o Resend falso dos e2e (`e2e/util.py`, porta 58025), configurado no `seed.sql`. Para entrar à mão no painel local: peça o código na tela, gere outro com `docker exec supabase_db_epf-monitor psql -U postgres -tAc "select _novo_codigo('admin@teste.org')"` e digite esse.

Usuários de teste (o código chega ao Resend falso dos e2e): `admin@`, `pesquisa@`, `gestor.norte@`, `regional.n1@`, `escola.alfa@`, `gestor.sul@` + `teste.org`.

## Testes

```bash
npm test                   # unitários (Vitest): regras de cadastro, ramificação, capacidades, relatório, plano amostral, gerador
scripts/testar-banco.sh    # banco (pgTAP) num Postgres descartável: 129 verificações
e2e/rodar.sh /tmp          # ponta a ponta (com supabase start + npm run dev): 21 + 18 + 27 verificações
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
   npx supabase migration repair --db-url "$DATABASE_URL" --status applied 20260929000001 20260929000002 20260929000003 20260929000004 20260929000005 20260929000006 20260929000007 20260929000008 20260929000009 20260930000010 20261005000011 20261005000012 20261005000013 20261006000014 20261006000015 20261006000016
   ```
3. **Login e convite por código, e-mail direto pelo Resend** (migrações 011–013 = `../database/006_acesso_por_codigo.sql`): rode o arquivo no SQL Editor e preencha a configuração do fim dele:
   ```sql
   insert into public.config_privada (chave, valor) values
     ('resend_api_key', 're_…'), ('email_remetente', 'EPF <nao-responda@epf.motriz.org>'),
     ('site_url', 'https://deploy-epf.9bkmfg.easypanel.host')
   on conflict (chave) do update set valor = excluded.valor;
   ```
   O banco gera o código, envia o e-mail com o modelo do EPF pela API do Resend (`pg_net`) e emite a sessão do painel (JWT de 12 h assinado com o `JWT_SECRET` do Supabase, lido de `app.settings.jwt_secret`; se não existir, grave-o em `config_privada` como `jwt_secret`). O Auth do Supabase (GoTrue) não envia nada: não há SMTP, modelos `GOTRUE_MAILER_*` nem Edge Function para configurar. Os modelos são gerados por `npx tsx scripts/gerar-emails.ts`. Diagnóstico dos envios: consulta no fim do `006`.
4. **Cadastro do estudante sem nome** (migração 014 = `../database/007_cadastro_sem_nome.sql`): rode no SQL Editor. Cada início é uma resposta nova; a retomada vale só no mesmo aparelho.
   Exclusão de campanha pelo admin: migração 015 = `../database/008_excluir_campanha.sql`.
   Modelos de e-mail atualizados: migração 016 = `../database/009_modelos_email.sql` (gerada por `scripts/gerar-emails.ts`; a cada mudança de modelo já implantado, aponte `MIGRACAO` para uma migração nova).
5. **Ao trocar o `JWT_SECRET`** do Supabase, as sessões abertas caem (todos entram de novo com código); nada mais a fazer.
6. **Frontend (Easypanel):** serviço *App* apontando para este repositório, build por **Dockerfile** (nginx com fallback de SPA, porta 80). Em *Environment*, defina `VITE_SUPABASE_URL` e a `VITE_SUPABASE_ANON_KEY` **nova** — viram build args e são embutidas no build; sem elas o build falha de propósito.
7. **Primeiro admin:** crie o usuário no Studio (*Authentication → Add user*, com "Auto Confirm User") e rode
   ```sql
   insert into public.perfil (user_id, papel, nome) select id, 'admin', 'Motriz' from auth.users where lower(email) = '<e-mail>';
   ```
   Os demais usuários são convidados pela tela Usuários.

## Operação por campanha

1. **Campanha** (admin): Campanhas → Nova campanha → rede, número, endereço do link, versão do questionário, janela e séries.
2. **Plano amostral:** Configurar campanha → importar o `.xlsx` da Germina. Parecer "Substituir…" tira a escola da amostra.
3. **Usuários:** convide o gestor da rede; ele convida as regionais e os pontos focais das escolas.
4. **Abrir a coleta:** interruptor "Coleta aberta" na configuração. Link e QR aparecem para os perfis de rede e escola.
5. **Durante a janela:** Relatório diário (modelo 2.C) + CSV das escolas para o ponto focal da secretaria.
6. **Nova versão do questionário:** Configuração → Questionário → baixe o modelo Excel ou JSON (já com o EPF 2026), edite e importe; o nome do arquivo vira o nome da versão. O modelo JSON é `public/modelos/modelo-questionario-epf.json` (cópia de `supabase/instrumento/epf-2026-v1.json`); o Excel é gerado dele na hora (`src/gestao/questionario.ts`).

## Privacidade (LGPD)

- Nomes e contatos ficam em `participante`, separados das respostas. Só o admin consulta, por `ver_participantes()`, e cada consulta fica em `auditoria`.
- Pedido de exclusão de titular: `delete from participante where sessao_id = '<id>'` (respostas pseudônimas continuam); para apagar tudo, `delete from sessao where id = '<id>'`.
- Menores de 12 anos confirmam a autorização do responsável; a escola guarda o termo assinado.

## Pendências conhecidas

- Conciliar os códigos de itens com a Germina antes da Aplicação 1 (ver plano, "Pendência de conteúdo").
- Validação jurídica do Itaú Social: menores de 12 anos e troca de "anônima" por "confidencial" na comunicação.
- O design system é copiado de `../design-system`: ao alterar lá, copie de novo `tokens.css`, `components.css` e `assets/`.
