"use client"

import { useState, useMemo } from "react";
import { useForm, DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil, IconTrash, IconSearch, IconLoader } from "@tabler/icons-react";
import { Timestamp } from "firebase/firestore";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Fornecedor, fornecedorSchema } from "@/lib/schemas";
import { addFornecedor, updateFornecedor, setFornecedorStatus } from "@/lib/services/fornecedores.services";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/auth.store";
import { useDataStore } from "@/store/data.store";
import z from "zod";
import { MaskedInput } from "@/components/ui/masked-input";
import { fetchCnpjData } from "@/lib/services/brasilapi.services";
import { isValidCnpj } from "@/lib/validators";

const formSchema = fornecedorSchema.superRefine((data, ctx) => {
    if (!isValidCnpj(data.cnpj)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "CNPJ inválido.",
            path: ["cnpj"],
        });
    }
});

type FornecedorFormValues = z.infer<typeof formSchema>;

const defaultFormValues: DefaultValues<FornecedorFormValues> = {
    razaoSocial: "",
    cnpj: "",
    contato: "",
    endereco: {
        logradouro: "",
        numero: "",
        bairro: "",
        cidade: "",
        uf: "",
        cep: "",
        complemento: "",
    },
    dadosBancarios: { banco: "", agencia: "", conta: "", pix: "" }
};

