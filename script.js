// ==========================================================================
// 1. SEGURANÇA & UTILITÁRIOS (HASH SHA-256 E SANITIZAÇÃO DE DADOS)
// ==========================================================================

// Função assíncrona para gerar hash SHA-256 da senha
async function gerarHashSenha(senha) {
    const encoder = new TextEncoder();
    const data = encoder.encode(senha);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Previne scripts maliciosos (XSS) ao inserir texto em elementos
function sanitizar(string) {
    const temp = document.createElement('div');
    temp.textContent = string;
    return temp.innerHTML;
}

// ==========================================================================
// 2. SISTEMA DE NOTIFICAÇÕES (TOAST) E MODAL CUSTOMIZADO
// ==========================================================================

function exibirToast(mensagem, tipo = 'info') {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${tipo}`;
    toast.textContent = mensagem;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

let resolverModal = null;

function exibirModal({ titulo, mensagem, comInput = false, inputLabel = "" }) {
    return new Promise((resolve) => {
        resolverModal = resolve;

        document.getElementById("modalTitulo").textContent = titulo;
        document.getElementById("modalMensagem").textContent = mensagem;

        const inputContainer = document.getElementById("modalInputContainer");
        const inputField = document.getElementById("modalInput");

        if (comInput) {
            inputContainer.classList.remove("oculto");
            document.getElementById("modalInputLabel").textContent = inputLabel;
            inputField.value = "";
        } else {
            inputContainer.classList.add("oculto");
        }

        document.getElementById("modalCustom").classList.remove("oculto");
    });
}

function fecharModal(confirmado) {
    document.getElementById("modalCustom").classList.add("oculto");

    if (resolverModal) {
        const comInput = !document.getElementById("modalInputContainer").classList.contains("oculto");
        const valorInput = document.getElementById("modalInput").value.trim();

        if (comInput) {
            resolverModal(confirmado ? valorInput : null);
        } else {
            resolverModal(confirmado);
        }
        resolverModal = null;
    }
}

// ==========================================================================
// 3. BANCO DE DADOS E ESTADOS INICIAIS
// ==========================================================================

const UNIDADES_PADRAO = [
    { id: "SRS1", nome: "SRS1 PORTO ALEGRE - RS" },
    { id: "SRS2", nome: "SRS2 PELOTAS - RS" },
    { id: "SRS3", nome: "SRS3 CAXIAS DO SUL - RS" },
    { id: "SRS4", nome: "SRS4 SANTA MARIA - RS" }
];

const CARGOS_PADRAO = [
    {
        id: "admin",
        nome: "Administrador Master",
        permissoes: ["ver_dashboard", "cadastrar_produto", "editar_produto", "movimentar_direto", "aprovar_pendencias", "gerenciar_usuarios", "gerenciar_cargos", "exportar_excel"]
    },
    {
        id: "coordenador",
        nome: "Coordenador Geral",
        permissoes: ["ver_dashboard", "cadastrar_produto", "editar_produto", "movimentar_direto", "aprovar_pendencias", "gerenciar_usuarios", "exportar_excel"]
    },
    {
        id: "supervisor",
        nome: "Supervisor de Unidade",
        permissoes: ["ver_dashboard", "cadastrar_produto", "editar_produto", "movimentar_direto", "aprovar_pendencias", "exportar_excel"]
    },
    {
        id: "tecnico",
        nome: "Técnico Operacional",
        permissoes: ["cadastrar_produto"]
    }
];

// Hash de "1234": 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
const SENHA_HASH_PADRAO = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";

const USUARIOS_PADRAO = [
    { login: "admin", email: "admin@empresa.com", senhaHash: SENHA_HASH_PADRAO, perfil: "admin", nome: "Admin Master", unidadeId: "TODAS" },
    { login: "coordenador", email: "coordenador@empresa.com", senhaHash: SENHA_HASH_PADRAO, perfil: "coordenador", nome: "Coordenador Geral", unidadeId: "TODAS" },
    { login: "supervisor", email: "supervisor@empresa.com", senhaHash: SENHA_HASH_PADRAO, perfil: "supervisor", nome: "Supervisor Pelotas", unidadeId: "SRS2" },
    { login: "tecnico", email: "tecnico@empresa.com", senhaHash: SENHA_HASH_PADRAO, perfil: "tecnico", nome: "Técnico Silva", unidadeId: "SRS2" }
];

let unidades = JSON.parse(localStorage.getItem("unidades")) || UNIDADES_PADRAO;
let cargos = JSON.parse(localStorage.getItem("cargos")) || CARGOS_PADRAO;
let usuarios = JSON.parse(localStorage.getItem("usuarios")) || USUARIOS_PADRAO;
let produtos = JSON.parse(localStorage.getItem("produtos")) || [];
let movimentacoes = JSON.parse(localStorage.getItem("movimentacoes")) || [];
let pendencias = JSON.parse(localStorage.getItem("pendencias")) || [];

// ESTADOS DE PAGINAÇÃO E CONTROLE
let paginaProdutosAtual = 1;
let paginaHistoricoAtual = 1;
const ITENS_POR_PAGINA = 8;

let usuarioLogado = JSON.parse(sessionStorage.getItem("usuarioLogado")) || null;
let unidadeSelecionada = JSON.parse(sessionStorage.getItem("unidadeSelecionada")) || null;

function toggleSidebar() {
    document.getElementById("sidebarNav").classList.toggle("oculto");
}

function navegarEFechar(pagina) {
    mostrarPagina(pagina);
    document.getElementById("sidebarNav").classList.add("oculto");
}

function salvarDados() {
    localStorage.setItem("unidades", JSON.stringify(unidades));
    localStorage.setItem("cargos", JSON.stringify(cargos));
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("produtos", JSON.stringify(produtos));
    localStorage.setItem("movimentacoes", JSON.stringify(movimentacoes));
    localStorage.setItem("pendencias", JSON.stringify(pendencias));
}

function temPermissao(permissao) {
    if (!usuarioLogado) return false;
    const cargo = cargos.find(c => c.id === usuarioLogado.perfil);
    return cargo ? cargo.permissoes.includes(permissao) : false;
}

// ==========================================================================
// 4. AUTENTICAÇÃO E NAVEGAÇÃO
// ==========================================================================

async function realizarLogin() {
    const usuarioVal = document.getElementById("usuarioInput").value.trim().toLowerCase();
    const senhaVal = document.getElementById("senhaInput").value.trim();

    if (!usuarioVal || !senhaVal) {
        exibirToast("Informe seu usuário e senha.", "alerta");
        return;
    }

    const hashForm = await gerarHashSenha(senhaVal);
    const conta = usuarios.find(u => u.login.toLowerCase() === usuarioVal && u.senhaHash === hashForm);

    if (conta) {
        usuarioLogado = conta;
        sessionStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));

        unidadeSelecionada = conta.unidadeId !== "TODAS"
            ? (unidades.find(u => u.id === conta.unidadeId) || unidades[0])
            : unidades[0];

        sessionStorage.setItem("unidadeSelecionada", JSON.stringify(unidadeSelecionada));
        exibirToast(`Bem-vindo, ${sanitizar(conta.nome)}!`, "sucesso");
        iniciarSessao();
    } else {
        exibirModal({
            titulo: "Acesso Negado",
            mensagem: "Usuário ou senha incorretos."
        });
    }
}

function realizarLogout() {
    sessionStorage.clear();
    usuarioLogado = null;
    unidadeSelecionada = null;

    document.getElementById("usuarioInput").value = "";
    document.getElementById("senhaInput").value = "";

    document.getElementById("sidebarNav").classList.add("oculto");
    iniciarSessao();
    exibirToast("Sessão encerrada com sucesso.", "info");
}

function iniciarSessao() {
    const infoHeader = document.getElementById("infoUsuarioHeader");
    const btnToggleSidebar = document.getElementById("btnToggleSidebar");
    const nomeUnidadeElem = document.getElementById("nomeUnidadeAtual");

    if (usuarioLogado) {
        if (!unidadeSelecionada) {
            unidadeSelecionada = unidades[0];
            sessionStorage.setItem("unidadeSelecionada", JSON.stringify(unidadeSelecionada));
        }

        infoHeader.classList.remove("oculto");
        btnToggleSidebar.classList.remove("oculto");

        nomeUnidadeElem.textContent = `${usuarioLogado.nome} (${usuarioLogado.perfil.toUpperCase()}) | ${unidadeSelecionada.nome}`;

        document.querySelectorAll(".badge-unidade").forEach(el => el.textContent = unidadeSelecionada.nome);

        aplicarPermissoesInterface();
        mostrarPagina(temPermissao("ver_dashboard") ? "dashboard" : "movimentacao");
    } else {
        infoHeader.classList.add("oculto");
        btnToggleSidebar.classList.add("oculto");
        mostrarPagina("login");
    }
}

function mostrarPagina(pagina) {
    document.querySelectorAll(".pagina").forEach(secao => secao.classList.add("oculto"));
    const paginaAlvo = document.getElementById(pagina);
    if (paginaAlvo) paginaAlvo.classList.remove("oculto");

    if (usuarioLogado && unidadeSelecionada && !['login', 'recuperarSenha', 'selecaoUnidade'].includes(pagina)) {
        atualizarSistema();
    }
}

function aplicarPermissoesInterface() {
    if (!usuarioLogado) return;

    document.getElementById("navDashboard").style.display = temPermissao("ver_dashboard") ? "block" : "none";
    document.getElementById("navPendencias").style.display = temPermissao("aprovar_pendencias") ? "block" : "none";
    document.getElementById("navUsuarios").style.display = temPermissao("gerenciar_usuarios") ? "block" : "none";
    document.getElementById("navCargos").style.display = temPermissao("gerenciar_cargos") ? "block" : "none";

    document.getElementById("containerFormProdutos").style.display = temPermissao("cadastrar_produto") ? "grid" : "none";
    document.getElementById("containerImportarExcel").style.display = temPermissao("exportar_excel") ? "block" : "none";
    document.getElementById("thAcoesProdutos").style.display = temPermissao("editar_produto") ? "table-cell" : "none";

    document.getElementById("badgePendenciasCount").textContent = pendencias.length;
}

// ==========================================================================
// 5. PRODUTOS & PAGINAÇÃO
// ==========================================================================

function salvarProduto() {
    if (!temPermissao("cadastrar_produto")) return;

    const id = document.getElementById("produtoId").value;
    const nome = sanitizar(document.getElementById("nomeProduto").value.trim());
    const codigo = sanitizar(document.getElementById("codigoProduto").value.trim());
    const categoria = sanitizar(document.getElementById("categoriaProduto").value.trim());
    const estoque = Number(document.getElementById("estoqueInicial").value);
    const minimo = Number(document.getElementById("estoqueMinimo").value);

    if (!nome || !codigo) {
        exibirToast("Preencha o nome e o código do produto.", "alerta");
        return;
    }

    if (id) {
        if (!temPermissao("editar_produto")) return;

        const prod = produtos.find(p => p.id == id && p.unidadeId === unidadeSelecionada.id);
        if (prod) {
            prod.nome = nome;
            prod.codigo = codigo;
            prod.categoria = categoria;
            prod.minimo = minimo;
        }
        exibirToast("Produto atualizado com sucesso!", "sucesso");
    } else {
        if (produtos.some(p => p.unidadeId === unidadeSelecionada.id && p.codigo.toLowerCase() === codigo.toLowerCase())) {
            exibirToast("Código de produto já existente.", "alerta");
            return;
        }

        produtos.push({
            id: Date.now(),
            unidadeId: unidadeSelecionada.id,
            nome, codigo, categoria, estoque, minimo
        });
        exibirToast("Produto cadastrado!", "sucesso");
    }

    salvarDados();
    limparFormulario();
    atualizarSistema();
}

function limparFormulario() {
    document.getElementById("produtoId").value = "";
    document.getElementById("nomeProduto").value = "";
    document.getElementById("codigoProduto").value = "";
    document.getElementById("categoriaProduto").value = "";
    document.getElementById("estoqueInicial").value = 0;
    document.getElementById("estoqueMinimo").value = 1;
}

function listarProdutos() {
    if (!unidadeSelecionada) return;

    const tabela = document.getElementById("tabelaProdutos");
    const pesquisa = document.getElementById("pesquisa").value.toLowerCase();
    tabela.innerHTML = "";

    const filtrados = produtos.filter(p => 
        p.unidadeId === unidadeSelecionada.id &&
        (p.nome.toLowerCase().includes(pesquisa) || p.codigo.toLowerCase().includes(pesquisa) || p.categoria.toLowerCase().includes(pesquisa))
    );

    // Paginação
    const totalPaginas = Math.ceil(filtrados.length / ITENS_POR_PAGINA) || 1;
    if (paginaProdutosAtual > totalPaginas) paginaProdutosAtual = totalPaginas;

    const inicio = (paginaProdutosAtual - 1) * ITENS_POR_PAGINA;
    const paginados = filtrados.slice(inicio, inicio + ITENS_POR_PAGINA);

    paginados.forEach(p => {
        const baixo = p.estoque <= p.minimo;
        const linha = document.createElement("tr");

        let acoesHtml = temPermissao("editar_produto") ? `
            <td>
                <button class="btn-editar" onclick="editarProduto(${p.id})">Editar</button>
                <button class="btn-excluir" onclick="excluirProduto(${p.id})">Excluir</button>
            </td>
        ` : '';

        linha.innerHTML = `
            <td>${p.nome}</td>
            <td>${p.codigo}</td>
            <td>${p.categoria || "-"}</td>
            <td>${p.estoque}</td>
            <td>${p.minimo}</td>
            <td>${baixo ? '<span class="status-baixo"> BAIXO</span>' : '<span class="status-ok">✓ OK</span>'}</td>
            ${acoesHtml}
        `;
        tabela.appendChild(linha);
    });

    renderizarControlesPaginacao("paginacaoProdutos", totalPaginas, paginaProdutosAtual, (p) => {
        paginaProdutosAtual = p;
        listarProdutos();
    });
}

async function excluirProduto(id) {
    if (!temPermissao("editar_produto")) return;

    const prod = produtos.find(p => p.id == id);
    if (!prod) return;

    const confirmou = await exibirModal({
        titulo: "Confirmar Exclusão",
        mensagem: `Deseja excluir o produto "${prod.nome}"?`
    });

    if (confirmou) {
        produtos = produtos.filter(p => p.id != id);
        salvarDados();
        atualizarSistema();
        exibirToast("Produto removido.", "info");
    }
}

// ==========================================================================
// 6. MOVIMENTAÇÕES E AUDITORIA DE PENDÊNCIAS
// ==========================================================================

function registrarMovimentacao() {
    if (!unidadeSelecionada) return;

    const produtoId = Number(document.getElementById("produtoMovimentacao").value);
    const tipo = document.getElementById("tipoMovimentacao").value;
    const quantidade = Number(document.getElementById("quantidadeMovimentacao").value);
    const observacao = sanitizar(document.getElementById("observacaoMovimentacao").value.trim());

    if (!produtoId || quantidade <= 0) {
        exibirToast("Selecione o produto e a quantidade válida.", "alerta");
        return;
    }

    const produto = produtos.find(p => p.id === produtoId && p.unidadeId === unidadeSelecionada.id);
    if (!produto) return;

    if (tipo === "entrada") {
        produto.estoque += quantidade;
        movimentacoes.push({
            id: Date.now(),
            unidadeId: unidadeSelecionada.id,
            dataIso: new Date().toISOString(),
            data: new Date().toLocaleString("pt-BR"),
            produto: produto.nome,
            codigo: produto.codigo,
            tipo: "entrada",
            quantidade,
            observacao: observacao || "Entrada direta",
            usuarioResponsavel: usuarioLogado.nome
        });
        exibirToast(`Entrada de ${quantidade} un. efetuada!`, "sucesso");
    } else {
        if (quantidade > produto.estoque) {
            exibirToast(`Saldo insuficiente! Estoque atual: ${produto.estoque}`, "erro");
            return;
        }

        if (temPermissao("movimentar_direto")) {
            produto.estoque -= quantidade;
            movimentacoes.push({
                id: Date.now(),
                unidadeId: unidadeSelecionada.id,
                dataIso: new Date().toISOString(),
                data: new Date().toLocaleString("pt-BR"),
                produto: produto.nome,
                codigo: produto.codigo,
                tipo: "saida",
                quantidade,
                observacao: observacao || "Saída direta",
                usuarioResponsavel: `${usuarioLogado.nome} (Direta)`
            });
            exibirToast("Saída realizada!", "sucesso");
        } else {
            pendencias.push({
                id: Date.now(),
                unidadeId: unidadeSelecionada.id,
                unidadeNome: unidadeSelecionada.nome,
                produtoId: produto.id,
                produtoNome: produto.nome,
                produtoCodigo: produto.codigo,
                quantidade,
                observacao: observacao || "Solicitação de retirada",
                solicitante: usuarioLogado.nome,
                dataIso: new Date().toISOString(),
                data: new Date().toLocaleString("pt-BR")
            });
            exibirToast("Solicitação enviada para aprovação.", "info");
        }
    }

    salvarDados();
    document.getElementById("quantidadeMovimentacao").value = 1;
    document.getElementById("observacaoMovimentacao").value = "";
    atualizarSistema();
}

function listarPendencias() {
    const tabela = document.getElementById("tabelaPendencias");
    if (!tabela) return;

    tabela.innerHTML = "";

    if (pendencias.length === 0) {
        tabela.innerHTML = `<tr><td colspan="7" style="text-align:center;">Nenhuma solicitação pendente.</td></tr>`;
        return;
    }

    pendencias.forEach((item, index) => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${item.data}</td>
            <td><strong>${item.unidadeId}</strong></td>
            <td>${item.solicitante}</td>
            <td>${item.produtoCodigo} - ${item.produtoNome}</td>
            <td><strong>${item.quantidade}</strong></td>
            <td>${item.observacao}</td>
            <td>
                <button class="btn-principal" style="padding:4px 10px; font-size:12px;" onclick="aprovarPendencia(${index})">Aprovar</button>
                <button class="btn-excluir" style="padding:4px 10px; font-size:12px;" onclick="recusarPendencia(${index})">Recusar</button>
            </td>
        `;
        tabela.appendChild(linha);
    });
}

