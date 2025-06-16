// app/dashboard/relatorios/page.tsx
"use client"

import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { DateRange } from "react-day-picker"
import { toast } from "sonner"
import { format } from "date-fns"

import { CenteredLayout } from "@/components/centered-layout"
import { GenericTable } from "@/components/generic-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DateRangePicker } from "@/components/date-range-picker"
import { getMovimentacoesPorPeriodo } from "@/lib/services/relatorios.services"
import { Movimentacao } from "@/lib/services/estoque.services"
import { Badge } from "@/components/ui/badge"

export default function RelatoriosPage() {
    const [date, setDate] = useState<DateRange | undefined>();
    const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateReport = async () => {
        if (!date?.from || !date?.to) {
            toast.error("Por favor, selecione um período de início e fim.");
            return;
        }

        setIsLoading(true);
        try {
            const data = await getMovimentacoesPorPeriodo(date.from, date.to);
            setMovimentacoes(data);
            if(data.length === 0) {
              toast.info("Nenhuma movimentação encontrada para o período selecionado.");
            }
        } catch (error) {
            toast.error("Erro ao gerar o relatório.");
        } finally {
            setIsLoading(false);
        }
    };

   const columns: ColumnDef<Movimentacao>[] = [
    {
        accessorKey: "data",
        header: "Data",
        cell: ({ row }) => {
            const data = row.original.data;
            return data ? format(data, "dd/MM/yyyy HH:mm") : "N/A";
        }
        },
        { accessorKey: "produtoNome", header: "Produto" },
        {
            accessorKey: "tipo",
            header: "Tipo",
            cell: ({ row }) => (
                <Badge variant={row.original.tipo === 'entrada' ? 'default' : 'destructive'} className="capitalize">
                    {row.original.tipo}
                </Badge>
            )
        },
        { accessorKey: "quantidade", header: "Quantidade" },
        { accessorKey: "motivo", header: "Motivo" },
    ];

    return (
        <CenteredLayout>
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Relatório de Movimentações</CardTitle>
                        <CardDescription>Selecione um período para visualizar todas as entradas e saídas do estoque.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-end gap-4">
                        <div className="grid gap-2">
                           <span className="text-sm font-medium">Período</span>
                           <DateRangePicker date={date} onDateChange={setDate} />
                        </div>
                        <Button onClick={handleGenerateReport} disabled={isLoading}>
                            {isLoading ? "Gerando..." : "Gerar Relatório"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Resultados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <GenericTable columns={columns} data={movimentacoes} />
                    </CardContent>
                </Card>
            </div>
        </CenteredLayout>
    );
}
