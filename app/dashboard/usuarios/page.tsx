"use client"

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { IconPencil, IconLock, IconUserPlus, IconUserOff } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";

import { CrudLayout } from "@/components/crud-layout";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

import { SystemUser, userSchema } from "@/lib/schemas";
import { createUserInAuth } from "@/lib/services/auth.services";
import { setUserDoc, updateUserRole, setUserStatus, subscribeToUsers } from "@/lib/services/user.services";
import { useAuthStore } from "@/store/auth.store";

// Schema para o formulário de criação/edição de usuário
const userFormSchema = userSchema.pick({
    displayName: true,
    email: true,
    role: true,
    password: true,
}).extend({
    id: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export default function UsuariosPage() {
    const { role: currentUserRole } = useAuthStore();
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const isReadOnly = currentUserRole !== 'ADMINISTRADOR';

    useEffect(() => {
        if (isReadOnly) return;
        const unsubscribe = subscribeToUsers(setUsers);
        return () => unsubscribe();
    }, [isReadOnly]);

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema),
        defaultValues: { displayName: "", email: "", password: "", role: "USUARIO" },
    });

    const { control, handleSubmit, reset, formState: { isSubmitting } } = form;

    const handleEdit = (user: SystemUser) => {
        if (isReadOnly) return;
        reset({
            id: user.uid,
            displayName: user.displayName,
            email: user.email,
            role: user.role,
            password: "", // Limpa a senha no modo de edição
        });
        setIsEditing(true);
        setEditingId(user.uid);
    };

    const handleStatusChange = async (uid: string, currentStatus: 'ativo' | 'inativo') => {
        const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
        const actionText = newStatus === 'inativo' ? 'inativar' : 'reativar';
        if (!confirm(`Tem certeza que deseja ${actionText} este usuário?`)) return;

        try {
            await setUserStatus(uid, newStatus);
            toast.success(`Usuário ${actionText} com sucesso!`);
        } catch (error: any) {
            toast.error(`Erro ao ${actionText} usuário.`, { description: error.message });
        }
    };

    const resetForm = () => {
        reset({ displayName: "", email: "", password: "", role: "USUARIO" });
        setIsEditing(false);
        setEditingId(null);
    };

    const onSubmit = async (values: UserFormValues) => {
        try {
            if (isEditing && editingId) {
                // Lógica de Edição
                await updateUserRole(editingId, values.role);
                // Adicione outras lógicas de atualização se necessário (ex: nome)
                toast.success("Usuário atualizado com sucesso!");
            } else {
                // Lógica de Criação
                if (!values.password) {
                    toast.error("A senha é obrigatória para criar um novo usuário.");
                    return;
                }
                const uid = await createUserInAuth(values.email, values.password);
                await setUserDoc({
                    uid,
                    displayName: values.displayName,
                    email: values.email,
                    role: values.role,
                    status: 'ativo',
                });
                toast.success("Usuário criado com sucesso!");
            }
            resetForm();
        } catch (error: any) {
            toast.error("Erro ao salvar usuário.", { description: error.message });
        }
    };

    const columns: ColumnDef<SystemUser>[] = [
        { accessorKey: "displayName", header: "Nome" },
        { accessorKey: "email", header: "E-mail" },
        { accessorKey: "role", header: "Função", cell: ({ row }) => <Badge variant={row.original.role === 'ADMINISTRADOR' ? 'default' : 'secondary'}>{row.original.role}</Badge> },
        { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge variant={row.original.status === 'ativo' ? 'success' : 'destructive'}>{row.original.status === 'ativo' ? 'Ativo' : 'Inativo'}</Badge> },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="text-right">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} disabled={isReadOnly}><IconPencil className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Editar Função</p></TooltipContent>
                        </Tooltip>
                        {!isReadOnly && (
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className={row.original.status === 'ativo' ? 'text-destructive hover:text-destructive' : 'text-emerald-500 hover:text-emerald-600'} onClick={() => handleStatusChange(row.original.uid, row.original.status || 'inativo')}>
                                        {row.original.status === 'ativo' ? <IconUserOff className="h-4 w-4" /> : <IconUserPlus className="h-4 w-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{row.original.status === 'ativo' ? 'Inativar Usuário' : 'Reativar Usuário'}</p></TooltipContent>
                            </Tooltip>
                        )}
                    </TooltipProvider>
                </div>
            )
        }
    ];

    if (isReadOnly) {
        return (
            <div className="container mx-auto py-6 px-4 md:px-6">
                <Alert variant="destructive"><IconLock className="h-4 w-4" /><AlertTitle>Acesso Restrito</AlertTitle><AlertDescription>Apenas administradores podem gerenciar usuários.</AlertDescription></Alert>
            </div>
        );
    }

    const formContent = (
        <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                    <FormField name="displayName" control={control} render={({ field }) => ( <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Nome do usuário" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField name="email" control={control} render={({ field }) => ( <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="email@dominio.com" {...field} disabled={isEditing} /></FormControl><FormMessage /></FormItem> )} />
                    {!isEditing && (
                        <FormField name="password" control={control} render={({ field }) => ( <FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" placeholder="Mínimo 6 caracteres" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    )}
                    <FormField name="role" control={control} render={({ field }) => ( <FormItem><FormLabel>Função</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="USUARIO">Usuário</SelectItem><SelectItem value="ADMINISTRADOR">Administrador</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Usuário')}</Button>
                </div>
            </form>
        </Form>
    );

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Usuário" : "Novo Usuário do Sistema"}
            formContent={formContent}
            tableTitle="Usuários Cadastrados"
            tableContent={(
                <GenericTable
                    columns={columns}
                    data={users}
                    filterPlaceholder="Filtrar por nome ou e-mail..."
                    filterColumnId="displayName"
                />
            )}
        />
    );
}
