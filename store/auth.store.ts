// store/auth.store.ts
import { create } from 'zustand';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

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
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          set({ user: user, role: userDoc.data().role, isLoading: false });
        } else {
          set({ user: user, role: null, isLoading: false });
        }
      } else {
        set({ user: null, role: null, isLoading: false });
      }
    });
    return unsubscribe;
  },
}));
