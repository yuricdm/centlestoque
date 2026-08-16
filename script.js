/* ESTADO GLOBAL DA APLICAÇÃO */
const EstadoApp = {
    usuarioLogado: null,
    unidadeAtual: 'Unidade Pelotas - Centro',
    produtos: [
        { id: 101, sku: 'EAN-78901', nome: 'Caixa de Papelão P', categoria: 'Embalagens', qtd: 450, min: 100, preco: 2.50, unidade: 'Unidade Pelotas - Centro' },
        { id: 102, sku: 'EAN-78902', nome: 'Fita Adesiva 45mmx50m', categoria: 'Suprimentos', qtd: 12, min: 30, preco: 8.90, unidade: 'Unidade Pelotas - Centro' },
        { id: 103, sku: 'EAN-78903', nome: 'Plástico Bolha 100m', categoria: 'Embalagens', qtd: 8, min: 15, preco: 75.00, unidade: 'Unidade Pelotas - Centro' },
        { id: 104, sku: 'EAN-78904', nome: 'Etiqueta Térmica 100x150', categoria: 'Identificação', qtd: 120, min: 50, preco: 32.00, unidade: 'Unidade Porto Alegre - ZN' }
    ],
    historicoMovimentacoes: [
        { id: 1, data: '2026-08-15 14:30', produto: 'Caixa de Papelão P', tipo: 'Entrada', qtd: 100, usuario: 'admin', unidade: 'Unidade Pelotas - Centro' },
        { id: 2, data: '2026-08-15 10:15', produto: 'Fita Adesiva 45mmx50m', tipo: 'Saída', qtd: 5, usuario: 'supervisor', unidade: 'Unidade Pelotas - Centro' }
    ],
    pendencias: [
        { id: 501, solicitante: 'tecnico', produto: 'Plástico Bolha 100m', qtd: 5, tipo: 'Transferência', status: 'Pendente' }
    ]
};

/* CONTROLE DE NAVEGAÇÃO */
function navegarPara(idTela) {
    const secoes = document.querySelectorAll('main > section');
    secoes.forEach(secao => secao.classList.add('oculto'));

    const telaDestino = document.getElementById(`tela-${idTela}`);
    if (telaDestino) {
        telaDestino.classList.remove('oculto');
    }

    if (idTela === 'dashboard') atualizarDashboardGeral();
    if (idTela === 'produtos') renderizarTabelaProdutos();
    if (idTela === 'historico') renderizarHistorico();
    if (idTela === 'pendencias') renderizarPendencias();
}

/* AUTENTICAÇÃO */
function realizarLogin(event) {
    event.preventDefault();
    const usuarioInput = document.getElementById('usuario').value.trim();
    const senhaInput = document.getElementById('senha').value.trim();

    if (!usuarioInput || !senhaInput) {
        alert('Por favor, informe seu usuário e senha.');
        return;
    }

    EstadoApp.usuarioLogado = {
        nome: usuarioInput,
        perfil: usuarioInput.toLowerCase() === 'admin' ? 'Administrador' : 'Operador'
    };

    alert(`Login efetuado com sucesso! Bem-vindo, ${EstadoApp.usuarioLogado.nome}.`);
    document.getElementById('menu-navegacao').classList.remove('oculto');
    navegarPara('dashboard');
}

function encerrarSessao() {
    EstadoApp.usuarioLogado = null;
    document.getElementById('menu-navegacao').classList.add('oculto');
    document.getElementById('form-login').reset();
    navegarPara('login');
}

function recuperarSenha(event) {
    event.preventDefault();
    const email = document.getElementById('email-recupera').value;
    alert(`Instruções de recuperação foram enviadas para ${email}.`);
    navegarPara('login');
}

/* DASHBOARD GERAL */
function atualizarDashboardGeral() {
    const valorTotal = EstadoApp.produtos.reduce((acc, item) => acc + (item.qtd * item.preco), 0);
    const totalSKUs = EstadoApp.produtos.length;
    const alertas = EstadoApp.produtos.filter(item => item.qtd <= item.min).length;
    const totalPendencias = EstadoApp.pendencias.length;

    document.getElementById('kpi-valor').innerText = valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('kpi-itens').innerText = `${totalSKUs} SKUs`;
    document.getElementById('kpi-alertas').innerText = `${alertas} Itens`;
    document.getElementById('kpi-pendentes').innerText = `${totalPendencias} Requisições`;
    document.getElementById('badge-pendencias').innerText = totalPendencias;
}

