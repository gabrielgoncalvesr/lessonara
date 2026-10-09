# Lessonara

Controle de aulas e pacotes para professores particulares. A professora cadastra alunos, horário fixo e pagamentos; cada aluno recebe um link para acompanhar as próprias aulas.

## Regras

- **Planos**: cada professor cria os seus (pacote de N aulas por um preço). Conta nova já vem com "1x por semana" (4 aulas, R$300) e "2x por semana" (8 aulas, R$500). Valor pode ter override por aluno.
- **Pacote**: vale até ser usado; guarda aulas e valor do momento do pagamento.
- **Agenda fixa**: aulas são geradas a partir do horário semanal. Aula que já passou conta como dada.
- **Falta**: aviso em cima da hora ou não compareceu. Conta como aula.
- **Desmarcada**: aviso com antecedência ou professora cancelou. Não conta.
- **Reposição**: aula extra lançada manualmente. Conta.
- **Lembrete**: email diário para aluno ativo com ≤ 1 aula restante, uma vez por pacote.

- **Materiais**: um arquivo privado na biblioteca pode ser compartilhado com vários alunos, com prazo individual ou acesso sem prazo. A validade inclui o dia escolhido, no fuso de São Paulo.

Lógica do saldo em `src/lib/ledger.ts` (testes: `pnpm test`).

## Setup

### 1. Supabase

1. Crie um projeto em supabase.com (free).
2. SQL Editor → cole e rode `supabase/migrations/0001_init.sql`.
3. Para a biblioteca, rode também `supabase/migrations/0003_documents.sql`. Ela cria o bucket privado, as tabelas, as políticas de acesso e a reserva de espaço.
4. Authentication → Sign In / Providers → desligue **Allow new users to sign up** (só você cria contas).
5. Authentication → Users → **Add user** com email e senha da professora (marque auto-confirm).
6. Project Settings → API Keys: copie a publishable key e a secret key.

### 2. Resend (emails)

1. Crie conta em resend.com (free: 100 emails/dia).
2. Sem domínio verificado, o Resend só envia para o seu próprio email. Para mandar aos alunos, verifique um domínio (Domains → Add).
3. Copie a API key.

### 3. Vercel

1. Suba o repositório no GitHub e importe na Vercel.
2. Configure as variáveis de `.env.example`.
3. O cron em `vercel.json` chama `/api/cron/reminders` todo dia às 9h (12h UTC). A Vercel envia `CRON_SECRET` automaticamente no header.

### Local

```bash
cp .env.example .env.local   # preencha
pnpm install
pnpm dev
```

Testar o cron local:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

## Rotas

| Rota | Quem |
|---|---|
| `/login` | professora |
| `/` | calendário e aulas do dia |
| `/students` | lista de alunos |
| `/payments` | renovação e cobranças |
| `/finance` | entradas e evolução dos recebimentos |
| `/documents` | biblioteca privada de materiais |
| `/students/[id]` | agenda, pacotes, falta/desmarcada/reposição |
| `/settings` | nome e preços padrão |
| `/a/[slug]` | redirecionamento legado, com sessão e vínculo obrigatórios |
| `/api/cron/reminders` | cron diário |

## Biblioteca de materiais

Envie pela aba Documentos e compartilhe no perfil do aluno. O portal autenticado oferece uma aba Materiais com os arquivos liberados. Cada aluno tem sua própria validade; compartilhar de novo atualiza o prazo sem duplicar o arquivo.

O upload vai diretamente do navegador ao Supabase com uma autorização temporária; o arquivo não atravessa uma Server Action da Vercel. O limite é 20 MB por arquivo e a biblioteca reserva até 1 GB por professora, incluindo envios incompletos. A cota do plano Supabase é compartilhada pelo projeto. Remova envios incompletos para liberar a reserva.

Downloads exigem uma sessão da professora ou uma sessão do aluno vinculada ao perfil e um compartilhamento válido. O bucket é privado e as URLs assinadas duram no máximo 60 segundos. Excluir um documento remove todos os compartilhamentos; encerrar um acesso individual mantém o arquivo e os demais alunos. Um arquivo já baixado não pode ser revogado.

## Feriados e contatos

Rode `supabase/migrations/0004_holidays.sql` e `0005_student_phone.sql` para habilitar a configuração de feriados por professora e o telefone dos alunos. Em Configurações, ative a regra e escolha entre consumir a aula do pacote ou manter o crédito para o próximo encontro. A regra vale para todos os alunos da conta e passa a valer a partir do dia seguinte à ativação. Datas são cadastradas manualmente, sempre a partir de amanhã.

