// src/components/Sidebar.tsx
'use client'

import { useEffect, useState } from 'react'
import { FiArchive, FiDollarSign, FiHome, FiMenu, FiPackage, FiUser, FiUsers } from 'react-icons/fi'
import SidebarItem from './SidebarItem'

const navItems = [
  { name: 'Início', path: '/dashboard', icon: <FiHome /> },
  { name: 'Funcionários', path: '/dashboard/funcionarios', icon: <FiUsers /> },
  { name: 'Clientes', path: '/dashboard/clientes', icon: <FiUser /> },
  { name: 'Produtos', path: '/dashboard/produtos', icon: <FiPackage /> },
  { name: 'Estoque', path: '/dashboard/estoque', icon: <FiArchive /> },
  { name: 'Financeiro', path: '/dashboard/financeiro', icon: <FiDollarSign /> },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) setCollapsed(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed))
  }, [collapsed])

  return (
    <aside
      className={`bg-neutral-50 text-neutral-700 border-r border-neutral-200 shadow-md
        dark:bg-[#1a1a1a] dark:text-neutral-300 dark:border-neutral-800 dark:shadow-none
        transition-[width,background-color,border-color,color] duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}`}
    >
      <div className="flex items-center justify-between p-4 h-14">
        {!collapsed && (
          <span className="text-lg font-bold text-neutral-800 whitespace-nowrap overflow-hidden
                          dark:text-white">
            Dashboard
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-2xl text-neutral-600 hover:text-neutral-900 transition-colors duration-200 ml-auto
                     dark:text-neutral-400 dark:hover:text-white"
          aria-label="Alternar Menu Lateral"
        >
          <FiMenu />
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-2 py-2">
        {navItems.map((item) => (
          <SidebarItem
            key={item.path}
            name={item.name}
            path={item.path}
            icon={item.icon}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </aside>
  )
}
