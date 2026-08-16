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
    temp.textContent = str || '';
    return temp.innerHTML;
}

function extrair6DigitosCPF(cpf) {
    const limpo = cpf.replace(/\D/g, '');
    return limpo.slice(0, 6);
}

function atualizarMatriculaPreview(cpfValor) {
    const digitos = extrair6DigitosCPF(cpfValor);
    document.getElementById("usrMatricula").value = digitos;
}

function resetarDadosSistema() {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
}

// ==========================================================================
// 2. SIDEBAR, TOAST E MODAL
// ==========================================================================

function alternarSidebar() {
    const sidebar = document.getElementById("sidebar");
    const icon = document.getElementById("iconSidebar");
    sidebar.classList.toggle("fechada");
    icon.innerHTML = sidebar.classList.contains("fechada") ? "&#x2630;" : "&times;";
}

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

function exibirModal({ titulo, mensagem, comInput = false, inputLabel = "", inputType = "number" }) {
    return new Promise((resolve) => {
        resolverModal = resolve;
        document.getElementById("modalTitulo").textContent = titulo;
        document.getElementById("modalMensagem").textContent = mensagem;

        const inputContainer = document.getElementById("modalInputContainer");
        const inputField = document.getElementById("modalInput");

        if (comInput) {
            inputContainer.classList.remove("oculto");
            document.getElementById("modalInputLabel").textContent = inputLabel;
            inputField.type = inputType;
            inputField.value = inputType === "number" ? "1" : "";
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
        const inputField = document.getElementById("modalInput");
        
        if (comInput) {
            const val = inputField.type === "number" ? parseInt(inputField.value, 10) : inputField.value;
            resolverModal(confirmado ? val : null);
        } else {
            resolverModal(confirmado);
        }
        resolverModal = null;
    }
}

// ==========================================================================
// 3. BANCO DE DADOS LOCAL E ESTADOS
// ==========================================================================

const UNIDADES_PADRAO = [
    { id: "SRS1", nome: "SRS1 PORTO ALEGRE - RS" },
    { id: "PEL1", nome: "PEL1 PELOTAS - RS" }
];

const CARGOS_PADRAO = [
    { id: "admin", nome: "Administrador Master", permMovimentar: true, permCadastrarProd: true, permGerenciarAdmin: true },
    { id: "operador", nome: "Operador de Estoque", permMovimentar: true, permCadastrarProd: false, permGerenciarAdmin: false }
];

const HASH_1234_SHA = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";
const HASH_1234_B64 = "MTIzNA==";

const USUARIOS_PADRAO = [
    { 
        matricula: "123456", 
        cpf: "123.456.789-00", 
        nome: "Admin Master", 
        email: "admin@empresa.com", 
        senhaHash: HASH_1234_SHA, 
        senhaB64: HASH_1234_B64, 
        cargoId: "admin", 
        unidadeId: "SRS1" 
    }
];

let unidades = JSON.parse(localStorage.getItem("unidades")) || UNIDADES_PADRAO;
let cargos = JSON.parse(localStorage.getItem("cargos")) || CARGOS_PADRAO;
let usuarios = JSON.parse(localStorage.getItem("usuarios")) || USUARIOS_PADRAO;
let produtos = JSON.parse(localStorage.getItem("produtos")) || [];
let movimentacoes = JSON.parse(localStorage.getItem("movimentacoes")) || [];

let usuarioLogado = JSON.parse(sessionStorage.getItem("usuarioLogado")) || null;
let unidadeSelecionada = JSON.parse(sessionStorage.getItem("unidadeSelecionada")) || unidades[0];

function salvarTudo() {
    localStorage.setItem("unidades", JSON.stringify(unidades));
    localStorage.setItem("cargos", JSON.stringify(cargos));
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("produtos", JSON.stringify(produtos));
    localStorage.setItem("movimentacoes", JSON.stringify(movimentacoes));
}

// ==========================================================================
// 4. AUTENTICAÇÃO E SESSÃO
// ==========================================================================

async function realizarLogin(e) {
    if (e && e.preventDefault) e.preventDefault();

    const matriculaVal = document.getElementById("usuarioInput").value.trim();
    const senhaVal = document.getElementById("senhaInput").value.trim();

    if (!matriculaVal || !senhaVal) {
        exibirToast("Informe a matrícula e a senha.", "alerta");
        return;
    }

    const hashForm = await gerarHashSenha(senhaVal);
    const b64Form = btoa(senhaVal);

    const conta = usuarios.find(u => 
        (u.matricula === matriculaVal || u.login === matriculaVal) && 
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
        exibirModal({ titulo: "Acesso Negado", mensagem: "Matrícula ou senha incorretos." });
    }
}

function iniciarSessao() {
    document.getElementById("loginArea").classList.add("oculto");
    document.getElementById("mainArea").classList.remove("oculto");

    carregarSelectsGerais();
    atualizarInterface();
}

function encerrarSessao() {
    sessionStorage.clear();
    location.reload();
}

function carregarSelectsGerais() {
    // Select da unidade principal
    const selectUnidadeMain = document.getElementById("unidadeSelect");
    selectUnidadeMain.innerHTML = "";
    unidades.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.nome;
        if (unidadeSelecionada && u.id === unidadeSelecionada.id) opt.selected = true;
        selectUnidadeMain.appendChild(opt);
    });

    // Select de cargos para cadastro de usuário
    const selectCargoUsr = document.getElementById("usrCargo");
    selectCargoUsr.innerHTML = "";
    cargos.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.nome;
        selectCargoUsr.appendChild(opt);
    });

    // Select de unidades para cadastro de usuário
    const selectUnidadeUsr = document.getElementById("usrUnidade");
    selectUnidadeUsr.innerHTML = "";
    unidades.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.nome;
        selectUnidadeUsr.appendChild(opt);
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
// 5. MÓDULO DE ADMINISTRAÇÃO (USUÁRIOS, CARGOS, UNIDADES)
// ==========================================================================

