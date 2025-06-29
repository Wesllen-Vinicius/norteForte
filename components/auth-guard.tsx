"use client";

import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  // Agora só pegamos o usuário. O isLoading é tratado pelo AuthProvider.
  const { user } = useAuthStore();

  useEffect(() => {
    // Se não houver usuário, a única ação é redirecionar para o login.
    if (!user) {
      redirect('/login');
    }
  }, [user]);

  // Se houver um usuário, renderizamos a página solicitada.
  if (user) {
    return <>{children}</>;
  }

  // Se não houver usuário, o useEffect acima já cuidou do redirecionamento.
  // Retornar null evita qualquer renderização desnecessária.
  return null;
}
