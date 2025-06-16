"use client";

import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { LoadingIndicator } from './loading-indicator';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !user) {
      redirect('/login');
    }
  }, [user, isLoading]);

  // // Enquanto o estado de autenticação está sendo verificado, mostra o loading.
  // if (isLoading) {
  //   return <LoadingIndicator />;
  // }

  if (user) {
    return <>{children}</>;
  }

  return null;
}
