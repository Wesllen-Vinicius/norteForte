"use client"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil, IconTrash, IconLock } from "@tabler/icons-react";
import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Categoria, categoriaSchema } from "@/lib/schemas";
import { addCategoria, updateCategoria, setCategoriaStatus } from "@/lib/services/categorias.services";
import { useAuthStore } from "@/store/auth.store";
import { useDataStore } from "@/store/data.store";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import z from "zod";

type CategoriaFormValues = z.infer<typeof categoriaSchema>;

export default function CategoriasPage() {
    const categorias = useDataStore((state) => state.categorias);
    const { role } = useAuthStore();
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const isReadOnly = role !== 'ADMINISTRADOR';

    const form = useForm<CategoriaFormValues>({
        resolver: zodResolver(categoriaSchema),
        defaultValues: { nome: "" },
    });

    const handleEdit = (categoria: Categoria) => {
        if(isReadOnly) return;
        form.reset(categoria);
        setIsEditing(true);
    };

    const handleInactivate = async (id: string) => {
        if (!confirm("Tem certeza que deseja inativar esta categoria?")) return;
        try {
            await setCategoriaStatus(id, 'inativo');
            toast.success("Categoria inativada com sucesso!");
        } catch {
            toast.error("Erro ao inativar a categoria.");
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
        } catch {
            toast.error("Ocorreu um erro ao salvar a categoria.");
        }
    };

    const columns: ColumnDef<Categoria>[] = [
        { accessorKey: "nome", header: "Nome da Categoria" },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="text-right">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={isReadOnly}>
                                        <IconPencil className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Editar Categoria</p></TooltipContent>
                            </Tooltip>
                            {!isReadOnly && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleInactivate(item.id!)}>
                                            <IconTrash className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Inativar Categoria</p></TooltipContent>
                                </Tooltip>
                            )}
                        </TooltipProvider>
                    </div>
                );
            }
        },
    ];

    const formContent = (
        <fieldset disabled={isReadOnly} className="disabled:opacity-70">
            <GenericForm schema={categoriaSchema} onSubmit={onSubmit} formId="categoria-form" form={form}>
                <div className="space-y-4">
                    <FormField name="nome" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Nome da Categoria</FormLabel><FormControl><Input placeholder="Ex: Higiene, Ferramentas, Escritório" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="flex justify-end gap-2 pt-6">
                    {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                    <Button type="submit" form="categoria-form">{isEditing ? "Salvar Alterações" : "Cadastrar"}</Button>
                </div>
            </GenericForm>
            {isReadOnly && (
                <Alert variant="destructive" className="mt-6">
                    <IconLock className="h-4 w-4" />
                    <AlertTitle>Acesso Restrito</AlertTitle>
                    <AlertDescription>Apenas administradores podem gerenciar categorias.</AlertDescription>
                </Alert>
            )}
        </fieldset>
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
