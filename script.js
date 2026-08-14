// ========================================
// BANCO DE DADOS LOCAL E ESTADOS INICIAIS
// ========================================

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

const USUARIOS_PADRAO = [
    { login: "admin", email: "admin@empresa.com", senha: "1234", perfil: "admin", nome: "Admin Master", unidadeId: "TODAS" },
    { login: "coordenador", email: "coordenador@empresa.com", senha: "1234", perfil: "coordenador", nome: "Coordenador Geral", unidadeId: "TODAS" },
    { login: "supervisor", email: "supervisor@empresa.com", senha: "1234", perfil: "supervisor", nome: "Supervisor Pelotas", unidadeId: "SRS2" },
    { login: "tecnico", email: "tecnico@empresa.com", senha: "1234", perfil: "tecnico", nome: "Técnico Silva", unidadeId: "SRS2" }
];

let unidades = JSON.parse(localStorage.getItem("unidades")) || UNIDADES_PADRAO;
let cargos = JSON.parse(localStorage.getItem("cargos")) || CARGOS_PADRAO;
let usuarios = JSON.parse(localStorage.getItem("usuarios")) || USUARIOS_PADRAO;
let produtos = JSON.parse(localStorage.getItem("produtos")) || [];
let movimentacoes = JSON.parse(localStorage.getItem("movimentacoes")) || [];
let pendencias = JSON.parse(localStorage.getItem("pendencias")) || [];

// USUÁRIO EM SESSÃO
let usuarioLogado = JSON.parse(sessionStorage.getItem("usuarioLogado")) || null;
let unidadeSelecionada = JSON.parse(sessionStorage.getItem("unidadeSelecionada")) || null;

// ========================================
// PERSISTÊNCIA DE DADOS
// ========================================

function salvarDados() {
    localStorage.setItem("unidades", JSON.stringify(unidades));
    localStorage.setItem("cargos", JSON.stringify(cargos));
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("produtos", JSON.stringify(produtos));
    localStorage.setItem("movimentacoes", JSON.stringify(movimentacoes));
    localStorage.setItem("pendencias", JSON.stringify(pendencias));
}

// Helper para verificar se o usuário atual possui determinada permissão
function temPermissao(permissao) {
    if (!usuarioLogado) return false;
    const cargo = cargos.find(c => c.id === usuarioLogado.perfil);
    if (!cargo) return false;
    return cargo.permissoes.includes(permissao);
}

// ========================================
// AUTENTICAÇÃO E RECUPERAÇÃO DE SENHA
// ========================================

function realizarLogin() {
    const usuarioVal = document.getElementById("usuarioInput").value.trim().toLowerCase();
    const senhaVal = document.getElementById("senhaInput").value.trim();

    const conta = usuarios.find(u => u.login.toLowerCase() === usuarioVal && u.senha === senhaVal);

    if (conta) {
        usuarioLogado = conta;
        sessionStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));
        exibirSelecaoUnidades();
    } else {
        alert("Usuário ou senha incorretos!\n\nUsuários de teste (senha 1234):\n- admin\n- coordenador\n- supervisor\n- tecnico");
    }
}

function enviarEmailRecuperacao() {
    const identificador = document.getElementById("emailRecuperacaoInput").value.trim().toLowerCase();

    if (!identificador) {
        alert("Por favor, informe seu e-mail ou usuário.");
        return;
    }

    const conta = usuarios.find(u => 
        u.login.toLowerCase() === identificador || 
        (u.email && u.email.toLowerCase() === identificador)
    );

    if (conta) {
        alert(`Instruções de redefinição enviadas para o e-mail cadastrado de "${conta.nome}"!`);
    } else {
        alert("Se o e-mail/usuário estiver cadastrado, você receberá o link de redefinição.");
    }

    document.getElementById("emailRecuperacaoInput").value = "";
    mostrarPagina("login");
}

function realizarLogout() {
    sessionStorage.removeItem("usuarioLogado");
    sessionStorage.removeItem("unidadeSelecionada");
    usuarioLogado = null;
    unidadeSelecionada = null;
    
    document.getElementById("usuarioInput").value = "";
    document.getElementById("senhaInput").value = "";

    iniciarSessao();
}

