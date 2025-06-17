"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { IconChartArea } from "@tabler/icons-react";

const chartConfig = {
  entradas: {
    label: "Entradas",
    color: "hsl(var(--chart-2))",
  },
  saidas: {
    label: "Saídas",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig

interface ChartAreaInteractiveProps {
    data: {
        date: string;
        entradas: number;
        saidas: number;
    }[];
}

export function ChartAreaInteractive({ data }: ChartAreaInteractiveProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimentações de Estoque (Últimos 30 dias)</CardTitle>
        <CardDescription>
          Visualização das entradas e saídas diárias de produtos.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {data && data.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={data}>
              <defs>
                <linearGradient id="fillEntradas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-entradas)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-entradas)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillSaidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-saidas)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-saidas)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => format(new Date(value), "dd/MM")}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Area dataKey="saidas" type="natural" fill="url(#fillSaidas)" stroke="var(--color-saidas)" stackId="a" />
              <Area dataKey="entradas" type="natural" fill="url(#fillEntradas)" stroke="var(--color-entradas)" stackId="a" />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[250px] bg-muted/50 rounded-lg">
            <IconChartArea size={48} className="text-muted-foreground/50 mb-2"/>
            <p className="text-sm text-muted-foreground">Sem dados de movimentação no período.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
