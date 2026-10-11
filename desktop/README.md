# Lessonara desktop 0.1.0 — teste

Mac Apple Silicon, Electron 44.7.0. Esta versão abre o produto e a sala atuais numa janela própria. Não implementa anotação sobre outros aplicativos.

- `npm ci` instala dependências de desenvolvimento.
- `npm test` valida links e isolamento de navegação.
- `npm run package:mac` gera `out/Lessonara-darwin-arm64/Lessonara.app`.
- A distribuição inicial usa assinatura ad-hoc local. Não há notarização Apple nem atualização automática.

Abra o app uma vez, faça login com sua conta de professor Pro e escolha Abrir no app no site. A sessão é persistente e separada do Chrome. Links não contêm senha/JWT. Destino fica restrito ao Lessonara e referências de aula validadas. Câmera/microfone requerem consentimento; compartilhamento usa o seletor do macOS. Mudança de sala pede confirmação e nunca ocorre pelo relógio. Integrações Google ficam no navegador neste teste.

Renderer: sandbox, isolamento de contexto e Node desativado. A ponte expõe somente a versão do app. Nenhuma chave administrativa é embutida.
