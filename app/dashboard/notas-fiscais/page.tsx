"use client"

import { useState, useMemo, ReactElement } from "react";
import { ColumnDef, Row } from "@tanstack/react-table";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { IconFileDownload, IconX, IconRefresh, IconFileX, IconAlertTriangle, IconFileCheck, IconClock, IconFileOff, IconLoader } from "@tabler/icons-react";

import { useDataStore } from "@/store/data.store";
import { Venda, CompanyInfo, Cliente, Produto, Unidade } from "@/lib/schemas";
import { GenericTable } from "@/components/generic-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetailsSubRow } from "@/components/details-sub-row";
import { consultarNFe, cancelarNFe, emitirNFe } from "@/lib/services/nfe.services";
import { updateVenda } from "@/lib/services/vendas.services";
import { getCompanyInfo } from "@/lib/services/settings.services";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/date-range-picker";
import { NfePreviewModal } from "@/components/nfe-preview-modal";
import Link from "next/link";
import React from "react";

type VendaComNFe = Venda & { clienteNome?: string };

const getStatusInfo = (status: string | undefined): { text: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" } => {
    switch (status) {
        case 'autorizado': return { text: 'Autorizada', variant: 'success' };
        case 'processando_autorizacao': return { text: 'Processando', variant: 'warning' };
        case 'cancelado': return { text: 'Cancelada', variant: 'secondary' };
        case 'erro_autorizacao': return { text: 'Erro', variant: 'destructive' };
        case 'erro_cancelamento': return { text: 'Erro ao Cancelar', variant: 'destructive' };
        default: return { text: status || 'Não Emitida', variant: 'outline' };
    }
};

interface StatusCardProps {
    title: string;
    count: number;
    icon: React.ElementType;
    variant?: 'success' | 'warning' | 'destructive' | 'default';
    onClick: () => void;
}