A regra fica travada após o início da primeira aula que ela afetar, no fuso de São Paulo. O banco preserva o travamento mesmo se esse aluno ou horário for removido. Feriados de hoje ou anteriores ficam imutáveis. Antes da primeira aula, mudanças em datas, horários e exceções recalculam o momento de travamento. Desmarcações/faltas explícitas mantêm seu significado; reposições consomem crédito normalmente, inclusive em feriados.

Os cadastros guardam telefone/WhatsApp opcional; a cobrança usa esse número como sugestão e permite alterá-lo antes de abrir a conversa. O site envia `noindex, nofollow` no HTML e no cabeçalho HTTP de todas as rotas.

## Atividades e entregas

Rode `supabase/migrations/0006_activities.sql` para criar atividades, entregas e o bucket privado de devoluções. A professora envia pela aba Atividades ou pelo perfil do aluno, usando um arquivo da biblioteca ou somente instruções. O aluno recebe uma aba Atividades no seu link e pode devolver um arquivo de até 20 MB, com observações opcionais.

Cada atividade aceita uma entrega concluída. Envios interrompidos podem ser descartados para tentar novamente. As datas de envio, entrega e conferência ficam registradas; o prazo inclui o dia escolhido no fuso de São Paulo. Entregas posteriores continuam permitidas e são sinalizadas. A professora registra comentários e marca como conferida; o aluno acompanha o retorno no mesmo local.

Arquivar interrompe novas entregas e preserva a atividade. Remover o arquivo de uma entrega concluída libera espaço, mantendo datas e comentários. A biblioteca e as entregas compartilham a reserva de 1 GB por professora. A cota gratuita do provedor é compartilhada por todo o projeto. Os uploads passam diretamente pelo Storage com autorização temporária; nenhuma credencial administrativa vai ao navegador.


## Acesso autenticado do aluno e emails centralizados

A implementação nova substitui o link público como credencial. `/student` é a entrada estável: o aluno solicita um código numérico de seis a oito dígitos por email e entra sem depender da professora. Os links antigos `/a/[slug]` só redirecionam depois de verificar a sessão e o vínculo. O portal canônico fica em `/student/portal/[id]`; esse identificador não concede acesso por si só.

O Supabase Auth gera e verifica os códigos. O servidor cria novos usuários com `app_metadata.role=student`; a migration impede a criação automática de perfis de professora para esses usuários e impede que eles insiram um perfil de professora pela API. A sessão da professora continua independente. Tokens de Auth do aluno não são entregues ao navegador: após a confirmação, o app registra uma sessão opaca e seus vínculos no banco, com cookie HttpOnly, Secure em produção e SameSite=Lax.

A sessão vence **30 dias após o login**, sem renovação silenciosa. Há saída explícita e revogação ao mudar email, desativar cadastro ou regenerar seu identificador. Cada leitura, download e entrega verifica a sessão, o email atual e a versão do vínculo. Quando um email é compartilhado entre cadastros, o aluno escolhe um perfil após verificar o código. Cada sessão fica vinculada somente ao perfil escolhido; o identificador de outro perfil não permite acessá-lo. Para trocar de perfil, saia e solicite um novo código.

### Preparar antes de publicar

1. Verifique um domínio com acesso ao DNS no Resend. `onboarding@resend.dev` só permite teste para o email da própria conta; não use esse modo para autenticação de alunos reais. Uma caixa postal paga não é necessária para o envio transacional.
2. Configure `EMAIL_FROM` nesse domínio, `RESEND_API_KEY` e `APP_URL` canônica. Configure `EMAIL_ENCRYPTION_KEY` com 32 bytes em hexadecimal (`openssl rand -hex 32`), apenas no servidor/Vercel. Ela protege os códigos e corpos em fila; não use prefixo `NEXT_PUBLIC_` e não registre o valor em logs. Uma chave foi criada somente em `.env.local` durante o desenvolvimento.
3. Rode `0007_student_access_email.sql` depois das migrations existentes e antes de publicar este código. O código e a migration devem ser liberados juntos. Não abra cadastro público no Supabase. Códigos são verificados como tipo `email`; o formulário aceita códigos de seis a oito dígitos. O app impõe prazo de dez minutos mesmo se a validade do provedor for maior.
4. Atualize os emails dos alunos existentes pela professora. Cadastros antigos sem email são preservados, mas não podem acessar o novo portal. Novos cadastros e alterações exigem email válido; não preencha endereços fictícios. A migração não dispara convites para cadastros antigos: use a tela Emails para enviá-los quando estiverem revisados.
5. Faça um teste controlado ponta a ponta: boas-vindas, código recebido, login, materiais, envio de atividade, logout, código repetido/vencido, troca de email e acesso cruzado. A preparação local usa testes e PostgreSQL isolado; o envio real e a configuração do Supabase publicado continuam pendentes até essa etapa.

### Módulo de email

