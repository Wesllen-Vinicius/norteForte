"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ColumnDef, Row } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil, IconTrash, IconLock, IconRefresh } from "@tabler/icons-react";
import { Unsubscribe } from "firebase/firestore";
import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DetailsSubRow } from "@/components/details-sub-row";
import { createUserInAuth } from "@/lib/services/auth.services";
import { setUserDoc, setUserStatus, subscribeToUsersByStatus } from "@/lib/services/user.services";
import { useAuthStore } from "@/store/auth.store";
import { SystemUser } from "@/lib/schemas";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Schema mais seguro, separando a validação de criação e edição
const formSchema = z.object({
  displayName: z.string().min(3, "O nome de exibição é obrigatório."),
  email: z.string().email("E-mail inválido."),
  role: z.enum(['ADMINISTRADOR', 'USUARIO']),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres.").optional().or(z.literal('')),
});

type UserFormValues = z.infer<typeof formSchema>;
type StatusFiltro = "ativo" | "inativo";

export default function UsuariosPage() {
    const [users, setUsers] = useState<SystemUser[]>([]);
    const { user: currentUser, role } = useAuthStore();
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editingUid, setEditingUid] = useState<string | null>(null);
    const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("ativo");

    useEffect(() => {
        // Se o usuário não for admin, não precisa se inscrever nos dados
        if (role !== 'ADMINISTRADOR') return;

        const unsubscribe: Unsubscribe = subscribeToUsersByStatus(statusFiltro, setUsers);
        return () => unsubscribe(); // Limpa o listener ao desmontar o componente ou mudar o filtro
    }, [statusFiltro, role]);

    const form = useForm<UserFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { displayName: "", email: "", role: "USUARIO", password: "" },
    });

    const handleEdit = (user: SystemUser) => {
        setEditingUid(user.uid);
        setIsEditing(true);
        form.reset({
            displayName: user.displayName,
            email: user.email,
            role: user.role,
            password: "",
        });
    };

    const handleStatusChange = async (uid: string, newStatus: StatusFiltro) => {
        if (uid === currentUser?.uid) {
            toast.error("Você não pode alterar o status da sua própria conta.");
            return;
        }
        const action = newStatus === 'inativo' ? 'inativar' : 'reativar';
        if (!confirm(`Tem certeza que deseja ${action} este usuário?`)) return;

        try {
            await setUserStatus(uid, newStatus);
            toast.success(`Usuário ${action} com sucesso!`);
        } catch (error: any) {
            toast.error(`Erro ao ${action} o usuário.`, { description: error.message });
        }
    };

    const resetForm = () => {
        form.reset({ displayName: "", email: "", role: "USUARIO", password: "" });
        setIsEditing(false);
        setEditingUid(null);
    };

    const onSubmit: SubmitHandler<UserFormValues> = async (values) => {
        const toastId = toast.loading("Salvando usuário...");
        try {
            if (isEditing && editingUid) {
                // Atualiza somente os campos permitidos
                await setUserDoc({ uid: editingUid, displayName: values.displayName, email: values.email, role: values.role });
                toast.success("Usuário atualizado com sucesso!", { id: toastId });
            } else {
                if (!values.password || values.password.length < 6) {
                    form.setError("password", { message: "A senha é obrigatória e deve ter no mínimo 6 caracteres." });
                    return toast.error("Senha inválida.", { id: toastId, description: "A senha precisa ter no mínimo 6 caracteres." });
                }
                const uid = await createUserInAuth(values.email, values.password);
                await setUserDoc({ uid, displayName: values.displayName, email: values.email, role: values.role, status: "ativo" });
                toast.success("Usuário criado com sucesso!", { id: toastId });
            }
            resetForm();
        } catch (error: any) {
            toast.error("Ocorreu um erro", { id: toastId, description: error.message });
        }
    };

    const renderSubComponent = useCallback(({ row }: { row: Row<SystemUser> }) => (
        <DetailsSubRow details={[{ label: "UID do Usuário", value: row.original.uid, className: "col-span-full" }]} />
    ), []);

    const columns: ColumnDef<SystemUser>[] = [
        { accessorKey: "displayName", header: "Nome" },
        { accessorKey: "email", header: "E-mail" },
        { accessorKey: "role", header: "Função", cell: ({ row }) => <Badge variant={row.original.role === 'ADMINISTRADOR' ? 'default' : 'secondary'}>{row.original.role}</Badge> },
        {
            id: "actions",
            cell: ({ row }) => {
                const isMyOwnAccount = row.original.uid === currentUser?.uid;
                return (
                    <div className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><IconPencil className="h-4 w-4" /></Button>
                        {statusFiltro === 'ativo' ? (
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleStatusChange(row.original.uid, 'inativo')} disabled={isMyOwnAccount}>
                                <IconTrash className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button variant="ghost" size="icon" className="text-emerald-500 hover:text-emerald-600" onClick={() => handleStatusChange(row.original.uid, 'ativo')}>
                                <IconRefresh className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            }
        },
    ];

    const tableControlsComponent = (
        <div className="flex justify-end w-full">
            <ToggleGroup type="single" value={statusFiltro} onValueChange={(value) => value && setStatusFiltro(value as StatusFiltro)}>
                <ToggleGroupItem value="ativo">Ativos</ToggleGroupItem>
                <ToggleGroupItem value="inativo">Inativos</ToggleGroupItem>
            </ToggleGroup>
        </div>
    );

    if (role !== 'ADMINISTRADOR') {
        return (
            <div className="container mx-auto py-6 px-4 md:px-6">
                <Alert variant="destructive">
                    <IconLock className="h-4 w-4" />
                    <AlertTitle>Acesso Restrito</AlertTitle>
                    <AlertDescription>
                        Você não tem permissão para gerenciar usuários.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Usuário" : "Novo Usuário do Sistema"}
            formContent={(
                <GenericForm schema={formSchema} onSubmit={onSubmit} formId="user-form" form={form}>
                    <div className="space-y-4">
                        <FormField name="displayName" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Nome de Exibição</FormLabel><FormControl><Input placeholder="Nome do usuário" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        <FormField name="email" control={form.control} render={({ field }) => ( <FormItem><FormLabel>E-mail de Acesso</FormLabel><FormControl><Input type="email" placeholder="email@dominio.com" {...field} disabled={isEditing} /></FormControl><FormMessage /></FormItem> )}/>
                        {!isEditing && ( <FormField name="password" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Senha</FormLabel><FormControl><Input type="password" placeholder="Mínimo 6 caracteres" {...field} /></FormControl><FormMessage /></FormItem> )}/> )}
                        <FormField name="role" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Função no Sistema</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione a função" /></SelectTrigger></FormControl><SelectContent><SelectItem value="ADMINISTRADOR">Administrador</SelectItem><SelectItem value="USUARIO">Usuário</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                    </div>
                    <div className="flex justify-end gap-2 pt-6">
                        {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                        <Button type="submit" form="user-form" disabled={form.formState.isSubmitting}>{isEditing ? "Salvar Alterações" : "Criar Usuário"}</Button>
                    </div>
                </GenericForm>
            )}
            tableTitle="Usuários Cadastrados"
            tableContent={(
                <GenericTable
                    columns={columns}
                    data={users}
                    filterPlaceholder="Filtrar por nome..."
                    filterColumnId="displayName"
                    renderSubComponent={renderSubComponent}
                    tableControlsComponent={tableControlsComponent}
                />
            )}
        />
    );
}
