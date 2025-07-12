// lib/services/vendas.services.ts
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { collection, doc, onSnapshot, QuerySnapshot, DocumentData, updateDoc, query, orderBy, Timestamp } from "firebase/firestore";
import { Venda } from "@/lib/schemas";

/**
 * Registra uma nova venda de forma segura através de uma Cloud Function.
 * A lógica de transação, validação de estoque e criação de documentos
 * agora reside no backend, protegendo a integridade dos dados.
 */
export const registrarVenda = async (vendaData: Omit<Venda, 'id' | 'createdAt' | 'status' | 'registradoPor'>, clienteNome: string) => {
  try {
    // Prepara a chamada para a Cloud Function 'registrarVendaHttps'
    const registrarVendaFunction = httpsCallable(functions, 'registrarVendaHttps');

    // Prepara o payload para enviar à função. O ID do usuário logado é
    // obtido automaticamente no backend a partir do token de autenticação.
    const payload = {
      ...vendaData,
      clienteNome: clienteNome,
      data: vendaData.data.toISOString(), // Envia datas como string ISO
      dataVencimento: vendaData.dataVencimento ? vendaData.dataVencimento.toISOString() : null,
    };

    // Executa a Cloud Function
    const result = await registrarVendaFunction(payload);

    // Retorna o resultado da função (ex: { success: true, vendaId: '...' })
    return result.data;

  } catch (error: any) {
    console.error("Erro ao chamar a Cloud Function de registrar venda: ", error);
    // Repassa a mensagem de erro vinda do backend para o frontend
    throw new Error(error.message || "Falha ao registrar a venda.");
  }
};

export const subscribeToVendas = (callback: (vendas: Venda[]) => void) => {
  const q = query(collection(db, "vendas"), orderBy("data", "desc"));
  return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const vendas: Venda[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        vendas.push({
            ...data,
            id: doc.id,
            data: data.data.toDate(),
            dataVencimento: data.dataVencimento?.toDate(),
        } as Venda);
    });
    callback(vendas);
  });
};

export const updateVendaStatus = async (id: string, status: 'Paga' | 'Pendente') => {
  const vendaDoc = doc(db, "vendas", id);
  await updateDoc(vendaDoc, { status });
};

export const updateVenda = async (id: string, vendaData: Partial<Omit<Venda, 'id'>>) => {
    const vendaDocRef = doc(db, "vendas", id);

    const dataToUpdate: { [key: string]: any } = { ...vendaData };

    if (vendaData.data) {
        dataToUpdate.data = Timestamp.fromDate(vendaData.data as Date);
    }
    if (vendaData.dataVencimento) {
        dataToUpdate.dataVencimento = Timestamp.fromDate(vendaData.dataVencimento as Date);
    } else if (vendaData.hasOwnProperty('dataVencimento')) {
        dataToUpdate.dataVencimento = null;
    }

    await updateDoc(vendaDocRef, dataToUpdate);
}
