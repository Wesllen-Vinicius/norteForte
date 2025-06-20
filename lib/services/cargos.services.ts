import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, QuerySnapshot, DocumentData, serverTimestamp } from "firebase/firestore";
import { z } from "zod";

export const cargoSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(3, "O nome do cargo deve ter pelo menos 3 caracteres."),
  createdAt: z.any().optional(),
});

export type Cargo = z.infer<typeof cargoSchema>;

export const addCargo = async (cargo: Omit<Cargo, 'id'>) => {
  try {
    const dataWithTimestamp = { ...cargo, createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, "cargos"), dataWithTimestamp);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar cargo: ", e);
    throw new Error("Não foi possível adicionar o cargo.");
  }
};

export const subscribeToCargos = (callback: (cargos: Cargo[]) => void) => {
  const unsubscribe = onSnapshot(collection(db, "cargos"), (querySnapshot: QuerySnapshot<DocumentData>) => {
    const cargos: Cargo[] = [];
    querySnapshot.forEach((doc) => {
      cargos.push({ id: doc.id, ...doc.data() as Omit<Cargo, 'id'> });
    });
    callback(cargos);
  });
  return unsubscribe;
};

export const updateCargo = async (id: string, cargo: Partial<Omit<Cargo, 'id'>>) => {
  const cargoDoc = doc(db, "cargos", id);
  await updateDoc(cargoDoc, cargo);
};

export const deleteCargo = async (id: string) => {
  const cargoDoc = doc(db, "cargos", id);
  await deleteDoc(cargoDoc);
};
