import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp
} from "firebase/firestore";

interface MovimentacaoBancaria {
    id: string;
    data: Date;
    motivo: string;
    tipo: 'credito' | 'debito';
    valor: number;
    saldoAnterior: number;
    saldoNovo: number;
}

/**
 * Busca todas as movimentações (entradas e saídas) de uma conta bancária em um determinado período.
 * @param contaId - O ID da conta bancária.
 * @param dataInicio - A data de início do período.
 * @param dataFim - A data de fim do período.
 * @returns Uma lista de movimentações ordenadas por data.
 */
export const getMovimentacoesPorContaEPeriodo = async (
    contaId: string,
    dataInicio: Date,
    dataFim: Date
): Promise<MovimentacaoBancaria[]> => {
    const movimentacoesRef = collection(db, "movimentacoesBancarias");
    const inicioTimestamp = Timestamp.fromDate(dataInicio);
    const fimTimestamp = Timestamp.fromDate(new Date(dataFim.setHours(23, 59, 59, 999)));

    const q = query(
        movimentacoesRef,
        where("contaId", "==", contaId),
        where("data", ">=", inicioTimestamp),
        where("data", "<=", fimTimestamp),
        orderBy("data", "asc") // Ordena do mais antigo para o mais novo para o extrato
    );

    const querySnapshot = await getDocs(q);
    const movimentacoes: MovimentacaoBancaria[] = [];

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        movimentacoes.push({
            id: doc.id,
            ...data,
            data: (data.data as Timestamp).toDate(),
        } as MovimentacaoBancaria);
    });

    return movimentacoes;
};
