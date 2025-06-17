"use client"

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { ChartBarTopProducts } from "@/components/chart-bar-top-products";
import { SectionCards } from "@/components/section-cards";
import { getDashboardStats, getMovimentacoesParaGrafico, getProdutosMaisVendidos } from "@/lib/services/dashboard.services";
import { Skeleton } from "@/components/ui/skeleton";

// Tipos para os dados do estado
type Stats = {
  totalFuncionarios: number;
  totalProdutos: number;
  totalClientes: number;
  totalVendasMes: number;
};

type MovimentacoesChartData = {
  date: string;
  entradas: number;
  saidas: number;
}[];

type TopProductsChartData = {
    nome: string;
    quantidade: number;
}[];

export default function Page() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [movimentacoesData, setMovimentacoesData] = useState<MovimentacoesChartData>([]);
  const [topProductsData, setTopProductsData] = useState<TopProductsChartData>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Busca todos os dados do dashboard em paralelo
        const [statsData, movData, topProdData] = await Promise.all([
          getDashboardStats(),
          getMovimentacoesParaGrafico(),
          getProdutosMaisVendidos()
        ]);
        setStats(statsData);
        setMovimentacoesData(movData);
        setTopProductsData(topProdData);
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        toast.error("Não foi possível carregar os dados do dashboard.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Exibe o skeleton enquanto os dados estão sendo carregados
  if (isLoading) {
    return (
        <div className="flex flex-col gap-6 py-6">
            <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 lg:px-6">
                <Skeleton className="h-[340px]" />
                <Skeleton className="h-[340px]" />
            </div>
        </div>
    )
  }

  // Renderiza o dashboard com os dados carregados
  return (
    <div className="flex flex-col gap-6 py-6">
      {stats && <SectionCards stats={stats} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 lg:px-6">
        <ChartAreaInteractive data={movimentacoesData} />
        <ChartBarTopProducts data={topProductsData} />
      </div>
    </div>
  )
}
