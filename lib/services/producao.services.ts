import { db } from "@/lib/firebase";
import { collection, doc, runTransaction, serverTimestamp, onSnapshot, QuerySnapshot, DocumentData, Timestamp, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { z } from "zod";

// Schema para os itens, garantindo que quantidade seja um número
const itemProduzidoSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  produtoNome: z.string(),
  quantidade: z.coerce.number().min(0, "A quantidade deve ser um número positivo."),
  perda: z.coerce.number().min(0, "A perda não pode ser negativa.").default(0),
});

// Schema principal da produção, aceitando Timestamp do Firebase e Date do formulário
export const producaoSchema = z.object({
  id: z.string().optional(),
  data: z.union([z.instanceof(Timestamp), z.date()]),
  responsavelId: z.string().min(1, "Selecione um responsável."),
  abateId: z.string().min(1, "Selecione um abate para vincular."),
  lote: z.string().optional(),
  descricao: z.string().optional(),
  produtos: z.array(itemProduzidoSchema).min(1, "Adicione pelo menos um produto à produção."),
  registradoPor: z.object({
    uid: z.string(),
    nome: z.string(),
  }),
  createdAt: z.any().optional(),
});

// Tipo usado na aplicação, garantindo que 'data' seja sempre um objeto Date
export type Producao = Omit<z.infer<typeof producaoSchema>, 'data'> & { data: Date };

/**
 * Registra um novo lote de produção e atualiza o estoque dos produtos.
 * A transação é estruturada em duas etapas (leitura e escrita) para cumprir as regras do Firestore.
 */
export const registrarProducao = async (producaoData: Omit<Producao, 'id' | 'createdAt'>) => {
  try {
    await runTransaction(db, async (transaction) => {
      // --- ETAPA DE LEITURA ---
      const produtoRefs = producaoData.produtos.map(item => doc(db, "produtos", item.produtoId));
      const produtoDocs = await Promise.all(produtoRefs.map(ref => transaction.get(ref)));

      for (let i = 0; i < produtoDocs.length; i++) {
        if (!produtoDocs[i].exists()) {
          throw new Error(`Produto "${producaoData.produtos[i].produtoNome}" não foi encontrado.`);
        }
      }

      // --- ETAPA DE ESCRITA ---
      const producaoDocRef = doc(collection(db, "producoes"));
      transaction.set(producaoDocRef, {
        ...producaoData,
        data: Timestamp.fromDate(producaoData.data), // Salva como Timestamp
        createdAt: serverTimestamp(),
      });

      for (let i = 0; i < produtoDocs.length; i++) {
        const produtoDoc = produtoDocs[i];
        const item = producaoData.produtos[i];

        const estoqueAtual = produtoDoc.data()!.quantidade || 0;
        const novoEstoque = estoqueAtual + item.quantidade;

        transaction.update(produtoRefs[i], { quantidade: novoEstoque });

        const movimentacaoDocRef = doc(collection(db, "movimentacoesEstoque"));
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

/**
 * Escuta por atualizações na coleção de produções, validando e formatando os dados.
 */
export const subscribeToProducoes = (callback: (producoes: Producao[]) => void) => {
    const unsubscribe = onSnapshot(collection(db, "producoes"), (querySnapshot: QuerySnapshot<DocumentData>) => {
      const producoes: Producao[] = [];
      querySnapshot.forEach((doc) => {
        const rawData = { id: doc.id, ...doc.data() };
        const parsed = producaoSchema.safeParse(rawData);

        if(parsed.success) {
            const finalData = {
                ...parsed.data,
                data: (parsed.data.data as Timestamp).toDate(),
            };
            producoes.push(finalData as Producao);
        } else {
            console.error("Documento de produção inválido no Firestore:", doc.id, parsed.error.format());
        }
      });
      callback(producoes.sort((a, b) => b.data.getTime() - a.data.getTime()));
    });
    return unsubscribe;
};

export const updateProducao = async (id: string, data: Partial<Omit<Producao, 'id' | 'createdAt'>>) => {
    const producaoDoc = doc(db, "producoes", id);
    const dataToUpdate: { [key: string]: any } = { ...data };
    if (data.data) {
        dataToUpdate.data = Timestamp.fromDate(data.data);
    }
    await updateDoc(producaoDoc, dataToUpdate);
};

export const deleteProducao = async (id: string) => {
    const producaoDoc = doc(db, "producoes", id);
    await deleteDoc(producaoDoc);
};
