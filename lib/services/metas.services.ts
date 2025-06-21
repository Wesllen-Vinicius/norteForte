// lib/services/metas.services.ts
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, QuerySnapshot, DocumentData, serverTimestamp } from "firebase/firestore";
import { z } from "zod";

// REMOVIDO o campo 'unidade' do schema.
export const metaSchema = z.object({
  id: z.string().optional(),
  produtoId: z.string({ required_error: "Selecione um produto." }).min(1, "Selecione um produto."),
  metaPorAnimal: z.coerce.number().positive("A meta deve ser um número positivo."),
  createdAt: z.any().optional(),
});

// Ajustado o tipo para não esperar mais 'unidade' diretamente.
export type Meta = z.infer<typeof metaSchema> & { produtoNome?: string, unidade?: string };

export const addMeta = async (meta: Omit<Meta, "id" | "produtoNome" | "unidade" | "createdAt">) => {
  try {
    const dataWithTimestamp = { ...meta, createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, "metas"), dataWithTimestamp);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar meta: ", e);
    throw new Error("Não foi possível adicionar a meta.");
  }
};

export const subscribeToMetas = (callback: (metas: Meta[]) => void) => {
  const unsubscribe = onSnapshot(collection(db, "metas"), (querySnapshot: QuerySnapshot<DocumentData>) => {
    const metas: Meta[] = [];
    querySnapshot.forEach((doc) => {
      metas.push({ id: doc.id, ...doc.data() as Omit<Meta, 'id'> });
    });
    callback(metas);
  });
  return unsubscribe;
};

export const updateMeta = async (id: string, meta: Partial<Omit<Meta, "id" | "produtoNome" | "unidade" | "createdAt">>) => {
  const metaDoc = doc(db, "metas", id);
  await updateDoc(metaDoc, meta);
};

export const deleteMeta = async (id: string) => {
  const metaDoc = doc(db, "metas", id);
  await deleteDoc(metaDoc);
};
