"use client";

import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { LoadingIndicator } from './loading-indicator';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    // Se o carregamento terminou e NÃO há usuário, a única ação é redirecionar.
    if (!isLoading && !user) {
      redirect('/login');
    }
  }, [user, isLoading]);

  // 1. ESTADO DE CARREGAMENTO:
  // Enquanto o Firebase está verificando o usuário (isLoading é true),
  // a aplicação DEVE exibir uma tela de carregamento.
  // Isso impede que qualquer página interna tente carregar e acessar o banco de dados.
  if (isLoading) {
    return <LoadingIndicator />;
  }

  // 2. ESTADO AUTENTICADO:
  // Apenas se o carregamento terminou E temos um usuário,
  // renderizamos a página solicitada.
  if (user) {
    return <>{children}</>;
  }

  // 3. ESTADO NÃO AUTENTICADO:
  // Se o carregamento terminou e não há usuário, não renderizamos nada.
  // O `useEffect` acima já cuidou do redirecionamento.
  return null;
}
