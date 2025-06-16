// src/app/layout.tsx
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import { Toaster } from 'sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className="bg-neutral-100 text-neutral-900 antialiased dark:bg-[#0f0f0f] dark:text-neutral-200">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
        {children}
        <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
