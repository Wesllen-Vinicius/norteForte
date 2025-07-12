import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { collection, doc, onSnapshot, QuerySnapshot, DocumentData, Timestamp, updateDoc, query } from "firebase/firestore";
import { Producao, producaoSchema, ProducaoFormValues, Abate } from "@/lib/schemas";

/**
 * Registra uma nova produção de forma segura através de uma Cloud Function.
 * A lógica da transação foi movida para o servidor para garantir a integridade dos dados.
 */
export const registrarProducao = async (producaoData: ProducaoFormValues, user: { uid: string; nome: string; role?: 'ADMINISTRADOR' | 'USUARIO' }) => {
  try {
    const registrarProducaoFunction = httpsCallable(functions, 'registrarProducaoHttps');

    // Prepara o payload, convertendo a data para string ISO.
    // O objeto 'user' é removido, pois a identidade do usuário será
    // obtida de forma segura no backend através do token de autenticação.
    const payload = {
      ...producaoData,
      data: producaoData.data.toISOString(),
    };

    await registrarProducaoFunction(payload);
  } catch (error: any) {
    console.error("Erro ao chamar a Cloud Function de registrar produção: ", error);
    // Repassa a mensagem de erro vinda do backend para o frontend.
    throw new Error(error.message || "Falha ao registrar a produção.");
  }
};

export const subscribeToProducoes = (callback: (producoes: Producao[]) => void) => {
    const q = query(collection(db, "producoes"));

    return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const producoes: Producao[] = [];
      querySnapshot.forEach((doc) => {
        const docData = doc.data();

        const dataToParse = {
            id: doc.id,
            ...docData,
            data: docData.data instanceof Timestamp ? docData.data.toDate() : docData.data,
        };

        const parsed = producaoSchema.safeParse(dataToParse);
        if(parsed.success) {
            producoes.push(parsed.data);
        } else {
            console.error("Documento de produção inválido no Firestore:", doc.id, parsed.error.format());
        }
      });

      const filtered = producoes.filter(p => p.status !== 'inativo');
      callback(filtered.sort((a, b) => (a.data as Date).getTime() - (b.data as Date).getTime()));
    }, (error) => {
      console.error("Erro no listener de Produções:", error);
    });
};

export const updateProducao = async (id: string, data: Partial<ProducaoFormValues>) => {
    const producaoDoc = doc(db, "producoes", id);
    const dataToUpdate: { [key: string]: any } = { ...data };
    if (data.data) {
        dataToUpdate.data = Timestamp.fromDate(data.data);
    }
    await updateDoc(producaoDoc, dataToUpdate);
};

export const setProducaoStatus = async (id: string, status: 'ativo' | 'inativo') => {
    const producaoDoc = doc(db, "producoes", id);
    await updateDoc(producaoDoc, { status });
};
