"use client"

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { IconPencil, IconTrash, IconLock } from "@tabler/icons-react";
import { ColumnDef, Row } from "@tanstack/react-table";

import { CrudLayout } from "@/components/crud-layout";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { Form, FormProvider, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuthStore } from "@/store/auth.store";
import { Role, roleSchema, modulosDePermissao } from "@/lib/schemas";
import { addRole, updateRole, subscribeToRoles, deleteRole } from "@/lib/services/roles.services";
import { DetailsSubRow } from "@/components/details-sub-row";
import { PermissionManager } from "@/components/permission-manager";

const formValidationSchema = roleSchema.pick({
    nome: true,
    descricao: true,
}).extend({
    id: z.string().optional()
});

type FormValidationValues = z.infer<typeof formValidationSchema>;

export default function PermissoesPage() {
    const { role: userRole } = useAuthStore();
    const [roles, setRoles] = useState<Role[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPermissions, setCurrentPermissions] = useState<Role['permissoes']>({});

    const form = useForm<FormValidationValues>({
        resolver: zodResolver(formValidationSchema),
        defaultValues: { nome: "", descricao: "" },
    });

    useEffect(() => {
        if (userRole !== 'ADMINISTRADOR') return;
        const unsubscribe = subscribeToRoles(setRoles);
        return () => unsubscribe();
    }, [userRole]);

    const handleEdit = (role: Role) => {
        form.reset({ id: role.id, nome: role.nome, descricao: role.descricao ?? "" });
        setCurrentPermissions(role.permissoes || {});
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta função?")) return;
        try {
            await deleteRole(id);
            toast.success("Função excluída com sucesso!");
        } catch (error: any) {
            toast.error("Erro ao excluir função.", { description: error.message });
        }
    };

    const resetForm = () => {
        form.reset({ nome: "", descricao: "" });
        setCurrentPermissions({});
        setIsEditing(false);
    };

    const onSubmit = async (values: FormValidationValues) => {
        const finalData = { ...values, permissoes: currentPermissions };
        const { id, ...data } = finalData;

        try {
            if (isEditing && id) {
                await updateRole(id, data);
                toast.success("Função atualizada com sucesso!");
            } else {
                await addRole(data as Omit<Role, 'id'>);
                toast.success("Função criada com sucesso!");
            }
            resetForm();
        } catch (error: any) {
            toast.error("Erro ao salvar função.", { description: error.message });
        }
    };

    const renderSubComponent = useCallback(({ row }: { row: Row<Role> }) => {
        const { permissoes } = row.original;
        const grantedPermissions = Object.entries(permissoes || {})
            .map(([modulo, acoes]) => {
                if (!acoes) return null;
                const acoesPermitidas = Object.entries(acoes)
                    .filter(([, permitido]) => permitido)
                    .map(([acao]) => acao)
                    .join(', ');
                return acoesPermitidas ? { label: modulosDePermissao[modulo as keyof typeof modulosDePermissao], value: acoesPermitidas } : null;
            }).filter(Boolean);

        if (grantedPermissions.length === 0) {
            return <div className="p-4 text-sm text-muted-foreground">Esta função não possui permissões específicas.</div>;
        }
        return <DetailsSubRow details={grantedPermissions as { label: string, value: string }[]} />;
    }, []);

    const columns: ColumnDef<Role>[] = [
        { accessorKey: "nome", header: "Nome da Função" },
        { accessorKey: "descricao", header: "Descrição" },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><IconPencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { if(row.original.id) handleDelete(row.original.id) }}><IconTrash className="h-4 w-4" /></Button>
                </div>
            )
        }
    ];

    if (userRole !== 'ADMINISTRADOR') {
        return (
             <div className="container mx-auto py-6 px-4 md:px-6">
                <Alert variant="destructive"><IconLock className="h-4 w-4" /><AlertTitle>Acesso Restrito</AlertTitle><AlertDescription>Apenas administradores podem gerenciar funções e permissões.</AlertDescription></Alert>
            </div>
        );
    }

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Função" : "Nova Função de Acesso"}
            formContent={(
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-4">
                            <FormField name="nome" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nome da Função</FormLabel><FormControl><Input placeholder="Ex: Vendedor, Gerente, Financeiro" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                            <FormField name="descricao" control={form.control} render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Input placeholder="Descreva o que essa função faz" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                        <Separator />
                        <PermissionManager permissoes={currentPermissions} setPermissoes={setCurrentPermissions} />
                        <div className="flex justify-end gap-2 pt-4">
                            {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                            <Button type="submit">{isEditing ? "Salvar Alterações" : "Criar Função"}</Button>
                        </div>
                    </form>
                </FormProvider>
            )}
            tableTitle="Funções Cadastradas"
            tableContent={(
                <GenericTable
                    columns={columns}
                    data={roles}
                    filterPlaceholder="Filtrar por nome..."
                    filterColumnId="nome"
                    // **TABELA AGORA É EXPANSÍVEL**
                    renderSubComponent={renderSubComponent}
                />
            )}
        />
    );
}
