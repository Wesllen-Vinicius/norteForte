import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, query, where, runTransaction } from "firebase/firestore";
import { ContaBancaria } from "@/lib/schemas";
import { User } from "firebase/auth";

type ContaBancariaPayload = Omit<ContaBancaria, 'id' | 'createdAt' | 'saldoAtual' | 'registradoPor' | 'status'>;

export const addContaBancaria = (data: ContaBancariaPayload, user: { uid: string, nome: string }) => {
  const dataComTimestamp = {
    ...data,
    saldoAtual: data.saldoInicial,
    registradoPor: user,
    status: 'ativa',
    createdAt: serverTimestamp(),
  };
  return addDoc(collection(db, "contasBancarias"), dataComTimestamp);
};

export const subscribeToContasBancarias = (callback: (contas: ContaBancaria[]) => void) => {
  // CORREÇÃO: Removido o orderBy da consulta para evitar o erro de índice.
  const q = query(collection(db, "contasBancarias"), where("status", "==", "ativa"));

  return onSnapshot(q, (snapshot) => {
    const contas = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as ContaBancaria[];
    // A ordenação agora é feita no lado do cliente.
    const contasOrdenadas = contas.sort((a, b) => a.nomeConta.localeCompare(b.nomeConta));
    callback(contasOrdenadas);
  });
};

export const updateContaBancaria = (id: string, data: Partial<ContaBancariaPayload>) => {
  return updateDoc(doc(db, "contasBancarias", id), data);
};

export const setContaBancariaStatus = async (id: string, status: 'ativa' | 'inativa') => {
    const contaDoc = doc(db, "contasBancarias", id);
    await updateDoc(contaDoc, { status });
};

export const registrarMovimentacaoBancaria = async (
    contaId: string,
    valor: number,
    tipo: 'credito' | 'debito',
    motivo: string,
    user: User
) => {
    const contaRef = doc(db, "contasBancarias", contaId);
    const movimentacaoRef = doc(collection(db, "movimentacoesBancarias"));

    try {
        await runTransaction(db, async (transaction) => {
            const contaDoc = await transaction.get(contaRef);
            if (!contaDoc.exists()) {
                throw new Error("Conta bancária não encontrada.");
            }

            const saldoAtual = contaDoc.data().saldoAtual || 0;
            const novoSaldo = tipo === 'credito' ? saldoAtual + valor : saldoAtual - valor;

            transaction.update(contaRef, { saldoAtual: novoSaldo });

            transaction.set(movimentacaoRef, {
                contaId,
                valor,
                tipo,
                motivo,
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
        console.error("Erro ao registrar movimentação bancária: ", error);
        throw error;
    }
};
