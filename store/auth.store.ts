// store/auth.store.ts
"use client";

import { create } from 'zustand';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useDataStore } from './data.store';

interface AuthState {
  user: User | null;
  role: 'ADMINISTRADOR' | 'USUARIO' | null;
  isLoading: boolean;
  initializeAuthListener: () => () => void;
  authUnsubscribe: (() => void) | null;
  firestoreUnsubscribe: (() => void) | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  isLoading: true, // Começa como true por padrão
  authUnsubscribe: null,
  firestoreUnsubscribe: null,

  initializeAuthListener: () => {
    if (get().authUnsubscribe) return () => {};

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      get().firestoreUnsubscribe?.(); // Limpa o listener anterior do firestore

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);

        const firestoreUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            // **Ponto chave:** Atualiza user, role e finaliza o loading JUNTOS
            set({ user, role: userData.role, isLoading: false });
          } else {
            // Documento não existe, mas a verificação terminou
            set({ user, role: null, isLoading: false });
          }
          // Inicializa os outros dados da aplicação após a role ser definida
          useDataStore.getState().initializeSubscribers();
        }, (error) => {
            console.error("Erro ao observar o documento do usuário:", error);
            set({ user, role: null, isLoading: false });
        });

        set({ firestoreUnsubscribe });

      } else {
        // Usuário deslogado, verificação concluída
        set({ user: null, role: null, isLoading: false, firestoreUnsubscribe: null });
        useDataStore.getState().clearSubscribers();
      }
    });

    set({ authUnsubscribe });
    return authUnsubscribe;
  },
}));
