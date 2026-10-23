// Alexbarça — assistente que lança e consulta gastos.
// Recebe uma frase ou a foto de um cupom, pergunta ao Gemini o que fazer
// e grava ou consulta o Supabase com o login da própria pessoa.
// Sem dependências: só o fetch do Node.

// Copiados de app/configuracao.js. São públicos: a proteção por linha do banco
// continua valendo porque toda chamada vai com o token de quem está usando.
const SUPABASE_URL = "https://blnosohzpctzreweemvr.supabase.co";
const SUPABASE_CHAVE_PUBLICA = "sb_publishable_h9Tutotw3GB45lB4ReOQrQ_EElfhAb9";

const MODELO = "gemini-3.5-flash-lite";
const CATEGORIAS_PADRAO = ["Contabilidade", "Convênio", "DAS", "Curso de japonês", "Vivo", "Outros"];
const FUSO = "America/Sao_Paulo";
const TAMANHO_MAXIMO_IMAGEM = 4 * 1024 * 1024; // em caracteres de base64

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Um erro que já vem com a frase em português para mostrar no app.
class ErroAmigavel extends Error {
  constructor(status, frase) {
    super(frase);
    this.status = status;
  }
}

// ---------- Respostas ----------

function responder(status, corpo) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

// ---------- Datas ----------

function hojeEmSaoPaulo() {
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());
}

function dataValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(texto || ""))) return false;
  const d = new Date(texto + "T12:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

function dataBrasileira(iso) {
  const [ano, mes, dia] = iso.split("-");
  return dia + "/" + mes + "/" + ano;
}

// ---------- Supabase (sempre com o token da pessoa) ----------

function cabecalhosSupabase(token) {
  return {
    apikey: SUPABASE_CHAVE_PUBLICA,
    Authorization: "Bearer " + token,
    "Content-Type": "application/json"
  };
}

async function conferirLogin(token) {
  const resposta = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: cabecalhosSupabase(token)
  });
  if (resposta.status === 401 || resposta.status === 403) {
    throw new ErroAmigavel(401, "Sua entrada expirou. Toque em Sair e entre de novo.");
  }
  if (!resposta.ok) {
    throw new ErroAmigavel(502, "Não deu para conferir a sua entrada. Espere um instante e tente de novo.");
  }
  const usuario = await resposta.json();
  if (!usuario || !usuario.id) {
    throw new ErroAmigavel(401, "Sua entrada expirou. Toque em Sair e entre de novo.");
  }
  return usuario;
}

async function erroDoBanco(resposta) {
  let texto = "";
  try { texto = await resposta.text(); } catch { /* sem corpo */ }

  if (/42P01|PGRST205|could not find the table|does not exist/i.test(texto)) {
    return new ErroAmigavel(500,
      "A tabela de gastos não existe no Supabase. Crie a tabela gastos no painel e tente de novo.");
  }
  if (resposta.status === 401 || /jwt/i.test(texto)) {
    return new ErroAmigavel(401, "Sua entrada expirou. Toque em Sair e entre de novo.");
  }
  if (/row-level security|permission denied|42501/i.test(texto)) {
    return new ErroAmigavel(403, "O banco recusou a operação. Toque em Sair, entre de novo e tente outra vez.");
  }
  if (/check constraint|23514/i.test(texto)) {
    return new ErroAmigavel(500,
      "O banco não aceitou a origem do gasto. No Supabase, deixe a coluna origem aceitar \"texto\" e \"foto\".");
  }
  return new ErroAmigavel(502, "O banco não respondeu como esperado. Espere um instante e tente de novo.");
}

async function gravarGasto(token, gasto) {
  const resposta = await fetch(SUPABASE_URL + "/rest/v1/gastos", {
    method: "POST",
    headers: { ...cabecalhosSupabase(token), Prefer: "return=minimal" },
    body: JSON.stringify(gasto)
  });
  if (!resposta.ok) throw await erroDoBanco(resposta);
}

async function somarGastos(token, dono, desde, ate, categoria) {
  const filtros = new URLSearchParams();
  filtros.append("select", "valor");
  filtros.append("dono", "eq." + dono);
  filtros.append("data", "gte." + desde);
  filtros.append("data", "lte." + ate);
  if (categoria) filtros.append("categoria", "eq." + categoria);

  const resposta = await fetch(SUPABASE_URL + "/rest/v1/gastos?" + filtros.toString(), {
    headers: cabecalhosSupabase(token)
  });
  if (!resposta.ok) throw await erroDoBanco(resposta);

  const linhas = await resposta.json();
  // Soma em centavos para não acumular erro de arredondamento.
  const centavos = linhas.reduce((soma, l) => soma + Math.round(Number(l.valor || 0) * 100), 0);
  return { total: centavos / 100, quantidade: linhas.length };
}

