"use client"

import { useEffect, useState, useMemo } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { IconPlus, IconTrash } from "@tabler/icons-react";

import { CenteredLayout } from "@/components/centered-layout";
import { GenericForm } from "@/components/generic-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/date-picker";

import { Produto, subscribeToProdutos } from "@/lib/services/produtos.services";
import { Cliente, subscribeToClientes } from "@/lib/services/clientes.services";
import { vendaSchema, registrarVenda } from "@/lib/services/vendas.services";

type VendaFormValues = z.infer<typeof vendaSchema>;

export default function VendasPage() {
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);

    const produtosParaVenda = useMemo(() => produtos.filter(p => p.tipoProduto === 'VENDA'), [produtos]);

    const form = useForm<VendaFormValues>({
        resolver: zodResolver(vendaSchema),
        defaultValues: { clienteId: "", data: new Date(), produtos: [], condicaoPagamento: undefined, valorTotal: 0 },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "produtos",
    });

    const watchedProdutos = useWatch({ control: form.control, name: 'produtos' });
    const condicaoPagamento = form.watch('condicaoPagamento');

    useEffect(() => {
        const unsubProdutos = subscribeToProdutos(setProdutos);
        const unsubClientes = subscribeToClientes(setClientes);
        return () => {
            unsubProdutos();
            unsubClientes();
        };
    }, []);

    useEffect(() => {
        const total = watchedProdutos.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario || 0), 0);
        form.setValue('valorTotal', total);
    }, [watchedProdutos, form]);

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

            await registrarVenda(values, cliente.nome);
            toast.success("Venda registrada com sucesso!");
            form.reset();
            remove();
       } catch (error: any) {
           toast.error("Falha ao registrar venda", { description: error.message });
       }
    };

    return (
        <CenteredLayout>
            <Card>
                <CardHeader>
                    <CardTitle>Registrar Nova Venda</CardTitle>
                    <CardDescription>Preencha os dados para registrar uma nova venda e dar baixa no estoque.</CardDescription>
                </CardHeader>
                <CardContent>
                    <GenericForm schema={vendaSchema} onSubmit={onSubmit} formId="venda-form" form={form}>
                        <div className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField name="clienteId" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Cliente</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger></FormControl>
                                            <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id!}>{c.nome}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField name="data" control={form.control} render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Data da Venda</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>

                            <Separator className="my-6" />

                            <div className="space-y-4">
                                <FormLabel>Produtos Vendidos</FormLabel>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-[1fr_80px_120px_auto] gap-2 items-start">
                                        <FormField name={`produtos.${index}.produtoId`} control={form.control} render={({ field: formField }) => (
                                            <FormItem><Select onValueChange={(value) => handleProdutoChange(index, value)} value={formField.value}><FormControl><SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger></FormControl><SelectContent>{produtosParaVenda.map(p => <SelectItem key={p.id} value={p.id!}>{p.nome}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                        )} />
                                        <FormField name={`produtos.${index}.quantidade`} control={form.control} render={({ field }) => (
                                            <FormItem><FormControl><Input type="number" placeholder="Qtd" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField name={`produtos.${index}.precoUnitario`} control={form.control} render={({ field }) => (
                                            <FormItem><FormControl><Input type="number" placeholder="Preço" {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><IconTrash className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ produtoId: "", quantidade: 1, precoUnitario: 0, produtoNome: "", custoUnitario: 0 })}>
                                    <IconPlus className="mr-2 h-4 w-4" /> Adicionar Produto
                                </Button>
                            </div>

                            <Separator className="my-6" />

                             <div className="grid md:grid-cols-2 gap-4 items-end">
                                <FormField name="condicaoPagamento" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Condição de Pagamento</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione a condição" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="A_VISTA">À Vista</SelectItem>
                                                <SelectItem value="A_PRAZO">A Prazo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                {condicaoPagamento === 'A_PRAZO' && (
                                    <FormField name="dataVencimento" control={form.control} render={({ field }) => (
                                        <FormItem className="flex flex-col"><FormLabel>Data de Vencimento</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                )}
                            </div>
                            <div className="text-right mt-4">
                                <p className="text-sm text-muted-foreground">Valor Total</p>
                                <p className="text-2xl font-bold">R$ {form.getValues('valorTotal').toFixed(2).replace('.', ',')}</p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-8">
                            <Button type="submit" form="venda-form" size="lg">Finalizar Venda</Button>
                        </div>
                    </GenericForm>
                </CardContent>
            </Card>
        </CenteredLayout>
    );
}
