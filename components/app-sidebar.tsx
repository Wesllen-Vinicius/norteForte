"use client"

import Link from "next/link";
import * as React from "react"
import { usePathname } from "next/navigation";
import { type Icon, IconArchive, IconShoppingCart, IconClipboardPlus, IconDashboard, IconInnerShadowTop, IconMeat, IconPackages, IconReportAnalytics, IconUserShield, IconUsers, IconUsersGroup } from "@tabler/icons-react"
import { NavUser } from "@/components/nav-user"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

const navLinks = [
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

const getGroupedNav = () => {
    return navLinks.reduce((acc, item) => {
        (acc[item.group] = acc[item.group] || []).push(item);
        return acc;
    }, {} as Record<string, typeof navLinks>);
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const groupedNav = getGroupedNav();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/dashboard">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">AshesBorn</span>
              </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarHeader>

      <SidebarContent>
        {Object.entries(groupedNav).map(([group, items]) => (
            <SidebarGroup key={group}>
                <SidebarGroupLabel>{group}</SidebarGroupLabel>
                <SidebarMenu>
                    {items.map((item) => {
                        const isActive = item.url === '/dashboard'
                          ? pathname === item.url
                          : pathname.startsWith(item.url);

                        return (
                            <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                                <Link href={item.url}>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                            </SidebarMenuItem>
                        )
                    })}
                </SidebarMenu>
            </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
