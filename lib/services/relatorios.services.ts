// lib/services/relatorios.services.ts
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { Movimentacao } from "./estoque.services";

// Busca movimentações de estoque por período
export const getMovimentacoesPorPeriodo = async (dataInicio: Date, dataFim: Date): Promise<Movimentacao[]> => {
    const movimentacoesRef = collection(db, "movimentacoesEstoque");

    // Converte as datas para Timestamps do Firestore
    const inicioTimestamp = Timestamp.fromDate(dataInicio);
    const fimTimestamp = Timestamp.fromDate(new Date(dataFim.setHours(23, 59, 59, 999))); // Garante que o fim do dia seja incluído

    const q = query(
        movimentacoesRef,
        where("data", ">=", inicioTimestamp),
        where("data", "<=", fimTimestamp),
        orderBy("data", "desc")
    );

    const querySnapshot = await getDocs(q);
    const movimentacoes: Movimentacao[] = [];

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Converte o Timestamp do Firebase para um objeto Date do JS para facilitar a formatação na UI
        const movimentacao = {
          ...data,
          data: (data.data as Timestamp).toDate(),
        } as unknown as Movimentacao;
        movimentacoes.push(movimentacao);
    });

    return movimentacoes;
}
