"use client"

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { IconPlus, IconTrash, IconAlertTriangle } from "@tabler/icons-react";
import Link from "next/link";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { CrudLayout } from "@/components/crud-layout";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/date-picker";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Combobox } from "@/components/ui/combobox";
import { GenericTable } from "@/components/generic-table";
import { Badge } from "@/components/ui/badge";

import { useDataStore } from "@/store/data.store";
import { Compra, compraSchema } from "@/lib/schemas";
import { registrarCompra } from "@/lib/services/compras.services";
import { useAuthStore } from "@/store/auth.store";


type CompraFormValues = z.infer<typeof compraSchema>;
type CompraComDetalhes = Compra & { fornecedorNome: string };

const defaultFormValues: Partial<CompraFormValues> = {
    fornecedorId: "",
    notaFiscal: "",
    data: new Date(),
    itens: [],
    condicaoPagamento: "A_VISTA",
    contaBancariaId: "",
    valorTotal: 0,
    numeroParcelas: 1,
};

export default function ComprasPage() {
    const { produtos, fornecedores, contasBancarias, compras } = useDataStore();
    const [isEditing, setIsEditing] = useState(false);
    const { role } = useAuthStore();

    const form = useForm<CompraFormValues>({
        resolver: zodResolver(compraSchema),
        defaultValues: defaultFormValues,
    });

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "itens" });
    const watchedItens = useWatch({ control: form.control, name: 'itens' });
    const watchedCondicao = useWatch({ control: form.control, name: 'condicaoPagamento' });
    const watchedTotal = form.watch('valorTotal');

    // Agora inclui Matéria-Prima e Uso Interno
    const produtosComprados = useMemo(() =>
        produtos.filter(p => p.tipoProduto === 'MATERIA_PRIMA' || p.tipoProduto === 'USO_INTERNO'),
    [produtos]);

    const fornecedorOptions = useMemo(() => fornecedores.map(f => ({ label: f.razaoSocial, value: f.id! })), [fornecedores]);
    const contasBancariasOptions = useMemo(() => contasBancarias.map(c => ({ label: `${c.nomeConta} (${c.banco})`, value: c.id! })), [contasBancarias]);

    const dependenciasFaltantes = useMemo(() => {
        const faltantes = [];
        if (!fornecedores || fornecedores.length === 0) faltantes.push({ nome: "Fornecedores", link: "/dashboard/fornecedores" });
        if (produtosComprados.length === 0) faltantes.push({ nome: "Produtos (Matéria-Prima/Uso Interno)", link: "/dashboard/produtos" });
        if (!contasBancarias || contasBancarias.length === 0) faltantes.push({ nome: "Contas Bancárias", link: "/dashboard/financeiro/contas-bancarias" });
        return faltantes;
    }, [fornecedores, produtosComprados, contasBancarias]);

    const comprasEnriquecidas = useMemo(() => {
        return compras.map(c => ({
            ...c,
            fornecedorNome: fornecedores.find(f => f.id === c.fornecedorId)?.razaoSocial || "N/A"
        }))
    }, [compras, fornecedores])

    useEffect(() => {
        const total = watchedItens.reduce((acc, item) => acc + ((item.quantidade || 0) * (item.custoUnitario || 0)), 0);
        form.setValue('valorTotal', total);
    }, [watchedItens, form]);

    const resetForm = () => {
        form.reset(defaultFormValues);
        remove();
        setIsEditing(false);
    }

    const onSubmit = async (values: CompraFormValues) => {
       try {
            await registrarCompra(values);
            toast.success("Compra registrada com sucesso!");
            resetForm();
       } catch (error: any) {
           toast.error("Falha ao registrar compra", { description: error.message });
       }
    };

    const handleItemChange = (index: number, produtoId: string) => {
        const produto = produtosComprados.find(p => p.id === produtoId);
        if(produto){
            form.setValue(`itens.${index}.produtoNome`, produto.nome);
        }
    }

    const columns: ColumnDef<CompraComDetalhes>[] = [
        { header: "Data", cell: ({row}) => format(row.original.data, 'dd/MM/yyyy') },
        { header: "Fornecedor", accessorKey: "fornecedorNome" },
        { header: "NF", accessorKey: "notaFiscal" },
        { header: "Itens", cell: ({row}) => row.original.itens.length },
        { header: "Valor Total", cell: ({row}) => `R$ ${row.original.valorTotal.toFixed(2)}`},
        { header: "Pagamento", cell: ({row}) => <Badge variant={row.original.condicaoPagamento === 'A_VISTA' ? "default" : "secondary"}>{row.original.condicaoPagamento === 'A_VISTA' ? "À Vista" : "A Prazo"}</Badge>}
    ];

    const formContent = (
         dependenciasFaltantes.length > 0 ? (
            <Alert variant="destructive">
                <IconAlertTriangle className="h-4 w-4" />
                <AlertTitle>Cadastro de pré-requisitos necessário</AlertTitle>
                <AlertDescription>
                    Para registrar uma compra, você precisa primeiro cadastrar:
                    <ul className="list-disc pl-5 mt-2">
                        {dependenciasFaltantes.map(dep => (
                            <li key={dep.nome}>
                                <Button variant="link" asChild className="p-0 h-auto font-bold">
                                    <Link href={dep.link}>{dep.nome}</Link>
                                </Button>
                            </li>
                        ))}
                    </ul>
                </AlertDescription>
            </Alert>
        ) : (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} id="compra-form" className="space-y-6">
                    <div className="space-y-4">
                        <FormField name="fornecedorId" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Fornecedor</FormLabel>
                                <Combobox options={fornecedorOptions} {...field} placeholder="Selecione um fornecedor" />
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField name="notaFiscal" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Nº da Nota Fiscal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField name="data" control={form.control} render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Data da Compra</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                    </div>

                    <Separator />
                    <div className="space-y-4">
                        <FormLabel>Itens da Compra</FormLabel>
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-[1fr_80px_120px_auto] gap-2 items-start">
                                <FormField name={`itens.${index}.produtoId`} control={form.control} render={({ field: formField }) => (
                                    <FormItem><Select onValueChange={(value) => {formField.onChange(value); handleItemChange(index, value);}} value={formField.value}><FormControl><SelectTrigger><SelectValue placeholder="Produto/Item" /></SelectTrigger></FormControl><SelectContent>{produtosComprados.map(p => <SelectItem key={p.id} value={p.id!}>{p.nome}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                                <FormField name={`itens.${index}.quantidade`} control={form.control} render={({ field }) => (
                                    <FormItem><FormControl><Input type="number" placeholder="Qtd" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl></FormItem>
                                )}/>
                                <FormField name={`itens.${index}.custoUnitario`} control={form.control} render={({ field }) => (
                                    <FormItem><FormControl><Input type="number" step="0.01" placeholder="Custo" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl></FormItem>
                                )}/>
                                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><IconTrash className="h-4 w-4" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ produtoId: "", quantidade: 1, custoUnitario: 0, produtoNome: "" })}>
                            <IconPlus className="mr-2 h-4 w-4" /> Adicionar Item
                        </Button>
                    </div>

                    <Separator />
                    <h3 className="text-lg font-medium">Detalhes do Pagamento</h3>

                    <div className="grid md:grid-cols-2 gap-4 items-start">
                        <FormField name="condicaoPagamento" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Condição</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="A_VISTA">À Vista</SelectItem>
                                        <SelectItem value="A_PRAZO">A Prazo/Parcelado</SelectItem>
                                    </SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )} />
                        <FormField name="contaBancariaId" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Conta de Origem (Débito)</FormLabel>
                                <Combobox options={contasBancariasOptions} {...field} placeholder="Selecione a conta..."/>
                            <FormMessage /></FormItem>
                        )} />
                    </div>

                    {watchedCondicao === 'A_PRAZO' && (
                        <div className="grid md:grid-cols-2 gap-4 items-start p-4 border bg-muted/50 rounded-lg">
                            <FormField name="numeroParcelas" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Nº de Parcelas</FormLabel>
                                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 1)} /></FormControl>
                                <FormMessage /></FormItem>
                            )} />
                            <FormField name="dataPrimeiroVencimento" control={form.control} render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>1º Vencimento</FormLabel>
                                    <DatePicker date={field.value} onDateChange={field.onChange} />
                                <FormMessage /></FormItem>
                            )} />
                        </div>
                    )}

                    <div className="text-right pt-4 border-t">
                        <p className="text-sm text-muted-foreground">Valor Total da Compra</p>
                        <p className="text-2xl font-bold">R$ {watchedTotal.toFixed(2).replace('.', ',')}</p>
                    </div>

                    <div className="flex justify-end pt-8">
                        <Button type="submit" form="compra-form" size="lg">Registrar Compra</Button>
                    </div>
                </form>
            </Form>
        )
    );

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Compra" : "Registrar Nova Compra"}
            formContent={formContent}
            tableTitle="Histórico de Compras"
            tableContent={<GenericTable columns={columns} data={comprasEnriquecidas} filterPlaceholder="Filtrar por fornecedor..." filterColumnId="fornecedorNome" />}
        />
    );
}
