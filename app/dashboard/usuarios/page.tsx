"use client"

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { createUserInAuth } from "@/lib/services/auth.services";
import { setUserDoc, SystemUser, updateUserRole, userSchema } from "@/lib/services/user.services";
import { useDataStore } from "@/store/data.store";

type UserFormValues = z.infer<typeof userSchema>;

export default function UsuariosPage() {
    const users = useDataStore((state) => state.users);
    const [isEditing, setIsEditing] = useState<boolean>(false);

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: { uid: "", displayName: "", email: "", role: "USUARIO", password: "" },
    });

    const handleEdit = (user: SystemUser) => {
        form.reset({ ...user, password: "" });
        setIsEditing(true);
    };

    const resetForm = () => {
        form.reset({ uid: "", displayName: "", email: "", role: "USUARIO", password: "" });
        setIsEditing(false);
    };

    const onSubmit = async (values: UserFormValues) => {
        try {
            if (isEditing && values.uid) {
                await updateUserRole(values.uid, values.role);
                // O nome é atualizado na página "Minha Conta", aqui só atualizamos a função.
                // Para consistência, vamos atualizar o doc inteiro.
                await setUserDoc({ uid: values.uid, displayName: values.displayName, email: values.email, role: values.role });
                toast.success("Usuário atualizado com sucesso!");
            } else {
                if (!values.password) {
                    toast.error("A senha é obrigatória para criar um novo usuário.");
                    return;
                }
                const uid = await createUserInAuth(values.email, values.password);
                await setUserDoc({ uid, displayName: values.displayName, email: values.email, role: values.role });
                toast.success("Usuário criado com sucesso!");
            }
            resetForm();
        } catch (error: any) {
            toast.error("Ocorreu um erro", { description: error.message });
        }
    };

    const columns: ColumnDef<SystemUser>[] = [
        { accessorKey: "displayName", header: "Nome" },
        { accessorKey: "email", header: "E-mail" },
        { accessorKey: "role", header: "Função", cell: ({ row }) => <Badge variant={row.original.role === 'ADMINISTRADOR' ? 'default' : 'secondary'}>{row.original.role}</Badge> },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><IconPencil className="h-4 w-4" /></Button>
                    {/* A exclusão de usuários do Firebase Auth é uma operação sensível e foi desabilitada para segurança. */}
                    <Button variant="ghost" size="icon" disabled className="text-destructive hover:text-destructive"><IconTrash className="h-4 w-4" /></Button>
                </div>
            )
        },
    ];

    const formContent = (
        <GenericForm schema={userSchema} onSubmit={onSubmit} formId="user-form" form={form}>
            <div className="space-y-4">
                <FormField name="displayName" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Nome de Exibição</FormLabel><FormControl><Input placeholder="Nome do usuário" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="email" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>E-mail de Acesso</FormLabel><FormControl><Input type="email" placeholder="email@dominio.com" {...field} disabled={isEditing} /></FormControl><FormMessage /></FormItem>
                )} />
                {!isEditing && (
                    <FormField name="password" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" placeholder="Mínimo 6 caracteres" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                )}
                <FormField name="role" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Função no Sistema</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione a função" /></SelectTrigger></FormControl><SelectContent><SelectItem value="ADMINISTRADOR">Administrador</SelectItem><SelectItem value="USUARIO">Usuário</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
            </div>
            <div className="flex justify-end gap-2 pt-6">
                {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                <Button type="submit" form="user-form">{isEditing ? "Salvar Alterações" : "Criar Usuário"}</Button>
            </div>
        </GenericForm>
    );

    const tableContent = (
        <GenericTable
            columns={columns}
            data={users}
            filterPlaceholder="Filtrar por nome..."
            filterColumnId="displayName"
        />
    );

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Usuário" : "Novo Usuário do Sistema"}
            formContent={formContent}
            tableTitle="Usuários Cadastrados"
            tableContent={tableContent}
        />
    );
}
