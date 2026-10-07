# Lessonara

Controle de aulas e pacotes para professores particulares. A professora cadastra alunos, horário fixo e pagamentos; cada aluno recebe um link para acompanhar as próprias aulas.

## Regras

- **Pacote**: 4 aulas (1x/semana) ou 8 aulas (2x/semana). Vale até ser usado. Valor padrão em Configurações, com override por aluno.
- **Agenda fixa**: aulas são geradas a partir do horário semanal. Aula que já passou conta como dada.
- **Falta**: aviso em cima da hora ou não compareceu. Conta como aula.
- **Desmarcada**: aviso com antecedência ou professora cancelou. Não conta.
- **Reposição**: aula extra lançada manualmente. Conta.
- **Lembrete**: email diário para aluno ativo com ≤ 1 aula restante, uma vez por pacote.

Lógica do saldo em `src/lib/ledger.ts` (testes: `pnpm test`).

## Setup

### 1. Supabase

1. Crie um projeto em supabase.com (free).
2. SQL Editor → cole e rode `supabase/migrations/0001_init.sql`.
3. Authentication → Sign In / Providers → desligue **Allow new users to sign up** (só você cria contas).
4. Authentication → Users → **Add user** com email e senha da professora (marque auto-confirm).
5. Project Settings → API Keys: copie a publishable key e a secret key.

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
| `/` | lista de alunos e saldo |
| `/alunos/[id]` | agenda, pacotes, falta/desmarcada/reposição |
| `/config` | nome e preços padrão |
| `/a/[slug]` | página pública do aluno (link aleatório, sem login) |
| `/api/cron/lembretes` | cron diário |
