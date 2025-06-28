"use client"

import { useEffect, useState } from "react";
import { useForm, DefaultValues } from "react-hook-form";
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
import { companyInfoSchema, getCompanyInfo, saveCompanyInfo } from "@/lib/services/settings.services";
import { Separator } from "@/components/ui/separator";

type CompanyInfoFormValues = z.infer<typeof companyInfoSchema>;

const defaultFormValues: DefaultValues<CompanyInfoFormValues> = {
    nomeFantasia: "",
    razaoSocial: "",
    cnpj: "",
    inscricaoEstadual: "",
    endereco: {
        logradouro: "",
        numero: "",
        bairro: "",
        cidade: "",
        uf: "",
        cep: "",
        complemento: "",
    },
    telefone: "",
    email: "",
};


export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const form = useForm<CompanyInfoFormValues>({
        resolver: zodResolver(companyInfoSchema),
        defaultValues: defaultFormValues,
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
        } catch {
            toast.error("Erro ao salvar as informações.");
        }
    };

    return (
        <CenteredLayout>
            <Card>
                <CardHeader>
                    <CardTitle>Informações da Empresa</CardTitle>
                    <CardDescription>
                        Estes dados serão utilizados em relatórios e na emissão de notas fiscais.
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
                                    <FormItem><FormLabel>Razão Social</FormLabel><FormControl><Input placeholder="Nome legal da empresa" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                 <div className="grid md:grid-cols-2 gap-4">
                                    <FormField name="cnpj" control={form.control} render={({ field }) => (
                                        <FormItem><FormLabel>CNPJ</FormLabel><FormControl><MaskedInput mask="99.999.999/9999-99" placeholder="00.000.000/0000-00" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField name="inscricaoEstadual" control={form.control} render={({ field }) => (
                                        <FormItem><FormLabel>Inscrição Estadual</FormLabel><FormControl><Input placeholder="Número da I.E." {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField name="telefone" control={form.control} render={({ field }) => (
                                        <FormItem><FormLabel>Telefone</FormLabel><FormControl><MaskedInput mask="(99) 99999-9999" placeholder="(00) 00000-0000" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField name="email" control={form.control} render={({ field }) => (
                                        <FormItem><FormLabel>E-mail de Contato</FormLabel><FormControl><Input type="email" placeholder="contato@suaempresa.com" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>

                                <Separator className="my-6" />
                                <h3 className="text-lg font-medium">Endereço Fiscal</h3>

                                <div className="grid md:grid-cols-[2fr_1fr] gap-4">
                                    <FormField name="endereco.logradouro" control={form.control} render={({ field }) => (<FormItem><FormLabel>Logradouro</FormLabel><FormControl><Input placeholder="Rua, Av, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="endereco.numero" control={form.control} render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input placeholder="123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <FormField name="endereco.complemento" control={form.control} render={({ field }) => (<FormItem><FormLabel>Complemento (Opcional)</FormLabel><FormControl><Input placeholder="Apto, Bloco, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField name="endereco.bairro" control={form.control} render={({ field }) => (<FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="endereco.cep" control={form.control} render={({ field }) => (<FormItem><FormLabel>CEP</FormLabel><FormControl><MaskedInput mask="99999-999" placeholder="00000-000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <div className="grid md:grid-cols-[2fr_1fr] gap-4">
                                    <FormField name="endereco.cidade" control={form.control} render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="endereco.uf" control={form.control} render={({ field }) => (<FormItem><FormLabel>UF</FormLabel><FormControl><Input maxLength={2} placeholder="Ex: SP" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
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
