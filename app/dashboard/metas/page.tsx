"use client"

import { useState, useMemo, useCallback } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef, Row } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil, IconTrash, IconAlertTriangle } from "@tabler/icons-react";
import Link from "next/link";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Meta, metaSchema } from "@/lib/schemas";
import { addMeta, updateMeta, setMetaStatus } from "@/lib/services/metas.services";
import { Combobox } from "@/components/ui/combobox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useDataStore } from "@/store/data.store";
import { useAuthStore } from "@/store/auth.store";
import z from "zod";
import { DetailsSubRow } from "@/components/details-sub-row";

type MetaFormValues = z.infer<typeof metaSchema>;
type MetaComDetalhes = Meta & { produtoNome?: string; unidade?: string };

export default function MetasPage() {
    const { metas, produtos, unidades } = useDataStore();
    const { role } = useAuthStore();
    const [isEditing, setIsEditing] = useState<boolean>(false);

    const form = useForm<MetaFormValues>({
        resolver: zodResolver(metaSchema),
        defaultValues: { produtoId: "", metaPorAnimal: 0 },
    });

    const produtosParaVendaOptions = useMemo(() =>
        produtos
            .filter(p => p.tipoProduto === 'VENDA')
            .map(p => ({ label: p.nome, value: p.id! })),
    [produtos]);

    const dependenciasFaltantes = useMemo(() => {
        if (produtos.filter(p => p.tipoProduto === 'VENDA').length === 0) {
            return [{ nome: "Produtos de Venda", link: "/dashboard/produtos" }];
        }
        return [];
    }, [produtos]);

    const metasComDetalhes: MetaComDetalhes[] = useMemo(() => {
        return metas.map((meta: Meta) => {
            const produtoAssociado = produtos.find(p => p.id === meta.produtoId);
            let unidadeNome = "N/A";
            if (produtoAssociado?.tipoProduto === 'VENDA' && produtoAssociado.unidadeId) {
                unidadeNome = unidades.find(u => u.id === produtoAssociado.unidadeId)?.sigla || "N/A";
            }

            return {
                ...meta,
                produtoNome: produtoAssociado?.nome || "N/A",
                unidade: unidadeNome,
            };
        });
    }, [metas, produtos, unidades]);

    const handleEdit = (meta: Meta) => {
        form.reset(meta);
        setIsEditing(true);
    };

    const handleInactivate = async (id: string) => {
        if (!confirm("Tem certeza que deseja inativar esta meta?")) return;
        try {
            await setMetaStatus(id, 'inativo');
            toast.success("Meta inativada com sucesso!");
        } catch {
            toast.error("Erro ao inativar a meta.");
        }
    };

    const resetForm = () => {
        form.reset({ id: "", produtoId: "", metaPorAnimal: 0 });
        setIsEditing(false);
    };

    const onSubmit: SubmitHandler<MetaFormValues> = async (values) => {
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

    const renderSubComponent = useCallback(({ row }: { row: Row<MetaComDetalhes> }) => {
        const meta = row.original;
        const details = [
            { label: "Unidade", value: meta.unidade }
        ];
        return <DetailsSubRow details={details} />;
    }, []);

    const columns: ColumnDef<MetaComDetalhes>[] = [
        { accessorKey: "produtoNome", header: "Produto" },
        { accessorKey: "metaPorAnimal", header: "Meta por Animal" },
        {
            id: "actions",
            cell: ({ row }) => {
                const isEditable = role === 'ADMINISTRADOR';

                return (
                    <div className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} disabled={!isEditable}>
                            <IconPencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleInactivate(row.original.id!)} disabled={!isEditable}>
                            <IconTrash className="h-4 w-4" />
                        </Button>
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
                    Para registrar uma meta, você precisa primeiro cadastrar:
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
            <GenericForm schema={metaSchema} onSubmit={onSubmit} formId="meta-form" form={form}>
                <div className="space-y-4">
                    <FormField
                        name="produtoId"
                        control={form.control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Produto</FormLabel>
                                <Combobox
                                    options={produtosParaVendaOptions}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Selecione um produto de venda"
                                    searchPlaceholder="Buscar produto..."
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField name="metaPorAnimal" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Meta por Animal</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="flex justify-end gap-2 pt-6">
                    {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                    <Button type="submit" form="meta-form">{isEditing ? "Salvar Alterações" : "Cadastrar"}</Button>
                </div>
            </GenericForm>
        )
    );

    const tableContent = (
        <GenericTable
            columns={columns}
            data={metasComDetalhes}
            filterPlaceholder="Filtrar por produto..."
            filterColumnId="produtoNome"
            renderSubComponent={renderSubComponent}
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
