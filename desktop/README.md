# Lessonara Chamadas 0.2.0 — teste para Mac

O aplicativo contém login, lista de chamadas e sala. O portal e suas configurações abrem no navegador. Links lessonara:// identificam uma ocorrência, sem senha/JWT. A sessão permanece separada do navegador. Mudanças de sala exigem confirmação.

Compartilhamento usa desktopCapturer e um seletor explícito com miniaturas de telas e janelas; nunca escolhe uma fonte automaticamente. A autorização de gravação de tela do macOS continua necessária. Uma captura corresponde ao monitor ou janela selecionada; múltiplos monitores aparecem como escolhas separadas.

Minimizar durante uma chamada ativa reduz a mesma janela e mantém a mesma conexão em primeiro plano. Voltar à sala ou clicar no ícone do Dock restaura o tamanho anterior. A grade de participantes usa o comando setTileView do Jitsi.

Caneta, laser e texto desenham numa janela transparente sobre o monitor compartilhado, inclusive com a sala reduzida. São controles do professor. Esc ou × desativa a ferramenta e devolve cliques ao aplicativo embaixo. Limpar remove os desenhos. Parar o compartilhamento, trocar de sala ou sair limpa e fecha a sobreposição. Não depende do transporte do quadro/PDF. A captura de uma janela isolada não inclui outras janelas: por isso a anotação externa só fica disponível em Tela inteira.

`npm ci`, `npm test`, `npm run package:mac`. App para Apple Silicon com assinatura ad-hoc de teste, sem notarização Apple nem atualização automática. Sandbox e isolamento de contexto habilitados; IPC com remetente, quadro principal e argumentos validados. O seletor e a sobreposição são páginas locais com CSP e pontes específicas. Nenhuma chave administrativa é embutida.