/* PRODUTOS */
function renderizarTabelaProdutos(lista = EstadoApp.produtos) {
    const corpoTabela = document.getElementById('tabela-produtos-corpo');
    if (!corpoTabela) return;

    corpoTabela.innerHTML = '';

    lista.forEach(produto => {
        const emAlerta = produto.qtd <= produto.min;
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${produto.sku}</td>
            <td><strong>${produto.nome}</strong></td>
            <td>${produto.categoria}</td>
            <td><span class="${emAlerta ? 'texto-alerta' : ''}">${produto.qtd}</span> / min: ${produto.min}</td>
            <td>R$ ${produto.preco.toFixed(2)}</td>
            <td>${produto.unidade}</td>
            <td>
                <button onclick="registrarMovimento(${produto.id}, 'Entrada')" class="btn-sm btn-sucesso">+ Entrada</button>
                <button onclick="registrarMovimento(${produto.id}, 'Saída')" class="btn-sm btn-perigo">- Saída</button>
            </td>
        `;
        corpoTabela.appendChild(tr);
    });
}

function cadastrarNovoProduto(event) {
    event.preventDefault();
    const nome = document.getElementById('prod-nome').value;
    const sku = document.getElementById('prod-sku').value;
    const categoria = document.getElementById('prod-categoria').value;
    const qtd = parseInt(document.getElementById('prod-qtd').value) || 0;
    const min = parseInt(document.getElementById('prod-min').value) || 0;
    const preco = parseFloat(document.getElementById('prod-preco').value) || 0.0;

    const novoProduto = {
        id: Date.now(),
        sku: sku,
        nome: nome,
        categoria: categoria,
        qtd: qtd,
        min: min,
        preco: preco,
        unidade: EstadoApp.unidadeAtual
    };

    EstadoApp.produtos.push(novoProduto);
    alert('Produto cadastrado com sucesso!');
    document.getElementById('form-cadastro-produto').reset();
    renderizarTabelaProdutos();
    atualizarDashboardGeral();
}

function filtrarProdutos() {
    const termo = document.getElementById('busca-produto').value.toLowerCase();
    const filtrados = EstadoApp.produtos.filter(p => 
        p.nome.toLowerCase().includes(termo) || p.sku.toLowerCase().includes(termo)
    );
    renderizarTabelaProdutos(filtrados);
}

/* MOVIMENTAÇÕES */
function registrarMovimento(idProduto, tipo) {
    const produto = EstadoApp.produtos.find(p => p.id === idProduto);
    if (!produto) return;

    const quantidadeStr = prompt(`Informe a quantidade de ${tipo.toUpperCase()} para "${produto.nome}":`, '1');
    const quantidade = parseInt(quantidadeStr);

    if (isNaN(quantidade) || quantidade <= 0) {
        alert('Quantidade inválida.');
        return;
    }

    if (tipo === 'Saída' && produto.qtd < quantidade) {
        alert('Estoque insuficiente!');
        return;
    }

    if (tipo === 'Entrada') produto.qtd += quantidade;
    if (tipo === 'Saída') produto.qtd -= quantidade;

    EstadoApp.historicoMovimentacoes.unshift({
        id: Date.now(),
        data: new Date().toLocaleString('pt-BR'),
        produto: produto.nome,
        tipo: tipo,
        qtd: quantidade,
        usuario: EstadoApp.usuarioLogado ? EstadoApp.usuarioLogado.nome : 'Sistema',
        unidade: produto.unidade
    });

    alert(`Movimentação registrada com sucesso! Novo saldo: ${produto.qtd}`);
    renderizarTabelaProdutos();
    atualizarDashboardGeral();
}

function renderizarHistorico() {
    const corpoHistorico = document.getElementById('tabela-historico-corpo');
    if (!corpoHistorico) return;

    corpoHistorico.innerHTML = '';
    EstadoApp.historicoMovimentacoes.forEach(mov => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${mov.data}</td>
            <td>${mov.produto}</td>
            <td><strong>${mov.tipo}</strong></td>
            <td>${mov.qtd}</td>
            <td>${mov.usuario}</td>
            <td>${mov.unidade}</td>
        `;
        corpoHistorico.appendChild(tr);
    });
}

/* PENDÊNCIAS */
function renderizarPendencias() {
    const elLista = document.getElementById('lista-pendencias');
    if (!elLista) return;

    if (EstadoApp.pendencias.length === 0) {
        elLista.innerHTML = '<p>Nenhuma pendência pendente de aprovação.</p>';
        return;
    }

    elLista.innerHTML = EstadoApp.pendencias.map(p => `
        <div class="card">
            <p><strong>Solicitante:</strong> ${p.solicitante}</p>
            <p><strong>Produto:</strong> ${p.produto} (${p.qtd} uni)</p>
            <p><strong>Tipo:</strong> ${p.tipo}</p>
            <br>
            <button onclick="aprovarPendencia(${p.id})" class="btn-sm btn-sucesso">Aprovar Solicitação</button>
        </div>
    `).join('');
}

function aprovarPendencia(idPendencia) {
    EstadoApp.pendencias = EstadoApp.pendencias.filter(p => p.id !== idPendencia);
    alert('Pendência aprovada!');
    renderizarPendencias();
    atualizarDashboardGeral();
}

document.addEventListener('DOMContentLoaded', () => {
    navegarPara('login');
});
