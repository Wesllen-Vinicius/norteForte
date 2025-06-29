// lib/services/clientes.services.ts

import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, QuerySnapshot, DocumentData, serverTimestamp, query, where } from "firebase/firestore";
import { Cliente } from "@/lib/schemas";

export const addCliente = async (cliente: Omit<Cliente, 'id' | 'createdAt' | 'status'>) => {
  try {
    const dataWithTimestamp = {
      ...cliente,
      status: 'ativo',
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, "clientes"), dataWithTimestamp);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar cliente: ", e);
    throw new Error("Não foi possível adicionar o cliente.");
  }
};

// **NOVA FUNÇÃO** para buscar clientes por status
export const subscribeToClientesByStatus = (status: 'ativo' | 'inativo', callback: (clientes: Cliente[]) => void) => {
  const q = query(collection(db, "clientes"), where("status", "==", status));

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const clientes: Cliente[] = [];
    querySnapshot.forEach((doc) => {
      clientes.push({ id: doc.id, ...doc.data() as Omit<Cliente, 'id'> });
    });
    callback(clientes);
  });
  return unsubscribe;
};

// **FUNÇÃO ANTIGA REMOVIDA** (pode ser mantida se usada em outro lugar)
export const subscribeToClientes = (callback: (clientes: Cliente[]) => void) => {
  const q = query(collection(db, "clientes"), where("status", "==", "ativo"));

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const clientes: Cliente[] = [];
    querySnapshot.forEach((doc) => {
      clientes.push({ id: doc.id, ...doc.data() as Omit<Cliente, 'id'> });
    });
    callback(clientes);
  });
  return unsubscribe;
};


export const updateCliente = async (id: string, cliente: Partial<Omit<Cliente, 'id' | 'createdAt' | 'status'>>) => {
  const clienteDoc = doc(db, "clientes", id);
  await updateDoc(clienteDoc, cliente);
};

export const setClienteStatus = async (id: string, status: 'ativo' | 'inativo') => {
    const clienteDoc = doc(db, "clientes", id);
    await updateDoc(clienteDoc, { status });
}