function exibirSelecaoUnidades() {
    const grid = document.getElementById("gridUnidades");
    grid.innerHTML = "";

    const unidadesAcessiveis = unidades.filter(u => {
        if (usuarioLogado.unidadeId === "TODAS" || temPermissao("gerenciar_usuarios")) {
            return true;
        }
        return u.id === usuarioLogado.unidadeId;
    });

    unidadesAcessiveis.forEach(unidade => {
        const card = document.createElement("div");
        card.className = "card-unidade";
        card.innerHTML = `
            <h3>🏢 ${unidade.nome}</h3>
            <button class="btn-principal" onclick="selecionarUnidade('${unidade.id}', '${unidade.nome}')">Acessar Unidade</button>
        `;
        grid.appendChild(card);
    });

    mostrarPagina("selecaoUnidade");
}

function selecionarUnidade(id, nome) {
    unidadeSelecionada = { id, nome };
    sessionStorage.setItem("unidadeSelecionada", JSON.stringify(unidadeSelecionada));
    iniciarSessao();
}

function voltarParaSelecaoUnidades() {
    unidadeSelecionada = null;
    sessionStorage.removeItem("unidadeSelecionada");
    exibirSelecaoUnidades();
}

function aplicarPermissoesInterface() {
    if (!usuarioLogado) return;

    const navDashboard = document.getElementById("navDashboard");
    const navPendencias = document.getElementById("navPendencias");
    const navUsuarios = document.getElementById("navUsuarios");
    const navCargos = document.getElementById("navCargos");
    
    const containerFormProdutos = document.getElementById("containerFormProdutos");
    const containerImportarExcel = document.getElementById("containerImportarExcel");
    const thAcoesProdutos = document.getElementById("thAcoesProdutos");

    const badgeCount = document.getElementById("badgePendenciasCount");
    if (badgeCount) badgeCount.textContent = pendencias.length;

    if (navDashboard) navDashboard.style.display = temPermissao("ver_dashboard") ? "inline-block" : "none";
    if (navPendencias) navPendencias.style.display = temPermissao("aprovar_pendencias") ? "inline-block" : "none";
    if (navUsuarios) navUsuarios.style.display = temPermissao("gerenciar_usuarios") ? "inline-block" : "none";
    if (navCargos) navCargos.style.display = temPermissao("gerenciar_cargos") ? "inline-block" : "none";

    if (containerFormProdutos) containerFormProdutos.style.display = temPermissao("cadastrar_produto") ? "grid" : "none";
    if (containerImportarExcel) containerImportarExcel.style.display = temPermissao("exportar_excel") ? "block" : "none";
    if (thAcoesProdutos) thAcoesProdutos.style.display = temPermissao("editar_produto") ? "table-cell" : "none";
}

function iniciarSessao() {
    const menuNav = document.getElementById("menuNavegacao");
    const infoHeader = document.getElementById("infoUsuarioHeader");
    const nomeUnidadeElem = document.getElementById("nomeUnidadeAtual");

    if (usuarioLogado) {
        if (!unidadeSelecionada) {
            menuNav.classList.add("oculto");
            infoHeader.classList.add("oculto");
            exibirSelecaoUnidades();
            return;
        }

        menuNav.classList.remove("oculto");
        infoHeader.classList.remove("oculto");
        
        if (nomeUnidadeElem) {
            nomeUnidadeElem.textContent = `${usuarioLogado.nome} (${usuarioLogado.perfil.toUpperCase()}) | ${unidadeSelecionada.nome}`;
        }

        document.querySelectorAll(".badge-unidade").forEach(el => {
            el.textContent = unidadeSelecionada.nome;
        });

        aplicarPermissoesInterface();

        if (temPermissao("ver_dashboard")) {
            mostrarPagina("dashboard");
        } else {
            mostrarPagina("movimentacao");
        }
    } else {
        menuNav.classList.add("oculto");
        infoHeader.classList.add("oculto");
        mostrarPagina("login");
    }
}

// ========================================
// NAVEGAÇÃO
// ========================================

