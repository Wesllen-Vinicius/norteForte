// components/auth-guard.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { LoadingIndicator } from './loading-indicator'; // Usaremos um indicador de carregamento

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // **Correção:** Agora também observamos o isLoading
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    // Só toma uma decisão DEPOIS que o carregamento inicial terminar
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // **Correção:** Exibe um loader enquanto a verificação está em andamento
  if (isLoading) {
    return <LoadingIndicator />;
  }

  // Se o carregamento terminou e o usuário existe, mostra a página
  if (user) {
    return <>{children}</>;
  }

  // Se o carregamento terminou e não há usuário, o useEffect já redirecionou.
  // Retornar null evita a renderização da página antiga por um instante.
  return null;
}
