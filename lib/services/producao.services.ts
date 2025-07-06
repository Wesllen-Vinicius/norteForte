import { db } from "@/lib/firebase";
import { collection, doc, runTransaction, serverTimestamp, onSnapshot, QuerySnapshot, DocumentData, Timestamp, updateDoc, query, where, orderBy } from "firebase/firestore";
import { z } from "zod";
import { Producao, producaoSchema, ProducaoFormValues, Abate } from "@/lib/schemas";

export const registrarProducao = async (producaoData: ProducaoFormValues, user: { uid: string; nome: string; role?: 'ADMINISTRADOR' | 'USUARIO' }) => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Validações Iniciais
      if (!producaoData.abateId) throw new Error("O abate de origem é obrigatório.");

      const abateRef = doc(db, "abates", producaoData.abateId);
      const abateDoc = await transaction.get(abateRef);
      if (!abateDoc.exists()) throw new Error("O registro de abate selecionado não foi encontrado.");

      const abate = abateDoc.data() as Abate;
      if (!abate.compraId) throw new Error("O abate selecionado não está vinculado a uma compra de matéria-prima.");

      // 2. Registra o documento de produção
      const producaoDocRef = doc(collection(db, "producoes"));
      const dataToSave = {
        ...producaoData,
        data: Timestamp.fromDate(producaoData.data),
        registradoPor: user,
        status: 'ativo',
        createdAt: serverTimestamp(),
      };
      transaction.set(producaoDocRef, dataToSave);

      // 3. Debita a matéria-prima (animal) do estoque
      // Assumindo que a compra vinculada ao abate tem um item principal que é o animal
      const compraRef = doc(db, "compras", abate.compraId);
      const compraDoc = await transaction.get(compraRef);
      if (!compraDoc.exists()) throw new Error("A compra vinculada ao abate não foi encontrada.");

      const compraData = compraDoc.data();
      const animalItem = compraData.itens.find((item: any) => item.produtoNome.toLowerCase().includes('animal')); // Heurística para achar o item
      if (!animalItem) throw new Error("Não foi possível identificar a matéria-prima principal na compra vinculada.");

      const materiaPrimaRef = doc(db, "produtos", animalItem.produtoId);
      const materiaPrimaDoc = await transaction.get(materiaPrimaRef);
      if (!materiaPrimaDoc.exists()) throw new Error("Matéria-prima principal não encontrada no estoque.");

      const estoqueAtualMateriaPrima = materiaPrimaDoc.data().quantidade || 0;
      const novoEstoqueMateriaPrima = estoqueAtualMateriaPrima - abate.total;
      if (novoEstoqueMateriaPrima < 0) throw new Error(`Estoque insuficiente de "${animalItem.produtoNome}" para o abate.`);

      transaction.update(materiaPrimaRef, { quantidade: novoEstoqueMateriaPrima });

      // Registra a movimentação de saída da matéria-prima
      const movMateriaPrimaRef = doc(collection(db, "movimentacoesEstoque"));
      transaction.set(movMateriaPrimaRef, {
        produtoId: animalItem.produtoId,
        produtoNome: animalItem.produtoNome,
        quantidade: abate.total,
        tipo: 'saida',
        motivo: `Consumido na Produção Lote: ${producaoData.lote || producaoDocRef.id.slice(-5)}`,
        data: serverTimestamp(),
      });

      // 4. Credita os produtos acabados no estoque e registra suas movimentações
      for (const item of producaoData.produtos) {
        const produtoRef = doc(db, "produtos", item.produtoId);
        const produtoDoc = await transaction.get(produtoRef);

        if (!produtoDoc.exists()) {
          throw new Error(`Produto acabado "${item.produtoNome}" não foi encontrado.`);
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

// O restante do arquivo permanece o mesmo
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