export default function FornecedoresPage() {
    const fornecedores = useDataStore((state) => state.fornecedores);
    const { role } = useAuthStore();
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);

    const form = useForm<FornecedorFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: defaultFormValues,
        mode: "onBlur",
    });

    const cnpj = form.watch("cnpj");
    const showCnpjSearch = useMemo(() => isValidCnpj(cnpj), [cnpj]);

    const handleFetchCnpj = async () => {
        const cnpjValue = form.getValues("cnpj")?.replace(/\D/g, '');
        if (!cnpjValue) return;

        setIsFetchingCnpj(true);
        const promise = fetchCnpjData(cnpjValue);

        toast.promise(promise, {
            loading: 'Buscando dados do CNPJ...',
            success: (data) => {
                 form.reset({
                    ...form.getValues(),
                    razaoSocial: data.razao_social,
                    contato: data.ddd_telefone_1 || '',
                    endereco: {
                        logradouro: data.logradouro,
                        numero: data.numero,
                        bairro: data.bairro,
                        cidade: data.municipio,
                        uf: data.uf,
                        cep: data.cep.replace(/\D/g, ''),
                        complemento: data.complemento,
                    }
                });
                setIsFetchingCnpj(false);
                return "Dados preenchidos!";
            },
            error: (err) => {
                setIsFetchingCnpj(false);
                return err.message;
            }
        });
    };

    const handleEdit = (fornecedor: Fornecedor) => {
        form.reset(fornecedor);
        setIsEditing(true);
    };

    const handleInactivate = async (id: string) => {
        if (!confirm("Tem certeza que deseja inativar este fornecedor?")) return;
        try {
            await setFornecedorStatus(id, 'inativo');
            toast.success("Fornecedor inativado com sucesso!");
        } catch {
            toast.error("Erro ao inativar o fornecedor.");
        }
    };

    const resetForm = () => {
        form.reset(defaultFormValues);
        setIsEditing(false);
    };

    const onSubmit = async (values: FornecedorFormValues) => {
        try {
            const { id, ...data } = values;
            if (isEditing && id) {
                await updateFornecedor(id, data);
                toast.success(`Fornecedor "${data.razaoSocial}" atualizado com sucesso!`);
            } else {
                await addFornecedor(data);
                toast.success(`Fornecedor "${data.razaoSocial}" cadastrado com sucesso!`);
            }
            resetForm();
        } catch {
            toast.error("Ocorreu um erro ao salvar o fornecedor.");
        }
    };

    const columns: ColumnDef<Fornecedor>[] = [
        { accessorKey: "razaoSocial", header: "Razão Social" },
        { accessorKey: "cnpj", header: "CNPJ" },
        { accessorKey: "contato", header: "Contato" },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original;
                const createdAt = item.createdAt as Timestamp | undefined;
                const isEditable = role === 'ADMINISTRADOR' || (createdAt ? (new Date(Date.now() - 2 * 60 * 60 * 1000) < createdAt.toDate()) : false);

                return (
                    <div className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={!isEditable}>
                            <IconPencil className="h-4 w-4" />
                        </Button>
                        {role === 'ADMINISTRADOR' && (
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleInactivate(item.id!)}>
                                <IconTrash className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            }
        },
    ];

    const formContent = (
        <GenericForm schema={formSchema} onSubmit={onSubmit} formId="fornecedor-form" form={form}>
            <div className="space-y-4">
                <FormField name="razaoSocial" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Razão Social</FormLabel><FormControl><Input placeholder="Nome da empresa" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField name="cnpj" control={form.control} render={({ field }) => (
                    <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <div className="flex items-start gap-2">
                            <FormControl>
                                <MaskedInput mask="00.000.000/0000-00" placeholder="00.000.000/0000-00" {...field} />
                            </FormControl>
                            {showCnpjSearch && (
                                <Button type="button" size="icon" onClick={handleFetchCnpj} disabled={isFetchingCnpj}>
                                    {isFetchingCnpj ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconSearch className="h-4 w-4" />}
                                </Button>
                            )}
                        </div>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField name="contato" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Contato (Telefone)</FormLabel><FormControl><MaskedInput mask="(00) 00000-0000" placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <Separator className="my-6" />
                <h3 className="text-lg font-medium">Endereço</h3>

                <div className="grid md:grid-cols-[2fr_1fr] gap-4">
                    <FormField name="endereco.logradouro" control={form.control} render={({ field }) => (<FormItem><FormLabel>Logradouro</FormLabel><FormControl><Input placeholder="Rua, Av, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="endereco.numero" control={form.control} render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input placeholder="123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField name="endereco.complemento" control={form.control} render={({ field }) => (<FormItem><FormLabel>Complemento (Opcional)</FormLabel><FormControl><Input placeholder="Apto, Bloco, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid md:grid-cols-2 gap-4">
                     <FormField name="endereco.bairro" control={form.control} render={({ field }) => (<FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField name="endereco.cep" control={form.control} render={({ field }) => (<FormItem><FormLabel>CEP</FormLabel><FormControl><MaskedInput mask="00000-000" placeholder="00000-000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                 <div className="grid md:grid-cols-[2fr_1fr] gap-4">
                    <FormField name="endereco.cidade" control={form.control} render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="endereco.uf" control={form.control} render={({ field }) => (<FormItem><FormLabel>UF</FormLabel><FormControl><Input maxLength={2} placeholder="Ex: SP" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>

                <Separator className="my-6" />
                <h3 className="text-lg font-medium">Dados Bancários</h3>

                <FormField name="dadosBancarios.banco" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Banco</FormLabel><FormControl><Input placeholder="Nome do banco" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <div className="grid md:grid-cols-2 gap-4">
                    <FormField name="dadosBancarios.agencia" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Agência</FormLabel><FormControl><Input placeholder="0000" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="dadosBancarios.conta" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Conta Corrente</FormLabel><FormControl><Input placeholder="00000-0" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                 <FormField name="dadosBancarios.pix" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Chave PIX (Opcional)</FormLabel><FormControl><Input placeholder="Chave PIX" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>

            <div className="flex justify-end gap-2 pt-6">
                {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                <Button type="submit" form="fornecedor-form">{isEditing ? "Salvar Alterações" : "Cadastrar Fornecedor"}</Button>
            </div>
        </GenericForm>
    );

    const tableContent = (
        <GenericTable
            columns={columns}
            data={fornecedores}
            filterPlaceholder="Filtrar por razão social..."
            filterColumnId="razaoSocial"
        />
    );

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Fornecedor" : "Novo Fornecedor"}
            formContent={formContent}
            tableTitle="Fornecedores Cadastrados"
            tableContent={tableContent}
        />
    );
}
