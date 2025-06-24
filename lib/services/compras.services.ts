import { db } from "@/lib/firebase";
import { collection, doc, DocumentData, onSnapshot, orderBy, query, QuerySnapshot, runTransaction, serverTimestamp, Timestamp } from "firebase/firestore";
import { Compra } from "@/lib/schemas";


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

export const subscribeToCompras = (callback: (compras: Compra[]) => void) => {
  const q = query(collection(db, "compras"), orderBy("data", "desc"));
  return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const compras: Compra[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        compras.push({
            ...data,
            id: doc.id,
            data: (data.data as Timestamp).toDate(),
        } as Compra);
    });
    callback(compras);
  });
};