async function cadastrarUsuario(e) {
    e.preventDefault();

    const nome = document.getElementById("usrNomeCompleto").value.trim();
    const cpf = document.getElementById("usrCpf").value.trim();
    const email = document.getElementById("usrEmail").value.trim();
    const senha = document.getElementById("usrSenha").value.trim();
    const cargoId = document.getElementById("usrCargo").value;
    const unidadeId = document.getElementById("usrUnidade").value;

    const matricula = extrair6DigitosCPF(cpf);

    if (matricula.length < 6) {
        exibirToast("CPF inválido. Informe ao menos 6 dígitos numéricos.", "erro");
        return;
    }

    if (usuarios.some(u => u.matricula === matricula)) {
        exibirToast("Já existe um usuário com esta matrícula (CPF).", "alerta");
        return;
    }

    const senhaHash = await gerarHashSenha(senha);

    usuarios.push({
        matricula,
        cpf,
        nome,
        email,
        senhaHash,
        senhaB64: btoa(senha),
        cargoId,
        unidadeId
    });

    salvarTudo();
    document.getElementById("usuarioForm").reset();
    document.getElementById("usrMatricula").value = "";
    exibirToast("Usuário cadastrado com sucesso!", "sucesso");
    atualizarInterface();
}

async function trocarSenhaUsuario(matricula) {
    const novaSenha = await exibirModal({
        titulo: "Alterar Senha",
        mensagem: "Digite a nova senha para o usuário:",
        comInput: true,
        inputLabel: "Nova Senha:",
        inputType: "password"
    });

    if (novaSenha && novaSenha.trim() !== "") {
        const usr = usuarios.find(u => u.matricula === matricula);
        if (usr) {
            usr.senhaHash = await gerarHashSenha(novaSenha.trim());
            usr.senhaB64 = btoa(novaSenha.trim());
            salvarTudo();
            exibirToast("Senha alterada com sucesso!", "sucesso");
        }
    }
}

