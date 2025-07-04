"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { IconSearch } from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenericForm } from "@/components/generic-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MaskedInput } from "@/components/ui/masked-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { companyInfoSchema } from "@/lib/schemas";
import { saveCompanyInfo, getCompanyInfo } from "@/lib/services/settings.services";
import { fetchCepData, fetchCnpjData } from "@/lib/services/brasilapi.services";
import { isValidCnpj } from "@/lib/validators";
import { FormLockHeader } from "@/components/form-lock-header";
import z from "zod";

type CompanyInfoFormValues = z.infer<typeof companyInfoSchema>;

const defaultFormValues: DefaultValues<CompanyInfoFormValues> = {
    nomeFantasia: "", razaoSocial: "", cnpj: "", inscricaoEstadual: "",
    endereco: { logradouro: "", numero: "", bairro: "", cidade: "", uf: "", cep: "", complemento: "", pais: "Brasil", codigoPais: "1058" },
    telefone: "", email: "", regimeTributario: "3",
    configuracaoFiscal: {
        cfop_padrao: "5101",
        cst_padrao: "040",
        aliquota_icms_padrao: 0,
        reducao_bc_padrao: 0,
        informacoes_complementares: "Operação isenta do ICMS, conforme o Item 74 da Parte 2 do Anexo I do RICMS/RO – Abatedouro optante pela RBC prevista pelo Item 27 da Parte 2 do Anexo II do RICMS/RO."
    }
};

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [isLocked, setIsLocked] = useState(true);

    const form = useForm<CompanyInfoFormValues>({
        resolver: zodResolver(companyInfoSchema),
        defaultValues: defaultFormValues,
    });

    const { formState: { isSubmitting }, reset, getValues, setValue } = form;

    const cnpj = form.watch("cnpj");
    const cep = form.watch("endereco.cep");

    const showCnpjSearch = useMemo(() => isValidCnpj(cnpj), [cnpj]);
    const showCepSearch = useMemo(() => cep?.replace(/\D/g, "").length === 8, [cep]);

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            const info = await getCompanyInfo();
            if (info) reset(info);
            setIsLoading(false);
        };
        fetchSettings();
    }, [reset]);

    const handleFetch = async (type: "cnpj" | "cep") => {
        setIsFetching(true);
        const toastId = toast.loading(`Buscando dados por ${type.toUpperCase()}...`);
        try {
            if (type === "cnpj") {
                const cnpjValue = cnpj?.replace(/\D/g, "");
                if (!cnpjValue) throw new Error("CNPJ inválido.");
                const data = await fetchCnpjData(cnpjValue);
                const current = getValues();
                reset({ ...current, razaoSocial: data.razao_social, nomeFantasia: data.nome_fantasia || "", telefone: data.ddd_telefone_1 || "", email: data.email || "",
                    endereco: { ...current.endereco, logradouro: data.logradouro, numero: data.numero, bairro: data.bairro, cidade: data.municipio, uf: data.uf, cep: data.cep?.replace(/\D/g, ""), complemento: data.complemento }
                });
            } else {
                const cepValue = cep?.replace(/\D/g, "");
                if (!cepValue) throw new Error("CEP inválido.");
                const data = await fetchCepData(cepValue);
                setValue("endereco.logradouro", data.street);
                setValue("endereco.bairro", data.neighborhood);
                setValue("endereco.cidade", data.city);
                setValue("endereco.uf", data.state);
                document.getElementById("endereco.numero")?.focus();
            }
            toast.success("Dados preenchidos!", { id: toastId });
        } catch (error: any) {
            toast.error(error.message || "Erro ao buscar dados.", { id: toastId });
        } finally {
            setIsFetching(false);
        }
    };

    const onSubmit = async (values: CompanyInfoFormValues) => {
        try {
            await saveCompanyInfo(values);
            toast.success("Informações da empresa salvas com sucesso!");
            setIsLocked(true);
        } catch {
            toast.error("Erro ao salvar as informações.");
        }
    };

    if (isLoading) {
        return <p className="text-muted-foreground p-6">Carregando configurações...</p>;
    }

    return (
        <GenericForm schema={companyInfoSchema} onSubmit={onSubmit} formId="company-info-form" form={form}>
            <div className="space-y-6">
                <FormLockHeader
                    title="Configurações da Empresa"
                    description="Gerencie os dados cadastrais e fiscais que serão usados em todo o sistema."
                    isLocked={isLocked}
                    onLockToggle={() => setIsLocked(!isLocked)}
                    isSubmitting={isSubmitting}
                    formId="company-info-form"
                />

                <fieldset disabled={isLocked} className="disabled:opacity-70">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader><CardTitle>Dados Gerais</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField name="razaoSocial" render={({ field }) => ( <FormItem><FormLabel>Razão Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField name="nomeFantasia" render={({ field }) => ( <FormItem><FormLabel>Nome Fantasia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField name="cnpj" render={({ field }) => (
                                        <FormItem><FormLabel>CNPJ</FormLabel>
                                            <div className="flex items-center gap-2">
                                                <FormControl><MaskedInput mask="00.000.000/0000-00" {...field} /></FormControl>
                                                {showCnpjSearch && (<Button type="button" variant="outline" size="icon" onClick={() => handleFetch("cnpj")} disabled={isFetching}><IconSearch className="h-4 w-4" /></Button>)}
                                            </div>
                                        <FormMessage /></FormItem>
                                    )} />
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <FormField name="telefone" render={({ field }) => ( <FormItem><FormLabel>Telefone</FormLabel><FormControl><MaskedInput mask="(00) 00000-0000" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                        <FormField name="email" render={({ field }) => ( <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>Endereço Fiscal</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid md:grid-cols-[1fr_auto] gap-2 items-end">
                                        <FormField name="endereco.cep" render={({ field }) => (<FormItem><FormLabel>CEP</FormLabel><FormControl><MaskedInput mask="00000-000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <Button type="button" variant="outline" onClick={() => handleFetch("cep")} disabled={isFetching || !showCepSearch}>Buscar</Button>
                                    </div>
                                    <div className="grid md:grid-cols-[2fr_1fr] gap-4">
                                        <FormField name="endereco.logradouro" render={({ field }) => (<FormItem><FormLabel>Logradouro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name="endereco.numero" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input id="endereco.numero" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <FormField name="endereco.complemento" render={({ field }) => (<FormItem><FormLabel>Complemento (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <FormField name="endereco.bairro" render={({ field }) => (<FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField name="endereco.cidade" render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <FormField name="endereco.uf" render={({ field }) => (<FormItem><FormLabel>UF</FormLabel><FormControl><Input maxLength={2} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader><CardTitle>Configuração Fiscal</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField name="regimeTributario" render={({ field }) => (
                                        <FormItem><FormLabel>Regime Tributário</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="1">Simples Nacional</SelectItem>
                                                    <SelectItem value="3">Regime Normal</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        <FormMessage /></FormItem>
                                    )}/>
                                    <FormField name="inscricaoEstadual" render={({ field }) => ( <FormItem><FormLabel>Inscrição Estadual</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField name="configuracaoFiscal.cfop_padrao" render={({ field }) => (<FormItem><FormLabel>CFOP Padrão</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="configuracaoFiscal.cst_padrao" render={({ field }) => (<FormItem><FormLabel>CST / CSOSN Padrão</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="configuracaoFiscal.aliquota_icms_padrao" render={({ field }) => (<FormItem><FormLabel>Alíquota ICMS Padrão (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name="configuracaoFiscal.informacoes_complementares" render={({ field }) => (
                                    <FormItem><FormLabel>Informações Complementares</FormLabel>
                                        <FormControl><Textarea rows={6} placeholder="Mensagem que aparecerá no rodapé da NF-e..." {...field} /></FormControl>
                                    <FormMessage /></FormItem>
                                    )}/>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </fieldset>
            </div>
        </GenericForm>
    );
}
