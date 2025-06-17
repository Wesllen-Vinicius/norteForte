"use client"

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { loginSchema, signInWithEmail } from "@/lib/services/auth.services";
import { GenericForm } from "@/components/generic-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconMeat } from "@tabler/icons-react";
import { LoadingIndicator } from "@/components/loading-indicator";

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const { user, isLoading } = useAuthStore();
    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    useEffect(() => {
        if (!isLoading && user) {
            router.push('/dashboard');
        }
    }, [user, isLoading, router]);

    const onSubmit = async (values: LoginFormValues) => {
        const promise = signInWithEmail(values);
        toast.promise(promise, {
            loading: "Autenticando...",
            success: () => {
                router.push('/dashboard');
                return "Login realizado com sucesso!";
            },
            error: "Falha no login. Verifique seu e-mail e senha.",
        });
    };

    if (isLoading || user) {
        return <LoadingIndicator />;
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-6">
                   <IconMeat size={48} className="text-primary"/>
                </div>
                <Card className="shadow-xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Acesso ao Dashboard</CardTitle>
                        <CardDescription>Utilize suas credenciais para entrar.</CardDescription>
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
                         <Button type="submit" form="login-form" className="w-full mt-6" size="lg">
                            Entrar
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
