import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, QuerySnapshot, DocumentData, serverTimestamp, query, where } from "firebase/firestore";
import { Unidade } from "@/lib/schemas";

export const addUnidade = async (unidade: Omit<Unidade, 'id' | 'createdAt' | 'status'>) => {
  const dataWithTimestamp = { ...unidade, status: 'ativo', createdAt: serverTimestamp() };
  const docRef = await addDoc(collection(db, "unidades"), dataWithTimestamp);
  return docRef.id;
};

export const subscribeToUnidades = (callback: (unidades: Unidade[]) => void) => {
  const q = query(collection(db, "unidades"), where("status", "==", "ativo"));
  return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const unidades: Unidade[] = [];
    querySnapshot.forEach((doc) => {
      unidades.push({ id: doc.id, ...doc.data() as Omit<Unidade, 'id'> });
    });
    callback(unidades);
  });
};

export const updateUnidade = async (id: string, unidade: Partial<Omit<Unidade, 'id' | 'createdAt' | 'status'>>) => {
  const unidadeDoc = doc(db, "unidades", id);
  await updateDoc(unidadeDoc, unidade);
};

export const setUnidadeStatus = async (id: string, status: 'ativo' | 'inativo') => {
    const unidadeDoc = doc(db, "unidades", id);
    await updateDoc(unidadeDoc, { status });
};
