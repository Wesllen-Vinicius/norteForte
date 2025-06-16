// lib/services/estoque.services.ts
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, runTransaction, Timestamp, serverTimestamp } from "firebase/firestore";
import { z } from "zod";

// Schema para uma movimentação de estoque
export const movimentacaoSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  produtoNome: z.string(), // Para facilitar a exibição no log
  quantidade: z.number().positive("A quantidade deve ser maior que zero."),
  tipo: z.enum(["entrada", "saida"]),
  motivo: z.string().optional(),
  data: z.date().optional(),
});

export type Movimentacao = z.infer<typeof movimentacaoSchema>;

// Função principal para registrar uma movimentação usando uma transação
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

      // 1. Atualiza a quantidade no documento do produto
      transaction.update(produtoDocRef, { quantidade: novaQuantidade });

      // 2. Cria o registro na coleção de movimentações
      const movimentacaoComData = {
        ...movimentacao,
        data: serverTimestamp(), // Usa a data do servidor do Firebase
      };
      transaction.set(doc(movimentacoesCollectionRef), movimentacaoComData);
    });
  } catch (e) {
    console.error("Erro na transação de estoque: ", e);
    // Repassa o erro para ser tratado na UI (ex: toast de erro)
    throw e;
  }
};
