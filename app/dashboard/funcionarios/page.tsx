"use client"

import { useState, useMemo, useCallback } from "react";
import { useForm, DefaultValues, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef, Row } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil, IconTrash, IconSearch, IconLoader, IconAlertTriangle, IconLock } from "@tabler/icons-react";
import Link from "next/link";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MaskedInput } from "@/components/ui/masked-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Funcionario, funcionarioSchema } from "@/lib/schemas";
import { addFuncionario, updateFuncionario, setFuncionarioStatus } from "@/lib/services/funcionarios.services";
import { useAuthStore } from "@/store/auth.store";
import { useDataStore } from "@/store/data.store";
import z from "zod";
import { fetchCnpjData } from "@/lib/services/brasilapi.services";
import { isValidCnpj, isValidCpf } from "@/lib/validators";
import { DetailsSubRow } from "@/components/details-sub-row";

const formSchema = funcionarioSchema.superRefine((data, ctx) => {
    if (data.cnpj && !isValidCnpj(data.cnpj)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CNPJ inválido.", path: ["cnpj"], });
    }
    if (data.cpf && !isValidCpf(data.cpf)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CPF inválido.", path: ["cpf"], });
    }
});

type FuncionarioFormValues = z.infer<typeof formSchema>;

const defaultFormValues: DefaultValues<FuncionarioFormValues> = {
    razaoSocial: "",
    cnpj: "",
    nomeCompleto: "",
    cpf: "",
    contato: "",
    cargoId: "",
    banco: "",
    agencia: "",
    conta: ""
};