// ---------- Gemini ----------

function ferramentas(categorias) {
  return [{
    function_declarations: [
      {
        name: "registrar_gasto",
        description: "Lança um gasto novo quando a pessoa conta o que pagou ou manda a foto de um cupom.",
        parameters: {
          type: "object",
          properties: {
            data: { type: "string", description: "Data do gasto no formato AAAA-MM-DD." },
            descricao: { type: "string", description: "Onde ou com o quê, curto. No cupom, o nome da loja." },
            valor: { type: "number", description: "Valor em reais, com ponto decimal. No cupom, o VALOR TOTAL." },
            categoria: { type: "string", enum: categorias, description: "Uma das categorias da pessoa." }
          },
          required: ["data", "descricao", "valor", "categoria"]
        }
      },
      {
        name: "consultar_gastos",
        description: "Consulta quanto a pessoa gastou num período, opcionalmente numa categoria.",
        parameters: {
          type: "object",
          properties: {
            desde: { type: "string", description: "Primeiro dia do período, AAAA-MM-DD." },
            ate: { type: "string", description: "Último dia do período, AAAA-MM-DD, incluído." },
            categoria: { type: "string", enum: categorias, description: "Categoria a filtrar. Omita para todas." }
          },
          required: ["desde", "ate"]
        }
      }
    ]
  }];
}

function instrucoes(hoje, categorias) {
  return [
    "Você é o assistente do Alexbarça, um app de gastos pessoais em português do Brasil.",
    "Hoje é " + hoje + " (fuso de São Paulo). Use esta data para entender hoje, ontem, este mês e afins.",
    "As categorias da pessoa são: " + categorias.join(", ") + ". Use sempre uma delas; se nenhuma servir, use Outros.",
    "Quando a pessoa contar um gasto, chame registrar_gasto. Sem data dita, use a de hoje.",
    "Quando a pessoa perguntar quanto gastou, chame consultar_gastos com o período certo. Nunca calcule totais você mesmo.",
    "Quando vier a foto de um cupom fiscal, chame registrar_gasto com o VALOR TOTAL do cupom (não um item), " +
      "a data de emissão impressa no cupom e o nome da loja como descrição.",
    "Se faltar o valor ou algo essencial, não chame ferramenta: pergunte, em uma frase curta.",
    "Nunca peça senha de banco, número de conta ou de cartão."
  ].join("\n");
}

async function perguntarAoGemini(chave, hoje, categorias, mensagem, imagem, mime) {
  const partes = [];
  if (mensagem) partes.push({ text: mensagem });
  if (imagem) {
    partes.push({ inline_data: { mime_type: mime, data: imagem } });
    if (!mensagem) partes.push({ text: "Lance o gasto deste cupom." });
  }

  const endereco = "https://generativelanguage.googleapis.com/v1beta/models/" + MODELO + ":generateContent";
  const resposta = await fetch(endereco, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: instrucoes(hoje, categorias) }] },
      contents: [{ role: "user", parts: partes }],
      tools: ferramentas(categorias),
      generationConfig: { temperature: 0 }
    })
  });

  if (resposta.status === 429) {
    throw new ErroAmigavel(429, "O assistente atingiu o limite de uso por agora. Espere um minuto e tente de novo, ou lance à mão.");
  }
  if (resposta.status === 400 || resposta.status === 401 || resposta.status === 403) {
    let texto = "";
    try { texto = await resposta.text(); } catch { /* sem corpo */ }
    if (/api key|api_key|permission|unauthenticated/i.test(texto)) {
      throw new ErroAmigavel(500, "A chave do Gemini não foi aceita. Confira a CHAVE_GEMINI na Netlify e publique de novo.");
    }
    throw new ErroAmigavel(400, "O assistente não entendeu o pedido. Tente com outras palavras ou outra foto.");
  }
  if (!resposta.ok) {
    throw new ErroAmigavel(502, "O assistente está fora do ar agora. Espere um instante e tente de novo, ou lance à mão.");
  }

  const dados = await resposta.json();
  const candidatas = (dados.candidates && dados.candidates[0] && dados.candidates[0].content) || {};
  return candidatas.parts || [];
}

// ---------- Ações ----------

