import { db } from "@/lib/firebase";
import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { z } from "zod";

// Schema para um item individual dentro do formulário de venda
const itemVendidoSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  produtoNome: z.string(), // Para o log
  quantidade: z.coerce.number().positive("A quantidade deve ser positiva."),
  precoUnitario: z.coerce.number().positive("O preço deve ser positivo."),
});

// Schema principal do formulário de venda
export const vendaSchema = z.object({
  id: z.string().optional(),
  clienteId: z.string().min(1, "Selecione um cliente."),
  data: z.date({ required_error: "A data é obrigatória." }),
  produtos: z.array(itemVendidoSchema).min(1, "Adicione pelo menos um produto à venda."),
  valorTotal: z.coerce.number(),
  metodoPagamento: z.enum(["dinheiro", "pix", "cartao_debito", "cartao_credito"], {
    required_error: "Selecione um método de pagamento.",
  }),
});

export type Venda = z.infer<typeof vendaSchema>;

// Função para registrar a venda com uma transação
export const registrarVenda = async (vendaData: Omit<Venda, 'id' | 'valorTotal'> & { produtos: { produtoId: string; quantidade: number; produtoNome: string }[] }) => {
  const vendaCollectionRef = collection(db, "vendas");
  const movimentacoesCollectionRef = collection(db, "movimentacoesEstoque");

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Cria o documento principal de venda
      const vendaDocRef = doc(vendaCollectionRef);

      let valorTotalCalculado = 0;

      // Itera sobre cada produto para atualizar o estoque e registrar a movimentação
      for (const item of vendaData.produtos) {
        const produtoDocRef = doc(db, "produtos", item.produtoId);
        const produtoDoc = await transaction.get(produtoDocRef);

        if (!produtoDoc.exists()) {
          throw new Error(`Produto "${item.produtoNome}" não encontrado.`);
        }

        const estoqueAtual = produtoDoc.data().quantidade || 0;
        if (estoqueAtual < item.quantidade) {
            throw new Error(`Estoque insuficiente para "${item.produtoNome}". Disponível: ${estoqueAtual}`);
        }

        const novoEstoque = estoqueAtual - item.quantidade;
        transaction.update(produtoDocRef, { quantidade: novoEstoque });

        const movimentacaoDocRef = doc(movimentacoesCollectionRef);
        transaction.set(movimentacaoDocRef, {
          produtoId: item.produtoId,
          produtoNome: item.produtoNome,
          quantidade: item.quantidade,
          tipo: 'saida',
          motivo: `Venda ID: ${vendaDocRef.id}`,
          data: serverTimestamp(),
        });

        // Este cálculo de valor total deve ser feito com base no preço real no momento da venda
        // A lógica de preço precisa ser adicionada ao formulário
        // Por enquanto, vamos omitir o cálculo do valor total na transação
      }

      // Salva o documento da venda
      transaction.set(vendaDocRef, { ...vendaData, data: serverTimestamp() });
    });
  } catch (error) {
    console.error("Erro ao registrar venda: ", error);
    throw error; // Re-lança o erro para ser tratado na UI
  }
};
