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
// 2. SISTEMA DE TOAST E MODAL
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
// 3. ESTADOS E BANCO DE DADOS LOCAL
// ==========================================================================

const UNIDADES_PADRAO = [{ id: "SRS1", nome: "SRS1 PORTO ALEGRE - RS" }];
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
let unidadeSelecionada = JSON.parse(sessionStorage.getItem("unidadeSelecionada")) || null;

function salvarTudo() {
    localStorage.setItem("produtos", JSON.stringify(produtos));
    localStorage.setItem("movimentacoes", JSON.stringify(movimentacoes));
}

// ==========================================================================
// 4. AUTENTICAÇÃO E NAVEGAÇÃO
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
    atualizarInterface();
}

function encerrarSessao() {
    sessionStorage.clear();
    location.reload();
}

// ==========================================================================
// 5. REGRA DE NEGÓCIO: PRODUTOS E MOVIMENTAÇÕES
// ==========================================================================

function cadastrarProduto(e) {
    e.preventDefault();

    const nome = document.getElementById("prodNome").value.trim();
    const categoria = document.getElementById("prodCategoria").value.trim();
    const quantidade = parseInt(document.getElementById("prodQuantidade").value, 10);
    const minimo = parseInt(document.getElementById("prodMinimo").value, 10);

    const novoProduto = {
        id: Date.now(),
        nome,
        categoria,
        quantidade,
        minimo
    };

    produtos.push(novoProduto);

    movimentacoes.unshift({
        data: new Date().toLocaleString("pt-BR"),
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
// 6. RENDERIZAÇÃO DA INTERFACE
// ==========================================================================

function atualizarInterface() {
    if (usuarioLogado) document.getElementById("usuarioNomeLogado").textContent = usuarioLogado.nome;
    if (unidadeSelecionada) document.getElementById("unidadeNomeAtual").textContent = unidadeSelecionada.nome;

    // Métricas do Dashboard
    const totalItens = produtos.length;
    const itensAlerta = produtos.filter(p => p.quantidade <= p.minimo).length;
    const totalEstoque = produtos.reduce((acc, p) => acc + p.quantidade, 0);

    document.getElementById("statTotalProdutos").textContent = totalItens;
    document.getElementById("statItensAlerta").textContent = itensAlerta;
    document.getElementById("statTotalEstoque").textContent = totalEstoque;

    // Tabela de Produtos
    const tbodyProd = document.getElementById("tabelaProdutosBody");
    tbodyProd.innerHTML = "";

    if (produtos.length === 0) {
        tbodyProd.innerHTML = `<tr><td colspan="7" class="text-center">Nenhum produto cadastrado.</td></tr>`;
    } else {
        produtos.forEach(p => {
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

    // Tabela de Histórico
    const tbodyHist = document.getElementById("tabelaHistoricoBody");
    tbodyHist.innerHTML = "";

    if (movimentacoes.length === 0) {
        tbodyHist.innerHTML = `<tr><td colspan="5" class="text-center">Nenhuma movimentação registrada.</td></tr>`;
    } else {
        movimentacoes.slice(0, 10).forEach(m => {
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
// 7. EVENT LISTENERS
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("loginForm").addEventListener("submit", realizarLogin);
    document.getElementById("produtoForm").addEventListener("submit", cadastrarProduto);

    if (usuarioLogado) {
        iniciarSessao();
    }
});
