"use client"

import * as React from "react"
import { Pie, PieChart, Cell } from "recharts"
import { IconChartPie } from "@tabler/icons-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const chartConfig = {
  a_vista: { label: "À Vista", color: "hsl(var(--chart-1))" },
  a_prazo: { label: "A Prazo", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig

interface ChartVendasCondicaoProps {
    data: { name: string; value: number; fill: string }[];
}

export function ChartVendasCondicao({ data }: ChartVendasCondicaoProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Vendas por Condição (Mês Atual)</CardTitle>
        <CardDescription>
            Proporção de vendas à vista vs. a prazo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data && data.reduce((acc, item) => acc + item.value, 0) > 0 ? (
          <ChartContainer config={chartConfig} className="aspect-square h-[180px] w-full">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
        ) : (
            <div className="flex flex-col items-center justify-center h-[180px] bg-muted/50 rounded-lg">
                <IconChartPie size={48} className="text-muted-foreground/50 mb-2"/>
                <p className="text-sm text-muted-foreground">Nenhuma venda registrada no período.</p>
            </div>
        )}
      </CardContent>
    </Card>
  )
}
