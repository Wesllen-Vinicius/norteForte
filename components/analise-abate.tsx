"use client"

import { useState } from "react"
import { DateRange } from "react-day-picker"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/date-range-picker"
import { Button } from "@/components/ui/button"
import { getMovimentacoesPorPeriodo } from "@/lib/services/relatorios.services"
import { Progress } from "@/components/ui/progress"
import { Badge } from "./ui/badge"

interface AnaliseResult {
    totalProduzido: number;
    totalAbatido: number;
    rendimentoPercentual: number;
}

export function AnaliseAbate() {
    const [date, setDate] = useState<DateRange | undefined>();
    const [resultado, setResultado] = useState<AnaliseResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateAnalysis = async () => {
        if (!date?.from || !date?.to) {
            toast.error("Por favor, selecione um período de início e fim.");
            return;
        }

        setIsLoading(true);
        setResultado(null);
        try {
            // Simulação da lógica de busca e cálculo
            // Em um caso real, você buscaria os totais de abate e produção do período
            const movimentacoes = await getMovimentacoesPorPeriodo(date.from, date.to);

            const totalProduzido = movimentacoes
                .filter(m => m.tipo === 'entrada' && m.motivo?.includes('Produção'))
                .reduce((acc, m) => acc + m.quantidade, 0);

            // Esta parte é uma SIMULAÇÃO. O ideal é buscar da coleção 'abates'
            // Assumindo que 1 animal = 250kg de carcaça para cálculo
            const totalAbatido = totalProduzido / 0.75; // Simula um rendimento de 75%

            if (totalAbatido === 0) {
                toast.info("Nenhum dado de produção ou abate encontrado para o período.");
                setResultado({ totalProduzido: 0, totalAbatido: 0, rendimentoPercentual: 0 });
                return;
            }

            const rendimentoPercentual = (totalProduzido / totalAbatido) * 100;

            setResultado({ totalProduzido, totalAbatido, rendimentoPercentual });

        } catch (error) {
            toast.error("Erro ao gerar a análise.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Análise de Rendimento (Abate vs. Produção)</CardTitle>
                <CardDescription>
                    Compare o peso total de carcaças (abates) com o peso total de produtos acabados (produção) em um período.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-end gap-4 mb-6">
                    <div className="grid gap-2 w-full sm:w-auto">
                        <span className="text-sm font-medium">Período da Análise</span>
                        <DateRangePicker date={date} onDateChange={setDate} />
                    </div>
                    <Button onClick={handleGenerateAnalysis} disabled={isLoading} className="w-full sm:w-auto">
                        {isLoading ? "Analisando..." : "Gerar Análise"}
                    </Button>
                </div>

                {resultado && (
                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Total Abatido (Peso Carcaça)</span>
                            <span className="font-mono text-lg">{resultado.totalAbatido.toFixed(2)} kg</span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="font-medium">Total Produzido (Produtos Finais)</span>
                            <span className="font-mono text-lg">{resultado.totalProduzido.toFixed(2)} kg</span>
                        </div>
                        <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                <span className="font-medium text-primary">Rendimento Real</span>
                                <Badge variant="default" className="text-base">{resultado.rendimentoPercentual.toFixed(2)}%</Badge>
                             </div>
                             <Progress value={resultado.rendimentoPercentual} className="h-4" />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
