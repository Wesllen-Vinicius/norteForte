// lib/services/fornecedores.services.ts
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, QuerySnapshot, DocumentData, serverTimestamp, query, where } from "firebase/firestore";
import { Fornecedor } from "@/lib/schemas";

export const addFornecedor = async (fornecedor: Omit<Fornecedor, 'id' | 'createdAt' | 'status'>) => {
  try {
    const dataWithTimestamp = { ...fornecedor, status: 'ativo', createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, "fornecedores"), dataWithTimestamp);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar fornecedor: ", e);
    throw new Error("Não foi possível adicionar o fornecedor.");
  }
};

// **NOVA FUNÇÃO** para buscar fornecedores por status
export const subscribeToFornecedoresByStatus = (status: 'ativo' | 'inativo', callback: (fornecedores: Fornecedor[]) => void) => {
  const q = query(collection(db, "fornecedores"), where("status", "==", status));

  return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const fornecedores: Fornecedor[] = [];
    querySnapshot.forEach((doc) => {
      fornecedores.push({ id: doc.id, ...doc.data() as Omit<Fornecedor, 'id'> });
    });
    callback(fornecedores);
  });
};

// Função antiga mantida para compatibilidade, se necessário, ou pode ser removida.
export const subscribeToFornecedores = (callback: (fornecedores: Fornecedor[]) => void) => {
  const q = query(collection(db, "fornecedores"), where("status", "==", "ativo"));

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const fornecedores: Fornecedor[] = [];
    querySnapshot.forEach((doc) => {
      fornecedores.push({ id: doc.id, ...doc.data() as Omit<Fornecedor, 'id'> });
    });
    callback(fornecedores);
  });
  return unsubscribe;
};

export const updateFornecedor = async (id: string, fornecedor: Partial<Omit<Fornecedor, 'id' | 'createdAt' | 'status'>>) => {
  const fornecedorDoc = doc(db, "fornecedores", id);
  await updateDoc(fornecedorDoc, fornecedor);
};

export const setFornecedorStatus = async (id: string, status: 'ativo' | 'inativo') => {
    const fornecedorDoc = doc(db, "fornecedores", id);
    await updateDoc(fornecedorDoc, { status });
}
