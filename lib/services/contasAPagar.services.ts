import { db } from "@/lib/firebase";
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
 * Realiza a baixa de uma conta a pagar.
 * Atualiza o status da conta, debita o valor da conta bancária e registra a movimentação.
 * @param conta - O objeto da conta a pagar.
 * @param contaBancariaId - O ID da conta bancária de onde o valor será debitado.
 * @param user - O usuário que está realizando a operação.
 */
export const pagarConta = async (conta: ContaAPagar, contaBancariaId: string, user: { uid: string, displayName: string | null }) => {
    const contaPagarRef = doc(db, "contasAPagar", conta.id);
    const contaBancariaRef = doc(db, "contasBancarias", contaBancariaId);
    const movimentacaoRef = doc(collection(db, "movimentacoesBancarias"));

    try {
        await runTransaction(db, async (transaction) => {
            const contaBancariaDoc = await transaction.get(contaBancariaRef);

            if (!contaBancariaDoc.exists()) {
                throw new Error("Conta bancária não encontrada.");
            }

            const saldoAtual = contaBancariaDoc.data().saldoAtual || 0;
            const novoSaldo = saldoAtual - conta.valor;

            // 1. Atualiza o status da conta a pagar
            transaction.update(contaPagarRef, { status: "Paga" });

            // 2. Se for uma despesa, atualiza o status na coleção de despesas também
            if (conta.despesaId) {
                const despesaRef = doc(db, "despesas", conta.despesaId);
                transaction.update(despesaRef, { status: "Paga" });
            }

            // 3. Atualiza o saldo da conta bancária
            transaction.update(contaBancariaRef, { saldoAtual: novoSaldo });

            // 4. Registra a movimentação bancária para o extrato
            transaction.set(movimentacaoRef, {
                contaId: contaBancariaId,
                valor: conta.valor,
                tipo: 'debito',
                motivo: `Pagamento de conta: ${conta.id.slice(0,5)}`,
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
        console.error("Erro na transação de pagamento: ", error);
        throw error;
    }
};
