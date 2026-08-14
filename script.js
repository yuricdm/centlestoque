// ========================================
// BANCO DE DADOS LOCAL
// ========================================

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
// CONTROLE DE AUTENTICAÇÃO / SESSÃO
// ========================================

function realizarLogin() {
    const select = document.getElementById("selectUsuarioLogin");
    const unidadeValor = select.value;
    const unidadeTexto = select.options[select.selectedIndex].text;

    usuarioLogado = {
        unidadeId: unidadeValor, // 'PELOTAS' ou 'PORTO_ALEGRE'
        unidadeNome: unidadeTexto
    };

    sessionStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));
    iniciarSessao();
}

function realizarLogout() {
    sessionStorage.removeItem("usuarioLogado");
    usuarioLogado = null;
    iniciarSessao();
}

function iniciarSessao() {
    const menuNav = document.getElementById("menuNavegacao");
    const infoHeader = document.getElementById("infoUsuarioHeader");
    const nomeUnidadeElem = document.getElementById("nomeUnidadeAtual");

    if (usuarioLogado) {
        menuNav.classList.remove("oculto");
        infoHeader.classList.remove("oculto");
        if (nomeUnidadeElem) {
            nomeUnidadeElem.textContent = usuarioLogado.unidadeNome;
        }

        // Atualiza os títulos das páginas com o nome da unidade
        document.querySelectorAll(".badge-unidade").forEach(el => {
            el.textContent = usuarioLogado.unidadeNome;
        });

        mostrarPagina("dashboard");
    } else {
        menuNav.classList.add("oculto");
        infoHeader.classList.add("oculto");
        mostrarPagina("login");
    }
}


// ========================================
// SALVAR DADOS
// ========================================

function salvarDados() {

    localStorage.setItem(
        "produtos",
        JSON.stringify(produtos)
    );

    localStorage.setItem(
        "movimentacoes",
        JSON.stringify(movimentacoes)
    );
}


// ========================================
// TROCAR PÁGINAS
// ========================================

function mostrarPagina(pagina) {

    document.querySelectorAll(".pagina").forEach(function(secao) {

        secao.classList.add("oculto");

    });

    const paginaAlvo = document.getElementById(pagina);
    if (paginaAlvo) {
        paginaAlvo.classList.remove("oculto");
    }

    if (usuarioLogado && pagina !== 'login') {
        atualizarSistema();
    }
}


// ========================================
// SALVAR PRODUTO
// ========================================

