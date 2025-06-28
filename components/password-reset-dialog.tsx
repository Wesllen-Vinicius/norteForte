"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { IconLoader } from "@tabler/icons-react";

import { sendPasswordReset } from "@/lib/services/auth.services";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { GenericForm } from "@/components/generic-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const passwordResetSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
});

type PasswordResetValues = z.infer<typeof passwordResetSchema>;

interface PasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordResetDialog({ open, onOpenChange }: PasswordResetDialogProps) {
  const form = useForm<PasswordResetValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { email: "" },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = (values: PasswordResetValues) => {
    const promise = sendPasswordReset(values.email);
    toast.promise(promise, {
      loading: 'Enviando e-mail de recuperação...',
      success: () => {
        form.reset();
        onOpenChange(false);
        return 'E-mail enviado! Verifique sua caixa de entrada e spam.';
      },
      error: (err: any) => {
        if (err.code === 'auth/user-not-found') {
          return 'Nenhum usuário encontrado com este e-mail.';
        }
        return 'Ocorreu um erro. Tente novamente.';
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Recuperar Senha</DialogTitle>
          <DialogDescription>
            Digite o e-mail associado à sua conta e enviaremos um link para você redefinir sua senha.
          </DialogDescription>
        </DialogHeader>
        <GenericForm schema={passwordResetSchema} onSubmit={onSubmit} formId="reset-password-form" form={form}>
          <div className="grid gap-4 py-4">
            <FormField
              name="email"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input id="email" placeholder="seu@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </GenericForm>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancelar</Button>
          </DialogClose>
          <Button type="submit" form="reset-password-form" disabled={isSubmitting}>
            {isSubmitting ? <IconLoader className="animate-spin" /> : "Enviar E-mail de Recuperação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
