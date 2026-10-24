# Relatório do guarda de segurança: Meu Bolso

| Arquivo | O que encontrou | Gravidade | O que fazer |
|---|---|---|---|
| `app/configuracao.js` | Chave pública do Supabase (`sb_p…`). É o lugar permitido para ela. | BAIXA (permitido, só informativo) | Nada a fazer, pode ficar aí. |
| `netlify/functions/assistente.mjs` | Chave pública do Supabase (`sb_p…`) no topo do arquivo, lugar permitido. A chave do Gemini é lida de `CHAVE_GEMINI` nas variáveis da Netlify e não está escrita no arquivo. | BAIXA (permitido, só informativo) | Nada a fazer. |
| `.gitignore` | Tem as linhas `.env` e `.netlify` (e também `node_modules`). | Sem problema | Nada a fazer. |

Nenhuma chave secreta (`sb_secret`, `service_role`, `AIza`, JWT `eyJ…`), senha ou token escrito em arquivo, e-mail de pessoa real, CPF, telefone ou número de cartão ou conta foi encontrado. Os textos com "senha" e "Bearer" em `app/app.js` e `netlify/functions/assistente.mjs` só leem valores digitados ou recebidos durante o uso, e não trazem valor fixo.

PODE ENVIAR
