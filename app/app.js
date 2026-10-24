// Alexbarça — lógica do app.
// Sem framework: só o cliente do Supabase, que vem pela CDN.
(function () {
  "use strict";

  const config = window.MEU_BOLSO || {};
  const CATEGORIAS = config.CATEGORIAS || ["Outros"];
  const $ = (id) => document.getElementById(id);
  const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  let cliente = null;
  let usuario = null;
  let categoriaEscolhida = null;
  let gastosDoMes = [];
  let erroNaLista = false;

  // ---------- Datas ----------

  function dataIso(d) {
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function hoje() {
    return dataIso(new Date());
  }

  function intervaloDoMes() {
    const agora = new Date();
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
    return [dataIso(inicio), dataIso(fim)];
  }

  function dataCurta(iso) {
    const [, mes, dia] = String(iso).split("-");
    return dia + "/" + mes;
  }

  // ---------- Mensagens ----------

  // Todo erro vira uma frase em português dizendo o que fazer.
  function traduzirErro(erro) {
    const texto = String((erro && (erro.message || erro.error_description)) || erro || "");

    if (!navigator.onLine || /failed to fetch|networkerror|load failed|network request failed/i.test(texto)) {
      return "Sem internet. Confira a conexão e tente de novo.";
    }
    if (/invalid login credentials/i.test(texto)) {
      return "E-mail ou senha errados. Confira e tente de novo.";
    }
    if (/already registered|already been registered|user already exists/i.test(texto)) {
      return "Já existe uma conta com este e-mail. Toque em Entrar.";
    }
    if (/password should be at least|password.*6/i.test(texto)) {
      return "A senha precisa ter pelo menos 6 caracteres.";
    }
    if (/email not confirmed/i.test(texto)) {
      return "Este e-mail ainda não foi confirmado. Desligue a confirmação de e-mail no Supabase e tente de novo.";
    }
    if (/invalid format|validate email|invalid email/i.test(texto)) {
      return "Este e-mail não parece válido. Confira e tente de novo.";
    }
    if (/signups not allowed|signup.*disabled/i.test(texto)) {
      return "Criar conta está desligado no Supabase. Ligue essa opção e tente de novo.";
    }
    if (/rate limit|only request this after|too many/i.test(texto)) {
      return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
    }
    if (/jwt|token.*expired|session/i.test(texto)) {
      return "Sua entrada expirou. Toque em Sair e entre de novo.";
    }
    if (/row-level security|permission denied/i.test(texto)) {
      return "O banco recusou a operação. Toque em Sair, entre de novo e tente outra vez.";
    }
    return "Algo deu errado. Espere um instante e tente de novo.";
  }

  function mostrar(elemento, texto, tipo) {
    elemento.textContent = texto || "";
    elemento.className = "mensagem " + (tipo || "erro");
  }

  function limpar(elemento) {
    mostrar(elemento, "");
  }

  // ---------- Início ----------

  function iniciar() {
    if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_CHAVE_PUBLICA) {
      $("carregando").textContent =
        "Não foi possível abrir o app. Confira a internet e recarregue a página.";
      return;
    }

    cliente = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_CHAVE_PUBLICA, {
      auth: { persistSession: true, autoRefreshToken: true }
    });

    montarCategorias();
    $("data").value = hoje();
    const nomeMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());
    $("mes-nome").textContent = nomeMes;

    $("form-entrada").addEventListener("submit", entrar);
    $("botao-criar").addEventListener("click", criarConta);
    $("botao-sair").addEventListener("click", sair);
    $("form-gasto").addEventListener("submit", lancarGasto);
    $("botao-enviar").addEventListener("click", enviarFrase);
    $("botao-foto").addEventListener("click", escolherFoto);
    $("assistente-texto").addEventListener("keydown", (e) => {
      if (e.key === "Enter") enviarFrase();
    });

    // O setTimeout evita travar o cliente do Supabase dentro deste aviso.
    cliente.auth.onAuthStateChange((_evento, sessao) => {
      setTimeout(() => aplicarSessao(sessao), 0);
    });
  }

  function aplicarSessao(sessao) {
    const novoUsuario = sessao ? sessao.user : null;
    const mesmoUsuario = novoUsuario && usuario && novoUsuario.id === usuario.id;
    usuario = novoUsuario;
    $("carregando").hidden = true;

    if (!usuario) {
      gastosDoMes = [];
      $("tela-principal").hidden = true;
      $("tela-entrada").hidden = false;
      return;
    }

    $("tela-entrada").hidden = true;
    $("tela-principal").hidden = false;
    if (!mesmoUsuario) {
      $("senha").value = "";
      limpar($("msg-entrada"));
      carregarTudo();
    }
  }

  // ---------- Entrada ----------

  function lerCredenciais() {
    const email = $("email").value.trim();
    const senha = $("senha").value;
    if (!email || !senha) {
      mostrar($("msg-entrada"), "Preencha o e-mail e a senha.");
      return null;
    }
    if (senha.length < 6) {
      mostrar($("msg-entrada"), "A senha precisa ter pelo menos 6 caracteres.");
      return null;
    }
    return { email, password: senha };
  }

  function travarEntrada(travar) {
    $("botao-entrar").disabled = travar;
    $("botao-criar").disabled = travar;
  }

  async function entrar(evento) {
    evento.preventDefault();
    const credenciais = lerCredenciais();
    if (!credenciais) return;

    travarEntrada(true);
    mostrar($("msg-entrada"), "Entrando…", "info");
    try {
      const { error } = await cliente.auth.signInWithPassword(credenciais);
      if (error) throw error;
    } catch (erro) {
      mostrar($("msg-entrada"), traduzirErro(erro));
    } finally {
      travarEntrada(false);
    }
  }

  async function criarConta() {
    const credenciais = lerCredenciais();
    if (!credenciais) return;

    travarEntrada(true);
    mostrar($("msg-entrada"), "Criando a conta…", "info");
    try {
      const { data, error } = await cliente.auth.signUp(credenciais);
      if (error) throw error;
      if (!data.session) {
        mostrar($("msg-entrada"),
          "A conta foi criada, mas o Supabase está pedindo confirmação por e-mail. " +
          "Desligue \"Confirm email\" no painel do Supabase e toque em Entrar.", "info");
      }
    } catch (erro) {
      mostrar($("msg-entrada"), traduzirErro(erro));
    } finally {
      travarEntrada(false);
    }
  }

  async function sair() {
    $("botao-sair").disabled = true;
    try {
      const { error } = await cliente.auth.signOut();
      if (error) throw error;
    } catch (erro) {
      mostrar($("msg-geral"), traduzirErro(erro));
    } finally {
      $("botao-sair").disabled = false;
    }
  }

  // ---------- Leitura ----------

  async function carregarTudo() {
    limpar($("msg-geral"));
    await Promise.all([carregarGastos(), carregarResumo()]);
  }

  async function carregarGastos() {
    const [inicio, fim] = intervaloDoMes();
    if (!gastosDoMes.length) {
      $("lista-vazia").hidden = true;
      mostrar($("msg-lista"), "Carregando seus gastos…", "info");
    }
    try {
      const { data, error } = await cliente
        .from("gastos")
        .select("id, data, descricao, valor, categoria, origem, criado_em")
        .eq("dono", usuario.id)
        .gte("data", inicio)
        .lt("data", fim)
        .order("data", { ascending: false })
        .order("criado_em", { ascending: false });
      if (error) throw error;
      gastosDoMes = data || [];
      erroNaLista = false;
      limpar($("msg-lista"));
    } catch (erro) {
      erroNaLista = true;
      mostrar($("msg-lista"), "Não deu para carregar os gastos. " + traduzirErro(erro));
    }
    desenhar();
  }

  async function carregarResumo() {
    try {
      const { data, error } = await cliente
        .from("resumos")
        .select("texto, criado_em")
        .order("criado_em", { ascending: false })
        .limit(1);
      if (error) throw error;
      const ultimo = data && data[0];
      if (ultimo && ultimo.texto) {
        $("texto-resumo").textContent = ultimo.texto;
        $("cartao-resumo").hidden = false;
      } else {
        $("cartao-resumo").hidden = true;
      }
    } catch (erro) {
      $("cartao-resumo").hidden = true;
      mostrar($("msg-geral"), "Não deu para carregar o resumo da semana. " + traduzirErro(erro));
    }
  }

  // ---------- Desenho da tela ----------

  function desenhar() {
    const total = gastosDoMes.reduce((soma, g) => soma + Number(g.valor || 0), 0);
    $("total-mes").textContent = moeda.format(total);
    $("media-dia").textContent = "Média de " + moeda.format(total / new Date().getDate()) + " por dia";
    desenharBarras();
    desenharLista();
  }

  function desenharBarras() {
    const porCategoria = {};
    CATEGORIAS.forEach((c) => { porCategoria[c] = 0; });
    gastosDoMes.forEach((g) => {
      const nome = CATEGORIAS.includes(g.categoria) ? g.categoria : "Outros";
      porCategoria[nome] = (porCategoria[nome] || 0) + Number(g.valor || 0);
    });
    const maior = Math.max(0, ...Object.values(porCategoria));

    const caixa = $("barras");
    caixa.replaceChildren();
    Object.keys(porCategoria).forEach((nome) => {
      const valor = porCategoria[nome];

      const linha = document.createElement("div");
      linha.className = "barra";

      const cabeca = document.createElement("div");
      cabeca.className = "barra-cabeca";
      const rotulo = document.createElement("span");
      rotulo.textContent = nome;
      const quanto = document.createElement("span");
      quanto.textContent = moeda.format(valor);
      cabeca.append(rotulo, quanto);

      const trilho = document.createElement("div");
      trilho.className = "barra-trilho";
      const preenchida = document.createElement("div");
      preenchida.className = "barra-preenchida";
      preenchida.style.width = maior > 0 ? (valor / maior * 100) + "%" : "0";
      trilho.append(preenchida);

      linha.append(cabeca, trilho);
      caixa.append(linha);
    });
  }

  function desenharLista() {
    const lista = $("lista");
    lista.replaceChildren();
    // Com erro, a frase de lista vazia poderia enganar: fica escondida.
    $("lista-vazia").hidden = gastosDoMes.length > 0 || erroNaLista;

    gastosDoMes.forEach((gasto) => {
      const item = document.createElement("li");

      const info = document.createElement("div");
      info.className = "item-info";
      const titulo = document.createElement("span");
      titulo.className = "item-titulo";
      titulo.textContent = gasto.descricao || gasto.categoria;
      const detalhe = document.createElement("span");
      detalhe.className = "item-detalhe";
      detalhe.textContent = dataCurta(gasto.data) + " · " + gasto.categoria;
      info.append(titulo, detalhe);

      const valor = document.createElement("span");
      valor.className = "item-valor";
      valor.textContent = moeda.format(Number(gasto.valor || 0));

      const apagar = document.createElement("button");
      apagar.type = "button";
      apagar.className = "item-apagar";
      apagar.textContent = "Apagar";
      apagar.setAttribute("aria-label", "Apagar gasto de " + valor.textContent);
      apagar.addEventListener("click", () => apagarGasto(gasto, apagar));

      item.append(info, valor, apagar);
      lista.append(item);
    });
  }

  // ---------- Lançar e apagar ----------

  function montarCategorias() {
    const caixa = $("escolha-categoria");
    caixa.replaceChildren();
    CATEGORIAS.forEach((nome) => {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "categoria";
      botao.textContent = nome;
      botao.setAttribute("aria-pressed", "false");
      botao.addEventListener("click", () => escolherCategoria(nome));
      caixa.append(botao);
    });
  }

  function escolherCategoria(nome) {
    categoriaEscolhida = nome;
    $("escolha-categoria").querySelectorAll(".categoria").forEach((b) => {
      b.setAttribute("aria-pressed", b.textContent === nome ? "true" : "false");
    });
  }

  // Aceita "12,50", "12.50", "1.234,56" e "R$ 12,50".
  function lerValor(texto) {
    let limpo = String(texto).replace(/r\$|\s/gi, "");
    if (limpo.includes(",")) limpo = limpo.replace(/\./g, "").replace(",", ".");
    const numero = Number(limpo);
    if (!limpo || !Number.isFinite(numero) || numero <= 0) return null;
    return Math.round(numero * 100) / 100;
  }

  async function lancarGasto(evento) {
    evento.preventDefault();
    const aviso = $("msg-gasto");

    const valor = lerValor($("valor").value);
    if (valor === null) {
      mostrar(aviso, "Digite o valor do gasto, por exemplo 12,50.");
      $("valor").focus();
      return;
    }
    if (!categoriaEscolhida) {
      mostrar(aviso, "Toque numa categoria para lançar.");
      return;
    }
    const data = $("data").value || hoje();
    const descricao = $("descricao").value.trim();

    $("botao-lancar").disabled = true;
    mostrar(aviso, "Lançando…", "info");
    try {
      const { error } = await cliente.from("gastos").insert({
        dono: usuario.id,
        data,
        descricao: descricao || null,
        valor,
        categoria: categoriaEscolhida,
        origem: "manual"
      });
      if (error) throw error;

      const [inicio, fim] = intervaloDoMes();
      const foraDoMes = data < inicio || data >= fim;
      mostrar(aviso,
        foraDoMes ? "Gasto lançado em outro mês; ele não entra no total deste." : "Gasto lançado.",
        "ok");

      $("valor").value = "";
      $("descricao").value = "";
      $("data").value = hoje();
      escolherCategoria(null);
      await carregarGastos();
    } catch (erro) {
      mostrar(aviso, traduzirErro(erro));
    } finally {
      $("botao-lancar").disabled = false;
    }
  }

  async function apagarGasto(gasto, botao) {
    const quanto = moeda.format(Number(gasto.valor || 0));
    if (!window.confirm("Apagar o gasto de " + quanto + " em " + gasto.categoria + "?")) return;

    botao.disabled = true;
    try {
      const { error } = await cliente.from("gastos").delete().eq("id", gasto.id);
      if (error) throw error;
      limpar($("msg-lista"));
      await carregarGastos();
    } catch (erro) {
      mostrar($("msg-lista"), "Não deu para apagar. " + traduzirErro(erro));
      botao.disabled = false;
    }
  }

  // ---------- Assistente ----------

  const LADO_MAXIMO_FOTO = 1600;
  let assistenteOcupado = false;

  function travarAssistente(travar) {
    assistenteOcupado = travar;
    $("botao-enviar").disabled = travar;
    $("botao-foto").disabled = travar;
  }

  function enviarFrase() {
    const mensagem = $("assistente-texto").value.trim();
    if (!mensagem) {
      mostrar($("msg-assistente"), "Escreva o gasto, por exemplo: mercado 50 hoje.");
      $("assistente-texto").focus();
      return;
    }
    falarComAssistente({ mensagem }, "Pensando…");
  }

  function escolherFoto() {
    if (assistenteOcupado) return;
    const seletor = document.createElement("input");
    seletor.type = "file";
    seletor.accept = "image/*";
    seletor.addEventListener("change", async () => {
      const arquivo = seletor.files && seletor.files[0];
      if (!arquivo) return;
      try {
        mostrar($("msg-assistente"), "Preparando a foto…", "info");
        const imagem = await reduzirFoto(arquivo);
        const mensagem = $("assistente-texto").value.trim();
        await falarComAssistente({ mensagem, imagem, mime: "image/jpeg" }, "Lendo o cupom…");
      } catch (erro) {
        mostrar($("msg-assistente"), "Não deu para abrir esta foto. Tire outra e tente de novo.");
      }
    });
    seletor.click();
  }

  // Reduz a foto no próprio aparelho (no máximo 1600 px, em JPEG) antes de enviar.
  // A foto não é guardada: ela só existe na memória até a resposta chegar.
  function reduzirFoto(arquivo) {
    return new Promise((resolve, reject) => {
      const endereco = URL.createObjectURL(arquivo);
      const imagem = new Image();
      imagem.onload = () => {
        const escala = Math.min(1, LADO_MAXIMO_FOTO / Math.max(imagem.width, imagem.height));
        const tela = document.createElement("canvas");
        tela.width = Math.round(imagem.width * escala);
        tela.height = Math.round(imagem.height * escala);
        tela.getContext("2d").drawImage(imagem, 0, 0, tela.width, tela.height);
        URL.revokeObjectURL(endereco);
        resolve(tela.toDataURL("image/jpeg", 0.85).split(",")[1]);
      };
      imagem.onerror = () => {
        URL.revokeObjectURL(endereco);
        reject(new Error("imagem"));
      };
      imagem.src = endereco;
    });
  }

  async function falarComAssistente(pedido, aguarde) {
    if (assistenteOcupado) return;
    const aviso = $("msg-assistente");
    travarAssistente(true);
    mostrar(aviso, aguarde, "info");
    try {
      const { data, error } = await cliente.auth.getSession();
      if (error) throw error;
      const token = data.session && data.session.access_token;
      if (!token) throw new Error("session");

      const resposta = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ ...pedido, categorias: CATEGORIAS })
      });

      let corpo = {};
      try { corpo = await resposta.json(); } catch (_e) { /* resposta sem JSON */ }

      if (!resposta.ok) {
        if (resposta.status === 404) {
          mostrar(aviso, "O assistente ainda não está no ar. Publique o app na Netlify e tente de novo.");
        } else {
          mostrar(aviso, corpo.erro || "O assistente não respondeu. Espere um instante e tente de novo.");
        }
        return;
      }

      mostrar(aviso, corpo.resposta || "Pronto.", corpo.lancado ? "ok" : "info");
      if (corpo.lancado) {
        $("assistente-texto").value = "";
        await carregarGastos();
      }
    } catch (erro) {
      mostrar(aviso, traduzirErro(erro));
    } finally {
      travarAssistente(false);
    }
  }

  // Um erro inesperado na abertura não pode deixar a tela presa em "Abrindo…".
  try {
    iniciar();
  } catch (_erro) {
    $("carregando").textContent = "Não foi possível abrir o app. Recarregue a página.";
  }
})();