function aprovarPendencia(index) {
    if (!temPermissao("aprovar_pendencias")) return;

    const item = pendencias[index];
    const produto = produtos.find(p => p.id === item.produtoId && p.unidadeId === item.unidadeId);

    if (!produto || item.quantidade > produto.estoque) {
        exibirToast("Estoque insuficiente para aprovação.", "erro");
        return;
    }

    produto.estoque -= item.quantidade;
    movimentacoes.push({
        id: Date.now(),
        unidadeId: item.unidadeId,
        dataIso: new Date().toISOString(),
        data: new Date().toLocaleString("pt-BR"),
        produto: produto.nome,
        codigo: produto.codigo,
        tipo: "saida",
        quantidade: item.quantidade,
        observacao: `[Aprovado por ${usuarioLogado.nome}] Justificativa: ${item.observacao}`,
        usuarioResponsavel: item.solicitante
    });

    pendencias.splice(index, 1);
    salvarDados();
    atualizarSistema();
    exibirToast("Solicitação APROVADA!", "sucesso");
}

async function recusarPendencia(index) {
    if (!temPermissao("aprovar_pendencias")) return;

    const motivo = await exibirModal({
        titulo: "Recusar Solicitação",
        mensagem: "Informe o motivo da recusa para fins de auditoria:",
        comInput: true,
        inputLabel: "Motivo da Recusa:"
    });

    if (motivo !== null) {
        const item = pendencias[index];

        // Registro da recusa no histórico para rastreabilidade
        movimentacoes.push({
            id: Date.now(),
            unidadeId: item.unidadeId,
            dataIso: new Date().toISOString(),
            data: new Date().toLocaleString("pt-BR"),
            produto: item.produtoNome,
            codigo: item.produtoCodigo,
            tipo: "recusado",
            quantidade: item.quantidade,
            observacao: `[RECUSADO por ${usuarioLogado.nome}] Motivo: ${motivo || "Não informado"}`,
            usuarioResponsavel: item.solicitante
        });

        pendencias.splice(index, 1);
        salvarDados();
        atualizarSistema();
        exibirToast("Solicitação recusada e salva no histórico.", "info");
    }
}