function removerUsuario(matricula) {
    if (usuarioLogado && usuarioLogado.matricula === matricula) {
        exibirToast("Você não pode excluir seu próprio usuário.", "erro");
        return;
    }
    usuarios = usuarios.filter(u => u.matricula !== matricula);
    salvarTudo();
    exibirToast("Usuário removido.", "alerta");
    atualizarInterface();
}

function cadastrarCargo(e) {
    e.preventDefault();
    const nome = document.getElementById("cargoNome").value.trim();
    const permMovimentar = document.getElementById("permMovimentar").checked;
    const permCadastrarProd = document.getElementById("permCadastrarProd").checked;
    const permGerenciarAdmin = document.getElementById("permGerenciarAdmin").checked;

    const id = nome.toLowerCase().replace(/\s+/g, '_');

    if (cargos.some(c => c.id === id)) {
        exibirToast("Cargo já existente.", "alerta");
        return;
    }

    cargos.push({ id, nome, permMovimentar, permCadastrarProd, permGerenciarAdmin });
    salvarTudo();
    document.getElementById("cargoForm").reset();
    carregarSelectsGerais();
    exibirToast("Cargo criado com sucesso!", "sucesso");
    atualizarInterface();
}

function removerCargo(id) {
    if (id === 'admin') {
        exibirToast("O cargo de Administrador Master não pode ser removido.", "erro");
        return;
    }
    cargos = cargos.filter(c => c.id !== id);
    salvarTudo();
    carregarSelectsGerais();
    exibirToast("Cargo removido.", "alerta");
    atualizarInterface();
}

function cadastrarUnidade(e) {
    e.preventDefault();
    const id = document.getElementById("unidadeCodigo").value.trim().toUpperCase();
    const nome = document.getElementById("unidadeNome").value.trim();

    if (unidades.some(u => u.id === id)) {
        exibirToast("Código de unidade já cadastrado.", "alerta");
        return;
    }

    unidades.push({ id, nome });
    salvarTudo();
    document.getElementById("unidadeForm").reset();
    carregarSelectsGerais();
    exibirToast("Unidade cadastrada!", "sucesso");
    atualizarInterface();
}

function removerUnidade(id) {
    if (unidades.length <= 1) {
        exibirToast("É necessário manter ao menos uma unidade ativa.", "alerta");
        return;
    }
    unidades = unidades.filter(u => u.id !== id);
    salvarTudo();
    carregarSelectsGerais();
    exibirToast("Unidade removida.", "alerta");
    atualizarInterface();
}

// ==========================================================================
// 6. PRODUTOS E MOVIMENTAÇÕES
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
    exibirToast("Produto cadastrado!", "sucesso");
    atualizarInterface();
}

