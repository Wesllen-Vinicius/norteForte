"use client"

import { useState, useMemo, useEffect } from "react";
import { useForm, DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { format } from "date-fns";
import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/date-picker";
import { Combobox } from "@/components/ui/combobox";
import { DespesaOperacional, despesaOperacionalSchema } from "@/lib/schemas";
import { addDespesa, updateDespesa, subscribeToDespesas, setDespesaStatus } from "@/lib/services/despesas.services";
import { useDataStore } from "@/store/data.store";
import { useAuthStore } from "@/store/auth.store";
import z from "zod";

type DespesaFormValues = z.infer<typeof despesaOperacionalSchema>;

const defaultFormValues: DefaultValues<DespesaFormValues> = {
    descricao: "",
    valor: 0,
    dataVencimento: new Date(),
    categoria: "",
    contaBancariaId: "",
    status: 'Pendente',
};

export default function DespesasPage() {
    const { contasBancarias } = useDataStore();
    const { role } = useAuthStore();
    const [despesas, setDespesas] = useState<DespesaOperacional[]>([]);
    const [isEditing, setIsEditing] = useState<boolean>(false);

    useEffect(() => {
        const unsubscribe = subscribeToDespesas(setDespesas);
        return () => unsubscribe();
    }, []);

    const form = useForm<DespesaFormValues>({
        resolver: zodResolver(despesaOperacionalSchema),
        defaultValues: defaultFormValues,
    });

    const contasBancariasOptions = useMemo(() =>
        contasBancarias.map(c => ({ label: `${c.nomeConta} (${c.banco})`, value: c.id! })),
    [contasBancarias]);

    const handleEdit = (despesa: DespesaOperacional) => {
        form.reset(despesa);
        setIsEditing(true);
    };

    const handleMarkAsPaid = async (id: string) => {
        if (!confirm("Tem certeza que deseja marcar esta despesa como paga?")) return;
        try {
            await setDespesaStatus(id, 'Paga');
            toast.success("Despesa marcada como paga!");
        } catch {
            toast.error("Erro ao atualizar o status da despesa.");
        }
    };

    const resetForm = () => {
        form.reset(defaultFormValues);
        setIsEditing(false);
    };

    const onSubmit = async (values: DespesaFormValues) => {
        try {
            if (isEditing && values.id) {
                await updateDespesa(values.id, values);
                toast.success("Despesa atualizada com sucesso!");
            } else {
                await addDespesa(values);
                toast.success("Despesa cadastrada com sucesso!");
            }
            resetForm();
        } catch (e: any) {
            toast.error("Ocorreu um erro ao salvar a despesa.", { description: e.message });
        }
    };

    const columns: ColumnDef<DespesaOperacional>[] = [
        { accessorKey: "descricao", header: "Descrição" },
        { accessorKey: "categoria", header: "Categoria" },
        { accessorKey: "valor", header: "Valor", cell: ({ row }) => `R$ ${row.original.valor.toFixed(2)}`},
        { accessorKey: "dataVencimento", header: "Vencimento", cell: ({ row }) => format(row.original.dataVencimento, 'dd/MM/yyyy') },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="text-right">
                    <Button variant="link" size="sm" onClick={() => handleMarkAsPaid(row.original.id!)}>
                        Marcar como Paga
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
                        <IconPencil className="h-4 w-4" />
                    </Button>
                </div>
            )
        },
    ];

    const formContent = (
        <GenericForm schema={despesaOperacionalSchema} onSubmit={onSubmit} formId="despesa-form" form={form}>
            <div className="space-y-4">
                <FormField name="descricao" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Descrição da Despesa</FormLabel><FormControl><Input placeholder="Ex: Aluguel do Galpão" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="categoria" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Categoria</FormLabel><FormControl><Input placeholder="Ex: Custo Fixo, Impostos" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <div className="grid md:grid-cols-2 gap-4">
                    <FormField name="valor" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="dataVencimento" control={form.control} render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Data de Vencimento</FormLabel><FormControl><DatePicker date={field.value} onDateChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField name="contaBancariaId" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Conta para Débito</FormLabel>
                        <Combobox options={contasBancariasOptions} {...field} placeholder="Selecione a conta de origem" />
                    <FormMessage /></FormItem>
                )} />
            </div>
            <div className="flex justify-end gap-2 pt-6">
                {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                <Button type="submit" form="despesa-form">{isEditing ? "Salvar Alterações" : "Adicionar Despesa"}</Button>
            </div>
        </GenericForm>
    );

    const tableContent = (
        <GenericTable
            columns={columns}
            data={despesas}
            filterPlaceholder="Filtrar por descrição..."
            filterColumnId="descricao"
        />
    );

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Despesa" : "Nova Despesa Operacional"}
            formContent={formContent}
            tableTitle="Despesas Pendentes"
            tableContent={tableContent}
        />
    );
}
