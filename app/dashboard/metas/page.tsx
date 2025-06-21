// app/dashboard/metas/page.tsx
"use client"

import { useEffect, useState, useMemo } from "react";
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
import { Meta, metaSchema, addMeta, subscribeToMetas, updateMeta, deleteMeta } from "@/lib/services/metas.services";
import { Produto, subscribeToProdutos } from "@/lib/services/produtos.services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type MetaFormValues = z.infer<typeof metaSchema>;

export default function MetasPage() {
    const [metas, setMetas] = useState<Meta[]>([]);
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [isEditing, setIsEditing] = useState<boolean>(false);

    const form = useForm<MetaFormValues>({
        resolver: zodResolver(metaSchema),
        defaultValues: { produtoId: "", metaPorAnimal: 0, unidade: "" },
    });

    useEffect(() => {
        const unsubMetas = subscribeToMetas(setMetas);
        const unsubProdutos = subscribeToProdutos(setProdutos);
        return () => {
            unsubMetas();
            unsubProdutos();
        };
    }, []);

    const metasComNomes = useMemo(() => {
        return metas.map(meta => ({
            ...meta,
            produtoNome: produtos.find(p => p.id === meta.produtoId)?.nome || "N/A",
        }));
    }, [metas, produtos]);

    const handleEdit = (meta: Meta) => {
        form.reset(meta);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja remover esta meta?")) return;
        try {
            await deleteMeta(id);
            toast.success("Meta removida com sucesso!");
        } catch (error) {
            toast.error("Erro ao remover a meta.");
        }
    };

    const resetForm = () => {
        form.reset({ id: "", produtoId: "", metaPorAnimal: 0, unidade: "" });
        setIsEditing(false);
    };

    const onSubmit = async (values: MetaFormValues) => {
        try {
            const { id, ...data } = values;
            if (isEditing && id) {
                await updateMeta(id, data);
                toast.success("Meta atualizada com sucesso!");
            } else {
                await addMeta(data);
                toast.success("Meta cadastrada com sucesso!");
            }
            resetForm();
        } catch (error) {
            toast.error("Ocorreu um erro ao salvar a meta.");
        }
    };

    const columns: ColumnDef<Meta>[] = [
        { accessorKey: "produtoNome", header: "Produto" },
        { accessorKey: "metaPorAnimal", header: "Meta por Animal" },
        { accessorKey: "unidade", header: "Unidade" },
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
        <GenericForm schema={metaSchema} onSubmit={onSubmit} formId="meta-form" form={form}>
            <div className="space-y-4">
                <FormField
                    name="produtoId"
                    control={form.control}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Produto</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger></FormControl>
                                <SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id!}>{p.nome}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField name="metaPorAnimal" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Meta por Animal</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="unidade" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Unidade</FormLabel><FormControl><Input placeholder="Ex: kg, Un" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <div className="flex justify-end gap-2 pt-6">
                {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                <Button type="submit" form="meta-form">{isEditing ? "Salvar Alterações" : "Cadastrar"}</Button>
            </div>
        </GenericForm>
    );

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Meta" : "Nova Meta de Produção"}
            formContent={formContent}
            tableTitle="Metas Cadastradas"
            tableContent={<GenericTable columns={columns} data={metasComNomes} />}
        />
    );
}