// ==========================================================================
// 7. HISTÓRICO, FILTROS POR DATA E GERADOR PDF
// ==========================================================================

function limparFiltroData() {
    document.getElementById("filtroDataInicio").value = "";
    document.getElementById("filtroDataFim").value = "";
    listarHistorico();
}

function obterHistoricoFiltrado() {
    const inicioVal = document.getElementById("filtroDataInicio").value;
    const fimVal = document.getElementById("filtroDataFim").value;

    let lista = movimentacoes.filter(m => m.unidadeId === unidadeSelecionada.id);

    if (inicioVal) {
        const dataInicio = new Date(inicioVal + "T00:00:00");
        lista = lista.filter(m => new Date(m.dataIso || m.id) >= dataInicio);
    }

    if (fimVal) {
        const dataFim = new Date(fimVal + "T23:59:59");
        lista = lista.filter(m => new Date(m.dataIso || m.id) <= dataFim);
    }

    return lista.reverse();
}

function listarHistorico() {
    if (!unidadeSelecionada) return;

    const tabela = document.getElementById("tabelaHistorico");
    tabela.innerHTML = "";

    const lista = obterHistoricoFiltrado();

    // Paginação
    const totalPaginas = Math.ceil(lista.length / ITENS_POR_PAGINA) || 1;
    if (paginaHistoricoAtual > totalPaginas) paginaHistoricoAtual = totalPaginas;

    const inicio = (paginaHistoricoAtual - 1) * ITENS_POR_PAGINA;
    const paginados = lista.slice(inicio, inicio + ITENS_POR_PAGINA);

    paginados.forEach(mov => {
        const linha = document.createElement("tr");

        let tipoHtml = '<span class="status-ok">⬆ Entrada</span>';
        if (mov.tipo === "saida") tipoHtml = '<span class="status-baixo">⬇ Saída</span>';
        if (mov.tipo === "recusado") tipoHtml = '<strong style="color:#777;">✖ Recusado</strong>';

        linha.innerHTML = `
            <td>${mov.data}</td>
            <td>${mov.codigo} - ${mov.produto}</td>
            <td>${tipoHtml}</td>
            <td>${mov.quantidade}</td>
            <td>${mov.observacao}</td>
            <td><strong>${mov.usuarioResponsavel || "-"}</strong></td>
        `;
        tabela.appendChild(linha);
    });

    renderizarControlesPaginacao("paginacaoHistorico", totalPaginas, paginaHistoricoAtual, (p) => {
        paginaHistoricoAtual = p;
        listarHistorico();
    });
}

