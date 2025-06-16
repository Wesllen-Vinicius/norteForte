// app/login/page.tsx
"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { IconBrandGoogle } from "@tabler/icons-react";

import { loginSchema, signInWithEmail, signInWithGoogle } from "@/lib/services/auth.services";
import { GenericForm } from "@/components/generic-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    const onSubmit = async (values: LoginFormValues) => {
        try {
            await signInWithEmail(values);
            toast.success("Login realizado com sucesso!");
            router.push('/dashboard');
        } catch (error: any) {
            toast.error("Falha no login", { description: "Verifique seu e-mail e senha."});
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
            toast.success("Login com Google realizado com sucesso!");
            router.push('/dashboard');
        } catch (error: any) {
            toast.error("Falha no login com Google.");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                    <CardDescription>Acesse o dashboard com suas credenciais.</CardDescription>
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
                        <Button type="submit" form="login-form" className="w-full mt-6">Entrar</Button>
                    </GenericForm>
                    <Separator className="my-6" />
                    <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
                        <IconBrandGoogle className="mr-2 h-4 w-4"/>
                        Entrar com Google
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
