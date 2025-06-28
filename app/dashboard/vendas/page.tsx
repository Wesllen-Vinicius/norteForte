"use client"

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm, useFieldArray, useWatch, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from 'date-fns';
import { IconPlus, IconTrash, IconChevronDown, IconChevronUp, IconAlertTriangle, IconLock, IconPencil, IconFileInvoice } from "@tabler/icons-react";
import { ColumnDef, Row } from "@tanstack/react-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/date-picker";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox } from "@/components/ui/combobox";
import { useDataStore } from "@/store/data.store";
import { useAuthStore } from "@/store/auth.store";
import { Venda, ItemVendido, vendaSchema } from "@/lib/schemas";
import { registrarVenda, updateVenda } from "@/lib/services/vendas.services";
import { z } from "zod";

const itemVendidoFormSchema = z.object({
    produtoId: z.string(),
    produtoNome: z.string(),
    quantidade: z.coerce.number().min(0, "A quantidade não pode ser negativa."),
    precoUnitario: z.coerce.number().min(0, "O preço não pode ser negativo."),
    custoUnitario: z.coerce.number().min(0),
    estoqueDisponivel: z.number(),
}).refine(
    (data) => data.quantidade > 0 ? data.quantidade <= data.estoqueDisponivel : true,
    (data) => ({ message: `Estoque insuficiente. Disponível: ${data.estoqueDisponivel}`, path: ["quantidade"] })
);

const formVendaSchema = vendaSchema.pick({
    clienteId: true, data: true, produtos: true, valorTotal: true, condicaoPagamento: true, metodoPagamento: true,
    contaBancariaId: true, numeroParcelas: true, taxaCartao: true, dataVencimento: true
}).extend({
    produtos: z.array(itemVendidoFormSchema).min(1, "Adicione pelo menos um produto à venda."),
});


type VendaFormValues = z.infer<typeof formVendaSchema>;
type VendaComDetalhes = Venda & { clienteNome?: string };

const defaultFormValues: VendaFormValues = {
    clienteId: "",
    data: new Date(),
    produtos: [],
    condicaoPagamento: "A_VISTA",
    metodoPagamento: "",
    contaBancariaId: "",
    valorTotal: 0,
    dataVencimento: undefined,
    numeroParcelas: 1,
    taxaCartao: 0,
};

const renderSubComponent = ({ row }: { row: Row<VendaComDetalhes> }) => (
    <div className="p-4 bg-muted/20 animate-in fade-in-50 zoom-in-95">
        <h4 className="font-semibold text-sm mb-2">Itens da Venda</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {row.original.produtos.map((p, i) => (
                <div key={i} className="text-xs p-2.5 border rounded-lg bg-background shadow-sm">
                    <p className="font-bold text-sm mb-1">{p.produtoNome}</p>
                    <p><strong>Quantidade:</strong> {p.quantidade}</p>
                    <p><strong>Preço Un.:</strong> R$ {p.precoUnitario.toFixed(2)}</p>
                </div>
            ))}
        </div>
    </div>
);

