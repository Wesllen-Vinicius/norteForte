import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, QuerySnapshot, DocumentData, serverTimestamp, query, where } from "firebase/firestore";
import {
  Produto,
  produtoSchema,
} from "@/lib/schemas";

export const addProduto = async (produto: Omit<Produto, 'id' | 'unidadeNome' | 'categoriaNome' | 'createdAt' | 'status'>) => {
  try {
    const dataWithTimestamp = { ...produto, status: 'ativo', createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, "produtos"), dataWithTimestamp);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar produto: ", e);
    throw new Error("Não foi possível adicionar o produto.");
  }
};

export const subscribeToProdutos = (callback: (produtos: Produto[]) => void) => {
  const q = query(collection(db, "produtos"), where("status", "==", "ativo"));

  return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
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

export const updateProduto = async (id: string, produto: Partial<Omit<Produto, 'id' | 'unidadeNome' | 'categoriaNome' | 'createdAt' | 'status'>>) => {
  const produtoDoc = doc(db, "produtos", id);
  await updateDoc(produtoDoc, produto);
};

export const setProdutoStatus = async (id: string, status: 'ativo' | 'inativo') => {
    const produtoDoc = doc(db, "produtos", id);
    await updateDoc(produtoDoc, { status });
};
