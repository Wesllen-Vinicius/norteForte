"use client"

import { useState, useMemo, useCallback, useEffect } from "react";
import { useForm, DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef, Row } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil, IconTrash, IconSearch, IconLoader, IconFileDollar } from "@tabler/icons-react";
import Link from "next/link";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaskedInput } from "@/components/ui/masked-input";
import { Cliente, clienteSchema, ContaAReceber } from "@/lib/schemas";
import { addCliente, updateCliente, setClienteStatus } from "@/lib/services/clientes.services";
import { useAuthStore } from "@/store/auth.store";
import { useDataStore } from "@/store/data.store";
import z from "zod";
import { Separator } from "@/components/ui/separator";
import { fetchCnpjData, fetchCepData } from "@/lib/services/brasilapi.services";
import { isValidCnpj, isValidCpf } from "@/lib/validators";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailsSubRow } from "@/components/details-sub-row";

const formSchema = clienteSchema.superRefine((data, ctx) => {
    if (data.tipoPessoa === 'fisica' && data.documento && !isValidCpf(data.documento)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CPF inválido.", path: ["documento"], });
    }
    if (data.tipoPessoa === 'juridica' && data.documento && !isValidCnpj(data.documento)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CNPJ inválido.", path: ["documento"], });
    }
});

type ClienteFormValues = z.infer<typeof formSchema>;

const defaultFormValues: DefaultValues<ClienteFormValues> = {
    nome: "", tipoPessoa: undefined, documento: "", telefone: "", email: "", inscricaoEstadual: "",
    endereco: { logradouro: "", numero: "", bairro: "", cidade: "", uf: "", cep: "", complemento: "" }
};

