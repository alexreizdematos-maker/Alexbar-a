# Revisão de celular (390 px) do Meu Bolso

| Item | O que está errado | Onde | Gravidade | Correção em uma frase |
|---|---|---|---|---|
| 1. Alvo de toque: botão "Sair" | Tem 40 px de altura, abaixo dos 44 px. Fica no canto do topo e é fácil errar o toque. | `estilo.css`, `.botao.pequeno` (`min-height: 40px`) | MÉDIA | Troque para `min-height: 44px` e `min-width: 44px`. |
| 1. Alvo de toque: "Onde ou com o quê, e data" | O título que abre e fecha essa seção tem 40 px de altura. | `estilo.css`, `.mais summary` (`min-height: 40px`) | MÉDIA | Troque para `min-height: 44px`. |
| 1. Alvo de toque: demais controles | nada. Campos, "Entrar", "Criar conta", "Lançar", "Enviar", "Foto do cupom" e as categorias têm 48 px. O "Apagar" tem 44 px. | `estilo.css`, `input`, `.botao`, `.categoria`, `.item-apagar` | BAIXA | nada |
| 2. Tamanho do texto: lista | O detalhe de cada gasto (data e categoria) e o texto do "Apagar" têm 0,85 rem, ou 13,6 px, abaixo de 14 px. | `estilo.css`, `.item-detalhe` e `.item-apagar` | MÉDIA | Suba os dois para `0.9rem` (14,4 px) ou mais. |
| 2. Tamanho do texto: campos | nada. Todos os campos usam 16 px, e o valor usa 1,6 rem. O iPhone não dá zoom sozinho. | `estilo.css`, `input` | BAIXA | nada |
| 3. Rolagem para o lado | nada. A tela tem `max-width: 480px`, e `box-sizing: border-box` vale para tudo. O título do gasto corta com reticências, o total quebra a linha (`word-break`), e `.item-info` tem `min-width: 0`. | `estilo.css`, `.tela`, `.item-titulo`, `.total-valor` | BAIXA | nada |
| 4. Lista vazia | A frase "Nenhum gasto lançado neste mês." aparece quando não há gastos. Mas, se o carregamento falhar, a frase aparece junto da mensagem de erro e diz que não há gastos, o que pode não ser verdade. Enquanto carrega, a seção fica em branco. | `app.js`, `carregarGastos` e `desenharLista`; `index.html`, `#lista-vazia` | MÉDIA | Mostre "Carregando seus gastos…" no início e esconda a frase de lista vazia quando houver erro. |
| 5. Erros: tradução | nada. Cada erro vira uma frase em português com o que fazer, e o caso sem internet também. | `app.js`, `traduzirErro` | BAIXA | nada |
| 5. Erros: abertura do app | Se o app não abrir por falta do cliente do Supabase ou da configuração, a frase de erro aparece. Mas, se qualquer outra coisa falhar dentro de `iniciar()`, a tela fica em "Abrindo o Alexbarça…" para sempre. Também não há limite de tempo caso a sessão nunca responda. | `app.js`, `iniciar()` e `aplicarSessao` | MÉDIA | Envolva `iniciar()` num `try/catch` que troque o texto por "Não foi possível abrir o app. Recarregue a página." |
| 5. Erros: mensagens longe do botão | O aviso do assistente fica abaixo dos botões e o do lançamento fica abaixo de "Lançar". Em tela pequena com teclado aberto, o aviso pode ficar escondido. | `index.html`, `#msg-assistente` e `#msg-gasto` | BAIXA | Chame `scrollIntoView({block:"nearest"})` no aviso quando ele aparecer. |
| 6. Teclado numérico | nada. O campo de valor tem `inputmode="decimal"`. | `index.html`, `#valor` | BAIXA | nada |
| 7. Contraste: texto principal | nada. O texto claro sobre o azul-escuro e sobre o grená passa com folga, inclusive no total, que tem metade azul e metade grená. | `estilo.css`, `.total`, `.botao.principal` | BAIXA | nada |
| 7. Contraste: textos pequenos e cinza | O texto cinza-azulado `--texto-suave` aparece em tamanho pequeno (rótulos, detalhe do gasto). Os exemplos dentro dos campos ("Ex.: paguei a Vivo hoje", "0,00") usam a cor padrão do navegador, cinza e fraca sobre o fundo escuro, e podem sumir. A borda azul do botão "Foto do cupom" quase não se destaca do cartão. | `estilo.css`, `label`, `.item-detalhe`, `input`, `.botao.secundario` | MÉDIA | Defina `input::placeholder { color: #8f9bc0; }` e use uma borda mais clara no botão secundário. |
| 8. Foco visível: campos | nada. Os campos têm contorno amarelo no foco. | `estilo.css`, `input:focus` | BAIXA | nada |
| 8. Foco visível: botões e título que abre a seção | Botões, categorias, "Apagar" e o título que abre e fecha a seção não têm estilo de foco próprio. Eles dependem do contorno padrão do navegador, que pode quase sumir sobre o fundo azul-escuro e o grená. Não há `outline: none` escondendo o foco. | `estilo.css`, `.botao`, `.categoria`, `.item-apagar`, `.mais summary` | MÉDIA | Adicione `button:focus-visible, summary:focus-visible { outline: 3px solid var(--amarelo); outline-offset: 2px; }`. |

## Os três que mais atrapalham

1. **Foco dos botões e categorias:** quem navega pelo teclado pode não ver qual botão está selecionado, porque só os campos têm contorno amarelo.
2. **Tela presa em "Abrindo o Alexbarça…" e lista vazia enganosa:** um erro inesperado na abertura deixa a tela travada. Se os gastos não carregarem, o app diz "Nenhum gasto lançado" junto do erro.
3. **Alvos e textos pequenos:** "Sair" e o título da seção "Onde ou com o quê, e data" têm 40 px de altura. O detalhe do gasto e o "Apagar" têm 13,6 px. Os exemplos cinza dentro dos campos podem sumir.
