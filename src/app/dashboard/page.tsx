// src/app/dashboard/page.tsx
'use client'

import Card from '@/components/Card'
import PageContainer from '@/components/PageContainer'
import { useState, useEffect } from 'react'
import { useFeedbackStore } from '@/store/feedbackStore';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import Skeleton from '@/components/Skeleton'; // Importe o componente Skeleton

// Interfaces para os dados simulados
interface DashboardSummary {
  employees: number;
  clients: number;
  productsInStock: number;
  availableBalance: number; // Em centavos para evitar problemas de ponto flutuante, ou string para formato monetário
}

export default function HomePage() {
  const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);

  const setFeedback = useFeedbackStore((state) => state.setFeedback);

  useEffect(() => {
    const fetchSummaryData = async () => {
      try {
        setLoadingSummary(true);
        setErrorSummary(null);

        // --- Simulação de Busca de Dados do Firebase Firestore ---
        // Em um cenário real, você buscaria dados de coleções específicas.
        // Exemplo: Buscar contagens de documentos
        // const employeesRef = collection(db, 'funcionarios');
        // const employeesSnapshot = await getDocs(employeesRef);
        // const employeesCount = employeesSnapshot.size;

        // const clientsRef = collection(db, 'clientes');
        // const clientsSnapshot = await getDocs(clientsRef);
        // const clientsCount = clientsSnapshot.size;

        // Simulação de delay de rede
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Dados estáticos temporários ou resultados da simulação/Firestore
        setSummaryData({
          employees: 42, // Ou employeesCount
          clients: 123,  // Ou clientsCount
          productsInStock: 1250,
          availableBalance: 18450.00, // Ou um valor real do seu backend/Firestore
        });

        setFeedback('Dados do dashboard carregados!', 'success', 2000);

      } catch (err: any) {
        console.error("Erro ao carregar dados do dashboard:", err);
        setErrorSummary('Não foi possível carregar os dados do dashboard.');
        setFeedback(`Erro: ${err.message || 'Não foi possível carregar os dados.'}`, 'error');
      } finally {
        setLoadingSummary(false);
      }
    };

    fetchSummaryData();
  }, [setFeedback]);

  return (
    <PageContainer title="Dashboard Operacional">
      {loadingSummary ? (
        // Substituindo o spinner por Skeleton para os cards e seções
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
                <Skeleton className="mb-2" width="60%" height="h-4" /> {/* Título do Card */}
                <Skeleton width="80%" height="h-8" /> {/* Valor do Card */}
              </div>
            ))}
          </div>

          {/* Skeletons para as seções secundárias */}
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-neutral-200 rounded-lg p-6 h-64 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
              <Skeleton className="mb-4" width="40%" height="h-4" /> {/* Título da Seção */}
              <Skeleton count={3} className="mb-2" /> {/* Conteúdo da Seção */}
              <Skeleton width="70%" />
            </div>
            <div className="bg-white border border-neutral-200 rounded-lg p-6 h-64 shadow-sm dark:bg-neutral-900 dark:border-neutral-800">
              <Skeleton className="mb-4" width="40%" height="h-4" /> {/* Título da Seção */}
              <Skeleton count={3} className="mb-2" /> {/* Conteúdo da Seção */}
              <Skeleton width="70%" />
            </div>
          </div>
        </>
      ) : errorSummary ? (
        <div className="flex justify-center items-center h-40 text-red-500 dark:text-red-400 border border-red-500 p-4 rounded-md">
          <p className="text-lg">{errorSummary}</p>
        </div>
      ) : (
        <>
          {/* Resumos principais - Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card title="Funcionários" value={summaryData?.employees || '0'} />
            <Card title="Clientes" value={summaryData?.clients || '0'} />
            <Card title="Produtos em estoque" value={summaryData?.productsInStock || '0'} />
            <Card title="Saldo disponível" value={`R$ ${summaryData?.availableBalance?.toFixed(2).replace('.', ',') || '0,00'}`} />
          </div>

          {/* Seções secundárias - Gráficos e Atividades */}
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-neutral-200 rounded-lg p-6 h-64 shadow-sm
                          dark:bg-neutral-900 dark:border-neutral-800">
              <p className="text-sm text-neutral-600 mb-2 dark:text-neutral-400">Visão Geral</p>
              <div className="text-neutral-800 text-lg dark:text-white">[Gráfico de Vendas/Lucro Mensal, etc.]</div>
            </div>
            <div className="bg-white border border-neutral-200 rounded-lg p-6 h-64 shadow-sm
                          dark:bg-neutral-900 dark:border-neutral-800">
              <p className="text-sm text-neutral-600 mb-2 dark:text-neutral-400">Atividades Recentes</p>
              <div className="text-neutral-800 text-lg dark:text-white">[Logs de atividades, notificações importantes]</div>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
