// src/store/feedbackStore.ts
import { create } from 'zustand';

interface FeedbackState {
  message: string | null;
  type: 'success' | 'error' | 'info' | null;
  show: boolean;
  timeoutId: NodeJS.Timeout | null;
  setFeedback: (message: string, type: 'success' | 'error' | 'info', duration?: number) => void;
  clearFeedback: () => void;
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  message: null,
  type: null,
  show: false,
  timeoutId: null,
  setFeedback: (message, type, duration = 3000) => {
    const { timeoutId } = get();
    if (timeoutId) {
      clearTimeout(timeoutId); // Limpa qualquer timeout anterior para nova mensagem
    }

    const newTimeoutId = setTimeout(() => {
      set({ message: null, type: null, show: false, timeoutId: null });
    }, duration);

    set({ message, type, show: true, timeoutId: newTimeoutId });
  },
  clearFeedback: () => {
    const { timeoutId } = get();
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    set({ message: null, type: null, show: false, timeoutId: null });
  },
}));
