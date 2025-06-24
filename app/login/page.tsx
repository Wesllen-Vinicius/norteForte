"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { IconLoader } from "@tabler/icons-react";

// CORREÇÃO AQUI: Importações separadas
import { loginSchema, LoginValues } from "@/lib/schemas";
import { signInWithEmail } from "@/lib/services/auth.services";

import { GenericForm } from "@/components/generic-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoginGuard } from "@/components/login-guard";


export default function LoginPage() {
    const router = useRouter();
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
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-muted/20 to-muted/80 p-4">
                <div className="w-full max-w-md animate-in fade-in-0 zoom-in-95">
                    <Card className="shadow-2xl shadow-primary/10">
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl font-bold">Norte Forte</CardTitle>
                            <CardDescription>Acesso ao sistema de gestão</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <GenericForm schema={loginSchema} onSubmit={onSubmit} formId="login-form" form={form}>
                                <div className="space-y-4">
                                    <FormField name="email" control={form.control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>E-mail</FormLabel>
                                            <FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField name="password" control={form.control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Senha</FormLabel>
                                            <FormControl><Input type="password" placeholder="******" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </GenericForm>
                             <Button type="submit" form="login-form" className="w-full mt-6" size="lg" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                                        Entrando...
                                    </>
                                ) : "Entrar"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                 <footer className="absolute bottom-4 text-center text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} Norte Forte. Todos os direitos reservados.
                </footer>
            </div>
        </LoginGuard>
    );
}