export default function FuncionariosPage() {
    const { funcionarios, cargos } = useDataStore();
    const { role } = useAuthStore();
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isFetching, setIsFetching] = useState(false);
    const isReadOnly = role !== 'ADMINISTRADOR';

    const form = useForm<FuncionarioFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: defaultFormValues,
        mode: "onBlur"
    });

    const dependenciasFaltantes = useMemo(() => {
        const faltantes = [];
        if (!cargos || cargos.length === 0) {
            faltantes.push({ nome: "Cargos", link: "/dashboard/cargos" });
        }
        return faltantes;
    }, [cargos]);

    const cnpj = form.watch("cnpj");
    const showCnpjSearch = useMemo(() => isValidCnpj(cnpj), [cnpj]);

    const handleFetchCnpj = async () => {
        const cnpjValue = form.getValues("cnpj")?.replace(/\D/g, '');
        if (!cnpjValue) return;

        setIsFetching(true);
        const toastId = toast.loading("Buscando dados do CNPJ...");

        try {
            const data = await fetchCnpjData(cnpjValue);
            form.setValue("razaoSocial", data.razao_social);
            form.setValue("contato", data.ddd_telefone_1 || form.getValues("contato"));
            toast.success("Dados da empresa preenchidos!", { id: toastId });
        } catch (error: any) {
            toast.error(error.message, { id: toastId });
        } finally {
            setIsFetching(false);
        }
    };

    const funcionariosComCargo = useMemo(() => {
        return funcionarios.map(f => ({
            ...f,
            cargoNome: cargos.find(c => c.id === f.cargoId)?.nome || "N/A",
        }));
    }, [funcionarios, cargos]);

    const handleEdit = (funcionario: Funcionario) => {
        if(isReadOnly) return;
        form.reset(funcionario);
        setIsEditing(true);
    };

    const handleInactivate = async (id: string) => {
        if (!confirm("Tem certeza que deseja inativar este funcionário?")) return;
        try {
            await setFuncionarioStatus(id, 'inativo');
            toast.success("Funcionário inativado com sucesso!");
        } catch {
            toast.error("Erro ao inativar o funcionário.");
        }
    };

    const resetForm = () => {
        form.reset(defaultFormValues);
        setIsEditing(false);
    };

    const onSubmit = async (values: FuncionarioFormValues) => {
        const toastId = toast.loading("Salvando funcionário...");
        try {
            const { id, ...data } = values;
            if (isEditing && id) {
                await updateFuncionario(id, data);
                toast.success("Dados atualizados com sucesso!", { id: toastId });
            } else {
                await addFuncionario(data);
                toast.success(`Funcionário "${data.nomeCompleto}" cadastrado com sucesso!`, { id: toastId });
            }
            resetForm();
        } catch(error: any) {
            toast.error("Ocorreu um erro", { id: toastId, description: error.message });
        }
    };

    const renderSubComponent = useCallback(({ row }: { row: Row<Funcionario> }) => {
        const funcionario = row.original;
        const details = [
            { label: "CPF", value: funcionario.cpf || 'N/A' },
            { label: "Banco", value: funcionario.banco },
            { label: "Agência", value: funcionario.agencia },
            { label: "Conta", value: funcionario.conta },
        ];
        return <DetailsSubRow details={details} />;
    }, []);

    const columns: ColumnDef<Funcionario & { cargoNome?: string }>[] = [
        { accessorKey: "nomeCompleto", header: "Nome" },
        { accessorKey: "razaoSocial", header: "Razão Social" },
        { accessorKey: "cargoNome", header: "Cargo" },
        { accessorKey: "contato", header: "Contato" },
        {
            id: "actions",
            cell: ({ row }) => {
                const funcionario = row.original;
                return (
                    <div className="text-right">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(funcionario)} disabled={isReadOnly}>
                                        <IconPencil className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Editar Funcionário</p></TooltipContent>
                            </Tooltip>
                            {!isReadOnly && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleInactivate(funcionario.id!)}>
                                            <IconTrash className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Inativar Funcionário</p></TooltipContent>
                                </Tooltip>
                            )}
                        </TooltipProvider>
                    </div>
                );
            }
        },
    ];

    const formContent = (
        dependenciasFaltantes.length > 0 && !isEditing ? (
            <Alert variant="destructive">
                <IconAlertTriangle className="h-4 w-4" />
                <AlertTitle>Cadastro de pré-requisito necessário</AlertTitle>
                <AlertDescription>
                    Para registrar um funcionário, você precisa primeiro cadastrar:
                    <ul className="list-disc pl-5 mt-2">
                        {dependenciasFaltantes.map(dep => (
                            <li key={dep.nome}>
                                <Button variant="link" asChild className="p-0 h-auto font-bold">
                                    <Link href={dep.link}>{dep.nome}</Link>
                                </Button>
                            </li>
                        ))}
                    </ul>
                </AlertDescription>
            </Alert>
        ) : (
            <fieldset disabled={isReadOnly} className="disabled:opacity-70">
                <GenericForm schema={formSchema} onSubmit={onSubmit} formId="funcionario-form" form={form}>
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium">Dados da Empresa (MEI)</h3>
                            <Separator className="mt-2" />
                            <div className="space-y-4 mt-4">
                                <FormField name="razaoSocial" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Razão Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField name="cnpj" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>CNPJ</FormLabel>
                                        <div className="flex items-center gap-2">
                                            <FormControl>
                                                <MaskedInput mask="00.000.000/0000-00" placeholder="00.000.000/0000-00" {...field} />
                                            </FormControl>
                                            {showCnpjSearch && (
                                                <Button type="button" size="icon" variant="outline" onClick={handleFetchCnpj} disabled={isFetching}>
                                                    {isFetching ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconSearch className="h-4 w-4" />}
                                                </Button>
                                            )}
                                        </div>
                                    <FormMessage /></FormItem>
                                )} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium">Dados Pessoais</h3>
                            <Separator className="mt-2" />
                            <div className="space-y-4 mt-4">
                                <FormField name="nomeCompleto" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField name="cpf" control={form.control} render={({ field }) => (
                                        <FormItem><FormLabel>CPF</FormLabel>
                                            <FormControl>
                                                <MaskedInput mask="000.000.000-00" placeholder="000.000.000-00" {...field} />
                                            </FormControl>
                                        <FormMessage /></FormItem>
                                    )} />
                                    <FormField name="contato" control={form.control} render={({ field }) => (
                                        <FormItem><FormLabel>Telefone de Contato</FormLabel>
                                            <FormControl>
                                                <MaskedInput mask="(00) 00000-0000" placeholder="(00) 00000-0000" {...field} />
                                            </FormControl>
                                        <FormMessage /></FormItem>
                                    )} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium">Dados Internos</h3>
                            <Separator className="mt-2" />
                            <div className="space-y-4 mt-4">
                                <FormField name="cargoId" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Cargo/Função</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione um cargo" /></SelectTrigger></FormControl><SelectContent>{cargos.map(c => <SelectItem key={c.id} value={c.id!}>{c.nome}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium">Dados de Pagamento (Conta PJ)</h3>
                            <Separator className="mt-2" />
                            <div className="space-y-4 mt-4">
                                <div className="grid md:grid-cols-3 gap-4">
                                    <FormField name="banco" control={form.control} render={({ field }) => (
                                        <FormItem><FormLabel>Banco</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField name="agencia" control={form.control} render={({ field }) => (
                                        <FormItem><FormLabel>Agência</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField name="conta" control={form.control} render={({ field }) => (
                                        <FormItem><FormLabel>Conta</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-8">
                        {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                        <Button type="submit" form="funcionario-form">{isEditing ? "Salvar Alterações" : "Cadastrar Funcionário"}</Button>
                    </div>
                </GenericForm>
                {isReadOnly && (
                    <Alert variant="destructive" className="mt-6">
                        <IconLock className="h-4 w-4" />
                        <AlertTitle>Acesso Restrito</AlertTitle>
                        <AlertDescription>
                            Apenas administradores podem gerenciar funcionários.
                        </AlertDescription>
                    </Alert>
                )}
            </fieldset>
        )
    );

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Funcionário" : "Novo Funcionário"}
            formContent={formContent}
            tableTitle="Funcionários Cadastrados"
            tableContent={( <GenericTable columns={columns} data={funcionariosComCargo} filterPlaceholder="Filtrar por nome..." filterColumnId="nomeCompleto" renderSubComponent={renderSubComponent} /> )}
        />
    );
}
