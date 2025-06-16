// store/auth.store.ts
import { create } from 'zustand';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Vamos criar este arquivo a seguir

// Define a interface para o estado da nossa store
interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  initializeAuthListener: () => () => void; // Retorna a função de unsubscribe
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true, // Começa como true para sabermos que a verificação inicial está acontecendo
  setUser: (user) => set({ user }),

  // Esta função escuta as mudanças de autenticação do Firebase
  initializeAuthListener: () => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user: user, isLoading: false });
    });
    return unsubscribe; // Retorna o listener para que possamos limpá-lo
  },
}));
