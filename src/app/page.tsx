// src/app/page.tsx
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard') // Redireciona para o dashboard por padrão
}
