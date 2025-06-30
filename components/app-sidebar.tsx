'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Users, Building, Package, ShoppingCart, DollarSign, Banknote, Landmark, FileText,
  Settings, LayoutDashboard, Boxes, Beef, LineChart, ChevronDown, User, Tags, Scale,
  ClipboardList, UserCog, HeartHandshake, Archive, ShieldCheck
} from 'lucide-react';
import { IconInnerShadowTop } from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { useNavigationStore } from '@/store/navigation.store';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavUser } from './nav-user';
import { SidebarPinToggle } from './sidebar-pin-toggle';

// Lista completa de todos os itens de navegação
const navItems = [
    { id: 'dashboard', href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    {
        id: 'cadastros',
        label: 'Cadastros',
        icon: Users,
        subItems: [
            { id: 'clientes', href: '/dashboard/clientes', icon: HeartHandshake, label: 'Clientes' },
            { id: 'fornecedores', href: '/dashboard/fornecedores', icon: Building, label: 'Fornecedores' },
            { id: 'produtos', href: '/dashboard/produtos', icon: Package, label: 'Produtos' },
            { id: 'funcionarios', href: '/dashboard/funcionarios', icon: User, label: 'Funcionários' },
            { id: 'cargos', href: '/dashboard/cargos', icon: Tags, label: 'Cargos' },
            { id: 'categorias', href: '/dashboard/categorias', icon: Boxes, label: 'Categorias' },
            { id: 'unidades', href: '/dashboard/unidades', icon: Scale, label: 'Unidades' },
        ],
    },
    {
        id: 'operacional',
        label: 'Operacional',
        icon: Beef,
        subItems: [
            { id: 'compras', href: '/dashboard/compras', icon: ShoppingCart, label: 'Compras' },
            { id: 'abates', href: '/dashboard/abates', icon: Beef, label: 'Abates' },
            { id: 'producao', href: '/dashboard/producao', icon: Beef, label: 'Produção' },
            { id: 'vendas', href: '/dashboard/vendas', icon: DollarSign, label: 'Vendas' },
            { id: 'estoque', href: '/dashboard/estoque', icon: Archive, label: 'Estoque' },
        ],
    },
    {
        id: 'financeiro',
        label: 'Financeiro',
        icon: Landmark,
        subItems: [
            { id: 'contas-a-pagar', href: '/dashboard/financeiro/contas-a-pagar', icon: Banknote, label: 'Contas a Pagar' },
            { id: 'contas-a-receber', href: '/dashboard/financeiro/contas-a-receber', icon: DollarSign, label: 'Contas a Receber' },
            { id: 'despesas', href: '/dashboard/financeiro/despesas', icon: ClipboardList, label: 'Despesas' },
            { id: 'fluxo-caixa', href: '/dashboard/financeiro/fluxo-caixa', icon: LineChart, label: 'Fluxo de Caixa' },
            { id: 'contas-bancarias', href: '/dashboard/financeiro/contas-bancarias', icon: Landmark, label: 'Contas Bancárias' },
        ],
    },
    { id: 'relatorios', href: '/dashboard/relatorios', icon: FileText, label: 'Relatórios' },
    { id: 'metas', href: '/dashboard/metas', icon: LineChart, label: 'Metas' },
    {
        id: 'configuracoes',
        label: 'Configurações',
        icon: Settings,
        subItems: [
            { id: 'minha-conta', href: '/dashboard/account', icon: User, label: 'Minha Conta' },
            { id: 'empresa', href: '/dashboard/settings', icon: Settings, label: 'Empresa' },
            { id: 'usuarios', href: '/dashboard/usuarios', icon: UserCog, label: 'Usuários' },
            // **NOVO ITEM DE MENU ADICIONADO AQUI**
            { id: 'permissoes', href: '/dashboard/permissoes', icon: ShieldCheck, label: 'Funções e Permissões' },
        ]
    },
];


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const { expandedMenus, toggleMenu, setIsNavigating } = useNavigationStore();
    const { open, setOpen } = useSidebar();
    const [isPinned, setIsPinned] = useState(false);

    useEffect(() => {
        const pinned = localStorage.getItem('sidebar-pinned') === 'true';
        setIsPinned(pinned);
        setOpen(pinned);
    }, [setOpen]);

    const handleTogglePin = () => {
        const newPinnedState = !isPinned;
        setIsPinned(newPinnedState);
        setOpen(newPinnedState);
        localStorage.setItem('sidebar-pinned', String(newPinnedState));
    };

    const handleMouseEnter = () => {
        if (!isPinned) setOpen(true);
    };

    const handleMouseLeave = () => {
        if (!isPinned) setOpen(false);
    };

    const handleNavigation = (url: string) => {
        if (url !== pathname) setIsNavigating(true);
    };

    const isSubMenuExpanded = (id: string) => expandedMenus.includes(id);

    return (
        <Sidebar onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} {...props}>
            <SidebarHeader className="relative flex items-center justify-between">
                <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <Link href="/dashboard" onClick={() => handleNavigation('/dashboard')} className="!justify-start">
                            <IconInnerShadowTop className="size-6 text-primary shrink-0" />
                            <span className="sidebar-text text-lg font-semibold">Norte Forte</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarPinToggle isPinned={isPinned} onToggle={handleTogglePin} />
            </SidebarHeader>

            <SidebarContent>
                <SidebarMenu>
                    {navItems.map((item) =>
                        item.subItems ? (
                            <div key={item.id} className="w-full">
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        onClick={() => toggleMenu(item.id)}
                                        className="justify-between"
                                        tooltip={item.label}
                                        isActive={item.subItems.some(sub => pathname.startsWith(sub.href))}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon className="size-5 shrink-0" />
                                            <span className="sidebar-text">{item.label}</span>
                                        </div>
                                        <ChevronDown className={cn('sidebar-chevron size-4 shrink-0 transform transition-transform duration-200', { 'rotate-180': isSubMenuExpanded(item.id) })} />
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                {isSubMenuExpanded(item.id) && open && (
                                    <div className="mt-1 flex flex-col gap-1 pl-5 border-l ml-[1.125rem] border-sidebar-border">
                                        {item.subItems.map((subItem) => (
                                            <SidebarMenuItem key={subItem.id}>
                                                <SidebarMenuButton asChild tooltip={subItem.label} isActive={pathname === subItem.href}>
                                                    <Link href={subItem.href} onClick={() => handleNavigation(subItem.href)}>
                                                        <subItem.icon className="size-4 shrink-0" />
                                                        <span className="sidebar-text">{subItem.label}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <SidebarMenuItem key={item.id}>
                                <SidebarMenuButton asChild tooltip={item.label} isActive={pathname === item.href}>
                                    <Link href={item.href} onClick={() => handleNavigation(item.href)}>
                                        <item.icon className="size-5 shrink-0" />
                                        <span className="sidebar-text">{item.label}</span>
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
