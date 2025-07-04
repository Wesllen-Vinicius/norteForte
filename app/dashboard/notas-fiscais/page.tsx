"use client"

import { useState, useMemo, ReactElement } from "react";
import { ColumnDef, Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import { IconFileDownload, IconX, IconRefresh, IconFileX } from "@tabler/icons-react";

import { useDataStore } from "@/store/data.store";
import { Venda } from "@/lib/schemas";
import { GenericTable } from "@/components/generic-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetailsSubRow } from "@/components/details-sub-row";
import { consultarNFe, cancelarNFe } from "@/lib/services/nfe.services";
import { updateVenda } from "@/lib/services/vendas.services";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

type VendaComNFe = Venda & { clienteNome?: string };

const getStatusInfo = (status: string | undefined): { text: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" } => {
    switch (status) {
        case 'autorizado': return { text: 'Autorizada', variant: 'success' };
        case 'processando_autorizacao': return { text: 'Processando', variant: 'warning' };
        case 'cancelado': return { text: 'Cancelada', variant: 'outline' };
        case 'erro_autorizacao': return { text: 'Erro', variant: 'destructive' };
        case 'erro_cancelamento': return { text: 'Erro ao Cancelar', variant: 'destructive' };
        default: return { text: status || 'Não Emitida', variant: 'secondary' };
    }
};

export default function NotasFiscaisPage() {
    const { vendas, clientes } = useDataStore();
    const [isCanceling, setIsCanceling] = useState(false);
    const [cancelJustificativa, setCancelJustificativa] = useState("");
    const [selectedVenda, setSelectedVenda] = useState<VendaComNFe | null>(null);

    const vendasComNFe = useMemo(() => {
        return vendas
            .filter(v => v.nfe && v.nfe.id)
            .map(venda => ({
                ...venda,
                clienteNome: clientes.find(c => c.id === venda.clienteId)?.nome || 'N/A',
            }));
    }, [vendas, clientes]);

    const handleConsultarStatus = async (venda: VendaComNFe) => {
        if (!venda.nfe?.id) return;
        const toastId = toast.loading("Consultando status da NF-e...");
        try {
            const resultado = await consultarNFe(venda.nfe.id);
            const nfeUpdateData = {
                id: resultado.ref,
                status: resultado.status,
                url_danfe: resultado.caminho_danfe,
                url_xml: resultado.caminho_xml_nota_fiscal,
            };
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

        const toastId = toast.loading("Enviando solicitação de cancelamento...");
        try {
            const resultado = await cancelarNFe(selectedVenda.nfe.id, cancelJustificativa);

            if (resultado.status === 'cancelado') {
                await updateVenda(selectedVenda.id!, { nfe: { ...selectedVenda.nfe, status: 'cancelado' } });
                toast.success("NF-e cancelada com sucesso!", { id: toastId });
            } else {
                const errorMessage = resultado.erros ? resultado.erros[0].mensagem : (resultado.mensagem_sefaz || 'Falha no cancelamento');
                toast.error(`Erro: ${errorMessage}`, { id: toastId, duration: 10000 });
            }
        } catch (error: any) {
            toast.error("Erro ao cancelar NF-e", { id: toastId, description: error.message });
        } finally {
            setIsCanceling(false);
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
                const ref = venda.nfe?.id;
                const status = venda.nfe?.status;

                if (!ref) return null;

                return (
                    <div className="flex justify-end gap-2">
                        {status === 'autorizado' && (
                            <>
                                <Button variant="outline" size="sm" asChild>
                                    <a href={venda.nfe?.url_danfe} target="_blank" rel="noopener noreferrer"><IconFileDownload className="h-4 w-4 mr-1" /> PDF</a>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <a href={venda.nfe?.url_xml} target="_blank" rel="noopener noreferrer"><IconFileX className="h-4 w-4 mr-1" /> XML</a>
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleOpenCancelDialog(venda)}>
                                    <IconX className="h-4 w-4 mr-1"/> Cancelar
                                </Button>
                            </>
                        )}
                         {(status === 'processando_autorizacao' || status === 'erro_autorizacao') && (
                            <Button variant="secondary" size="sm" onClick={() => handleConsultarStatus(venda)}>
                                <IconRefresh className="h-4 w-4 mr-1"/> Consultar
                            </Button>
                        )}
                         {status === 'cancelado' && (
                             <Badge variant="outline">NF-e Cancelada</Badge>
                         )}
                    </div>
                );
            }
        }
    ];

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Dialog open={isCanceling} onOpenChange={setIsCanceling}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancelar NF-e</DialogTitle>
                        <DialogDescription>
                            Para cancelar a nota fiscal, por favor, forneça uma justificativa com no mínimo 15 caracteres.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="justificativa">Justificativa</Label>
                        <Textarea
                            id="justificativa"
                            value={cancelJustificativa}
                            onChange={(e) => setCancelJustificativa(e.target.value)}
                            placeholder="Ex: Erro na digitação dos itens da nota..."
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Fechar</Button></DialogClose>
                        <Button onClick={handleCancelarNFe}>Confirmar Cancelamento</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>Gerenciamento de Notas Fiscais</CardTitle>
                    <CardDescription>Consulte, baixe e cancele as notas fiscais emitidas no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <GenericTable
                        columns={columns}
                        data={vendasComNFe}
                        filterPlaceholder="Filtrar por cliente..."
                        filterColumnId="clienteNome"
                        renderSubComponent={renderSubComponent}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
