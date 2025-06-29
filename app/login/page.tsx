"use client"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { IconLoader } from "@tabler/icons-react";
import IconInnerShadowTop from '@tabler/icons-react/dist/esm/icons/IconInnerShadowTop';
import { loginSchema, LoginValues } from "@/lib/schemas";
import { signInWithEmail } from "@/lib/services/auth.services";
import { GenericForm } from "@/components/generic-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoginGuard } from "@/components/login-guard";
import { PasswordResetDialog } from "@/components/password-reset-dialog";

export default function LoginPage() {
    const router = useRouter();
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

    const form = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    const { isSubmitting } = form.formState;

    const onSubmit = async (values: LoginValues) => {
        const promise = signInWithEmail(values);
        toast.promise(promise, {
            loading: "Autenticando...",
            success: () => {
                router.push('/dashboard');
                return "Login realizado com sucesso!";
            },
            error: (err) => {
                if (err.code === 'auth/invalid-credential') {
                    return "Credenciais inválidas. Verifique seu e-mail e senha.";
                }
                return "Falha no login. Tente novamente.";
            },
        });
    };

    return (
        <LoginGuard>
            <PasswordResetDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen} />

            <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
                <div className="flex items-center justify-center py-12">
                    <div className="mx-auto grid w-[350px] gap-6">
                        <div className="grid gap-2 text-center">
                            <h1 className="text-3xl font-bold">Acessar</h1>
                            <p className="text-balance text-muted-foreground">
                                Digite seu e-mail e senha para entrar no sistema.
                            </p>
                        </div>
                        <GenericForm schema={loginSchema} onSubmit={onSubmit} formId="login-form" form={form}>
                            <div className="grid gap-4">
                                <FormField name="email" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>E-mail</FormLabel>
                                        <FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField name="password" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center">
                                            <FormLabel>Senha</FormLabel>
                                            <button
                                                type="button"
                                                onClick={() => setIsResetDialogOpen(true)}
                                                className="ml-auto inline-block text-sm underline"
                                            >
                                                Esqueceu sua senha?
                                            </button>
                                        </div>
                                        <FormControl><Input type="password" placeholder="******" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                     {isSubmitting ? <IconLoader className="animate-spin" /> : "Entrar"}
                                </Button>
                            </div>
                        </GenericForm>
                    </div>
                </div>
                <div className="hidden bg-muted lg:flex lg:flex-col lg:items-center lg:justify-center p-10">
                    <div className="flex items-center gap-4 text-primary">
                        <IconInnerShadowTop className="h-16 w-16" />
                        <h1 className="text-6xl font-bold tracking-tighter">Norte Forte</h1>
                    </div>
                    <p className="text-lg text-muted-foreground mt-4 max-w-md text-center">
                        Sistema de gestão.
                    </p>
                     <footer className="absolute bottom-6 text-center text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} Norte Forte. Todos os direitos reservados.
                    </footer>
                </div>
            </div>
        </LoginGuard>
    );
}