function exportarHistoricoPDF() {
    if (!temPermissao("exportar_excel")) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const dados = obterHistoricoFiltrado();

    doc.setFontSize(16);
    doc.text(`Relatório de Movimentações - ${unidadeSelecionada.nome}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")} | Por: ${usuarioLogado.nome}`, 14, 22);

    const colunas = ["Data/Hora", "Código", "Produto", "Operação", "Qtd", "Observação", "Responsável"];
    const linhas = dados.map(m => [
        m.data,
        m.codigo,
        m.produto,
        m.tipo.toUpperCase(),
        m.quantidade,
        m.observacao,
        m.usuarioResponsavel
    ]);

    doc.autoTable({
        head: [colunas],
        body: linhas,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [45, 50, 119] }
    });

    doc.save(`Relatorio_Movimentacoes_${unidadeSelecionada.id}.pdf`);
    exibirToast("PDF gerado com sucesso!", "sucesso");
}

// Helper para componentes de Paginação
function renderizarControlesPaginacao(containerId, totalPaginas, paginaAtual, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";
    if (totalPaginas <= 1) return;

    for (let i = 1; i <= totalPaginas; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        if (i === paginaAtual) btn.className = "ativo";
        btn.onclick = () => callback(i);
        container.appendChild(btn);
    }
}

