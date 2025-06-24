import { db } from "@/lib/firebase";
import { collection,doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { Movimentacao } from "@/lib/schemas";

export const registrarMovimentacao = async (movimentacao: Omit<Movimentacao, 'data'>) => {
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
      };
      transaction.set(doc(movimentacoesCollectionRef), movimentacaoComData);
    });
  } catch (e) {
    console.error("Erro na transação de estoque: ", e);
    throw e;
  }
};
