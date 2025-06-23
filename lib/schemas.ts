// Em lib/schemas.ts

import { z } from "zod";
import { Timestamp } from "firebase/firestore";

// =================================================================
// Schema para Contas Bancárias
// =================================================================
export const contaBancariaSchema = z.object({
  id: z.string().optional(),
  nomeConta: z.string().min(3, "O nome da conta é obrigatório."),
  banco: z.string().min(2, "O nome do banco é obrigatório."),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  tipo: z.enum(["Conta Corrente", "Conta Poupança", "Caixa"]),
  saldoInicial: z.coerce.number().optional(),
  saldoAtual: z.coerce.number().optional(),
  registradoPor: z.object({
    uid: z.string(),
    nome: z.string(),
  }).optional(),
  createdAt: z.any().optional(),
});
export type ContaBancaria = z.infer<typeof contaBancariaSchema>;

// =================================================================
// Schema para Itens de Venda/Produção
// =================================================================
export const itemVendidoSchema = z.object({
  produtoId: z.string(),
  produtoNome: z.string(),
  quantidade: z.coerce.number().min(0),
  precoUnitario: z.coerce.number().min(0),
  custoUnitario: z.coerce.number().min(0),
  estoqueDisponivel: z.number().optional().default(0),
}).refine(
    (data) => data.quantidade > 0 ? data.quantidade <= data.estoqueDisponivel : true,
    (data) => ({ message: `Estoque insuficiente. Disponível: ${data.estoqueDisponivel}`, path: ["quantidade"] })
);
export type ItemVendido = z.infer<typeof itemVendidoSchema>;

export const itemProduzidoSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  produtoNome: z.string(),
  quantidade: z.coerce.number().min(0, "A quantidade deve ser um número positivo."),
  perda: z.coerce.number().min(0, "A perda não pode ser negativa.").default(0),
});
export type ItemProduzido = z.infer<typeof itemProduzidoSchema>;


// =================================================================
// Schema para Vendas
// =================================================================
export const vendaSchema = z.object({
  id: z.string().optional(),
  clienteId: z.string().min(1, "Selecione um cliente."),
  data: z.date({ required_error: "A data é obrigatória." }),
  produtos: z.array(itemVendidoSchema).min(1, "Adicione pelo menos um produto à venda."),
  valorTotal: z.coerce.number().min(0, "O valor total não pode ser negativo."),
  condicaoPagamento: z.enum(["A_VISTA", "A_PRAZO"], { required_error: "Selecione a condição." }),
  metodoPagamento: z.string({ required_error: "O método de pagamento é obrigatório." }).min(1, "O método de pagamento é obrigatório."),
  contaBancariaId: z.string().optional(),
  numeroParcelas: z.coerce.number().optional(),
  taxaCartao: z.coerce.number().optional(),
  valorFinal: z.number().optional(),
  dataVencimento: z.date().optional(),
  status: z.enum(['Paga', 'Pendente']).default('Pendente'),
  registradoPor: z.object({
    uid: z.string(),
    nome: z.string(),
  }),
  createdAt: z.any().optional(),
});
export type Venda = z.infer<typeof vendaSchema>;
export type VendaFormValues = Omit<Venda, 'id' | 'registradoPor' | 'status' | 'createdAt' | 'valorFinal'>;

// =================================================================
// Schema para Produção
// =================================================================
export const producaoSchema = z.object({
  id: z.string().optional(),
  data: z.union([z.instanceof(Timestamp), z.date()]),
  responsavelId: z.string().min(1, "Selecione um responsável."),
  abateId: z.string().min(1, "Selecione um abate para vincular."),
  lote: z.string().optional(),
  descricao: z.string().optional(),
  produtos: z.array(itemProduzidoSchema).min(1, "Adicione pelo menos um produto à produção."),
  registradoPor: z.object({
    uid: z.string(),
    nome: z.string(),
  }),
  createdAt: z.any().optional(),
});
export type Producao = Omit<z.infer<typeof producaoSchema>, 'data'> & { data: Date };


// =================================================================
// Schema para Movimentação de Estoque
// =================================================================
export const movimentacaoSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  produtoNome: z.string(),
  quantidade: z.number().positive("A quantidade deve ser maior que zero."),
  tipo: z.enum(["entrada", "saida"]),
  motivo: z.string().optional(),
  data: z.date().optional(),
});
export type Movimentacao = z.infer<typeof movimentacaoSchema>;
