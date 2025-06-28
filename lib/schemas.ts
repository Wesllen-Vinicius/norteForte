import { z } from "zod";
import { Timestamp } from "firebase/firestore";

// =================================================================
// Schemas Base e de Autenticação
// =================================================================
export const loginSchema = z.object({
    email: z.string().email("Por favor, insira um e-mail válido."),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const userSchema = z.object({
  uid: z.string(),
  displayName: z.string().min(1, "O nome de exibição é obrigatório."),
  email: z.string().email(),
  role: z.enum(['ADMINISTRADOR', 'USUARIO']),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres.").optional().or(z.literal('')),
  status: z.enum(['ativo', 'inativo']).default('ativo').optional(),
});
export type SystemUser = z.infer<typeof userSchema>;


// =================================================================
// Schemas de Cadastros Principais (com campos fiscais)
// =================================================================

export const enderecoSchema = z.object({
    logradouro: z.string().min(1, "O logradouro é obrigatório."),
    numero: z.string().min(1, "O número é obrigatório."),
    bairro: z.string().min(1, "O bairro é obrigatório."),
    cidade: z.string().min(1, "A cidade é obrigatória."),
    uf: z.string().length(2, "UF deve ter 2 caracteres."),
    cep: z.string().min(8, "O CEP é obrigatório."),
    complemento: z.string().optional(),
});

export const clienteSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  tipoPessoa: z.enum(["fisica", "juridica"], { required_error: "Selecione o tipo de pessoa." }),
  documento: z.string().min(11, "O CPF/CNPJ é obrigatório."),
  inscricaoEstadual: z.string().optional().or(z.literal("")),
  telefone: z.string().min(10, "O telefone é obrigatório."),
  email: z.string().email("O e-mail é obrigatório e deve ser válido."),
  endereco: enderecoSchema, // Corrigido para usar o schema aninhado
  createdAt: z.any().optional(),
  status: z.enum(['ativo', 'inativo']).default('ativo').optional(),
});
export type Cliente = z.infer<typeof clienteSchema>;

const dadosBancariosSchema = z.object({
  banco: z.string().min(1, "O nome do banco é obrigatório."),
  agencia: z.string().min(1, "A agência é obrigatória."),
  conta: z.string().min(1, "A conta é obrigatória."),
  pix: z.string().optional().or(z.literal("")),
});

export const fornecedorSchema = z.object({
  id: z.string().optional(),
  razaoSocial: z.string().min(3, "A Razão Social é obrigatória."),
  cnpj: z.string().length(18, "O CNPJ deve ter 14 dígitos."),
  contato: z.string().min(10, "O telefone de contato é obrigatório."),
  endereco: enderecoSchema, // Corrigido para usar o schema aninhado
  dadosBancarios: dadosBancariosSchema,
  createdAt: z.any().optional(),
  status: z.enum(['ativo', 'inativo']).default('ativo').optional(),
});
export type Fornecedor = z.infer<typeof fornecedorSchema>;

export const cargoSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(3, "O nome do cargo deve ter pelo menos 3 caracteres."),
  createdAt: z.any().optional(),
  status: z.enum(['ativo', 'inativo']).default('ativo').optional(),
});
export type Cargo = z.infer<typeof cargoSchema>;

export const funcionarioSchema = z.object({
  id: z.string().optional(),
  razaoSocial: z.string().min(3, "A Razão Social é obrigatória."),
  cnpj: z.string().length(18, "O CNPJ deve ter 14 dígitos."),
  nomeCompleto: z.string().min(3, "O nome completo é obrigatório."),
  cpf: z.string().length(14, "O CPF deve ter 11 dígitos."),
  contato: z.string().min(10, "O telefone de contato é obrigatório."),
  cargoId: z.string({ required_error: "O cargo é obrigatório." }).min(1, "O cargo é obrigatório."),
  banco: z.string().min(1, "O banco é obrigatório."),
  agencia: z.string().min(1, "A agência é obrigatória."),
  conta: z.string().min(1, "A conta é obrigatória."),
  createdAt: z.any().optional(),
  status: z.enum(['ativo', 'inativo']).default('ativo').optional(),
});
export type Funcionario = z.infer<typeof funcionarioSchema> & { cargoNome?: string };

export const unidadeSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, 'O nome da unidade é obrigatório.'),
  sigla: z.string().min(1, 'A sigla é obrigatória.').max(10, 'A sigla deve ter no máximo 10 caracteres.'),
  createdAt: z.any().optional(),
  status: z.enum(['ativo', 'inativo']).default('ativo').optional(),
});
export type Unidade = z.infer<typeof unidadeSchema>;

