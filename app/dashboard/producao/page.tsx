"use client"

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useForm, useFieldArray, useWatch, Control, UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { IconPlus, IconTrash, IconPencil, IconAlertTriangle, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { format } from 'date-fns';
import { ColumnDef, Row } from "@tanstack/react-table";
import { DateRange } from "react-day-picker";
import { Timestamp } from "firebase/firestore";
import { CrudLayout } from "@/components/crud-layout";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useAuthStore } from "@/store/auth.store";
import { useDataStore } from "@/store/data.store";
import { producaoSchema, registrarProducao, Producao, updateProducao, deleteProducao } from "@/lib/services/producao.services";

const formSchema = producaoSchema.omit({ registradoPor: true, id: true, createdAt: true, data: true }).extend({
    data: z.date(),
});
type ProducaoFormValues = z.infer<typeof formSchema>;
type ProducaoComDetalhes = Producao & { responsavelNome?: string, registradorRole?: string };

const defaultFormValues: ProducaoFormValues = {
    data: new Date(),
    responsavelId: "",
    abateId: "",
    produtos: [],
    lote: "",
    descricao: "",
};


interface ProdutoProducaoItemProps {
    index: number;
    control: Control<ProducaoFormValues>;
    setValue: UseFormSetValue<ProducaoFormValues>;
    remove: (index: number) => void;
    animaisValidos: number;
}

function ProdutoProducaoItem({ index, control, setValue, remove, animaisValidos }: ProdutoProducaoItemProps) {
    const { produtos, metas, unidades } = useDataStore();

    const produtoId = useWatch({ control, name: `produtos.${index}.produtoId` });
    const quantidadeProduzida = useWatch({ control, name: `produtos.${index}.quantidade` });

    const { metaEsperada, unidade, metaExiste } = useMemo(() => {
        const metaProduto = (metas || []).find(m => m.produtoId === produtoId);
        const meta = metaProduto ? animaisValidos * metaProduto.metaPorAnimal : 0;

        const produtoInfo = (produtos || []).find(p => p.id === produtoId);
        const unidadeId = produtoInfo?.tipoProduto === 'VENDA' ? produtoInfo.unidadeId : undefined;
        const siglaUnidade = (unidades || []).find(u => u.id === unidadeId)?.sigla || 'un';

        return {
            metaEsperada: meta,
            unidade: siglaUnidade,
            metaExiste: !!metaProduto
        };
    }, [produtoId, animaisValidos, metas, produtos, unidades]);

    useEffect(() => {
        const perdaCalculada = metaEsperada > 0 ? metaEsperada - (quantidadeProduzida || 0) : 0;
        setValue(`produtos.${index}.perda`, parseFloat(Math.max(0, perdaCalculada).toFixed(2)));
    }, [quantidadeProduzida, metaEsperada, index, setValue]);

    const produtoOptions = useMemo(() =>
        (produtos || []).filter(p => p.tipoProduto === 'VENDA').map(p => ({ label: p.nome, value: p.id! })),
    [produtos]);

    return (
        <div className="p-3 border rounded-md space-y-3 bg-muted/50">
            <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                    <FormField name={`produtos.${index}.produtoId`} control={control} render={({ field }) => (
                        <FormItem>
                            <Combobox options={produtoOptions} {...field} placeholder="Selecione o produto" />
                        </FormItem>
                    )} />

                    {produtoId && !metaExiste && (
                         <Alert variant="destructive" className="mt-2 text-xs">
                            <IconAlertTriangle className="h-4 w-4" />
                            <AlertTitle className="font-semibold">Meta não encontrada!</AlertTitle>
                            <AlertDescription>
                                Cadastre uma meta para este produto na tela de
                                <Button variant="link" asChild className="p-0 h-auto ml-1 font-bold text-xs"><Link href="/dashboard/metas">Metas de Produção</Link></Button>.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                        <FormItem>
                            <FormLabel className="text-xs">Meta Esperada ({unidade})</FormLabel>
                            <Input value={metaEsperada.toFixed(2)} readOnly className="bg-muted-foreground/20" />
                        </FormItem>

                        <FormField name={`produtos.${index}.quantidade`} control={control} render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Qtd. Produzida</FormLabel>
                                <FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                            </FormItem>
                        )} />

                        <FormField name={`produtos.${index}.perda`} control={control} render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Perda Calculada</FormLabel>
                                <FormControl><Input type="number" step="0.01" {...field} readOnly className="bg-muted-foreground/20" /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                </div>
                <Button type="button" variant="ghost" size="icon" className="mt-1" onClick={() => remove(index)}>
                    <IconTrash className="h-4 w-4 text-destructive" />
                </Button>
            </div>
        </div>
    );
}

