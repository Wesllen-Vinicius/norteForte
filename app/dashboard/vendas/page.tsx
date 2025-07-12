"use client"

import { useEffect, useMemo, useState, ReactElement } from "react";
import Link from "next/link";
import { useForm, useFieldArray, Control, SubmitHandler, useController } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { IconPlus, IconTrash, IconPencil, IconFileInvoice, IconAlertTriangle, IconLoader, IconFileDownload, IconFileX } from "@tabler/icons-react";
import { ColumnDef, Row } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Combobox } from "@/components/ui/combobox";
import { NfePreviewModal } from "@/components/nfe-preview-modal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDataStore } from "@/store/data.store";
import { useAuthStore } from "@/store/auth.store";
import { Venda, vendaSchema, Produto, Unidade, CompanyInfo, Cliente } from "@/lib/schemas";
import { registrarVenda, updateVenda } from "@/lib/services/vendas.services";
import { emitirNFe } from "@/lib/services/nfe.services";
import { getCompanyInfo } from "@/lib/services/settings.services";
import z from "zod";
import { DatePicker } from "@/components/date-picker";
import { Separator } from "@/components/ui/separator";

const itemVendidoFormSchema = z.object({
    produtoId: z.string(),
    produtoNome: z.string(),
    quantidade: z.coerce.number().min(0.0001, "A quantidade deve ser maior que zero."),
    precoUnitario: z.coerce.number().min(0, "O preço não pode ser negativo."),
    custoUnitario: z.coerce.number().min(0),
    estoqueDisponivel: z.number(),
}).refine(
    (data) => data.quantidade > 0 ? data.quantidade <= data.estoqueDisponivel : true,
    (data) => ({ message: `Estoque: ${data.estoqueDisponivel}`, path: ["quantidade"] })
);

const formVendaSchema = vendaSchema.pick({
    clienteId: true, data: true, produtos: true, valorTotal: true, condicaoPagamento: true, metodoPagamento: true,
    contaBancariaId: true, numeroParcelas: true, taxaCartao: true, dataVencimento: true, valorFinal: true,
}).extend({
    produtos: z.array(itemVendidoFormSchema).min(1, "Adicione pelo menos um produto."),
}).refine(data => {
    if (data.condicaoPagamento === 'A_VISTA') return !!data.contaBancariaId;
    return true;
}, { message: "Conta de destino é obrigatória para pagamentos à vista.", path: ["contaBancariaId"] })
.refine(data => {
    if (data.metodoPagamento === 'Cartão de Crédito') return data.taxaCartao !== undefined && data.taxaCartao >= 0;
    return true;
}, { message: "A taxa do cartão é obrigatória.", path: ["taxaCartao"] });


type VendaFormValues = z.infer<typeof formVendaSchema>;
type VendaComDetalhes = Venda & { clienteNome?: string };

const defaultFormValues: VendaFormValues = {
    clienteId: "", data: new Date(), produtos: [], condicaoPagamento: "A_VISTA", metodoPagamento: "",
    contaBancariaId: "", valorTotal: 0, valorFinal: 0, dataVencimento: new Date(), numeroParcelas: 1, taxaCartao: 0,
};

const NfeActionButton = ({ venda, onPrepareNFe }: { venda: VendaComDetalhes, onPrepareNFe: (venda: VendaComDetalhes) => void }) => {
    const status = venda.nfe?.status;
    const isPaid = venda.status === 'Paga';

    if (!isPaid) {
        return <Badge variant="outline">Aguardando Pagamento</Badge>;
    }

    switch (status) {
        case 'autorizado':
            return (
                <div className="flex gap-2">
                     <Button size="sm" variant="outline" asChild><a href={venda.nfe?.url_danfe} target="_blank" rel="noopener noreferrer"><IconFileDownload className="h-4 w-4"/></a></Button>
                     <Button size="sm" variant="outline" asChild><a href={venda.nfe?.url_xml} target="_blank" rel="noopener noreferrer"><IconFileX className="h-4 w-4"/></a></Button>
                </div>
            );
        case 'processando_autorizacao':
            return <Button size="sm" variant="secondary" disabled><IconLoader className="h-4 w-4 animate-spin mr-2"/>Processando...</Button>;
        case 'erro_autorizacao':
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button size="sm" variant="destructive" onClick={() => onPrepareNFe(venda)}><IconAlertTriangle className="h-4 w-4 mr-2"/>Erro</Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Houve um erro. Clique para corrigir e tentar novamente.</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        case 'cancelado':
            return <Badge variant="secondary">Cancelada</Badge>;
        default:
            return <Button size="sm" onClick={() => onPrepareNFe(venda)}><IconFileInvoice className="h-4 w-4 mr-2"/>Emitir NF-e</Button>;
    }
}

