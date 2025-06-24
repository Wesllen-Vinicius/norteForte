import { db } from "@/lib/firebase";
import { collection, doc, runTransaction, serverTimestamp, onSnapshot, QuerySnapshot, DocumentData, Timestamp, updateDoc, query, where, orderBy } from "firebase/firestore";
import { z } from "zod";
import { Producao, producaoSchema, ProducaoFormValues } from "@/lib/schemas";

export const registrarProducao = async (producaoData: ProducaoFormValues, user: { uid: string; nome: string; role?: 'ADMINISTRADOR' | 'USUARIO' }) => {
  try {
    await runTransaction(db, async (transaction) => {
      const producaoDocRef = doc(collection(db, "producoes"));

      const dataToSave = {
        ...producaoData,
        data: Timestamp.fromDate(producaoData.data),
        registradoPor: user,
        status: 'ativo',
        createdAt: serverTimestamp(),
      };
      transaction.set(producaoDocRef, dataToSave);

      for (const item of producaoData.produtos) {
        const produtoRef = doc(db, "produtos", item.produtoId);
        const produtoDoc = await transaction.get(produtoRef);

        if (!produtoDoc.exists()) {
          throw new Error(`Produto "${item.produtoNome}" não foi encontrado.`);
        }

        const estoqueAtual = produtoDoc.data()!.quantidade || 0;
        const novoEstoque = estoqueAtual + item.quantidade;
        transaction.update(produtoRef, { quantidade: novoEstoque });

        const movimentacaoDocRef = doc(collection(db, "movimentacoesEstoque"));
        transaction.set(movimentacaoDocRef, {
          produtoId: item.produtoId,
          produtoNome: item.produtoNome,
          quantidade: item.quantidade,
          tipo: 'entrada',
          motivo: `Produção Lote: ${producaoData.lote || producaoDocRef.id.slice(-5)}`,
          data: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    console.error("Erro ao registrar produção: ", error);
    throw error;
  }
};

export const subscribeToProducoes = (callback: (producoes: Producao[]) => void) => {
    // Consulta simplificada para evitar a necessidade de índice
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
      callback(filtered.sort((a, b) => b.data.getTime() - a.data.getTime()));
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
