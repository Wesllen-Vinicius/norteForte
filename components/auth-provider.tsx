"use client";

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { LoadingIndicator } from './loading-indicator';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initializeAuthListener = useAuthStore(
    (state) => state.initializeAuthListener
  );
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    const unsubscribe = initializeAuthListener();
    return () => unsubscribe();
  }, [initializeAuthListener]);

  // CORREÇÃO GLOBAL:
  // Enquanto o isLoading do authStore for verdadeiro, exibimos um
  // indicador de carregamento em tela cheia. Isso impede que qualquer
  // outra parte da aplicação renderize antes da hora.
  if (isLoading) {
    return <LoadingIndicator />;
  }

  // Apenas quando o carregamento terminar, renderizamos o conteúdo protegido.
  return <>{children}</>;
}
