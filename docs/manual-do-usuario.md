# Manual da plataforma EPF

**EPF — Engajamento, Pertencimento e Futuros** é a pesquisa do Itaú Social, articulada pela Motriz com apoio técnico da Germina, que ouve estudantes do 6º e do 9º ano das redes municipais.

A plataforma tem duas partes:

- **Questionário do estudante**: o estudante abre o link da pesquisa, faz um cadastro simples e responde. Não precisa de login.
- **Painel**: as equipes da Motriz, das secretarias, das regionais e das escolas acompanham a coleta. Cada pessoa vê só o que o seu perfil permite.

---

## Sumário

1. [Perfis e o que cada um pode fazer](#1-perfis-e-o-que-cada-um-pode-fazer)
2. [Entrar no painel (todos os perfis)](#2-entrar-no-painel-todos-os-perfis)
3. [Admin Motriz](#3-admin-motriz)
4. [Gestor da rede (SME)](#4-gestor-da-rede-sme)
5. [Regional](#5-regional)
6. [Ponto focal da escola](#6-ponto-focal-da-escola)
7. [Pesquisador](#7-pesquisador)
8. [Estudante: responder o questionário](#8-estudante-responder-o-questionário)
9. [Como ler os números do painel](#9-como-ler-os-números-do-painel)
10. [Privacidade](#10-privacidade)
11. [Problemas comuns](#11-problemas-comuns)

---

## 1. Perfis e o que cada um pode fazer

| Função | Admin Motriz | Gestor da rede | Regional | Ponto focal da escola | Pesquisador |
|---|:-:|:-:|:-:|:-:|:-:|
| Ver campanhas e painel | Todas as redes | Sua rede | Escolas da sua regional | Só a sua escola | Todas as redes |
| Ver link e QR code da pesquisa | ✔ | ✔ | ✔ | ✔ | — |
| Relatório diário e CSV das escolas | ✔ | ✔ | ✔ | — | ✔ |
| Exportar respostas (sem nomes) | ✔ | — | — | — | ✔ |
| Criar e configurar campanhas | ✔ | — | — | — | — |
| Importar plano amostral e questionário | ✔ | — | — | — | — |
| Abrir e fechar a coleta | ✔ | — | — | — | — |
| Excluir campanha | ✔ | — | — | — | — |
| Convidar e desativar usuários | Todos os perfis | Regionais e escolas da sua rede | — | — | — |
| Consultar nomes e contatos dos estudantes | ✔ (com registro em auditoria) | — | — | — | — |

O perfil aparece no canto superior direito do painel, ao lado do seu e-mail.

---

## 2. Entrar no painel (todos os perfis)

O painel não usa senha. A cada entrada, você recebe por e-mail um código de 6 dígitos.

1. Abra o endereço do painel: `https://<endereço da plataforma>/painel`.
2. Digite o seu **e-mail institucional**, o mesmo em que você recebeu o convite.
3. Clique em **Receber código**.
4. Abra o e-mail "Seu código de acesso ao painel EPF" e copie o código de 6 dígitos.
5. Digite o código em **Código de acesso** e clique em **Entrar**.
   - O código vale por 1 hora. Se pedir outro, use sempre o mais recente.
   - **Reenviar código** manda um código novo (aguarde um minuto entre os pedidos).
   - **Trocar e-mail** volta para o campo de e-mail.
6. Para sair, clique em **Sair** no canto superior direito.

**Só entra quem foi convidado.** Se aparecer "Não encontramos um acesso para este e-mail", peça o convite:
- ao gestor da sua rede, se você é de uma regional ou de uma escola;
- à Motriz, nos demais casos.

**Primeiro acesso:** o convite chega por e-mail ("Seu código de acesso ao painel EPF"), com um código e o botão **Abrir o painel**. Entre pelos passos acima, com o e-mail em que recebeu o convite. Se o código do convite vencer (1 hora), peça outro na tela de login.

---

## 3. Admin Motriz

O admin prepara cada aplicação, libera o acesso das redes e acompanha todas elas.

### 3.1 Criar uma campanha

Uma campanha é uma aplicação da pesquisa em uma rede, por exemplo "Natal, Aplicação 1".

1. Em **Campanhas**, clique em **Nova campanha**.
2. Preencha:
   - **Rede**: a rede municipal.
   - **Aplicação nº**: 1 na primeira aplicação, 2 na segunda.
   - **Início da janela** e **Fim da janela**: as datas em que os estudantes podem responder.
   - **Endereço do link**: letras minúsculas, números e hífen, por exemplo `natal-2026-1`. O link dos estudantes fica `…/responder/natal-2026-1`.
   - **Versão do questionário**: normalmente a mais recente.
   - **Séries que respondem**: marque 6º e 9º ano, ou as séries definidas para a rede.
3. Clique em **Criar campanha**. A tela de configuração da campanha abre em seguida.

Se o endereço do link já existir, a plataforma avisa. Escolha outro.

### 3.2 Importar o plano amostral

O plano amostral é a planilha da Germina com as escolas sorteadas.

1. Na configuração da campanha, localize o cartão **Plano amostral**.
2. Clique em **Importar plano amostral (.xlsx da Germina)** e escolha o arquivo.
3. A plataforma mostra quantas escolas foram importadas e quantas estão na amostra.
4. Escolas com parecer de substituição aparecem com o aviso "saiu da amostra" e a justificativa.

**Para substituir o plano**, clique em **Substituir pelo arquivo novo (.xlsx)**. O arquivo novo passa a valer por inteiro. Escolas que não estiverem nele saem da campanha, e a plataforma informa quantas saíram. Se uma escola do arquivo pertencer a outra rede, a importação é cancelada e nada é alterado.

A **meta** de cada escola é calculada automaticamente: 85% das matrículas do 6º e do 9º ano.

### 3.3 Importar uma nova versão do questionário

Faça isso só quando o questionário for revisado. A importação aceita **Excel (.xlsx)** ou **JSON**.

1. Na configuração de qualquer campanha (ou em **Nova campanha**), no cartão **Questionário**, clique em **Baixar modelo Excel** (ou **Baixar modelo JSON**). O modelo já vem com o questionário EPF 2026 preenchido.
2. No Excel, edite as abas **Blocos** e **Itens**. A aba **Instruções** explica cada coluna. Uma linha é uma pergunta, e as alternativas ficam na coluna `opcoes`, separadas por `|` (ex.: `Sim | Não`).
3. Salve o arquivo com o nome da nova versão, por exemplo `EPF 2026 v2.xlsx`. O nome do arquivo vira o nome da versão.
4. Clique em **Importar nova versão (Excel ou JSON)** e escolha o arquivo.
   - Se algo estiver errado, a plataforma lista cada problema com a pergunta ou a linha da planilha (ex.: "Aba Itens, linha 12: o bloco "Z" não está na aba Blocos."). Corrija no arquivo e importe de novo.
   - Se já existir uma versão com esse nome, renomeie o arquivo.
5. Em **Versão do questionário**, selecione a nova versão e clique em **Salvar alterações**.

Campanhas antigas continuam com a versão com que foram aplicadas. Não troque a versão de uma campanha que já recebeu respostas.

O Excel em `/Instrumento` é o documento de autoria do questionário (texto livre, notas e alternativas numeradas numa célula só) e não é importado direto: passe o conteúdo para o modelo Excel.

### 3.4 Abrir e fechar a coleta

1. Na configuração da campanha, use o interruptor no canto superior direito.
   - **Coleta aberta**: estudantes podem responder dentro da janela.
   - **Coleta fechada**: o link mostra que a pesquisa não está aberta.
2. Ao fechar, a plataforma pede confirmação. Quem estiver respondendo naquele momento não consegue mais enviar.

Depois do último dia da janela, a pesquisa fica encerrada para os estudantes mesmo com o interruptor ligado.

### 3.4.1 Excluir uma campanha

1. Em **Campanhas**, clique em **Excluir**, ao lado de **Abrir painel**. A opção aparece só para o admin.
2. Leia a confirmação: a exclusão apaga o plano amostral, os cadastros e **todas as respostas dos estudantes** daquela campanha, e não há como desfazer.
   - Campanha sem respostas: confirme no diálogo.
   - Campanha com respostas: o diálogo diz quantas são e pede que você digite o endereço do link da campanha (ex.: `natal-2026-1`). Se o texto não conferir, nada é excluído.
3. A exclusão fica registrada na auditoria, com quem excluiu e quantas respostas foram apagadas.

Antes de excluir uma campanha com respostas, exporte os dados (seção [7.2](#72-exportar-as-respostas)) se eles ainda forem necessários.

### 3.5 Convidar usuários

1. No menu superior, clique em **Usuários**.
2. No cartão **Convidar usuário**, preencha o **E-mail institucional** e o **Nome**.
3. Escolha o **Perfil**. Conforme o perfil, escolha também:
   - **Gestor da rede**: a rede.
   - **Regional**: a rede e a regional.
   - **Ponto focal da escola**: a rede e a escola.
   - **Admin Motriz** e **Pesquisador**: não têm rede, porque veem todas.
4. Clique em **Enviar convite por e-mail**. A pessoa recebe um e-mail com o endereço do painel e entra com o código de 6 dígitos.

Se aparecer "o e-mail não saiu", o acesso foi criado mesmo assim: avise a pessoa para entrar no painel com aquele e-mail. Se o e-mail já tiver acesso ou um convite pendente, a plataforma avisa e não envia outro.

**Sequência recomendada por campanha:** o admin convida o gestor da rede, e o gestor convida as regionais e os pontos focais das escolas.

### 3.6 Desativar ou reativar um acesso

1. Em **Usuários**, localize a pessoa na tabela.
2. Clique em **Desativar**. O acesso é bloqueado na hora.
3. Se foi engano, clique em **Desfazer** no aviso que aparece, ou depois em **Reativar**.

Não é possível mudar o perfil ou o escopo de um usuário existente. Nesse caso, desative o acesso e convide de novo com o perfil correto, usando outro e-mail. Você não pode desativar o seu próprio acesso.

### 3.7 Acompanhar a coleta

Veja as seções [4.2](#42-acompanhar-a-coleta-da-rede) e [4.3](#43-enviar-o-relatório-diário): o admin tem as mesmas telas do gestor, para todas as redes. O painel da campanha tem ainda os botões **Configurar campanha** e **Exportar respostas (pseudonimizadas)** (ver [7.2](#72-exportar-as-respostas)).

### 3.8 Consultar dados pessoais dos estudantes

E-mails e telefones ficam separados das respostas (o estudante não informa o nome nem a data de nascimento). Só o admin consulta esses dados, pela equipe técnica, e cada consulta fica registrada em auditoria. Use apenas quando houver necessidade real, como um pedido de exclusão feito pelo titular ou pelo responsável.

---

## 4. Gestor da rede (SME)

O gestor acompanha a rede inteira e organiza quem, na rede, acessa o painel.

### 4.1 Convidar regionais e pontos focais das escolas

1. No menu superior, clique em **Usuários**.
2. Preencha **E-mail institucional** e **Nome**.
3. Escolha o perfil:
   - **Regional**: escolha a regional.
   - **Ponto focal da escola**: escolha a escola.
4. Clique em **Enviar convite por e-mail**.

Para bloquear alguém, clique em **Desativar** (e **Desfazer**, se foi engano). Você só gerencia regionais e escolas da sua rede.

### 4.2 Acompanhar a coleta da rede

1. Em **Campanhas**, clique em **Abrir painel** na campanha da sua rede.
2. No topo ficam os indicadores:
   - **% da meta**: respostas válidas em relação à meta da rede.
   - **Em andamento agora**: estudantes que começaram e ainda não enviaram, além das recusas e das respostas de escolas fora da amostra.
   - **Escolas da amostra**: quantas estão concluídas, iniciadas e não iniciadas.
   - **Regionais**: quantas já iniciaram a coleta.
3. Mais abaixo, a tabela **Escolas** mostra cada escola com status, respostas do 6º e do 9º ano, em andamento, respostas válidas em relação à meta, e percentual.
   - As escolas que mais precisam de apoio aparecem primeiro.
   - Use os filtros **Todas**, **Não iniciadas**, **Iniciadas** e **Concluídas**.
   - Use o seletor **Regional** para ver uma regional por vez.
4. O painel se atualiza sozinho a cada minuto. O horário da última atualização aparece no canto superior direito.

### 4.3 Enviar o relatório diário

1. No painel da campanha, clique em **Relatório diário**. O texto do relatório aparece pronto, no modelo do plano de comunicação.
2. Clique em **Copiar texto** e cole no e-mail para o ponto focal da secretaria.
3. Clique em **Baixar CSV** e anexe a planilha das escolas ao e-mail. O CSV respeita os filtros que estiverem aplicados na tabela.

### 4.4 Divulgar o link da pesquisa

Com a coleta aberta, o cartão **Link da pesquisa para os estudantes** aparece no painel da campanha:

- **Copiar link**: copia o endereço para enviar às escolas.
- **Baixar QR code**: salva a imagem para imprimir ou projetar em sala.
- **Ver como o estudante**: abre o questionário em outra aba, como o estudante vê.

Não responda o questionário de verdade para testar. A resposta entraria nos números da escola.

---

## 5. Regional

A regional acompanha as escolas da sua regional e apoia as que estão atrasadas.

1. Entre no painel (seção [2](#2-entrar-no-painel-todos-os-perfis)).
2. Em **Campanhas**, clique em **Abrir painel**.
3. Você vê os mesmos indicadores e a mesma tabela do gestor ([4.2](#42-acompanhar-a-coleta-da-rede)), só com as escolas da sua regional.
4. Use o filtro **Não iniciadas** para saber quais escolas procurar primeiro.
5. Para prestar contas, use **Relatório diário** e **Baixar CSV** ([4.3](#43-enviar-o-relatório-diário)).
6. Para reenviar o link às escolas, use **Copiar link** ou **Baixar QR code** ([4.4](#44-divulgar-o-link-da-pesquisa)).

A regional não convida usuários. Peça ao gestor da rede.

---

## 6. Ponto focal da escola

O ponto focal organiza a aplicação na escola e acompanha quantos estudantes já responderam.

### 6.1 Acompanhar a sua escola

1. Entre no painel (seção [2](#2-entrar-no-painel-todos-os-perfis)). A tela **Minha escola** abre direto.
2. Você vê:
   - **% da meta da escola**, com quantas respostas já chegaram e quantas faltam;
   - **6º ano** e **9º ano**: respostas enviadas por série;
   - **Respondendo agora**: estudantes que começaram e ainda não enviaram;
   - até que dia a coleta fica aberta.
3. Os números se atualizam sozinhos a cada minuto.

Se aparecer "Nenhuma coleta aberta para a sua escola agora", a coleta ainda não começou ou já terminou.

### 6.2 Aplicar a pesquisa em sala

1. No cartão **Link da pesquisa para os estudantes**:
   - clique em **Baixar QR code** para imprimir ou projetar, ou
   - clique em **Copiar link** para enviar aos estudantes.
2. Garanta **um dispositivo com internet por estudante**: celular, tablet ou computador.
3. Oriente cada estudante a ir até a tela **"Obrigado por participar!"**. Só a partir dela a resposta conta.
4. Em um dispositivo compartilhado, o próximo estudante toca em **Nova resposta neste dispositivo** na tela final, antes de começar.
5. **Menores de 12 anos** precisam da autorização do responsável. Recolha os termos assinados antes da aplicação e guarde-os na escola.
6. Se a internet cair, o estudante abre o link de novo **no mesmo aparelho** e toca em **Continuar de onde parei**. Em outro aparelho, a resposta recomeça do zero.

Você vê apenas quantos estudantes responderam. Nomes e respostas são confidenciais, inclusive para a escola.

---

## 7. Pesquisador

O pesquisador analisa os dados, sem acesso a nomes ou contatos.

### 7.1 Acompanhar as campanhas

1. Entre no painel (seção [2](#2-entrar-no-painel-todos-os-perfis)).
2. Em **Campanhas**, clique em **Abrir painel** na campanha desejada.
3. Você vê os indicadores e a tabela de escolas ([4.2](#42-acompanhar-a-coleta-da-rede)) e pode usar **Relatório diário** e **Baixar CSV**.

O link da pesquisa não aparece para o pesquisador.

### 7.2 Exportar as respostas

1. No painel da campanha, clique em **Exportar respostas (pseudonimizadas)**.
2. A plataforma baixa o arquivo `EPF_<campanha>_respostas.json`. Cada linha é a resposta de um estudante a um item.
3. O arquivo tem um código de sessão e a idade informada pelo estudante. Não há e-mail nem telefone.
4. Cada exportação fica registrada em auditoria.

A exportação traz todas as respostas da campanha, inclusive as de coletas grandes, que são baixadas em partes automaticamente.

---

## 8. Estudante: responder o questionário

O estudante não precisa de login, só do link ou do QR code que a escola divulga.

### 8.1 Passo a passo

1. **Abra o link** (ou aponte a câmera para o QR code).
2. **Boas-vindas**: leia a apresentação e toque em **Começar**.
3. **Antes de começar**: leia o texto da Secretaria ("Olá! Queremos te ouvir."). Ele explica que o questionário não é prova, que não há respostas certas ou erradas, que as respostas são confidenciais e que a participação é voluntária.

   Em **Você aceita participar?**, toque em **Sim, aceito participar** ou em **Não quero participar**.
4. **Seus dados**: preencha
   - **Escola** (escolha na lista);
   - **Em que ano você estuda?**;
   - **Sua idade** (em anos completos, só o número; de 9 a 18);
   - **E-mail** e **Telefone**: opcionais, podem ficar em branco.
5. **Menores de 12 anos**: confirme que o pai, a mãe ou o responsável autorizou a participação. Sem essa confirmação não é possível seguir.
6. Toque em **Começar o questionário**.
7. **Responda cada parte**. A barra no topo mostra o progresso.
   - Toque em **Salvar e continuar** ao terminar cada parte. As respostas ficam guardadas a cada parte.
   - **Parte anterior** volta para revisar.
   - Algumas partes aparecem só para o 6º ano ou só para o 9º ano.
8. Na última parte, toque em **Enviar respostas**.
9. A tela **"Obrigado por participar!"** confirma o envio. Pode fechar a página ou entregar o dispositivo ao próximo colega.

### 8.2 Parei no meio. E agora?

- **No mesmo dispositivo**: abra o link de novo e toque em **Continuar de onde parei**.
- **Em outro dispositivo, ou se a sessão expirou**: não é possível continuar a resposta anterior, porque o estudante não é identificado. Toque em **Começar** e responda de novo. Por isso, oriente a turma a terminar no mesmo celular ou computador em que começou.
- **Dispositivo de outro colega**: se aparecer **Continuar de onde parei** e não for você, toque em **Não sou eu: nova resposta**.

### 8.3 Mensagens que o estudante pode ver

| Mensagem | O que significa |
|---|---|
| "A pesquisa ainda não começou." | A janela de coleta ainda não abriu. |
| "A pesquisa está encerrada. Obrigado!" | A janela de coleta terminou. |
| "Esta pesquisa não está aberta agora." | A secretaria ou a Motriz fechou a coleta. |
| "Esta pesquisa é para outros anos escolares." | A série escolhida não participa desta aplicação. |
| "Link de pesquisa não encontrado." | O endereço está errado. Confira com a escola. |
| "Não foi possível salvar. Verifique a internet e tente de novo." | A conexão caiu. As partes já salvas não se perdem. |

---

## 9. Como ler os números do painel

| Termo | Significado |
|---|---|
| **Meta** | 85% das matrículas do 6º e do 9º ano da escola, arredondado. |
| **Resposta válida** | Questionário enviado até o fim ("Obrigado por participar!"). |
| **Em andamento** | Começou e ainda não enviou. Não conta para a meta. |
| **Recusa** | Estudante que tocou em "Não quero participar". |
| **Fora da amostra** | Resposta de escola que não está no plano amostral, ou que foi substituída. Aparece separada e não conta para a meta. |

**Status da escola**

| Status | Quando |
|---|---|
| Não iniciada | Nenhum estudante respondeu ainda. |
| Iniciada | Já tem respostas, mas não atingiu a meta. |
| Concluída | Atingiu a meta. |
| Fora da amostra | A escola saiu do plano amostral (parecer de substituição). |

---

## 10. Privacidade

- As respostas são **pseudonimizadas**: o estudante não informa o nome nem a data de nascimento, só a idade; e-mail e telefone (opcionais) ficam guardados separados das respostas. As telas do painel mostram só contagens, e a exportação usa um código de sessão.
- Escolas, regionais e secretarias **nunca** veem nomes nem respostas individuais.
- Apenas o admin Motriz pode consultar os dados pessoais, e cada consulta é registrada.
- Convites, desativações de acesso e exportações também ficam registrados em auditoria.
- **Pedidos de exclusão de dados** (do estudante ou do responsável) devem ser encaminhados à Motriz.

---

## 11. Problemas comuns

| Situação | O que fazer |
|---|---|
| O código não chegou | Confira a caixa de spam e clique em **Reenviar código**. Use sempre o código mais recente. |
| "Código incorreto ou vencido" | Confira os 6 dígitos ou peça um novo código. O código vale por 1 hora. |
| "Aguarde um minuto antes de pedir outro código" | Por segurança, há um intervalo entre os pedidos. Espere e tente de novo. |
| "Não encontramos um acesso para este e-mail" | Você não foi convidado com esse e-mail. Peça o convite ao gestor da rede ou à Motriz. |
| "Seu acesso ainda não foi liberado ou foi desativado" | Fale com o ponto focal da sua rede ou com a Motriz. |
| Não vejo a campanha da minha rede | A campanha ainda não foi criada, ou o seu perfil é de outra rede. Fale com a Motriz. |
| A escola não aparece na lista do estudante | A escola não está no plano amostral da campanha. Fale com a Motriz. |
| O convite deu "este e-mail já tem acesso ou um convite pendente" | A pessoa já foi convidada. Peça que ela entre pela tela de login. |
| O número do painel não mudou | O painel atualiza a cada minuto. Só entram na meta os questionários enviados até o fim. |

---

*Desenvolvido por Tecnologia Motriz.*
