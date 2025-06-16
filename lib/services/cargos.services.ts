// lib/services/cargos.services.ts
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, QuerySnapshot, DocumentData } from "firebase/firestore";
import { z } from "zod";

// Define o schema para um Cargo, incluindo o ID que vem do Firestore.
export const cargoSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(3, "O nome do cargo deve ter pelo menos 3 caracteres."),
});

export type Cargo = z.infer<typeof cargoSchema>;

// Função para adicionar um novo cargo
export const addCargo = async (cargo: Omit<Cargo, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, "cargos"), cargo);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar cargo: ", e);
    throw new Error("Não foi possível adicionar o cargo.");
  }
};

// Função para buscar todos os cargos uma vez
export const getCargos = async (): Promise<Cargo[]> => {
  const querySnapshot = await getDocs(collection(db, "cargos"));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Cargo, 'id'>),
  }));
};

// Função para escutar atualizações em tempo real
export const subscribeToCargos = (callback: (cargos: Cargo[]) => void) => {
  const unsubscribe = onSnapshot(collection(db, "cargos"), (querySnapshot: QuerySnapshot<DocumentData>) => {
    const cargos: Cargo[] = [];
    querySnapshot.forEach((doc) => {
      cargos.push({ id: doc.id, ...doc.data() as Omit<Cargo, 'id'> });
    });
    callback(cargos);
  });
  return unsubscribe; // Retorna a função para cancelar a inscrição
};


// Funções para atualizar e deletar (vamos usar depois)
export const updateCargo = async (id: string, cargo: Partial<Omit<Cargo, 'id'>>) => {
  const cargoDoc = doc(db, "cargos", id);
  await updateDoc(cargoDoc, cargo);
};

export const deleteCargo = async (id: string) => {
  const cargoDoc = doc(db, "cargos", id);
  await deleteDoc(cargoDoc);
};
