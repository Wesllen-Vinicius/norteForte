import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, QuerySnapshot, DocumentData } from "firebase/firestore";
import { z } from "zod";

// Schema atualizado com os novos campos
export const abateSchema = z.object({
  id: z.string().optional(),
  data: z.date({ required_error: "A data é obrigatória." }),
  total: z.coerce.number().positive("O total deve ser maior que zero."),
  condenado: z.coerce.number().min(0, "A quantidade não pode ser negativa."),
  responsavelId: z.string().min(1, "O responsável é obrigatório."),
  registradoPor: z.object({
    uid: z.string(),
    nome: z.string(),
  }),
  createdAt: z.any().optional(),
});

// Tipo atualizado para incluir nomes para exibição na tabela
export type Abate = z.infer<typeof abateSchema> & { responsavelNome?: string };

// Função de adicionar atualizada para receber os dados do usuário que registra
export const addAbate = async (abate: Omit<Abate, 'id' | 'createdAt' | 'responsavelNome'>) => {
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

// As outras funções (subscribeToAbates, updateAbate, deleteAbate) podem permanecer como estão,
// mas a 'updateAbate' agora receberá um objeto com a nova estrutura.
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

export const updateAbate = async (id: string, abate: Partial<Omit<Abate, 'id' | 'createdAt' | 'responsavelNome'>>) => {
  const abateDoc = doc(db, "abates", id);
  await updateDoc(abateDoc, abate);
};

export const deleteAbate = async (id:string) => {
    const abateDoc = doc(db, "abates", id);
    await deleteDoc(abateDoc);
}
