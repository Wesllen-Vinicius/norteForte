import { z } from "zod";

// =================================================================
// Schemas de Itens (Reutilizados em Vendas, Produção, etc.)
// =================================================================

export const itemVendidoSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  produtoNome: z.string(),
  quantidade: z.coerce.number().positive("A quantidade deve ser positiva."),
  precoUnitario: z.coerce.number().positive("O preço deve ser positivo."),
  custoUnitario: z.coerce.number().min(0),
});

// =================================================================
// Schema Base para evitar problemas com .omit em schemas com .refine
// =================================================================

const vendaBaseSchema = z.object({
  id: z.string().optional(),
  clienteId: z.string().min(1, "Selecione um cliente."),
  data: z.date({ required_error: "A data é obrigatória." }),
  produtos: z.array(itemVendidoSchema).min(1, "Adicione pelo menos um produto à venda."),
  valorTotal: z.coerce.number().min(0, "O valor total não pode ser negativo."),
  condicaoPagamento: z.enum(["A_VISTA", "A_PRAZO"], { required_error: "Selecione a condição." }),
  dataVencimento: z.date().optional(),
  status: z.enum(['Paga', 'Pendente']).default('Pendente'),
  registradoPor: z.object({
    uid: z.string(),
    nome: z.string(),
  }),
  createdAt: z.any().optional(),
});

// =================================================================
// Schemas Finais com Refinamentos
// =================================================================

export const vendaSchema = vendaBaseSchema.refine(data => {
    if (data.condicaoPagamento === "A_PRAZO") return !!data.dataVencimento;
    return true;
}, {
    message: "A data de vencimento é obrigatória para vendas a prazo.",
    path: ["dataVencimento"],
});

export const formVendaSchema = vendaBaseSchema.omit({
    id: true,
    registradoPor: true,
    status: true,
    createdAt: true
});

export const contaAReceberSchema = z.object({
  id: z.string(),
  vendaId: z.string(),
  clienteId: z.string(),
  valor: z.number(),
  dataEmissao: z.any(),
  dataVencimento: z.any().optional(),
  status: z.enum(['Pendente', 'Recebida']),
});


// =================================================================
// Tipos Inferidos dos Schemas
// =================================================================

export type Venda = z.infer<typeof vendaSchema>;
export type ContaAReceber = z.infer<typeof contaAReceberSchema>;
export type ItemVendido = z.infer<typeof itemVendidoSchema>;
export type VendaFormValues = z.infer<typeof formSchema>;
