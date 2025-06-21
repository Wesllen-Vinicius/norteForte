// lib/services/producao.services.ts
import { db } from "@/lib/firebase";
import { collection, doc, runTransaction, serverTimestamp, onSnapshot, QuerySnapshot, DocumentData, Timestamp } from "firebase/firestore";
import { z } from "zod";

const itemProduzidoSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  produtoNome: z.string(),
  quantidade: z.coerce.number().positive("A quantidade deve ser positiva."),
  perda: z.coerce.number().min(0, "A perda não pode ser negativa.").default(0),
});

export const producaoSchema = z.object({
  id: z.string().optional(),
  data: z.date({ required_error: "A data da produção é obrigatória." }),
  responsavelId: z.string().min(1, "Selecione um responsável."),
  abateId: z.string().min(1, "Selecione um abate para vincular."),
  lote: z.string().optional(),
  descricao: z.string().optional(),
  produtos: z.array(itemProduzidoSchema),
}).refine((data) => data.produtos.length > 0, {
    message: "Adicione pelo menos um produto à produção.",
    path: ["produtos"],
});

export type Producao = z.infer<typeof producaoSchema> & { data: Timestamp | Date, responsavelNome?: string };

export const registrarProducao = async (producaoData: Omit<Producao, 'id' | 'responsavelNome'>) => {
  const producaoCollectionRef = collection(db, "producoes");
  const movimentacoesCollectionRef = collection(db, "movimentacoesEstoque");

  try {
    await runTransaction(db, async (transaction) => {
      const producaoDocRef = doc(producaoCollectionRef);

      const dadosParaSalvar = {
        ...producaoData,
        data: Timestamp.fromDate(producaoData.data as Date),
        createdAt: serverTimestamp(),
      };

      transaction.set(producaoDocRef, dadosParaSalvar);

      for (const item of producaoData.produtos) {
        const produtoDocRef = doc(db, "produtos", item.produtoId);
        const produtoDoc = await transaction.get(produtoDocRef);

        if (!produtoDoc.exists()) {
          throw new Error(`Produto "${item.produtoNome}" não encontrado no banco de dados.`);
        }

        const estoqueAtual = produtoDoc.data().quantidade || 0;
        const novoEstoque = estoqueAtual + item.quantidade;

        transaction.update(produtoDocRef, { quantidade: novoEstoque });

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
    throw error;
  }
};

export const subscribeToProducoes = (callback: (producoes: Producao[]) => void) => {
    const unsubscribe = onSnapshot(collection(db, "producoes"), (querySnapshot: QuerySnapshot<DocumentData>) => {
      const producoes: Producao[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        producoes.push({
            id: doc.id,
            ...data,
            data: (data.data as Timestamp).toDate()
        } as unknown as Producao);
      });
      callback(producoes);
    });
    return unsubscribe;
};