const StatusCard = ({ title, count, icon: Icon, variant, onClick }: StatusCardProps) => (
    <Card onClick={onClick} className={`cursor-pointer transition-all hover:border-primary/50 ${variant === 'destructive' ? 'border-destructive/50' : ''} ${variant === 'warning' ? 'border-amber-500/50' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className={`h-4 w-4 text-muted-foreground ${variant === 'destructive' ? 'text-destructive' : ''} ${variant === 'warning' ? 'text-amber-500' : ''}`} />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{count}</div>
        </CardContent>
    </Card>
);

export default function NotasFiscaisPage() {
    const { vendas, clientes, produtos, unidades } = useDataStore();
    const [isCanceling, setIsCanceling] = useState(false);
    const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
    const [cancelJustificativa, setCancelJustificativa] = useState("");
    const [selectedVenda, setSelectedVenda] = useState<VendaComNFe | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("todos");
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() });
    const [isNfeModalOpen, setIsNfeModalOpen] = useState(false);
    const [nfePreviewData, setNfePreviewData] = useState<any | null>(null);
    const [isEmittingNfe, setIsEmittingNfe] = useState(false);

    const vendasComNFe = useMemo(() => {
        return vendas
            .filter(v => v.nfe && v.nfe.id)
            .map(venda => ({
                ...venda,
                clienteNome: clientes.find(c => c.id === venda.clienteId)?.nome || 'N/A',
            }));
    }, [vendas, clientes]);

    const filteredVendas = useMemo(() => {
        return vendasComNFe.filter(v => {
            const statusMatch = statusFilter === 'todos' || v.nfe?.status === statusFilter;
            const dateMatch = dateRange?.from && dateRange.to ? (new Date(v.data) >= dateRange.from && new Date(v.data) <= dateRange.to) : true;
            return statusMatch && dateMatch;
        });
    }, [vendasComNFe, statusFilter, dateRange]);

    const statusCounts = useMemo(() => ({
        processando_autorizacao: vendasComNFe.filter(v => v.nfe?.status === 'processando_autorizacao').length,
        autorizado: vendasComNFe.filter(v => v.nfe?.status === 'autorizado').length,
        erro_autorizacao: vendasComNFe.filter(v => v.nfe?.status === 'erro_autorizacao').length,
        cancelado: vendasComNFe.filter(v => v.nfe?.status === 'cancelado').length,
    }), [vendasComNFe]);

    const handlePrepareNFe = async (venda: VendaComNFe) => {
        const toastId = toast.loading("Preparando dados da NF-e...");
        try {
            const cliente = clientes.find(c => c.id === venda.clienteId);
            const empresaInfo = await getCompanyInfo();
            if (!cliente || !empresaInfo) { throw new Error("Dados do cliente ou da empresa não encontrados."); }
            setNfePreviewData({ venda, empresa: empresaInfo, cliente, todosProdutos: produtos, todasUnidades: unidades });
            setIsNfeModalOpen(true);
            toast.dismiss(toastId);
        } catch (error: any) {
            toast.error("Erro ao preparar NF-e", { id: toastId, description: error.message });
        }
    };

    const handleConfirmAndEmitNFe = async (formData: { venda: Venda, empresa: CompanyInfo, cliente: Cliente, todosProdutos: Produto[], todasUnidades: Unidade[] }) => {
        setIsEmittingNfe(true);
        const toastId = toast.loading("Enviando dados para a Sefaz...");
        try {
            const resultado = await emitirNFe(formData.venda, formData.empresa, formData.cliente, formData.todosProdutos, formData.todasUnidades);
            const nfeUpdateData = { id: resultado.ref ?? null, status: resultado.status ?? 'erro_desconhecido', url_danfe: resultado.caminho_danfe ?? null, url_xml: resultado.caminho_xml_nota_fiscal ?? null };
            await updateVenda(formData.venda.id!, { nfe: nfeUpdateData });

            if (resultado.status === 'autorizado') { toast.success("NF-e autorizada com sucesso!", { id: toastId });
            } else if (resultado.status === 'processando_autorizacao') { toast.info("NF-e em processamento. Consulte o status em breve.", { id: toastId });
            } else { const errorMessage = resultado.erros ? resultado.erros[0].mensagem : (resultado.mensagem_sefaz || 'Erro desconhecido'); toast.error(`Falha na emissão: ${errorMessage}`, { id: toastId, duration: 10000 }); }

            setIsNfeModalOpen(false);
        } catch (error: any) {
            toast.error("Erro ao emitir NF-e", { id: toastId, description: error.message });
        } finally {
            setIsEmittingNfe(false);
        }
    };

    const handleConsultarStatus = async (venda: VendaComNFe) => {
        if (!venda.nfe?.id) return;
        const toastId = toast.loading("Consultando status da NF-e...");
        try {
            const resultado = await consultarNFe(venda.nfe.id);
            const nfeUpdateData = { id: resultado.ref ?? venda.nfe.id, status: resultado.status ?? 'erro_desconhecido', url_danfe: resultado.url_danfe ?? null, url_xml: resultado.url_xml ?? null };
            await updateVenda(venda.id!, { nfe: nfeUpdateData });
            toast.success(`Status atualizado: ${resultado.status}`, { id: toastId });
        } catch (error: any) {
            toast.error("Erro ao consultar NF-e", { id: toastId, description: error.message });
        }
    };

    const handleOpenCancelDialog = (venda: VendaComNFe) => {
        setSelectedVenda(venda);
        setIsCanceling(true);
    };

    const handleCancelarNFe = async () => {
        if (!selectedVenda || !selectedVenda.nfe?.id) return;
        if (cancelJustificativa.length < 15) {
            return toast.error("A justificativa de cancelamento deve ter no mínimo 15 caracteres.");
        }

        setIsSubmittingCancel(true);
        const toastId = toast.loading("Enviando solicitação de cancelamento...");
        try {
            const resultado = await cancelarNFe(selectedVenda.nfe.id, cancelJustificativa);

            if (resultado.status === 'cancelado') {
                await updateVenda(selectedVenda.id!, { nfe: { ...selectedVenda.nfe, status: 'cancelado' } });
                toast.success("NF-e cancelada com sucesso!", { id: toastId });
                setIsCanceling(false);
            } else {
                const errorMessage = resultado.erros ? resultado.erros[0].mensagem : (resultado.mensagem_sefaz || 'Falha no cancelamento');
                toast.error(`Erro: ${errorMessage}`, { id: toastId, duration: 10000 });
            }
        } catch (error: any) {
            toast.error("Erro ao cancelar NF-e", { id: toastId, description: error.message });
        } finally {
            setIsSubmittingCancel(false);
            setSelectedVenda(null);
            setCancelJustificativa("");
        }
    };

    const renderSubComponent = ({ row }: { row: Row<VendaComNFe> }): ReactElement => {
        const nfe = row.original.nfe;
        if (!nfe) return <></>;

        const details = [
            { label: "Ref (Focus NFe)", value: nfe.id },
            { label: "Status (Focus NFe)", value: nfe.status },
            { label: "Link DANFE", value: nfe.url_danfe ? <Link href={nfe.url_danfe} target="_blank" className="text-blue-500 underline">Abrir DANFE</Link> : "N/A" },
            { label: "Link XML", value: nfe.url_xml ? <Link href={nfe.url_xml} target="_blank" className="text-blue-500 underline">Abrir XML</Link> : "N/A" },
        ];
        return <DetailsSubRow details={details} />;
    };

    const columns: ColumnDef<VendaComNFe>[] = [
        { header: "Data Emissão", cell: ({ row }) => format(new Date(row.original.data), 'dd/MM/yyyy') },
        { header: "Cliente", accessorKey: "clienteNome" },
        { header: "Valor", cell: ({ row }) => `R$ ${(row.original.valorFinal || row.original.valorTotal).toFixed(2)}` },
        {
            header: "Status NF-e",
            accessorKey: "nfe.status",
            cell: ({ row }) => {
                const statusInfo = getStatusInfo(row.original.nfe?.status);
                return <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>;
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const venda = row.original;
                const status = venda.nfe?.status;
                return (
                    <div className="flex justify-end gap-2">
                         {status === 'erro_autorizacao' && <Button variant="destructive" size="sm" onClick={() => handlePrepareNFe(venda)}><IconRefresh className="h-4 w-4 mr-1"/> Re-emitir</Button> }
                         {status === 'processando_autorizacao' && <Button variant="secondary" size="sm" onClick={() => handleConsultarStatus(venda)}><IconRefresh className="h-4 w-4 mr-1"/> Consultar</Button> }
                         {status === 'autorizado' && (
                            <>
                                <Button variant="outline" size="sm" asChild><a href={venda.nfe?.url_danfe} target="_blank" rel="noopener noreferrer"><IconFileDownload className="h-4 w-4 mr-1" /> DANFE</a></Button>
                                <Button variant="destructive" size="sm" onClick={() => handleOpenCancelDialog(venda)}><IconX className="h-4 w-4 mr-1"/> Cancelar</Button>
                            </>
                        )}
                    </div>
                );
            }
        }
    ];

    const tableControlsComponent = (
        <div className="flex items-center gap-2">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por status..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="autorizado">Autorizada</SelectItem>
                    <SelectItem value="processando_autorizacao">Processando</SelectItem>
                    <SelectItem value="erro_autorizacao">Com Erro</SelectItem>
                    <SelectItem value="cancelado">Cancelada</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
            <NfePreviewModal isOpen={isNfeModalOpen} onOpenChange={setIsNfeModalOpen} previewData={nfePreviewData} onSubmit={handleConfirmAndEmitNFe} isLoading={isEmittingNfe} />
            <Dialog open={isCanceling} onOpenChange={setIsCanceling}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Cancelar NF-e</DialogTitle><DialogDescription>Forneça uma justificativa com no mínimo 15 caracteres.</DialogDescription></DialogHeader>
                    <div className="py-4"><Label htmlFor="justificativa">Justificativa</Label><Textarea id="justificativa" value={cancelJustificativa} onChange={(e) => setCancelJustificativa(e.target.value)} placeholder="Ex: Erro na digitação dos itens da nota..." rows={4}/></div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingCancel}>Fechar</Button></DialogClose>
                        <Button onClick={handleCancelarNFe} disabled={isSubmittingCancel}>
                            {isSubmittingCancel && <IconLoader className="mr-2 h-4 w-4 animate-spin" />}
                            {isSubmittingCancel ? "Cancelando..." : "Confirmar Cancelamento"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatusCard title="NF-e Autorizadas" count={statusCounts.autorizado} icon={IconFileCheck} variant="success" onClick={() => setStatusFilter('autorizado')} />
                <StatusCard title="Em Processamento" count={statusCounts.processando_autorizacao} icon={IconClock} variant="warning" onClick={() => setStatusFilter('processando_autorizacao')} />
                <StatusCard title="Com Erro na Emissão" count={statusCounts.erro_autorizacao} icon={IconAlertTriangle} variant="destructive" onClick={() => setStatusFilter('erro_autorizacao')} />
                <StatusCard title="Canceladas" count={statusCounts.cancelado} icon={IconFileOff} variant="default" onClick={() => setStatusFilter('cancelado')} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Gerenciamento de Notas Fiscais</CardTitle>
                    <CardDescription>Consulte, baixe e cancele as notas fiscais emitidas no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <GenericTable
                        columns={columns}
                        data={filteredVendas}
                        filterPlaceholder="Filtrar por cliente..."
                        filterColumnId="clienteNome"
                        renderSubComponent={renderSubComponent}
                        tableControlsComponent={tableControlsComponent}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
