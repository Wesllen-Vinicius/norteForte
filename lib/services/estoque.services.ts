import { db } from "@/lib/firebase";
import { collection, doc, runTransaction, serverTimestamp, onSnapshot, query, orderBy, DocumentData, QuerySnapshot, Timestamp } from "firebase/firestore";
import { Movimentacao } from "@/lib/schemas";

type MovimentacaoPayload = Omit<Movimentacao, 'id' | 'data' | 'registradoPor'>;

export const registrarMovimentacao = async (movimentacao: MovimentacaoPayload, user: { uid: string, nome: string | null }) => {
  const produtoDocRef = doc(db, "produtos", movimentacao.produtoId);
  const movimentacoesCollectionRef = collection(db, "movimentacoesEstoque");

  try {
    await runTransaction(db, async (transaction) => {
      const produtoDoc = await transaction.get(produtoDocRef);
      if (!produtoDoc.exists()) {
        throw new Error("Produto não encontrado!");
      }

      const dadosProduto = produtoDoc.data();
      const quantidadeAtual = dadosProduto.quantidade || 0;

      let novaQuantidade;
      if (movimentacao.tipo === 'entrada') {
        novaQuantidade = quantidadeAtual + movimentacao.quantidade;
      } else {
        novaQuantidade = quantidadeAtual - movimentacao.quantidade;
        if (novaQuantidade < 0) {
          throw new Error("Estoque insuficiente para realizar a saída.");
        }
      }

      transaction.update(produtoDocRef, { quantidade: novaQuantidade });

      const movimentacaoComData = {
        ...movimentacao,
        data: serverTimestamp(),
        registradoPor: user,
      };
      transaction.set(doc(movimentacoesCollectionRef), movimentacaoComData);
    });
  } catch (e) {
    console.error("Erro na transação de estoque: ", e);
    throw e;
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
