"use client"

import Link from "next/link";
import { useState } from "react";
import { IconLoader, IconLogout, IconSettings, IconUserCircle } from "@tabler/icons-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { signOutUser } from "@/lib/services/auth.services";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

// **NOVA PROPRIEDADE ADICIONADA**
interface NavUserProps {
    onMenuOpenChange: (isOpen: boolean) => void;
}

export function NavUser({ onMenuOpenChange }: NavUserProps) {
    const { user } = useAuthStore();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await signOutUser();
            toast.success("Você saiu da sua conta.");
        } catch (error) {
            toast.error("Erro ao fazer logout.");
            setIsLoggingOut(false);
        }
    };

    if (!user) return null;

    const userName = user.displayName || "Usuário";
    const userEmail = user.email || "Sem e-mail";
    const userAvatar = user.photoURL || "";

    return (
        <>
            {isLoggingOut && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in-0">
                    <div className="flex flex-col items-center gap-2">
                        <IconLoader className="animate-spin h-8 w-8 text-primary" />
                        <span className="text-muted-foreground">Saindo...</span>
                    </div>
                </div>
            )}

            <SidebarMenu>
                <SidebarMenuItem>
                    {/* **onOpenChange ATUALIZADO** */}
                    <DropdownMenu onOpenChange={onMenuOpenChange}>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={userAvatar} alt={userName} />
                                    <AvatarFallback className="rounded-lg bg-primary/20">{userName.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{userName}</span>
                                    <span className="text-muted-foreground truncate text-xs">{userEmail}</span>
                                </div>
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        {/* **CONTEÚDO E POSIÇÃO DO MENU ATUALIZADOS** */}
                        <DropdownMenuContent
                            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-lg"
                            side="top"
                            align="end"
                            sideOffset={8}
                        >
                            <DropdownMenuGroup>
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/account">
                                        <IconUserCircle />
                                        <span>Minha Conta</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/settings">
                                        <IconSettings />
                                        <span>Configurações</span>
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                                <IconLogout />
                                <span>Sair da Conta</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>
        </>
    );
}
