// app/dashboard/estoque/page.tsx
"use client"

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";

import { CenteredLayout } from "@/components/centered-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Produto, subscribeToProdutos } from "@/lib/services/produtos.services";
import { registrarMovimentacao } from "@/lib/services/estoque.services";

const movimentacaoFormSchema = z.object({
    produtoId: z.string().min(1, "Selecione um produto."),
    tipo: z.enum(["entrada", "saida"], { required_error: "Selecione o tipo."}),
    quantidade: z.coerce.number().positive("A quantidade deve ser positiva."),
    motivo: z.string().optional(),
});

type MovimentacaoFormValues = z.infer<typeof movimentacaoFormSchema>;

export default function EstoquePage() {
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const form = useForm<MovimentacaoFormValues>({
        resolver: zodResolver(movimentacaoFormSchema),
    });

    useEffect(() => {
        const unsubscribe = subscribeToProdutos(setProdutos);
        return () => unsubscribe();
    }, []);

    const onSubmit = async (values: MovimentacaoFormValues) => {
        const produtoSelecionado = produtos.find(p => p.id === values.produtoId);
        if (!produtoSelecionado) {
            toast.error("Produto selecionado é inválido.");
            return;
        }

        try {
            await registrarMovimentacao({
                ...values,
                produtoNome: produtoSelecionado.nome,
            });
            toast.success("Movimentação de estoque registrada com sucesso!");
            form.reset();
        } catch (error: any) {
            toast.error("Erro ao registrar movimentação.", {
                description: error.message,
            });
        }
    };

    const columns: ColumnDef<Produto>[] = [
        { accessorKey: "nome", header: "Produto" },
        {
            accessorKey: "quantidade",
            header: "Quantidade em Estoque",
            cell: ({ row }) => {
                const produto = row.original;
                return `${produto.quantidade || 0} ${produto.unidadeDeMedida.toUpperCase()}`;
            }
        },
    ];

    return (
        <CenteredLayout>
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Registrar Movimentação de Estoque</CardTitle>
                        <CardDescription>Use este formulário para registrar entradas e saídas manuais.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <GenericForm schema={movimentacaoFormSchema} onSubmit={onSubmit} formId="movimentacao-form" form={form}>
                            <FormField name="produtoId" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Produto</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger></FormControl>
                                        <SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id!}>{p.nome}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField name="quantidade" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantidade</FormLabel>
                                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField name="tipo" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Movimentação</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="entrada"><IconArrowUp className="inline-block h-4 w-4 mr-2 text-green-500"/>Entrada</SelectItem>
                                                <SelectItem value="saida"><IconArrowDown className="inline-block h-4 w-4 mr-2 text-red-500"/>Saída</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                             <FormField name="motivo" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Motivo (Opcional)</FormLabel>
                                    <FormControl><Input placeholder="Ex: Ajuste de inventário, Venda balcão" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="flex justify-end pt-4">
                                <Button type="submit" form="movimentacao-form">Registrar</Button>
                            </div>
                        </GenericForm>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Estoque Atual</CardTitle></CardHeader>
                    <CardContent><GenericTable columns={columns} data={produtos} /></CardContent>
                </Card>
            </div>
        </CenteredLayout>
    );
}
