"use client"

import { useEffect, useMemo, useState, useCallback, ReactElement } from "react";
import Link from "next/link";
import { useForm, useFieldArray, useWatch, Control, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { IconPlus, IconTrash, IconLock, IconPencil, IconFileInvoice, IconRefresh, IconAlertTriangle, IconDotsVertical } from "@tabler/icons-react";
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
import { Venda, ItemVendido, vendaSchema, Produto } from "@/lib/schemas";
import { registrarVenda, updateVenda } from "@/lib/services/vendas.services";
import { emitirNFe } from "@/lib/services/nfe.services";
import { getCompanyInfo } from "@/lib/services/settings.services";
import z from "zod";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
    dataVencimento: new Date(),
    numeroParcelas: 1,
    taxaCartao: 0,
};

// --- FUNÇÃO ADICIONADA ---
const getStatusInfo = (status: string | undefined): { text: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" } => {
    switch (status) {
        case 'autorizado': return { text: 'Autorizada', variant: 'success' };
        case 'processando_autorizacao': return { text: 'Processando', variant: 'warning' };
        case 'cancelado': return { text: 'Cancelada', variant: 'outline' };
        case 'erro_autorizacao': return { text: 'Erro', variant: 'destructive' };
        case 'erro_cancelamento': return { text: 'Erro ao Cancelar', variant: 'destructive' };
        default: return { text: status || 'Não Emitida', variant: 'secondary' };
    }
};

