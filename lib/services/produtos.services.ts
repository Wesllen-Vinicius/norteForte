import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, doc, updateDoc, QuerySnapshot, DocumentData, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import {
  Produto,
  produtoSchema,
} from "@/lib/schemas";

export const getProximoCodigoProduto = async (): Promise<string> => {
    const q = query(collection(db, "produtos"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return "1";
    }

    let maxCodigo = 0;
    querySnapshot.forEach((doc) => {
        const codigo = parseInt(doc.data().codigo, 10);
        if (!isNaN(codigo) && codigo > maxCodigo) {
            maxCodigo = codigo;
        }
    });

    return (maxCodigo + 1).toString();
};


export const addProduto = async (produto: Omit<Produto, 'id' | 'unidadeNome' | 'categoriaNome' | 'createdAt' | 'status'>) => {
  try {
    const proximoCodigo = await getProximoCodigoProduto();
    const dataWithTimestamp = {
        ...produto,
        codigo: proximoCodigo,
        status: 'ativo',
        createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, "produtos"), dataWithTimestamp);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar produto: ", e);
    throw new Error("Não foi possível adicionar o produto.");
  }
};

export const subscribeToProdutos = (callback: (produtos: Produto[]) => void) => {
  const q = query(collection(db, "produtos"), where("status", "==", "ativo"));

  return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const produtos: Produto[] = [];
    querySnapshot.forEach((doc) => {
      try {
        const data = produtoSchema.parse(doc.data());
        produtos.push({ id: doc.id, ...data });
      } catch (error) {
        console.error("Erro de validação em um produto do Firestore:", doc.id, error);
      }
    });
    callback(produtos);
  });
};

export const updateProduto = async (id: string, produto: Partial<Omit<Produto, 'id' | 'unidadeNome' | 'categoriaNome' | 'createdAt' | 'status'>>) => {
  const produtoDoc = doc(db, "produtos", id);
  await updateDoc(produtoDoc, produto);
};

export const setProdutoStatus = async (id: string, status: 'ativo' | 'inativo') => {
    const produtoDoc = doc(db, "produtos", id);
    await updateDoc(produtoDoc, { status });
};
