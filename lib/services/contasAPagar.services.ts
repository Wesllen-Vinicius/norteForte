import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    query,
    orderBy,
    runTransaction,
    Timestamp,
    serverTimestamp
} from "firebase/firestore";

interface ContaAPagar {
    id: string;
    valor: number;
    status: 'Pendente' | 'Paga';
    despesaId?: string; // ID da despesa se for uma despesa operacional
}

export const subscribeToContasAPagar = (callback: (contas: any[]) => void) => {
    const q = query(collection(db, "contasAPagar"), orderBy("dataVencimento", "asc"));

    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dataEmissao: (doc.data().dataEmissao as Timestamp).toDate(),
            dataVencimento: (doc.data().dataVencimento as Timestamp).toDate(),
        }));
        callback(data);
    });
};

/**
 * Realiza a baixa de uma conta a pagar de forma segura via Cloud Function.
 * A lógica de transação, como a atualização de saldos e status, agora é executada no servidor.
 * @param conta - O objeto da conta a pagar.
 * @param contaBancariaId - O ID da conta bancária de onde o valor será debitado.
 */
export const pagarConta = async (conta: ContaAPagar, contaBancariaId: string) => {
    try {
        const pagarContaFunction = httpsCallable(functions, 'pagarContaHttps');

        // O UID do usuário que está fazendo a chamada é verificado automaticamente no backend.
        await pagarContaFunction({
            contaId: conta.id,
            contaBancariaId: contaBancariaId,
            despesaId: conta.despesaId || null, // Envia o ID da despesa, se houver
        });

    } catch (error: any) {
        console.error("Erro ao chamar a Cloud Function de pagar conta: ", error);
        // Lança o erro para que o componente do frontend possa exibi-lo ao usuário.
        throw new Error(error.message || "Falha ao processar o pagamento.");
    }
};
