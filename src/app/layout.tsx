// src/app/layout.tsx
import '../styles/globals.css';
import FeedbackPopup from '@/components/FeedbackPopup';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Remover a classe 'dark' daqui. O DarkModeToggle irá adicioná-la/removê-la.
    <html lang="pt-BR">
      <body className="bg-neutral-100 text-neutral-900 antialiased dark:bg-[#0f0f0f] dark:text-neutral-200">
        {children}
        <FeedbackPopup />
      </body>
    </html>
  );
}
