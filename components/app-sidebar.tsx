"use client"

import Link from "next/link";
import * as React from "react"
import {
  IconArchive,
  IconChartBar,
  IconClipboardPlus,
  IconDashboard,
  IconFolder,
  IconInnerShadowTop,
  IconMeat,
  IconPackages,
  IconReportAnalytics,
  IconUserShield,
  IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Producao",
      url: "/dashboard/producao",
      icon: IconClipboardPlus,
    },
    {
      title: "Abates",
      url: "/dashboard/abates",
      icon: IconMeat,
    },
    {
      title: "Funcionarios",
      url: "/dashboard/funcionarios",
      icon: IconUsers,
    },
    {
      title: "Cargos",
      url: "/dashboard/cargos",
      icon: IconUserShield,
    },
    {
      title: "Produtos",
      url: "/dashboard/produtos",
      icon: IconPackages,
    },
    {
      title: "Estoque",
      url: "/dashboard/estoque",
      icon: IconArchive,
    },
    {
      title: "Relatórios",
      url: "/dashboard/relatorios",
      icon: IconReportAnalytics,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
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
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
