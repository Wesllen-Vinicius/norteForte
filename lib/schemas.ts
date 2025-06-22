import { z } from "zod";

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
  saldoInicial: z.coerce.number().default(0),
  saldoAtual: z.coerce.number().default(0),
  registradoPor: z.object({
    uid: z.string(),
    nome: z.string(),
  }).optional(),
  createdAt: z.any().optional(),
});

export type ContaBancaria = z.infer<typeof contaBancariaSchema>;


// =================================================================
// Schema para Vendas
// =================================================================
const itemVendidoSchema = z.object({
  produtoId: z.string(),
  produtoNome: z.string(),
  quantidade: z.coerce.number().min(0, "A quantidade não pode ser negativa."),
  precoUnitario: z.coerce.number().min(0, "O preço não pode ser negativo."),
  custoUnitario: z.coerce.number().min(0),
  estoqueDisponivel: z.number().optional().default(0),
}).refine(
    (data) => {
        if (data.quantidade > 0) {
            return data.quantidade <= data.estoqueDisponivel;
        }
        return true;
    },
    (data) => ({
        message: `Estoque insuficiente. Disponível: ${data.estoqueDisponivel}`,
        path: ["quantidade"],
    })
);

const vendaBaseSchema = z.object({
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

export const formVendaSchema = vendaBaseSchema.omit({
    id: true,
    registradoPor: true,
    status: true,
    createdAt: true,
    valorFinal: true,
});

export const vendaSchema = vendaBaseSchema.refine(data => {
    if (data.condicaoPagamento === "A_PRAZO") return !!data.dataVencimento;
    return true;
}, {
    message: "A data de vencimento é obrigatória para vendas a prazo.",
    path: ["dataVencimento"],
}).refine(data => {
    if (data.condicaoPagamento === "A_PRAZO") {
        return ["Boleto/Prazo", "PIX", "Dinheiro"].includes(data.metodoPagamento);
    }
    return true;
}, {
    message: "Método de pagamento inválido para vendas a prazo.",
    path: ["metodoPagamento"],
});

export type Venda = z.infer<typeof vendaSchema>;
export type ItemVendido = z.infer<typeof itemVendidoSchema>;
export type VendaFormValues = z.infer<typeof formVendaSchema>;
