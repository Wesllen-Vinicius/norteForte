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
import { DateRange } from "react-day-picker";

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
import { DateRangePicker } from "@/components/date-range-picker";
import { Badge } from "@/components/ui/badge";

const formSchema = abateSchema.omit({ registradoPor: true });
type AbateFormValues = z.infer<typeof formSchema>;
type AbateComDetalhes = Abate & { responsavelNome?: string, registradorRole?: string };

export default function AbatesPage() {
    const { abates, funcionarios, users } = useDataStore();
    const { user, role } = useAuthStore();

    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [globalFilter, setGlobalFilter] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const form = useForm<AbateFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { data: new Date(), total: 0, condenado: 0, responsavelId: "" }
    });

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    const funcionarioOptions = useMemo(() =>
        funcionarios.map(f => ({ label: f.nomeCompleto, value: f.id! })),
    [funcionarios]);

    const filteredAndEnrichedAbates = useMemo(() => {
        let filteredData = abates;

        if (dateRange?.from) {
            const fromDate = dateRange.from;
            const toDate = dateRange.to || dateRange.from;

            const startOfDay = new Date(fromDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(toDate);
            endOfDay.setHours(23, 59, 59, 999);

            filteredData = filteredData.filter(abate => {
                const abateDate = abate.data as Date;
                return abateDate >= startOfDay && abateDate <= endOfDay;
            });
        }

        return filteredData.map(abate => {
            const responsavel = funcionarios.find(f => f.id === abate.responsavelId)?.nomeCompleto || 'N/A';
            const registrador = users.find(u => u.uid === abate.registradoPor.uid);
            return {
                ...abate,
                responsavelNome: responsavel,
                registradorRole: registrador?.role || 'N/A',
            };
        });
    }, [abates, funcionarios, users, dateRange]);

    const columns: ColumnDef<AbateComDetalhes>[] = [
        { accessorKey: "data", header: "Data", cell: ({ row }) => format(row.original.data as Date, "dd/MM/yyyy") },
        { accessorKey: "total", header: "Total" },
        { accessorKey: "condenado", header: "Condenado" },
        { accessorKey: "responsavelNome", header: "Responsável" },
        { header: "Registrado Por", accessorKey: "registradoPor.nome" },
        { header: "Cargo do Registrador", accessorKey: "registradorRole", cell: ({ row }) => (
            <Badge variant={row.original.registradorRole === 'ADMINISTRADOR' ? 'default' : 'secondary'}>
                {row.original.registradorRole}
            </Badge>
          )
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original;
                const createdAt = item.createdAt as Timestamp | undefined;
                const podeEditar = role === 'ADMINISTRADOR' || (item.registradoPor.uid === user?.uid && createdAt && (new Date(Date.now() - 2 * 60 * 60 * 1000) < createdAt.toDate()));
                const podeExcluir = role === 'ADMINISTRADOR';

                return (
                    <div className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={!podeEditar}><IconPencil className="h-4 w-4" /></Button>
                        {podeExcluir && (
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(item.id!)}><IconTrash className="h-4 w-4" /></Button>
                        )}
                    </div>
                );
            }
        },
    ];

    const handleEdit = (abate: AbateComDetalhes) => {
      form.reset({
          id: abate.id,
          data: abate.data,
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
                const { id, ...dataToUpdate } = values;
                await updateAbate(id, dataToUpdate);
                toast.success("Registro de abate atualizado com sucesso!");
            } else {
                const dadosCompletos = {
                    ...values,
                    registradoPor: {
                        uid: user.uid,
                        nome: user.displayName || "Usuário",
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
                    <Combobox options={funcionarioOptions} value={field.value} onChange={field.onChange} placeholder="Selecione um responsável" searchPlaceholder="Buscar responsável..." />
                  <FormMessage /></FormItem>
                )} />
          </div>
          <div className="flex justify-end gap-2 pt-6">
              {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
              <Button type="submit" form="abate-form">{isEditing ? "Salvar" : "Registrar"}</Button>
          </div>
      </GenericForm>
    );

    const tableControls = (
      <div className="flex flex-col md:flex-row gap-4">
          <Input placeholder="Pesquisar..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="max-w-full md:max-w-sm" />
          <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>
    );

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
             <ConfirmationDialog open={dialogOpen} onOpenChange={setDialogOpen} onConfirm={confirmDelete} title="Você tem certeza?" description="Esta ação não pode ser desfeita. O registro será removido permanentemente." />
            <CrudLayout
                formTitle={isEditing ? "Editar Registro de Abate" : "Novo Registro"}
                formContent={formContent}
                tableTitle="Histórico de Abates"
                tableContent={
                    isLoading ? (
                        <div className="space-y-2">
                            <div className="flex flex-col md:flex-row gap-4"><Skeleton className="h-10 w-full md:w-sm" /><Skeleton className="h-10 w-[300px]" /></div>
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                        </div>
                    ) : (
                        <GenericTable columns={columns} data={filteredAndEnrichedAbates} globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} tableControlsComponent={tableControls} />
                    )
                }
            />
        </div>
    );
}
