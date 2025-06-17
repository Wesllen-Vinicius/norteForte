"use client"

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { ChartBarTopProducts } from "@/components/chart-bar-top-products";
import { SectionCards } from "@/components/section-cards";
import { getDashboardStats, getMovimentacoesParaGrafico, getProdutosMaisVendidos } from "@/lib/services/dashboard.services";
import { Skeleton } from "@/components/ui/skeleton";

type Stats = {
  totalFuncionarios: number;
  totalProdutos: number;
  totalClientes: number;
  totalVendasMes: number;
};

type MovimentacoesChartData = { date: string; entradas: number; saidas: number; }[];
type TopProductsChartData = { nome: string; quantidade: number; }[];

export default function Page() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [movimentacoesData, setMovimentacoesData] = useState<MovimentacoesChartData>([]);
  const [topProductsData, setTopProductsData] = useState<TopProductsChartData>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
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
        setStats(null);
        setMovimentacoesData([]);
        setTopProductsData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-6 py-6">
      {isLoading || !stats ? (
        <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <SectionCards stats={stats} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 lg:px-6">
        {isLoading ? <Skeleton className="h-[340px]" /> : <ChartAreaInteractive data={movimentacoesData} />}
        {isLoading ? <Skeleton className="h-[340px]" /> : <ChartBarTopProducts data={topProductsData} />}
      </div>
    </div>
  )
}
