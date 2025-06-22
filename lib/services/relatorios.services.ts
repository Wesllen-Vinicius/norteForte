// lib/services/relatorios.services.ts
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { Movimentacao } from "./estoque.services";
import { Venda } from "./vendas.services";
import { Producao } from "./producao.services";

const getDataInPeriod = async <T>(collectionName: string, dataInicio: Date, dataFim: Date): Promise<T[]> => {
    const collectionRef = collection(db, collectionName);
    const inicioTimestamp = Timestamp.fromDate(dataInicio);
    const fimTimestamp = Timestamp.fromDate(new Date(dataFim.setHours(23, 59, 59, 999)));

    const q = query(
        collectionRef,
        where("data", ">=", inicioTimestamp),
        where("data", "<=", fimTimestamp),
        orderBy("data", "desc")
    );

    const querySnapshot = await getDocs(q);
    const data: T[] = [];

    querySnapshot.forEach((doc) => {
        const docData = doc.data();
        const typedData = {
          ...docData,
          id: doc.id,
          data: (docData.data as Timestamp).toDate(),
        } as T;
        data.push(typedData);
    });

    return data;
}

export const getMovimentacoesPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod<Movimentacao>("movimentacoesEstoque", dataInicio, dataFim);
}

export const getVendasPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod<Venda>("vendas", dataInicio, dataFim);
}

export const getProducoesPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod<Producao>("producoes", dataInicio, dataFim);
}
