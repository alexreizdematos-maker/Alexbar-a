# Conferência do briefing: Alexbarça

| Teste do briefing | Veredito | Motivo |
|---|---|---|
| 1. Cinco segundos: total do mês no topo, sessão lembrada, sem senha e sem rolar | SÓ DÁ PARA SABER ABRINDO O APP | O código ajuda: `app/app.js` liga `persistSession: true`, e em `app/index.html` o total vem logo depois do título "Alexbarça". Mas a rapidez, a sessão lembrada e a ausência de rolagem em 390 px dependem da tela e da internet. |
| 2. Três toques: abrir, digitar o valor, tocar na categoria, e o gasto aparece na lista e no total | NÃO CUMPRE | Em `app/index.html` e `app/app.js`, tocar na categoria só a seleciona (`escolherCategoria`). O gasto só é gravado ao tocar em "Lançar", que é um quarto toque. O campo de valor também não vem pronto para digitar: não há `autofocus` nem foco automático ao abrir. |
| 3. Categorias certas: Contabilidade, Convênio, DAS, Curso de japonês, Vivo e Outros, nesta ordem | CUMPRE | Os botões são criados a partir de `CATEGORIAS` em `app/configuracao.js`, na ordem do briefing (`montarCategorias` em `app/app.js`). |
| 4. Cara de Barça em 390 px: fundo azul-escuro, grená em destaque, nada cortado, sem rolagem para o lado | SÓ DÁ PARA SABER ABRINDO O APP | `app/estilo.css` tem o fundo azul-escuro (`#0b1638`) e o grená (`#a50044`) nos botões, no total e na categoria escolhida, e usa `box-sizing: border-box` com `max-width: 480px`. Mas só a tela de verdade mostra se algo é cortado ou se há rolagem para o lado. |
| 5. Erro em português e dados protegidos: sem internet aparece frase em português, e outra conta não vê meus gastos | SÓ DÁ PARA SABER ABRINDO O APP | O erro sem internet existe em `traduzirErro` (`app/app.js`): "Sem internet. Confira a conexão e tente de novo." A leitura filtra por `dono` (`.eq("dono", usuario.id)`), mas o isolamento entre contas depende da proteção por linha no banco, que não aparece no código lido. |

**Categorias:** iguais ao briefing (mesmos nomes, mesma ordem, em `app/configuracao.js`).

## O que falta

- Fazer o gasto ser gravado ao tocar na categoria, com a data de hoje, sem o botão "Lançar" (teste 2). Isso só vale se o valor já estiver digitado.
- Deixar o campo de valor já pronto para digitar ao abrir o app (teste 2).
- Abrir o app num celular de 390 px, com a sessão já lembrada, para conferir os testes 1 e 4: total visível sem rolar e nada cortado.
- Testar sem internet e entrando com outra conta, para fechar o teste 5.
- Nome do app: o briefing diz "Alexbarça" e o app usa "Alexbarça". O `CLAUDE.md` chama o projeto de "Meu Bolso". Pelo CLAUDE.md, o nome pode precisar ser revisto. Vale decidir qual nome fica.
- O briefing previa só uma área reservada para o assistente ("chega na sexta"). O app já traz o assistente funcionando (frase e foto), o que vai além do briefing e é coerente com o CLAUDE.md.
