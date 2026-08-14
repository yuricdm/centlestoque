// ========================================
// BANCO DE DADOS LOCAL E USUÁRIOS CADASTRADOS
// ========================================

// Tabela de Usuários e Permissões
const USUARIOS_SISTEMA = {
    "admin": { senha: "1234", perfil: "admin", nome: "Admin Master" },
    "coordenador": { senha: "1234", perfil: "coordenador", nome: "Coordenador" },
    "supervisor": { senha: "1234", perfil: "supervisor", nome: "Supervisor" },
    "tecnico": { senha: "1234", perfil: "tecnico", nome: "Técnico" }
};

let produtos = JSON.parse(
    localStorage.getItem("produtos")
) || [];

let movimentacoes = JSON.parse(
    localStorage.getItem("movimentacoes")
) || [];

// USUÁRIO EM SESSÃO
let usuarioLogado = JSON.parse(
    sessionStorage.getItem("usuarioLogado")
) || null;


// ========================================
// CONTROLE DE AUTENTICAÇÃO E PERMISSÕES
// ========================================

function realizarLogin() {
    const usuarioVal = document.getElementById("usuarioInput").value.trim().toLowerCase();
    const senhaVal = document.getElementById("senhaInput").value.trim();
    const select = document.getElementById("selectUsuarioLogin");
    const unidadeValor = select.value;
    const unidadeTexto = select.options[select.selectedIndex].text;

    const conta = USUARIOS_SISTEMA[usuarioVal];

    if (conta && conta.senha === senhaVal) {
        usuarioLogado = {
            usuario: usuarioVal,
            nome: conta.nome,
            perfil: conta.perfil, // admin, coordenador, supervisor, tecnico
            unidadeId: unidadeValor,
            unidadeNome: unidadeTexto
        };

        sessionStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));
        iniciarSessao();
    } else {
        alert("Usuário ou senha incorretos!\n\nUsuários de teste (senha 1234):\n- admin\n- coordenador\n- supervisor\n- tecnico");
    }
}

function realizarLogout() {
    sessionStorage.removeItem("usuarioLogado");
    usuarioLogado = null;
    
    document.getElementById("usuarioInput").value = "";
    document.getElementById("senhaInput").value = "";

    iniciarSessao();
}

function aplicarPermissoesInterface() {
    if (!usuarioLogado) return;

    const perfil = usuarioLogado.perfil;

    const navDashboard = document.getElementById("navDashboard");
    const navProdutos = document.getElementById("navProdutos");
    const containerFormProdutos = document.getElementById("containerFormProdutos");
    const containerImportarExcel = document.getElementById("containerImportarExcel");
    const thAcoesProdutos = document.getElementById("thAcoesProdutos");

    // TÉCNICO: Apenas solicita entrada/saída e vê histórico
    if (perfil === "tecnico") {
        if (navDashboard) navDashboard.style.display = "none";
        if (containerFormProdutos) containerFormProdutos.style.display = "none";
        if (containerImportarExcel) containerImportarExcel.style.display = "none";
        if (thAcoesProdutos) thAcoesProdutos.style.display = "none";
    } 
    // SUPERVISOR: Adiciona e remove produtos/movimentações, relatórios
    else if (perfil === "supervisor") {
        if (navDashboard) navDashboard.style.display = "inline-block";
        if (containerFormProdutos) containerFormProdutos.style.display = "grid";
        if (containerImportarExcel) containerImportarExcel.style.display = "block";
        if (thAcoesProdutos) thAcoesProdutos.style.display = "table-cell";
    } 
    // ADMIN E COORDENADOR: Acesso Total
    else {
        if (navDashboard) navDashboard.style.display = "inline-block";
        if (containerFormProdutos) containerFormProdutos.style.display = "grid";
        if (containerImportarExcel) containerImportarExcel.style.display = "block";
        if (thAcoesProdutos) thAcoesProdutos.style.display = "table-cell";
    }
}

