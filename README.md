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
3. O cron em `vercel.json` chama `/api/cron/lembretes` todo dia às 9h (12h UTC). A Vercel envia `CRON_SECRET` automaticamente no header.

### Local

```bash
cp .env.example .env.local   # preencha
pnpm install
pnpm dev
```

Testar o cron local:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/lembretes
```

## Rotas

| Rota | Quem |
|---|---|
| `/login` | professora |
| `/` | calendário e aulas do dia |
| `/alunos` | lista de alunos |
| `/pagamentos` | renovação e cobranças |
| `/financeiro` | entradas e evolução dos recebimentos |
| `/documentos` | biblioteca privada de materiais |
| `/alunos/[id]` | agenda, pacotes, falta/desmarcada/reposição |
| `/config` | nome e preços padrão |
| `/a/[slug]` | página pública do aluno (link aleatório, sem login) |
| `/api/cron/lembretes` | cron diário |

## Biblioteca de materiais

Envie pela aba Documentos e compartilhe no perfil do aluno. O link público oferece uma aba Materiais com os arquivos liberados. Cada aluno tem sua própria validade; compartilhar de novo atualiza o prazo sem duplicar o arquivo.

O upload vai diretamente do navegador ao Supabase com uma autorização temporária; o arquivo não atravessa uma Server Action da Vercel. O limite é 20 MB por arquivo e a biblioteca reserva até 1 GB por professora, incluindo envios incompletos. A cota do plano Supabase é compartilhada pelo projeto. Remova envios incompletos para liberar a reserva.

Downloads exigem uma sessão da professora ou o link aleatório do aluno com um compartilhamento válido. O bucket é privado e as URLs assinadas duram no máximo 60 segundos. Excluir um documento remove todos os compartilhamentos; encerrar um acesso individual mantém o arquivo e os demais alunos. Um arquivo já baixado não pode ser revogado.

## Feriados e contatos

Rode `supabase/migrations/0004_holidays.sql` e `0005_student_phone.sql` para habilitar a configuração de feriados por professora e o telefone dos alunos. Em Configurações, ative a regra e escolha entre consumir a aula do pacote ou manter o crédito para o próximo encontro. A regra vale para todos os alunos da conta e passa a valer a partir do dia seguinte à ativação. Datas são cadastradas manualmente, sempre a partir de amanhã.

A regra fica travada após o início da primeira aula que ela afetar, no fuso de São Paulo. O banco preserva o travamento mesmo se esse aluno ou horário for removido. Feriados de hoje ou anteriores ficam imutáveis. Antes da primeira aula, mudanças em datas, horários e exceções recalculam o momento de travamento. Desmarcações/faltas explícitas mantêm seu significado; reposições consomem crédito normalmente, inclusive em feriados.

Os cadastros guardam telefone/WhatsApp opcional; a cobrança usa esse número como sugestão e permite alterá-lo antes de abrir a conversa. O site envia `noindex, nofollow` no HTML e no cabeçalho HTTP de todas as rotas.
