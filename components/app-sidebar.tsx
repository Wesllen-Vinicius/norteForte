'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users, Building, Package, ShoppingCart, DollarSign, Banknote, Landmark, FileText,
  Settings, LayoutDashboard, Boxes, Beef, LineChart, ChevronDown, User, Tags,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigationStore } from '@/store/navigation.store';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { NavUser } from './nav-user';
import IconInnerShadowTop from '@tabler/icons-react/dist/esm/icons/IconInnerShadowTop';

const navItems = [
    { id: 'dashboard', href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    {
        id: 'cadastros',
        label: 'Cadastros',
        icon: Users,
        subItems: [
            { id: 'clientes', href: '/dashboard/clientes', icon: Users, label: 'Clientes' },
            { id: 'fornecedores', href: '/dashboard/fornecedores', icon: Building, label: 'Fornecedores' },
            { id: 'produtos', href: '/dashboard/produtos', icon: Package, label: 'Produtos' },
            { id: 'funcionarios', href: '/dashboard/funcionarios', icon: User, label: 'Funcionários' },
            { id: 'cargos', href: '/dashboard/cargos', icon: Tags, label: 'Cargos' },
            { id: 'categorias', href: '/dashboard/categorias', icon: Boxes, label: 'Categorias' },
            { id: 'unidades', href: '/dashboard/unidades', icon: Beef, label: 'Unidades' },
        ],
    },
    { id: 'compras', href: '/dashboard/compras', icon: ShoppingCart, label: 'Compras' },
    { id: 'vendas', href: '/dashboard/vendas', icon: DollarSign, label: 'Vendas' },
    { id: 'producao', href: '/dashboard/producao', icon: Beef, label: 'Produção' },
    { id: 'estoque', href: '/dashboard/estoque', icon: Boxes, label: 'Estoque' },
    {
        id: 'financeiro',
        label: 'Financeiro',
        icon: Landmark,
        subItems: [
            { id: 'contas-a-pagar', href: '/dashboard/financeiro/contas-a-pagar', icon: Banknote, label: 'Contas a Pagar' },
            { id: 'contas-a-receber', href: '/dashboard/financeiro/contas-a-receber', icon: DollarSign, label: 'Contas a Receber' },
            { id: 'contas-bancarias', href: '/dashboard/financeiro/contas-bancarias', icon: Landmark, label: 'Contas Bancárias' },
        ],
    },
    { id: 'relatorios', href: '/dashboard/relatorios', icon: FileText, label: 'Relatórios' },
    { id: 'metas', href: '/dashboard/metas', icon: LineChart, label: 'Metas' },
    { id: 'settings', href: '/dashboard/settings', icon: Settings, label: 'Configurações' },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const { expandedMenus, toggleMenu, setActiveItem, setIsNavigating } = useNavigationStore();
    const isExpanded = (id: string) => expandedMenus.includes(id);

    const handleNavigation = (url: string) => {
        if (url !== pathname) {
            setIsNavigating(true);
        }
    };

    return (
        <Sidebar {...props}>
            <SidebarHeader>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
                        <Link href="/dashboard" onClick={() => handleNavigation('/dashboard')}>
                            <IconInnerShadowTop className="!size-5" />
                            <span className="text-base font-semibold">Norte Forte</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarHeader>

            <SidebarContent>
                <SidebarMenu>
                    {navItems.map((item) =>
                        item.subItems ? (
                            <div key={item.id} className="w-full">
                                <button onClick={() => toggleMenu(item.id)} className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                    <div className="flex items-center gap-2"> <item.icon className="h-4 w-4" /> <span>{item.label}</span> </div>
                                    <ChevronDown className={cn('h-4 w-4 transform transition-transform duration-200', { 'rotate-180': isExpanded(item.id) })} />
                                </button>
                                {isExpanded(item.id) && (
                                    <div className="mt-1 flex flex-col gap-1 pl-4 border-l ml-3.5">
                                        {item.subItems.map((subItem) => (
                                            <Link key={subItem.id} href={subItem.href} onClick={() => handleNavigation(subItem.href)}
                                                className={cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium', pathname === subItem.href ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground')}>
                                                <subItem.icon className="h-4 w-4" />
                                                <span>{subItem.label}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <SidebarMenuItem key={item.id}>
                                <SidebarMenuButton asChild tooltip={item.label} isActive={pathname === item.href}>
                                    <Link href={item.href} onClick={() => handleNavigation(item.href)}>
                                        <item.icon />
                                        <span>{item.label}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )
                    )}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