export const categoriaSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, 'O nome da categoria é obrigatório.'),
  createdAt: z.any().optional(),
  status: z.enum(['ativo', 'inativo']).default('ativo').optional(),
});
export type Categoria = z.infer<typeof categoriaSchema>;

const baseProdutoSchema = z.object({
  id: z.string().optional(),
  quantidade: z.number().default(0).optional(),
  createdAt: z.any().optional(),
  status: z.enum(['ativo', 'inativo']).default('ativo').optional(),
});

export const produtoVendaSchema = baseProdutoSchema.extend({
  tipoProduto: z.literal("VENDA"),
  nome: z.string().min(3, "A descrição do produto é obrigatória."),
  unidadeId: z.string({ required_error: "Selecione uma unidade." }).min(1, "Selecione uma unidade."),
  precoVenda: z.coerce.number().positive("O preço de venda deve ser positivo."),
  custoUnitario: z.coerce.number().min(0),
  sku: z.string().optional().or(z.literal("")),
  ncm: z.string().min(8, "NCM é obrigatório e deve ter 8 dígitos.").max(8),
  cfop: z.string().min(4, "CFOP é obrigatório e deve ter 4 dígitos.").max(4),
  cest: z.string().optional().or(z.literal("")),
});

export const produtoUsoInternoSchema = baseProdutoSchema.extend({
  tipoProduto: z.literal("USO_INTERNO"),
  nome: z.string().min(3, "A descrição do item é obrigatória."),
  categoriaId: z.string({ required_error: "Selecione uma categoria." }).min(1, "Selecione uma categoria."),
  custoUnitario: z.coerce.number().positive("O preço de custo deve ser positivo."),
});

export const produtoMateriaPrimaSchema = baseProdutoSchema.extend({
  tipoProduto: z.literal("MATERIA_PRIMA"),
  nome: z.string().min(3, "O nome da matéria-prima é obrigatório."),
  unidadeId: z.string({ required_error: "Selecione uma unidade." }),
  custoUnitario: z.coerce.number().min(0, "O custo não pode ser negativo."),
});

export const produtoSchema = z.discriminatedUnion("tipoProduto", [
  produtoVendaSchema,
  produtoUsoInternoSchema,
  produtoMateriaPrimaSchema,
]);

export type Produto = z.infer<typeof produtoSchema> & { unidadeNome?: string; categoriaNome?: string };
export type ProdutoVenda = z.infer<typeof produtoVendaSchema>;
export type ProdutoUsoInterno = z.infer<typeof produtoUsoInternoSchema>;
export type ProdutoMateriaPrima = z.infer<typeof produtoMateriaPrimaSchema>;

export const metaSchema = z.object({
  id: z.string().optional(),
  produtoId: z.string({ required_error: "Selecione um produto." }).min(1, "Selecione um produto."),
  metaPorAnimal: z.coerce.number().positive("A meta deve ser um número positivo."),
  createdAt: z.any().optional(),
  status: z.enum(['ativo', 'inativo']).default('ativo').optional(),
});
export type Meta = z.infer<typeof metaSchema> & { produtoNome?: string, unidade?: string };

// =================================================================
// Schemas de Transações e Operações
// =================================================================

const itemCompradoSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  produtoNome: z.string(),
  quantidade: z.coerce.number().positive("A quantidade deve ser positiva."),
  custoUnitario: z.coerce.number().min(0, "O custo não pode ser negativo."),
});

export const compraSchema = z.object({
  id: z.string().optional(),
  fornecedorId: z.string().min(1, "Selecione um fornecedor."),
  notaFiscal: z.string().min(1, "O número da nota fiscal é obrigatório."),
  data: z.date({ required_error: "A data é obrigatória." }),
  itens: z.array(itemCompradoSchema).min(1, "Adicione pelo menos um item."),
  valorTotal: z.coerce.number(),
  contaBancariaId: z.string().min(1, "A conta de origem é obrigatória."),

  condicaoPagamento: z.enum(['A_VISTA', 'A_PRAZO'], { required_error: "Selecione a condição." }),
  numeroParcelas: z.coerce.number().min(1, "Pelo menos uma parcela é necessária.").optional(),
  dataPrimeiroVencimento: z.date().optional(),

  createdAt: z.any().optional(),
  status: z.enum(['ativo', 'inativo']).default('ativo').optional(),
}).refine((data) => {
    if (data.condicaoPagamento === 'A_PRAZO') {
        return !!data.numeroParcelas && !!data.dataPrimeiroVencimento;
    }
    return true;
}, {
    message: "Para pagamentos a prazo, o número de parcelas e a data do primeiro vencimento são obrigatórios.",
    path: ["numeroParcelas"],
});