const renderSubComponent = ({ row }: { row: Row<VendaComDetalhes> }):ReactElement => {
    return (
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
};

const ItemProdutoVenda = ({ index, control, remove, handleProdutoChange, produtosParaVendaOptions }: {
    index: number, control: Control<VendaFormValues>, remove: (i: number) => void,
    handleProdutoChange: (i: number, id: string) => void, produtosParaVendaOptions: { label: string, value: string }[]
}) => {
    return(
        <div className="p-3 border rounded-md bg-muted/50 space-y-2">
            <div className="grid grid-cols-[1fr_80px_120px_auto] gap-2 items-start">
                <FormField name={`produtos.${index}.produtoId`} control={control} render={({ field }) => ( <FormItem><Select onValueChange={(value) => {field.onChange(value); handleProdutoChange(index, value)}} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger></FormControl><SelectContent>{produtosParaVendaOptions.map(p => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                <FormField name={`produtos.${index}.quantidade`} control={control} render={({ field }) => ( <FormItem><FormControl><Input type="number" placeholder="Qtd" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl></FormItem> )}/>
                <FormField name={`produtos.${index}.precoUnitario`} control={control} render={({ field }) => ( <FormItem><FormControl><Input type="number" placeholder="Preço" {...field} readOnly className="bg-muted-foreground/20" /></FormControl><FormMessage /></FormItem> )} />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><IconTrash className="h-4 w-4 text-destructive" /></Button>
            </div>
             <FormField name={`produtos.${index}.quantidade`} control={control} render={() => <FormMessage />} />
        </div>
    )
}

const metodosPagamentoOptions = {
    vista: [ { value: "Dinheiro", label: "Dinheiro" }, { value: "PIX", label: "PIX" }, { value: "Cartão de Débito", label: "Cartão de Débito" }, { value: "Cartão de Crédito", label: "Cartão de Crédito" } ],
    prazo: [ { value: "Boleto/Prazo", label: "Boleto/Prazo" }, { value: "PIX", label: "PIX" }, { value: "Dinheiro", label: "Dinheiro" } ]
};

export default function VendasPage() {
    const { produtos, clientes, vendas, unidades, contasBancarias } = useDataStore();
    const { user, role } = useAuthStore();
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [valorFinalCalculado, setValorFinalCalculado] = useState(0);

    const form = useForm<VendaFormValues>({ resolver: zodResolver(formVendaSchema), defaultValues: defaultFormValues, mode: "onChange" });
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "produtos" });

    const condicaoPagamento = useWatch({ control: form.control, name: 'condicaoPagamento' });
    const metodoPagamento = useWatch({ control: form.control, name: 'metodoPagamento' });
    const valorTotal = useWatch({ control: form.control, name: 'valorTotal' });
    const taxaCartao = useWatch({ control: form.control, name: 'taxaCartao' });
    const numeroParcelas = useWatch({ control: form.control, name: 'numeroParcelas' });

    const produtosParaVendaOptions = useMemo(() => produtos.filter(p => p.tipoProduto === 'VENDA').map(p => ({ label: `${p.nome} (Estoque: ${p.quantidade || 0} ${unidades.find(u => u.id === p.unidadeId)?.sigla || 'un'})`, value: p.id! })), [produtos, unidades]);
    const clientesOptions = useMemo(() => clientes.map(c => ({ label: c.nome, value: c.id! })), [clientes]);
    const contasBancariasOptions = useMemo(() => contasBancarias.map(c => ({ label: `${c.nomeConta} (${c.banco})`, value: c.id! })), [contasBancarias]);

    const dependenciasFaltantes = useMemo(() => {
        const faltantes = [];
        if (!clientes || clientes.length === 0) faltantes.push({ nome: "Clientes", link: "/dashboard/clientes" });
        if (produtos.filter(p => p.tipoProduto === 'VENDA').length === 0) faltantes.push({ nome: "Produtos de Venda", link: "/dashboard/produtos" });
        return faltantes;
    }, [clientes, produtos]);

    useEffect(() => {
        const total = form.getValues('produtos').reduce((acc, item) => acc + ((item.quantidade || 0) * (item.precoUnitario || 0)), 0);
        form.setValue('valorTotal', total);
    }, [form, form.watch('produtos')]);

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
        const produto = produtos.find(p => p.id === produtoId);
        if (produto?.tipoProduto === "VENDA") {
            form.setValue(`produtos.${index}`, {
                produtoId,
                produtoNome: produto.nome,
                precoUnitario: produto.precoVenda,
                custoUnitario: produto.custoUnitario || 0,
                estoqueDisponivel: produto.quantidade || 0,
                quantidade: 1
            });
        }
    };

    const handleEdit = (venda: VendaComDetalhes) => {
        setIsEditing(true);
        setEditingId(venda.id!);
        form.reset({
            ...venda,
            data: venda.data,
            dataVencimento: venda.dataVencimento || undefined,
            produtos: venda.produtos.map(p => ({
                ...p,
                estoqueDisponivel: produtos.find(prod => prod.id === p.produtoId)?.quantidade || 0
            }))
        });
        setIsFormVisible(true);
    };

    const handleAddNew = () => {
        form.reset(defaultFormValues);
        setIsEditing(false);
        setEditingId(null);
        setIsFormVisible(true);
    };

    const onSubmit: SubmitHandler<VendaFormValues> = async (values) => {
        const toastId = toast.loading(isEditing ? "Atualizando venda..." : "Registrando venda...");
        try {
            if (isEditing && editingId) {
                await updateVenda(editingId, { ...values, valorFinal: valorFinalCalculado });
                toast.success("Venda atualizada com sucesso!", { id: toastId });
            } else {
                const cliente = clientes.find(c => c.id === values.clienteId);
                if (!cliente) throw new Error("Cliente não encontrado.");
                if (!user) throw new Error("Usuário não autenticado.");
                const dadosCompletos = { ...values, valorFinal: valorFinalCalculado, registradoPor: { uid: user.uid, nome: user.displayName || 'Usuário' } };
                await registrarVenda(dadosCompletos as any, cliente.nome);
                toast.success("Venda registrada com sucesso!", { id: toastId });
            }
            setIsFormVisible(false);
            form.reset(defaultFormValues);
        } catch (error: any) {
            toast.error(error.message || "Falha ao salvar a venda.", { id: toastId });
        }
    };

    const handleEmitirNFe = async (venda: VendaComDetalhes) => {
        const cliente = clientes.find(c => c.id === venda.clienteId);
        if (!cliente) { toast.error("Cliente da venda não encontrado."); return; }
        const empresaInfo = await getCompanyInfo();
        if (!empresaInfo) { toast.error("Informações da empresa não configuradas.", { description: "Vá para Configurações > Empresa para preencher os dados." }); return; }
        const toastId = toast.loading("Enviando dados para a Sefaz...");
        try {
            const resultado = await emitirNFe(venda, empresaInfo, cliente, produtos, unidades);
            const nfeUpdateData = {
                id: resultado.ref,
                status: resultado.status,
                url_danfe: resultado.caminho_danfe,
                url_xml: resultado.caminho_xml_nota_fiscal,
            };
            await updateVenda(venda.id!, { nfe: nfeUpdateData });
            if (resultado.status === 'autorizado') { toast.success("NF-e autorizada com sucesso!", { id: toastId });
            } else if (resultado.status === 'processando_autorizacao') { toast.info("NF-e está sendo processada. Consulte o status em breve.", { id: toastId });
            } else { const errorMessage = resultado.erros ? resultado.erros[0].mensagem : (resultado.mensagem_sefaz || 'Erro desconhecido'); toast.error(`Falha na emissão: ${errorMessage}`, { id: toastId, duration: 10000 }); }
        } catch (error: any) { toast.error("Erro ao emitir NF-e", { id: toastId, description: error.message }); }
    };

    const vendasEnriquecidas = useMemo(() => vendas.map(venda => ({ ...venda, clienteNome: clientes.find(c => c.id === venda.clienteId)?.nome || 'N/A' })), [vendas, clientes]);

    const columns: ColumnDef<VendaComDetalhes>[] = [
        { header: "Data", accessorKey: "data", cell: ({ row }) => format(row.original.data, 'dd/MM/yyyy') },
        { header: "Cliente", accessorKey: "clienteNome" },
        { header: "Valor Final", cell: ({ row }) => `R$ ${(row.original.valorFinal || row.original.valorTotal).toFixed(2)}` },
        { header: "Pagamento", cell: ({ row }) => <Badge variant={row.original.status === 'Paga' ? 'success' : 'warning'}>{row.original.status}</Badge> },
        { header: "NF-e", cell: ({ row }) => { const statusInfo = getStatusInfo(row.original.nfe?.status); return <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge> }},
        {
            id: "actions",
            cell: ({ row }) => {
                const venda = row.original;
                const nfeStatus = venda.nfe?.status;
                const podeEmitir = venda.status === 'Paga' && (nfeStatus !== 'autorizado' && nfeStatus !== 'processando_autorizacao' && nfeStatus !== 'cancelado');
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menu</span><IconDotsVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(venda)}><IconPencil className="mr-2 h-4 w-4" /> Editar Venda</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEmitirNFe(venda)} disabled={!podeEmitir}>
                                { nfeStatus === 'erro_autorizacao' ? <IconRefresh className="mr-2 h-4 w-4 text-orange-500" /> : <IconFileInvoice className="mr-2 h-4 w-4" /> }
                                { nfeStatus === 'erro_autorizacao' ? "Tentar Novamente" : "Emitir NF-e" }
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            }
        }
    ];

    if (dependenciasFaltantes.length > 0) {
        return (
            <div className="container mx-auto py-8 px-4 md:px-6">
                <Alert variant="destructive">
                    <AlertTitle>Cadastro de pré-requisito necessário</AlertTitle>
                    <AlertDescription>Para registrar uma venda, você precisa primeiro cadastrar: <ul className="list-disc pl-5 mt-2">{dependenciasFaltantes.map(dep => (<li key={dep.nome}><Button variant="link" asChild className="p-0 h-auto font-bold"><Link href={dep.link}>{dep.nome}</Link></Button></li>))}</ul></AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Histórico de Vendas</CardTitle>
                        <CardDescription>Visualize e gerencie todas as suas vendas.</CardDescription>
                    </div>
                    <Button onClick={handleAddNew}><IconPlus className="mr-2 h-4 w-4" /> Nova Venda</Button>
                </CardHeader>
                <CardContent>
                    <GenericTable columns={columns} data={vendasEnriquecidas} filterPlaceholder="Pesquisar por cliente..." filterColumnId="clienteNome" renderSubComponent={renderSubComponent} />
                </CardContent>
            </Card>

            {isFormVisible && (
                 <Card>
                    <CardHeader>
                        <CardTitle>{isEditing ? "Editar Venda" : "Registrar Nova Venda"}</CardTitle>
                        <CardDescription>Preencha os detalhes abaixo para criar ou editar uma venda.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} id="venda-form" className="space-y-8">
                                <section>
                                    <h3 className="text-lg font-semibold mb-4">1. Dados Principais</h3>
                                    <div className="space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <FormField name="clienteId" control={form.control} render={({ field }) => (<FormItem><FormLabel>Cliente</FormLabel><Combobox options={clientesOptions} value={field.value} onChange={field.onChange} placeholder="Selecione um cliente" searchPlaceholder="Buscar cliente..." /></FormItem>)} />
                                            <FormField name="data" control={form.control} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data da Venda</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                        <Separator/>
                                        <div className="space-y-3">
                                            <FormLabel>Produtos Vendidos</FormLabel>
                                            {fields.map((field, index) => (<ItemProdutoVenda key={field.id} index={index} control={form.control} remove={remove} handleProdutoChange={handleProdutoChange} produtosParaVendaOptions={produtosParaVendaOptions} />))}
                                            <Button type="button" variant="outline" size="sm" onClick={() => append({ produtoId: "", quantidade: 1, precoUnitario: 0, produtoNome: "", custoUnitario: 0, estoqueDisponivel: 0, })}><IconPlus className="mr-2 h-4 w-4" /> Adicionar Produto</Button>
                                        </div>
                                    </div>
                                </section>

                                 <section>
                                    <h3 className="text-lg font-semibold mb-4">2. Pagamento</h3>
                                     <div className="space-y-4">
                                         <div className="grid md:grid-cols-2 gap-4 items-start">
                                            <FormField name="condicaoPagamento" control={form.control} render={({ field }) => (<FormItem><FormLabel>Condição</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="A_VISTA">À Vista</SelectItem><SelectItem value="A_PRAZO">A Prazo</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                            {condicaoPagamento === "A_VISTA" ? (<FormField name="metodoPagamento" control={form.control} render={({ field }) => (<FormItem><FormLabel>Método de Pagamento</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{metodosPagamentoOptions.vista.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />) : (<div className="grid grid-cols-2 gap-4"><FormField name="metodoPagamento" control={form.control} render={({ field }) => (<FormItem><FormLabel>Método</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{metodosPagamentoOptions.prazo.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} /><FormField name="dataVencimento" control={form.control} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Vencimento</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} /></div>)}
                                        </div>
                                        <FormField name="contaBancariaId" control={form.control} render={({ field }) => (<FormItem><FormLabel>Conta de Destino (Crédito)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione a conta..." /></SelectTrigger></FormControl><SelectContent>{contasBancariasOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select><FormDescription>Onde o valor da venda será creditado (para vendas à vista).</FormDescription><FormMessage /></FormItem>)} />
                                        {metodoPagamento === "Cartão de Crédito" && (<div className="grid md:grid-cols-3 gap-4 items-end pt-4"><FormField name="taxaCartao" control={form.control} render={({ field }) => (<FormItem><FormLabel>Taxa da Máquina (%)</FormLabel><FormControl><Input type="number" placeholder="Ex: 2.5" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} /><FormField name="numeroParcelas" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nº de Parcelas</FormLabel><Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map((p) => (<SelectItem key={p} value={String(p)}>{p}x</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} /><div className="text-right"><p className="text-sm text-muted-foreground">Valor da Parcela</p><p className="text-lg font-bold">R$ {(valorFinalCalculado / (numeroParcelas || 1)).toFixed(2)}</p></div></div>)}
                                    </div>
                                 </section>

                                 <Separator />
                                 <div className="flex justify-between items-center pt-4">
                                     <div>
                                        <p className="text-sm text-muted-foreground">Valor Final da Venda</p>
                                        <p className="text-3xl font-bold">R$ {valorFinalCalculado.toFixed(2).replace(".", ",")}</p>
                                     </div>
                                     <div className="flex gap-2">
                                        <Button type="button" variant="outline" onClick={() => setIsFormVisible(false)}>Cancelar</Button>
                                        <Button type="submit" size="lg" disabled={!form.formState.isValid}>{isEditing ? 'Salvar Alterações' : 'Finalizar Venda'}</Button>
                                     </div>
                                 </div>
                            </form>
                        </Form>
                    </CardContent>
                 </Card>
            )}
        </div>
    );
}
