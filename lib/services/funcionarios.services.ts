// lib/services/funcionarios.services.ts
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc,serverTimestamp } from "firebase/firestore";
import { z } from "zod";

export const funcionarioSchema = z.object({
  id: z.string().optional(),

  // Dados da Empresa (MEI)
  razaoSocial: z.string().min(3, "A Razão Social é obrigatória."),
  // Ajuste para aceitar a máscara completa
  cnpj: z.string().length(18, "O CNPJ deve ter 14 dígitos."),

  // Dados Pessoais
  nomeCompleto: z.string().min(3, "O nome completo é obrigatório."),
  // Ajuste para aceitar a máscara completa
  cpf: z.string().length(14, "O CPF deve ter 11 dígitos."),
  contato: z.string().min(10, "O telefone de contato é obrigatório."),

  // Dados Internos
  cargoId: z.string({ required_error: "O cargo é obrigatório." }).min(1, "O cargo é obrigatório."),

  // Dados de Pagamento
  banco: z.string().min(1, "O banco é obrigatório."),
  agencia: z.string().min(1, "A agência é obrigatória."),
  conta: z.string().min(1, "A conta é obrigatória."),

  createdAt: z.any().optional(),
});

export type Funcionario = z.infer<typeof funcionarioSchema> & { cargoNome?: string };

export const addFuncionario = async (funcionario: Omit<Funcionario, 'id' | 'cargoNome'>) => {
  try {
    const dataWithTimestamp = { ...funcionario, createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, "funcionarios"), dataWithTimestamp);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar prestador: ", e);
    throw new Error("Não foi possível adicionar o prestador.");
  }
};

export const subscribeToFuncionarios = (callback: (funcionarios: Funcionario[]) => void) => {
  return onSnapshot(collection(db, "funcionarios"), (querySnapshot) => {
    const funcionarios: Funcionario[] = [];
    querySnapshot.forEach((doc) => {
      funcionarios.push({ id: doc.id, ...(doc.data() as Omit<Funcionario, 'id'>) });
    });
    callback(funcionarios);
  });
};

export const updateFuncionario = async (id: string, funcionario: Partial<Omit<Funcionario, 'id'>>) => {
  const funcionarioDoc = doc(db, "funcionarios", id);
  await updateDoc(funcionarioDoc, funcionario);
};

export const deleteFuncionario = async (id: string) => {
  const funcionarioDoc = doc(db, "funcionarios", id);
  await deleteDoc(funcionarioDoc);
};
