import { db } from "@/lib/firebase";
import { collection, doc, runTransaction, serverTimestamp, Timestamp, onSnapshot, query, QuerySnapshot, DocumentData } from "firebase/firestore";
import { Compra } from "@/lib/schemas";
import { addMonths } from 'date-fns';

type CompraPayload = Omit<Compra, 'id' | 'createdAt' | 'status'>;

export const registrarCompra = async (compraData: CompraPayload) => {
  try {
    await runTransaction(db, async (transaction) => {
      // ETAPA 1: LEITURA DE TODOS OS DOCUMENTOS
      if (!compraData.contaBancariaId) {
        throw new Error("A conta bancária de origem é obrigatória para registrar a compra.");
      }
      const contaRef = doc(db, "contasBancarias", compraData.contaBancariaId);
      const contaDoc = await transaction.get(contaRef);
      if (!contaDoc.exists()) throw new Error("Conta bancária de origem não encontrada.");

      const produtoRefs = compraData.itens.map(item => doc(db, "produtos", item.produtoId));
      const produtoDocs = await Promise.all(produtoRefs.map(ref => transaction.get(ref)));

      // ETAPA 2: VALIDAÇÃO DOS DADOS LIDOS
      for (let i = 0; i < produtoDocs.length; i++) {
        const produtoDoc = produtoDocs[i];
        if (!produtoDoc.exists()) {
          throw new Error(`Produto "${compraData.itens[i].produtoNome}" não encontrado.`);
        }
      }

      // ETAPA 3: OPERAÇÕES DE ESCRITA
      if (compraData.condicaoPagamento === 'A_VISTA') {
        const saldoAtual = contaDoc.data().saldoAtual || 0;
        const novoSaldo = saldoAtual - compraData.valorTotal;
        transaction.update(contaRef, { saldoAtual: novoSaldo });
      }

      const compraDocRef = doc(collection(db, "compras"));
      transaction.set(compraDocRef, {
        ...compraData,
        status: 'ativo',
        createdAt: serverTimestamp(),
        data: Timestamp.fromDate(compraData.data),
        dataPrimeiroVencimento: compraData.dataPrimeiroVencimento ? Timestamp.fromDate(compraData.dataPrimeiroVencimento) : null,
      });

      if (compraData.condicaoPagamento === 'A_VISTA') {
        const contaPagarDocRef = doc(collection(db, "contasAPagar"));
        transaction.set(contaPagarDocRef, {
            compraId: compraDocRef.id,
            fornecedorId: compraData.fornecedorId,
            notaFiscal: compraData.notaFiscal,
            valor: compraData.valorTotal,
            dataEmissao: Timestamp.fromDate(compraData.data),
            dataVencimento: Timestamp.fromDate(compraData.data),
            status: "Paga",
            parcela: "1/1",
        });
      } else {
        const { numeroParcelas, dataPrimeiroVencimento, valorTotal } = compraData;
        const valorParcela = valorTotal / numeroParcelas!;
        for (let i = 0; i < numeroParcelas!; i++) {
            const contaPagarDocRef = doc(collection(db, "contasAPagar"));
            const dataVencimento = addMonths(dataPrimeiroVencimento!, i);
            transaction.set(contaPagarDocRef, {
                compraId: compraDocRef.id,
                fornecedorId: compraData.fornecedorId,
                notaFiscal: compraData.notaFiscal,
                valor: valorParcela,
                dataEmissao: Timestamp.fromDate(compraData.data),
                dataVencimento: Timestamp.fromDate(dataVencimento),
                status: "Pendente",
                parcela: `${i + 1}/${numeroParcelas}`,
            });
        }
      }

      for (let i = 0; i < produtoDocs.length; i++) {
        const produtoDocRef = produtoRefs[i];
        const produtoDoc = produtoDocs[i];
        const item = compraData.itens[i];
        const produtoData = produtoDoc.data();

        if (produtoData) { // <-- Correção aqui
          const estoqueAtual = produtoData.quantidade || 0;
          const custoAntigo = produtoData.custoUnitario || 0;

          const valorEstoqueAntigo = estoqueAtual * custoAntigo;
          const valorNovaCompra = item.quantidade * item.custoUnitario;
          const novoEstoqueTotal = estoqueAtual + item.quantidade;

          const novoCustoMedio = novoEstoqueTotal > 0
            ? (valorEstoqueAntigo + valorNovaCompra) / novoEstoqueTotal
            : item.custoUnitario;

          transaction.update(produtoDocRef, {
            quantidade: novoEstoqueTotal,
            custoUnitario: parseFloat(novoCustoMedio.toFixed(2))
          });

          const movimentacaoDocRef = doc(collection(db, "movimentacoesEstoque"));
          transaction.set(movimentacaoDocRef, {
            produtoId: item.produtoId,
            produtoNome: item.produtoNome,
            quantidade: item.quantidade,
            tipo: 'entrada',
            motivo: `Compra NF: ${compraData.notaFiscal}`,
            data: serverTimestamp(),
          });
        }
      }
    });
  } catch (error) {
    console.error("Erro ao registrar compra: ", error);
    throw error;
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
