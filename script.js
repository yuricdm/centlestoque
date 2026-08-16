// --- ESTADO DA APLICAÇÃO ---
let usuarios = [];
let cargos = [];
let unidades = [];
let produtos = [];
let usuarioLogado = null;

// --- UTILITÁRIOS E CRIPTOGRAFIA ---
async function gerarHashSenha(senha) {
    const encoder = new TextEncoder();
    const data = encoder.encode(senha);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function exibirToast(mensagem, tipo = 'sucesso') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerText = mensagem;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// --- INICIALIZAÇÃO E DADOS INICIAIS ---
async function init() {
    carregarDadosStorage();

    if (cargos.length === 0) {
        cargos = [
            { id: 'admin', nome: 'Administrador Master' },
            { id: 'operador', nome: 'Operador de Estoque' }
        ];
    }

    if (unidades.length === 0) {
        unidades = [
            { id: 'un-01', nome: 'Depósito Central' },
            { id: 'un-02', nome: 'Filial Zona Sul' }
        ];
    }

    if (usuarios.length === 0) {
        const senhaPadraoHash = await gerarHashSenha('admin123');
        usuarios = [{
            nome: 'Admin Master',
            cpf: '00000000000',
            matricula: '00000000000',
            email: 'admin@sistema.com',
            cargoId: 'admin',
            unidadesIds: ['un-01', 'un-02'],
            senhaHash: senhaPadraoHash,
            senhaB64: btoa('admin123')
        }];
    }

    salvarTudo();
    verificarSessao();
}

function carregarDadosStorage() {
    usuarios = JSON.parse(localStorage.getItem('sys_usuarios')) || [];
    cargos = JSON.parse(localStorage.getItem('sys_cargos')) || [];
    unidades = JSON.parse(localStorage.getItem('sys_unidades')) || [];
    produtos = JSON.parse(localStorage.getItem('sys_produtos')) || [];
}

function salvarTudo() {
    localStorage.setItem('sys_usuarios', JSON.stringify(usuarios));
    localStorage.setItem('sys_cargos', JSON.stringify(cargos));
    localStorage.setItem('sys_unidades', JSON.stringify(unidades));
    localStorage.setItem('sys_produtos', JSON.stringify(produtos));
}

// --- AUTENTICAÇÃO E SESSÃO ---
async function realizarLogin(e) {
    e.preventDefault();
    const matriculaVal = document.getElementById('login-matricula').value.trim();
    const senhaVal = document.getElementById('login-senha').value;

    const hashForm = await gerarHashSenha(senhaVal);
    const b64Form = btoa(senhaVal);

    const conta = usuarios.find(u => 
        (u.matricula === matriculaVal || u.email === matriculaVal) && 
        (u.senhaHash === hashForm || u.senhaB64 === b64Form)
    );

    if (conta) {
        usuarioLogado = conta;
        sessionStorage.setItem('sys_sessao', JSON.stringify(conta.matricula));
        configurarInterfaceSessao();
        exibirToast("Login realizado com sucesso!");
    } else {
        exibirToast("Credenciais inválidas. Verifique os dados.", "erro");
    }
}

function verificarSessao() {
    const sessao = sessionStorage.getItem('sys_sessao');
    if (sessao) {
        const matricula = JSON.parse(sessao);
        usuarioLogado = usuarios.find(u => u.matricula === matricula);
    }

    if (usuarioLogado) {
        configurarInterfaceSessao();
    } else {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('app-screen').classList.remove('active');
    }
}

function logout() {
    sessionStorage.removeItem('sys_sessao');
    usuarioLogado = null;
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('app-screen').classList.remove('active');
    exibirToast("Sessão encerrada.", "alerta");
}

function configurarInterfaceSessao() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');
    
    document.getElementById('lbl-user-nome').innerText = usuarioLogado.nome;
    const cg = cargos.find(c => c.id === usuarioLogado.cargoId);
    document.getElementById('lbl-user-cargo').innerText = cg ? cg.nome : usuarioLogado.cargoId;

    carregarSelectsGerais();
    atualizarInterface();
}

// --- NAVEGAÇÃO ---
document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

        e.target.classList.add('active');
        const targetId = e.target.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
    });
});

