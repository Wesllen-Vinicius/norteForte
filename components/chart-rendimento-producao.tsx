"use client"

import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ChartRendimentoProducaoProps {
    data: { produzido: number; perdas: number; rendimento: number; totais: any };
}

export function ChartRendimentoProducao({ data }: ChartRendimentoProducaoProps) {
  const total = data.produzido + data.perdas;
  // Determina a unidade principal que está sendo exibida
  const unidadeExibida = Object.keys(data.totais?.produzido)[0] || 'N/A';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendimento da Produção (Últimos 30 dias)</CardTitle>
        <CardDescription>
            Análise do total de produtos gerados em comparação com as perdas.
            <span className="font-semibold text-primary"> (Exibindo totais para unidade: {unidadeExibida.toUpperCase()})</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="rounded-lg border bg-card p-3">
                <p className="text-sm text-muted-foreground">Total Produzido</p>
                <p className="text-xl font-bold text-green-500">{data.produzido.toFixed(2)} {unidadeExibida}</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
                <p className="text-sm text-muted-foreground">Total de Perdas</p>
                <p className="text-xl font-bold text-destructive">{data.perdas.toFixed(2)} {unidadeExibida}</p>
            </div>
             <div className="rounded-lg border bg-card p-3">
                <p className="text-sm text-muted-foreground">Peso Total (Bruto)</p>
                <p className="text-xl font-bold">{total.toFixed(2)} {unidadeExibida}</p>
            </div>
        </div>
        <div>
            <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-muted-foreground">Rendimento Geral</span>
                 <span className="text-base font-bold text-primary">{data.rendimento.toFixed(1)}%</span>
            </div>
            <Progress value={data.rendimento} className="h-3" />
        </div>
      </CardContent>
    </Card>
  )
}
