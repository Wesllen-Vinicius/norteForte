"use client"

import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthGuard } from '@/components/auth-guard';
import './globals.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/auth-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {isLoginPage ? children : <AuthGuard>{children}</AuthGuard>}
              <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
