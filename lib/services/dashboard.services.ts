// lib/services/dashboard.services.ts
import { db } from "@/lib/firebase";
import { collection, getCountFromServer, getDocs, query, where, Timestamp, orderBy } from "firebase/firestore";
import { format } from 'date-fns';

// Busca os dados para os cartões de resumo
export const getDashboardStats = async () => {
    // Busca o total de documentos em uma coleção
    const getCollectionCount = async (collectionName: string) => {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getCountFromServer(collectionRef);
        return snapshot.data().count;
    };

    const [totalFuncionarios, totalProdutos, totalMovimentacoes] = await Promise.all([
        getCollectionCount("funcionarios"),
        getCollectionCount("produtos"),
        getCollectionCount("movimentacoesEstoque")
    ]);

    return { totalFuncionarios, totalProdutos, totalMovimentacoes };
};

// Busca e agrega os dados para o gráfico de movimentações dos últimos 30 dias
export const getMovimentacoesParaGrafico = async () => {
    const movimentacoesRef = collection(db, "movimentacoesEstoque");
    const hoje = new Date();
    const trintaDiasAtras = new Date(hoje.setDate(hoje.getDate() - 30));

    const q = query(
        movimentacoesRef,
        where("data", ">=", Timestamp.fromDate(trintaDiasAtras)),
        orderBy("data", "asc")
    );

    const querySnapshot = await getDocs(q);

    // Agrupa as movimentações por dia
    const agregados: { [key: string]: { entradas: number; saidas: number } } = {};

    querySnapshot.forEach(doc => {
        const mov = doc.data();
        const data = (mov.data as Timestamp).toDate();
        const diaFormatado = format(data, "yyyy-MM-dd");

        if (!agregados[diaFormatado]) {
            agregados[diaFormatado] = { entradas: 0, saidas: 0 };
        }

        if (mov.tipo === 'entrada') {
            agregados[diaFormatado].entradas += mov.quantidade;
        } else {
            agregados[diaFormatado].saidas += mov.quantidade;
        }
    });

    // Converte o objeto de agregados para o formato que o gráfico espera
    return Object.entries(agregados).map(([date, values]) => ({
        date,
        ...values
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};
