import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, QuerySnapshot, DocumentData, serverTimestamp, query, where } from "firebase/firestore";
import { Categoria } from "@/lib/schemas";

export const addCategoria = async (categoria: Omit<Categoria, 'id' | 'createdAt' | 'status'>) => {
  const dataWithTimestamp = { ...categoria, status: 'ativo', createdAt: serverTimestamp() };
  const docRef = await addDoc(collection(db, "categorias"), dataWithTimestamp);
  return docRef.id;
};

export const subscribeToCategorias = (callback: (categorias: Categoria[]) => void) => {
  // Adicionado filtro para buscar apenas categorias ativas
  const q = query(collection(db, "categorias"), where("status", "==", "ativo"));

  return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const categorias: Categoria[] = [];
    querySnapshot.forEach((doc) => {
      categorias.push({ id: doc.id, ...doc.data() as Omit<Categoria, 'id'> });
    });
    callback(categorias);
  });
};

export const updateCategoria = async (id: string, categoria: Partial<Omit<Categoria, 'id' | 'createdAt' | 'status'>>) => {
  const categoriaDoc = doc(db, "categorias", id);
  await updateDoc(categoriaDoc, categoria);
};

// Nova função para inativar uma categoria
export const setCategoriaStatus = async (id: string, status: 'ativo' | 'inativo') => {
    const categoriaDoc = doc(db, "categorias", id);
    await updateDoc(categoriaDoc, { status });
}

// A função deleteCategoria foi substituída pela setCategoriaStatus
/*
export const deleteCategoria = async (id: string) => {
  const categoriaDoc = doc(db, "categorias", id);
  await deleteDoc(categoriaDoc);
};
*/
