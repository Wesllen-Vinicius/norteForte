// lib/services/clientes.services.ts
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, QuerySnapshot, DocumentData, serverTimestamp } from "firebase/firestore";
import { z } from "zod";

export const clienteSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  tipoPessoa: z.enum(["fisica", "juridica"], { required_error: "Selecione o tipo de pessoa." }),
  documento: z.string().min(11, "O CPF/CNPJ é obrigatório."),
  telefone: z.string().min(10, "O telefone é obrigatório."),
  email: z.string().email("O e-mail é obrigatório e deve ser válido."),
  endereco: z.string().min(5, "O endereço é obrigatório."),
  createdAt: z.any().optional(),
});

export type Cliente = z.infer<typeof clienteSchema>;

export const addCliente = async (cliente: Omit<Cliente, 'id'>) => {
  try {
    const dataWithTimestamp = {
      ...cliente,
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, "clientes"), dataWithTimestamp);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar cliente: ", e);
    throw new Error("Não foi possível adicionar o cliente.");
  }
};

export const subscribeToClientes = (callback: (clientes: Cliente[]) => void) => {
  const unsubscribe = onSnapshot(collection(db, "clientes"), (querySnapshot: QuerySnapshot<DocumentData>) => {
    const clientes: Cliente[] = [];
    querySnapshot.forEach((doc) => {
      clientes.push({ id: doc.id, ...doc.data() as Omit<Cliente, 'id'> });
    });
    callback(clientes);
  });
  return unsubscribe;
};

export const updateCliente = async (id: string, cliente: Partial<Omit<Cliente, 'id'>>) => {
  const clienteDoc = doc(db, "clientes", id);
  await updateDoc(clienteDoc, cliente);
};

export const deleteCliente = async (id: string) => {
  const clienteDoc = doc(db, "clientes", id);
  await deleteDoc(clienteDoc);
};
