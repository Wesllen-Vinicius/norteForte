import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, QuerySnapshot, DocumentData, serverTimestamp, query, where } from "firebase/firestore";
import { Meta } from "@/lib/schemas";

export const addMeta = async (meta: Omit<Meta, "id" | "produtoNome" | "unidade" | "createdAt" | "status">) => {
  try {
    const dataWithTimestamp = { ...meta, status: 'ativo', createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, "metas"), dataWithTimestamp);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar meta: ", e);
    throw new Error("Não foi possível adicionar a meta.");
  }
};

export const subscribeToMetas = (callback: (metas: Meta[]) => void) => {
  const q = query(collection(db, "metas"), where("status", "==", "ativo"));

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const metas: Meta[] = [];
    querySnapshot.forEach((doc) => {
      metas.push({ id: doc.id, ...doc.data() as Omit<Meta, 'id'> });
    });
    callback(metas);
  });
  return unsubscribe;
};

export const updateMeta = async (id: string, meta: Partial<Omit<Meta, "id" | "produtoNome" | "unidade" | "createdAt" | "status">>) => {
  const metaDoc = doc(db, "metas", id);
  await updateDoc(metaDoc, meta);
};

export const setMetaStatus = async (id: string, status: 'ativo' | 'inativo') => {
    const metaDoc = doc(db, "metas", id);
    await updateDoc(metaDoc, { status });
};
