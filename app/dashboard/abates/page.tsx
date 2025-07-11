"use client"

import { useState, useMemo, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ColumnDef, Row } from "@tanstack/react-table";
import { toast } from "sonner";
import { format } from "date-fns";
import { IconPencil, IconTrash, IconAlertTriangle, IconLock } from "@tabler/icons-react";
import { Timestamp, Unsubscribe } from "firebase/firestore";
import { DateRange } from "react-day-picker";
import Link from "next/link";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/date-range-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { DetailsSubRow } from "@/components/details-sub-row";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Abate, abateSchema } from "@/lib/schemas";
import { addAbate, updateAbate, setAbateStatus, subscribeToAbatesByDateRange } from "@/lib/services/abates.services";
import { useAuthStore } from "@/store/auth.store";
import { useDataStore } from "@/store/data.store";
import { DatePicker } from "@/components/date-picker";

const formSchema = abateSchema.pick({
    data: true,
    total: true,
    condenado: true,
    responsavelId: true,
    compraId: true,
});

type AbateFormValues = z.infer<typeof formSchema>;
type AbateComDetalhes = Abate & { responsavelNome?: string; registradorNome?: string; };

export default function AbatesPage() {
    const { funcionarios, users, compras } = useDataStore();
    const { user, role } = useAuthStore();
    const isReadOnly = role !== 'ADMINISTRADOR';

    const [abates, setAbates] = useState<Abate[]>([]);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const form = useForm<AbateFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { data: new Date(), total: 0, condenado: 0, responsavelId: "", compraId: "" }
    });

    const dependenciasFaltantes = useMemo(() => {
        const faltantes = [];
        if (!funcionarios || funcionarios.length === 0) {
            faltantes.push({ nome: "Prestadores", link: "/dashboard/funcionarios" });
        }
        if (!compras || compras.length === 0) {
            faltantes.push({ nome: "Compras de Matéria-Prima", link: "/dashboard/compras" });
        }
        return faltantes;
    }, [funcionarios, compras]);

    useEffect(() => {
        setIsLoading(true);
        const unsubscribe: Unsubscribe = subscribeToAbatesByDateRange(dateRange, (data) => {
            setAbates(data);
            const timer = setTimeout(() => setIsLoading(false), 500);
            return () => clearTimeout(timer);
        });
        return () => unsubscribe();
    }, [dateRange]);

    const funcionarioOptions = useMemo(() =>
        funcionarios.map(f => ({ label: f.nomeCompleto, value: f.id! })),
    [funcionarios]);

    const compraOptions = useMemo(() =>
        compras
            .filter(c => c.id)
            .map(c => ({
                label: `NF: ${c.notaFiscal} - Data: ${format(c.data as Date, "dd/MM/yyyy")}`,
                value: c.id!
            })),
    [compras]);

    const abatesEnriquecidos: AbateComDetalhes[] = useMemo(() => {
        return abates.map(abate => ({
            ...abate,
            responsavelNome: funcionarios.find(f => f.id === abate.responsavelId)?.nomeCompleto || 'N/A',
            registradorNome: abate.registradoPor.nome || 'N/A',
        }));
    }, [abates, funcionarios]);

    const renderSubComponent = useCallback(({ row }: { row: Row<AbateComDetalhes> }) => {
        const abate = row.original;
        const compraRef = compras.find(c => c.id === abate.compraId);

        const details = [
            { label: "Responsável pelo Abate", value: abate.responsavelNome },
            { label: "Registrado Por", value: abate.registradorNome },
            { label: "Referência da Compra", value: compraRef ? `NF ${compraRef.notaFiscal}` : 'N/A' },
            { label: "Data do Registro", value: abate.createdAt ? format((abate.createdAt as Timestamp).toDate(), 'dd/MM/yyyy HH:mm') : 'N/A' },
        ];
        return <DetailsSubRow details={details} />;
    }, [compras]);

    const columns: ColumnDef<AbateComDetalhes>[] = [
        { accessorKey: "data", header: "Data", cell: ({ row }) => format(row.original.data as Date, "dd/MM/yyyy") },
        { accessorKey: "total", header: "Total" },
        { accessorKey: "condenado", header: "Condenado" },
        {
            id: "actions",
            cell: ({ row }: { row: Row<AbateComDetalhes> }) => {
                const item = row.original;
                const createdAt = item.createdAt as Timestamp | undefined;
                const podeEditar = role === 'ADMINISTRADOR' || (item.registradoPor.uid === user?.uid && createdAt && (new Date(Date.now() - 2 * 60 * 60 * 1000) < createdAt.toDate()));

                return (
                    <div className="text-right">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={!podeEditar || isReadOnly}>
                                        <IconPencil className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Editar Abate</p></TooltipContent>
                            </Tooltip>
                            {!isReadOnly && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleInactivateClick(item.id!)}>
                                            <IconTrash className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Inativar Abate</p></TooltipContent>
                                </Tooltip>
                            )}
                        </TooltipProvider>
                    </div>
                );
            }
        },
    ];

    const handleEdit = (abate: AbateComDetalhes) => {
      if(isReadOnly) return;
      setEditingId(abate.id!);
      setIsEditing(true);
      form.reset({
          data: abate.data,
          total: abate.total,
          condenado: abate.condenado,
          responsavelId: abate.responsavelId,
          compraId: abate.compraId,
      });
    };

    const handleInactivateClick = (id: string) => {
        setSelectedId(id);
        setDialogOpen(true);
    };

    const confirmInactivation = async () => {
        if (!selectedId) return;
        try {
            await setAbateStatus(selectedId, 'inativo');
            toast.success("Registro de abate inativado com sucesso!");
        } catch {
            toast.error("Erro ao inativar o registro.");
        } finally {
            setSelectedId(null);
            setDialogOpen(false);
        }
    };

    const resetForm = () => {
        form.reset({ data: new Date(), total: 0, condenado: 0, responsavelId: "", compraId: "" });
        setIsEditing(false);
        setEditingId(null);
    };

    const onSubmit = async (values: AbateFormValues) => {
        if (!user || !role) {
            toast.error("Usuário ou permissão não identificados. Tente fazer login novamente.");
            return;
        }

        try {
            if (isEditing && editingId) {
                await updateAbate(editingId, values);
                toast.success("Registro de abate atualizado com sucesso!");
            } else {
                await addAbate(values, { uid: user.uid, nome: user.displayName || "Usuário", role: role });
                toast.success("Novo abate registrado com sucesso!");
            }
            resetForm();
        } catch (error: any) {
            toast.error("Falha ao salvar registro.", { description: error.message });
        }
    };

    const formContent = (
      dependenciasFaltantes.length > 0 && !isEditing ? (
        <Alert variant="destructive">
            <IconAlertTriangle className="h-4 w-4" />
            <AlertTitle>Cadastro de pré-requisito necessário</AlertTitle>
            <AlertDescription>
                Para registrar um abate, você precisa primeiro cadastrar:
                <ul className="list-disc pl-5 mt-2">
                    {dependenciasFaltantes.map(dep => (
                        <li key={dep.nome}>
                            <Button variant="link" asChild className="p-0 h-auto font-bold"><Link href={dep.link}>{dep.nome}</Link></Button>
                        </li>
                    ))}
                </ul>
            </AlertDescription>
        </Alert>
      ) : (
        <fieldset disabled={isReadOnly} className="disabled:opacity-70">
            <GenericForm schema={formSchema} onSubmit={onSubmit} formId="abate-form" form={form}>
                <div className="space-y-4">
                    <FormField name="compraId" control={form.control} render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Vincular Compra de Origem</FormLabel>
                        <Combobox options={compraOptions} value={field.value} onChange={field.onChange} placeholder="Selecione uma compra..." searchPlaceholder="Buscar por NF ou data..." />
                    <FormMessage /></FormItem>
                    )} />
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
            {isReadOnly && (
                <Alert variant="destructive" className="mt-6">
                    <IconLock className="h-4 w-4" />
                    <AlertTitle>Acesso Restrito</AlertTitle>
                    <AlertDescription>Apenas administradores podem gerenciar abates.</AlertDescription>
                </Alert>
            )}
        </fieldset>
      )
    );

    const tableContent = (
        <GenericTable
            columns={columns}
            data={abatesEnriquecidos}
            filterPlaceholder="Pesquisar por responsável..."
            filterColumnId="responsavelNome"
            tableControlsComponent={<DateRangePicker date={dateRange} onDateChange={setDateRange} />}
            renderSubComponent={renderSubComponent}
        />
    );

    return (
      <>
        <ConfirmationDialog open={dialogOpen} onOpenChange={setDialogOpen} onConfirm={confirmInactivation} title="Confirmar Inativação" description="Esta ação é irreversível e irá inativar o lote de abate."/>
        <CrudLayout
            formTitle={isEditing ? "Editar Registro de Abate" : "Novo Registro"}
            formContent={formContent}
            tableTitle="Histórico de Abates"
            tableContent={
                isLoading ? (
                    <div className="space-y-2"><div className="flex flex-col md:flex-row gap-4"><Skeleton className="h-10 w-full md:w-sm" /><Skeleton className="h-10 w-[300px]" /></div>{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : ( tableContent )
            }
        />
      </>
    );
}
