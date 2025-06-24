import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, Query, query, where, QuerySnapshot, DocumentData, Timestamp, addDoc } from "firebase/firestore";
import { DateRange } from "react-day-picker";
import { z } from "zod";
import { Abate, abateSchema } from "@/lib/schemas";

const formSchema = abateSchema.pick({
  data: true,
  total: true,
  condenado: true,
  responsavelId: true,
  compraId: true,
});
type AbateFormValues = z.infer<typeof formSchema>;

export const addAbate = async (formValues: AbateFormValues, user: { uid: string, nome: string, role: 'ADMINISTRADOR' | 'USUARIO' }) => {
  try {
    const dataToSave = {
      ...formValues,
      registradoPor: user,
      status: 'ativo',
      createdAt: serverTimestamp(),
      data: Timestamp.fromDate(formValues.data),
    };
    await addDoc(collection(db, "abates"), dataToSave);
  } catch (e) {
    console.error("Erro ao adicionar abate: ", e);
    throw new Error("Não foi possível adicionar o registro de abate.");
  }
};

export const subscribeToAbatesByDateRange = (dateRange: DateRange | undefined, callback: (abates: Abate[]) => void) => {
  const q = query(collection(db, "abates"));

  const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    let abates: Abate[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        abates.push({ id: doc.id, ...data, data: data.data.toDate() } as Abate);
    });

    let filteredData = abates.filter(abate => abate.status !== 'inativo');

    if (dateRange?.from) {
        const toDate = dateRange.to || dateRange.from;
        const fromTimestamp = new Date(dateRange.from.setHours(0, 0, 0, 0)).getTime();
        const toTimestamp = new Date(toDate.setHours(23, 59, 59, 999)).getTime();
        filteredData = filteredData.filter(abate => {
            const abateTime = abate.data.getTime();
            return abateTime >= fromTimestamp && abateTime <= toTimestamp;
        });
    }

    callback(filteredData.sort((a, b) => b.data.getTime() - a.data.getTime()));
  }, (error) => {
    console.error("Erro no listener de Abates: ", error);
  });

  return unsubscribe;
};

export const updateAbate = async (id: string, formValues: Partial<AbateFormValues>) => {
    const dataToUpdate: { [key:string]: any} = { ...formValues };
    if (formValues.data) {
        dataToUpdate.data = Timestamp.fromDate(formValues.data);
    }
    const abateDoc = doc(db, "abates", id);
    await updateDoc(abateDoc, dataToUpdate);
};

export const setAbateStatus = async (id:string, status: 'ativo' | 'inativo') => {
    const abateDoc = doc(db, "abates", id);
    await updateDoc(abateDoc, { status });
}
