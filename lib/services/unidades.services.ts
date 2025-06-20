import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, QuerySnapshot, DocumentData } from "firebase/firestore";
import { z } from "zod";

export const unidadeSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, 'O nome da unidade é obrigatório.'),
  sigla: z.string().min(1, 'A sigla é obrigatória.').max(10, 'A sigla deve ter no máximo 10 caracteres.'),
});

export type Unidade = z.infer<typeof unidadeSchema>;

export const addUnidade = async (unidade: Omit<Unidade, 'id'>) => {
  const docRef = await addDoc(collection(db, "unidades"), unidade);
  return docRef.id;
};

export const subscribeToUnidades = (callback: (unidades: Unidade[]) => void) => {
  return onSnapshot(collection(db, "unidades"), (querySnapshot: QuerySnapshot<DocumentData>) => {
    const unidades: Unidade[] = [];
    querySnapshot.forEach((doc) => {
      unidades.push({ id: doc.id, ...doc.data() as Omit<Unidade, 'id'> });
    });
    callback(unidades);
  });
};

export const updateUnidade = async (id: string, unidade: Partial<Omit<Unidade, 'id'>>) => {
  const unidadeDoc = doc(db, "unidades", id);
  await updateDoc(unidadeDoc, unidade);
};

export const deleteUnidade = async (id: string) => {
  const unidadeDoc = doc(db, "unidades", id);
  await deleteDoc(unidadeDoc);
};
