# Funcionalidades futuras

- Uma pessoa acompanhar aulas com vários professores: cada convite e sessão continuam vinculados ao professor e ao aluno indicados no link. Uma futura troca de contexto deve mostrar somente perfis vinculados por convite e verificação explícita, sem listar cadastros apenas porque compartilham um email.
- Contas para responsáveis com vários alunos: convite próprio, consentimento e permissões por aluno.
- Webhooks do Resend para entrega, rejeições e bounces; hoje o estado enviado significa aceito pelo provedor.
- Agendador mais frequente para retentativas da fila; hoje há cron diário e tentativa manual no painel.

## Administração e planos da plataforma

- Painel de administração do Lessonara para convidar professores, ativar/desativar contas e acompanhar uso e falhas. Papel administrativo separado, verificado no backend e RLS; nunca baseado apenas no email ou em uma flag do navegador. Prioridade para a próxima rodada de trabalho.
- Assinaturas da plataforma separadas dos planos de aulas dos alunos. Cada nível define limites de alunos, armazenamento, envios de email e integrações; as permissões precisam ser aplicadas no servidor, não somente ocultadas na interface.
- Comunicação avançada com opt-in, cotas por professor, proteção antispam e rastreamento de entrega. A tela atual continua como histórico operacional de envios, sem disparos livres em massa.
- Vídeo dentro da plataforma exige infraestrutura e custos próprios. A primeira integração usa Google Calendar/Meet, sem hospedar vídeo no Lessonara.
