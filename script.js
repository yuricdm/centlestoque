function registrarMovimentacao() {
    if (!usuarioLogado || !unidadeSelecionada) return;

    const produtoId = Number(document.getElementById("produtoMovimentacao").value);
    const tipo = document.getElementById("tipoMovimentacao").value;
    const quantidade = Number(document.getElementById("quantidadeMovimentacao").value);
    const observacao = document.getElementById("observacaoMovimentacao").value;

    if (!produtoId || quantidade <= 0) {
        alert("Selecione um produto e informe uma quantidade válida.");
        return;
    }

    const produto = produtos.find(p => p.id === produtoId && p.unidadeId === unidadeSelecionada.id);
    if (!produto) {
        alert("Produto não encontrado nesta unidade.");
        return;
    }

    // 1. ENTRADA DE MATERIAL (Livre para Técnicos, Supervisores e Coordenadores)
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

        alert(`Entrada de ${quantidade} un. de "${produto.nome}" registrada com sucesso!`);
    } 
    // 2. SAÍDA / RETIRADA DE MATERIAL
    else {
        if (quantidade > produto.estoque) {
            alert(`Estoque insuficiente! Saldo atual disponível: ${produto.estoque}`);
            return;
        }

        if (usuarioLogado.perfil === "tecnico") {
            // Técnico gera solicitação pendente
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

            alert("Solicitação de saída enviada com sucesso! Aguardando aprovação do Supervisor.");
        } else {
            // Supervisor/Coordenador/Admin dá saída direta
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

            alert("Saída de estoque realizada com sucesso!");
        }
    }

    salvarDados();
    document.getElementById("quantidadeMovimentacao").value = 1;
    document.getElementById("observacaoMovimentacao").value = "";
    atualizarSistema();
}
