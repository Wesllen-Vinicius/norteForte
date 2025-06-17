import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, QuerySnapshot, DocumentData } from "firebase/firestore";
import { z } from "zod";

// Schema para o formulário de cliente
export const clienteSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  tipoPessoa: z.enum(["fisica", "juridica"], { required_error: "Selecione o tipo de pessoa." }),
  documento: z.string().min(11, "O documento é obrigatório.").optional().or(z.literal("")), // CPF/CNPJ
  telefone: z.string().optional().or(z.literal("")),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  endereco: z.string().optional().or(z.literal("")),
});

// Tipo que representa o cliente, incluindo o ID do documento
export type Cliente = z.infer<typeof clienteSchema>;

// Adicionar um novo cliente
export const addCliente = async (cliente: Omit<Cliente, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, "clientes"), cliente);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar cliente: ", e);
    throw new Error("Não foi possível adicionar o cliente.");
  }
};

// Escutar atualizações em tempo real para clientes
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

// Atualizar um cliente existente
export const updateCliente = async (id: string, cliente: Partial<Omit<Cliente, 'id'>>) => {
  const clienteDoc = doc(db, "clientes", id);
  await updateDoc(clienteDoc, cliente);
};

// Deletar um cliente
export const deleteCliente = async (id: string) => {
  const clienteDoc = doc(db, "clientes", id);
  await deleteDoc(clienteDoc);
};
