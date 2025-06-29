"use client";

import { create } from 'zustand';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useDataStore } from './data.store';

interface AuthState {
  user: User | null;
  role: 'ADMINISTRADOR' | 'USUARIO' | null;
  isLoading: boolean; // Será 'true' até que o user e a role estejam definidos
  initializeAuthListener: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true, // Inicia como true por padrão

  initializeAuthListener: () => {
    // Retorna a função de unsubscribe do listener do Firebase
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Usuário logado, busca a role no Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        const role = userDoc.exists() ? userDoc.data().role : null;

        // Atualiza o estado com o usuário e sua role
        set({ user, role, isLoading: false });

        // Inicializa a busca de dados da aplicação
        useDataStore.getState().initializeSubscribers();
      } else {
        // Usuário deslogado ou não autenticado
        // Limpa os dados de usuário e de dados da aplicação
        set({ user: null, role: null, isLoading: false });
        useDataStore.getState().clearSubscribers();
      }
    });

    return unsubscribe;
  },
}));
