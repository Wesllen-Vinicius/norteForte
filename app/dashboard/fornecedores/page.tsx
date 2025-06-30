"use client"

import { useState, useMemo, useCallback, useEffect } from "react";
import { useForm, DefaultValues, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef, Row } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil, IconSearch, IconLoader, IconFileDollar, IconRefresh, IconLock, IconArchive } from "@tabler/icons-react";
import { Unsubscribe } from "firebase/firestore";
import { format } from "date-fns";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Fornecedor, fornecedorSchema } from "@/lib/schemas";
import { addFornecedor, updateFornecedor, setFornecedorStatus, subscribeToFornecedoresByStatus } from "@/lib/services/fornecedores.services";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/auth.store";
import { useDataStore } from "@/store/data.store";
import z from "zod";
import { MaskedInput } from "@/components/ui/masked-input";
import { fetchCnpjData, fetchCepData } from "@/lib/services/brasilapi.services";
import { isValidCnpj } from "@/lib/validators";
import { DetailsSubRow } from "@/components/details-sub-row";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

const formSchema = fornecedorSchema.superRefine((data, ctx) => {
    if (data.cnpj && !isValidCnpj(data.cnpj)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CNPJ inválido.", path: ["cnpj"] });
    }
});

type FornecedorFormValues = z.infer<typeof formSchema>;
type StatusFiltro = "ativo" | "inativo";

const defaultFormValues: DefaultValues<FornecedorFormValues> = {
    razaoSocial: "", cnpj: "", contato: "",
    endereco: { logradouro: "", numero: "", bairro: "", cidade: "", uf: "", cep: "", complemento: "" },
    dadosBancarios: { banco: "", agencia: "", conta: "", pix: "" }
};

