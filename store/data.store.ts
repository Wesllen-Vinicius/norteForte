// store/data.store.ts
import { create } from 'zustand';
import { subscribeToClientes, Cliente } from '@/lib/services/clientes.services';
import { subscribeToProdutos, Produto } from '@/lib/services/produtos.services';
import { subscribeToFuncionarios, Funcionario } from '@/lib/services/funcionarios.services';
import { subscribeToCargos, Cargo } from '@/lib/services/cargos.services';
import { Unidade, subscribeToUnidades } from '@/lib/services/unidades.services';
import { Categoria, subscribeToCategorias } from '@/lib/services/categorias.services';
import { Fornecedor, subscribeToFornecedores } from '@/lib/services/fornecedores.services';
import { Abate, subscribeToAbates } from '@/lib/services/abates.services';
import { Meta, subscribeToMetas } from '@/lib/services/metas.services';
import { SystemUser, subscribeToUsers } from '@/lib/services/user.services';
import { Producao, subscribeToProducoes } from '@/lib/services/producao.services'; // Importação para Produção

interface DataState {
  clientes: Cliente[];
  produtos: Produto[];
  funcionarios: Funcionario[];
  cargos: Cargo[];
  unidades: Unidade[];
  categorias: Categoria[];
  fornecedores: Fornecedor[];
  abates: Abate[];
  producoes: Producao[]; // Adicionado estado para produções
  metas: Meta[];
  users: SystemUser[];
  isInitialized: boolean;
  initializeSubscribers: () => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  // Valores iniciais para todos os estados
  clientes: [],
  produtos: [],
  funcionarios: [],
  cargos: [],
  unidades: [],
  categorias: [],
  fornecedores: [],
  abates: [],
  producoes: [], // Valor inicial para produções
  metas: [],
  users: [],
  isInitialized: false,

  initializeSubscribers: () => {
    // Evita reinicializar os listeners
    if (get().isInitialized) return;

    console.log("Inicializando todos os listeners de dados globais...");

    // Configurando todos os listeners de uma vez
    subscribeToClientes((data) => set({ clientes: data }));
    subscribeToProdutos((data) => set({ produtos: data }));
    subscribeToFuncionarios((data) => set({ funcionarios: data }));
    subscribeToCargos((data) => set({ cargos: data }));
    subscribeToUnidades((data) => set({ unidades: data }));
    subscribeToCategorias((data) => set({ categorias: data }));
    subscribeToFornecedores((data) => set({ fornecedores: data }));
    subscribeToAbates((data) => set({ abates: data }));
    subscribeToProducoes((data) => set({ producoes: data }));
    subscribeToMetas((data) => set({ metas: data }));
    subscribeToUsers((data) => set({ users: data }));

    set({ isInitialized: true });
  },
}));
