import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import {
    Movimentacao,
    Venda,
    Producao,
    Cliente,
    Fornecedor,
    Produto,
    Funcionario,
    Compra,
    ContaAReceber,
    DespesaOperacional // Importado o tipo de Despesa
} from "@/lib/schemas";

// Função genérica atualizada para aceitar o nome do campo de data
const getDataInPeriod = async <T>(
    collectionName: string,
    dateField: string,
    dataInicio: Date,
    dataFim: Date
): Promise<T[]> => {
    const collectionRef = collection(db, collectionName);
    const inicioTimestamp = Timestamp.fromDate(dataInicio);
    const fimTimestamp = Timestamp.fromDate(new Date(dataFim.setHours(23, 59, 59, 999)));

    const q = query(
        collectionRef,
        where(dateField, ">=", inicioTimestamp),
        where(dateField, "<=", fimTimestamp),
        orderBy(dateField, "desc")
    );

    const querySnapshot = await getDocs(q);
    const data: T[] = [];

    querySnapshot.forEach((doc) => {
        const docData = doc.data();

        // Converte todos os campos de data que são Timestamps
        const convertedData: { [key: string]: any } = {};
        for (const key in docData) {
            if (docData[key] instanceof Timestamp) {
                convertedData[key] = docData[key].toDate();
            } else {
                convertedData[key] = docData[key];
            }
        }

        const typedData = {
          ...convertedData,
          id: doc.id,
        } as T;
        data.push(typedData);
    });

    return data;
}

// Funções existentes
export const getMovimentacoesPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod<Movimentacao>("movimentacoesEstoque", "data", dataInicio, dataFim);
}

export const getVendasPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod<Venda>("vendas", "data", dataInicio, dataFim);
}

export const getProducoesPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod<Producao>("producoes", "data", dataInicio, dataFim);
}

export const getClientesPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod<Cliente>("clientes", "createdAt", dataInicio, dataFim);
}

export const getFornecedoresPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod<Fornecedor>("fornecedores", "createdAt", dataInicio, dataFim);
}

export const getProdutosPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod<Produto>("produtos", "createdAt", dataInicio, dataFim);
}

export const getFuncionariosPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod<Funcionario>("funcionarios", "createdAt", dataInicio, dataFim);
}

export const getComprasPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod<Compra>("compras", "data", dataInicio, dataFim);
}

export const getContasAPagarPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod<any>("contasAPagar", "dataEmissao", dataInicio, dataFim);
}

export const getContasAReceberPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod<ContaAReceber>("contasAReceber", "dataEmissao", dataInicio, dataFim);
}

// Nova função para buscar despesas
export const getDespesasPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod<DespesaOperacional>("despesas", "dataVencimento", dataInicio, dataFim);
}
