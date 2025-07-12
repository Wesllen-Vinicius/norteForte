import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { collection, onSnapshot, query, QuerySnapshot, DocumentData, Timestamp } from "firebase/firestore";
import { Compra } from "@/lib/schemas";

type CompraPayload = Omit<Compra, 'id' | 'createdAt' | 'status'>;

/**
 * Registra uma nova compra de forma segura através de uma Cloud Function.
 * A lógica da transação foi movida para o servidor para garantir a integridade dos dados.
 */
export const registrarCompra = async (compraData: CompraPayload) => {
  try {
    const registrarCompraFunction = httpsCallable(functions, 'registrarCompraHttps');

    // Converte as datas para string no formato ISO, que é serializável em JSON
    const payload = {
      ...compraData,
      data: compraData.data.toISOString(),
      dataPrimeiroVencimento: compraData.dataPrimeiroVencimento
        ? compraData.dataPrimeiroVencimento.toISOString()
        : null,
    };

    // Chama a função de backend e aguarda o resultado
    await registrarCompraFunction(payload);

  } catch (error: any) {
    console.error("Erro ao chamar a Cloud Function de registrar compra: ", error);
    // Repassa a mensagem de erro vinda do backend
    throw new Error(error.message || "Falha ao registrar a compra.");
  }
};

export const subscribeToCompras = (callback: (compras: Compra[]) => void) => {
    const q = query(collection(db, "compras"));
    return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      let compras: Compra[] = [];
      querySnapshot.forEach((doc) => {
          const data = doc.data();
          compras.push({
              ...data,
              id: doc.id,
              data: (data.data as Timestamp).toDate(),
          } as Compra);
      });
      callback(compras.sort((a, b) => (b.data as Date).getTime() - (a.data as Date).getTime()));
    });
};