// --- GERENCIAMENTO DE USUÁRIOS ---
async function salvarUsuario(e) {
    e.preventDefault();
    const editingMatricula = document.getElementById('usr-editing-matricula').value;
    const nome = document.getElementById('usr-nome').value.trim();
    const cpf = document.getElementById('usr-cpf').value.replace(/\D/g, '');
    const email = document.getElementById('usr-email').value.trim();
    const cargoId = document.getElementById('usr-cargo').value;
    const senha = document.getElementById('usr-senha').value;
    const selectUnidades = document.getElementById('usr-unidades');
    const unidadesIds = Array.from(selectUnidades.selectedOptions).map(opt => opt.value);

    const matricula = cpf; 

    if (editingMatricula) {
        const usrIndex = usuarios.findIndex(u => u.matricula === editingMatricula);
        if (usrIndex !== -1) {
            usuarios[usrIndex].nome = nome;
            usuarios[usrIndex].cpf = cpf;
            usuarios[usrIndex].matricula = matricula;
            usuarios[usrIndex].email = email;
            usuarios[usrIndex].cargoId = cargoId;
            usuarios[usrIndex].unidadesIds = unidadesIds;

            if (senha) {
                usuarios[usrIndex].senhaHash = await gerarHashSenha(senha);
                usuarios[usrIndex].senhaB64 = btoa(senha);
            }

            salvarTudo();
            exibirToast("Usuário atualizado com sucesso!");
            cancelarEdicaoUsuario();
            atualizarInterface();
        }
    } else {
        if (usuarios.some(u => u.matricula === matricula)) {
            exibirToast("Já existe um usuário cadastrado com este CPF.", "erro");
            return;
        }
        if (!senha) {
            exibirToast("A senha é obrigatória para novos usuários.", "alerta");
            return;
        }

        const novoUsuario = {
            nome,
            cpf,
            matricula,
            email,
            cargoId,
            unidadesIds,
            senhaHash: await gerarHashSenha(senha),
            senhaB64: btoa(senha)
        };

        usuarios.push(novoUsuario);
        salvarTudo();
        exibirToast("Usuário cadastrado com sucesso!");
        document.getElementById('form-usuario').reset();
        atualizarInterface();
    }
}

function prepararEdicaoUsuario(matricula) {
    const usr = usuarios.find(u => u.matricula === matricula);
    if (!usr) return;

    document.getElementById('usr-editing-matricula').value = usr.matricula;
    document.getElementById('usr-nome').value = usr.nome;
    document.getElementById('usr-cpf').value = usr.cpf;
    document.getElementById('usr-email').value = usr.email;
    document.getElementById('usr-cargo').value = usr.cargoId;
    document.getElementById('usr-senha').value = '';

    const selectUnidades = document.getElementById('usr-unidades');
    Array.from(selectUnidades.options).forEach(opt => {
        opt.selected = usr.unidadesIds.includes(opt.value);
    });

    document.getElementById('btn-cancelar-usr').style.display = 'inline-block';
}

function cancelarEdicaoUsuario() {
    document.getElementById('usr-editing-matricula').value = '';
    document.getElementById('form-usuario').reset();
    document.getElementById('btn-cancelar-usr').style.display = 'none';
}

function removerUsuario(matricula) {
    if (usuarioLogado && usuarioLogado.matricula === matricula) {
        exibirToast("Você não pode remover a si mesmo da sessão atual.", "erro");
        return;
    }
    usuarios = usuarios.filter(u => u.matricula !== matricula);
    salvarTudo();
    exibirToast("Usuário removido.", "alerta");
    atualizarInterface();
}

// --- GERENCIAMENTO DE CARGOS & UNIDADES ---
function salvarCargo(e) {
    e.preventDefault();
    const id = document.getElementById('cargo-id').value.trim().toLowerCase();
    const nome = document.getElementById('cargo-nome').value.trim();

    if (cargos.some(c => c.id === id)) {
        exibirToast("ID de cargo já existente.", "erro");
        return;
    }

    cargos.push({ id, nome });
    salvarTudo();
    carregarSelectsGerais();
    atualizarInterface();
    document.getElementById('form-cargo').reset();
    exibirToast("Cargo criado!");
}

function removerCargo(id) {
    if (id === 'admin') {
        exibirToast("O cargo de Administrador Master não pode ser removido.", "erro");
        return;
    }
    const emUso = usuarios.some(u => u.cargoId === id);
    if (emUso) {
        exibirToast("Não é possível remover: existem usuários associados a este cargo.", "alerta");
        return;
    }
    cargos = cargos.filter(c => c.id !== id);
    salvarTudo();
    carregarSelectsGerais();
    exibirToast("Cargo removido.", "alerta");
    atualizarInterface();
}

function salvarUnidade(e) {
    e.preventDefault();
    const id = document.getElementById('unidade-id').value.trim().toLowerCase();
    const nome = document.getElementById('unidade-nome').value.trim();

    if (unidades.some(u => u.id === id)) {
        exibirToast("ID de unidade já existente.", "erro");
        return;
    }

    unidades.push({ id, nome });
    salvarTudo();
    carregarSelectsGerais();
    atualizarInterface();
    document.getElementById('form-unidade').reset();
    exibirToast("Unidade criada!");
}

function removerUnidade(id) {
    const emUsoProdutos = produtos.some(p => p.unidadeId === id);
    const emUsoUsuarios = usuarios.some(u => u.unidadesIds.includes(id));

    if (emUsoProdutos || emUsoUsuarios) {
        exibirToast("Incapaz de excluir: unidade vinculada a produtos ou permissões de usuário.", "alerta");
        return;
    }

    unidades = unidades.filter(u => u.id !== id);
    salvarTudo();
    carregarSelectsGerais();
    exibirToast("Unidade removida.", "alerta");
    atualizarInterface();
}

