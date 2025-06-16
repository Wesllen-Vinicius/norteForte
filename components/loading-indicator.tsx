// components/loading-indicator.tsx
"use client"

import * as React from "react"
import { Progress } from "@/components/ui/progress"

export function LoadingIndicator() {
  const [progress, setProgress] = React.useState(10)

  // Efeito para criar uma animação suave na barra de progresso
  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(Math.random() * 40 + 20), 500)
    const timer2 = setTimeout(() => setProgress(Math.random() * 50 + 40), 1500)
    return () => {
        clearTimeout(timer)
        clearTimeout(timer2)
    }
  }, [])

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <span className="text-muted-foreground">Carregando aplicação...</span>
        <Progress value={progress} className="w-[40%] max-w-sm" />
    </div>
  )
}
