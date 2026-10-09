# Tarefas do Lessonara

**Título:** Padronizar a validação de campos nos formulários do Lessonara
Alternativas: Impedir valores incoerentes nos cadastros e agendamentos do Lessonara · Revisar limites e mensagens de validação nos formulários do sistema

~~~markdown
## Contexto
Durante os testes de ponta a ponta, **Gabriel pediu uma revisão completa da validação** dos formulários do Lessonara. A tarefa abrange os portais de professor e aluno, incluindo cadastros, planos, horários, pagamentos, materiais, atividades e configurações.

## Problema
É necessário confirmar que todos os campos recusam dados incoerentes e apresentam mensagens claras. Existem validações específicas, como moeda com teto de `R$ 99.000,00`, quantidade positiva de créditos e limite de upload de `20 MB`, mas ainda falta uma revisão uniforme de todos os formulários.

> **A confirmar:** quais campos ainda aceitam valores indevidos e quais limites de negócio precisam ser definidos.

## Impacto
- Dados inconsistentes podem prejudicar agenda, créditos e comunicação com alunos.
- Mensagens pouco claras dificultam corrigir um preenchimento inválido.
- ⚠️ Não há um incidente comprovado em curso; esta tarefa registra uma melhoria solicitada nos testes.

## O que fazer
1. Inventariar campos obrigatórios e limites já existentes, confirmando o comportamento no navegador e no backend.
2. Definir regras de tamanho, formato, valores máximos e combinações permitidas para cada campo.
3. Recusar entradas inválidas no servidor e no banco quando aplicável, preservando o escopo do professor.
4. Padronizar mensagens, indicação de campos obrigatórios e foco no campo que precisa de correção.
5. Cobrir limites, tentativas de contornar o frontend e casos de concorrência relevantes.

## Critério de aceite
Os formulários recusam dados fora das regras definidas e mostram uma mensagem que permite corrigir o preenchimento. Uma requisição direta ao backend também não consegue gravar os valores inválidos cobertos pela revisão.
~~~

Em editores WYSIWYG, use modo texto ou Markdown para colar a descrição mantendo a formatação.