export type Compra = z.infer<typeof compraSchema>;

export const abateSchema = z.object({
  id: z.string().optional(),
  data: z.date({ required_error: "A data é obrigatória." }),
  total: z.coerce.number().positive("O total de animais deve ser maior que zero."),
  condenado: z.coerce.number().min(0, "A quantidade de condenados não pode ser negativa."),
  responsavelId: z.string().min(1, "O responsável pelo abate é obrigatório."),
  compraId: z.string().min(1, "É obrigatório vincular o abate a uma compra."),
  registradoPor: z.object({
    uid: z.string(),
    nome: z.string(),
    role: z.enum(['ADMINISTRADOR', 'USUARIO']).optional(),
  }),
  createdAt: z.any().optional(),
  status: z.enum(['ativo', 'inativo']).default('ativo').optional(),
});
export type Abate = z.infer<typeof abateSchema>;

export const itemProduzidoSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  produtoNome: z.string(),
  quantidade: z.coerce.number().min(0, "A quantidade deve ser um número positivo."),
  perda: z.coerce.number().min(0, "A perda não pode ser negativa."),
});
export type ItemProduzido = z.infer<typeof itemProduzidoSchema>;

export const producaoSchema = z.object({
  id: z.string().optional(),
  data: z.date({ required_error: "A data é obrigatória." }),
  responsavelId: z.string().min(1, "Selecione um responsável."),
  abateId: z.string().min(1, "Selecione um abate para vincular."),
  lote: z.string().optional(),
  descricao: z.string().optional(),
  produtos: z.array(itemProduzidoSchema).min(1, "Adicione pelo menos um produto à produção."),
  registradoPor: z.object({
    uid: z.string(),
    nome: z.string(),
    role: z.enum(['ADMINISTRADOR', 'USUARIO']).optional(),
  }),
  createdAt: z.any().optional(),
  status: z.enum(['ativo', 'inativo']).default('ativo').optional(),
});
export type Producao = z.infer<typeof producaoSchema>;

export const producaoFormSchema = producaoSchema.pick({
    data: true,
    responsavelId: true,
    abateId: true,
    lote: true,
    descricao: true,
    produtos: true,
});
export type ProducaoFormValues = z.infer<typeof producaoFormSchema>;

export const itemVendidoSchema = z.object({
  produtoId: z.string(),
  produtoNome: z.string(),
  quantidade: z.coerce.number().min(0),
  precoUnitario: z.coerce.number().min(0),
  custoUnitario: z.coerce.number().min(0),
});
export type ItemVendido = z.infer<typeof itemVendidoSchema>;

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
  nfe: z.object({
    id: z.string().optional(),
    status: z.string().optional(),
    url: z.string().optional(),
  }).optional(),
});
export type Venda = z.infer<typeof vendaSchema>;

// =================================================================
// Schemas Financeiros e de Configuração
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
  status: z.enum(['ativa', 'inativa']).default('ativa').optional(),
});
export type ContaBancaria = z.infer<typeof contaBancariaSchema>;

export const contaAReceberSchema = z.object({
  id: z.string(),
  vendaId: z.string(),
  clienteId: z.string(),
  clienteNome: z.string(),
  valor: z.number(),
  dataEmissao: z.any(),
  dataVencimento: z.any(),
  status: z.enum(['Pendente', 'Recebida']),
});
export type ContaAReceber = z.infer<typeof contaAReceberSchema>;

export const despesaOperacionalSchema = z.object({
    id: z.string().optional(),
    descricao: z.string().min(3, "A descrição é obrigatória."),
    valor: z.coerce.number().positive("O valor deve ser positivo."),
    dataVencimento: z.date({ required_error: "A data de vencimento é obrigatória." }),
    categoria: z.string().min(3, "A categoria é obrigatória."),
    contaBancariaId: z.string().min(1, "Selecione a conta para débito."),
    status: z.enum(['Pendente', 'Paga']).default('Pendente'),
    createdAt: z.any().optional(),
});
export type DespesaOperacional = z.infer<typeof despesaOperacionalSchema>;


export const companyInfoSchema = z.object({
  razaoSocial: z.string().min(3, "A Razão Social é obrigatória."),
  nomeFantasia: z.string().min(3, "O nome fantasia é obrigatório."),
  cnpj: z.string().length(18, "O CNPJ deve ter 14 dígitos."),
  inscricaoEstadual: z.string().min(1, "A Inscrição Estadual é obrigatória."),
  endereco: enderecoSchema,
  telefone: z.string().min(10, "O telefone é obrigatório."),
  email: z.string().email("Insira um e-mail válido."),
});
export type CompanyInfo = z.infer<typeof companyInfoSchema>;