`src/lib/mail` contém templates, criptografia e outbox; `src/lib/email.ts` é o único adaptador do Resend. Boas-vindas são enfileiradas pelo mesmo commit do cadastro no PostgreSQL. Lembretes usam uma chave única por aluno/pacote; OTPs usam uma chave por desafio. A fila tem lease para concorrência, backoff, até cinco tentativas, chave de idempotência do Resend e registro de falhas sem códigos ou conteúdo sensível. Payloads são descartados depois do envio, cancelamento ou falha final. O estado `sent` significa aceito pelo provedor, não confirmação de entrega: bounces/webhooks de entrega ainda não fazem parte desta implementação.

O pedido de OTP dispara a geração e envio em `after()` imediatamente após responder, evitando que o tempo de resposta revele cadastros. Cadastros executam o worker em `after()` e a tela Emails permite processar pendências. O cron diário de lembretes também processa a fila e limpa sessões/desafios expirados. `/api/cron/emails` fornece o mesmo worker, protegido por `CRON_SECRET`, para um agendador autorizado mais frequente. O cron diário existente não garante retry em minutos: configure chamadas regulares (por exemplo, a cada minuto) antes de depender de retry rápido sem interação. Não foi contratado nem configurado um agendador externo durante esta mudança.

Retries preservam o mesmo corpo e remetente. Como a idempotência do Resend vale 24 horas, uma tentativa sem confirmação não é reenviada automaticamente depois de 23 horas; fica com falha para revisão. Emails OTP vencidos, consumidos ou substituídos não são enviados; não reenvie corpos antigos manualmente. Para corrigir um envio de boas-vindas que falhou, revise a configuração e envie um novo convite pela tela Emails.

### Limites e privacidade

Desafios aceitam cinco tentativas e duram dez minutos. Reenvio tem intervalo mínimo de um minuto, limite de cinco pedidos por email/hora, vinte por IP/hora e cem globais/hora. Os contadores persistem no banco e usam HMAC de email/IP, sem armazenar o IP original. A resposta pública não informa se o email existe. Na Vercel, somente o header de IP fornecido pelo proxy é utilizado; localmente há um bucket compartilhado. Esse controle não substitui a proteção da borda contra ataques distribuídos.

Arquivos continuam em buckets privados e usam URLs assinadas curtas. Links já assinados ou arquivos já baixados não são revogados retroativamente. Analytics e Speed Insights não são montados nas rotas do aluno para não encaminhar identificadores do portal a esses serviços.


## Frequência semanal e telefones internacionais

`0008_frequency_international_phone.sql` adiciona `plans.weekly_lessons`, o ajuste opcional `students.weekly_lessons` e `students.phone_country`. A frequência define a quantidade de horários recorrentes e não depende do último pacote pago. Pacotes continuam guardando quantidade de créditos e valor no momento do pagamento. Ao escolher um plano no formulário, a frequência padrão é preenchida e pode ser ajustada para aquele aluno.

Na migração, a regra antiga é convertida uma única vez para os planos existentes (4 aulas → 1/semana; 8 → 2/semana). Depois disso, a frequência é uma configuração explícita. Alunos antigos sem ajuste herdam o plano; novos cadastros/edições salvam a quantidade escolhida. O banco serializa a inclusão de horários por aluno e rejeita sobreposições que excedam a frequência, inclusive horários futuros. Diminuir a frequência não apaga horários existentes: encerre os excedentes antes de cadastrar outros.

O campo de telefone é compartilhado entre cadastro e diálogo do WhatsApp, com país, bandeira, DDI e formatação nacional. Novas gravações salvam o número no padrão E.164 (`+` e DDI) e o país ISO de duas letras. A biblioteca `libphonenumber-js` valida as regras internacionais; colar um número com `+DDI` reconhece o país. Números antigos são preservados e normalizados ao editar. Telefone continua opcional; o país escolhido é salvo mesmo sem número. O diálogo de cobrança só altera o destinatário da conversa; para atualizar o contato permanentemente, salve no cadastro do aluno.

As migrations 0008 e 0007 foram aplicadas no banco publicado em 2026-10-08 e 2026-10-09, respectivamente. O bootstrap suporta ambas as ordens de aplicação.

## Idioma, aparência e ações

Configurações oferece português brasileiro (padrão), inglês, espanhol e francês; as telas de login também oferecem essa escolha. Preferências são guardadas em cookies do navegador, sem idioma na URL. Os temas claro, escuro e do sistema usam a mesma preferência local. Datas são apresentadas no idioma escolhido, preservando o fuso de São Paulo e valores em reais.

Rotas canônicas usam inglês; as URLs antigas em português redirecionam. O seletor de países mostra uma lista curta de países frequentes e pesquisa nomes traduzidos, com rolagem limitada. Ações de gravação desabilitam seus botões e mostram um indicador enquanto aguardam o servidor.
