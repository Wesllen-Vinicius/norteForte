"use client"

import { useEffect, useMemo, useState, Fragment } from "react";
import Link from "next/link";
import { useForm, useFieldArray, useWatch, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from 'date-fns';
import { IconPlus, IconTrash, IconChevronDown, IconChevronUp, IconAlertTriangle } from "@tabler/icons-react";
import { ColumnDef, Row } from "@tanstack/react-table";

import { CrudLayout } from "@/components/crud-layout";
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
import { formVendaSchema, Venda, ItemVendido, VendaFormValues } from "@/lib/schemas";
import { registrarVenda } from "@/lib/services/vendas.services";

type VendaComDetalhes = Venda & { clienteNome?: string };

const defaultFormValues: VendaFormValues = {
    clienteId: "",
    data: new Date(),
    produtos: [],
    condicaoPagamento: "A_VISTA",
    metodoPagamento: "",
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

const ItemProdutoVenda = ({ index, control, remove, handleProdutoChange }: { index: number, control: Control<VendaFormValues>, remove: (i: number) => void, handleProdutoChange: (i: number, id: string) => void }) => {
    const { produtos } = useDataStore();
    const produtosParaVenda = useMemo(() => produtos.filter(p => p.tipoProduto === 'VENDA'), [produtos]);

    return(
        <div className="grid grid-cols-[1fr_80px_120px_auto] gap-2 items-start p-3 border rounded-md bg-muted/50">
            <FormField name={`produtos.${index}.produtoId`} control={control} render={({ field }) => ( <FormItem><Select onValueChange={(value) => handleProdutoChange(index, value)} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger></FormControl><SelectContent>{produtosParaVenda.map(p => <SelectItem key={p.id} value={p.id!}>{p.nome}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
            <FormField name={`produtos.${index}.quantidade`} control={control} render={({ field }) => ( <FormItem><FormControl><Input type="number" placeholder="Qtd" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl><FormMessage /></FormItem> )} />
            <FormField name={`produtos.${index}.precoUnitario`} control={control} render={({ field }) => ( <FormItem><FormControl><Input type="number" placeholder="Preço" {...field} readOnly className="bg-muted-foreground/20" /></FormControl><FormMessage /></FormItem> )} />
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><IconTrash className="h-4 w-4 text-destructive" /></Button>
        </div>
    )
}

export default function VendasPage() {
    const { produtos, clientes, vendas } = useDataStore();
    const { user } = useAuthStore();
    const [globalFilter, setGlobalFilter] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [valorFinalCalculado, setValorFinalCalculado] = useState(0);

    const produtosParaVenda = useMemo(() => produtos.filter(p => p.tipoProduto === 'VENDA'), [produtos]);
    const clientesOptions = useMemo(() => clientes.map(c => ({ label: c.nome, value: c.id! })), [clientes]);

    const form = useForm<VendaFormValues>({
        resolver: zodResolver(formVendaSchema),
        defaultValues: defaultFormValues,
    });

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "produtos" });

    const watchedProdutos = useWatch({ control: form.control, name: 'produtos' });
    const condicaoPagamento = useWatch({ control: form.control, name: 'condicaoPagamento' });
    const metodoPagamento = useWatch({ control: form.control, name: 'metodoPagamento' });
    const numeroParcelas = useWatch({ control: form.control, name: 'numeroParcelas' });
    const taxaCartao = useWatch({ control: form.control, name: 'taxaCartao' });
    const valorTotal = useWatch({ control: form.control, name: 'valorTotal' });


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

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (condicaoPagamento === 'A_PRAZO') {
            form.setValue('metodoPagamento', 'Boleto/Prazo');
        } else {
            form.setValue('metodoPagamento', '');
        }
    }, [condicaoPagamento, form]);

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
        }
    };

    const onSubmit = async (values: VendaFormValues) => {
       try {
            const cliente = clientes.find(c => c.id === values.clienteId);
            if (!cliente) throw new Error("Cliente não encontrado.");
            if (!user) throw new Error("Usuário não autenticado.");

            const dadosCompletos = { ...values, valorFinal: valorFinalCalculado, registradoPor: { uid: user.uid, nome: user.displayName || 'Usuário' } };

            await registrarVenda(dadosCompletos as any, cliente.nome);
            toast.success("Venda registrada com sucesso!");
            form.reset(defaultFormValues);
            remove();
       } catch (error: any) {
           toast.error("Falha ao registrar venda", { description: error.message });
       }
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
        { header: "Status", accessorKey: "status", cell: ({ row }) => <Badge variant={row.original.status === 'Paga' ? 'default' : 'destructive'}>{row.original.status}</Badge> },
        { header: "Valor Final", accessorKey: "valorFinal", cell: ({ row }) => `R$ ${(row.original.valorFinal || row.original.valorTotal).toFixed(2)}` }
    ];

    const formContent = (
        isLoading ? (
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
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
                <form onSubmit={form.handleSubmit(onSubmit)} id="venda-form" className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField name="clienteId" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Cliente</FormLabel><Combobox options={clientesOptions} value={field.value} onChange={field.onChange} placeholder="Selecione um cliente" searchPlaceholder="Buscar cliente..."/></FormItem> )} />
                        <FormField name="data" control={form.control} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Data da Venda</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <Separator />
                    <div className="space-y-3">
                        <FormLabel>Produtos Vendidos</FormLabel>
                        {fields.map((field, index) => (
                            <ItemProdutoVenda key={field.id} index={index} control={form.control} remove={remove} handleProdutoChange={handleProdutoChange} />
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ produtoId: "", quantidade: 1, precoUnitario: 0, produtoNome: "", custoUnitario: 0 })}><IconPlus className="mr-2 h-4 w-4" /> Adicionar Produto</Button>
                    </div>
                    <Separator />
                    <div className="grid md:grid-cols-2 gap-4 items-start">
                        <FormField name="condicaoPagamento" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Condição</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="A_VISTA">À Vista</SelectItem><SelectItem value="A_PRAZO">A Prazo</SelectItem></SelectContent>
                                </Select>
                                {condicaoPagamento === 'A_PRAZO' && (
                                    <FormDescription className="text-xs">O método de pagamento será Boleto/Prazo.</FormDescription>
                                )}
                                <FormMessage />
                            </FormItem>
                        )} />

                        {condicaoPagamento === 'A_VISTA' ? (
                            <FormField name="metodoPagamento" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Método de Pagamento</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="PIX">PIX</SelectItem><SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem><SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                        ) : (
                             <FormField name="dataVencimento" control={form.control} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Vencimento</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
                        )}
                    </div>

                    {metodoPagamento === 'Cartão de Crédito' && (
                        <div className="grid md:grid-cols-3 gap-4 items-end pt-4">
                             <FormField name="taxaCartao" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Taxa da Máquina (%)</FormLabel><FormControl><Input type="number" placeholder="Ex: 2.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl><FormMessage /></FormItem> )} />
                             <FormField name="numeroParcelas" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Nº de Parcelas</FormLabel><Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{Array.from({length: 12}, (_, i) => i + 1).map(p => <SelectItem key={p} value={String(p)}>{p}x</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                             <div className="text-right">
                                <p className="text-sm text-muted-foreground">Valor da Parcela</p>
                                <p className="text-lg font-bold">R$ {(valorFinalCalculado / (numeroParcelas || 1)).toFixed(2)}</p>
                            </div>
                        </div>
                    )}

                    <div className="text-right mt-4"><p className="text-sm text-muted-foreground">Valor Final da Venda</p><p className="text-2xl font-bold">R$ {valorFinalCalculado.toFixed(2).replace('.', ',')}</p></div>
                    <div className="flex justify-end pt-4"><Button type="submit" form="venda-form" size="lg">Finalizar Venda</Button></div>
                </form>
            </Form>
        )
    );

    const tableControls = (<Input placeholder="Pesquisar por cliente..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="max-w-full md:max-w-sm" />);

    return (
       <CrudLayout
            formTitle="Registrar Nova Venda"
            formContent={formContent}
            tableTitle="Histórico de Vendas"
            tableContent={
                isLoading ?
                <div className="space-y-2"><Skeleton className="h-10 w-full" />{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                : <GenericTable columns={columns} data={vendasEnriquecidas} globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} tableControlsComponent={tableControls} renderSubComponent={renderSubComponent} enableMultiRowExpansion={false} />
            }
        />
    );
}
