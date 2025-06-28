"use client"

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { ColumnDef } from "@tanstack/react-table";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { DateRangePicker } from "@/components/date-range-picker";
import { Combobox } from "@/components/ui/combobox";
import { GenericTable } from "@/components/generic-table";
import { Badge } from "@/components/ui/badge";
import { useDataStore } from "@/store/data.store";
import { getMovimentacoesPorContaEPeriodo } from "@/lib/services/fluxoCaixa.services";

const filterSchema = z.object({
    contaId: z.string().min(1, "Selecione uma conta."),
    periodo: z.object({
        from: z.date(),
        to: z.date(),
    }).refine(data => data.from && data.to, { message: "Selecione um período válido." }),
});

type FilterFormValues = z.infer<typeof filterSchema>;

interface MovimentacaoBancaria {
    id: string;
    data: Date;
    motivo: string;
    tipo: 'credito' | 'debito';
    valor: number;
    saldoAnterior: number;
    saldoNovo: number;
}

export default function FluxoCaixaPage() {
    const { contasBancarias } = useDataStore();
    const [isLoading, setIsLoading] = useState(false);
    const [movimentacoes, setMovimentacoes] = useState<MovimentacaoBancaria[]>([]);
    const [saldoInicialPeriodo, setSaldoInicialPeriodo] = useState<number | null>(null);

    const form = useForm<FilterFormValues>({
        resolver: zodResolver(filterSchema),
        defaultValues: { contaId: "" }
    });

    const contasOptions = useMemo(() =>
        contasBancarias.map(c => ({ label: `${c.nomeConta} (Banco: ${c.banco})`, value: c.id! })),
    [contasBancarias]);

    const onSubmit = async (values: FilterFormValues) => {
        setIsLoading(true);
        setMovimentacoes([]);
        setSaldoInicialPeriodo(null);
        try {
            const data = await getMovimentacoesPorContaEPeriodo(values.contaId, values.periodo.from, values.periodo.to);
            setMovimentacoes(data);

            if(data.length > 0) {
                setSaldoInicialPeriodo(data[0].saldoAnterior);
            } else {
                 const contaSelecionada = contasBancarias.find(c => c.id === values.contaId);
                 if(contaSelecionada) {
                     setSaldoInicialPeriodo(contaSelecionada.saldoAtual || 0);
                 }
                toast.info("Nenhuma movimentação encontrada para esta conta no período selecionado.");
            }
        } catch (error) {
            toast.error("Erro ao buscar extrato.");
        } finally {
            setIsLoading(false);
        }
    };

    const columns: ColumnDef<MovimentacaoBancaria>[] = [
        { header: "Data", cell: ({ row }) => format(row.original.data, 'dd/MM/yyyy HH:mm') },
        { header: "Descrição", accessorKey: "motivo" },
        { header: "Tipo", cell: ({ row }) => (
            <Badge variant={row.original.tipo === 'credito' ? 'default' : 'destructive'} className="capitalize">
                {row.original.tipo}
            </Badge>
        )},
        { header: "Valor", cell: ({ row }) => `R$ ${row.original.valor.toFixed(2)}` },
        { header: "Saldo", cell: ({ row }) => `R$ ${row.original.saldoNovo.toFixed(2)}` },
    ];

    const saldoFinalPeriodo = movimentacoes.length > 0 ? movimentacoes[movimentacoes.length - 1].saldoNovo : saldoInicialPeriodo;

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Fluxo de Caixa / Extrato</CardTitle>
                    <CardDescription>Selecione a conta e o período para visualizar as movimentações.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row items-end gap-4">
                             <FormField
                                name="contaId"
                                control={form.control}
                                render={({ field }) => (
                                <FormItem className="w-full sm:w-auto flex-1">
                                    <FormLabel>Conta Bancária</FormLabel>
                                    <Combobox options={contasOptions} {...field} placeholder="Selecione uma conta" />
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                name="periodo"
                                control={form.control}
                                render={({ field }) => (
                                <FormItem className="w-full sm:w-auto">
                                    <FormLabel>Período</FormLabel>
                                    <DateRangePicker date={field.value} onDateChange={field.onChange} />
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                                {isLoading ? "Buscando..." : "Gerar Extrato"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {(movimentacoes.length > 0 || saldoInicialPeriodo !== null) && (
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                             <CardTitle>Extrato do Período</CardTitle>
                             <CardDescription>
                                 Conta: {contasOptions.find(c => c.value === form.getValues('contaId'))?.label}
                             </CardDescription>
                        </div>
                        <div className="text-right">
                             <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                             <p className="font-bold text-lg">R$ {saldoInicialPeriodo?.toFixed(2)}</p>
                        </div>
                         <div className="text-right">
                             <p className="text-sm text-muted-foreground">Saldo Final</p>
                             <p className="font-bold text-lg text-primary">R$ {saldoFinalPeriodo?.toFixed(2)}</p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <GenericTable columns={columns} data={movimentacoes} />
                    </CardContent>
                 </Card>
            )}
        </div>
    );
}
