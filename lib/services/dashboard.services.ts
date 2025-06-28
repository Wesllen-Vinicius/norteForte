import { db } from "@/lib/firebase";
import { collection, getCountFromServer, getDocs, query, where, Timestamp, orderBy } from "firebase/firestore";
import { format } from 'date-fns';
import { useDataStore } from "@/store/data.store";
import { Producao, Movimentacao, Venda } from "@/lib/schemas";

const getCollectionCount = async (collectionName: string) => {
    const coll = collection(db, collectionName);
    const q = query(coll, where("status", "==", "ativo")); // Considera apenas ativos
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
};

const getVendasMes = async () => {
    const vendasRef = collection(db, "vendas");
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const q = query(vendasRef, where("data", ">=", Timestamp.fromDate(primeiroDiaMes)));

    const querySnapshot = await getDocs(q);
    let valorTotal = 0;
    let lucroBruto = 0;

    querySnapshot.forEach(doc => {
        const venda = doc.data() as Venda;
        if (venda && typeof venda.valorTotal === 'number') {
            valorTotal += venda.valorTotal;
        }
        if (Array.isArray(venda.produtos)) {
            venda.produtos.forEach((item) => {
                if (typeof item.precoUnitario === 'number' && typeof item.custoUnitario === 'number' && typeof item.quantidade === 'number') {
                    lucroBruto += (item.precoUnitario - item.custoUnitario) * item.quantidade;
                }
            });
        }
    });
    return { valorTotal, lucroBruto };
};

const getContasResumo = async () => {
    const contasAPagarRef = collection(db, "contasAPagar");
    const contasAReceberRef = collection(db, "contasAReceber");
    const despesasRef = collection(db, "despesas"); // Adicionado

    const qPagar = query(contasAPagarRef, where("status", "==", "Pendente"));
    const qReceber = query(contasAReceberRef, where("status", "==", "Pendente"));
    const qDespesas = query(despesasRef, where("status", "==", "Pendente")); // Adicionado

    const [pagarSnapshot, receberSnapshot, despesasSnapshot] = await Promise.all([
        getDocs(qPagar),
        getDocs(qReceber),
        getDocs(qDespesas) // Adicionado
    ]);

    const totalComprasAPagar = pagarSnapshot.docs.reduce((sum, doc) => sum + (doc.data().valor || 0), 0);
    const totalDespesasAPagar = despesasSnapshot.docs.reduce((sum, doc) => sum + (doc.data().valor || 0), 0);
    const totalAPagar = totalComprasAPagar + totalDespesasAPagar; // Soma de compras e despesas

    const totalAReceber = receberSnapshot.docs.reduce((sum, doc) => sum + (doc.data().valor || 0), 0);

    return { totalAPagar, totalAReceber };
}

export const getDashboardStats = async () => {
    const [totalFuncionarios, totalProdutos, totalClientes, vendasMes, contasResumo] = await Promise.all([
        getCollectionCount("funcionarios"),
        getCollectionCount("produtos"),
        getCollectionCount("clientes"),
        getVendasMes(),
        getContasResumo(),
    ]);

    return {
        totalFuncionarios,
        totalProdutos,
        totalClientes,
        totalVendasMes: vendasMes.valorTotal,
        lucroBrutoMes: vendasMes.lucroBruto,
        totalAPagar: contasResumo.totalAPagar,
        totalAReceber: contasResumo.totalAReceber,
    };
};

