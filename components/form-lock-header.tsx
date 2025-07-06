// components/form-lock-header.tsx
"use client";

import { Button } from "@/components/ui/button";
import { IconLock, IconLockOpen } from "@tabler/icons-react";

interface FormLockHeaderProps {
  title: string;
  description: string;
  isLocked: boolean;
  onLockToggle: () => void;
  isSubmitting: boolean;
  formId: string;
}

export function FormLockHeader({
  title,
  description,
  isLocked,
  onLockToggle,
  isSubmitting,
  formId,
}: FormLockHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onLockToggle}
          aria-label={isLocked ? "Desbloquear para editar" : "Bloquear edição"}
        >
          {isLocked ? <IconLock className="h-5 w-5" /> : <IconLockOpen className="h-5 w-5 text-primary" />}
        </Button>
        {!isLocked && (
           <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar Alterações"}
          </Button>
        )}
      </div>
    </div>
  );
}