// --- GERENCIAMENTO DE PRODUTOS ---
function salvarProduto(e) {
    e.preventDefault();
    const id = document.getElementById('prod-id').value.trim();
    const nome = document.getElementById('prod-nome').value.trim();
    const quantidade = parseInt(document.getElementById('prod-qtd').value);
    const unidadeId = document.getElementById('prod-unidade').value;

    const idx = produtos.findIndex(p => p.id === id);
    if (idx !== -1) {
        produtos[idx] = { id, nome, quantidade, unidadeId };
        exibirToast("Produto atualizado!");
    } else {
        produtos.push({ id, nome, quantidade, unidadeId });
        exibirToast("Produto adicionado!");
    }

    salvarTudo();
    document.getElementById('form-produto').reset();
    atualizarInterface();
}

function removerProduto(id) {
    produtos = produtos.filter(p => p.id !== id);
    salvarTudo();
    exibirToast("Produto removido.", "alerta");
    atualizarInterface();
}

// --- INTERFACE DE USUÁRIO & RENDERIZAÇÃO ---
function carregarSelectsGerais() {
    const selCargo = document.getElementById('usr-cargo');
    selCargo.innerHTML = cargos.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

    const selUnUsr = document.getElementById('usr-unidades');
    selUnUsr.innerHTML = unidades.map(u => `<option value="${u.id}">${u.nome}</option>`).join('');

    const selUnProd = document.getElementById('prod-unidade');
    selUnProd.innerHTML = unidades.map(u => `<option value="${u.id}">${u.nome}</option>`).join('');
}

function atualizarInterface() {
    // Renderizar Tabela de Usuários
    const tbUsuarios = document.getElementById('tb-usuarios');
    tbUsuarios.innerHTML = '';
    usuarios.forEach(u => {
        const cg = cargos.find(c => c.id === u.cargoId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.matricula}</td>
            <td>${u.nome}</td>
            <td>${u.email}</td>
            <td><span class="badge">${cg ? cg.nome : u.cargoId}</span></td>
            <td class="actions">
                <button class="btn btn-secondary btn-edit-usr">Editar</button>
                <button class="btn btn-danger btn-del-usr">Excluir</button>
            </td>
        `;
        tr.querySelector('.btn-edit-usr').onclick = () => prepararEdicaoUsuario(u.matricula);
        tr.querySelector('.btn-del-usr').onclick = () => removerUsuario(u.matricula);
        tbUsuarios.appendChild(tr);
    });

    // Renderizar Tabela de Cargos
    const tbCargos = document.getElementById('tb-cargos');
    tbCargos.innerHTML = '';
    cargos.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.id}</td>
            <td>${c.nome}</td>
            <td class="actions">
                <button class="btn btn-danger btn-del-cargo">Excluir</button>
            </td>
        `;
        tr.querySelector('.btn-del-cargo').onclick = () => removerCargo(c.id);
        tbCargos.appendChild(tr);
    });

    // Renderizar Tabela de Unidades
    const tbUnidades = document.getElementById('tb-unidades');
    tbUnidades.innerHTML = '';
    unidades.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.id}</td>
            <td>${u.nome}</td>
            <td class="actions">
                <button class="btn btn-danger btn-del-unidade">Excluir</button>
            </td>
        `;
        tr.querySelector('.btn-del-unidade').onclick = () => removerUnidade(u.id);
        tbUnidades.appendChild(tr);
    });

    // Renderizar Tabela de Produtos
    const tbProdutos = document.getElementById('tb-produtos');
    tbProdutos.innerHTML = '';
    produtos.forEach(p => {
        const un = unidades.find(u => u.id === p.unidadeId);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.id}</td>
            <td>${p.nome}</td>
            <td>${p.quantidade}</td>
            <td><span class="badge">${un ? un.nome : p.unidadeId}</span></td>
            <td class="actions">
                <button class="btn btn-danger btn-del-prod">Excluir</button>
            </td>
        `;
        tr.querySelector('.btn-del-prod').onclick = () => removerProduto(p.id);
        tbProdutos.appendChild(tr);
    });
}

// --- LISTENERS DOS FORMULÁRIOS ---
document.getElementById('form-login').addEventListener('submit', realizarLogin);
document.getElementById('form-usuario').addEventListener('submit', salvarUsuario);
document.getElementById('form-cargo').addEventListener('submit', salvarCargo);
document.getElementById('form-unidade').addEventListener('submit', salvarUnidade);
document.getElementById('form-produto').addEventListener('submit', salvarProduto);
document.getElementById('btn-cancelar-usr').addEventListener('click', cancelarEdicaoUsuario);
document.getElementById('btn-logout').addEventListener('click', logout);

// Inicialização do App
window.onload = init;
