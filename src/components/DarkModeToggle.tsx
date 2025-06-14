// src/components/DarkModeToggle.tsx
'use client'

import { useEffect, useState } from 'react'
import { FiMoon, FiSun } from 'react-icons/fi'

export default function DarkModeToggle() {
  // Inicializa o estado 'dark' baseado no localStorage, ou como true (padrão escuro)
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme-dark');
      return saved ? JSON.parse(saved) : true; // Padrão para true se não houver nada salvo
    }
    return true; // Padrão no lado do servidor
  });

  useEffect(() => {
    // Adiciona ou remove a classe 'dark' no elemento <html>
    document.documentElement.classList.toggle('dark', dark);
    // Salva a preferência do usuário
    localStorage.setItem('theme-dark', JSON.stringify(dark));
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="text-neutral-600 hover:text-neutral-900 transition dark:text-neutral-400 dark:hover:text-white"
      aria-label="Alternar tema"
    >
      {dark ? <FiMoon className="text-xl" /> : <FiSun className="text-xl" />}
    </button>
  )
}
