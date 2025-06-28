"use client"

import { useState, useMemo, useEffect } from "react";
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
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaskedInput } from "@/components/ui/masked-input";
import { Cliente, clienteSchema } from "@/lib/schemas";
import { addCliente, updateCliente, setClienteStatus } from "@/lib/services/clientes.services";
import { useAuthStore } from "@/store/auth.store";
import { useDataStore } from "@/store/data.store";
import z from "zod";
import { Separator } from "@/components/ui/separator";
import { fetchCnpjData } from "@/lib/services/brasilapi.services";
import { isValidCnpj, isValidCpf } from "@/lib/validators";


// Validação refinada para CPF/CNPJ
const formSchema = clienteSchema.superRefine((data, ctx) => {
    if (data.tipoPessoa === 'fisica' && !isValidCpf(data.documento)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "CPF inválido.",
            path: ["documento"],
        });
    }
    if (data.tipoPessoa === 'juridica' && !isValidCnpj(data.documento)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "CNPJ inválido.",
            path: ["documento"],
        });
    }
});


type ClienteFormValues = z.infer<typeof formSchema>;

const defaultFormValues: DefaultValues<ClienteFormValues> = {
    nome: "",
    tipoPessoa: undefined, // O Select tratará o placeholder
    documento: "",
    telefone: "",
    email: "",
    inscricaoEstadual: "",
    endereco: {
        logradouro: "",
        numero: "",
        bairro: "",
        cidade: "",
        uf: "",
        cep: "",
        complemento: "",
    }
};

export default function ClientesPage() {
    const clientes = useDataStore((state) => state.clientes);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
    const { role } = useAuthStore();

    const form = useForm<ClienteFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: defaultFormValues,
        mode: "onBlur"
    });

    const tipoPessoa = form.watch("tipoPessoa");
    const documento = form.watch("documento");

    const showCnpjSearch = useMemo(() => {
        return tipoPessoa === 'juridica' && isValidCnpj(documento);
    }, [tipoPessoa, documento]);

    // Efeito para limpar o campo de documento ao trocar o tipo de pessoa
    useEffect(() => {
        form.setValue("documento", "");
    }, [tipoPessoa, form.setValue]);


    const handleFetchCnpj = async () => {
        const cnpj = form.getValues("documento")?.replace(/\D/g, '');
        if (!cnpj) return;

        setIsFetchingCnpj(true);
        const promise = fetchCnpjData(cnpj);

        toast.promise(promise, {
            loading: 'Buscando dados do CNPJ...',
            success: (data) => {
                 form.reset({
                    ...form.getValues(),
                    nome: data.razao_social,
                    email: data.email || '',
                    telefone: data.ddd_telefone_1 || '',
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

    const handleEdit = (cliente: Cliente) => {
        form.reset(cliente);
        setIsEditing(true);
    };

    const handleInactivate = async (id: string) => {
        if (!confirm("Tem certeza que deseja inativar este cliente?")) return;
        try {
            await setClienteStatus(id, 'inativo');
            toast.success("Cliente inativado com sucesso!");
        } catch {
            toast.error("Erro ao inativar o cliente.");
        }
    };

    const resetForm = () => {
        form.reset(defaultFormValues);
        setIsEditing(false);
    };

    const onSubmit = async (values: ClienteFormValues) => {
        try {
            const { id, ...data } = values;
            if (isEditing && id) {
                await updateCliente(id, data);
                toast.success(`Cliente "${data.nome}" atualizado com sucesso!`);
            } else {
                await addCliente(data);
                toast.success(`Cliente "${data.nome}" cadastrado com sucesso!`);
            }
            resetForm();
        } catch {
            toast.error("Ocorreu um erro ao salvar o cliente.");
        }
    };

    const columns: ColumnDef<Cliente>[] = [
        { accessorKey: "nome", header: "Nome" },
        { accessorKey: "telefone", header: "Telefone" },
        { accessorKey: "email", header: "E-mail" },
        { accessorKey: "endereco.cidade", header: "Cidade" },
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
        <GenericForm schema={formSchema} onSubmit={onSubmit} formId="cliente-form" form={form}>
            <div className="space-y-4">
                <FormField name="nome" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Nome / Razão Social</FormLabel><FormControl><Input placeholder="Nome completo ou da empresa" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="grid md:grid-cols-2 gap-4">
                    <FormField name="tipoPessoa" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Pessoa Física ou Jurídica" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="fisica">Pessoa Física</SelectItem>
                                    <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField name="documento" control={form.control} render={({ field }) => (
                         <FormItem>
                            <FormLabel>CPF / CNPJ</FormLabel>
                            <div className="flex items-start gap-2">
                                <FormControl>
                                    <MaskedInput
                                        className="w-full"
                                        placeholder="Número do documento"
                                        mask={tipoPessoa === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
                                        {...field}
                                    />
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
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <FormField name="telefone" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Telefone</FormLabel>
                            <FormControl>
                                <MaskedInput mask="(00) 00000-0000" placeholder="(XX) XXXXX-XXXX" {...field} />
                            </FormControl>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField name="email" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="contato@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>

                 <FormField name="inscricaoEstadual" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Inscrição Estadual (Opcional)</FormLabel><FormControl><Input placeholder="Número da Inscrição Estadual" {...field} /></FormControl><FormMessage /></FormItem>
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
            </div>

            <div className="flex justify-end gap-2 pt-6">
                {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                <Button type="submit" form="cliente-form">{isEditing ? "Salvar Alterações" : "Cadastrar Cliente"}</Button>
            </div>
        </GenericForm>
    );

    const tableContent = (
      <GenericTable
        columns={columns}
        data={clientes}
        filterPlaceholder="Filtrar por nome..."
        filterColumnId="nome"
      />
    );

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Cliente" : "Novo Cliente"}
            formContent={formContent}
            tableTitle="Clientes Cadastrados"
            tableContent={tableContent}
        />
    );
}