const ItemProdutoVenda = ({ index, control, remove, handleProdutoChange, produtosParaVendaOptions }: {
    index: number,
    control: Control<VendaFormValues>,
    remove: (i: number) => void,
    handleProdutoChange: (i: number, id: string) => void,
    produtosParaVendaOptions: { label: string, value: string }[]
}) => {
    return(
        <div className="p-3 border rounded-md bg-muted/50 space-y-2">
            <div className="grid grid-cols-[1fr_80px_120px_auto] gap-2 items-start">
                <FormField name={`produtos.${index}.produtoId`} control={control} render={({ field }) => (
                    <FormItem>
                        <Select onValueChange={(value) => handleProdutoChange(index, value)} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {produtosParaVendaOptions.map(p => (
                                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField name={`produtos.${index}.quantidade`} control={control} render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <Input
                                type="number"
                                placeholder="Qtd"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                        </FormControl>
                    </FormItem>
                )} />
                <FormField name={`produtos.${index}.precoUnitario`} control={control} render={({ field }) => ( <FormItem><FormControl><Input type="number" placeholder="Preço" {...field} readOnly className="bg-muted-foreground/20" /></FormControl><FormMessage /></FormItem> )} />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><IconTrash className="h-4 w-4 text-destructive" /></Button>
            </div>
             <FormField name={`produtos.${index}.quantidade`} control={control} render={() => <FormMessage />} />
        </div>
    )
}

const metodosPagamentoOptions = {
    vista: [
        { value: "Dinheiro", label: "Dinheiro" },
        { value: "PIX", label: "PIX" },
        { value: "Cartão de Débito", label: "Cartão de Débito" },
        { value: "Cartão de Crédito", label: "Cartão de Crédito" }
    ],
    prazo: [
        { value: "Boleto/Prazo", label: "Boleto/Prazo" },
        { value: "PIX", label: "PIX" },
        { value: "Dinheiro", label: "Dinheiro" }
    ]
};

export default function VendasPage() {
    const { produtos, clientes, vendas, unidades, contasBancarias } = useDataStore();
    const { user, role } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [valorFinalCalculado, setValorFinalCalculado] = useState(0);

    const produtosParaVenda = useMemo(() => produtos.filter(p => p.tipoProduto === 'VENDA'), [produtos]);
    const clientesOptions = useMemo(() => clientes.map(c => ({ label: c.nome, value: c.id! })), [clientes]);
    const contasBancariasOptions = useMemo(() =>
        contasBancarias.map(c => ({ label: `${c.nomeConta} (${c.banco})`, value: c.id! })),
    [contasBancarias]);

    const produtosParaVendaOptions = useMemo(() => {
        return produtos
            .filter(p => p.tipoProduto === 'VENDA')
            .map(p => {
                const unidade = unidades.find(u => u.id === p.unidadeId);
                const label = `${p.nome} (Estoque: ${p.quantidade || 0} ${unidade?.sigla || 'un'})`;
                return { label, value: p.id! };
            });
    }, [produtos, unidades]);

    const form = useForm<VendaFormValues>({
        resolver: zodResolver(formVendaSchema),
        defaultValues: defaultFormValues,
        mode: "onChange",
    });

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "produtos" });

    const watchedCliente = useWatch({ control: form.control, name: 'clienteId'});
    const watchedProdutos = useWatch({ control: form.control, name: 'produtos' });
    const condicaoPagamento = useWatch({ control: form.control, name: 'condicaoPagamento' });
    const metodoPagamento = useWatch({ control: form.control, name: 'metodoPagamento' });
    const numeroParcelas = useWatch({ control: form.control, name: 'numeroParcelas' });
    const taxaCartao = useWatch({ control: form.control, name: 'taxaCartao' });
    const valorTotal = useWatch({ control: form.control, name: 'valorTotal' });

    const isPaymentDisabled = !watchedCliente || !watchedProdutos || watchedProdutos.length === 0;

    const dependenciasFaltantes = useMemo(() => {
        const faltantes = [];
        if (!clientes || clientes.length === 0) {
            faltantes.push({ nome: "Clientes", link: "/dashboard/clientes" });
        }
        if (!produtosParaVenda || produtosParaVenda.length === 0) {
            faltantes.push({ nome: "Produtos de Venda", link: "/dashboard/produtos" });
        }
        return faltantes;
    }, [clientes, produtosParaVenda]);

    const resetForm = () => {
        form.reset(defaultFormValues);
        remove();
        setIsEditing(false);
        setEditingId(null);
    };

    const handleEdit = (venda: VendaComDetalhes) => {
        setIsEditing(true);
        setEditingId(venda.id!);
        form.reset({
            ...venda,
            data: venda.data,
            dataVencimento: venda.dataVencimento || undefined,
        });
    };

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === 'condicaoPagamento') {
                const currentMethod = form.getValues('metodoPagamento');
                const availableMethods = value.condicaoPagamento === 'A_VISTA'
                    ? metodosPagamentoOptions.vista.map(m => m.value)
                    : metodosPagamentoOptions.prazo.map(m => m.value);

                if (currentMethod && !availableMethods.includes(currentMethod)) {
                    form.setValue('metodoPagamento', '');
                }
            }
        });
        return () => subscription.unsubscribe();
    }, [form]);

    useEffect(() => {
        const total = watchedProdutos.reduce((acc: number, item: Partial<ItemVendido>) => acc + ((item.quantidade || 0) * (item.precoUnitario || 0)), 0);
        form.setValue('valorTotal', total);
    }, [watchedProdutos, form]);

    useEffect(() => {
        if (metodoPagamento === 'Cartão de Crédito' && valorTotal > 0) {
            const taxaDecimal = (taxaCartao || 0) / 100;
            const novoValorFinal = valorTotal * (1 + taxaDecimal);
            setValorFinalCalculado(novoValorFinal);
        } else {
            setValorFinalCalculado(valorTotal);
        }
    }, [valorTotal, metodoPagamento, taxaCartao]);

    const handleProdutoChange = (index: number, produtoId: string) => {
        const produto = produtosParaVenda.find(p => p.id === produtoId);
        if (produto && produto.tipoProduto === "VENDA") {
            form.setValue(`produtos.${index}.produtoId`, produtoId);
            form.setValue(`produtos.${index}.precoUnitario`, produto.precoVenda);
            form.setValue(`produtos.${index}.produtoNome`, produto.nome);
            form.setValue(`produtos.${index}.custoUnitario`, produto.custoUnitario || 0);
            form.setValue(`produtos.${index}.estoqueDisponivel`, produto.quantidade || 0);
        }
    };

    const onSubmit = async (values: VendaFormValues) => {
        if (isEditing && editingId) {
            try {
                await updateVenda(editingId, { ...values, valorFinal: valorFinalCalculado });
                toast.success("Venda atualizada com sucesso!");
                resetForm();
            } catch (error: any) {
                toast.error("Falha ao atualizar venda", { description: "Atenção: A edição não altera o estoque. Para correções de estoque, realize uma movimentação manual." });
            }
        } else {
            try {
                const cliente = clientes.find(c => c.id === values.clienteId);
                if (!cliente) throw new Error("Cliente não encontrado.");
                if (!user) throw new Error("Usuário não autenticado.");

                const dadosCompletos = { ...values, valorFinal: valorFinalCalculado, registradoPor: { uid: user.uid, nome: user.displayName || 'Usuário' } };

                await registrarVenda(dadosCompletos as any, cliente.nome);
                toast.success("Venda registrada com sucesso!");
                resetForm();
            } catch (error: any) {
                toast.error("Falha ao registrar venda", { description: error.message });
            }
        }
    };

    const handleEmitirNFe = (vendaId: string) => {
        toast.promise(
            new Promise(resolve => setTimeout(resolve, 1500)), // Simula chamada de API
            {
                loading: `Emitindo NF-e para a venda ${vendaId.slice(0,5)}...`,
                success: "NF-e emitida com sucesso! (Simulação)",
                error: "Falha ao emitir NF-e. (Simulação)",
            }
        );
    };

    const vendasEnriquecidas = useMemo(() => {
        return vendas.map(venda => ({
            ...venda,
            clienteNome: clientes.find(c => c.id === venda.clienteId)?.nome || 'N/A',
        }))
    }, [vendas, clientes]);

    const columns: ColumnDef<VendaComDetalhes>[] = [
        { id: 'expander', header: () => null, cell: ({ row }) => (<Button variant="ghost" size="icon" onClick={() => row.toggleExpanded()} className="h-8 w-8">{row.getIsExpanded() ? <IconChevronUp className="h-4 w-4" /> : <IconChevronDown className="h-4 w-4" />}</Button>) },
        { header: "Data", accessorKey: "data", cell: ({ row }) => format(row.original.data, 'dd/MM/yyyy') },
        { header: "Cliente", accessorKey: "clienteNome" },
        { header: "Registrado Por", accessorKey: "registradoPor.nome" },
        { header: "Pagamento", cell: ({ row }) => (
            <div>
                <p className="font-medium">{row.original.metodoPagamento || (row.original.condicaoPagamento === 'A_PRAZO' ? 'Boleto/Prazo' : 'N/A')}</p>
                {row.original.numeroParcelas && row.original.numeroParcelas > 1 && <p className="text-xs text-muted-foreground">{row.original.numeroParcelas}x</p>}
            </div>
        ) },
        { header: "Status Pgto.", accessorKey: "status", cell: ({ row }) => <Badge variant={row.original.status === 'Paga' ? 'default' : 'destructive'}>{row.original.status}</Badge> },
        { header: "Status NF-e", accessorKey: "nfe.status", cell: ({ row }) => {
            const nfeStatus = row.original.nfe?.status;
            if(!nfeStatus) return <Badge variant="secondary">Não emitida</Badge>
            return <Badge variant={nfeStatus === 'emitida' ? 'default' : 'destructive'}>{nfeStatus}</Badge>
        }},
        { header: "Valor Final", accessorKey: "valorFinal", cell: ({ row }) => `R$ ${(row.original.valorFinal || row.original.valorTotal).toFixed(2)}` },
        {
            id: "actions",
            cell: ({ row }) => {
                const venda = row.original;
                return (
                    <div className="text-right space-x-1">
                        <Button variant="outline" size="icon" onClick={() => handleEmitirNFe(venda.id!)}>
                            <IconFileInvoice className="h-4 w-4" />
                        </Button>
                        {role === 'ADMINISTRADOR' && (
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(venda)}>
                                <IconPencil className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            }
        }
    ];

    const formContent = (
        isLoading ? (
            <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        ) :
        dependenciasFaltantes.length > 0 ? (
            <Alert variant="destructive">
                <IconAlertTriangle className="h-4 w-4" />
                <AlertTitle>Cadastro de pré-requisitos necessário</AlertTitle>
                <AlertDescription>
                    Para registrar uma venda, você precisa primeiro cadastrar:
                    <ul className="list-disc pl-5 mt-2">
                        {dependenciasFaltantes.map(dep => (
                            <li key={dep.nome}>
                                <Button variant="link" asChild className="p-0 h-auto font-bold"><Link href={dep.link}>{dep.nome}</Link></Button>
                            </li>
                        ))}
                    </ul>
                </AlertDescription>
            </Alert>
        ) : (
             <Form {...form}>
                <fieldset disabled={role !== 'ADMINISTRADOR'} className="space-y-6 disabled:opacity-70 disabled:pointer-events-none">
                    <form onSubmit={form.handleSubmit(onSubmit)} id="venda-form">
                        <Card className="mb-6">
                            <CardHeader><CardTitle>{isEditing ? 'Editar Venda' : 'Dados da Venda'}</CardTitle>{!isEditing && (<CardDescription>Selecione o cliente, a data e os produtos vendidos.</CardDescription>)}</CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField name="clienteId" control={form.control} render={({ field }) => (<FormItem><FormLabel>Cliente</FormLabel><Combobox options={clientesOptions} value={field.value} onChange={field.onChange} placeholder="Selecione um cliente" searchPlaceholder="Buscar cliente..." /></FormItem>)} />
                                    <FormField name="data" control={form.control} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data da Venda</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <Separator />
                                <div className="space-y-3">
                                    <FormLabel>Produtos Vendidos</FormLabel>
                                    {fields.map((field, index) => (<ItemProdutoVenda key={field.id} index={index} control={form.control} remove={remove} handleProdutoChange={handleProdutoChange} produtosParaVendaOptions={produtosParaVendaOptions} />))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ produtoId: "", quantidade: 1, precoUnitario: 0, produtoNome: "", custoUnitario: 0, estoqueDisponivel: 0, })}><IconPlus className="mr-2 h-4 w-4" /> Adicionar Produto</Button>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Detalhes do Pagamento</CardTitle></CardHeader>
                            <CardContent className="relative space-y-4">
                                <fieldset disabled={isPaymentDisabled} className="space-y-4 disabled:opacity-50">
                                    {isPaymentDisabled && (<div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center rounded-lg"><div className="flex items-center gap-2 text-muted-foreground font-medium"><IconLock className="h-5 w-5" /><span>Selecione cliente e produtos para continuar</span></div></div>)}
                                    <div className="grid md:grid-cols-2 gap-4 items-start">
                                        <FormField name="condicaoPagamento" control={form.control} render={({ field }) => (<FormItem><FormLabel>Condição</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="A_VISTA">À Vista</SelectItem><SelectItem value="A_PRAZO">A Prazo</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                        {condicaoPagamento === "A_VISTA" ? (<FormField name="metodoPagamento" control={form.control} render={({ field }) => (<FormItem><FormLabel>Método de Pagamento</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{metodosPagamentoOptions.vista.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />) : (<div className="grid grid-cols-2 gap-4"><FormField name="metodoPagamento" control={form.control} render={({ field }) => (<FormItem><FormLabel>Método de Pagamento</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{metodosPagamentoOptions.prazo.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} /><FormField name="dataVencimento" control={form.control} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Vencimento</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} /></div>)}
                                    </div>
                                    <FormField name="contaBancariaId" control={form.control} render={({ field }) => (<FormItem><FormLabel>Conta de Destino (Crédito)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione a conta..." /></SelectTrigger></FormControl><SelectContent>{contasBancariasOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select><FormDescription>Selecione onde o valor da venda será creditado (apenas para vendas à vista).</FormDescription><FormMessage /></FormItem>)} />
                                    {metodoPagamento === "Cartão de Crédito" && (<div className="grid md:grid-cols-3 gap-4 items-end pt-4"><FormField name="taxaCartao" control={form.control} render={({ field }) => (<FormItem><FormLabel>Taxa da Máquina (%)</FormLabel><FormControl><Input type="number" placeholder="Ex: 2.5" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} /><FormField name="numeroParcelas" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nº de Parcelas</FormLabel><Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map((p) => (<SelectItem key={p} value={String(p)}>{p}x</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} /><div className="text-right"><p className="text-sm text-muted-foreground">Valor da Parcela</p><p className="text-lg font-bold">R$ {(valorFinalCalculado / (numeroParcelas || 1)).toFixed(2)}</p></div></div>)}
                                    <div className="text-right mt-4 pt-4 border-t"><p className="text-sm text-muted-foreground">Valor Final da Venda</p><p className="text-2xl font-bold">R$ {valorFinalCalculado.toFixed(2).replace(".", ",")}</p></div>
                                </fieldset>
                            </CardContent>
                        </Card>
                        <div className="flex justify-end pt-4 gap-2">
                            {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                            <Button type="submit" form="venda-form" size="lg" disabled={isPaymentDisabled}>{isEditing ? 'Salvar Alterações' : 'Finalizar Venda'}</Button>
                        </div>
                    </form>
                </fieldset>
                 {role !== 'ADMINISTRADOR' && (
                    <Alert variant="destructive" className="mt-6">
                        <IconLock className="h-4 w-4" />
                        <AlertTitle>Acesso Restrito</AlertTitle>
                        <AlertDescription>
                            Apenas administradores podem registrar ou editar vendas.
                        </AlertDescription>
                    </Alert>
                )}
            </Form>
        )
    );

    return (
        <div className="container mx-auto py-6 px-4 md:px-8">
            <div className="grid grid-cols-1 xl:grid-cols-[2fr_3fr] gap-6 xl:gap-8 items-start">
                <div className="space-y-6">{formContent}</div>
                <Card className="h-full flex flex-col">
                    <CardHeader className="pb-4"><CardTitle className="text-lg">Histórico de Vendas</CardTitle></CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-4">
                        {isLoading ? (<div className="space-y-2"><Skeleton className="h-10 w-full" />{[...Array(5)].map((_, i) => (<Skeleton key={i} className="h-10 w-full" />))}</div>)
                        : (<GenericTable columns={columns} data={vendasEnriquecidas} filterPlaceholder="Pesquisar por cliente..." filterColumnId="clienteNome" renderSubComponent={renderSubComponent} />)}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
