"use client"

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { CenteredLayout } from "@/components/centered-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GenericForm } from "@/components/generic-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MaskedInput } from "@/components/ui/masked-input";
import { companyInfoSchema, saveCompanyInfo, getCompanyInfo } from "@/lib/services/settings.services";

type CompanyInfoFormValues = z.infer<typeof companyInfoSchema>;

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const form = useForm<CompanyInfoFormValues>({
        resolver: zodResolver(companyInfoSchema),
        defaultValues: {
            nomeFantasia: "",
            razaoSocial: "",
            cnpj: "",
            endereco: "",
            telefone: "",
            email: "",
        },
    });

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            const info = await getCompanyInfo();
            if (info) {
                form.reset(info);
            }
            setIsLoading(false);
        };
        fetchSettings();
    }, [form]);

    const onSubmit = async (values: CompanyInfoFormValues) => {
        try {
            await saveCompanyInfo(values);
            toast.success("Informações da empresa salvas com sucesso!");
        } catch (error) {
            toast.error("Erro ao salvar as informações.");
        }
    };

    return (
        <CenteredLayout>
            <Card>
                <CardHeader>
                    <CardTitle>Informações da Empresa</CardTitle>
                    <CardDescription>
                        Estes dados poderão ser utilizados em relatórios e notas fiscais.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-muted-foreground">Carregando configurações...</p>
                    ) : (
                        <GenericForm schema={companyInfoSchema} onSubmit={onSubmit} formId="company-info-form" form={form}>
                            <div className="space-y-4">
                                <FormField name="nomeFantasia" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Nome Fantasia</FormLabel><FormControl><Input placeholder="Nome principal da empresa" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField name="razaoSocial" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Razão Social (Opcional)</FormLabel><FormControl><Input placeholder="Nome legal da empresa" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField name="cnpj" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>CNPJ (Opcional)</FormLabel><FormControl><MaskedInput mask="99.999.999/9999-99" placeholder="00.000.000/0000-00" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField name="telefone" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Telefone (Opcional)</FormLabel><FormControl><MaskedInput mask="(99) 99999-9999" placeholder="(00) 00000-0000" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField name="email" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>E-mail de Contato (Opcional)</FormLabel><FormControl><Input type="email" placeholder="contato@suaempresa.com" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField name="endereco" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Endereço (Opcional)</FormLabel><FormControl><Input placeholder="Rua, Nº, Bairro, Cidade - Estado" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <div className="flex justify-end pt-6">
                                <Button type="submit" form="company-info-form" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? "Salvando..." : "Salvar Informações"}
                                </Button>
                            </div>
                        </GenericForm>
                    )}
                </CardContent>
            </Card>
        </CenteredLayout>
    );
}
