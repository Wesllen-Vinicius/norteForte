import { create } from 'zustand';
import { Unsubscribe } from 'firebase/firestore';

import {
    Cliente, Produto, Funcionario, Cargo, Unidade, Categoria, Fornecedor, Abate, Producao, Venda, Compra, Meta, SystemUser, ContaBancaria, DespesaOperacional, Movimentacao
} from '@/lib/schemas';

import { subscribeToClientes } from '@/lib/services/clientes.services';
import { subscribeToProdutos } from '@/lib/services/produtos.services';
import { subscribeToFuncionarios } from '@/lib/services/funcionarios.services';
import { subscribeToCargos } from '@/lib/services/cargos.services';
import { subscribeToUnidades } from '@/lib/services/unidades.services';
import { subscribeToCategorias } from '@/lib/services/categorias.services';
import { subscribeToFornecedores } from '@/lib/services/fornecedores.services';
import { subscribeToAbatesByDateRange } from '@/lib/services/abates.services';
import { subscribeToProducoes } from '@/lib/services/producao.services';
import { subscribeToVendas } from '@/lib/services/vendas.services';
import { subscribeToCompras } from '@/lib/services/compras.services';
import { subscribeToMetas } from '@/lib/services/metas.services';
import { subscribeToUsers } from '@/lib/services/user.services';
import { subscribeToContasBancarias } from '@/lib/services/contasBancarias.services';
import { subscribeToDespesas } from '@/lib/services/despesas.services';
import { subscribeToContasAPagar } from '@/lib/services/contasAPagar.services';
import { subscribeToMovimentacoes } from '@/lib/services/estoque.services';

interface DataState {
  clientes: Cliente[];
  produtos: Produto[];
  funcionarios: Funcionario[];
  cargos: Cargo[];
  unidades: Unidade[];
  categorias: Categoria[];
  fornecedores: Fornecedor[];
  abates: Abate[];
  producoes: Producao[];
  vendas: Venda[];
  compras: Compra[];
  metas: Meta[];
  users: SystemUser[];
  contasBancarias: ContaBancaria[];
  despesas: DespesaOperacional[];
  contasAPagar: any[];
  movimentacoes: Movimentacao[];
  isInitialized: boolean;
  unsubscribers: Unsubscribe[];
  initializeSubscribers: () => void;
  clearSubscribers: () => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  clientes: [],
  produtos: [],
  funcionarios: [],
  cargos: [],
  unidades: [],
  categorias: [],
  fornecedores: [],
  abates: [],
  producoes: [],
  vendas: [],
  compras: [],
  metas: [],
  users: [],
  contasBancarias: [],
  despesas: [],
  contasAPagar: [],
  movimentacoes: [],
  isInitialized: false,
  unsubscribers: [],

  initializeSubscribers: () => {
    if (get().isInitialized) return;

    console.log("Inicializando todos os listeners de dados globais...");

    const newUnsubscribers: Unsubscribe[] = [];

    newUnsubscribers.push(subscribeToClientes((data) => set({ clientes: data })));
    newUnsubscribers.push(subscribeToProdutos((data) => set({ produtos: data })));
    newUnsubscribers.push(subscribeToFuncionarios((data) => set({ funcionarios: data })));
    newUnsubscribers.push(subscribeToCargos((data) => set({ cargos: data })));
    newUnsubscribers.push(subscribeToUnidades((data) => set({ unidades: data })));
    newUnsubscribers.push(subscribeToCategorias((data) => set({ categorias: data })));
    newUnsubscribers.push(subscribeToFornecedores((data) => set({ fornecedores: data })));
    newUnsubscribers.push(subscribeToAbatesByDateRange(undefined, (data) => set({ abates: data })));
    newUnsubscribers.push(subscribeToProducoes((data) => set({ producoes: data })));
    newUnsubscribers.push(subscribeToVendas((data) => set({ vendas: data })));
    newUnsubscribers.push(subscribeToCompras((data) => set({ compras: data })));
    newUnsubscribers.push(subscribeToMetas((data) => set({ metas: data })));
    newUnsubscribers.push(subscribeToUsers((data) => set({ users: data })));
    newUnsubscribers.push(subscribeToContasBancarias((data) => set({ contasBancarias: data })));
    newUnsubscribers.push(subscribeToDespesas((data) => set({ despesas: data })));
    newUnsubscribers.push(subscribeToContasAPagar((data) => set({ contasAPagar: data })));
    newUnsubscribers.push(subscribeToMovimentacoes((data) => set({ movimentacoes: data })));

    set({ isInitialized: true, unsubscribers: newUnsubscribers });
  },

  clearSubscribers: () => {
    console.log("Limpando todos os listeners de dados...");
    get().unsubscribers.forEach((unsub) => unsub());
    set({ isInitialized: false, unsubscribers: [] });
  },
}));