function mostrarPagina(pagina) {
    document.querySelectorAll(".pagina").forEach(secao => secao.classList.add("oculto"));

    const paginaAlvo = document.getElementById(pagina);
    if (paginaAlvo) {
        paginaAlvo.classList.remove("oculto");
    }

    if (usuarioLogado && unidadeSelecionada && pagina !== 'login' && pagina !== 'recuperarSenha' && pagina !== 'selecaoUnidade') {
        atualizarSistema();
    }
}

// ========================================
// GESTÃO DE CARGOS E PERMISSÕES (NOVO)
// ========================================

function cadastrarNovoCargo() {
    if (!temPermissao("gerenciar_cargos")) {
        alert("Você não possui permissão para gerenciar cargos.");
        return;
    }

    const nome = document.getElementById("novoNomeCargo").value.trim();
    if (!nome) {
        alert("Informe o nome do cargo.");
        return;
    }

    const id = nome.toLowerCase().replace(/\s+/g, '_');
    const checkboxes = document.querySelectorAll(".chk-perm:checked");
    const permissoes = Array.from(checkboxes).map(c => c.value);

    const existe = cargos.some(c => c.id === id);
    if (existe) {
        alert("Já existe um cargo registrado com esse nome.");
        return;
    }

    cargos.push({ id, nome, permissoes });
    salvarDados();

    document.getElementById("novoNomeCargo").value = "";
    document.querySelectorAll(".chk-perm").forEach(c => c.checked = false);

    listarCargos();
    atualizarOptionsPerfis();
    alert(`Cargo "${nome}" cadastrado com sucesso!`);
}

function listarCargos() {
    const tabela = document.getElementById("tabelaCargos");
    if (!tabela) return;

    tabela.innerHTML = "";

    cargos.forEach((c, index) => {
        const linha = document.createElement("tr");
        const listagemPermissoes = c.permissoes.length > 0 ? c.permissoes.join(", ") : "Nenhuma permissão";

        linha.innerHTML = `
            <td><strong>${c.nome}</strong></td>
            <td><small>${listagemPermissoes}</small></td>
            <td>
                ${['admin', 'coordenador', 'supervisor', 'tecnico'].includes(c.id) 
                    ? '<em>Padrão Sistema</em>' 
                    : `<button class="btn-excluir" onclick="removerCargo(${index})">Remover</button>`}
            </td>
        `;
        tabela.appendChild(linha);
    });
}

