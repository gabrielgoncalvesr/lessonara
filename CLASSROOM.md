# Sala de aula do Lessonara

A sala usa o Jitsi já instalado em meet.mosaic-labs.co. A autenticação de teste em aula.mosaic-labs.co permanece separada; o Lessonara valida sua própria sessão de professor ou de aluno.

## Acesso

- Aluno entra pelo código enviado ao email no portal. Não há nova senha de sala.
- Professor usa o login do Lessonara e entra como moderador; o aluno entra como membro.
- O backend verifica aluno ativo, professor proprietário ou vínculo válido da sessão do aluno e a ocorrência real da agenda, incluindo cancelamentos, faltas e feriados.
- Janela de entrada: 15 minutos antes do início até 30 minutos depois do fim, considerando a duração persistida da aula e São Paulo.
- A sala aberta nunca troca automaticamente para outra aula. Professor e aluno saem e entram em outro encontro manualmente.

## Identidade e tokens

As aulas virtuais carregam sourceKind/sourceId/date. A URL /classroom/<student>/<sourceKind>/<sourceId>/<date> identifica a ocorrência, mas não autoriza ninguém sozinha. O POST /join confere a sessão e a origem da requisição antes de emitir o JWT.

A identidade opaca da sala é um HMAC de versão, aluno, origem e data, usando a chave de assinatura do Jitsi. A sala é a mesma ao recarregar e distinta por ocorrência, sem duplicar a agenda em outra tabela. Rotacionar a chave também muda as identidades das salas.

O JWT vale apenas nessa sala e expira no fim da janela de entrada. Não troca uma chamada em andamento quando o horário termina; uma nova entrada ou reconexão depois da janela é bloqueada. A chave de assinatura fica exclusivamente no servidor; não usa NEXT_PUBLIC_. Tokens e sala não recebem Analytics ou Speed Insights do Lessonara, e o endpoint usa no-store.

## Configuração

JITSI_URL, JITSI_APP_ID e JITSI_APP_SECRET devem ser definidos em Production no Vercel. O emissor e a chave precisam coincidir com os configurados no Prosody. Valores não são documentados nem commitados.

Sem as três variáveis válidas, o portal conserva seu link Google Meet existente. Com a sala configurada, Entrar na aula abre o Jitsi dentro do Lessonara. O professor também tem entrada no perfil do aluno e no resumo do dia do calendário. A integração Google e seus eventos existentes continuam disponíveis.

## Vídeo e quadro

Usa external_api.js do Jitsi próprio, com pré-entrada para dispositivos, microfone e câmera inicialmente desligados, compartilhamento de tela e o quadro/anotações já instalados na PoC. Não há gravação nem transcrição. Quadro e anotações não são salvos como material permanente.

A mídia depende da rede: o túnel Cloudflare transporta o acesso web, não a mídia UDP. O 1:1 pode usar P2P; o fallback por JVB/TURN precisa de conectividade apropriada. A verificação de protocolo confirma autenticação e papéis, mas não substitui teste de câmera e áudio reais entre duas redes.

## Validação

Testes de unidade cobrem janela, ocorrência, identidade da sala, papéis, aula atual e bloqueios. A QA HTTP usa contas temporárias isoladas, com sessões reais de professor/aluno, e remove esses registros ao terminar. A QA XMPP usa tokens emitidos pelo endpoint do Lessonara contra o Prosody real.
