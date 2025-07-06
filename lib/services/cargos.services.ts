import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, QuerySnapshot, DocumentData, serverTimestamp, query, where } from "firebase/firestore";
import { Cargo } from "@/lib/schemas";

export const addCargo = async (cargo: Omit<Cargo, 'id' | 'createdAt' | 'status'>) => {
  try {
    const dataWithTimestamp = { ...cargo, status: 'ativo', createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, "cargos"), dataWithTimestamp);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar cargo: ", e);
    throw new Error("Não foi possível adicionar o cargo.");
  }
};

export const subscribeToCargos = (callback: (cargos: Cargo[]) => void) => {
  const q = query(collection(db, "cargos"), where("status", "==", "ativo"));

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const cargos: Cargo[] = [];
    querySnapshot.forEach((doc) => {
      cargos.push({ id: doc.id, ...doc.data() as Omit<Cargo, 'id'> });
    });
    callback(cargos);
  });
  return unsubscribe;
};

export const updateCargo = async (id: string, cargo: Partial<Omit<Cargo, 'id' | 'createdAt' | 'status'>>) => {
  const cargoDoc = doc(db, "cargos", id);
  await updateDoc(cargoDoc, cargo);
};

// Nova função para inativar um cargo
export const setCargoStatus = async (id: string, status: 'ativo' | 'inativo') => {
    const cargoDoc = doc(db, "cargos", id);
    await updateDoc(cargoDoc, { status });
};

// A função deleteCargo foi substituída pela setCargoStatus
/*
export const deleteCargo = async (id: string) => {
  const cargoDoc = doc(db, "cargos", id);
  await deleteDoc(cargoDoc);
};
*/
