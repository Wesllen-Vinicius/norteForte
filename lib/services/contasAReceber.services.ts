import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import {
    collection,
    onSnapshot,
    QuerySnapshot,
    DocumentData,
} from "firebase/firestore";
import { ContaAReceber } from "@/lib/schemas";

export const subscribeToContasAReceber = (callback: (contas: ContaAReceber[]) => void) => {
  return onSnapshot(collection(db, "contasAReceber"), (querySnapshot: QuerySnapshot<DocumentData>) => {
    const contas: ContaAReceber[] = [];
    querySnapshot.forEach((doc) => {
      contas.push({ id: doc.id, ...doc.data() } as ContaAReceber);
    });
    callback(contas);
  });
};

/**
 * Realiza a baixa de uma conta a receber de forma segura via Cloud Function.
 * A lógica da transação, como a atualização de saldos e status, agora é executada no servidor.
 * @param conta - O objeto da conta a receber.
 * @param contaBancariaId - O ID da conta bancária onde o valor será creditado.
 */
export const receberPagamento = async (
    conta: ContaAReceber,
    contaBancariaId: string
) => {
    try {
        const receberPagamentoFunction = httpsCallable(functions, 'receberPagamentoHttps');

        // O UID do usuário que está fazendo a chamada é verificado automaticamente no backend.
        await receberPagamentoFunction({
            contaId: conta.id,
            vendaId: conta.vendaId,
            contaBancariaId: contaBancariaId,
        });

    } catch (error: any) {
        console.error("Erro ao chamar a Cloud Function de receber pagamento: ", error);
        // Lança o erro para que o componente do frontend possa exibi-lo ao usuário.
        throw new Error(error.message || "Falha ao processar o recebimento.");
    }
};