const ItemProdutoVenda = ({ index, control, remove, handleProdutoChange, produtosParaVendaOptions }: {
    index: number, control: Control<VendaFormValues>, remove: (i: number) => void,
    handleProdutoChange: (i: number, id: string) => void, produtosParaVendaOptions: { label: string, value: string }[]
}) => {
    const { fieldState } = useController({ name: `produtos.${index}.quantidade`, control });
    const hasError = !!fieldState.error;

    return(
        <div className={`p-3 border rounded-md bg-muted/50 space-y-2 transition-all ${hasError ? 'border-destructive' : ''}`}>
            <div className="grid grid-cols-[1fr_80px_120px_auto] gap-2 items-start">
                <FormField name={`produtos.${index}.produtoId`} control={control} render={({ field }) => ( <FormItem><Select onValueChange={(value) => {field.onChange(value); handleProdutoChange(index, value)}} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger></FormControl><SelectContent>{produtosParaVendaOptions.map(p => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                <FormField name={`produtos.${index}.quantidade`} control={control} render={({ field }) => ( <FormItem><FormControl><Input type="number" placeholder="Qtd" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className={hasError ? 'border-destructive focus-visible:ring-destructive' : ''}/></FormControl></FormItem> )}/>
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

const renderSubComponent = ({ row }: { row: Row<VendaComDetalhes> }):ReactElement => {
    return (
        <div className="p-4 bg-muted/20">
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


export default function VendasPage() {
    const { produtos, clientes, vendas, unidades, contasBancarias } = useDataStore();
    const { user, role } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isNfeModalOpen, setIsNfeModalOpen] = useState(false);
    const [nfePreviewData, setNfePreviewData] = useState<any | null>(null);
    const [isEmittingNfe, setIsEmittingNfe] = useState(false);
    const isReadOnly = role !== 'ADMINISTRADOR';

    const form = useForm<VendaFormValues>({ resolver: zodResolver(formVendaSchema), defaultValues: defaultFormValues, mode: "onChange" });
    const { control, watch, setValue, handleSubmit } = form;

    const { fields, append, remove } = useFieldArray({ control, name: "produtos" });

    const watchedProdutos = watch("produtos");
    const condicaoPagamento = watch('condicaoPagamento');
    const metodoPagamento = watch('metodoPagamento');
    const taxaCartao = watch('taxaCartao');
    const numeroParcelas = watch('numeroParcelas');

    const valoresCalculados = useMemo(() => {
        const valorTotal = watchedProdutos.reduce((acc, item) => acc + (item.quantidade || 0) * (item.precoUnitario || 0), 0);

        let valorFinal = valorTotal;
        if (metodoPagamento === 'Cartão de Crédito' && valorTotal > 0) {
            const taxaDecimal = (taxaCartao || 0) / 100;
            valorFinal = valorTotal * (1 + taxaDecimal);
        }

        const valorParcela = valorFinal > 0 && numeroParcelas ? valorFinal / numeroParcelas : 0;

        return { valorTotal, valorFinal, valorParcela };
    }, [watchedProdutos, metodoPagamento, taxaCartao, numeroParcelas]);

    useEffect(() => {
        setValue('valorTotal', valoresCalculados.valorTotal, { shouldValidate: true });
        setValue('valorFinal', valoresCalculados.valorFinal, { shouldValidate: true });
    }, [valoresCalculados, setValue]);

    const produtosParaVendaOptions = useMemo(() => produtos.filter(p => p.tipoProduto === 'VENDA').map(p => ({ label: `${p.nome} (Estoque: ${p.quantidade || 0} ${unidades.find(u => u.id === p.unidadeId)?.sigla || 'un'})`, value: p.id! })), [produtos, unidades]);
    const clientesOptions = useMemo(() => clientes.map(c => ({ label: c.nome, value: c.id! })), [clientes]);
    const contasBancariasOptions = useMemo(() => contasBancarias.map(c => ({ label: `${c.nomeConta} (${c.banco})`, value: c.id! })), [contasBancarias]);

    const dependenciasFaltantes = useMemo(() => {
        const faltantes = [];
        if (!clientes || clientes.length === 0) faltantes.push({ nome: "Clientes", link: "/dashboard/clientes" });
        if (produtos.filter(p => p.tipoProduto === 'VENDA').length === 0) faltantes.push({ nome: "Produtos de Venda", link: "/dashboard/produtos" });
        if (!contasBancarias || contasBancarias.length === 0) faltantes.push({ nome: "Contas Bancárias", link: "/dashboard/financeiro/contas-bancarias" });
        return faltantes;
    }, [clientes, produtos, contasBancarias]);

    const handleProdutoChange = (index: number, produtoId: string) => {
        const produto = produtos.find(p => p.id === produtoId);
        if (produto?.tipoProduto === "VENDA") {
            setValue(`produtos.${index}`, {
                produtoId, produtoNome: produto.nome, precoUnitario: produto.precoVenda,
                custoUnitario: produto.custoUnitario || 0, estoqueDisponivel: produto.quantidade || 0, quantidade: 1
            });
        }
    };

    const resetForm = () => {
        form.reset(defaultFormValues);
        setIsEditing(false);
        setEditingId(null);
    }

    const handleEdit = (venda: VendaComDetalhes) => {
        if (isReadOnly) return;
        setIsEditing(true); setEditingId(venda.id!);
        form.reset({
            ...venda, data: venda.data, dataVencimento: venda.dataVencimento || undefined,
            produtos: venda.produtos.map(p => ({ ...p, estoqueDisponivel: produtos.find(prod => prod.id === p.produtoId)?.quantidade || 0 }))
        });
    };

    const onSubmit: SubmitHandler<VendaFormValues> = async (values) => {
        const toastId = toast.loading(isEditing ? "Atualizando venda..." : "Registrando venda...");
        try {
            if (isEditing && editingId) {
                await updateVenda(editingId, { ...values });
                toast.success("Venda atualizada com sucesso!", { id: toastId });
            } else {
                const cliente = clientes.find(c => c.id === values.clienteId);
                if (!cliente || !user) throw new Error("Cliente ou usuário não encontrado.");
                const dadosCompletos = { ...values, registradoPor: { uid: user.uid, nome: user.displayName || 'Usuário' } };
                await registrarVenda(dadosCompletos as any, cliente.nome);
                toast.success("Venda registrada com sucesso!", { id: toastId });
            }
            resetForm();
        } catch (error: any) {
            toast.error(error.message || "Falha ao salvar a venda.", { id: toastId });
        }
    };

    const handlePrepareNFe = async (venda: VendaComDetalhes) => {
        const toastId = toast.loading("Preparando dados da NF-e...");
        try {
            const cliente = clientes.find(c => c.id === venda.clienteId);
            const empresaInfo = await getCompanyInfo();
            if (!cliente || !empresaInfo) { throw new Error("Dados do cliente ou da empresa não encontrados."); }
            setNfePreviewData({ venda, empresa: empresaInfo, cliente, todosProdutos: produtos, todasUnidades: unidades });
            setIsNfeModalOpen(true);
            toast.dismiss(toastId);
        } catch (error: any) {
            toast.error("Erro ao preparar NF-e", { id: toastId, description: error.message });
        }
    };

    const handleConfirmAndEmitNFe = async (formData: { venda: Venda, empresa: CompanyInfo, cliente: Cliente, todosProdutos: Produto[], todasUnidades: Unidade[] }) => {
        setIsEmittingNfe(true);
        const toastId = toast.loading("Enviando dados para a Sefaz...");
        try {
            const resultado = await emitirNFe(formData.venda, formData.empresa, formData.cliente, formData.todosProdutos, formData.todasUnidades);
            const nfeUpdateData = { id: resultado.ref, status: resultado.status, url_danfe: resultado.caminho_danfe, url_xml: resultado.caminho_xml_nota_fiscal };
            await updateVenda(formData.venda.id!, { nfe: nfeUpdateData });

            if (resultado.status === 'autorizado') { toast.success("NF-e autorizada com sucesso!", { id: toastId });
            } else if (resultado.status === 'processando_autorizacao') { toast.info("NF-e em processamento. Consulte o status em breve.", { id: toastId });
            } else { const errorMessage = resultado.erros ? resultado.erros[0].mensagem : (resultado.mensagem_sefaz || 'Erro desconhecido'); toast.error(`Falha na emissão: ${errorMessage}`, { id: toastId, duration: 10000 }); }

            setIsNfeModalOpen(false);
        } catch (error: any) {
            toast.error("Erro ao emitir NF-e", { id: toastId, description: error.message });
        } finally {
            setIsEmittingNfe(false);
        }
    };

    const vendasEnriquecidas = useMemo(() => vendas.map(venda => ({ ...venda, clienteNome: clientes.find(c => c.id === venda.clienteId)?.nome || 'N/A' })), [vendas, clientes]);

    const columns: ColumnDef<VendaComDetalhes>[] = [
        { header: "Data", accessorKey: "data", cell: ({ row }) => format(row.original.data, 'dd/MM/yyyy') },
        { header: "Cliente", accessorKey: "clienteNome" },
        { header: "Valor Final", cell: ({ row }) => `R$ ${(row.original.valorFinal || row.original.valorTotal).toFixed(2)}` },
        { header: "Pagamento", cell: ({ row }) => <Badge variant={row.original.status === 'Paga' ? 'success' : 'warning'}>{row.original.status}</Badge> },
        { id: "nfe_status_action", header: "NF-e", cell: ({ row }) => <NfeActionButton venda={row.original} onPrepareNFe={handlePrepareNFe} /> },
        { id: "edit_action", cell: ({ row }) => ( <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} disabled={isReadOnly}><IconPencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Editar Venda</p></TooltipContent></Tooltip></TooltipProvider> )}
    ];

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <NfePreviewModal isOpen={isNfeModalOpen} onOpenChange={setIsNfeModalOpen} previewData={nfePreviewData} onSubmit={handleConfirmAndEmitNFe} isLoading={isEmittingNfe} />
            <div className="grid grid-cols-1 xl:grid-cols-7 gap-6">

                <div className="xl:col-span-3 space-y-6">
                    <Form {...form}>
                        <form onSubmit={handleSubmit(onSubmit)} id="venda-form" className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle>{isEditing ? "Editar Venda" : "1. Cliente e Produtos"}</CardTitle></CardHeader>
                                <CardContent>
                                    {dependenciasFaltantes.length > 0 && !isEditing ? (
                                        <Alert variant="destructive">
                                            <IconAlertTriangle className="h-4 w-4" />
                                            <AlertTitle>Cadastro de pré-requisito necessário</AlertTitle>
                                            <AlertDescription> Para registrar uma venda, você precisa primeiro cadastrar:
                                                <ul className="list-disc pl-5 mt-2">{dependenciasFaltantes.map(dep => (
                                                    <li key={dep.nome}><Button variant="link" asChild className="p-0 h-auto font-bold"><Link href={dep.link}>{dep.nome}</Link></Button></li>
                                                ))}</ul>
                                            </AlertDescription>
                                        </Alert>
                                    ) : (
                                        <fieldset disabled={isReadOnly} className="space-y-4">
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <FormField name="clienteId" control={control} render={({ field }) => (<FormItem><FormLabel>Cliente</FormLabel><Combobox options={clientesOptions} {...field} placeholder="Selecione um cliente" /></FormItem>)} />
                                                <FormField name="data" control={control} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data da Venda</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <Separator />
                                            <fieldset disabled={!watch("clienteId")} className="space-y-3 disabled:opacity-50">
                                                <FormLabel>Produtos Vendidos</FormLabel>
                                                {fields.map((field, index) => (<ItemProdutoVenda key={field.id} index={index} control={control} remove={remove} handleProdutoChange={handleProdutoChange} produtosParaVendaOptions={produtosParaVendaOptions} />))}
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="inline-block">
                                                                <Button type="button" variant="outline" size="sm" onClick={() => append({ produtoId: "", quantidade: 1, precoUnitario: 0, produtoNome: "", custoUnitario: 0, estoqueDisponivel: 0, })} disabled={!watch("clienteId")}><IconPlus className="mr-2 h-4 w-4" /> Adicionar Produto</Button>
                                                            </div>
                                                        </TooltipTrigger>
                                                        {!watch("clienteId") && <TooltipContent><p>Selecione um cliente para adicionar produtos.</p></TooltipContent>}
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </fieldset>
                                        </fieldset>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>2. Pagamento e Finalização</CardTitle></CardHeader>
                                <CardContent>
                                    <fieldset disabled={isReadOnly || fields.length === 0} className="space-y-4 disabled:opacity-50">
                                        <div className="grid md:grid-cols-2 gap-4 items-start">
                                            <FormField name="condicaoPagamento" control={control} render={({ field }) => (<FormItem><FormLabel>Condição</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="A_VISTA">À Vista</SelectItem><SelectItem value="A_PRAZO">A Prazo</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                            {condicaoPagamento === "A_VISTA" ? (
                                                <FormField name="metodoPagamento" control={control} render={({ field }) => (<FormItem><FormLabel>Método</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{metodosPagamentoOptions.vista.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                            ) : (
                                                <div className="grid grid-cols-2 gap-4"><FormField name="metodoPagamento" control={control} render={({ field }) => (<FormItem><FormLabel>Método</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{metodosPagamentoOptions.prazo.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} /><FormField name="dataVencimento" control={control} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Vencimento</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} /></div>
                                            )}
                                        </div>
                                        <FormField name="contaBancariaId" control={control} render={({ field }) => (<FormItem><FormLabel>Conta de Destino</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione a conta..." /></SelectTrigger></FormControl><SelectContent>{contasBancariasOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select><FormDescription>Onde o valor da venda será creditado.</FormDescription><FormMessage /></FormItem>)} />
                                        {metodoPagamento === "Cartão de Crédito" && (<div className="grid md:grid-cols-3 gap-4 items-end pt-4"><FormField name="taxaCartao" control={control} render={({ field }) => (<FormItem><FormLabel>Taxa (%)</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} /><FormField name="numeroParcelas" control={control} render={({ field }) => (<FormItem><FormLabel>Parcelas</FormLabel><Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map((p) => (<SelectItem key={p} value={String(p)}>{p}x</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} /><div className="text-right"><p className="text-sm text-muted-foreground">Valor Parcela</p><p className="text-lg font-bold">R$ {valoresCalculados.valorParcela.toFixed(2)}</p></div></div>)}
                                    </fieldset>
                                     <div className="flex justify-between items-center pt-6 border-t mt-6">
                                        <div><p className="text-sm text-muted-foreground">Valor Final da Venda</p><p className="text-3xl font-bold">R$ {valoresCalculados.valorFinal.toFixed(2).replace(".", ",")}</p></div>
                                        <div className="flex gap-2">
                                            <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                                            <Button type="submit" form="venda-form" size="lg" disabled={!form.formState.isValid}>{isEditing ? 'Salvar Alterações' : 'Finalizar Venda'}</Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </form>
                    </Form>
                </div>

                <div className="xl:col-span-4">
                     <Card>
                        <CardHeader><CardTitle>Histórico de Vendas</CardTitle></CardHeader>
                        <CardContent>
                            <GenericTable columns={columns} data={vendasEnriquecidas} filterPlaceholder="Pesquisar por cliente..." filterColumnId="clienteNome" renderSubComponent={renderSubComponent} />
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}
