// lib/services/fornecedores.services.ts
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, QuerySnapshot, DocumentData } from "firebase/firestore";
import { z } from "zod";

// Schema para os dados bancários
const dadosBancariosSchema = z.object({
  banco: z.string().min(1, "O nome do banco é obrigatório."),
  agencia: z.string().min(1, "A agência é obrigatória."),
  conta: z.string().min(1, "A conta é obrigatória."),
  pix: z.string().optional().or(z.literal("")),
});

// Schema principal para o fornecedor
export const fornecedorSchema = z.object({
  id: z.string().optional(),
  razaoSocial: z.string().min(3, "A Razão Social é obrigatória."),
  cnpj: z.string().length(18, "O CNPJ deve ter 14 dígitos."), // 18 com a máscara
  contato: z.string().min(10, "O telefone de contato é obrigatório."),
  endereco: z.string().min(5, "O endereço é obrigatório."),
  dadosBancarios: dadosBancariosSchema,
});

export type Fornecedor = z.infer<typeof fornecedorSchema>;

// Adicionar um novo fornecedor
export const addFornecedor = async (fornecedor: Omit<Fornecedor, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, "fornecedores"), fornecedor);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar fornecedor: ", e);
    throw new Error("Não foi possível adicionar o fornecedor.");
  }
};

// Escutar atualizações em tempo real para fornecedores
export const subscribeToFornecedores = (callback: (fornecedores: Fornecedor[]) => void) => {
  const unsubscribe = onSnapshot(collection(db, "fornecedores"), (querySnapshot: QuerySnapshot<DocumentData>) => {
    const fornecedores: Fornecedor[] = [];
    querySnapshot.forEach((doc) => {
      fornecedores.push({ id: doc.id, ...doc.data() as Omit<Fornecedor, 'id'> });
    });
    callback(fornecedores);
  });
  return unsubscribe;
};

// Atualizar um fornecedor existente
export const updateFornecedor = async (id: string, fornecedor: Partial<Omit<Fornecedor, 'id'>>) => {
  const fornecedorDoc = doc(db, "fornecedores", id);
  await updateDoc(fornecedorDoc, fornecedor);
};

// Deletar um fornecedor
export const deleteFornecedor = async (id: string) => {
  const fornecedorDoc = doc(db, "fornecedores", id);
  await deleteDoc(fornecedorDoc);
};
