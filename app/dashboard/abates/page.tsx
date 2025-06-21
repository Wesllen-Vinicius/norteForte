"use client"

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { format } from "date-fns";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { Timestamp } from "firebase/firestore";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Combobox } from "@/components/ui/combobox";
import { Abate, abateSchema, addAbate, updateAbate, deleteAbate } from "@/lib/services/abates.services";
import { useAuthStore } from "@/store/auth.store";
import { useDataStore } from "@/store/data.store";

// O schema do formulário não precisa do 'registradoPor', pois será adicionado programaticamente
const formSchema = abateSchema.omit({ registradoPor: true });
type AbateFormValues = z.infer<typeof formSchema>;

export default function AbatesPage() {
    const { abates, funcionarios } = useDataStore();
    const { user, role } = useAuthStore();

    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const form = useForm<AbateFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            data: new Date(),
            total: 0,
            condenado: 0,
            responsavelId: "",
        }
    });

    // Efeito para simular o carregamento inicial dos dados da tabela
    useEffect(() => {
        if (abates.length > 0) setIsLoading(false);
        const timer = setTimeout(() => setIsLoading(false), 1500); // Fim do skeleton após 1.5s
        return () => clearTimeout(timer);
    }, [abates]);

    // Prepara os dados para o Combobox
    const funcionarioOptions = useMemo(() =>
        funcionarios.map(f => ({ label: f.nomeCompleto, value: f.id! })),
    [funcionarios]);

    // Enriquece os dados de abate com os nomes para exibição na tabela
    const abatesComNomes = useMemo(() => {
        return abates.map(abate => ({
            ...abate,
            responsavelNome: funcionarios.find(f => f.id === abate.responsavelId)?.nomeCompleto || 'N/A',
        }))
    }, [abates, funcionarios]);

    const handleEdit = (abate: Abate) => {
        form.reset({
            id: abate.id,
            data: (abate.data as unknown as Timestamp).toDate(),
            total: abate.total,
            condenado: abate.condenado,
            responsavelId: abate.responsavelId,
        });
        setIsEditing(true);
    };

    const handleDeleteClick = (id: string) => {
        setSelectedId(id);
        setDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedId) return;
        try {
            await deleteAbate(selectedId);
            toast.success("Registro removido com sucesso!");
        } catch (error) {
            toast.error("Erro ao remover o registro.");
        } finally {
            setSelectedId(null);
            setDialogOpen(false);
        }
    };

    const resetForm = () => {
        form.reset({
            data: new Date(),
            total: 0,
            condenado: 0,
            responsavelId: "",
        });
        setIsEditing(false);
    };

    const onSubmit = async (values: AbateFormValues) => {
        if (!user) return toast.error("Usuário não autenticado.");

        try {
            if (isEditing && values.id) {
                // Atualização não muda quem registrou
                await updateAbate(values.id, values);
                toast.success("Registro de abate atualizado com sucesso!");
            } else {
                // Criação armazena quem registrou
                const dadosCompletos = {
                    ...values,
                    registradoPor: {
                        uid: user.uid,
                        nome: user.displayName || "Usuário desconhecido",
                    }
                };
                await addAbate(dadosCompletos);
                toast.success("Novo abate registrado com sucesso!");
            }
            resetForm();
        } catch (error: any) {
            toast.error("Falha ao salvar registro.", { description: error.message });
        }
    };

    const columns: ColumnDef<Abate & { responsavelNome?: string }>[] = [
        { accessorKey: "data", header: "Data", cell: ({ row }) => format(row.original.data as Date, "dd/MM/yyyy") },
        { accessorKey: "total", header: "Total" },
        { accessorKey: "condenado", header: "Condenado" },
        { accessorKey: "responsavelNome", header: "Responsável" },
        { header: "Registrado Por", cell: ({ row }) => row.original.registradoPor.nome },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original;
                const createdAt = item.createdAt as Timestamp | undefined;

                // Regra de edição: Admin pode sempre, usuário só se criou nas últimas 2h
                const podeEditar = role === 'ADMINISTRADOR' ||
                                   (item.registradoPor.uid === user?.uid && createdAt && (new Date(Date.now() - 2 * 60 * 60 * 1000) < createdAt.toDate()));

                // Regra de exclusão: Somente admin pode excluir
                const podeExcluir = role === 'ADMINISTRADOR';

                return(
                    <div className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={!podeEditar}>
                            <IconPencil className="h-4 w-4" />
                        </Button>
                        {podeExcluir && (
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(item.id!)}>
                                <IconTrash className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                )
            }
        },
    ];

    const formContent = (
      <GenericForm schema={formSchema} onSubmit={onSubmit} formId="abate-form" form={form}>
          <div className="space-y-4">
              <FormField name="data" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Data do Abate</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid md:grid-cols-2 gap-4">
                  <FormField name="total" control={form.control} render={({ field }) => (
                      <FormItem><FormLabel>Abate Total (cabeças)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField name="condenado" control={form.control} render={({ field }) => (
                      <FormItem><FormLabel>Condenado (cabeças)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
              </div>
               <FormField name="responsavelId" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Responsável pelo abate</FormLabel>
                    <Combobox
                        options={funcionarioOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Selecione um responsável"
                        searchPlaceholder="Buscar responsável..."
                        emptyMessage="Nenhum responsável encontrado."
                    />
                  <FormMessage /></FormItem>
                )} />
          </div>
          <div className="flex justify-end gap-2 pt-6">
              {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
              <Button type="submit" form="abate-form">{isEditing ? "Salvar" : "Registrar"}</Button>
          </div>
      </GenericForm>
    );

    const tableContent = (
      isLoading ?
        <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
        :
        <GenericTable
            columns={columns}
            data={abatesComNomes}
            filterPlaceholder="Filtrar por responsável..."
            filterColumnId="responsavelNome"
        />
    );

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
             <ConfirmationDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onConfirm={confirmDelete}
                title="Você tem certeza?"
                description="Esta ação não pode ser desfeita. Isso removerá permanentemente o registro de abate."
            />
            <CrudLayout
                formTitle={isEditing ? "Editar Registro de Abate" : "Novo Registro"}
                formContent={formContent}
                tableTitle="Histórico de Abates"
                tableContent={tableContent}
            />
        </div>
    );
}
