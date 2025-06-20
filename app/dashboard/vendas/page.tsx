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

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "produtos" });
    const watchedProdutos = useWatch({ control: form.control, name: 'produtos' });
    const condicaoPagamento = form.watch('condicaoPagamento');

    useEffect(() => {
        const unsubProdutos = subscribeToProdutos(setProdutos);
        const unsubClientes = subscribeToClientes(setClientes);
        return () => { unsubProdutos(); unsubClientes(); };
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
                        {/* ... (campos de cliente e data da venda) ... */}

                        <Separator className="my-6" />

                        {/* ... (lógica dos produtos vendidos) ... */}

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

                        <div className="flex justify-end pt-8">
                            <Button type="submit" form="venda-form" size="lg">Finalizar Venda</Button>
                        </div>
                    </GenericForm>
                </CardContent>
            </Card>
        </CenteredLayout>
    );
}
