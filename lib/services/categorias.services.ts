// lib/services/categorias.services.ts
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, QuerySnapshot, DocumentData, serverTimestamp } from "firebase/firestore";
import { z } from "zod";

export const categoriaSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, 'O nome da categoria é obrigatório.'),
  createdAt: z.any().optional(), // Adicionado para controle de edição
});

export type Categoria = z.infer<typeof categoriaSchema>;

export const addCategoria = async (categoria: Omit<Categoria, 'id' | 'createdAt'>) => {
  // Adicionado o timestamp ao criar
  const dataWithTimestamp = { ...categoria, createdAt: serverTimestamp() };
  const docRef = await addDoc(collection(db, "categorias"), dataWithTimestamp);
  return docRef.id;
};

export const subscribeToCategorias = (callback: (categorias: Categoria[]) => void) => {
  return onSnapshot(collection(db, "categorias"), (querySnapshot: QuerySnapshot<DocumentData>) => {
    const categorias: Categoria[] = [];
    querySnapshot.forEach((doc) => {
      categorias.push({ id: doc.id, ...doc.data() as Omit<Categoria, 'id'> });
    });
    callback(categorias);
  });
};

export const updateCategoria = async (id: string, categoria: Partial<Omit<Categoria, 'id'>>) => {
  const categoriaDoc = doc(db, "categorias", id);
  await updateDoc(categoriaDoc, categoria);
};

export const deleteCategoria = async (id: string) => {
  const categoriaDoc = doc(db, "categorias", id);
  await deleteDoc(categoriaDoc);
};