export default function ProducaoPage() {
    const { producoes, funcionarios, abates, users, produtos, metas, unidades } = useDataStore();
    const { user, role } = useAuthStore();

    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [globalFilter, setGlobalFilter] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const form = useForm<ProducaoFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: defaultFormValues,
    });

    const { control, setValue, handleSubmit, reset } = form;
    const { fields, append, remove } = useFieldArray({
        control,
        name: "produtos"
    });

    const selectedAbateId = useWatch({ control, name: 'abateId' });
    const abateSelecionado = useMemo(() => (abates || []).find(a => a.id === selectedAbateId), [abates, selectedAbateId]);
    const animaisValidosParaProducao = abateSelecionado ? abateSelecionado.total - abateSelecionado.condenado : 0;

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    const abateOptions = useMemo(() => (abates || []).map(a => ({
        label: `Data: ${format(a.data, "dd/MM/yy")} | Total: ${a.total} | ID: ...${a.id?.slice(-4)}`,
        value: a.id!
    })), [abates]);
    const funcionarioOptions = useMemo(() => (funcionarios || []).map(f => ({ label: f.nomeCompleto, value: f.id! })), [funcionarios]);

    const filteredAndEnrichedProducoes = useMemo(() => {
        let filteredData = producoes || [];

        if (dateRange?.from) {
            const fromDate = dateRange.from;
            const toDate = dateRange.to || dateRange.from;
            const startOfDay = new Date(fromDate); startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(toDate); endOfDay.setHours(23, 59, 59, 999);
            filteredData = filteredData.filter(p => (p.data as Date) >= startOfDay && (p.data as Date) <= endOfDay);
        }

        return filteredData.map(p => ({
            ...p,
            responsavelNome: (funcionarios || []).find(f => f.id === p.responsavelId)?.nomeCompleto || 'N/A',
            registradorRole: (users || []).find(u => u.uid === p.registradoPor.uid)?.role || 'N/A',
        }));
    }, [producoes, dateRange, funcionarios, users]);

    const resetForm = () => { reset(defaultFormValues); setIsEditing(false); setEditingId(null); remove(); };

    const handleEdit = (producao: ProducaoComDetalhes) => {
        setIsEditing(true);
        setEditingId(producao.id!);
        reset({
            ...producao,
            data: producao.data instanceof Timestamp ? producao.data.toDate() : producao.data,
        });
    };

    const handleDeleteClick = (id: string) => { setSelectedId(id); setDialogOpen(true); };

    const confirmDelete = async () => {
        if (!selectedId) return;
        try {
            await deleteProducao(selectedId);
            toast.success("Registro de produção removido!");
        } catch (e) {
            toast.error("Erro ao remover registro.");
        } finally {
            setSelectedId(null);
            setDialogOpen(false);
        }
    };

    const onSubmit = async (values: ProducaoFormValues) => {
        if (!user) {
            toast.error("Você precisa estar logado para realizar esta ação.");
            return;
        };
        const dataParaSalvar = {
            ...values,
            produtos: values.produtos.map(p => ({
                ...p,
                produtoNome: (produtos || []).find(prod => prod.id === p.produtoId)?.nome || "N/A"
            }))
        };

        try {
            if (isEditing && editingId) {
                await updateProducao(editingId, dataParaSalvar);
                toast.success("Produção atualizada com sucesso!");
            } else {
                const finalData = { ...dataParaSalvar, registradoPor: { uid: user.uid, nome: user.displayName || "Usuário" }};
                await registrarProducao(finalData);
                toast.success("Lote de produção registrado com sucesso!");
            }
            resetForm();
        } catch (error: any) {
           toast.error("Falha ao registrar produção", { description: error.message });
        }
    };

    const renderSubComponent = ({ row }: { row: Row<ProducaoComDetalhes> }) => {
        const { produtos: todosOsProdutos, unidades } = useDataStore.getState();

        return (
            <div className="p-4 bg-muted/50 animate-in fade-in-0 zoom-in-95">
                <h4 className="font-semibold text-sm mb-2">Detalhes dos Produtos Gerados</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {row.original.produtos.map((p, i) => {
                        const produtoInfo = todosOsProdutos.find(prod => prod.id === p.produtoId);
                        const unidadeNome = produtoInfo?.tipoProduto === 'VENDA'
                            ? unidades.find(u => u.id === produtoInfo.unidadeId)?.sigla || 'un'
                            : 'un';

                        return (
                            <div key={i} className="text-xs p-2.5 border rounded-lg bg-background shadow-sm">
                                <p className="font-bold text-sm mb-1">{p.produtoNome}</p>
                                <p><strong>Produzido:</strong> {p.quantidade.toFixed(2)} {unidadeNome}</p>
                                <p className="text-destructive/80"><strong>Perda:</strong> {p.perda.toFixed(2)} {unidadeNome}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const columns: ColumnDef<ProducaoComDetalhes>[] = [
        {
          id: 'expander',
          header: () => null,
          cell: ({ row }) => (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => row.toggleExpanded()}
              className="h-8 w-8"
            >
              {row.getIsExpanded() ? <IconChevronUp className="h-4 w-4" /> : <IconChevronDown className="h-4 w-4" />}
            </Button>
          ),
        },
        { header: "Data", cell: ({ row }) => format(row.original.data as Date, 'dd/MM/yyyy') },
        { accessorKey: "lote", header: "Lote" },
        { accessorKey: "responsavelNome", header: "Responsável" },
        { header: "Cadastrado Por", accessorKey: "registradoPor.nome" },
        { header: "Cargo Cad.", accessorKey: "registradorRole", cell: ({ row }) => <Badge variant={row.original.registradorRole === 'ADMINISTRADOR' ? 'default' : 'secondary'}>{row.original.registradorRole}</Badge> },
        { header: "Nº Produtos", cell: ({ row }) => row.original.produtos.length },
        { id: "actions", cell: ({ row }) => {
            const item = row.original;
            const createdAt = item.createdAt as Timestamp | undefined;
            const podeEditar = role === 'ADMINISTRADOR' || (item.registradoPor.uid === user?.uid && createdAt && (new Date(Date.now() - 2 * 60 * 60 * 1000) < (createdAt as Timestamp).toDate()));
            const podeExcluir = role === 'ADMINISTRADOR';

            return (
                <div className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={!podeEditar}><IconPencil className="h-4 w-4" /></Button>
                    {podeExcluir && <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(item.id!)}><IconTrash className="h-4 w-4" /></Button>}
                </div>
            )
        }},
    ];

    const dependenciasFaltantes = useMemo(() => {
        const faltantes = [];
        if (!abates || abates.length === 0) faltantes.push({ nome: "Abates", link: "/dashboard/abates" });
        if (!funcionarios || funcionarios.length === 0) faltantes.push({ nome: "Prestadores", link: "/dashboard/funcionarios" });
        if (!(produtos || []).some(p => p.tipoProduto === 'VENDA')) faltantes.push({ nome: "Produtos de Venda", link: "/dashboard/produtos" });
        return faltantes;
    }, [abates, funcionarios, produtos]);

    const formContent = (
        dependenciasFaltantes.length > 0 && !isEditing ? (
            <Alert variant="destructive">
                <IconAlertTriangle className="h-4 w-4" />
                <AlertTitle>Cadastro de pré-requisitos necessário</AlertTitle>
                <AlertDescription>
                    Para registrar uma produção, você precisa primeiro cadastrar:
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
            <Form {...form}>
                <form onSubmit={handleSubmit(onSubmit)} id="producao-form" className="space-y-4">
                    <FormField name="data" control={control} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data</FormLabel><DatePicker date={field.value} onDateChange={field.onChange} /><FormMessage /></FormItem>)} />
                    <FormField name="responsavelId" control={control} render={({ field }) => (<FormItem><FormLabel>Responsável</FormLabel><Combobox options={funcionarioOptions} {...field} placeholder="Selecione um responsável" /><FormMessage /></FormItem>)} />
                    <FormField name="abateId" control={control} render={({ field }) => (<FormItem><FormLabel>Vincular Abate</FormLabel><Combobox options={abateOptions} {...field} placeholder="Selecione o abate de origem"/><FormMessage /></FormItem>)} />
                    <FormField name="lote" control={control} render={({ field }) => (<FormItem><FormLabel>Lote</FormLabel><Input {...field} /><FormMessage /></FormItem>)} />
                    <FormField name="descricao" control={control} render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><Input {...field} /><FormMessage /></FormItem>)} />
                    <Separator className="my-6" />
                    <div className="space-y-4">
                        <FormLabel>Produtos Gerados</FormLabel>
                        {fields.map((field, index) => (
                            <ProdutoProducaoItem
                                key={field.id}
                                index={index}
                                control={control}
                                setValue={setValue}
                                remove={remove}
                                animaisValidos={animaisValidosParaProducao}
                            />
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ produtoId: "", quantidade: 0, produtoNome: "", perda: 0 })}>
                            <IconPlus className="mr-2 h-4 w-4" /> Adicionar Produto
                        </Button>
                    </div>
                    <div className="flex justify-end pt-6"><Button type="submit" form="producao-form">{isEditing ? "Salvar Alterações" : "Registrar Produção"}</Button></div>
                </form>
            </Form>
        )
    );

    const tableControls = (
      <div className="flex flex-col md:flex-row gap-4">
          <Input placeholder="Pesquisar..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="max-w-full md:max-w-sm" />
          <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>
    );

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <ConfirmationDialog open={dialogOpen} onOpenChange={setDialogOpen} onConfirm={confirmDelete} title="Confirmar Exclusão" description="Esta ação é irreversível e removerá o lote de produção permanentemente."/>
            <CrudLayout
                formTitle={isEditing ? "Editar Produção" : "Registrar Produção"}
                formContent={formContent}
                tableTitle="Histórico de Produção"
                tableContent={
                    isLoading ?
                        <div className="space-y-2"><div className="flex flex-col md:flex-row gap-4"><Skeleton className="h-10 w-full md:w-sm" /><Skeleton className="h-10 w-[300px]" /></div>{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                        : <GenericTable columns={columns} data={filteredAndEnrichedProducoes} globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} tableControlsComponent={tableControls} renderSubComponent={renderSubComponent} />
                }
            />
        </div>
    );
}