export default function FornecedoresPage() {
    const { contasAPagar } = useDataStore();
    const { role } = useAuthStore();
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("ativo");
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isFetching, setIsFetching] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [isContasModalOpen, setIsContasModalOpen] = useState(false);
    const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null);

    useEffect(() => {
        if (role !== 'ADMINISTRADOR') return;
        const unsubscribe: Unsubscribe = subscribeToFornecedoresByStatus(statusFiltro, setFornecedores);
        return () => unsubscribe();
    }, [statusFiltro, role]);

    const form = useForm<FornecedorFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: defaultFormValues,
        mode: "onBlur",
    });

    const cnpj = form.watch("cnpj");
    const cep = form.watch("endereco.cep");
    const showCnpjSearch = useMemo(() => isValidCnpj(cnpj), [cnpj]);
    const showCepSearch = useMemo(() => cep && cep.replace(/\D/g, '').length === 8, [cep]);

    const handleFetch = async (type: 'cnpj' | 'cep') => {
        setIsFetching(true);
        const toastId = toast.loading(`Buscando dados por ${type.toUpperCase()}...`);
        try {
            let data;
            if (type === 'cnpj') {
                const cnpjValue = form.getValues("cnpj")?.replace(/\D/g, '');
                if (!cnpjValue) throw new Error("CNPJ inválido.");
                data = await fetchCnpjData(cnpjValue);
                form.reset({
                    ...form.getValues(), razaoSocial: data.razao_social, contato: data.ddd_telefone_1 || '',
                    endereco: { ...form.getValues().endereco, logradouro: data.logradouro, numero: data.numero, bairro: data.bairro, cidade: data.municipio, uf: data.uf, cep: data.cep.replace(/\D/g, ''), complemento: data.complemento }
                });
            } else {
                const cepValue = form.getValues("endereco.cep")?.replace(/\D/g, '');
                if (!cepValue) throw new Error("CEP inválido.");
                data = await fetchCepData(cepValue);
                form.setValue('endereco.logradouro', data.street); form.setValue('endereco.bairro', data.neighborhood);
                form.setValue('endereco.cidade', data.city); form.setValue('endereco.uf', data.state);
                document.getElementById('endereco.numero')?.focus();
            }
            toast.success("Dados preenchidos!", { id: toastId });
        } catch (error: any) {
            toast.error(error.message, { id: toastId });
        } finally { setIsFetching(false); }
    };

    const handleOpenContasModal = useCallback((fornecedor: Fornecedor) => { setSelectedFornecedor(fornecedor); setIsContasModalOpen(true); }, []);
    const handleEdit = (fornecedor: Fornecedor) => { form.reset(fornecedor); setIsEditing(true); };

    const handleStatusActionClick = (id: string) => {
        setSelectedId(id);
        setDialogOpen(true);
    };

    const confirmStatusChange = async () => {
        if (!selectedId) return;
        const newStatus: StatusFiltro = statusFiltro === 'ativo' ? 'inativo' : 'ativo';
        const action = newStatus === 'inativo' ? 'inativar' : 'reativar';
        try {
            await setFornecedorStatus(selectedId, newStatus);
            toast.success(`Fornecedor ${action} com sucesso!`);
        } catch { toast.error(`Erro ao ${action} o fornecedor.`); }
        finally {
            setSelectedId(null);
            setDialogOpen(false);
        }
    };

    const resetForm = () => { form.reset(defaultFormValues); setIsEditing(false); };

    const onSubmit: SubmitHandler<FornecedorFormValues> = async (values: FornecedorFormValues) => {
        const toastId = toast.loading("Salvando fornecedor...");
        try {
            const { id, ...data } = values;
            if (isEditing && id) { await updateFornecedor(id, data); toast.success(`Fornecedor "${data.razaoSocial}" atualizado!`, { id: toastId });
            } else { await addFornecedor(data); toast.success(`Fornecedor "${data.razaoSocial}" cadastrado!`, { id: toastId }); }
            resetForm();
        } catch (error: any) { toast.error("Erro ao salvar.", { id: toastId, description: error.message }); }
    };

    const renderSubComponent = useCallback(({ row }: { row: Row<Fornecedor> }) => {
        const fornecedor = row.original;
        const details = [
            { label: "Endereço Completo", value: `${fornecedor.endereco.logradouro}, ${fornecedor.endereco.numero} - ${fornecedor.endereco.bairro}, ${fornecedor.endereco.cidade}/${fornecedor.endereco.uf}`, className: "col-span-1 sm:col-span-2 md:col-span-3" },
            { label: "Banco", value: fornecedor.dadosBancarios.banco },
            { label: "Agência", value: fornecedor.dadosBancarios.agencia },
            { label: "Conta", value: fornecedor.dadosBancarios.conta },
            { label: "PIX", value: fornecedor.dadosBancarios.pix || 'N/A' },
        ];
        return <DetailsSubRow details={details} />;
    }, []);

    const columns: ColumnDef<Fornecedor>[] = [
        { accessorKey: "razaoSocial", header: "Razão Social" }, { accessorKey: "cnpj", header: "CNPJ" }, { accessorKey: "contato", header: "Contato" },
        { id: "actions", cell: ({ row }) => {
            const item = row.original;
            return (<div className="text-right flex justify-end items-center">
                {statusFiltro === 'ativo' && <Button variant="outline" size="sm" onClick={() => handleOpenContasModal(item)} className="mr-2"><IconFileDollar className="h-4 w-4 mr-2"/>Ver Contas</Button>}
                <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><IconPencil className="h-4 w-4" /></Button>
                {statusFiltro === 'ativo' ? (
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleStatusActionClick(item.id!)}>
                        <IconArchive className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button variant="ghost" size="icon" className="text-emerald-500 hover:text-emerald-600" onClick={() => handleStatusActionClick(item.id!)}>
                        <IconRefresh className="h-4 w-4" />
                    </Button>
                )}
            </div>);
        }},
    ];

    const ContasDoFornecedorModal = () => {
        const contasDoFornecedor = useMemo(() => {
            if (!selectedFornecedor) return [];
            return contasAPagar.filter((c: any) => c.fornecedorId === selectedFornecedor.id && c.status === 'Pendente');
        }, [selectedFornecedor, contasAPagar]);

        return (
            <Dialog open={isContasModalOpen} onOpenChange={setIsContasModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Contas a Pagar de {selectedFornecedor?.razaoSocial}</DialogTitle>
                        <DialogDescription>Lista de todas as contas pendentes para este fornecedor.</DialogDescription>
                    </DialogHeader>
                    {contasDoFornecedor.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead><TableHead>NF</TableHead></TableRow></TableHeader>
                            <TableBody>{contasDoFornecedor.map((conta: any) => (<TableRow key={conta.id}><TableCell>{format(conta.dataVencimento.toDate(), 'dd/MM/yyyy')}</TableCell><TableCell>R$ {conta.valor.toFixed(2)}</TableCell><TableCell>{conta.notaFiscal}</TableCell></TableRow>))}</TableBody>
                        </Table>
                    ) : ( <p className="text-sm text-muted-foreground py-4">Nenhuma conta pendente.</p> )}
                </DialogContent>
            </Dialog>
        );
    };

    const formContent = (
        <fieldset disabled={role !== 'ADMINISTRADOR'} className="disabled:opacity-70 disabled:pointer-events-none">
            <GenericForm schema={formSchema} onSubmit={onSubmit} formId="fornecedor-form" form={form}>
                 <div className="space-y-4">
                    <FormField name="razaoSocial" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Razão Social</FormLabel><FormControl><Input placeholder="Nome da empresa" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField name="cnpj" control={form.control} render={({ field }) => ( <FormItem><FormLabel>CNPJ</FormLabel><div className="flex items-center gap-2">
                        <FormControl><MaskedInput mask="00.000.000/0000-00" placeholder="00.000.000/0000-00" {...field} /></FormControl>
                        {showCnpjSearch && (<Button type="button" size="icon" variant="outline" onClick={() => handleFetch('cnpj')} disabled={isFetching}>{isFetching ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconSearch className="h-4 w-4" />}</Button>)}
                    </div><FormMessage /></FormItem> )} />
                    <FormField name="contato" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Contato (Telefone)</FormLabel><FormControl><MaskedInput mask="(00) 00000-0000" placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <Separator className="my-6" />
                    <h3 className="text-lg font-medium">Endereço</h3>
                    <div className="grid md:grid-cols-[1fr_auto] gap-2">
                        <FormField name="endereco.cep" control={form.control} render={({ field }) => (<FormItem><FormLabel>CEP</FormLabel><FormControl><MaskedInput mask="00000-000" placeholder="00000-000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormItem><FormLabel>&nbsp;</FormLabel><div className="flex items-center">
                            {showCepSearch && <Button type="button" variant="outline" onClick={() => handleFetch('cep')} disabled={isFetching}>{isFetching ? <IconLoader className="h-4 w-4 animate-spin"/> : "Buscar Endereço"}</Button>}
                        </div></FormItem>
                    </div>
                    <div className="grid md:grid-cols-[2fr_1fr] gap-4">
                        <FormField name="endereco.logradouro" control={form.control} render={({ field }) => (<FormItem><FormLabel>Logradouro</FormLabel><FormControl><Input placeholder="Rua, Av, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="endereco.numero" control={form.control} render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input id="endereco.numero" placeholder="123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <FormField name="endereco.complemento" control={form.control} render={({ field }) => (<FormItem><FormLabel>Complemento (Opcional)</FormLabel><FormControl><Input placeholder="Apto, Bloco, etc." {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField name="endereco.bairro" control={form.control} render={({ field }) => (<FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="endereco.cidade" control={form.control} render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <FormField name="endereco.uf" control={form.control} render={({ field }) => (<FormItem><FormLabel>UF</FormLabel><FormControl><Input maxLength={2} placeholder="Ex: SP" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <Separator className="my-6" />
                    <h3 className="text-lg font-medium">Dados Bancários</h3>
                    <FormField name="dadosBancarios.banco" control={form.control} render={({ field }) => (<FormItem><FormLabel>Banco</FormLabel><FormControl><Input placeholder="Nome do banco" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField name="dadosBancarios.agencia" control={form.control} render={({ field }) => (<FormItem><FormLabel>Agência</FormLabel><FormControl><Input placeholder="0000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="dadosBancarios.conta" control={form.control} render={({ field }) => (<FormItem><FormLabel>Conta Corrente</FormLabel><FormControl><Input placeholder="00000-0" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <FormField name="dadosBancarios.pix" control={form.control} render={({ field }) => (<FormItem><FormLabel>Chave PIX (Opcional)</FormLabel><FormControl><Input placeholder="Chave PIX" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <div className="flex justify-end gap-2 pt-6">
                    {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                    <Button type="submit" form="fornecedor-form">{isEditing ? "Salvar Alterações" : "Cadastrar Fornecedor"}</Button>
                </div>
            </GenericForm>
        </fieldset>
    );

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
                        Você não tem permissão para gerenciar fornecedores.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <>
            <ContasDoFornecedorModal />
            <ConfirmationDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onConfirm={confirmStatusChange}
                title={`Confirmar ${statusFiltro === 'ativo' ? 'Inativação' : 'Reativação'}`}
                description={`Tem certeza que deseja ${statusFiltro === 'ativo' ? 'inativar' : 'reativar'} este fornecedor?`}
            />
            <CrudLayout
                formTitle={isEditing ? "Editar Fornecedor" : "Novo Fornecedor"}
                formContent={formContent}
                tableTitle="Fornecedores Cadastrados"
                tableContent={( <GenericTable columns={columns} data={fornecedores} filterPlaceholder="Filtrar por razão social..." filterColumnId="razaoSocial" renderSubComponent={renderSubComponent} tableControlsComponent={tableControlsComponent}/> )}
            />
        </>
    );
}