function iniciarSessao() {
    const menuNav = document.getElementById("menuNavegacao");
    const infoHeader = document.getElementById("infoUsuarioHeader");
    const nomeUnidadeElem = document.getElementById("nomeUnidadeAtual");

    if (usuarioLogado) {
        menuNav.classList.remove("oculto");
        infoHeader.classList.remove("oculto");
        
        if (nomeUnidadeElem) {
            nomeUnidadeElem.textContent = `${usuarioLogado.nome} (${usuarioLogado.perfil.toUpperCase()}) | ${usuarioLogado.unidadeNome}`;
        }

        document.querySelectorAll(".badge-unidade").forEach(el => {
            el.textContent = usuarioLogado.unidadeNome;
        });

        aplicarPermissoesInterface();

        // Se for técnico, abre direto em movimentação
        if (usuarioLogado.perfil === "tecnico") {
            mostrarPagina("movimentacao");
        } else {
            mostrarPagina("dashboard");
        }
    } else {
        menuNav.classList.add("oculto");
        infoHeader.classList.add("oculto");
        mostrarPagina("login");
    }
}


// ========================================
// SALVAR DADOS NO LOCALSTORAGE
// ========================================

function salvarDados() {
    localStorage.setItem("produtos", JSON.stringify(produtos));
    localStorage.setItem("movimentacoes", JSON.stringify(movimentacoes));
}


// ========================================
// TROCAR PÁGINAS
// ========================================

function mostrarPagina(pagina) {
    document.querySelectorAll(".pagina").forEach(secao => secao.classList.add("oculto"));

    const paginaAlvo = document.getElementById(pagina);
    if (paginaAlvo) {
        paginaAlvo.classList.remove("oculto");
    }

    if (usuarioLogado && pagina !== 'login') {
        atualizarSistema();
    }
}


// ========================================
// SALVAR / EDITAR PRODUTO
// ========================================

