// lib/services/produtos.services.ts
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, QuerySnapshot, DocumentData } from "firebase/firestore";
import { z } from "zod";

// Unidades de medida permitidas
export const unidadesDeMedida = ["kg", "g", "unidade", "litro", "ml"] as const;

// Schema para o produto
export const produtoSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(3, "O nome do produto deve ter pelo menos 3 caracteres."),
  unidadeDeMedida: z.enum(unidadesDeMedida, {
    errorMap: () => ({ message: "Selecione uma unidade de medida válida." }),
  }),
  // Adicione o campo quantidade
  quantidade: z.number().default(0).optional(),
});

export type Produto = z.infer<typeof produtoSchema>;

// Adicionar um novo produto
export const addProduto = async (produto: Omit<Produto, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, "produtos"), produto);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar produto: ", e);
    throw new Error("Não foi possível adicionar o produto.");
  }
};

// Escutar atualizações em tempo real para produtos
export const subscribeToProdutos = (callback: (produtos: Produto[]) => void) => {
  const unsubscribe = onSnapshot(collection(db, "produtos"), (querySnapshot: QuerySnapshot<DocumentData>) => {
    const produtos: Produto[] = [];
    querySnapshot.forEach((doc) => {
      produtos.push({ id: doc.id, ...doc.data() as Omit<Produto, 'id'> });
    });
    callback(produtos);
  });
  return unsubscribe;
};

// Atualizar um produto existente
export const updateProduto = async (id: string, produto: Partial<Omit<Produto, 'id'>>) => {
  const produtoDoc = doc(db, "produtos", id);
  await updateDoc(produtoDoc, produto);
};

// Deletar um produto
export const deleteProduto = async (id: string) => {
  const produtoDoc = doc(db, "produtos", id);
  await deleteDoc(produtoDoc);
};
