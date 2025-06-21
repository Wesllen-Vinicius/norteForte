// store/navigation.store.ts
import { create } from 'zustand';

interface NavigationState {
  isNavigating: boolean;
  setIsNavigating: (isNavigating: boolean) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  isNavigating: false,
  setIsNavigating: (isNavigating) => set({ isNavigating }),
}));
