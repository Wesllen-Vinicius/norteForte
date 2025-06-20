import { db } from "@/lib/firebase";
import { collection, doc, runTransaction, serverTimestamp, Timestamp } from "firebase/firestore";
import { z } from "zod";

const itemVendidoSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  produtoNome: z.string(),
  quantidade: z.coerce.number().positive("A quantidade deve ser positiva."),
  precoUnitario: z.coerce.number().positive("O preço deve ser positivo."),
  custoUnitario: z.coerce.number().min(0),
});

export const vendaSchema = z.object({
  id: z.string().optional(),
  clienteId: z.string().min(1, "Selecione um cliente."),
  data: z.date({ required_error: "A data é obrigatória." }),
  produtos: z.array(itemVendidoSchema).min(1, "Adicione pelo menos um produto à venda."),
  valorTotal: z.coerce.number().positive("O valor total deve ser positivo."),
  condicaoPagamento: z.enum(["A_VISTA", "A_PRAZO"], { required_error: "Selecione a condição." }),
  dataVencimento: z.date().optional(),
  createdAt: z.any().optional(),
}).refine(data => {
    if (data.condicaoPagamento === "A_PRAZO") return !!data.dataVencimento;
    return true;
}, {
    message: "A data de vencimento é obrigatória para vendas a prazo.",
    path: ["dataVencimento"],
});

export type Venda = z.infer<typeof vendaSchema>;

export const registrarVenda = async (vendaData: Omit<Venda, 'id' | 'createdAt'>, clienteNome: string) => {
  try {
    await runTransaction(db, async (transaction) => {
      const vendaDocRef = doc(collection(db, "vendas"));

      const produtosParaSalvar = [];

      for (const item of vendaData.produtos) {
        const produtoDocRef = doc(db, "produtos", item.produtoId);
        const produtoDoc = await transaction.get(produtoDocRef);

        if (!produtoDoc.exists()) throw new Error(`Produto "${item.produtoNome}" não encontrado.`);

        const dadosProduto = produtoDoc.data();
        const estoqueAtual = dadosProduto.quantidade || 0;
        if (estoqueAtual < item.quantidade) throw new Error(`Estoque de "${item.produtoNome}" insuficiente.`);

        const novoEstoque = estoqueAtual - item.quantidade;
        transaction.update(produtoDocRef, { quantidade: novoEstoque });

        const movimentacaoDocRef = doc(collection(db, "movimentacoesEstoque"));
        transaction.set(movimentacaoDocRef, { /* ... */ });

        // Adiciona o custo do produto ao item da venda para o registro histórico
        produtosParaSalvar.push({ ...item, custoUnitario: dadosProduto.custoUnitario || 0 });
      }

      const dadosVendaFinal = {
        ...vendaData,
        produtos: produtosParaSalvar,
        createdAt: serverTimestamp(),
        data: Timestamp.fromDate(vendaData.data),
        dataVencimento: vendaData.dataVencimento ? Timestamp.fromDate(vendaData.dataVencimento) : null,
      };
      transaction.set(vendaDocRef, dadosVendaFinal);

      if (vendaData.condicaoPagamento === 'A_PRAZO') { /* ... lógica de contas a receber ... */ }
    });
  } catch (error) {
    console.error("Erro ao registrar venda: ", error);
    throw error;
  }
};
