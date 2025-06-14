// src/components/SidebarItem.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface SidebarItemProps {
  name: string
  path: string
  icon: ReactNode
  collapsed: boolean
}

export default function SidebarItem({ name, path, icon, collapsed }: SidebarItemProps) {
  const pathname = usePathname()
  const isActive = pathname === path

  return (
    <Link
      href={path}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 relative group
        ${collapsed ? 'justify-center' : ''}
        ${
          isActive
            ? 'bg-indigo-500 text-white shadow-lg'
            : 'bg-transparent text-neutral-700 hover:bg-neutral-200'
        }
        ${
          isActive && 'dark:bg-neutral-800 dark:text-indigo-400' // Ajuste para tema escuro quando ativo
        }
        ${
          !isActive && 'dark:text-neutral-400 dark:hover:bg-neutral-800' // Ajuste para tema escuro quando inativo/hover
        }
      `}
    >
      <span className={`text-xl transition-transform duration-200 group-hover:scale-110 ${isActive ? '' : 'group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`}>
        {icon}
      </span>
      {!collapsed && (
        <span className="truncate text-base font-medium">
          {name}
        </span>
      )}
      {collapsed && (
        <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md px-3 py-1 text-xs font-semibold
                           bg-neutral-800 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10
                           shadow-lg">
          {name}
        </span>
      )}
    </Link>
  )
}
