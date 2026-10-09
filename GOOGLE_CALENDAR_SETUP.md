# Conectar Google Calendar e Meet ao Lessonara

A integração foi preparada no backend, por professor. Ela usa a agenda principal, duração definida em cada agendamento e o fuso de São Paulo. Tokens são criptografados no banco e nunca enviados ao navegador.

1. No Google Cloud Console, crie ou selecione um projeto e habilite a **Google Calendar API**.
2. Em Google Auth Platform, configure a marca do aplicativo e o público. Durante os testes, adicione seu email à lista de usuários de teste.
3. Em Acesso a dados, inclua os escopos `https://www.googleapis.com/auth/calendar.events` e `https://www.googleapis.com/auth/calendar.freebusy`.
4. Crie um cliente OAuth do tipo **Aplicativo da Web**. Cadastre exatamente estas URIs de redirecionamento:
   - Produção: `https://lessonara.mosaic-labs.co/integrations/google/callback`
   - Desenvolvimento, se for testar localmente: `http://localhost:3001/integrations/google/callback`
5. Guarde `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` como variáveis do servidor na Vercel e no `.env.local`. Não use prefixo `NEXT_PUBLIC_` e não envie o segredo pelo chat. `APP_URL` deve apontar para o ambiente correto.
6. Depois de publicar essas variáveis, entre no Lessonara como professor e abra **Configurações → Integrações → Conectar Google**. Escolha a conta e confirme as permissões no Google.
7. Use **Importar aulas existentes** / **Processar pendências** para importar os agendamentos existentes. O processamento é feito em lotes; repetir o botão processa as pendências sem duplicar eventos já sincronizados. Novos agendamentos são enviados após a resposta do app.
8. Confirme a criação de um evento com Meet e teste um horário ocupado. A mini agenda mostra nomes das aulas do Lessonara; compromissos pessoais do Google aparecem apenas como ocupado.

## Comportamento e operação

- Eventos e links Meet são vinculados ao professor que conectou a conta. O aluno vê o link na próxima aula e nas listas de aulas.
- Dias fixos semanais e mensais usam eventos recorrentes. Dias que não existem em um mês não geram ocorrência. Aulas avulsas e reposições usam eventos individuais.
- Desmarcações e feriados cadastrados são excluídos das recorrências sincronizadas.
- A fila tem lease, versão, id estável no Google e até cinco tentativas. Isso evita duplicação e protege alterações feitas enquanto uma sincronização está em andamento.
- O cron protegido `/api/cron/emails` também processa a agenda. Para retentativas frequentes sem interação, configure um agendador autorizado para chamá-lo com `Authorization: Bearer <CRON_SECRET>`; o cron diário atual não é uma garantia de retentativa em minutos.
- Desconectar revoga os tokens e para futuras sincronizações. Eventos já criados permanecem no Google; não são apagados por uma desconexão.
- A consulta de disponibilidade descreve o estado no momento da leitura; alterações feitas diretamente no Google continuam sob controle da conta conectada.
- Em produção, conclua os requisitos de publicação/verificação do OAuth no Google antes de abrir a integração a todos os professores. O Google pode limitar autorizações e validade de tokens no modo de teste.

Documentação oficial: [OAuth para aplicações web](https://developers.google.com/identity/protocols/oauth2/web-server), [criação de eventos e conferências](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert), [consulta de disponibilidade](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query).

A importação exige confirmação: cria eventos reais e pode enviar convites aos alunos. Eventos recorrentes compartilham um link Meet; aulas avulsas e reposições têm eventos separados. O botão não aparece habilitado quando a fila e a importação não têm pendências.
