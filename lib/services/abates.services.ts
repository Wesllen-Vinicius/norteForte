import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, QuerySnapshot, DocumentData } from "firebase/firestore";
import { z } from "zod";

export const abateSchema = z.object({
  id: z.string().optional(),
  data: z.date({ required_error: "A data é obrigatória." }),
  total: z.coerce.number().positive("O total deve ser maior que zero."),
  boi: z.coerce.number().min(0, "A quantidade não pode ser negativa."),
  vaca: z.coerce.number().min(0, "A quantidade não pode ser negativa."),
  condenado: z.coerce.number().min(0, "A quantidade não pode ser negativa."),
  createdAt: z.any().optional(),
});

export type Abate = z.infer<typeof abateSchema>;

export const addAbate = async (abate: Omit<Abate, 'id'>) => {
  try {
    const dataWithTimestamp = {
        ...abate,
        createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, "abates"), dataWithTimestamp);
  } catch (e) {
    console.error("Erro ao adicionar abate: ", e);
    throw new Error("Não foi possível adicionar o registro de abate.");
  }
};

export const subscribeToAbates = (callback: (abates: Abate[]) => void) => {
  const q = collection(db, "abates");
  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const abates: Abate[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        abates.push({
            id: doc.id,
            ...data,
            data: data.data.toDate()
        } as Abate);
    });
    callback(abates.sort((a, b) => b.data.getTime() - a.data.getTime()));
  });
  return unsubscribe;
};

export const updateAbate = async (id: string, abate: Omit<Abate, 'id'>) => {
  const abateDoc = doc(db, "abates", id);
  await updateDoc(abateDoc, abate);
};

export const deleteAbate = async (id:string) => {
    const abateDoc = doc(db, "abates", id);
    await deleteDoc(abateDoc);
}
