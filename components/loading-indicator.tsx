"use client"

import * as React from "react"
import { Progress } from "@/components/ui/progress"

export function LoadingIndicator() {
  const [progress, setProgress] = React.useState(13)

  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(80), 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
        <span className="text-muted-foreground animate-pulse">Carregando Aplicação...</span>
        <Progress value={progress} className="w-[40%] max-w-sm transition-all duration-500 ease-in-out" />
    </div>
  )
}