function removerCargo(index) {
    if (!confirm("Deseja realmente excluir este cargo personalizado?")) return;
    cargos.splice(index, 1);
    salvarDados();
    listarCargos();
    atualizarOptionsPerfis();
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

// ========================================
// GESTÃO DE UNIDADES E USUÁRIOS
// ========================================

function cadastrarNovaUnidade() {
    if (!temPermissao("gerenciar_usuarios")) {
        alert("Sem permissão para criar unidades.");
        return;
    }

    const id = document.getElementById("novoIdUnidade").value.trim().toUpperCase();
    const nome = document.getElementById("novoNomeUnidade").value.trim();

    if (!id || !nome) {
        alert("Preencha o código e o nome da unidade.");
        return;
    }

    if (unidades.some(u => u.id === id)) {
        alert("Já existe uma unidade com este código.");
        return;
    }

    unidades.push({ id, nome });
    salvarDados();

    document.getElementById("novoIdUnidade").value = "";
    document.getElementById("novoNomeUnidade").value = "";

    atualizarOptionsUnidades();
    alert(`Unidade "${nome}" criada com sucesso!`);
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

function cadastrarNovoUsuario() {
    if (!temPermissao("gerenciar_usuarios")) {
        alert("Sem permissão para cadastrar usuários.");
        return;
    }

    const nome = document.getElementById("novoNomeUsuario").value.trim();
    const email = document.getElementById("novoEmailUsuario").value.trim().toLowerCase();
    const login = document.getElementById("novoLoginUsuario").value.trim().toLowerCase();
    const senha = document.getElementById("novaSenhaUsuario").value.trim();
    const perfil = document.getElementById("novoPerfilUsuario").value;
    const unidadeId = document.getElementById("novaUnidadeUsuario").value;

    if (!nome || !login || !senha) {
        alert("Preencha os campos obrigatórios.");
        return;
    }

    if (usuarios.some(u => u.login.toLowerCase() === login)) {
        alert("Já existe um usuário com esse login.");
        return;
    }

    usuarios.push({ nome, email, login, senha, perfil, unidadeId });
    salvarDados();

    document.getElementById("novoNomeUsuario").value = "";
    document.getElementById("novoEmailUsuario").value = "";
    document.getElementById("novoLoginUsuario").value = "";
    document.getElementById("novaSenhaUsuario").value = "";

    listarUsuarios();
    alert(`Usuário ${nome} criado com sucesso!`);
}

function listarUsuarios() {
    const tabela = document.getElementById("tabelaUsuarios");
    if (!tabela) return;

    tabela.innerHTML = "";

    usuarios.forEach((u, index) => {
        const cargoObj = cargos.find(c => c.id === u.perfil);
        const nomeCargo = cargoObj ? cargoObj.nome : u.perfil;

        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${u.nome}</td>
            <td>${u.email || "-"}</td>
            <td><code>${u.login}</code></td>
            <td><strong>${nomeCargo}</strong></td>
            <td>${u.unidadeId}</td>
            <td>
                ${u.login !== 'admin' ? `<button class="btn-excluir" onclick="removerUsuario(${index})">Remover</button>` : '-'}
            </td>
        `;
        tabela.appendChild(linha);
    });
}

function removerUsuario(index) {
    if (!confirm("Deseja remover este usuário?")) return;
    usuarios.splice(index, 1);
    salvarDados();
    listarUsuarios();
}

// ========================================
// PRODUTOS
// ========================================

function salvarProduto() {
    if (!unidadeSelecionada || !temPermissao("cadastrar_produto")) return;

    const id = document.getElementById("produtoId").value;
    const nome = document.getElementById("nomeProduto").value.trim();
    const codigo = document.getElementById("codigoProduto").value.trim();
    const categoria = document.getElementById("categoriaProduto").value.trim();
    const estoque = Number(document.getElementById("estoqueInicial").value);
    const minimo = Number(document.getElementById("estoqueMinimo").value);

    if (!nome || !codigo) {
        alert("Preencha o nome e o código do produto.");
        return;
    }

    if (id) {
        if (!temPermissao("editar_produto")) {
            alert("Seu cargo não possui permissão para editar produtos.");
            return;
        }

        const produto = produtos.find(p => p.id == id && p.unidadeId === unidadeSelecionada.id);
        if (produto) {
            produto.nome = nome;
            produto.codigo = codigo;
            produto.categoria = categoria;
            produto.minimo = minimo;
        }
        alert("Produto atualizado.");
    } else {
        const codigoExiste = produtos.some(
            p => p.unidadeId === unidadeSelecionada.id && p.codigo.toLowerCase() === codigo.toLowerCase()
        );

        if (codigoExiste) {
            alert("Já existe um produto com este código nesta unidade.");
            return;
        }

        produtos.push({
            id: Date.now(),
            unidadeId: unidadeSelecionada.id,
            nome, codigo, categoria, estoque, minimo
        });
        alert("Produto cadastrado!");
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

    const lista = produtos.filter(produto => {
        const pertence = produto.unidadeId === unidadeSelecionada.id;
        const bate = (
            produto.nome.toLowerCase().includes(pesquisa) ||
            produto.codigo.toLowerCase().includes(pesquisa) ||
            produto.categoria.toLowerCase().includes(pesquisa)
        );
        return pertence && bate;
    });

    lista.forEach(produto => {
        const baixo = produto.estoque <= produto.minimo;
        const linha = document.createElement("tr");

        let acoesHtml = "";
        if (temPermissao("editar_produto")) {
            acoesHtml = `
                <td>
                    <button class="btn-editar" onclick="editarProduto(${produto.id})">Editar</button>
                    <button class="btn-excluir" onclick="excluirProduto(${produto.id})">Excluir</button>
                </td>
            `;
        }

        linha.innerHTML = `
            <td>${produto.nome}</td>
            <td>${produto.codigo}</td>
            <td>${produto.categoria || "-"}</td>
            <td>${produto.estoque}</td>
            <td>${produto.minimo}</td>
            <td>${baixo ? '<span class="status-baixo"> BAIXO</span>' : '<span class="status-ok">✓ OK</span>'}</td>
            ${acoesHtml}
        `;

        tabela.appendChild(linha);
    });
}

function editarProduto(id) {
    if (!temPermissao("editar_produto")) return;

    const produto = produtos.find(p => p.id == id && p.unidadeId === unidadeSelecionada.id);
    if (!produto) return;

    document.getElementById("produtoId").value = produto.id;
    document.getElementById("nomeProduto").value = produto.nome;
    document.getElementById("codigoProduto").value = produto.codigo;
    document.getElementById("categoriaProduto").value = produto.categoria;
    document.getElementById("estoqueInicial").value = produto.estoque;
    document.getElementById("estoqueMinimo").value = produto.minimo;

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function excluirProduto(id) {
    if (!temPermissao("editar_produto")) return;

    const produto = produtos.find(p => p.id == id && p.unidadeId === unidadeSelecionada.id);
    if (!produto) return;

    if (!confirm(`Excluir o produto "${produto.nome}"?`)) return;

    produtos = produtos.filter(p => !(p.id == id && p.unidadeId === unidadeSelecionada.id));
    salvarDados();
    atualizarSistema();
}

// ========================================
// MOVIMENTAÇÃO E PENDÊNCIAS
// ========================================

function atualizarSelectProdutos() {
    if (!unidadeSelecionada) return;

    const select = document.getElementById("produtoMovimentacao");
    select.innerHTML = '<option value="">Selecione um produto</option>';

    const produtosUnidade = produtos.filter(p => p.unidadeId === unidadeSelecionada.id);

    produtosUnidade.forEach(produto => {
        const option = document.createElement("option");
        option.value = produto.id;
        option.textContent = `${produto.codigo} - ${produto.nome} (Estoque: ${produto.estoque})`;
        select.appendChild(option);
    });
}

function registrarMovimentacao() {
    if (!unidadeSelecionada) return;

    const produtoId = Number(document.getElementById("produtoMovimentacao").value);
    const tipo = document.getElementById("tipoMovimentacao").value;
    const quantidade = Number(document.getElementById("quantidadeMovimentacao").value);
    const observacao = document.getElementById("observacaoMovimentacao").value;

    if (!produtoId || quantidade <= 0) {
        alert("Selecione um produto e informe uma quantidade válida.");
        return;
    }

    const produto = produtos.find(p => p.id === produtoId && p.unidadeId === unidadeSelecionada.id);
    if (!produto) return;

    if (tipo === "entrada") {
        produto.estoque += quantidade;

        movimentacoes.push({
            id: Date.now(),
            unidadeId: unidadeSelecionada.id,
            data: new Date().toLocaleString("pt-BR"),
            produto: produto.nome,
            codigo: produto.codigo,
            tipo: "entrada",
            quantidade,
            observacao: observacao || "Entrada de material",
            usuarioResponsavel: usuarioLogado.nome
        });

        alert(`Entrada de ${quantidade} un. registrada!`);
    } else {
        if (quantidade > produto.estoque) {
            alert(`Estoque insuficiente! Saldo atual: ${produto.estoque}`);
            return;
        }

        if (temPermissao("movimentar_direto")) {
            produto.estoque -= quantidade;

            movimentacoes.push({
                id: Date.now(),
                unidadeId: unidadeSelecionada.id,
                data: new Date().toLocaleString("pt-BR"),
                produto: produto.nome,
                codigo: produto.codigo,
                tipo: "saida",
                quantidade,
                observacao: observacao || "Saída direta",
                usuarioResponsavel: `${usuarioLogado.nome} (Saída Direta)`
            });

            alert("Saída efetuada com sucesso!");
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
                data: new Date().toLocaleString("pt-BR")
            });

            alert("Solicitação enviada! Aguardando aprovação de um perfil responsável.");
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
    if (!temPermissao("aprovar_pendencias")) {
        alert("Sem permissão para aprovar.");
        return;
    }

    const item = pendencias[index];
    const produto = produtos.find(p => p.id === item.produtoId && p.unidadeId === item.unidadeId);

    if (!produto || item.quantidade > produto.estoque) {
        alert("Saldo em estoque insuficiente para aprovar esta retirada.");
        return;
    }

    produto.estoque -= item.quantidade;

    movimentacoes.push({
        id: Date.now(),
        unidadeId: item.unidadeId,
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
    alert("Solicitação APROVADA!");
}

function recusarPendencia(index) {
    if (!temPermissao("aprovar_pendencias")) return;
    if (!confirm("Recusar esta solicitação?")) return;

    pendencias.splice(index, 1);
    salvarDados();
    atualizarSistema();
}

// ========================================
// HISTÓRICO & DASHBOARD
// ========================================

function listarHistorico() {
    if (!unidadeSelecionada) return;

    const tabela = document.getElementById("tabelaHistorico");
    tabela.innerHTML = "";

    const historicoUnidade = movimentacoes.filter(m => m.unidadeId === unidadeSelecionada.id);
    const lista = [...historicoUnidade].reverse();

    lista.forEach(mov => {
        const linha = document.createElement("tr");
        const tipoTexto = mov.tipo === "entrada" 
            ? '<span class="status-ok">⬆ Entrada</span>' 
            : '<span class="status-baixo">⬇ Saída</span>';

        linha.innerHTML = `
            <td>${mov.data}</td>
            <td>${mov.codigo} - ${mov.produto}</td>
            <td>${tipoTexto}</td>
            <td>${mov.quantidade}</td>
            <td>${mov.observacao}</td>
            <td><strong>${mov.usuarioResponsavel || "-"}</strong></td>
        `;

        tabela.appendChild(linha);
    });
}

function listarProdutosBaixos() {
    if (!unidadeSelecionada) return;

    const tabela = document.getElementById("tabelaBaixo");
    tabela.innerHTML = "";

    const produtosBaixos = produtos.filter(
        p => p.unidadeId === unidadeSelecionada.id && p.estoque <= p.minimo
    );

    produtosBaixos.forEach(produto => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${produto.nome}</td>
            <td>${produto.codigo}</td>
            <td>${produto.estoque}</td>
            <td>${produto.minimo}</td>
            <td><span class="status-baixo"> ESTOQUE BAIXO</span></td>
        `;
        tabela.appendChild(linha);
    });

    if (produtosBaixos.length === 0) {
        tabela.innerHTML = `<tr><td colspan="5">✓ Nenhum produto com estoque baixo.</td></tr>`;
    }
}

function atualizarDashboard() {
    if (!unidadeSelecionada) return;

    const produtosUnidade = produtos.filter(p => p.unidadeId === unidadeSelecionada.id);
    const movimentacoesUnidade = movimentacoes.filter(m => m.unidadeId === unidadeSelecionada.id);

    document.getElementById("totalProdutos").textContent = produtosUnidade.length;
    document.getElementById("totalEstoque").textContent = produtosUnidade.reduce((acc, p) => acc + p.estoque, 0);
    document.getElementById("totalBaixo").textContent = produtosUnidade.filter(p => p.estoque <= p.minimo).length;
    document.getElementById("totalMovimentacoes").textContent = movimentacoesUnidade.length;

    listarProdutosBaixos();
}

function exportarProdutosExcel() {
    if (!unidadeSelecionada || !temPermissao("exportar_excel")) return;

    const produtosUnidade = produtos.filter(p => p.unidadeId === unidadeSelecionada.id);
    const dadosExcel = produtosUnidade.map(p => ({
        "Código": p.codigo,
        "Nome do Produto": p.nome,
        "Categoria": p.categoria || "-",
        "Estoque Atual": p.estoque,
        "Estoque Mínimo": p.minimo
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, `produtos_${unidadeSelecionada.id}.xlsx`);
}

function exportarHistoricoExcel() {
    if (!unidadeSelecionada || !temPermissao("exportar_excel")) return;

    const historicoUnidade = movimentacoes.filter(m => m.unidadeId === unidadeSelecionada.id);
    const dadosExcel = historicoUnidade.map(m => ({
        "Data": m.data,
        "Código": m.codigo,
        "Produto": m.produto,
        "Tipo": m.tipo.toUpperCase(),
        "Quantidade": m.quantidade,
        "Observação": m.observacao,
        "Usuário": m.usuarioResponsavel || "-"
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
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

document.addEventListener("DOMContentLoaded", function() {
    iniciarSessao();
});
