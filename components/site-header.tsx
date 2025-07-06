'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ModeToggle } from './modeToggle';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './ui/breadcrumb';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigationStore } from '@/store/navigation.store';

const breadcrumbNameMap: { [key: string]: string } = {
  "dashboard": "Dashboard", "relatorios": "Relatórios", "vendas": "Vendas", "compras": "Compras",
  "producao": "Produção", "abates": "Abates", "estoque": "Estoque", "financeiro": "Financeiro",
  "contas-a-pagar": "Contas a Pagar", "contas-a-receber": "Contas a Receber", "contas-bancarias": "Contas Bancárias",
  "clientes": "Clientes", "fornecedores": "Fornecedores", "funcionarios": "Funcionários", "cargos": "Cargos",
  "produtos": "Produtos", "unidades": "Unidades", "categorias": "Categorias", "metas": "Metas",
  "usuarios": "Usuários", "account": "Minha Conta", "settings": "Configurações",
};

export function SiteHeader() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { toggleMobileMenu } = useNavigationStore();

  const pathSegments = pathname.split('/').filter(Boolean);

  const pageTitle = pathSegments.length > 0
    ? breadcrumbNameMap[pathSegments[pathSegments.length - 1]] || "Página"
    : "Dashboard";

  return (
    <header className="sticky top-0 z-40 flex h-auto shrink-0 flex-col gap-2 border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:h-[--header-height] sm:flex-row sm:items-center lg:px-6">
      <div className="flex w-full items-center gap-1 sm:gap-2">
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            className="-ml-1"
            onClick={toggleMobileMenu}
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Abrir Menu</span>
          </Button>
        ) : (
          <>
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mx-2 hidden data-[orientation=vertical]:h-4 sm:block"
            />
          </>
        )}

        <div className="flex-1">
          <h1 className="block text-base font-medium sm:hidden">{pageTitle}</h1>
          <Breadcrumb className="hidden sm:flex">
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
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
