// components/site-header.tsx
"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "./modeToggle"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "./ui/breadcrumb";

// Mapeamento de segmentos de URL para nomes amigáveis
const breadcrumbNameMap: { [key: string]: string } = {
  "dashboard": "Dashboard",
  "relatorios": "Relatórios",
  "vendas": "Vendas",
  "compras": "Compras",
  "producao": "Produção",
  "abates": "Abates",
  "estoque": "Estoque",
  "financeiro": "Financeiro",
  "contas-a-pagar": "Contas a Pagar",
  "contas-a-receber": "Contas a Receber",
  "clientes": "Clientes",
  "fornecedores": "Fornecedores",
  "funcionarios": "Prestadores",
  "cargos": "Cargos",
  "produtos": "Produtos",
  "unidades": "Unidades",
  "categorias": "Categorias",
  "metas": "Metas de Produção",
  "usuarios": "Usuários",
  "account": "Minha Conta",
  "settings": "Configurações",
};

export function SiteHeader() {
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter(segment => segment);

  // Gera o título dinâmico a partir do último segmento da URL
  const pageTitle = pathSegments.length > 0
    ? breadcrumbNameMap[pathSegments[pathSegments.length - 1]] || "Página"
    : "Dashboard";

  return (
    <header className="flex h-auto shrink-0 flex-col gap-2 border-b px-4 py-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) lg:px-6">
      <div className="flex w-full items-center gap-1 lg:gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {/* Título da página agora é dinâmico */}
        <h1 className="text-base font-medium">{pageTitle}</h1>
        <div className="ml-auto flex items-center gap-2">
            <ModeToggle/>
        </div>
      </div>
      <div className="flex w-full items-center">
        {/* Componente de Breadcrumbs */}
        <Breadcrumb>
            <BreadcrumbList>
                {pathSegments.map((segment, index) => {
                    const href = "/" + pathSegments.slice(0, index + 1).join('/');
                    const isLast = index === pathSegments.length - 1;
                    const name = breadcrumbNameMap[segment] || segment;

                    return (
                        <Fragment key={href}>
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>{name}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link href={href}>{name}</Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!isLast && <BreadcrumbSeparator />}
                        </Fragment>
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
