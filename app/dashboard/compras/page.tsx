"use client"

import { useEffect, useMemo } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { IconPlus, IconTrash } from "@tabler/icons-react";

import { CenteredLayout } from "@/components/centered-layout";
import { GenericForm } from "@/components/generic-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/date-picker";

import { useDataStore } from "@/store/data.store";
import { compraSchema, registrarCompra } from "@/lib/services/compras.services";

type CompraFormValues = z.infer<typeof compraSchema>;

const defaultFormValues: CompraFormValues = {
    fornecedorId: "",
    notaFiscal: "",
    data: new Date(),
    itens: [],
    condicaoPagamento: "",
    contaBancariaId: "",
    valorTotal: 0
};

export default function ComprasPage() {
    const { produtos, fornecedores, contasBancarias } = useDataStore();

    const form = useForm<CompraFormValues>({
        resolver: zodResolver(compraSchema),
        defaultValues: defaultFormValues,
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "itens",
    });

    const watchedItens = useWatch({ control: form.control, name: 'itens' });
    const watchedTotal = form.watch('valorTotal');

    const contasBancariasOptions = useMemo(() =>
        contasBancarias.map(c => ({ label: `${c.nomeConta} (${c.banco})`, value: c.id! })),
    [contasBancarias]);

    useEffect(() => {
        const total = watchedItens.reduce((acc, item) => acc + (item.quantidade * item.custoUnitario || 0), 0);
        form.setValue('valorTotal', total);
    }, [watchedItens, form]);

    const onSubmit = async (values: CompraFormValues) => {
       try {
            const compraData = {
                ...values,
                itens: values.itens.map(p => ({
                    ...p,
                    produtoNome: produtos.find(prod => prod.id === p.produtoId)?.nome || "N/A"
                }))
            };
            await registrarCompra(compraData);
            toast.success("Compra registrada e estoque atualizado!");
            form.reset(defaultFormValues);
            remove();
       } catch (error: any) {
           toast.error("Falha ao registrar compra", { description: error.message });
       }
    };

    return (
        <CenteredLayout>
            <Card>
                <CardHeader>
                    <CardTitle>Registrar Nova Compra</CardTitle>
                    <CardDescription>Registre a entrada de produtos de fornecedores.</CardDescription>
                </CardHeader>
                <CardContent>
                    <GenericForm schema={compraSchema} onSubmit={onSubmit} formId="compra-form" form={form}>
                        <div className="space-y-4">
                            <FormField name="fornecedorId" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Fornecedor</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione um fornecedor" /></SelectTrigger></FormControl>
                                        <SelectContent>{fornecedores.map(f => <SelectItem key={f.id} value={f.id!}>{f.razaoSocial}</SelectItem>)}</SelectContent>
                                    </Select>
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

                            <Separator className="my-6" />

                            <div className="space-y-4">
                                <FormLabel>Itens da Compra</FormLabel>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-[1fr_80px_120px_auto] gap-2 items-start">
                                        <FormField name={`itens.${index}.produtoId`} control={form.control} render={({ field: formField }) => (
                                            <FormItem><Select onValueChange={formField.onChange} value={formField.value}><FormControl><SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger></FormControl><SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id!}>{p.nome}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                        )} />
                                        <FormField name={`itens.${index}.quantidade`} control={form.control} render={({ field }) => (
                                            <FormItem><FormControl><Input type="number" placeholder="Qtd" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField name={`itens.${index}.custoUnitario`} control={form.control} render={({ field }) => (
                                            <FormItem><FormControl><Input type="number" step="0.01" placeholder="Custo" {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><IconTrash className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ produtoId: "", quantidade: 1, custoUnitario: 0, produtoNome: "" })}>
                                    <IconPlus className="mr-2 h-4 w-4" /> Adicionar Item
                                </Button>
                            </div>

                            <Separator className="my-6" />

                             <FormField name="contaBancariaId" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Conta de Origem (Débito)</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione a conta..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {contasBancariasOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormItem>
                                <FormLabel>Anexo (Comprovante/NF)</FormLabel>
                                <FormControl><Input type="file" /></FormControl>
                                <FormDescription>O upload de arquivos será implementado futuramente.</FormDescription>
                                <FormMessage />
                            </FormItem>


                             <div className="grid md:grid-cols-2 gap-4 items-end">
                                <FormField name="condicaoPagamento" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Condição de Pagamento</FormLabel><FormControl><Input placeholder="Ex: 30 dias, à vista" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Valor Total da Compra</p>
                                    <p className="text-2xl font-bold">R$ {(watchedTotal || 0).toFixed(2).replace('.', ',')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-8">
                            <Button type="submit" form="compra-form" size="lg">Registrar Compra</Button>
                        </div>
                    </GenericForm>
                </CardContent>
            </Card>
        </CenteredLayout>
    );
}
