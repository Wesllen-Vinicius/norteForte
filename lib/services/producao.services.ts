import { db } from "@/lib/firebase";
import { collection, doc, runTransaction, serverTimestamp, onSnapshot, QuerySnapshot, DocumentData, Timestamp, updateDoc, query, where, orderBy } from "firebase/firestore";
import { z } from "zod";
import { Producao, producaoSchema, ProducaoFormValues, Abate } from "@/lib/schemas";

export const registrarProducao = async (producaoData: ProducaoFormValues, user: { uid: string; nome: string; role?: 'ADMINISTRADOR' | 'USUARIO' }) => {
  try {
    await runTransaction(db, async (transaction) => {
      // --- ETAPA 1: LEITURA DE TODOS OS DOCUMENTOS ---
      if (!producaoData.abateId) throw new Error("O abate de origem é obrigatório.");

      const abateRef = doc(db, "abates", producaoData.abateId);
      const abateDoc = await transaction.get(abateRef);
      if (!abateDoc.exists()) throw new Error("O registro de abate selecionado não foi encontrado.");

      const abate = abateDoc.data() as Abate;
      if (!abate.compraId) throw new Error("O abate selecionado não está vinculado a uma compra de matéria-prima.");

      const compraRef = doc(db, "compras", abate.compraId);
      const compraDoc = await transaction.get(compraRef);
      if (!compraDoc.exists()) throw new Error("A compra vinculada ao abate não foi encontrada.");

      const compraData = compraDoc.data();
      const animalItem = compraData.itens.find((item: any) => item.produtoNome.toLowerCase().includes('animal'));
      if (!animalItem) throw new Error("Não foi possível identificar a matéria-prima principal na compra vinculada.");

      const materiaPrimaRef = doc(db, "produtos", animalItem.produtoId);
      const materiaPrimaDoc = await transaction.get(materiaPrimaRef);
      if (!materiaPrimaDoc.exists()) throw new Error("Matéria-prima principal não encontrada no estoque.");

      const produtosAcabadosRefs = producaoData.produtos.map(item => doc(db, "produtos", item.produtoId));
      const produtosAcabadosDocs = await Promise.all(produtosAcabadosRefs.map(ref => transaction.get(ref)));

      // --- ETAPA 2: VALIDAÇÃO DOS DADOS LIDOS ---
      const materiaPrimaData = materiaPrimaDoc.data();
      if (!materiaPrimaData) throw new Error("Dados da matéria-prima não encontrados.");

      const estoqueAtualMateriaPrima = materiaPrimaData.quantidade || 0;
      const novoEstoqueMateriaPrima = estoqueAtualMateriaPrima - abate.total;
      if (novoEstoqueMateriaPrima < 0) throw new Error(`Estoque insuficiente de "${animalItem.produtoNome}" para o abate.`);

      for (let i = 0; i < produtosAcabadosDocs.length; i++) {
        const produtoDoc = produtosAcabadosDocs[i];
        if (!produtoDoc.exists()) {
          throw new Error(`Produto acabado "${producaoData.produtos[i].produtoNome}" não foi encontrado.`);
        }
      }

      // --- ETAPA 3: OPERAÇÕES DE ESCRITA ---
      const producaoDocRef = doc(collection(db, "producoes"));
      const dataToSave = {
        ...producaoData,
        data: Timestamp.fromDate(producaoData.data),
        registradoPor: user,
        status: 'ativo',
        createdAt: serverTimestamp(),
      };
      transaction.set(producaoDocRef, dataToSave);

      transaction.update(materiaPrimaRef, { quantidade: novoEstoqueMateriaPrima });

      const movMateriaPrimaRef = doc(collection(db, "movimentacoesEstoque"));
      transaction.set(movMateriaPrimaRef, {
        produtoId: animalItem.produtoId,
        produtoNome: animalItem.produtoNome,
        quantidade: abate.total,
        tipo: 'saida',
        motivo: `Consumido na Produção Lote: ${producaoData.lote || producaoDocRef.id.slice(-5)}`,
        data: serverTimestamp(),
      });

      for (let i = 0; i < produtosAcabadosDocs.length; i++) {
        const produtoRef = produtosAcabadosRefs[i];
        const produtoDoc = produtosAcabadosDocs[i];
        const item = producaoData.produtos[i];
        const produtoData = produtoDoc.data();

        if (produtoData) { // <-- Correção aqui
          const estoqueAtual = produtoData.quantidade || 0;
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
      }
    });
  } catch (error) {
    console.error("Erro ao registrar produção: ", error);
    throw error;
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
