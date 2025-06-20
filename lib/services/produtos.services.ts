import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, QuerySnapshot, DocumentData, serverTimestamp } from "firebase/firestore";
import { z } from "zod";

const baseProdutoSchema = z.object({
  id: z.string().optional(),
  quantidade: z.number().default(0).optional(),
  createdAt: z.any().optional(),
});

export const produtoVendaSchema = baseProdutoSchema.extend({
  tipoProduto: z.literal("VENDA"),
  nome: z.string().min(3, "A descrição do produto é obrigatória."),
  unidadeId: z.string({ required_error: "Selecione uma unidade." }).min(1, "Selecione uma unidade."),
  precoVenda: z.coerce.number().positive("O preço de venda deve ser positivo."),
  custoUnitario: z.coerce.number().min(0),
  sku: z.string().optional().or(z.literal("")),
  ncm: z.string().optional().or(z.literal("")),
});

export const produtoUsoInternoSchema = baseProdutoSchema.extend({
  tipoProduto: z.literal("USO_INTERNO"),
  nome: z.string().min(3, "A descrição do item é obrigatória."),
  categoriaId: z.string({ required_error: "Selecione uma categoria." }).min(1, "Selecione uma categoria."),
  custoUnitario: z.coerce.number().positive("O preço de custo deve ser positivo."),
});

export const produtoSchema = z.discriminatedUnion("tipoProduto", [
  produtoVendaSchema,
  produtoUsoInternoSchema,
]);

// CORREÇÃO: Informa ao TypeScript que o tipo Produto pode ter as propriedades opcionais para exibição.
export type Produto = z.infer<typeof produtoSchema> & { unidadeNome?: string; categoriaNome?: string };

export type ProdutoVenda = z.infer<typeof produtoVendaSchema>;
export type ProdutoUsoInterno = z.infer<typeof produtoUsoInternoSchema>;

// CORREÇÃO: Usa Omit para garantir que as propriedades dinâmicas não sejam salvas no banco.
export const addProduto = async (produto: Omit<Produto, 'id' | 'unidadeNome' | 'categoriaNome'>) => {
  try {
    const dataWithTimestamp = { ...produto, createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, "produtos"), dataWithTimestamp);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar produto: ", e);
    throw new Error("Não foi possível adicionar o produto.");
  }
};

export const subscribeToProdutos = (callback: (produtos: Produto[]) => void) => {
  return onSnapshot(collection(db, "produtos"), (querySnapshot) => {
    const produtos: Produto[] = [];
    querySnapshot.forEach((doc) => {
      try {
        const data = produtoSchema.parse(doc.data());
        produtos.push({ id: doc.id, ...data });
      } catch (error) {
        console.error("Erro de validação em um produto do Firestore:", doc.id, error);
      }
    });
    callback(produtos);
  });
};

// CORREÇÃO: Usa Omit para garantir que as propriedades dinâmicas não sejam salvas no banco.
export const updateProduto = async (id: string, produto: Partial<Omit<Produto, 'id' | 'unidadeNome' | 'categoriaNome'>>) => {
  const produtoDoc = doc(db, "produtos", id);
  await updateDoc(produtoDoc, produto);
};

export const deleteProduto = async (id: string) => {
  const produtoDoc = doc(db, "produtos", id);
  await deleteDoc(produtoDoc);
};
