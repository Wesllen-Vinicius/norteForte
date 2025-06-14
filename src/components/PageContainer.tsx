// src/components/PageContainer.tsx

type PageContainerProps = {
  children: React.ReactNode
  title?: string
}

export default function PageContainer({ children, title }: PageContainerProps) {
  return (
    // Removido max-w-7xl para permitir que o conteúdo se estenda mais.
    // O w-full já garante que o container ocupe a largura total do seu pai.
    <div className="px-6 py-6 w-full">
      {title && (
        // Cores do título ajustadas para tema claro e escuro
        <h1 className="text-xl font-semibold text-neutral-800 mb-6 tracking-tight
                     dark:text-white">
          {title}
        </h1>
      )}
      {children}
    </div>
  )
}
