import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp,
    query,
    where,
    getDocs,
    QuerySnapshot,
    DocumentData,
    Timestamp,
    runTransaction,
} from "firebase/firestore";
import { DespesaOperacional } from "@/lib/schemas";

export const addDespesa = async (despesa: Omit<DespesaOperacional, "id" | "createdAt">) => {
    try {
        await runTransaction(db, async (transaction) => {
            const despesaData = {
                ...despesa,
                createdAt: serverTimestamp(),
                dataVencimento: Timestamp.fromDate(despesa.dataVencimento)
            };
            const despesaDocRef = doc(collection(db, "despesas"));
            transaction.set(despesaDocRef, despesaData);

            const contaPagarData = {
                despesaId: despesaDocRef.id,
                fornecedorId: 'despesa_operacional',
                notaFiscal: despesa.categoria,
                valor: despesa.valor,
                dataEmissao: Timestamp.now(),
                dataVencimento: Timestamp.fromDate(despesa.dataVencimento),
                status: 'Pendente',
                parcela: '1/1',
            };
            const contaPagarDocRef = doc(collection(db, "contasAPagar"));
            transaction.set(contaPagarDocRef, contaPagarData);
        });
    } catch (e) {
        console.error("Erro ao adicionar despesa: ", e);
        throw new Error("Não foi possível adicionar a despesa.");
    }
};

export const subscribeToDespesas = (callback: (despesas: DespesaOperacional[]) => void) => {
    // CORREÇÃO: Removido o orderBy da consulta para não exigir um índice composto.
    const q = query(collection(db, "despesas"), where("status", "==", "Pendente"));

    return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
        const despesas: DespesaOperacional[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            despesas.push({
                id: doc.id,
                ...data,
                dataVencimento: (data.dataVencimento as Timestamp).toDate(),
            } as DespesaOperacional);
        });
        // A ordenação agora é feita no lado do cliente.
        const despesasOrdenadas = despesas.sort((a, b) => a.dataVencimento.getTime() - b.dataVencimento.getTime());
        callback(despesasOrdenadas);
    });
};

export const setDespesaStatus = async (id: string, status: 'Pendente' | 'Paga') => {
    const despesaDoc = doc(db, "despesas", id);
    await updateDoc(despesaDoc, { status });

    const contasRef = collection(db, "contasAPagar");
    const q = query(contasRef, where("despesaId", "==", id));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (docSnapshot) => {
        await updateDoc(docSnapshot.ref, { status });
    });
};

export const updateDespesa = async (id: string, despesa: Partial<Omit<DespesaOperacional, 'id' | 'createdAt'>>) => {
  const despesaDoc = doc(db, "despesas", id);
  const dataToUpdate: { [key: string]: any } = { ...despesa };
  if(despesa.dataVencimento) {
      dataToUpdate.dataVencimento = Timestamp.fromDate(despesa.dataVencimento);
  }
  await updateDoc(despesaDoc, dataToUpdate);
};