function salvarProduto() {
    if (!usuarioLogado) return;

    if (usuarioLogado.perfil === "tecnico") {
        alert("Seu perfil de Técnico não possui permissão para cadastrar ou editar produtos.");
        return;
    }

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

    if (estoque < 0 || minimo < 0) {
        alert("Os valores não podem ser negativos.");
        return;
    }

    if (id) {
        const produto = produtos.find(p => p.id == id && p.unidadeId === usuarioLogado.unidadeId);
        if (produto) {
            produto.nome = nome;
            produto.codigo = codigo;
            produto.categoria = categoria;
            produto.minimo = minimo;
        }
        alert("Produto atualizado com sucesso.");
    } else {
        const codigoExiste = produtos.some(
            p => p.unidadeId === usuarioLogado.unidadeId && p.codigo.toLowerCase() === codigo.toLowerCase()
        );

        if (codigoExiste) {
            alert("Já existe um produto com este código nesta unidade.");
            return;
        }

        const novoProduto = {
            id: Date.now(),
            unidadeId: usuarioLogado.unidadeId,
            nome: nome,
            codigo: codigo,
            categoria: categoria,
            estoque: estoque,
            minimo: minimo
        };

        produtos.push(novoProduto);
        alert("Produto cadastrado com sucesso.");
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


// ========================================
// LISTAR E GERENCIAR PRODUTOS
// ========================================

function listarProdutos() {
    if (!usuarioLogado) return;

    const tabela = document.getElementById("tabelaProdutos");
    const pesquisa = document.getElementById("pesquisa").value.toLowerCase();

    tabela.innerHTML = "";

    const lista = produtos.filter(produto => {
        const pertenceAUnidade = produto.unidadeId === usuarioLogado.unidadeId;
        const batePesquisa = (
            produto.nome.toLowerCase().includes(pesquisa) ||
            produto.codigo.toLowerCase().includes(pesquisa) ||
            produto.categoria.toLowerCase().includes(pesquisa)
        );
        return pertenceAUnidade && batePesquisa;
    });

    lista.forEach(produto => {
        const baixo = produto.estoque <= produto.minimo;
        const linha = document.createElement("tr");

        let acoesHtml = "";
        if (usuarioLogado.perfil !== "tecnico") {
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
            <td>${baixo ? '<span class="status-baixo">⚠️ BAIXO</span>' : '<span class="status-ok">✓ OK</span>'}</td>
            ${acoesHtml}
        `;

        tabela.appendChild(linha);
    });
}

function editarProduto(id) {
    if (!usuarioLogado || usuarioLogado.perfil === "tecnico") return;

    const produto = produtos.find(p => p.id == id && p.unidadeId === usuarioLogado.unidadeId);
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
    if (!usuarioLogado || usuarioLogado.perfil === "tecnico") return;

    const produto = produtos.find(p => p.id == id && p.unidadeId === usuarioLogado.unidadeId);
    if (!produto) return;

    if (!confirm(`Deseja excluir o produto "${produto.nome}"?`)) return;

    produtos = produtos.filter(p => !(p.id == id && p.unidadeId === usuarioLogado.unidadeId));

    salvarDados();
    atualizarSistema();
    alert("Produto excluído.");
}


// ========================================
// IMPORTAR E EXPORTAR EXCEL (SHEETJS)
// ========================================

function exportarProdutosExcel() {
    if (!usuarioLogado) return;

    const produtosUnidade = produtos.filter(p => p.unidadeId === usuarioLogado.unidadeId);

    if (produtosUnidade.length === 0) {
        alert("Não há produtos cadastrados para exportar nesta unidade.");
        return;
    }

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

    XLSX.writeFile(wb, `produtos_${usuarioLogado.unidadeId}.xlsx`);
}

function importarProdutosExcel(event) {
    if (!usuarioLogado || usuarioLogado.perfil === "tecnico") {
        alert("Seu perfil não permite importar dados.");
        return;
    }

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const primeiraAba = workbook.SheetNames[0];
            const linhas = XLSX.utils.sheet_to_json(workbook.Sheets[primeiraAba]);

            let cadastrados = 0;

            linhas.forEach(linha => {
                const codigo = String(linha["Código"] || linha["codigo"] || "").trim();
                const nome = String(linha["Nome do Produto"] || linha["nome"] || "").trim();
                const categoria = String(linha["Categoria"] || linha["categoria"] || "").trim();
                const estoque = Number(linha["Estoque Atual"] || linha["estoque"] || 0);
                const minimo = Number(linha["Estoque Mínimo"] || linha["minimo"] || 1);

                if (codigo && nome) {
                    const indexExistente = produtos.findIndex(
                        p => p.unidadeId === usuarioLogado.unidadeId && p.codigo.toLowerCase() === codigo.toLowerCase()
                    );

                    if (indexExistente !== -1) {
                        produtos[indexExistente].nome = nome;
                        produtos[indexExistente].categoria = categoria;
                        produtos[indexExistente].estoque = estoque;
                        produtos[indexExistente].minimo = minimo;
                    } else {
                        produtos.push({
                            id: Date.now() + Math.random(),
                            unidadeId: usuarioLogado.unidadeId,
                            nome: nome,
                            codigo: codigo,
                            categoria: categoria,
                            estoque: estoque,
                            minimo: minimo
                        });
                    }
                    cadastrados++;
                }
            });

            salvarDados();
            atualizarSistema();
            alert(`Processamento concluído! ${cadastrados} produto(s) importado(s)/atualizado(s).`);
        } catch (err) {
            alert("Erro ao ler arquivo Excel. Verifique se as colunas são: Código, Nome do Produto, Categoria, Estoque Atual, Estoque Mínimo.");
        }
        event.target.value = "";
    };

    reader.readAsArrayBuffer(file);
}

function exportarHistoricoExcel() {
    if (!usuarioLogado) return;

    const historicoUnidade = movimentacoes.filter(m => m.unidadeId === usuarioLogado.unidadeId);

    if (historicoUnidade.length === 0) {
        alert("Não há histórico de movimentações para exportar.");
        return;
    }

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

    XLSX.writeFile(wb, `historico_${usuarioLogado.unidadeId}.xlsx`);
}


// ========================================
// MOVIMENTAÇÕES E DASHBOARD
// ========================================

function atualizarSelectProdutos() {
    if (!usuarioLogado) return;

    const select = document.getElementById("produtoMovimentacao");
    select.innerHTML = '<option value="">Selecione um produto</option>';

    const produtosUnidade = produtos.filter(p => p.unidadeId === usuarioLogado.unidadeId);

    produtosUnidade.forEach(produto => {
        const option = document.createElement("option");
        option.value = produto.id;
        option.textContent = `${produto.codigo} - ${produto.nome} (Estoque: ${produto.estoque})`;
        select.appendChild(option);
    });
}

function registrarMovimentacao() {
    if (!usuarioLogado) return;

    const produtoId = Number(document.getElementById("produtoMovimentacao").value);
    const tipo = document.getElementById("tipoMovimentacao").value;
    const quantidade = Number(document.getElementById("quantidadeMovimentacao").value);
    const observacao = document.getElementById("observacaoMovimentacao").value;

    if (!produtoId || quantidade <= 0) {
        alert("Selecione um produto e uma quantidade válida.");
        return;
    }

    const produto = produtos.find(p => p.id === produtoId && p.unidadeId === usuarioLogado.unidadeId);

    if (!produto) {
        alert("Produto não encontrado.");
        return;
    }

    if (tipo === "entrada") {
        produto.estoque += quantidade;
    } else {
        if (quantidade > produto.estoque) {
            alert(`Estoque insuficiente! Estoque atual: ${produto.estoque}`);
            return;
        }
        produto.estoque -= quantidade;
    }

    movimentacoes.push({
        id: Date.now(),
        unidadeId: usuarioLogado.unidadeId,
        data: new Date().toLocaleString("pt-BR"),
        produto: produto.nome,
        codigo: produto.codigo,
        tipo: tipo,
        quantidade: quantidade,
        observacao: observacao || "-",
        usuarioResponsavel: usuarioLogado.nome
    });

    salvarDados();

    document.getElementById("quantidadeMovimentacao").value = 1;
    document.getElementById("observacaoMovimentacao").value = "";

    atualizarSistema();

    alert(tipo === "entrada" ? "Entrada registrada com sucesso!" : "Saída registrada com sucesso!");
}

function listarHistorico() {
    if (!usuarioLogado) return;

    const tabela = document.getElementById("tabelaHistorico");
    tabela.innerHTML = "";

    const historicoUnidade = movimentacoes.filter(m => m.unidadeId === usuarioLogado.unidadeId);
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
    if (!usuarioLogado) return;

    const tabela = document.getElementById("tabelaBaixo");
    tabela.innerHTML = "";

    const produtosBaixos = produtos.filter(
        p => p.unidadeId === usuarioLogado.unidadeId && p.estoque <= p.minimo
    );

    produtosBaixos.forEach(produto => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${produto.nome}</td>
            <td>${produto.codigo}</td>
            <td>${produto.estoque}</td>
            <td>${produto.minimo}</td>
            <td><span class="status-baixo">⚠️ ESTOQUE BAIXO</span></td>
        `;
        tabela.appendChild(linha);
    });

    if (produtosBaixos.length === 0) {
        tabela.innerHTML = `<tr><td colspan="5">✓ Nenhum produto com estoque baixo nesta unidade.</td></tr>`;
    }
}

function atualizarDashboard() {
    if (!usuarioLogado) return;

    const produtosUnidade = produtos.filter(p => p.unidadeId === usuarioLogado.unidadeId);
    const movimentacoesUnidade = movimentacoes.filter(m => m.unidadeId === usuarioLogado.unidadeId);

    document.getElementById("totalProdutos").textContent = produtosUnidade.length;
    document.getElementById("totalEstoque").textContent = produtosUnidade.reduce((acc, p) => acc + p.estoque, 0);
    document.getElementById("totalBaixo").textContent = produtosUnidade.filter(p => p.estoque <= p.minimo).length;
    document.getElementById("totalMovimentacoes").textContent = movimentacoesUnidade.length;

    listarProdutosBaixos();
}

function atualizarSistema() {
    if (!usuarioLogado) return;

    listarProdutos();
    listarHistorico();
    atualizarSelectProdutos();
    atualizarDashboard();
}

document.addEventListener("DOMContentLoaded", function() {
    iniciarSessao();
});
