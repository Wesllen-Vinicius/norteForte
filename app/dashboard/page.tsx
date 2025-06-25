"use client"

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { ChartBarTopProducts } from "@/components/chart-bar-top-products";
import { SectionCards } from "@/components/section-cards";
import { getDashboardStats, getMovimentacoesParaGrafico, getProdutosMaisVendidos, getVendasPorCondicao, getProducaoResumoPeriodo } from "@/lib/services/dashboard.services";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartVendasCondicao } from "@/components/chart-vendas-condicao";
import { ChartRendimentoProducao } from "@/components/chart-rendimento-producao";

type Stats = {
  totalFuncionarios: number;
  totalProdutos: number;
  totalClientes: number;
  totalVendasMes: number;
  lucroBrutoMes: number;
  totalAPagar: number;
  totalAReceber: number;
};

type MovimentacoesChartData = { date: string; entradas: number; saidas: number; }[];
type TopProductsChartData = { nome: string; quantidade: number; }[];
type VendasCondicaoData = { name: string; value: number; fill: string; }[];

// CORREÇÃO: O tipo agora reflete a estrutura completa do retorno do serviço
type RendimentoProducaoData = {
  produzido: number;
  perdas: number;
  rendimento: number;
  totais: any;
};

export default function Page() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [movimentacoesData, setMovimentacoesData] = useState<MovimentacoesChartData>([]);
  const [topProductsData, setTopProductsData] = useState<TopProductsChartData>([]);
  const [vendasCondicaoData, setVendasCondicaoData] = useState<VendasCondicaoData>([]);
  const [rendimentoData, setRendimentoData] = useState<RendimentoProducaoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [statsData, movData, topProdData, vendasCondicao, rendimento] = await Promise.all([
          getDashboardStats(),
          getMovimentacoesParaGrafico(),
          getProdutosMaisVendidos(),
          getVendasPorCondicao(),
          getProducaoResumoPeriodo(),
        ]);
        setStats(statsData);
        setMovimentacoesData(movData);
        setTopProductsData(topProdData);
        setVendasCondicaoData(vendasCondicao);
        // CORREÇÃO: 'rendimento' agora é o objeto completo
        setRendimentoData(rendimento);
      } catch (error) {
        console.error("Erro ao buscar dados do dashboard:", error);
        toast.error("Não foi possível carregar os dados do dashboard.");
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-4 py-6">
      {isLoading || !stats ? (
        <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 lg:px-6">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <SectionCards stats={stats} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 px-4 lg:px-6">
        <div className="xl:col-span-2">
            {isLoading ? <Skeleton className="h-[260px]" /> : <ChartAreaInteractive data={movimentacoesData} />}
        </div>
        <div>
            {isLoading ? <Skeleton className="h-[260px]" /> : <ChartBarTopProducts data={topProductsData} />}
        </div>
        <div>
            {isLoading ? <Skeleton className="h-[260px]" /> : <ChartVendasCondicao data={vendasCondicaoData} />}
        </div>
      </div>
      <div className="grid grid-cols-1 px-4 lg:px-6">
        {isLoading || !rendimentoData ? <Skeleton className="h-[180px]" /> : <ChartRendimentoProducao data={rendimentoData} />}
      </div>
    </div>
  )
}
