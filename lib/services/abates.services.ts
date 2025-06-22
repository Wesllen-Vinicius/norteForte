import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, QuerySnapshot, DocumentData } from "firebase/firestore";
import { z } from "zod";

// Schema final para o registro de abate
export const abateSchema = z.object({
  id: z.string().optional(),
  data: z.date({ required_error: "A data é obrigatória." }),
  total: z.coerce.number().positive("O total de animais deve ser maior que zero."),
  condenado: z.coerce.number().min(0, "A quantidade de condenados não pode ser negativa."),
  responsavelId: z.string().min(1, "O responsável pelo abate é obrigatório."),
  registradoPor: z.object({
    uid: z.string(),
    nome: z.string(),
  }),
  createdAt: z.any().optional(),
});

// Tipo final para o abate, usado na aplicação
export type Abate = z.infer<typeof abateSchema>;

// Adiciona um novo abate no banco de dados
export const addAbate = async (abate: Omit<Abate, 'id' | 'createdAt'>) => {
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

// Listener para atualizações em tempo real
export const subscribeToAbates = (callback: (abates: Abate[]) => void) => {
  const q = collection(db, "abates");
  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const abates: Abate[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        abates.push({
            id: doc.id,
            ...data,
            data: data.data.toDate() // Converte Timestamp para Date
        } as Abate);
    });
    // Ordena do mais recente para o mais antigo
    callback(abates.sort((a, b) => (b.data as Date).getTime() - (a.data as Date).getTime()));
  });
  return unsubscribe;
};

// Atualiza um registro de abate existente
export const updateAbate = async (id: string, abate: Partial<Omit<Abate, 'id' | 'createdAt'>>) => {
  const abateDoc = doc(db, "abates", id);
  await updateDoc(abateDoc, abate);
};

// Deleta um registro de abate
export const deleteAbate = async (id:string) => {
    const abateDoc = doc(db, "abates", id);
    await deleteDoc(abateDoc);
}