// ==========================================================================
// 8. GESTÃO DE USUÁRIOS E CARGOS (COM SENHAS CRIPTOGRAFADAS)
// ==========================================================================

async function cadastrarNovoUsuario() {
    if (!temPermissao("gerenciar_usuarios")) return;

    const nome = sanitizar(document.getElementById("novoNomeUsuario").value.trim());
    const email = sanitizar(document.getElementById("novoEmailUsuario").value.trim().toLowerCase());
    const login = sanitizar(document.getElementById("novoLoginUsuario").value.trim().toLowerCase());
    const senha = document.getElementById("novaSenhaUsuario").value.trim();
    const perfil = document.getElementById("novoPerfilUsuario").value;
    const unidadeId = document.getElementById("novaUnidadeUsuario").value;

    if (!nome || !login || !senha) {
        exibirToast("Preencha os campos obrigatórios.", "alerta");
        return;
    }

    if (usuarios.some(u => u.login.toLowerCase() === login)) {
        exibirToast("Este login já existe.", "alerta");
        return;
    }

    const senhaHash = await gerarHashSenha(senha);

    usuarios.push({ nome, email, login, senhaHash, perfil, unidadeId });
    salvarDados();

    document.getElementById("novoNomeUsuario").value = "";
    document.getElementById("novoEmailUsuario").value = "";
    document.getElementById("novoLoginUsuario").value = "";
    document.getElementById("novaSenhaUsuario").value = "";

    listarUsuarios();
    exibirToast(`Usuário ${nome} criado!`, "sucesso");
}