export const getMovimentacoesParaGrafico = async () => {
    const movimentacoesRef = collection(db, "movimentacoesEstoque");
    const hoje = new Date();
    const trintaDiasAtras = new Date(new Date().setDate(hoje.getDate() - 30));

    const q = query(
        movimentacoesRef,
        where("data", ">=", Timestamp.fromDate(trintaDiasAtras)),
        orderBy("data", "asc")
    );

    const querySnapshot = await getDocs(q);
    const { produtos, unidades } = useDataStore.getState();
    const agregados: { [key: string]: { entradas: number; saidas: number } } = {};

    querySnapshot.forEach(doc => {
        const mov = doc.data() as Movimentacao;
        const produto = produtos.find(p => p.id === mov.produtoId);

        let unidadeSigla = 'un';
        if (produto && (produto.tipoProduto === 'VENDA' || produto.tipoProduto === 'MATERIA_PRIMA') && produto.unidadeId) {
            unidadeSigla = unidades.find(u => u.id === produto.unidadeId)?.sigla || 'un';
        }

        if (unidadeSigla.toLowerCase() !== 'kg') return;

        const movData = mov.data as unknown;
        if (movData instanceof Timestamp) {
            const data = movData.toDate();
            const diaFormatado = format(data, "yyyy-MM-dd");

            if (!agregados[diaFormatado]) {
                agregados[diaFormatado] = { entradas: 0, saidas: 0 };
            }

            if (mov.tipo === 'entrada') {
                agregados[diaFormatado].entradas += mov.quantidade || 0;
            } else {
                agregados[diaFormatado].saidas += mov.quantidade || 0;
            }
        }
    });

    return Object.entries(agregados).map(([date, values]) => ({
        date,
        ...values
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};


export const getProdutosMaisVendidos = async () => {
    const vendasRef = collection(db, "vendas");
    const trintaDiasAtras = new Date(new Date().setDate(new Date().getDate() - 30));
    const q = query(vendasRef, where("data", ">=", Timestamp.fromDate(trintaDiasAtras)));

    const querySnapshot = await getDocs(q);
    const contagemProdutos: { [key: string]: { nome: string; quantidade: number } } = {};

    querySnapshot.forEach(doc => {
        const venda = doc.data();
        if (Array.isArray(venda.produtos) && venda.produtos.length > 0) {
            venda.produtos.forEach((item: any) => {
                if (item && item.produtoId && typeof item.quantidade === 'number') {
                    if(contagemProdutos[item.produtoId]) {
                        contagemProdutos[item.produtoId].quantidade += item.quantidade;
                    } else {
                        contagemProdutos[item.produtoId] = { nome: item.produtoNome || "Produto s/ nome", quantidade: item.quantidade };
                    }
                }
            });
        }
    });

    return Object.values(contagemProdutos)
        .sort((a,b) => b.quantidade - a.quantidade)
        .slice(0, 5);
}

export const getVendasPorCondicao = async () => {
    const vendasRef = collection(db, "vendas");
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const q = query(vendasRef, where("data", ">=", Timestamp.fromDate(primeiroDiaMes)));
    const querySnapshot = await getDocs(q);

    let aVista = 0;
    let aPrazo = 0;

    querySnapshot.forEach(doc => {
        if(doc.data().condicaoPagamento === 'A_VISTA') aVista++;
        if(doc.data().condicaoPagamento === 'A_PRAZO') aPrazo++;
    });

    return [{ name: "À Vista", value: aVista, fill: "hsl(var(--chart-1))" }, { name: "A Prazo", value: aPrazo, fill: "hsl(var(--chart-2))" }];
}

export const getProducaoResumoPeriodo = async () => {
    const producoesRef = collection(db, "producoes");
    const hoje = new Date();
    const trintaDiasAtras = new Date(new Date().setDate(hoje.getDate() - 30));
    const q = query(producoesRef, where("data", ">=", Timestamp.fromDate(trintaDiasAtras)));
    const querySnapshot = await getDocs(q);
    const { produtos, unidades } = useDataStore.getState();

    const totais: { produzido: { [key: string]: number }, perdas: { [key: string]: number } } = {
        produzido: {},
        perdas: {},
    };

    querySnapshot.forEach(doc => {
        const producao = doc.data() as Producao;
        if(Array.isArray(producao.produtos)) {
            producao.produtos.forEach((item) => {
                const produtoInfo = produtos.find(p => p.id === item.produtoId);
                let unidadeSigla = 'un';
                if (produtoInfo && (produtoInfo.tipoProduto === 'VENDA' || produtoInfo.tipoProduto === 'MATERIA_PRIMA') && produtoInfo.unidadeId) {
                    unidadeSigla = unidades.find(u => u.id === produtoInfo.unidadeId)?.sigla || 'un';
                }

                if (!totais.produzido[unidadeSigla]) totais.produzido[unidadeSigla] = 0;
                if (!totais.perdas[unidadeSigla]) totais.perdas[unidadeSigla] = 0;

                totais.produzido[unidadeSigla] += item.quantidade || 0;
                totais.perdas[unidadeSigla] += item.perda || 0;
            });
        }
    });

    const unidadePrincipal = 'kg';
    const produzido = totais.produzido[unidadePrincipal] || Object.values(totais.produzido)[0] || 0;
    const perdas = totais.perdas[unidadePrincipal] || Object.values(totais.perdas)[0] || 0;
    const total = produzido + perdas;
    const rendimento = total > 0 ? (produzido / total) * 100 : 0;

    return { produzido, perdas, rendimento, totais };
}
