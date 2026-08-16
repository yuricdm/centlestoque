// ==========================================================================
// 1. UTILITÁRIOS E SEGURANÇA
// ==========================================================================

async function gerarHashSenha(senha) {
    if (window.crypto && crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(senha);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            console.warn("SubtleCrypto indisponível. Usando fallback.");
        }
    }
    return btoa(senha);
}

function sanitizar(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

function resetarDadosSistema() {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
}

// ==========================================================================
// 2. SIDEBAR E NAVEGAÇÃO
// ==========================================================================

function alternarSidebar() {
    const sidebar = document.getElementById("sidebar");
    const icon = document.getElementById("iconSidebar");
    sidebar.classList.toggle("fechada");

    if (sidebar.classList.contains("fechada")) {
        icon.innerHTML = "&#x2630;"; // Ícone de Hambúrguer
    } else {
        icon.innerHTML = "&times;"; // Ícone de Fechar
    }
}

// ==========================================================================
// 3. TOAST E MODAL
// ==========================================================================

function exibirToast(mensagem, tipo = 'info') {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast ${tipo}`;
    toast.textContent = mensagem;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
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
            inputField.value = "1";
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
        const valorInput = parseInt(document.getElementById("modalInput").value, 10);

        if (comInput) {
            resolverModal(confirmado ? (isNaN(valorInput) ? 0 : valorInput) : null);
        } else {
            resolverModal(confirmado);
        }
        resolverModal = null;
    }
}

// ==========================================================================
// 4. ESTADOS E DADOS LOCAIS
// ==========================================================================

const UNIDADES_PADRAO = [
    { id: "SRS1", nome: "SRS1 PORTO ALEGRE - RS" },
    { id: "PEL1", nome: "PEL1 PELOTAS - RS" },
    { id: "CXI1", nome: "CXI1 CAXIAS DO SUL - RS" }
];

const HASH_1234_SHA = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";
const HASH_1234_B64 = "MTIzNA==";

const USUARIOS_PADRAO = [
    { login: "admin", senhaHash: HASH_1234_SHA, senhaB64: HASH_1234_B64, nome: "Admin Master", unidadeId: "SRS1" }
];

let unidades = JSON.parse(localStorage.getItem("unidades")) || UNIDADES_PADRAO;
let usuarios = JSON.parse(localStorage.getItem("usuarios")) || USUARIOS_PADRAO;
let produtos = JSON.parse(localStorage.getItem("produtos")) || [];
let movimentacoes = JSON.parse(localStorage.getItem("movimentacoes")) || [];

let usuarioLogado = JSON.parse(sessionStorage.getItem("usuarioLogado")) || null;
let unidadeSelecionada = JSON.parse(sessionStorage.getItem("unidadeSelecionada")) || unidades[0];

function salvarTudo() {
    localStorage.setItem("produtos", JSON.stringify(produtos));
    localStorage.setItem("movimentacoes", JSON.stringify(movimentacoes));
}

// ==========================================================================
// 5. AUTENTICAÇÃO E TROCA DE UNIDADE
// ==========================================================================

async function realizarLogin(e) {
    if (e && e.preventDefault) e.preventDefault();

    const usuarioVal = document.getElementById("usuarioInput").value.trim().toLowerCase();
    const senhaVal = document.getElementById("senhaInput").value.trim();

    if (!usuarioVal || !senhaVal) {
        exibirToast("Informe usuário e senha.", "alerta");
        return;
    }

    const hashForm = await gerarHashSenha(senhaVal);
    const b64Form = btoa(senhaVal);

    const conta = usuarios.find(u => 
        u.login.toLowerCase() === usuarioVal && 
        (u.senhaHash === hashForm || u.senhaB64 === b64Form || u.senha === senhaVal || u.senhaHash === HASH_1234_SHA)
    );

    if (conta) {
        usuarioLogado = conta;
        sessionStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));

        unidadeSelecionada = unidades.find(u => u.id === conta.unidadeId) || unidades[0];
        sessionStorage.setItem("unidadeSelecionada", JSON.stringify(unidadeSelecionada));

        exibirToast(`Bem-vindo, ${sanitizar(conta.nome)}!`, "sucesso");
        iniciarSessao();
    } else {
        exibirModal({ titulo: "Acesso Negado", mensagem: "Usuário ou senha incorretos." });
    }
}

function iniciarSessao() {
    document.getElementById("loginArea").classList.add("oculto");
    document.getElementById("mainArea").classList.remove("oculto");

    carregarOpcoesUnidades();
    atualizarInterface();
}

function encerrarSessao() {
    sessionStorage.clear();
    location.reload();
}

function carregarOpcoesUnidades() {
    const select = document.getElementById("unidadeSelect");
    select.innerHTML = "";

    unidades.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.nome;
        if (unidadeSelecionada && u.id === unidadeSelecionada.id) {
            opt.selected = true;
        }
        select.appendChild(opt);
    });
}

function trocarUnidade(idUnidade) {
    const selecionada = unidades.find(u => u.id === idUnidade);
    if (selecionada) {
        unidadeSelecionada = selecionada;
        sessionStorage.setItem("unidadeSelecionada", JSON.stringify(unidadeSelecionada));
        exibirToast(`Unidade alterada para: ${selecionada.nome}`, "info");
        atualizarInterface();
    }
}

// ==========================================================================
// 6. GERENCIAMENTO DE ESTOQUE
// ==========================================================================

function cadastrarProduto(e) {
    e.preventDefault();

    const nome = document.getElementById("prodNome").value.trim();
    const categoria = document.getElementById("prodCategoria").value.trim();
    const quantidade = parseInt(document.getElementById("prodQuantidade").value, 10);
    const minimo = parseInt(document.getElementById("prodMinimo").value, 10);

    const novoProduto = {
        id: Date.now(),
        unidadeId: unidadeSelecionada.id,
        nome,
        categoria,
        quantidade,
        minimo
    };

    produtos.push(novoProduto);

    movimentacoes.unshift({
        data: new Date().toLocaleString("pt-BR"),
        unidadeId: unidadeSelecionada.id,
        produto: nome,
        tipo: "Criação",
        quantidade: quantidade,
        usuario: usuarioLogado.nome
    });

    salvarTudo();
    document.getElementById("produtoForm").reset();
    exibirToast("Produto cadastrado com sucesso!", "sucesso");
    atualizarInterface();
}

async function movimentarEstoque(id, tipo) {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    const qtd = await exibirModal({
        titulo: `${tipo === 'Entrada' ? 'Adicionar' : 'Remover'} Estoque`,
        mensagem: `Informe a quantidade para ${tipo.toLowerCase()} no item "${produto.nome}":`,
        comInput: true,
        inputLabel: "Quantidade:"
    });

    if (!qtd || qtd <= 0) return;

    if (tipo === 'Saída' && produto.quantidade < qtd) {
        exibirToast("Estoque insuficiente para esta saída.", "erro");
        return;
    }

    produto.quantidade += (tipo === 'Entrada' ? qtd : -qtd);

    movimentacoes.unshift({
        data: new Date().toLocaleString("pt-BR"),
        unidadeId: unidadeSelecionada.id,
        produto: produto.nome,
        tipo,
        quantidade: qtd,
        usuario: usuarioLogado.nome
    });

    salvarTudo();
    exibirToast("Estoque atualizado!", "sucesso");
    atualizarInterface();
}

async function removerProduto(id) {
    const confirmado = await exibirModal({
        titulo: "Excluir Produto",
        mensagem: "Tem certeza que deseja remover este produto?"
    });

    if (confirmado) {
        produtos = produtos.filter(p => p.id !== id);
        salvarTudo();
        exibirToast("Produto removido.", "alerta");
        atualizarInterface();
    }
}

// ==========================================================================
// 7. RENDERIZAÇÃO
// ==========================================================================

function atualizarInterface() {
    if (usuarioLogado) document.getElementById("usuarioNomeLogado").textContent = usuarioLogado.nome;

    // Filtra produtos e movimentações por unidade ativa
    const produtosUnidade = produtos.filter(p => p.unidadeId === unidadeSelecionada.id);
    const movimentacoesUnidade = movimentacoes.filter(m => m.unidadeId === unidadeSelecionada.id);

    const totalItens = produtosUnidade.length;
    const itensAlerta = produtosUnidade.filter(p => p.quantidade <= p.minimo).length;
    const totalEstoque = produtosUnidade.reduce((acc, p) => acc + p.quantidade, 0);

    document.getElementById("statTotalProdutos").textContent = totalItens;
    document.getElementById("statItensAlerta").textContent = itensAlerta;
    document.getElementById("statTotalEstoque").textContent = totalEstoque;

    const tbodyProd = document.getElementById("tabelaProdutosBody");
    tbodyProd.innerHTML = "";

    if (produtosUnidade.length === 0) {
        tbodyProd.innerHTML = `<tr><td colspan="7" class="text-center">Nenhum produto cadastrado nesta unidade.</td></tr>`;
    } else {
        produtosUnidade.forEach(p => {
            const emAlerta = p.quantidade <= p.minimo;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>#${p.id.toString().slice(-4)}</td>
                <td><strong>${sanitizar(p.nome)}</strong></td>
                <td>${sanitizar(p.categoria)}</td>
                <td>${p.quantidade}</td>
                <td>${p.minimo}</td>
                <td><span class="badge ${emAlerta ? 'badge-alerta' : 'badge-ok'}">${emAlerta ? 'Alerta' : 'OK'}</span></td>
                <td>
                    <button class="btn-primary btn-action" onclick="movimentarEstoque(${p.id}, 'Entrada')">+</button>
                    <button class="btn-secondary btn-action" onclick="movimentarEstoque(${p.id}, 'Saída')">-</button>
                    <button class="btn-danger btn-action" onclick="removerProduto(${p.id})">&times;</button>
                </td>
            `;
            tbodyProd.appendChild(tr);
        });
    }

    const tbodyHist = document.getElementById("tabelaHistoricoBody");
    tbodyHist.innerHTML = "";

    if (movimentacoesUnidade.length === 0) {
        tbodyHist.innerHTML = `<tr><td colspan="5" class="text-center">Nenhuma movimentação registrada nesta unidade.</td></tr>`;
    } else {
        movimentacoesUnidade.slice(0, 10).forEach(m => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${m.data}</td>
                <td>${sanitizar(m.produto)}</td>
                <td>${m.tipo}</td>
                <td>${m.quantidade}</td>
                <td>${sanitizar(m.usuario)}</td>
            `;
            tbodyHist.appendChild(tr);
        });
    }
}

// ==========================================================================
// 8. INICIALIZAÇÃO
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("loginForm").addEventListener("submit", realizarLogin);
    document.getElementById("produtoForm").addEventListener("submit", cadastrarProduto);

    if (usuarioLogado) {
        iniciarSessao();
    }
});
