// src/components/LoginFooter.tsx
export default function LoginFooter() {
  return (
    <footer className="absolute bottom-4 inset-x-0 text-center text-sm text-neutral-500
                    dark:text-neutral-500"> {/* Mantido o mesmo para o modo escuro, mas adicionei a classe para explicitar */}
      AshBorn Systems © {new Date().getFullYear()}
    </footer>
  )
}
