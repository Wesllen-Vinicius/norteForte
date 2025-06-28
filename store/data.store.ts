import { create } from 'zustand';

// Importa todos os tipos e schemas do local centralizado
import {
    Cliente,
    Produto,
    Funcionario,
    Cargo,
    Unidade,
    Categoria,
    Fornecedor,
    Abate,
    Producao,
    Venda,
    Compra,
    Meta,
    SystemUser,
    ContaBancaria,
    DespesaOperacional // Adicionado o tipo de Despesa
} from '@/lib/schemas';

// Importa apenas as funções de seus respectivos serviços
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
  isInitialized: boolean;
  contasAPagar: any[];
  initializeSubscribers: () => void;
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
  isInitialized: false,

  initializeSubscribers: () => {
    if (get().isInitialized) return;

    console.log("Inicializando todos os listeners de dados globais...");

    subscribeToClientes((data: Cliente[]) => set({ clientes: data }));
    subscribeToProdutos((data: Produto[]) => set({ produtos: data }));
    subscribeToFuncionarios((data: Funcionario[]) => set({ funcionarios: data }));
    subscribeToCargos((data: Cargo[]) => set({ cargos: data }));
    subscribeToUnidades((data: Unidade[]) => set({ unidades: data }));
    subscribeToCategorias((data: Categoria[]) => set({ categorias: data }));
    subscribeToFornecedores((data: Fornecedor[]) => set({ fornecedores: data }));
    subscribeToAbatesByDateRange(undefined, (data: Abate[]) => set({ abates: data }));
    subscribeToProducoes((data: Producao[]) => set({ producoes: data }));
    subscribeToVendas((data: Venda[]) => set({ vendas: data }));
    subscribeToCompras((data: Compra[]) => set({ compras: data }));
    subscribeToMetas((data: Meta[]) => set({ metas: data }));
    subscribeToUsers((data: SystemUser[]) => set({ users: data }));
    subscribeToContasBancarias((data: ContaBancaria[]) => set({ contasBancarias: data }));
    subscribeToDespesas((data: DespesaOperacional[]) => set({ despesas: data }));
    subscribeToContasAPagar((data) => set({ contasAPagar: data }));
    set({ isInitialized: true });
  },
}));
