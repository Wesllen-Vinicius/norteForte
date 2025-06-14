// src/app/dashboard/layout.tsx
'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore'; // Importe sua store Zustand
import { onAuthStateChanged } from 'firebase/auth'; // Importe onAuthStateChanged
import { auth } from '@/lib/firebase'; // Importe a instância de autenticação do Firebase
import Layout from '@/components/Layout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setUser, clearUser } = useAuthStore(); // Obtenha o estado e as funções da store
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user); // Atualiza a store se o usuário estiver logado
      } else {
        clearUser(); // Limpa a store se o usuário não estiver logado
        router.replace('/login'); // Redireciona para o login se não houver usuário autenticado
      }
    });

    // Limpeza do listener ao desmontar o componente
    return () => unsubscribe();
  }, [setUser, clearUser, router]);

  // Se não estiver autenticado, não renderiza o conteúdo do dashboard.
  // O redirecionamento será tratado pelo useEffect.
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f0f0f] text-neutral-200">
        Carregando ou redirecionando...
      </div>
    );
  }

  return <Layout>{children}</Layout>;
}
