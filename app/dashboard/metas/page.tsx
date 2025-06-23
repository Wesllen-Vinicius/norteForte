"use client"

import { useState, useMemo } from "react";
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
import { Meta, metaSchema, addMeta, updateMeta, deleteMeta } from "@/lib/services/metas.services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataStore } from "@/store/data.store";
import { useAuthStore } from "@/store/auth.store";

type MetaFormValues = z.infer<typeof metaSchema>;
type MetaComDetalhes = Meta & { produtoNome?: string, unidade?: string };

export default function MetasPage() {
    const metas = useDataStore((state) => state.metas);
    const produtos = useDataStore((state) => state.produtos);
    const unidades = useDataStore((state) => state.unidades);
    const { role } = useAuthStore();
    const [isEditing, setIsEditing] = useState<boolean>(false);

    const form = useForm<MetaFormValues>({
        resolver: zodResolver(metaSchema),
        defaultValues: { produtoId: "", metaPorAnimal: 0 },
    });

    const metasComDetalhes: MetaComDetalhes[] = useMemo(() => {
        // CORREÇÃO: Tipagem explícita 'meta: Meta' para garantir que todas as propriedades sejam mantidas
        return metas.map((meta: Meta) => {
            const produtoAssociado = produtos.find(p => p.id === meta.produtoId);
            let unidadeNome = "N/A";
            if (produtoAssociado && produtoAssociado.tipoProduto === 'VENDA' && produtoAssociado.unidadeId) {
                unidadeNome = unidades.find(u => u.id === produtoAssociado.unidadeId)?.sigla || "N/A";
            }

            return {
                ...meta, // Agora o spread inclui todas as propriedades de 'Meta'
                produtoNome: produtoAssociado?.nome || "N/A",
                unidade: unidadeNome,
            };
        });
    }, [metas, produtos, unidades]);

    const handleEdit = (meta: Meta) => {
        form.reset(meta);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja remover esta meta?")) return;
        try {
            await deleteMeta(id);
            toast.success("Meta removida com sucesso!");
        } catch {
            toast.error("Erro ao remover a meta.");
        }
    };

    const resetForm = () => {
        form.reset({ id: "", produtoId: "", metaPorAnimal: 0 });
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
        } catch {
            toast.error("Ocorreu um erro ao salvar a meta.");
        }
    };

    // CORREÇÃO: As colunas agora esperam o tipo 'MetaComDetalhes'
    const columns: ColumnDef<MetaComDetalhes>[] = [
        { accessorKey: "produtoNome", header: "Produto" },
        { accessorKey: "metaPorAnimal", header: "Meta por Animal" },
        { accessorKey: "unidade", header: "Unidade" },
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
                                <SelectContent>{produtos.filter(p => p.tipoProduto === 'VENDA').map(p => <SelectItem key={p.id} value={p.id!}>{p.nome}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField name="metaPorAnimal" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Meta por Animal</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <div className="flex justify-end gap-2 pt-6">
                {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                <Button type="submit" form="meta-form">{isEditing ? "Salvar Alterações" : "Cadastrar"}</Button>
            </div>
        </GenericForm>
    );

    const tableContent = (
        <GenericTable
            columns={columns}
            data={metasComDetalhes}
            filterPlaceholder="Filtrar por produto..."
            filterColumnId="produtoNome"
        />
    );

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Meta" : "Nova Meta de Produção"}
            formContent={formContent}
            tableTitle="Metas Cadastradas"
            tableContent={tableContent}
        />
    );
}
