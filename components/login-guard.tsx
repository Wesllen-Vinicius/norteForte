// components/login-guard.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { LoadingIndicator } from './loading-indicator';

/**
 * Componente "guardião" para a página de login.
 * - Exibe um indicador de carregamento enquanto o estado de autenticação é verificado.
 * - Redireciona usuários já autenticados para o dashboard.
 * - Renderiza a página de login apenas para usuários não autenticados.
 */
export function LoginGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    // Se o carregamento terminou e o usuário EXISTE, redireciona para o dashboard.
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // Enquanto o estado de autenticação está sendo verificado, exibe o loader principal.
  if (isLoading) {
    return <LoadingIndicator />;
  }

  // Se o carregamento terminou e NÃO há usuário, renderiza o conteúdo da página (o formulário de login).
  if (!user) {
    return <>{children}</>;
  }

  // Se o carregamento terminou e HÁ um usuário, não renderiza nada, pois o useEffect já tratou do redirecionamento.
  return null;
}
