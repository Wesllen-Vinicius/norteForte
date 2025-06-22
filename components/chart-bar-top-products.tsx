"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { IconChartBar } from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const chartConfig = {
  quantidade: {
    label: "Quantidade Vendida",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

interface ChartBarTopProductsProps {
    data: {
        nome: string;
        quantidade: number;
    }[];
}

export function ChartBarTopProducts({ data }: ChartBarTopProductsProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top 5 Produtos Mais Vendidos (Últimos 30 dias)</CardTitle>
        <CardDescription>
            Quantidade total vendida por produto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-[180px] w-full">
            <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="nome"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                width={100}
                className="text-sm"
              />
              <XAxis dataKey="quantidade" type="number" hide />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="quantidade" fill="var(--color-quantidade)" radius={4} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[180px] bg-muted/50 rounded-lg">
            <IconChartBar size={48} className="text-muted-foreground/50 mb-2"/>
            <p className="text-sm text-muted-foreground">Nenhuma venda registrada no período.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