function listarUsuarios() {
    const tabela = document.getElementById("tabelaUsuarios");
    if (!tabela) return;

    tabela.innerHTML = "";

    usuarios.forEach((u, index) => {
        const cargoObj = cargos.find(c => c.id === u.perfil);
        const linha = document.createElement("tr");

        linha.innerHTML = `
            <td>${u.nome}</td>
            <td>${u.email || "-"}</td>
            <td><code>${u.login}</code></td>
            <td><strong>${cargoObj ? cargoObj.nome : u.perfil}</strong></td>
            <td>${u.unidadeId}</td>
            <td>
                ${u.login !== 'admin' ? `<button class="btn-excluir" onclick="removerUsuario(${index})">Remover</button>` : '-'}
            </td>
        `;
        tabela.appendChild(linha);
    });
}

async function removerUsuario(index) {
    const confirmou = await exibirModal({
        titulo: "Remover Usuário",
        mensagem: "Confirma a remoção deste usuário?"
    });

    if (confirmou) {
        usuarios.splice(index, 1);
        salvarDados();
        listarUsuarios();
        exibirToast("Usuário removido.", "info");
    }
}

function cadastrarNovoCargo() {
    if (!temPermissao("gerenciar_cargos")) return;

    const nome = sanitizar(document.getElementById("novoNomeCargo").value.trim());
    if (!nome) {
        exibirToast("Informe o nome do cargo.", "alerta");
        return;
    }

    const id = nome.toLowerCase().replace(/\s+/g, '_');
    const checkboxes = document.querySelectorAll(".chk-perm:checked");
    const permissoes = Array.from(checkboxes).map(c => c.value);

    if (cargos.some(c => c.id === id)) {
        exibirToast("Já existe um cargo com esse nome.", "alerta");
        return;
    }

    cargos.push({ id, nome, permissoes });
    salvarDados();

    document.getElementById("novoNomeCargo").value = "";
    document.querySelectorAll(".chk-perm").forEach(c => c.checked = false);

    listarCargos();
    atualizarOptionsPerfis();
    exibirToast(`Cargo "${nome}" cadastrado!`, "sucesso");
}

