// app/dashboard/page.tsx
"use client" // Adiciona esta linha para converter para Componente de Cliente

import { useState, useEffect } from "react";
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { getDashboardStats, getMovimentacoesParaGrafico } from "@/lib/services/dashboard.services";
import data from "./data.json"

// Define os tipos para o estado inicial
type Stats = {
  totalFuncionarios: number;
  totalProdutos: number;
  totalMovimentacoes: number;
};

type ChartData = {
  date: string;
  entradas: number;
  saidas: number;
}[];

export default function Page() {
  const [stats, setStats] = useState<Stats>({ totalFuncionarios: 0, totalProdutos: 0, totalMovimentacoes: 0 });
  const [chartData, setChartData] = useState<ChartData>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, chartData] = await Promise.all([
          getDashboardStats(),
          getMovimentacoesParaGrafico()
        ]);
        setStats(statsData);
        setChartData(chartData);
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <div>Carregando Dashboard...</div>
  }

  return (
    <>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards stats={stats} />
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive data={chartData} />
        </div>
        <DataTable data={data} />
      </div>
    </>
  )
}
