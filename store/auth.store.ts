import { create } from 'zustand';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useDataStore } from './data.store'; // Importa a DataStore

interface AuthState {
  user: User | null;
  role: 'ADMINISTRADOR' | 'USUARIO' | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  initializeAuthListener: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true,
  setUser: (user) => set({ user }),

  initializeAuthListener: () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Se o usuário está logado, inicializa os listeners de dados
        useDataStore.getState().initializeSubscribers();

        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          set({ user: user, role: userDoc.data().role, isLoading: false });
        } else {
          set({ user: user, role: null, isLoading: false });
        }
      } else {
        useDataStore.getState().clearSubscribers();

        set({ user: null, role: null, isLoading: false });
      }
    });
    return unsubscribe;
  },
}));
