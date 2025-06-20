// app/dashboard/fornecedores/page.tsx
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
import { Fornecedor, fornecedorSchema, addFornecedor, subscribeToFornecedores, updateFornecedor, deleteFornecedor } from "@/lib/services/fornecedores.services";
import { Separator } from "@/components/ui/separator";

type FornecedorFormValues = z.infer<typeof fornecedorSchema>;

export default function FornecedoresPage() {
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [isEditing, setIsEditing] = useState<boolean>(false);

    const form = useForm<FornecedorFormValues>({
        resolver: zodResolver(fornecedorSchema),
        defaultValues: {
            razaoSocial: "",
            cnpj: "",
            contato: "",
            endereco: "",
            dadosBancarios: { banco: "", agencia: "", conta: "", pix: "" }
        },
    });

    useEffect(() => {
        const unsubscribe = subscribeToFornecedores(setFornecedores);
        return () => unsubscribe();
    }, []);

    const handleEdit = (fornecedor: Fornecedor) => {
        form.reset(fornecedor);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja remover este fornecedor?")) return;
        try {
            await deleteFornecedor(id);
            toast.success("Fornecedor removido com sucesso!");
        } catch (error) {
            toast.error("Erro ao remover o fornecedor.");
        }
    };

    const resetForm = () => {
        form.reset({
            id: undefined,
            razaoSocial: "",
            cnpj: "",
            contato: "",
            endereco: "",
            dadosBancarios: { banco: "", agencia: "", conta: "", pix: "" }
        });
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
        } catch (error) {
            toast.error("Ocorreu um erro ao salvar o fornecedor.");
        }
    };

    const columns: ColumnDef<Fornecedor>[] = [
        { accessorKey: "razaoSocial", header: "Razão Social" },
        { accessorKey: "cnpj", header: "CNPJ" },
        { accessorKey: "contato", header: "Contato" },
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
        <GenericForm schema={fornecedorSchema} onSubmit={onSubmit} formId="fornecedor-form" form={form}>
            <div className="space-y-4">
                <FormField name="razaoSocial" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Razão Social</FormLabel><FormControl><Input placeholder="Nome da empresa" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="cnpj" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>CNPJ</FormLabel><FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="contato" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Contato (Telefone)</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="endereco" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input placeholder="Rua, Número, Bairro, Cidade - Estado" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

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

    const tableContent = <GenericTable columns={columns} data={fornecedores} />;

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Fornecedor" : "Novo Fornecedor"}
            formContent={formContent}
            tableTitle="Fornecedores Cadastrados"
            tableContent={tableContent}
        />
    );
}
