"use client"

import { useEffect, useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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

import { Produto, subscribeToProdutos } from "@/lib/services/produtos.services";
import { Funcionario, subscribeToFuncionarios } from "@/lib/services/funcionarios.services";
import { producaoSchema, registrarProducao } from "@/lib/services/producao.services";

type ProducaoFormValues = z.infer<typeof producaoSchema>;

export default function ProducaoPage() {
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

    const produtosParaVenda = useMemo(() => produtos.filter(p => p.tipoProduto === 'VENDA'), [produtos]);

    const form = useForm<ProducaoFormValues>({
        resolver: zodResolver(producaoSchema),
        defaultValues: { responsavelId: "", produtos: [] },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "produtos",
    });

    useEffect(() => {
        const unsubProdutos = subscribeToProdutos(setProdutos);
        const unsubFuncionarios = subscribeToFuncionarios(setFuncionarios);
        return () => {
            unsubProdutos();
            unsubFuncionarios();
        };
    }, []);

    const handleAddProduto = () => {
        append({ produtoId: "", quantidade: 0, produtoNome: "" });
    };

    const onSubmit = async (values: ProducaoFormValues) => {
       try {
            const producaoData = {
                ...values,
                produtos: values.produtos.map(p => ({
                    ...p,
                    produtoNome: produtos.find(prod => prod.id === p.produtoId)?.nome || "N/A"
                }))
            };
            await registrarProducao(producaoData);
            toast.success("Lote de produção registrado com sucesso!");
            form.reset();
            remove();
       } catch (error: any) {
           toast.error("Falha ao registrar produção", { description: error.message });
       }
    };

    return (
        <CenteredLayout>
            <Card>
                <CardHeader>
                    <CardTitle>Registrar Produção</CardTitle>
                    <CardDescription>Preencha os dados do lote para dar entrada dos produtos no estoque.</CardDescription>
                </CardHeader>
                <CardContent>
                    <GenericForm schema={producaoSchema} onSubmit={onSubmit} formId="producao-form" form={form}>
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField name="responsavelId" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Responsável</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione um funcionário" /></SelectTrigger></FormControl>
                                        <SelectContent>{funcionarios.map(f => <SelectItem key={f.id} value={f.id!}>{f.nomeCompleto}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField name="lote" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Lote (Opcional)</FormLabel>
                                    <FormControl><Input placeholder="Ex: LT-2025-06-15" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField name="descricao" control={form.control} render={({ field }) => (
                            <FormItem className="mt-4">
                                <FormLabel>Descrição (Opcional)</FormLabel>
                                <FormControl><Input placeholder="Detalhes da produção" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <Separator className="my-6" />

                        <div className="space-y-4">
                            <FormLabel>Produtos Gerados</FormLabel>
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-start">
                                    <FormField name={`produtos.${index}.produtoId`} control={form.control} render={({ field }) => (
                                        <FormItem>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger></FormControl>
                                                <SelectContent>{produtosParaVenda.map(p => <SelectItem key={p.id} value={p.id!}>{p.nome}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField name={`produtos.${index}.quantidade`} control={form.control} render={({ field }) => (
                                        <FormItem>
                                            <FormControl><Input type="number" placeholder="Qtd" className="w-24" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                        <IconTrash className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                             <Button type="button" variant="outline" size="sm" onClick={handleAddProduto}>
                                <IconPlus className="mr-2 h-4 w-4" /> Adicionar Produto
                            </Button>
                        </div>

                        <div className="flex justify-end pt-6">
                            <Button type="submit" form="producao-form">Registrar Produção</Button>
                        </div>
                    </GenericForm>
                </CardContent>
            </Card>
        </CenteredLayout>
    );
}
