// lib/services/funcionarios.services.ts
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, QuerySnapshot, DocumentData } from "firebase/firestore";
import { z } from "zod";

// Schema para o formulário de funcionário
export const funcionarioSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, "O nome é obrigatório."),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  celular: z.string().optional().or(z.literal("")),
  cargoId: z.string().min(1, "Selecione um cargo."),
});

// Tipo que representa o funcionário, incluindo o ID do documento
export type Funcionario = z.infer<typeof funcionarioSchema>;

// Adicionar um novo funcionário
export const addFuncionario = async (funcionario: Omit<Funcionario, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, "funcionarios"), funcionario);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar funcionário: ", e);
    throw new Error("Não foi possível adicionar o funcionário.");
  }
};

// Escutar atualizações em tempo real para funcionários
export const subscribeToFuncionarios = (callback: (funcionarios: Funcionario[]) => void) => {
  const unsubscribe = onSnapshot(collection(db, "funcionarios"), (querySnapshot: QuerySnapshot<DocumentData>) => {
    const funcionarios: Funcionario[] = [];
    querySnapshot.forEach((doc) => {
      funcionarios.push({ id: doc.id, ...doc.data() as Omit<Funcionario, 'id'> });
    });
    callback(funcionarios);
  });
  return unsubscribe;
};

// Atualizar um funcionário existente
export const updateFuncionario = async (id: string, funcionario: Partial<Omit<Funcionario, 'id'>>) => {
  const funcionarioDoc = doc(db, "funcionarios", id);
  await updateDoc(funcionarioDoc, funcionario);
};

// Deletar um funcionário
export const deleteFuncionario = async (id: string) => {
  const funcionarioDoc = doc(db, "funcionarios", id);
  await deleteDoc(funcionarioDoc);
};
