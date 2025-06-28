'use client';

import { IconPinned, IconPinnedOff } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./ui/sidebar";
import { cn } from "@/lib/utils";

interface SidebarPinToggleProps {
    isPinned: boolean;
    onToggle: () => void;
}

export function SidebarPinToggle({ isPinned, onToggle }: SidebarPinToggleProps) {
    const { open } = useSidebar();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn(
                "absolute top-2 right-1 h-8 w-8 transition-opacity duration-300",
                !open && "opacity-0 invisible pointer-events-none"
            )}
            aria-label={isPinned ? 'Destravar Sidebar' : 'Travar Sidebar'}
        >
            {isPinned ? <IconPinned className="h-5 w-5" /> : <IconPinnedOff className="h-5 w-5" />}
        </Button>
    );
}
