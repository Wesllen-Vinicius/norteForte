"use client"

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cliente, clienteSchema, addCliente, subscribeToClientes, updateCliente, deleteCliente } from "@/lib/services/clientes.services";

type ClienteFormValues = z.infer<typeof clienteSchema>;

export default function ClientesPage() {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [isEditing, setIsEditing] = useState<boolean>(false);

    const form = useForm<ClienteFormValues>({
        resolver: zodResolver(clienteSchema),
        defaultValues: { id: "", nome: "", tipoPessoa: undefined, documento: "", telefone: "", email: "", endereco: "" },
    });

    useEffect(() => {
        const unsubscribe = subscribeToClientes(setClientes);
        return () => unsubscribe();
    }, []);

    const handleEdit = (cliente: Cliente) => {
        form.reset(cliente);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja remover este cliente?")) return;
        try {
            await deleteCliente(id);
            toast.success("Cliente removido com sucesso!");
        } catch (error) {
            toast.error("Erro ao remover o cliente.");
        }
    };

    const resetForm = () => {
        form.reset({ id: "", nome: "", tipoPessoa: undefined, documento: "", telefone: "", email: "", endereco: "" });
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
        } catch (error) {
            toast.error("Ocorreu um erro ao salvar o cliente.");
        }
    };

    const columns: ColumnDef<Cliente>[] = [
        { accessorKey: "nome", header: "Nome" },
        { accessorKey: "telefone", header: "Telefone" },
        { accessorKey: "email", header: "E-mail" },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><IconPencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(row.original.id!)}><IconTrash className="h-4 w-4" /></Button>
                </div>
            )
        },
    ];

    const formContent = (
        <GenericForm schema={clienteSchema} onSubmit={onSubmit} formId="cliente-form" form={form}>
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
                        <FormItem><FormLabel>CPF / CNPJ</FormLabel><FormControl><Input placeholder="Número do documento" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <FormField name="telefone" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="email" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input placeholder="contato@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField name="endereco" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input placeholder="Rua, Número, Bairro, Cidade - Estado" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>

            <div className="flex justify-end gap-2 pt-6">
                {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                <Button type="submit" form="cliente-form">{isEditing ? "Salvar Alterações" : "Cadastrar Cliente"}</Button>
            </div>
        </GenericForm>
    );

    const tableContent = <GenericTable columns={columns} data={clientes} />;

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Cliente" : "Novo Cliente"}
            formContent={formContent}
            tableTitle="Clientes Cadastrados"
            tableContent={tableContent}
        />
    );
}