export default function ClientesPage() {
    const { clientes, vendas } = useDataStore();
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isFetching, setIsFetching] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
    const { role } = useAuthStore();

    const form = useForm<ClienteFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: defaultFormValues,
        mode: "onBlur"
    });

    const tipoPessoa = form.watch("tipoPessoa");
    const documento = form.watch("documento");
    const cep = form.watch("endereco.cep");

    const showCnpjSearch = useMemo(() => tipoPessoa === 'juridica' && isValidCnpj(documento), [tipoPessoa, documento]);
    const showCepSearch = useMemo(() => cep && cep.replace(/\D/g, '').length === 8, [cep]);

    useEffect(() => { form.setValue("documento", ""); }, [tipoPessoa, form.setValue]);

    const handleFetch = async (type: 'cnpj' | 'cep') => {
        setIsFetching(true);
        const toastId = toast.loading(`Buscando dados por ${type.toUpperCase()}...`);
        try {
            let data;
            if (type === 'cnpj') {
                const cnpjValue = form.getValues("documento")?.replace(/\D/g, '');
                if (!cnpjValue) throw new Error("CNPJ inválido.");
                data = await fetchCnpjData(cnpjValue);
                const currentValues = form.getValues();
                form.reset({
                    ...currentValues, nome: data.razao_social, email: data.email || '', telefone: data.ddd_telefone_1 || '',
                    endereco: { ...currentValues.endereco, logradouro: data.logradouro, numero: data.numero, bairro: data.bairro, cidade: data.municipio, uf: data.uf, cep: data.cep.replace(/\D/g, ''), complemento: data.complemento }
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
        } catch (error: any) { toast.error(error.message, { id: toastId });
        } finally { setIsFetching(false); }
    };

    const handleOpenModal = useCallback((cliente: Cliente) => { setSelectedClient(cliente); setIsModalOpen(true); }, []);
    const handleEdit = (cliente: Cliente) => { form.reset(cliente); setIsEditing(true); };
    const handleInactivate = async (id: string) => { if (confirm("Tem certeza?")) { try { await setClienteStatus(id, 'inativo'); toast.success("Cliente inativado!"); } catch { toast.error("Erro ao inativar."); } } };
    const resetForm = () => { form.reset(defaultFormValues); setIsEditing(false); };

    const onSubmit = async (values: ClienteFormValues) => {
        const toastId = toast.loading("Salvando cliente...");
        try {
            const { id, ...data } = values;
            if (isEditing && id) { await updateCliente(id, data); toast.success(`Cliente "${data.nome}" atualizado!`, { id: toastId });
            } else { await addCliente(data); toast.success(`Cliente "${data.nome}" cadastrado!`, { id: toastId }); }
            resetForm();
        } catch (error: any) { toast.error("Erro ao salvar.", { id: toastId, description: error.message }); }
    };

    const renderSubComponent = useCallback(({ row }: { row: Row<Cliente> }) => {
        const cliente = row.original;
        const details = [
            { label: "Tipo de Pessoa", value: cliente.tipoPessoa, isBadge: true },
            { label: "E-mail", value: cliente.email },
            { label: "Inscrição Estadual", value: cliente.inscricaoEstadual },
            {
                label: "Endereço Completo",
                value: `${cliente.endereco.logradouro}, ${cliente.endereco.numero}, ${cliente.endereco.bairro} - ${cliente.endereco.cidade}/${cliente.endereco.uf}`,
                className: "col-span-1 sm:col-span-2 md:col-span-3"
            },
        ];
        return <DetailsSubRow details={details} />;
    }, []);

    const columns: ColumnDef<Cliente>[] = [
        { accessorKey: "nome", header: "Nome / Razão Social" }, { accessorKey: "documento", header: "Documento" }, { accessorKey: "telefone", header: "Telefone" },
        { id: "actions", cell: ({ row }) => {
            const item = row.original;
            const isEditable = role === 'ADMINISTRADOR';
            return (<div className="text-right flex justify-end items-center">
                <Button variant="outline" size="sm" onClick={() => handleOpenModal(item)} className="mr-2"><IconFileDollar className="h-4 w-4 mr-2"/>Ver Contas</Button>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={!isEditable}><IconPencil className="h-4 w-4" /></Button>
                {role === 'ADMINISTRADOR' && (<Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleInactivate(item.id!)}><IconTrash className="h-4 w-4" /></Button>)}
            </div>);
        }},
    ];

    const ContasDoClienteModal = () => {
        const contasDoCliente = useMemo(() => {
            if (!selectedClient) return [];
            return vendas.filter(v => v.clienteId === selectedClient.id && v.status === 'Pendente' && v.dataVencimento)
                .map(v => ({ id: v.id!, vendaId: v.id!, clienteId: v.clienteId, clienteNome: selectedClient.nome, valor: v.valorFinal || v.valorTotal, dataEmissao: v.data, dataVencimento: v.dataVencimento!, status: 'Pendente' } as ContaAReceber));
        }, [selectedClient, vendas]);

        return (
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Contas a Receber de {selectedClient?.nome}</DialogTitle>
                        <DialogDescription>Lista de todas as contas pendentes para este cliente.</DialogDescription>
                    </DialogHeader>
                    {contasDoCliente.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                            <TableBody>{contasDoCliente.map(conta => (<TableRow key={conta.id}><TableCell>{format(new Date(conta.dataVencimento), 'dd/MM/yyyy')}</TableCell><TableCell>R$ {conta.valor.toFixed(2)}</TableCell><TableCell className="text-right"><Button asChild variant="link" size="sm"><Link href={`/dashboard/vendas?vendaId=${conta.vendaId}`}>Ver Venda</Link></Button></TableCell></TableRow>))}</TableBody>
                        </Table>
                    ) : ( <p className="text-sm text-muted-foreground py-4">Nenhuma conta pendente.</p> )}
                </DialogContent>
            </Dialog>
        );
    };

    return ( <> <ContasDoClienteModal />
        <CrudLayout
            formTitle={isEditing ? "Editar Cliente" : "Novo Cliente"}
            formContent={(
                <GenericForm schema={formSchema} onSubmit={onSubmit} formId="cliente-form" form={form}>
                     <div className="space-y-4">
                        <FormField name="nome" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Nome / Razão Social</FormLabel><FormControl><Input placeholder="Nome completo ou da empresa" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField name="tipoPessoa" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pessoa Física ou Jurídica" /></SelectTrigger></FormControl><SelectContent><SelectItem value="fisica">Pessoa Física</SelectItem><SelectItem value="juridica">Pessoa Jurídica</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                            <FormField name="documento" control={form.control} render={({ field }) => ( <FormItem><FormLabel>CPF / CNPJ</FormLabel><div className="flex items-center gap-2">
                                <FormControl><MaskedInput className="w-full" mask={tipoPessoa === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00'} {...field} /></FormControl>
                                {showCnpjSearch && (<Button type="button" size="icon" variant="outline" onClick={() => handleFetch('cnpj')} disabled={isFetching}>{isFetching ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconSearch className="h-4 w-4" />}</Button>)}
                            </div><FormMessage /></FormItem> )} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField name="telefone" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Telefone</FormLabel><FormControl><MaskedInput mask="(00) 00000-0000" placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField name="email" control={form.control} render={({ field }) => ( <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="contato@email.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <FormField name="inscricaoEstadual" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Inscrição Estadual (Opcional)</FormLabel><FormControl><Input placeholder="Número da Inscrição Estadual" {...field} /></FormControl><FormMessage /></FormItem> )} />
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
                    </div>
                    <div className="flex justify-end gap-2 pt-6">
                        {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                        <Button type="submit" form="cliente-form">{isEditing ? "Salvar Alterações" : "Cadastrar Cliente"}</Button>
                    </div>
                </GenericForm>
            )}
            tableTitle="Clientes Cadastrados"
            tableContent={( <GenericTable columns={columns} data={clientes} filterPlaceholder="Filtrar por nome..." filterColumnId="nome" renderSubComponent={renderSubComponent} /> )}
        />
    </> );
}
