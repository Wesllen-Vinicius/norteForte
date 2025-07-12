// lib/services/vendas.services.ts
import { db } from "@/lib/firebase";
import { collection, doc, runTransaction, serverTimestamp, Timestamp, onSnapshot, QuerySnapshot, DocumentData, updateDoc, query, orderBy } from "firebase/firestore";
import { Venda } from "@/lib/schemas";

export const registrarVenda = async (vendaData: Omit<Venda, 'id' | 'createdAt' | 'status'>, clienteNome: string) => {
  try {
    await runTransaction(db, async (transaction) => {
      // --- ETAPA 1: LEITURA DE TODOS OS DOCUMENTOS ---
      const produtoRefs = vendaData.produtos.map(item => doc(db, "produtos", item.produtoId));
      const produtoDocs = await Promise.all(produtoRefs.map(ref => transaction.get(ref)));

      // Lê a conta bancária de destino, se aplicável, no início da transação
      let contaBancariaDoc = null;
      if (vendaData.contaBancariaId && vendaData.condicaoPagamento === 'A_VISTA') {
        const contaRef = doc(db, "contasBancarias", vendaData.contaBancariaId);
        contaBancariaDoc = await transaction.get(contaRef);
        if (!contaBancariaDoc.exists()) {
          throw new Error("Conta bancária de destino não encontrada.");
        }
      }

      // --- ETAPA 2: VALIDAÇÃO DOS DADOS LIDOS ---
      const produtosParaSalvar = [];
      for (let i = 0; i < produtoDocs.length; i++) {
        const produtoDoc = produtoDocs[i];
        const item = vendaData.produtos[i];

        if (!produtoDoc.exists()) {
          throw new Error(`Produto "${item.produtoNome}" não encontrado.`);
        }

        const dadosProduto = produtoDoc.data();
        const estoqueAtual = dadosProduto.quantidade || 0;
        if (estoqueAtual < item.quantidade) {
          throw new Error(`Estoque de "${item.produtoNome}" (${estoqueAtual}) insuficiente para a venda de ${item.quantidade}.`);
        }
        produtosParaSalvar.push({ ...item, custoUnitario: dadosProduto.custoUnitario || 0 });
      }

      // --- ETAPA 3: OPERAÇÕES DE ESCRITA ---
      const vendaDocRef = doc(collection(db, "vendas"));
      const statusVenda = vendaData.condicaoPagamento === 'A_VISTA' ? 'Paga' : 'Pendente';

      const dadosVendaFinal = {
        ...vendaData,
        produtos: produtosParaSalvar,
        status: statusVenda,
        createdAt: serverTimestamp(),
        data: Timestamp.fromDate(vendaData.data),
        dataVencimento: vendaData.dataVencimento ? Timestamp.fromDate(vendaData.dataVencimento) : null,
      };
      transaction.set(vendaDocRef, dadosVendaFinal);

      // Atualiza o estoque de cada produto e registra a movimentação
      for (let i = 0; i < produtoDocs.length; i++) {
        const produtoRef = produtoRefs[i];
        const produtoData = produtoDocs[i].data();
        const item = vendaData.produtos[i];

        const novoEstoque = (produtoData?.quantidade || 0) - item.quantidade;
        transaction.update(produtoRef, { quantidade: novoEstoque });

        const movimentacaoDocRef = doc(collection(db, "movimentacoesEstoque"));
        transaction.set(movimentacaoDocRef, {
            produtoId: item.produtoId,
            produtoNome: item.produtoNome,
            quantidade: item.quantidade,
            tipo: 'saida',
            motivo: `Venda para ${clienteNome} (ID: ${vendaDocRef.id.slice(0, 5)})`,
            data: serverTimestamp(),
        });
      }

      // Cria a conta a receber se a venda for a prazo
      if (vendaData.condicaoPagamento === 'A_PRAZO' && vendaData.dataVencimento) {
        const contaReceberRef = doc(collection(db, "contasAReceber"));
        transaction.set(contaReceberRef, {
            vendaId: vendaDocRef.id,
            clienteId: vendaData.clienteId,
            valor: vendaData.valorTotal,
            dataEmissao: Timestamp.fromDate(vendaData.data),
            dataVencimento: Timestamp.fromDate(vendaData.dataVencimento),
            status: 'Pendente',
        });
      }

      // Atualiza o saldo da conta bancária se a venda for à vista
      if (contaBancariaDoc && contaBancariaDoc.exists()) {
        const valorFinal = vendaData.valorFinal ?? vendaData.valorTotal;
        const novoSaldo = (contaBancariaDoc.data().saldoAtual || 0) + valorFinal;
        transaction.update(contaBancariaDoc.ref, { saldoAtual: novoSaldo });
      }
    });
  } catch (error) {
    console.error("Erro ao registrar venda: ", error);
    throw error;
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
