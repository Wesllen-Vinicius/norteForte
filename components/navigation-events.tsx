'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useNavigationStore } from '@/store/navigation.store'

export function NavigationEvents() {
  const pathname = usePathname()
  const { setIsNavigating } = useNavigationStore()

  useEffect(() => {
    setIsNavigating(false)
  }, [pathname, setIsNavigating])

  return null
}
