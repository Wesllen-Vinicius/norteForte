"use client"

import Link from "next/link";
import * as React from "react"
import {
  IconArchive,
  IconShoppingCart,
  IconClipboardPlus,
  IconDashboard,
  IconInnerShadowTop,
  IconMeat,
  IconPackages,
  IconReportAnalytics,
  IconUserShield,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

// A estrutura de dados volta a ser um array simples
const navMain = [
  { title: "Dashboard", url: "/dashboard", icon: IconDashboard, group: "Análise" },
  { title: "Relatórios", url: "/dashboard/relatorios", icon: IconReportAnalytics, group: "Análise" },
  { title: "Vendas", url: "/dashboard/vendas", icon: IconShoppingCart, group: "Operacional" },
  { title: "Produção", url: "/dashboard/producao", icon: IconClipboardPlus, group: "Operacional" },
  { title: "Abates", url: "/dashboard/abates", icon: IconMeat, group: "Operacional" },
  { title: "Estoque", url: "/dashboard/estoque", icon: IconArchive, group: "Operacional" },
  { title: "Clientes", url: "/dashboard/clientes", icon: IconUsersGroup, group: "Cadastros" },
  { title: "Funcionários", url: "/dashboard/funcionarios", icon: IconUsers, group: "Cadastros" },
  { title: "Cargos", url: "/dashboard/cargos", icon: IconUserShield, group: "Cadastros" },
  { title: "Produtos", url: "/dashboard/produtos", icon: IconPackages, group: "Cadastros" },
];

// Função para agrupar os itens do menu
const getGroupedNav = () => {
    return navMain.reduce((acc, item) => {
        (acc[item.group] = acc[item.group] || []).push(item);
        return acc;
    }, {} as Record<string, typeof navMain>);
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const groupedNav = getGroupedNav();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">AshesBorn</span>
              </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarHeader>
      <SidebarContent>
        {/* Renderiza os grupos de forma correta */}
        {Object.entries(groupedNav).map(([group, items]) => (
            <SidebarGroup key={group}>
                <SidebarGroupLabel>{group}</SidebarGroupLabel>
                <NavMain items={items} />
            </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
