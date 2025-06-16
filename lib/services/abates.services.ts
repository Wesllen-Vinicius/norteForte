// lib/services/abates.services.ts
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, QuerySnapshot, DocumentData } from "firebase/firestore";
import { z } from "zod";

// Schema para um registro de abate
export const abateSchema = z.object({
  id: z.string().optional(),
  data: z.date({ required_error: "A data é obrigatória." }),
  total: z.coerce.number().positive("O total deve ser maior que zero."),
  boi: z.coerce.number().min(0, "A quantidade não pode ser negativa."),
  vaca: z.coerce.number().min(0, "A quantidade não pode ser negativa."),
  condenado: z.coerce.number().min(0, "A quantidade não pode ser negativa."),
}).refine(data => data.total === data.boi + data.vaca, {
    message: "O total de abates deve ser a soma de bois e vacas.",
    path: ["total"], // Indica qual campo mostrará o erro
});

export type Abate = z.infer<typeof abateSchema>;

// Adicionar um novo registro de abate
export const addAbate = async (abate: Omit<Abate, 'id'>) => {
  try {
    const dataComTimestamp = {
        ...abate,
        data: abate.data, // A data já é um objeto Date
    };
    await addDoc(collection(db, "abates"), dataComTimestamp);
  } catch (e) {
    console.error("Erro ao adicionar abate: ", e);
    throw new Error("Não foi possível adicionar o registro de abate.");
  }
};

// Escutar atualizações em tempo real
export const subscribeToAbates = (callback: (abates: Abate[]) => void) => {
  const q = collection(db, "abates");
  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const abates: Abate[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        abates.push({
            id: doc.id,
            ...data,
            data: data.data.toDate() // Converte Timestamp do Firebase para Date do JS
        } as Abate);
    });
    callback(abates.sort((a, b) => b.data.getTime() - a.data.getTime())); // Ordena por data mais recente
  });
  return unsubscribe;
};

// Atualizar um registro de abate
export const updateAbate = async (id: string, abate: Omit<Abate, 'id'>) => {
  const abateDoc = doc(db, "abates", id);
  await updateDoc(abateDoc, abate);
};

// Deletar um registro de abate
export const deleteAbate = async (id:string) => {
    const abateDoc = doc(db, "abates", id);
    await deleteDoc(abateDoc);
}