function listarCargos() {
    const tabela = document.getElementById("tabelaCargos");
    if (!tabela) return;

    tabela.innerHTML = "";

    cargos.forEach((c, index) => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td><strong>${c.nome}</strong></td>
            <td><small>${c.permissoes.join(", ") || "Nenhuma"}</small></td>
            <td>
                ${['admin', 'coordenador', 'supervisor', 'tecnico'].includes(c.id) 
                    ? '<em>Padrão</em>' 
                    : `<button class="btn-excluir" onclick="removerCargo(${index})">Remover</button>`}
            </td>
        `;
        tabela.appendChild(linha);
    });
}

async function removerCargo(index) {
    const confirmou = await exibirModal({
        titulo: "Remover Cargo",
        mensagem: "Deseja realmente remover este cargo personalizado?"
    });

    if (confirmou) {
        cargos.splice(index, 1);
        salvarDados();
        listarCargos();
        atualizarOptionsPerfis();
        exibirToast("Cargo removido.", "info");
    }
}

function cadastrarNovaUnidade() {
    if (!temPermissao("gerenciar_usuarios")) return;

    const id = sanitizar(document.getElementById("novoIdUnidade").value.trim().toUpperCase());
    const nome = sanitizar(document.getElementById("novoNomeUnidade").value.trim());

    if (!id || !nome) {
        exibirToast("Preencha o código e o nome da unidade.", "alerta");
        return;
    }

    if (unidades.some(u => u.id === id)) {
        exibirToast("Código de unidade em uso.", "alerta");
        return;
    }

    unidades.push({ id, nome });
    salvarDados();

    document.getElementById("novoIdUnidade").value = "";
    document.getElementById("novoNomeUnidade").value = "";

    atualizarOptionsUnidades();
    exibirToast(`Unidade "${nome}" criada!`, "sucesso");
}

function atualizarOptionsUnidades() {
    const select = document.getElementById("novaUnidadeUsuario");
    if (!select) return;

    select.innerHTML = '<option value="TODAS">TODAS (Acesso Total)</option>';
    unidades.forEach(u => {
        const option = document.createElement("option");
        option.value = u.id;
        option.textContent = u.nome;
        select.appendChild(option);
    });
}

function atualizarOptionsPerfis() {
    const select = document.getElementById("novoPerfilUsuario");
    if (!select) return;

    select.innerHTML = "";
    cargos.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = c.nome;
        select.appendChild(option);
    });
}

function atualizarSelectProdutos() {
    if (!unidadeSelecionada) return;

    const select = document.getElementById("produtoMovimentacao");
    select.innerHTML = '<option value="">Selecione um produto</option>';

    produtos.filter(p => p.unidadeId === unidadeSelecionada.id).forEach(p => {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = `${p.codigo} - ${p.nome} (Estoque: ${p.estoque})`;
        select.appendChild(option);
    });
}

function atualizarDashboard() {
    if (!unidadeSelecionada) return;

    const produtosUnidade = produtos.filter(p => p.unidadeId === unidadeSelecionada.id);
    const movsUnidade = movimentacoes.filter(m => m.unidadeId === unidadeSelecionada.id);

    document.getElementById("totalProdutos").textContent = produtosUnidade.length;
    document.getElementById("totalEstoque").textContent = produtosUnidade.reduce((acc, p) => acc + p.estoque, 0);
    document.getElementById("totalBaixo").textContent = produtosUnidade.filter(p => p.estoque <= p.minimo).length;
    document.getElementById("totalMovimentacoes").textContent = movsUnidade.length;

    const tabelaBaixo = document.getElementById("tabelaBaixo");
    tabelaBaixo.innerHTML = "";

    const baixos = produtosUnidade.filter(p => p.estoque <= p.minimo);
    baixos.forEach(p => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${p.nome}</td>
            <td>${p.codigo}</td>
            <td>${p.estoque}</td>
            <td>${p.minimo}</td>
            <td><span class="status-baixo"> ESTOQUE BAIXO</span></td>
        `;
        tabelaBaixo.appendChild(linha);
    });

    if (baixos.length === 0) {
        tabelaBaixo.innerHTML = `<tr><td colspan="5">✓ Todos os produtos em níveis normais.</td></tr>`;
    }
}

