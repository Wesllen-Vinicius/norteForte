// components/auth-guard.tsx
"use client";

import { useEffect } from 'react';
import { useRouter, redirect } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { LoadingIndicator } from './loading-indicator';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, initializeAuthListener } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = initializeAuthListener();
    return () => unsubscribe();
  }, [initializeAuthListener]);

  useEffect(() => {
    if (!isLoading && !user) {
      redirect('/login');
    }
  }, [user, isLoading, router]);

  // Enquanto verifica o estado, mostra o novo indicador de progresso
  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (user) {
    return <>{children}</>;
  }

  return null;
}
