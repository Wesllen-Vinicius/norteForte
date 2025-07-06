import { create } from 'zustand';

interface NavigationState {
  isNavigating: boolean;
  activeItem: string;
  isMobileMenuOpen: boolean;
  expandedMenus: string[];
}

interface NavigationActions {
  setIsNavigating: (isNavigating: boolean) => void;
  setActiveItem: (item: string) => void;
  toggleMobileMenu: () => void;
  toggleMenu: (menu: string) => void;
}

type NavigationStore = NavigationState & NavigationActions;

export const useNavigationStore = create<NavigationStore>((set) => ({
  isNavigating: false,
  activeItem: 'dashboard',
  isMobileMenuOpen: false,
  expandedMenus: [],

  setIsNavigating: (isNavigating) => set({ isNavigating }),

  setActiveItem: (item) => set({ activeItem: item }),

  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),

  toggleMenu: (menu) => set((state) => ({
    expandedMenus: state.expandedMenus.includes(menu)
      ? state.expandedMenus.filter((m) => m !== menu)
      : [...state.expandedMenus, menu],
  })),
}));
