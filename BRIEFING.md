# Briefing do Alexbarça

Resultado da entrevista de oito perguntas. Vale junto com o CLAUDE.md; se algo aqui parecer contrariar o CLAUDE.md, o CLAUDE.md vence.

## C — Contexto

- **Nome do app:** Alexbarça.
- **Quem usa:** só eu, no celular e no computador.
- **Onde lanço:** na hora, no celular, logo depois de pagar (no caixa, na rua, no ônibus).
- **De onde venho:** eu anotava os gastos em planilhas. O app substitui a planilha.
- **Sensação ao abrir:** energia de dia de jogo, nas cores do Barcelona: fundo azul-escuro, com o grená em destaque.

## L — Limites

- **No máximo 3 toques** para lançar um gasto: abrir, digitar o valor, escolher a categoria. Pronto.
- **O que mais me faria abandonar o app:** demora para lançar. O app precisa abrir rápido e não pode pedir senha toda vez; a sessão fica lembrada no aparelho.
- **O que o app nunca faz** (as regras do CLAUDE.md, sem acréscimos):
  - nunca pede, guarda ou mostra senha de banco, número de conta ou de cartão;
  - nunca guarda a foto do cupom;
  - nunca envia e-mail ou mensagem;
  - nunca usa dado de outra pessoa.
- Valem também todas as regras técnicas do CLAUDE.md (celular de 390 px primeiro, erros em português dizendo o que fazer, sem chave secreta em arquivo).

## A — Ação

Construir **uma tela só**, de cima para baixo:

1. **O que aparece em cinco segundos:** um número grande com o total gasto no mês até hoje, com o nome do mês ao lado.
2. **Lançamento à mão:** um campo de valor, já pronto para digitar, e os botões das categorias. Tocar na categoria grava o gasto com a data de hoje. Nada de descrição ou data obrigatória.
3. **Lista do mês:** os gastos do mês, do mais recente para o mais antigo, cada um com data, categoria e valor.
4. **Espaço do assistente:** uma área reservada, com o aviso de que chega na sexta. Lá ele vai lançar o gasto a partir de uma frase ou da foto do cupom, sem guardar a foto.

**Categorias, com os meus nomes, nesta ordem:**

1. Contabilidade
2. Convênio
3. DAS
4. Curso de japonês
5. Vivo
6. Outros

## R — Resultado

Ao abrir o Alexbarça, em até cinco segundos, eu respondo à pergunta **"quanto eu já gastei este mês?"** olhando um único número grande no topo da tela, sem rolar e sem tocar em nada.

## O — Observáveis

Cinco testes que provam que o app está pronto:

1. **Cinco segundos:** abro o app no celular, já com a sessão lembrada, e o total do mês aparece no topo, sem pedir senha e sem rolar a tela.
2. **Três toques:** lanço um gasto (abrir, digitar o valor, tocar na categoria) e ele aparece na lista do mês e no total, sem um quarto toque.
3. **Categorias certas:** os botões mostram exatamente Contabilidade, Convênio, DAS, Curso de japonês, Vivo e Outros, nesta ordem.
4. **Cara de Barça em 390 px:** numa tela de 390 px de largura, o fundo é azul-escuro, o grená aparece em destaque, nada fica cortado e não existe rolagem para o lado.
5. **Erro em português e dados protegidos:** sem internet, ao tentar lançar, aparece uma frase em português dizendo o que fazer; e, entrando com outra conta, não aparece nenhum gasto meu.