function salvarProduto() {

    if (!usuarioLogado) return;

    const id = document
        .getElementById("produtoId")
        .value;

    const nome = document
        .getElementById("nomeProduto")
        .value
        .trim();

    const codigo = document
        .getElementById("codigoProduto")
        .value
        .trim();

    const categoria = document
        .getElementById("categoriaProduto")
        .value
        .trim();

    const estoque = Number(
        document.getElementById("estoqueInicial").value
    );

    const minimo = Number(
        document.getElementById("estoqueMinimo").value
    );


    if (!nome || !codigo) {

        alert("Preencha o nome e o código do produto.");

        return;
    }


    if (estoque < 0 || minimo < 0) {

        alert("Os valores não podem ser negativos.");

        return;
    }


    // EDITAR PRODUTO

    if (id) {

        const produto = produtos.find(
            p => p.id == id && p.unidadeId === usuarioLogado.unidadeId
        );

        if (produto) {

            produto.nome = nome;
            produto.codigo = codigo;
            produto.categoria = categoria;
            produto.minimo = minimo;

        }

        alert("Produto atualizado com sucesso.");

    }

    // NOVO PRODUTO

    else {

        const codigoExiste = produtos.some(
            p => p.unidadeId === usuarioLogado.unidadeId && p.codigo.toLowerCase() === codigo.toLowerCase()
        );

        if (codigoExiste) {

            alert("Já existe um produto com este código nesta unidade.");

            return;
        }


        const novoProduto = {

            id: Date.now(),

            unidadeId: usuarioLogado.unidadeId, // VINCULA À UNIDADE ATUAL

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


// ========================================
// LIMPAR FORMULÁRIO
// ========================================

function limparFormulario() {

    document.getElementById("produtoId").value = "";

    document.getElementById("nomeProduto").value = "";

    document.getElementById("codigoProduto").value = "";

    document.getElementById("categoriaProduto").value = "";

    document.getElementById("estoqueInicial").value = 0;

    document.getElementById("estoqueMinimo").value = 1;
}


// ========================================
// LISTAR PRODUTOS (FILTRADO POR UNIDADE)
// ========================================

function listarProdutos() {

    if (!usuarioLogado) return;

    const tabela =
        document.getElementById("tabelaProdutos");

    const pesquisa =
        document
        .getElementById("pesquisa")
        .value
        .toLowerCase();


    tabela.innerHTML = "";


    // Filtra produtos pertencentes APENAS à unidade atual
    const lista = produtos.filter(function(produto) {

        const pertenceAUnidade = produto.unidadeId === usuarioLogado.unidadeId;

        const batePesquisa = (
            produto.nome.toLowerCase().includes(pesquisa) ||
            produto.codigo.toLowerCase().includes(pesquisa) ||
            produto.categoria.toLowerCase().includes(pesquisa)
        );

        return pertenceAUnidade && batePesquisa;

    });


    lista.forEach(function(produto) {

        const baixo =
            produto.estoque <= produto.minimo;


        const linha =
            document.createElement("tr");


        linha.innerHTML = `

            <td>${produto.nome}</td>

            <td>${produto.codigo}</td>

            <td>${produto.categoria || "-"}</td>

            <td>${produto.estoque}</td>

            <td>${produto.minimo}</td>

            <td>

                ${
                    baixo
                    ? '<span class="status-baixo">⚠️ BAIXO</span>'
                    : '<span class="status-ok">✓ OK</span>'
                }

            </td>

            <td>

                <button
                    class="btn-editar"
                    onclick="editarProduto(${produto.id})"
                >
                    Editar
                </button>

                <button
                    class="btn-excluir"
                    onclick="excluirProduto(${produto.id})"
                >
                    Excluir
                </button>

            </td>

        `;


        tabela.appendChild(linha);

    });

}


// ========================================
// EDITAR PRODUTO
// ========================================

function editarProduto(id) {

    if (!usuarioLogado) return;

    const produto =
        produtos.find(p => p.id == id && p.unidadeId === usuarioLogado.unidadeId);


    if (!produto) return;


    document.getElementById("produtoId").value =
        produto.id;

    document.getElementById("nomeProduto").value =
        produto.nome;

    document.getElementById("codigoProduto").value =
        produto.codigo;

    document.getElementById("categoriaProduto").value =
        produto.categoria;

    document.getElementById("estoqueInicial").value =
        produto.estoque;

    document.getElementById("estoqueMinimo").value =
        produto.minimo;


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// ========================================
// EXCLUIR PRODUTO
// ========================================

function excluirProduto(id) {

    if (!usuarioLogado) return;

    const produto =
        produtos.find(p => p.id == id && p.unidadeId === usuarioLogado.unidadeId);


    if (!produto) return;


    const confirmar = confirm(
        `Deseja excluir o produto "${produto.nome}"?`
    );


    if (!confirmar) return;


    produtos = produtos.filter(
        p => !(p.id == id && p.unidadeId === usuarioLogado.unidadeId)
    );


    salvarDados();

    atualizarSistema();

    alert("Produto excluído.");
}


// ========================================
// ATUALIZAR SELECT DE PRODUTOS
// ========================================

function atualizarSelectProdutos() {

    if (!usuarioLogado) return;

    const select =
        document.getElementById(
            "produtoMovimentacao"
        );


    select.innerHTML =
        '<option value="">Selecione um produto</option>';


    // Filtra produtos por unidade no select
    const produtosUnidade = produtos.filter(p => p.unidadeId === usuarioLogado.unidadeId);

    produtosUnidade.forEach(function(produto) {

        const option =
            document.createElement("option");


        option.value = produto.id;


        option.textContent =
            `${produto.codigo} - ${produto.nome} (Estoque: ${produto.estoque})`;


        select.appendChild(option);

    });

}


// ========================================
// REGISTRAR MOVIMENTAÇÃO
// ========================================

function registrarMovimentacao() {

    if (!usuarioLogado) return;

    const produtoId =
        Number(
            document.getElementById(
                "produtoMovimentacao"
            ).value
        );


    const tipo =
        document.getElementById(
            "tipoMovimentacao"
        ).value;


    const quantidade =
        Number(
            document.getElementById(
                "quantidadeMovimentacao"
            ).value
        );


    const observacao =
        document.getElementById(
            "observacaoMovimentacao"
        ).value;


    if (!produtoId) {

        alert("Selecione um produto.");

        return;
    }


    if (quantidade <= 0) {

        alert("Informe uma quantidade válida.");

        return;
    }


    const produto =
        produtos.find(
            p => p.id === produtoId && p.unidadeId === usuarioLogado.unidadeId
        );


    if (!produto) {

        alert("Produto não encontrado.");

        return;
    }


    // ENTRADA

    if (tipo === "entrada") {

        produto.estoque += quantidade;

    }


    // SAÍDA

    else {

        if (quantidade > produto.estoque) {

            alert(
                `Estoque insuficiente!\n\n` +
                `Produto: ${produto.nome}\n` +
                `Estoque atual: ${produto.estoque}\n` +
                `Quantidade solicitada: ${quantidade}`
            );

            return;
        }


        produto.estoque -= quantidade;

    }


    // REGISTRA HISTÓRICO COM UNIDADE
    movimentacoes.push({

        id: Date.now(),

        unidadeId: usuarioLogado.unidadeId, // VINCULA À UNIDADE

        data: new Date().toLocaleString("pt-BR"),

        produto: produto.nome,

        codigo: produto.codigo,

        tipo: tipo,

        quantidade: quantidade,

        observacao: observacao || "-"

    });


    salvarDados();


    document.getElementById(
        "quantidadeMovimentacao"
    ).value = 1;


    document.getElementById(
        "observacaoMovimentacao"
    ).value = "";


    atualizarSistema();


    alert(
        tipo === "entrada"
        ? "Entrada registrada com sucesso!"
        : "Saída registrada com sucesso!"
    );


    // ALERTA DE ESTOQUE BAIXO

    if (produto.estoque <= produto.minimo) {

        alert(
            `⚠️ ATENÇÃO!\n\n` +
            `O produto "${produto.nome}" está com estoque baixo.\n\n` +
            `Estoque atual: ${produto.estoque}\n` +
            `Estoque mínimo: ${produto.minimo}`
        );

    }

}


// ========================================
// HISTÓRICO (FILTRADO POR UNIDADE)
// ========================================

function listarHistorico() {

    if (!usuarioLogado) return;

    const tabela =
        document.getElementById(
            "tabelaHistorico"
        );


    tabela.innerHTML = "";


    // Filtra histórico por unidade
    const historicoUnidade = movimentacoes.filter(m => m.unidadeId === usuarioLogado.unidadeId);

    const lista =
        [...historicoUnidade].reverse();


    lista.forEach(function(mov) {

        const linha =
            document.createElement("tr");


        const tipoTexto =
            mov.tipo === "entrada"
            ? '<span class="status-ok">⬆ Entrada</span>'
            : '<span class="status-baixo">⬇ Saída</span>';


        linha.innerHTML = `

            <td>${mov.data}</td>

            <td>
                ${mov.codigo} - ${mov.produto}
            </td>

            <td>
                ${tipoTexto}
            </td>

            <td>
                ${mov.quantidade}
            </td>

            <td>
                ${mov.observacao}
            </td>

        `;


        tabela.appendChild(linha);

    });

}


// ========================================
// PRODUTOS COM ESTOQUE BAIXO (UNIDADE)
// ========================================

function listarProdutosBaixos() {

    if (!usuarioLogado) return;

    const tabela =
        document.getElementById(
            "tabelaBaixo"
        );


    tabela.innerHTML = "";


    const produtosBaixos =
        produtos.filter(
            p => p.unidadeId === usuarioLogado.unidadeId && p.estoque <= p.minimo
        );


    produtosBaixos.forEach(function(produto) {

        const linha =
            document.createElement("tr");


        linha.innerHTML = `

            <td>${produto.nome}</td>

            <td>${produto.codigo}</td>

            <td>${produto.estoque}</td>

            <td>${produto.minimo}</td>

            <td>
                <span class="status-baixo">
                    ⚠️ ESTOQUE BAIXO
                </span>
            </td>

        `;


        tabela.appendChild(linha);

    });


    if (produtosBaixos.length === 0) {

        tabela.innerHTML = `

            <tr>

                <td colspan="5">
                    ✓ Nenhum produto com estoque baixo nesta unidade.
                </td>

            </tr>

        `;

    }

}


// ========================================
// ATUALIZAR DASHBOARD (FILTRADO)
// ========================================

function atualizarDashboard() {

    if (!usuarioLogado) return;

    const produtosUnidade = produtos.filter(p => p.unidadeId === usuarioLogado.unidadeId);

    const movimentacoesUnidade = movimentacoes.filter(m => m.unidadeId === usuarioLogado.unidadeId);


    const totalProdutos =
        produtosUnidade.length;


    const totalEstoque =
        produtosUnidade.reduce(
            (total, produto) =>
                total + produto.estoque,
            0
        );


    const totalBaixo =
        produtosUnidade.filter(
            produto =>
                produto.estoque <= produto.minimo
        ).length;


    const totalMovimentacoes =
        movimentacoesUnidade.length;


    document.getElementById(
        "totalProdutos"
    ).textContent =
        totalProdutos;


    document.getElementById(
        "totalEstoque"
    ).textContent =
        totalEstoque;


    document.getElementById(
        "totalBaixo"
    ).textContent =
        totalBaixo;


    document.getElementById(
        "totalMovimentacoes"
    ).textContent =
        totalMovimentacoes;


    listarProdutosBaixos();

}


// ========================================
// ATUALIZAR TODO O SISTEMA
// ========================================

function atualizarSistema() {

    if (!usuarioLogado) return;

    listarProdutos();

    listarHistorico();

    atualizarSelectProdutos();

    atualizarDashboard();

}


// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        iniciarSessao();

    }
);
