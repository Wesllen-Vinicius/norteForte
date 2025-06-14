// src/components/Header.tsx
'use client'

import { FiBell, FiLogOut } from 'react-icons/fi'
import DarkModeToggle from './DarkModeToggle'
import { useAuthStore } from '@/store/authStore'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { useFeedbackStore } from '@/store/feedbackStore'; // Importe a store de feedback

export default function Header() {
  const clearUser = useAuthStore((state) => state.clearUser)
  const setFeedback = useFeedbackStore((state) => state.setFeedback); // Obtenha a função setFeedback
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      clearUser()
      setFeedback('Logout realizado com sucesso!', 'success'); // Exibe mensagem de sucesso
      router.push('/login')
    } catch (error: any) {
      console.error("Erro ao fazer logout:", error.message)
      setFeedback(`Erro ao fazer logout: ${error.message}`, 'error'); // Exibe mensagem de erro
    }
  }

  return (
    <header className="h-12 bg-white border-b border-neutral-200 px-4 flex items-center justify-between text-sm text-neutral-700 select-none
                    dark:bg-[#1a1a1a] dark:border-neutral-800 dark:text-neutral-300">
      <div className="font-semibold tracking-tight">Dashboard Operacional</div>

      <div className="flex items-center gap-4">
        {/* Notificações */}
        <button
          className="text-neutral-600 hover:text-neutral-900 transition-colors duration-200 text-lg
                     dark:text-neutral-400 dark:hover:text-white"
          aria-label="Notificações"
        >
          <FiBell />
        </button>

        {/* Toggle dark mode */}
        <DarkModeToggle />

        {/* Botão de Logout */}
        <button
          onClick={handleLogout}
          className="text-neutral-600 hover:text-neutral-900 transition-colors duration-200 text-lg
                     dark:text-neutral-400 dark:hover:text-white"
          aria-label="Sair"
        >
          <FiLogOut />
        </button>

        {/* Avatar / Usuário */}
        <div className="w-8 h-8 rounded-full bg-neutral-300 flex items-center justify-center text-xs font-medium text-neutral-700
                    dark:bg-neutral-700 dark:text-white">
          N
        </div>
      </div>
    </header>
  )
}
