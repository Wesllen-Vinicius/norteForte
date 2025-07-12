import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { collection, doc, runTransaction, serverTimestamp, onSnapshot, query, orderBy, DocumentData, QuerySnapshot, Timestamp } from "firebase/firestore";
import { Movimentacao } from "@/lib/schemas";

type MovimentacaoPayload = Omit<Movimentacao, 'id' | 'data' | 'registradoPor'>;

/**
 * Registra uma movimentação manual de estoque de forma segura via Cloud Function.
 * A lógica da transação agora é executada no servidor para garantir a integridade dos dados.
 */
export const registrarMovimentacao = async (movimentacao: MovimentacaoPayload) => {
  try {
    const registrarMovimentacaoFunction = httpsCallable(functions, 'registrarMovimentacaoHttps');

    // O UID do usuário que está fazendo a chamada é verificado automaticamente no backend.
    await registrarMovimentacaoFunction(movimentacao);

  } catch (e: any) {
    console.error("Erro ao chamar a Cloud Function de movimentação de estoque: ", e);
    // Lança o erro para que o componente do frontend possa exibi-lo ao usuário.
    throw new Error(e.message || "Falha ao registrar a movimentação.");
  }
};


export const subscribeToMovimentacoes = (callback: (movs: Movimentacao[]) => void) => {
    const q = query(collection(db, "movimentacoesEstoque"), orderBy("data", "desc"));

    return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const movimentacoes: Movimentacao[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        movimentacoes.push({
            id: doc.id,
            ...data,
        } as Movimentacao);
      });
      callback(movimentacoes);
    });
};
