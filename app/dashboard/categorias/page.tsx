"use client"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { Timestamp } from "firebase/firestore";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Categoria, categoriaSchema, addCategoria, updateCategoria, deleteCategoria } from "@/lib/services/categorias.services";
import { useAuthStore } from "@/store/auth.store";
import { useDataStore } from "@/store/data.store";

type CategoriaFormValues = z.infer<typeof categoriaSchema>;

export default function CategoriasPage() {
    const categorias = useDataStore((state) => state.categorias);
    const { role } = useAuthStore();
    const [isEditing, setIsEditing] = useState<boolean>(false);

    const form = useForm<CategoriaFormValues>({
        resolver: zodResolver(categoriaSchema),
        defaultValues: { nome: "" },
    });

    const handleEdit = (categoria: Categoria) => {
        form.reset(categoria);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja remover esta categoria?")) return;
        try {
            await deleteCategoria(id);
            toast.success("Categoria removida com sucesso!");
        } catch (error) {
            toast.error("Erro ao remover a categoria.");
        }
    };

    const resetForm = () => {
        form.reset({ id: "", nome: "" });
        setIsEditing(false);
    };

    const onSubmit = async (values: CategoriaFormValues) => {
        try {
            const { id, ...data } = values;
            if (isEditing && id) {
                await updateCategoria(id, data);
                toast.success("Categoria atualizada com sucesso!");
            } else {
                await addCategoria(data);
                toast.success("Categoria cadastrada com sucesso!");
            }
            resetForm();
        } catch (error) {
            toast.error("Ocorreu um erro ao salvar a categoria.");
        }
    };

    const columns: ColumnDef<Categoria>[] = [
        { accessorKey: "nome", header: "Nome da Categoria" },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original;
                const createdAt = item.createdAt as Timestamp | undefined;
                const isEditable = role === 'ADMINISTRADOR' || (createdAt ? (new Date(Date.now() - 2 * 60 * 60 * 1000) < createdAt.toDate()) : false);

                return (
                    <div className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} disabled={!isEditable}>
                            <IconPencil className="h-4 w-4" />
                        </Button>
                        {role === 'ADMINISTRADOR' && (
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(row.original.id!)}>
                                <IconTrash className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            }
        },
    ];

    const formContent = (
        <GenericForm schema={categoriaSchema} onSubmit={onSubmit} formId="categoria-form" form={form}>
            <div className="space-y-4">
                <FormField name="nome" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Nome da Categoria</FormLabel><FormControl><Input placeholder="Ex: Higiene, Ferramentas" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <div className="flex justify-end gap-2 pt-6">
                {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                <Button type="submit" form="categoria-form">{isEditing ? "Salvar Alterações" : "Cadastrar"}</Button>
            </div>
        </GenericForm>
    );

    const tableContent = (
        <GenericTable
            columns={columns}
            data={categorias}
            filterPlaceholder="Filtrar por nome..."
            filterColumnId="nome"
        />
    );

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Categoria" : "Nova Categoria de Item"}
            formContent={formContent}
            tableTitle="Categorias Cadastradas"
            tableContent={tableContent}
        />
    );
}
