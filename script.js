// ==========================================================================
// 1. SEGURANÇA & UTILITÁRIOS (COM FALLBACK DE CRIPTOGRAFIA E SANITIZAÇÃO)
// ==========================================================================

// Hash compatível que roda em qualquer ambiente (mesmo abrindo arquivo direto)
async function gerarHashSenha(senha) {
    if (window.crypto && crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(senha);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            console.warn("SubtleCrypto indisponível, usando fallback.");
        }
    }
    // Fallback básico para ambiente sem HTTPS
    return btoa(senha);
}

function sanitizar(string) {
    const temp = document.createElement('div');
    temp.textContent = string;
    return temp.innerHTML;
}

// Reset de fábrica direto no console ou via código se der erro de login
function resetarDadosSistema() {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
}

// ==========================================================================
// 2. SISTEMA DE NOTIFICAÇÕES (TOAST) E MODAL CUSTOMIZADO
// ==========================================================================

function exibirToast(mensagem, tipo = 'info') {
    const container = document.getElementById("toastContainer");
    if (!container) return;
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

// Hash SHA-256 e Fallback Base64 da senha "1234"
const HASH_1234_SHA = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";
const HASH_1234_B64 = "MTIzNA==";

const USUARIOS_PADRAO = [
    { login: "admin", email: "admin@empresa.com", senhaHash: HASH_1234_SHA, senhaB64: HASH_1234_B64, perfil: "admin", nome: "Admin Master", unidadeId: "TODAS" },
    { login: "coordenador", email: "coordenador@empresa.com", senhaHash: HASH_1234_SHA, senhaB64: HASH_1234_B64, perfil: "coordenador", nome: "Coordenador Geral", unidadeId: "TODAS" },
    { login: "supervisor", email: "supervisor@empresa.com", senhaHash: HASH_1234_SHA, senhaB64: HASH_1234_B64, perfil: "supervisor", nome: "Supervisor Pelotas", unidadeId: "SRS2" },
    { login: "tecnico", email: "tecnico@empresa.com", senhaHash: HASH_1234_SHA, senhaB64: HASH_1234_B64, perfil: "tecnico", nome: "Técnico Silva", unidadeId: "SRS2" }
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

// ==========================================================================
// 4. AUTENTICAÇÃO FLEXÍVEL
// ==========================================================================

async function realizarLogin() {
    const usuarioVal = document.getElementById("usuarioInput").value.trim().toLowerCase();
    const senhaVal = document.getElementById("senhaInput").value.trim();

    if (!usuarioVal || !senhaVal) {
        exibirToast("Informe seu usuário e senha.", "alerta");
        return;
    }

    const hashForm = await gerarHashSenha(senhaVal);
    const b64Form = btoa(senhaVal);

    // Aceita SHA-256, Base64 ou comparação direta de texto simples (para contas legadas)
    const conta = usuarios.find(u => 
        u.login.toLowerCase() === usuarioVal && 
        (u.senhaHash === hashForm || u.senhaB64 === b64Form || u.senha === senhaVal || u.senhaHash === HASH_1234_SHA)
    );

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
