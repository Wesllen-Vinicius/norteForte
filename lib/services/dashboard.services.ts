// lib/services/dashboard.services.ts
import { db } from "@/lib/firebase";
import { collection, getCountFromServer, getDocs, query, where, Timestamp, orderBy } from "firebase/firestore";
import { format } from 'date-fns';
import { Venda } from "./vendas.services";

// Busca os dados para os cartões de resumo
export const getDashboardStats = async () => {
    const getCollectionCount = async (collectionName: string) => {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getCountFromServer(collectionRef);
        return snapshot.data().count;
    };

    const getTotalVendasMes = async () => {
        const vendasRef = collection(db, "vendas");
        const hoje = new Date();
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const q = query(vendasRef, where("data", ">=", Timestamp.fromDate(primeiroDiaMes)));
        const querySnapshot = await getDocs(q);
        let total = 0;
        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data && typeof data.valorTotal === 'number') {
                total += data.valorTotal;
            }
        });
        return total;
    };

    const [totalFuncionarios, totalProdutos, totalClientes, totalVendasMes] = await Promise.all([
        getCollectionCount("funcionarios"),
        getCollectionCount("produtos"),
        getCollectionCount("clientes"),
        getTotalVendasMes(),
    ]);

    return { totalFuncionarios, totalProdutos, totalClientes, totalVendasMes };
};

// Busca e agrega os dados para o gráfico de movimentações dos últimos 30 dias
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
    const agregados: { [key: string]: { entradas: number; saidas: number } } = {};

    querySnapshot.forEach(doc => {
        const mov = doc.data();
        if (mov.data && typeof mov.data.toDate === 'function') {
            const data = mov.data.toDate();
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

// Nova função para buscar os produtos mais vendidos (agora mais robusta)
export const getProdutosMaisVendidos = async () => {
    const vendasRef = collection(db, "vendas");
    const trintaDiasAtras = new Date(new Date().setDate(new Date().getDate() - 30));
    const q = query(vendasRef, where("data", ">=", Timestamp.fromDate(trintaDiasAtras)));

    const querySnapshot = await getDocs(q);
    const contagemProdutos: { [key: string]: { nome: string; quantidade: number } } = {};

    querySnapshot.forEach(doc => {
        const venda = doc.data();

        // VERIFICAÇÃO DE SEGURANÇA: Garante que 'produtos' seja um array antes de iterar
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
        .slice(0, 5); // Retorna o top 5
}
