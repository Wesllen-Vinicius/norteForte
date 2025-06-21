// components/data-provider.tsx
"use client";

import { useEffect } from 'react';
import { useDataStore } from '@/store/data.store';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const initializeSubscribers = useDataStore(
    (state) => state.initializeSubscribers
  );

  useEffect(() => {
    initializeSubscribers();
  }, [initializeSubscribers]);

  return <>{children}</>;
}
