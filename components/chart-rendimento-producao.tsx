"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { IconCircleCheck, IconCircleX } from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const chartConfig = {
  produzido: { label: "Produzido", color: "hsl(var(--chart-1))", icon: IconCircleCheck },
  perdas: { label: "Perdas", color: "hsl(var(--chart-2))", icon: IconCircleX },
} satisfies ChartConfig

interface ChartRendimentoProducaoProps {
    data: { produzido: number; perdas: number; rendimento: number };
}

export function ChartRendimentoProducao({ data }: ChartRendimentoProducaoProps) {
  const chartData = [{ name: 'Rendimento', ...data }];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendimento da Produção (Últimos 30 dias)</CardTitle>
        <CardDescription>
            Total produzido vs. Perdas. Rendimento geral: <span className="font-bold text-primary">{data.rendimento.toFixed(1)}%</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart accessibilityLayer data={chartData} layout="vertical" stackOffset="expand">
                <XAxis type="number" hide />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="produzido" fill="var(--color-produzido)" stackId="a" radius={[4, 4, 4, 4]} />
                <Bar dataKey="perdas" fill="var(--color-perdas)" stackId="a" radius={[4, 4, 4, 4]} />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
