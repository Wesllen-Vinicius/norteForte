import { db } from "@/lib/firebase";
import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    QuerySnapshot,
    DocumentData,
    runTransaction,
    serverTimestamp,
} from "firebase/firestore";
import { ContaAReceber, Venda } from "@/lib/schemas";

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
 * Realiza a baixa de uma conta a receber.
 * @param conta - O objeto da conta a receber.
 * @param contaBancariaId - O ID da conta bancária onde o valor será creditado.
 * @param user - O usuário que está realizando a operação.
 */
export const receberPagamento = async (
    conta: ContaAReceber,
    contaBancariaId: string,
    user: { uid: string; displayName: string | null }
) => {
    const contaReceberRef = doc(db, "contasAReceber", conta.id);
    const vendaRef = doc(db, "vendas", conta.vendaId);
    const contaBancariaRef = doc(db, "contasBancarias", contaBancariaId);
    const movimentacaoRef = doc(collection(db, "movimentacoesBancarias"));

    try {
        await runTransaction(db, async (transaction) => {
            const contaBancariaDoc = await transaction.get(contaBancariaRef);
            if (!contaBancariaDoc.exists()) {
                throw new Error("Conta bancária não encontrada.");
            }

            const saldoAtual = contaBancariaDoc.data().saldoAtual || 0;
            const novoSaldo = saldoAtual + conta.valor;

            // 1. Atualiza status da conta a receber para "Recebida"
            transaction.update(contaReceberRef, { status: "Recebida" });

            // 2. Atualiza status da venda para "Paga"
            transaction.update(vendaRef, { status: "Paga" });

            // 3. Atualiza o saldo da conta bancária
            transaction.update(contaBancariaRef, { saldoAtual: novoSaldo });

            // 4. Registra a movimentação de crédito
            transaction.set(movimentacaoRef, {
                contaId: contaBancariaId,
                valor: conta.valor,
                tipo: 'credito',
                motivo: `Recebimento da venda ${conta.vendaId.slice(0,5)}`,
                saldoAnterior: saldoAtual,
                saldoNovo: novoSaldo,
                data: serverTimestamp(),
                registradoPor: {
                    uid: user.uid,
                    nome: user.displayName || 'N/A'
                }
            });
        });
    } catch (error) {
        console.error("Erro na transação de recebimento: ", error);
        throw error;
    }
};

// A função antiga é substituída pela transação completa
/*
export const updateStatusContaAReceber = async (id: string, status: 'Pendente' | 'Recebida') => {
  const contaDocRef = doc(db, "contasAReceber", id);
  await updateDoc(contaDocRef, { status });
};
*/
