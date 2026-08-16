/* ==========================================================================
   1. ESTADO GLOBAL DA APLICAÇÃO (DADOS EM MEMÓRIA / SIMULAÇÃO)
   ========================================================================== */
const EstadoApp = {
    usuarioLogado: null,
    unidadeAtual: 'Unidade Pelotas - Centro',
    unidadesDisponiveis: [
        'Unidade Pelotas - Centro',
        'Unidade Porto Alegre - ZN',
        'Depósito Central - Caxias'
    ],
    produtos: [
        { id: 101, sku: 'EAN-78901', nome: 'Caixa de Papelão P', categoria: 'Embalagens', qtd: 450, min: 100, preco: 2.50, unidade: 'Unidade Pelotas - Centro' },
        { id: 102, sku: 'EAN-78902', nome: 'Fita Adesiva 45mmx50m', categoria: 'Suprimentos', qtd: 12, min: 30, preco: 8.90, unidade: 'Unidade Pelotas - Centro' }, // Alerta
        { id: 103, sku: 'EAN-78903', nome: 'Plástico Bolha 100m', categoria: 'Embalagens', qtd: 8, min: 15, preco: 75.00, unidade: 'Unidade Pelotas - Centro' },   // Alerta
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

/* ==========================================================================
   2. CONTROLE DE NAVEGAÇÃO ENTRE TELAS
   ========================================================================== */
function navegarPara(idTela) {
    // Esconde todas as seções
    const secoes = document.querySelectorAll('main > section');
    secoes.forEach(secao => secao.classList.add('oculto'));

    // Exibe a seção solicitada
    const telaDestino = document.getElementById(`tela-${idTela}`);
    if (telaDestino) {
        telaDestino.classList.remove('oculto');
    }

    // Atualiza dados específicos conforme a tela acessada
    if (idTela === 'dashboard') atualizarDashboardGeral();
    if (idTela === 'produtos') renderizarTabelaProdutos();
    if (idTela === 'historico') renderizarHistorico();
    if (idTela === 'pendencias') renderizarPendencias();
}

/* ==========================================================================
   3. AUTENTICAÇÃO E LOGIN
   ========================================================================== */
function realizarLogin(event) {
    event.preventDefault();
    const usuarioInput = document.getElementById('usuario').value.trim();
    const senhaInput = document.getElementById('senha').value.trim();

    if (!usuarioInput || !senhaInput) {
        alert('Por favor, informe seu usuário e senha.');
        return;
    }

    // Simulação de login
    EstadoApp.usuarioLogado = {
        nome: usuarioInput,
        perfil: usuarioInput.toLowerCase() === 'admin' ? 'Administrador' : 'Operador'
    };

    alert(`Login efetuado com sucesso! Bem-vindo, ${EstadoApp.usuarioLogado.nome}.`);
    
    // Mostra o menu de navegação e redireciona para o Dashboard Geral
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

/* ==========================================================================
   4. DASHBOARD GERAL E CONSOLIDADO (MÉTRICAS E KPIS)
   ========================================================================== */
function atualizarDashboardGeral() {
    // Cálculo do valor total em estoque
    const valorTotal = EstadoApp.produtos.reduce((acc, item) => acc + (item.qtd * item.preco), 0);
    
    // Contagem de SKUs cadastrados
    const totalSKUs = EstadoApp.produtos.length;
    
    // Identificação de alertas críticos (Estoque <= Mínimo)
    const alertas = EstadoApp.produtos.filter(item => item.qtd <= item.min).length;
    
    // Total de pendências
    const totalPendencias = EstadoApp.pendencias.length;

    // Atualiza os elementos na interface caso existam na página
    const elValor = document.getElementById('kpi-valor');
    const elItens = document.getElementById('kpi-itens');
    const elAlertas = document.getElementById('kpi-alertas');
    const elPendencias = document.getElementById('kpi-pendentes');

    if (elValor) elValor.innerText = valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (elItens) elItens.innerText = `${totalSKUs} SKUs`;
    if (elAlertas) elAlertas.innerText = `${alertas} Itens`;
    if (elPendencias) elPendencias.innerText = `${totalPendencias} Requisições`;
}

/* ==========================================================================
   5. GESTÃO DE PRODUTOS E TABELAS
   ========================================================================== */
function renderizarTabelaProdutos() {
    const corpoTabela = document.getElementById('tabela-produtos-corpo');
    if (!corpoTabela) return;

    corpoTabela.innerHTML = '';

    EstadoApp.produtos.forEach(produto => {
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

/* ==========================================================================
   6. MOVIMENTAÇÕES E HISTÓRICO
   ========================================================================== */
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
        alert('Estoque insuficiente para essa saída!');
        return;
    }

    // Atualiza a quantidade do produto
    if (tipo === 'Entrada') produto.qtd += quantidade;
    if (tipo === 'Saída') produto.qtd -= quantidade;

    // Registra no histórico
    const dataAtual = new Date().toLocaleString('pt-BR');
    EstadoApp.historicoMovimentacoes.unshift({
        id: Date.now(),
        data: dataAtual,
        produto: produto.nome,
        tipo: tipo,
        qtd: quantidade,
        usuario: EstadoApp.usuarioLogado ? EstadoApp.usuarioLogado.nome : 'Sistema',
        unidade: produto.unidade
    });

    alert(`Movimentação de ${tipo} registrada! Novo saldo: ${produto.qtd}`);
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
            <td><span class="badge-${mov.tipo.toLowerCase()}">${mov.tipo}</span></td>
            <td>${mov.qtd}</td>
            <td>${mov.usuario}</td>
            <td>${mov.unidade}</td>
        `;
        corpoHistorico.appendChild(tr);
    });
}

function renderizarPendencias() {
    const elLista = document.getElementById('lista-pendencias');
    if (!elLista) return;

    if (EstadoApp.pendencias.length === 0) {
        elLista.innerHTML = '<p>Nenhuma pendência para aprovação.</p>';
        return;
    }

    elLista.innerHTML = EstadoApp.pendencias.map(p => `
        <div class="card-pendencia">
            <p><strong>Solicitante:</strong> ${p.solicitante}</p>
            <p><strong>Item:</strong> ${p.produto} (${p.qtd} uni)</p>
            <p><strong>Ação:</strong> ${p.tipo}</p>
            <button onclick="aprovarPendencia(${p.id})" class="btn-sm btn-sucesso">Aprovar</button>
        </div>
    `).join('');
}

function aprovarPendencia(idPendencia) {
    EstadoApp.pendencias = EstadoApp.pendencias.filter(p => p.id !== idPendencia);
    alert('Pendência aprovada!');
    renderizarPendencias();
    atualizarDashboardGeral();
}

/* ==========================================================================
   7. INICIALIZAÇÃO DO SISTEMA
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa a tela de login
    navegarPara('login');
});
