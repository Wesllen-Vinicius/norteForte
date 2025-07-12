import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, serverTimestamp, query, where } from "firebase/firestore";
import { Funcionario } from "@/lib/schemas";

export const addFuncionario = async (funcionario: Omit<Funcionario, 'id' | 'cargoNome' | 'createdAt' | 'status'>) => {
  try {
    const dataWithTimestamp = { ...funcionario, status: 'ativo', createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, "funcionarios"), dataWithTimestamp);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar funcionário: ", e);
    throw new Error("Não foi possível adicionar o funcionário.");
  }
};

export const subscribeToFuncionarios = (callback: (funcionarios: Funcionario[]) => void) => {
  const q = query(collection(db, "funcionarios"), where("status", "==", "ativo"));

  return onSnapshot(q, (querySnapshot) => {
    const funcionarios: Funcionario[] = [];
    querySnapshot.forEach((doc) => {
      funcionarios.push({ id: doc.id, ...(doc.data() as Omit<Funcionario, 'id'>) });
    });
    callback(funcionarios);
  });
};

export const updateFuncionario = async (id: string, funcionario: Partial<Omit<Funcionario, 'id' | 'createdAt' | 'status'>>) => {
  const funcionarioDoc = doc(db, "funcionarios", id);
  await updateDoc(funcionarioDoc, funcionario);
};

export const setFuncionarioStatus = async (id: string, status: 'ativo' | 'inativo') => {
    const funcionarioDoc = doc(db, "funcionarios", id);
    await updateDoc(funcionarioDoc, { status });
};
