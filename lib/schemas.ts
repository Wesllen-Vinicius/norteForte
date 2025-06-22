import { z } from "zod";

// =================================================================
// Schema Base para Venda (para uso interno e para evitar erro do .omit)
// =================================================================

const vendaBaseSchema = z.object({
  id: z.string().optional(),
  clienteId: z.string().min(1, "Selecione um cliente."),
  data: z.date({ required_error: "A data é obrigatória." }),
  produtos: z.array(z.object({
    produtoId: z.string().min(1, "Selecione um produto."),
    produtoNome: z.string(),
    quantidade: z.coerce.number().positive("A quantidade deve ser positiva."),
    precoUnitario: z.coerce.number().positive("O preço deve ser positivo."),
    custoUnitario: z.coerce.number().min(0),
  })).min(1, "Adicione pelo menos um produto à venda."),
  valorTotal: z.coerce.number().min(0, "O valor total não pode ser negativo."),
  condicaoPagamento: z.enum(["A_VISTA", "A_PRAZO"], { required_error: "Selecione a condição." }),
  metodoPagamento: z.string().optional(),
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

// =================================================================
// Schema para o Formulário (criado a partir do schema base ANTES do .refine)
// =================================================================

export const formVendaSchema = vendaBaseSchema.omit({
    id: true,
    registradoPor: true,
    status: true,
    createdAt: true,
    valorFinal: true, // valorFinal é sempre calculado dinamicamente
});

// =================================================================
// Schema Final com Validação (para salvar no banco)
// =================================================================

export const vendaSchema = vendaBaseSchema.refine(data => {
    if (data.condicaoPagamento === "A_PRAZO") return !!data.dataVencimento;
    return true;
}, {
    message: "A data de vencimento é obrigatória para vendas a prazo.",
    path: ["dataVencimento"],
}).refine(data => {
    if (data.condicaoPagamento === "A_VISTA") return !!data.metodoPagamento && data.metodoPagamento.length > 0;
    return true;
}, {
    message: "O método de pagamento é obrigatório para vendas à vista.",
    path: ["metodoPagamento"],
});


// =================================================================
// Tipos Inferidos
// =================================================================

export type Venda = z.infer<typeof vendaSchema>;
export type ItemVendido = z.infer<typeof vendaBaseSchema.shape.produtos.element>;
export type VendaFormValues = z.infer<typeof formVendaSchema>;
