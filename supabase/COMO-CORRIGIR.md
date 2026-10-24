# Como liberar o banco do Alexbarça

O Supabase está bloqueando as tabelas `gastos` e `resumos` para todo mundo.
Estes passos liberam as duas só para quem está logado. A proteção por linha
continua: cada pessoa só vê os próprios gastos.

## Passo a passo

1. Abra **supabase.com** no computador e entre na sua conta.
2. Toque no projeto do Alexbarça (o endereço dele começa com `blnosohzpctzreweemvr`).
3. Na barra da esquerda, toque em **SQL Editor** (o ícone parece um terminal `>_`).
4. Toque em **New query** (ou no **+**) para abrir uma página em branco.
5. Abra o arquivo `supabase/permissoes.sql` desta pasta, copie **tudo** e cole na página em branco.
6. Toque em **Run** (canto de baixo, à direita) ou aperte **Ctrl + Enter**.
7. Se aparecer um aviso perguntando se quer mesmo rodar, toque em **Run this query**.
8. Embaixo aparece uma tabelinha com as colunas `tabela`, `protecao_ligada`, `regra`...
   Tire um print dela e mande para o Claude.
9. Volte ao app, toque em **Sair**, entre de novo e tente lançar um gasto à mão.

## O que esperar na tabelinha do passo 8

- `protecao_ligada` deve estar **true** nas duas tabelas.
- Em `gastos`, deve haver regra para ver, gravar e apagar só o que é seu
  (aparece algo com `auth.uid()` e `dono`).
- Se alguma linha mostrar `false` ou a coluna `regra` vier vazia, não use o app
  ainda: mande o print e o Claude prepara a regra que falta.

## Se der erro ao rodar

- **"relation public.resumos does not exist"**: a tabela de resumos ainda não foi
  criada. Apague a linha que fala de `resumos` e rode de novo.
- **Qualquer outro erro**: tire um print da mensagem vermelha e mande para o Claude.
