// wesllen-vinicius/norteforte/norteForte-dev/lib/services/abates.services.ts
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, Query, query, where, QuerySnapshot, DocumentData, Timestamp, orderBy } from "firebase/firestore";
import { z } from "zod";
import { DateRange } from "react-day-picker";

export const abateSchema = z.object({
  id: z.string().optional(),
  data: z.date({ required_error: "A data é obrigatória." }),
  total: z.coerce.number().positive("O total de animais deve ser maior que zero."),
  condenado: z.coerce.number().min(0, "A quantidade de condenados não pode ser negativa."),
  responsavelId: z.string().min(1, "O responsável pelo abate é obrigatório."),
  registradoPor: z.object({
    uid: z.string(),
    nome: z.string(),
    role: z.enum(['ADMINISTRADOR', 'USUARIO']).optional(),
  }),
  createdAt: z.any().optional(),
});

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

// Listener para atualizações em tempo real para o data.store
export const subscribeToAbates = (callback: (abates: Abate[]) => void) => {
  const q = query(collection(db, "abates"), orderBy("data", "desc"));
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
    callback(abates);
  });
  return unsubscribe;
};

// Listener otimizado para a página de abates, com filtro de data
export const subscribeToAbatesByDateRange = (dateRange: DateRange | undefined, callback: (abates: Abate[]) => void) => {
  let q: Query<DocumentData> = query(collection(db, "abates"), orderBy("data", "desc"));

  if (dateRange?.from) {
    const fromDate = Timestamp.fromDate(dateRange.from);
    const toDate = dateRange.to ? Timestamp.fromDate(new Date(dateRange.to.setHours(23, 59, 59, 999))) : Timestamp.fromDate(new Date(dateRange.from.setHours(23, 59, 59, 999)));
    q = query(q, where("data", ">=", fromDate), where("data", "<=", toDate));
  }

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
    callback(abates);
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