async function acaoRegistrar(token, usuario, args, categorias, hoje, origem) {
  const valor = Math.round(Number(args.valor) * 100) / 100;
  if (!Number.isFinite(valor) || valor <= 0) {
    return "Não entendi o valor. Diga quanto foi, por exemplo: mercado 50 hoje.";
  }
  const categoria = categorias.includes(args.categoria) ? args.categoria : "Outros";
  const data = dataValida(args.data) ? args.data : hoje;
  const descricao = String(args.descricao || "").trim().slice(0, 80) || null;

  await gravarGasto(token, { dono: usuario.id, data, descricao, valor, categoria, origem });

  return "Lancei " + moeda.format(valor) + " em " + categoria + ": " +
    (descricao || "sem descrição") + ", " + dataBrasileira(data) + ".";
}

async function acaoConsultar(token, usuario, args, categorias, hoje) {
  let desde = dataValida(args.desde) ? args.desde : hoje.slice(0, 8) + "01";
  let ate = dataValida(args.ate) ? args.ate : hoje;
  if (desde > ate) [desde, ate] = [ate, desde];
  const categoria = categorias.includes(args.categoria) ? args.categoria : null;

  const { total, quantidade } = await somarGastos(token, usuario.id, desde, ate, categoria);

  const periodo = desde === ate
    ? "em " + dataBrasileira(desde)
    : "de " + dataBrasileira(desde) + " a " + dataBrasileira(ate);
  const onde = categoria ? " com " + categoria : "";
  const vezes = quantidade === 1 ? "1 gasto" : quantidade + " gastos";
  return "Você gastou " + moeda.format(total) + onde + " " + periodo + " (" + vezes + ").";
}

// ---------- Entrada da função ----------

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return responder(405, { erro: "Use o app para falar com o assistente." });
    }

    const chave = process.env.CHAVE_GEMINI;
    if (!chave) {
      throw new ErroAmigavel(500,
        "O assistente está sem a chave do Gemini. Cadastre CHAVE_GEMINI nas variáveis da Netlify e publique de novo.");
    }

    const cabecalho = req.headers.get("authorization") || "";
    const token = cabecalho.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      throw new ErroAmigavel(401, "Sua entrada expirou. Toque em Sair e entre de novo.");
    }

    let corpo;
    try {
      corpo = await req.json();
    } catch {
      throw new ErroAmigavel(400, "O pedido chegou incompleto. Tente de novo.");
    }

    const mensagem = String(corpo.mensagem || "").trim().slice(0, 500);
    const imagem = typeof corpo.imagem === "string" && corpo.imagem ? corpo.imagem : null;
    const mime = /^image\/(jpeg|png|webp)$/.test(corpo.mime || "") ? corpo.mime : "image/jpeg";
    const categorias = Array.isArray(corpo.categorias) && corpo.categorias.length
      ? corpo.categorias.filter((c) => typeof c === "string" && c.trim()).map((c) => c.trim().slice(0, 40)).slice(0, 20)
      : CATEGORIAS_PADRAO;
    if (!categorias.includes("Outros")) categorias.push("Outros");

    if (!mensagem && !imagem) {
      throw new ErroAmigavel(400, "Escreva o gasto, por exemplo: mercado 50 hoje, ou mande a foto do cupom.");
    }
    if (imagem && imagem.length > TAMANHO_MAXIMO_IMAGEM) {
      throw new ErroAmigavel(413, "A foto ficou grande demais. Tire outra, mais de perto do cupom.");
    }

    const usuario = await conferirLogin(token);
    const hoje = hojeEmSaoPaulo();

    const partes = await perguntarAoGemini(chave, hoje, categorias, mensagem, imagem, mime);
    const chamada = partes.find((p) => p.functionCall || p.function_call);
    const funcao = chamada && (chamada.functionCall || chamada.function_call);

    if (funcao && funcao.name === "registrar_gasto") {
      const origem = imagem ? "foto" : "texto";
      const resposta = await acaoRegistrar(token, usuario, funcao.args || {}, categorias, hoje, origem);
      return responder(200, { resposta, lancado: resposta.startsWith("Lancei") });
    }
    if (funcao && funcao.name === "consultar_gastos") {
      const resposta = await acaoConsultar(token, usuario, funcao.args || {}, categorias, hoje);
      return responder(200, { resposta, lancado: false });
    }

    const texto = partes.map((p) => p.text || "").join("").trim();
    return responder(200, {
      resposta: texto || "Não entendi. Tente algo como: mercado 50 hoje.",
      lancado: false
    });
  } catch (erro) {
    if (erro instanceof ErroAmigavel) {
      return responder(erro.status, { erro: erro.message });
    }
    console.error(erro);
    return responder(500, { erro: "Algo deu errado no assistente. Espere um instante e tente de novo." });
  }
};

export const config = { path: "/api/assistente" };
