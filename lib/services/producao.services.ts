// lib/services/producao.services.ts
import { db } from "@/lib/firebase";
import { collection, doc, runTransaction, serverTimestamp, writeBatch } from "firebase/firestore";
import { z } from "zod";

// Schema para um item individual dentro do formulário de produção
const itemProduzidoSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  produtoNome: z.string(), // Usado para o log
  quantidade: z.coerce.number().positive("A quantidade deve ser positiva."),
});

// Schema principal do formulário de produção
export const producaoSchema = z.object({
  id: z.string().optional(),
  responsavelId: z.string().min(1, "Selecione um responsável."), // Futuramente, o ID do funcionário
  lote: z.string().optional(),
  descricao: z.string().optional(),
  produtos: z.array(itemProduzidoSchema).min(1, "Adicione pelo menos um produto."),
});

export type Producao = z.infer<typeof producaoSchema>;

// Função para registrar a produção com uma transação
export const registrarProducao = async (producaoData: Omit<Producao, 'id'>) => {
  const producaoCollectionRef = collection(db, "producoes");
  const movimentacoesCollectionRef = collection(db, "movimentacoesEstoque");

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Cria o documento principal de produção
      const producaoDocRef = doc(producaoCollectionRef); // Cria uma referência com ID automático
      transaction.set(producaoDocRef, { ...producaoData, data: serverTimestamp() });

      // 2. Itera sobre cada produto para atualizar o estoque e registrar a movimentação
      for (const item of producaoData.produtos) {
        const produtoDocRef = doc(db, "produtos", item.produtoId);
        const produtoDoc = await transaction.get(produtoDocRef);

        if (!produtoDoc.exists()) {
          throw new Error(`Produto "${item.produtoNome}" não encontrado no banco de dados.`);
        }

        const estoqueAtual = produtoDoc.data().quantidade || 0;
        const novoEstoque = estoqueAtual + item.quantidade;

        // 2a. Atualiza o saldo do produto
        transaction.update(produtoDocRef, { quantidade: novoEstoque });

        // 2b. Cria o registro da movimentação de entrada
        const movimentacaoDocRef = doc(movimentacoesCollectionRef);
        transaction.set(movimentacaoDocRef, {
          produtoId: item.produtoId,
          produtoNome: item.produtoNome,
          quantidade: item.quantidade,
          tipo: 'entrada',
          motivo: `Produção Lote: ${producaoData.lote || producaoDocRef.id}`,
          data: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    console.error("Erro ao registrar produção: ", error);
    throw error; // Re-lança o erro para ser tratado na UI
  }
};