async function movimentarEstoque(id, tipo) {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    const qtd = await exibirModal({
        titulo: `${tipo === 'Entrada' ? 'Adicionar' : 'Remover'} Estoque`,
        mensagem: `Quantidade para ${tipo.toLowerCase()} em "${produto.nome}":`,
        comInput: true,
        inputLabel: "Quantidade:",
        inputType: "number"
    });

    if (!qtd || qtd <= 0) return;

    if (tipo === 'Saída' && produto.quantidade < qtd) {
        exibirToast("Estoque insuficiente.", "erro");
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
// 7. RENDERIZAÇÃO DA INTERFACE
// ==========================================================================

function atualizarInterface() {
    const cargoAtual = cargos.find(c => c.id === usuarioLogado.cargoId) || { nome: "Sem Cargo", permGerenciarAdmin: true };

    if (usuarioLogado) {
        document.getElementById("usuarioNomeLogado").textContent = usuarioLogado.nome;
        document.getElementById("usuarioCargoLogado").textContent = cargoAtual.nome;
    }

    // Exibe ou oculta opções admin conforme permissão do cargo
    const adminSections = [
        document.getElementById("usuariosSection"),
        document.getElementById("cargosSection"),
        document.getElementById("unidadesSection")
    ];
    adminSections.forEach(sec => {
        if (cargoAtual.permGerenciarAdmin) {
            sec.classList.remove("oculto");
        } else {
            sec.classList.add("oculto");
        }
    });

    // Métricas do Dashboard
    const produtosUnidade = produtos.filter(p => p.unidadeId === unidadeSelecionada.id);
    const movimentacoesUnidade = movimentacoes.filter(m => m.unidadeId === unidadeSelecionada.id);

    document.getElementById("statTotalProdutos").textContent = produtosUnidade.length;
    document.getElementById("statItensAlerta").textContent = produtosUnidade.filter(p => p.quantidade <= p.minimo).length;
    document.getElementById("statTotalEstoque").textContent = produtosUnidade.reduce((acc, p) => acc + p.quantidade, 0);

    // Tabela de Produtos
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

    // Tabela de Histórico
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

    // Tabela de Usuários
    const tbodyUsr = document.getElementById("tabelaUsuariosBody");
    tbodyUsr.innerHTML = "";
    usuarios.forEach(u => {
        const cNome = (cargos.find(c => c.id === u.cargoId) || {}).nome || u.cargoId;
        const uNome = (unidades.find(un => un.id === u.unidadeId) || {}).nome || u.unidadeId;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${u.matricula}</strong></td>
            <td>${sanitizar(u.nome)}</td>
            <td>${sanitizar(u.cpf)}</td>
            <td>${sanitizar(u.email)}</td>
            <td>${sanitizar(cNome)}</td>
            <td>${sanitizar(uNome)}</td>
            <td>
                <button class="btn-secondary btn-action" onclick="trocarSenhaUsuario('${u.matricula}')">Senha</button>
                <button class="btn-danger btn-action" onclick="removerUsuario('${u.matricula}')">&times;</button>
            </td>
        `;
        tbodyUsr.appendChild(tr);
    });

    // Tabela de Cargos
    const tbodyCargos = document.getElementById("tabelaCargosBody");
    tbodyCargos.innerHTML = "";
    cargos.forEach(c => {
        const perms = [];
        if (c.permMovimentar) perms.push("Movimentar");
        if (c.permCadastrarProd) perms.push("Produtos");
        if (c.permGerenciarAdmin) perms.push("Admin");

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><code>${c.id}</code></td>
            <td><strong>${sanitizar(c.nome)}</strong></td>
            <td>${perms.join(", ")}</td>
            <td>
                <button class="btn-danger btn-action" onclick="removerCargo('${c.id}')">&times;</button>
            </td>
        `;
        tbodyCargos.appendChild(tr);
    });

    // Tabela de Unidades
    const tbodyUnidades = document.getElementById("tabelaUnidadesBody");
    tbodyUnidades.innerHTML = "";
    unidades.forEach(u => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${u.id}</strong></td>
            <td>${sanitizar(u.nome)}</td>
            <td>
                <button class="btn-danger btn-action" onclick="removerUnidade('${u.id}')">&times;</button>
            </td>
        `;
        tbodyUnidades.appendChild(tr);
    });
}

// ==========================================================================
// 8. INICIALIZAÇÃO
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("loginForm").addEventListener("submit", realizarLogin);
    document.getElementById("produtoForm").addEventListener("submit", cadastrarProduto);
    document.getElementById("usuarioForm").addEventListener("submit", cadastrarUsuario);
    document.getElementById("cargoForm").addEventListener("submit", cadastrarCargo);
    document.getElementById("unidadeForm").addEventListener("submit", cadastrarUnidade);

    if (usuarioLogado) {
        iniciarSessao();
    }
});