function exportarProdutosExcel() {
    if (!temPermissao("exportar_excel")) return;

    const dados = produtos.filter(p => p.unidadeId === unidadeSelecionada.id).map(p => ({
        "Código": p.codigo,
        "Nome": p.nome,
        "Categoria": p.categoria || "-",
        "Estoque": p.estoque,
        "Mínimo": p.minimo
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, `produtos_${unidadeSelecionada.id}.xlsx`);
}

function exportarHistoricoExcel() {
    if (!temPermissao("exportar_excel")) return;

    const dados = obterHistoricoFiltrado().map(m => ({
        "Data": m.data,
        "Código": m.codigo,
        "Produto": m.produto,
        "Tipo": m.tipo.toUpperCase(),
        "Quantidade": m.quantidade,
        "Observação": m.observacao,
        "Responsável": m.usuarioResponsavel || "-"
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico");
    XLSX.writeFile(wb, `historico_${unidadeSelecionada.id}.xlsx`);
}

function atualizarSistema() {
    if (!usuarioLogado || !unidadeSelecionada) return;

    aplicarPermissoesInterface();
    atualizarOptionsUnidades();
    atualizarOptionsPerfis();
    listarCargos();
    listarProdutos();
    listarHistorico();
    listarUsuarios();
    listarPendencias();
    atualizarSelectProdutos();
    atualizarDashboard();
}

document.addEventListener("DOMContentLoaded", () => {
    iniciarSessao();
});
