import { db } from "@/lib/firebase";
import { collection, doc, runTransaction, serverTimestamp, Timestamp } from "firebase/firestore";
import { z } from "zod";

const itemCompradoSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  produtoNome: z.string(),
  quantidade: z.coerce.number().positive("A quantidade deve ser positiva."),
  custoUnitario: z.coerce.number().min(0, "O custo não pode ser negativo."),
});

export const compraSchema = z.object({
  id: z.string().optional(),
  fornecedorId: z.string().min(1, "Selecione um fornecedor."),
  notaFiscal: z.string().min(1, "O número da nota fiscal é obrigatório."),
  data: z.date({ required_error: "A data é obrigatória." }),
  itens: z.array(itemCompradoSchema).min(1, "Adicione pelo menos um item."),
  condicaoPagamento: z.string().min(1, "A condição de pagamento é obrigatória."),
  valorTotal: z.coerce.number(),
  createdAt: z.any().optional(),
});

export type Compra = z.infer<typeof compraSchema>;

export const registrarCompra = async (compraData: Omit<Compra, 'id' | 'createdAt'>) => {
  try {
    await runTransaction(db, async (transaction) => {
      const compraDocRef = doc(collection(db, "compras"));
      transaction.set(compraDocRef, { ...compraData, createdAt: serverTimestamp(), data: Timestamp.fromDate(compraData.data) });

      const contaPagarDocRef = doc(collection(db, "contasAPagar"));
      transaction.set(contaPagarDocRef, {
        compraId: compraDocRef.id,
        fornecedorId: compraData.fornecedorId,
        notaFiscal: compraData.notaFiscal,
        valor: compraData.valorTotal,
        dataEmissao: Timestamp.fromDate(compraData.data),
        condicaoPagamento: compraData.condicaoPagamento,
        status: "Pendente",
      });

      for (const item of compraData.itens) {
        const produtoDocRef = doc(db, "produtos", item.produtoId);
        const produtoDoc = await transaction.get(produtoDocRef);

        if (!produtoDoc.exists()) throw new Error(`Produto "${item.produtoNome}" não encontrado.`);

        const produtoData = produtoDoc.data();
        const estoqueAtual = produtoData.quantidade || 0;
        const novoEstoque = estoqueAtual + item.quantidade;

        transaction.update(produtoDocRef, {
            quantidade: novoEstoque,
            custoUnitario: item.custoUnitario
        });

        const movimentacaoDocRef = doc(collection(db, "movimentacoesEstoque"));
        transaction.set(movimentacaoDocRef, {
          produtoId: item.produtoId,
          produtoNome: item.produtoNome,
          quantidade: item.quantidade,
          tipo: 'entrada',
          motivo: `Compra NF: ${compraData.notaFiscal}`,
          data: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    console.error("Erro ao registrar compra: ", error);
    throw error;
  }
};
