"use client"

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { format } from "date-fns";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/date-picker";
import { Abate, abateSchema, addAbate, subscribeToAbates, updateAbate, deleteAbate } from "@/lib/services/abates.services";

type AbateFormValues = z.infer<typeof abateSchema>;

export default function AbatesPage() {
    const [abates, setAbates] = useState<Abate[]>([]);
    const [isEditing, setIsEditing] = useState<boolean>(false);

    const form = useForm<AbateFormValues>({
        resolver: zodResolver(abateSchema)
    });

    useEffect(() => {
        const unsubscribe = subscribeToAbates(setAbates);
        return () => unsubscribe();
    }, []);

    const handleEdit = (abate: Abate) => {
        form.reset(abate);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja remover este registro de abate?")) return;
        try {
            await deleteAbate(id);
            toast.success("Registro removido com sucesso!");
        } catch (error) {
            toast.error("Erro ao remover o registro.");
        }
    };

    const resetForm = () => {
        form.reset({ id: undefined, data: undefined, total: 0, boi: 0, vaca: 0, condenado: 0 });
        setIsEditing(false);
    };

    const onSubmit = async (values: AbateFormValues) => {
        try {
            const { id, ...data } = values;
            if (isEditing && id) {
                await updateAbate(id, data);
                toast.success("Registro de abate atualizado com sucesso!");
            } else {
                await addAbate(data);
                toast.success("Novo abate registrado com sucesso!");
            }
            resetForm();
        } catch (error: any) {
            toast.error("Falha ao salvar registro.", { description: error.message });
        }
    };

    const columns: ColumnDef<Abate>[] = [
        { accessorKey: "data", header: "Data", cell: ({ row }) => format(row.original.data, "dd/MM/yyyy") },
        { accessorKey: "total", header: "Total" },
        { accessorKey: "boi", header: "Boi" },
        { accessorKey: "vaca", header: "Vaca" },
        { accessorKey: "condenado", header: "Condenado" },
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
      <GenericForm schema={abateSchema} onSubmit={onSubmit} formId="abate-form" form={form}>
          <div className="space-y-4">
              <FormField name="data" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Data do Abate</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="total" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Abate Total</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid md:grid-cols-3 gap-4">
                  <FormField name="boi" control={form.control} render={({ field }) => (
                      <FormItem><FormLabel>Boi</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField name="vaca" control={form.control} render={({ field }) => (
                      <FormItem><FormLabel>Vaca</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField name="condenado" control={form.control} render={({ field }) => (
                      <FormItem><FormLabel>Condenado</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
              </div>
          </div>
          <div className="flex justify-end gap-2 pt-6">
              {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
              <Button type="submit" form="abate-form">{isEditing ? "Salvar Alterações" : "Registrar Abate"}</Button>
          </div>
      </GenericForm>
    );

    const tableContent = <GenericTable columns={columns} data={abates} />;

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Registro de Abate" : "Novo Registro de Abate"}
            formContent={formContent}
            tableTitle="Histórico de Abates"
            tableContent={tableContent}
        />
    );
}
