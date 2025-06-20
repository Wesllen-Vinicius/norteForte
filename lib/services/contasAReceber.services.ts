import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, QuerySnapshot, DocumentData } from "firebase/firestore";
import { z } from "zod";

export const contaAReceberSchema = z.object({
  id: z.string(),
  vendaId: z.string(),
  clienteId: z.string(),
  clienteNome: z.string(),
  valor: z.number(),
  dataEmissao: z.any(),
  dataVencimento: z.any(),
  status: z.enum(['Pendente', 'Recebida']),
});

export type ContaAReceber = z.infer<typeof contaAReceberSchema>;

export const subscribeToContasAReceber = (callback: (contas: ContaAReceber[]) => void) => {
  return onSnapshot(collection(db, "contasAReceber"), (querySnapshot: QuerySnapshot<DocumentData>) => {
    const contas: ContaAReceber[] = [];
    querySnapshot.forEach((doc) => {
      contas.push({ id: doc.id, ...doc.data() } as ContaAReceber);
    });
    callback(contas);
  });
};

export const updateStatusContaAReceber = async (id: string, status: 'Pendente' | 'Recebida') => {
  const contaDocRef = doc(db, "contasAReceber", id);
  await updateDoc(contaDocRef, { status });
};
