"use client"

import { useEffect, useState, useMemo } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { format } from 'date-fns';
import { ColumnDef } from "@tanstack/react-table";
import { CenteredLayout } from "@/components/centered-layout";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { GenericTable } from "@/components/generic-table";
import { DatePicker } from "@/components/date-picker";
import { Produto, subscribeToProdutos } from "@/lib/services/produtos.services";
import { Funcionario, subscribeToFuncionarios } from "@/lib/services/funcionarios.services";
import { producaoSchema, registrarProducao, Producao, subscribeToProducoes } from "@/lib/services/producao.services";
import { Abate, subscribeToAbates } from "@/lib/services/abates.services";
import { Meta, subscribeToMetas } from "@/lib/services/metas.services";

type ProducaoFormValues = z.infer<typeof producaoSchema>;

const defaultFormValues: ProducaoFormValues = {
    data: new Date(),
    responsavelId: "",
    abateId: "",
    produtos: [],
    lote: "",
    descricao: "",
};

export default function ProducaoPage() {
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [abates, setAbates] = useState<Abate[]>([]);
    const [metas, setMetas] = useState<Meta[]>([]);
    const [producoes, setProducoes] = useState<Producao[]>([]);

    const produtosParaVenda = useMemo(() => produtos.filter(p => p.tipoProduto === 'VENDA'), [produtos]);

    const form = useForm<ProducaoFormValues>({
        resolver: zodResolver(producaoSchema),
        defaultValues: defaultFormValues,
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "produtos",
    });

    const watchedProdutos = useWatch({ control: form.control, name: 'produtos' });
    const selectedAbateId = useWatch({ control: form.control, name: 'abateId' });

    const abateSelecionado = useMemo(() => abates.find(a => a.id === selectedAbateId), [abates, selectedAbateId]);
    const animaisValidosParaProducao = abateSelecionado ? abateSelecionado.total - abateSelecionado.condenado : 0;

    useEffect(() => {
        const unsubProdutos = subscribeToProdutos(setProdutos);
        const unsubFuncionarios = subscribeToFuncionarios(setFuncionarios);
        const unsubAbates = subscribeToAbates(setAbates);
        const unsubMetas = subscribeToMetas(setMetas);
        const unsubProducoes = subscribeToProducoes(setProducoes);

        return () => {
            unsubProdutos();
            unsubFuncionarios();
            unsubAbates();
            unsubMetas();
            unsubProducoes();
        };
    }, []);

    const producoesComNomes = useMemo(() => {
        if (!producoes || producoes.length === 0) return [];
        return producoes.map(prod => ({
            ...prod,
            responsavelNome: funcionarios.find(f => f.id === prod.responsavelId)?.nomeCompleto || 'N/A',
        })).sort((a,b) => (b.data as Date).getTime() - (a.data as Date).getTime());
    }, [producoes, funcionarios]);

    const handleAddProduto = () => {
        append({ produtoId: "", quantidade: 0, produtoNome: "", perda: 0 });
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
            await registrarProducao(producaoData as Omit<Producao, 'id' | 'responsavelNome'>);
            toast.success("Lote de produção registrado com sucesso!");
            form.reset(defaultFormValues);
            remove();
       } catch (error: any) {
           toast.error("Falha ao registrar produção", { description: error.message });
       }
    };

    const columns: ColumnDef<Producao>[] = [
        { header: "Data", cell: ({ row }) => format(row.original.data as Date, 'dd/MM/yyyy') },
        { accessorKey: "responsavelNome", header: "Responsável" },
        { accessorKey: "lote", header: "Lote" },
        { header: "Nº Produtos", cell: ({ row }) => row.original.produtos.length },
    ];

    return (
        <CenteredLayout>
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Registrar Produção</CardTitle>
                        <CardDescription>Preencha os dados do lote para dar entrada dos produtos no estoque.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} id="producao-form" className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField name="data" control={form.control} render={({ field }) => (
                                        <FormItem className="flex flex-col"><FormLabel>Data da Produção</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField name="responsavelId" control={form.control} render={({ field }) => (
                                        <FormItem><FormLabel>Responsável</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione um funcionário" /></SelectTrigger></FormControl><SelectContent>{funcionarios.map(f => <SelectItem key={f.id} value={f.id!}>{f.nomeCompleto}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                    )} />
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField name="abateId" control={form.control} render={({ field }) => (
                                        <FormItem><FormLabel>Vincular Abate</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione um abate" /></SelectTrigger></FormControl><SelectContent>{abates.map(a => <SelectItem key={a.id} value={a.id!}>{`ID: ...${a.id?.slice(-4)} - Data: ${format(a.data, "dd/MM/yy")}`}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                    )} />
                                    <FormField name="lote" control={form.control} render={({ field }) => (
                                        <FormItem><FormLabel>Lote (Opcional)</FormLabel><FormControl><Input placeholder="Ex: LT-2025-06-15" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                                <FormField name="descricao" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Descrição (Opcional)</FormLabel><FormControl><Input placeholder="Detalhes da produção" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />

                                <Separator className="my-6" />

                                <div className="space-y-4">
                                    <FormLabel>Produtos Gerados</FormLabel>
                                    {fields.map((field, index) => {
                                        const metaProduto = metas.find(m => m.produtoId === watchedProdutos[index]?.produtoId);
                                        const metaEsperada = metaProduto ? animaisValidosParaProducao * metaProduto.metaPorAnimal : 0;
                                        const quantidadeProduzida = watchedProdutos[index]?.quantidade || 0;
                                        const rendimento = metaEsperada > 0 ? ((quantidadeProduzida / metaEsperada) * 100) : 0;

                                        return (
                                            <div key={field.id} className="p-4 border rounded-md space-y-3">
                                                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-start">
                                                    <FormField name={`produtos.${index}.produtoId`} control={form.control} render={({ field }) => (
                                                        <FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger></FormControl><SelectContent>{produtosParaVenda.map(p => <SelectItem key={p.id} value={p.id!}>{p.nome}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                                    )} />
                                                    <FormField name={`produtos.${index}.quantidade`} control={form.control} render={({ field }) => (
                                                        <FormItem><FormControl><Input type="number" step="0.01" placeholder="Qtd" className="w-24" {...field} /></FormControl><FormMessage /></FormItem>
                                                    )} />
                                                    <FormField name={`produtos.${index}.perda`} control={form.control} render={({ field }) => (
                                                        <FormItem><FormControl><Input type="number" step="0.01" placeholder="Perda" className="w-24" {...field} /></FormControl><FormMessage /></FormItem>
                                                    )} />
                                                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><IconTrash className="h-4 w-4" /></Button>
                                                </div>
                                                {abateSelecionado && metaEsperada > 0 && (
                                                    <FormDescription>
                                                        Meta esperada: {metaEsperada.toFixed(2)} {metaProduto?.unidade}. Rendimento: <span className={rendimento < 80 ? 'text-destructive' : 'text-green-600'}>{rendimento.toFixed(1)}%</span>
                                                    </FormDescription>
                                                )}
                                            </div>
                                        )
                                    })}
                                    <Button type="button" variant="outline" size="sm" onClick={handleAddProduto}>
                                        <IconPlus className="mr-2 h-4 w-4" /> Adicionar Produto
                                    </Button>
                                </div>

                                <div className="flex justify-end pt-6">
                                    <Button type="submit" form="producao-form">Registrar Produção</Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Histórico de Produção</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <GenericTable columns={columns} data={producoesComNomes} />
                    </CardContent>
                </Card>
            </div>
        </CenteredLayout>
    );
}
