"use client"

import { useEffect, useState, useMemo, useCallback } from "react";
import { ColumnDef, Row } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import { useDataStore } from "@/store/data.store";
import { useAuthStore } from "@/store/auth.store";
import { GenericTable } from "@/components/generic-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { subscribeToContasAPagar, pagarConta } from "@/lib/services/contasAPagar.services";
import { DetailsSubRow } from "@/components/details-sub-row";
import { IconLoader } from "@tabler/icons-react";

interface ContaAPagar {
    id: string;
    fornecedorId: string;
    notaFiscal: string;
    valor: number;
    dataEmissao: Date;
    dataVencimento: Date;
    parcela: string;
    status: 'Pendente' | 'Paga';
    despesaId?: string;
}

type ContaComNome = ContaAPagar & { fornecedorNome?: string };

export default function ContasAPagarPage() {
    const [contas, setContas] = useState<ContaAPagar[]>([]);
    const { fornecedores, contasBancarias } = useDataStore();
    const { user, role } = useAuthStore();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedConta, setSelectedConta] = useState<ContaAPagar | null>(null);
    const [selectedContaBancaria, setSelectedContaBancaria] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const unsubContas = subscribeToContasAPagar(setContas);
        return () => unsubContas();
    }, []);

    const handleOpenDialog = (conta: ContaAPagar) => {
        setSelectedConta(conta);
        setIsDialogOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!selectedConta || !selectedContaBancaria || !user) {
            toast.error("Selecione uma conta bancária para continuar.");
            return;
        }

        setIsProcessing(true);
        try {
            await pagarConta(selectedConta, selectedContaBancaria, user);
            toast.success("Conta paga e baixada com sucesso!");
            setIsDialogOpen(false);
        } catch (error: any) {
            toast.error("Falha ao processar pagamento.", { description: error.message });
        } finally {
            setIsProcessing(false);
            setSelectedConta(null);
            setSelectedContaBancaria("");
        }
    };

    const contasComFornecedor = useMemo(() => {
        return contas.map(conta => ({
            ...conta,
            fornecedorNome: conta.fornecedorId === 'despesa_operacional'
                ? `Despesa: ${conta.notaFiscal}`
                : fornecedores.find(f => f.id === conta.fornecedorId)?.razaoSocial || "Desconhecido"
        }));
    }, [contas, fornecedores]);

    const renderSubComponent = useCallback(({ row }: { row: Row<ContaComNome> }) => {
        const conta = row.original;
        const details = [
            { label: "Data de Emissão", value: format(new Date(conta.dataEmissao), 'dd/MM/yyyy') },
            { label: "NF / Categoria", value: conta.notaFiscal },
            { label: "Parcela", value: conta.parcela || '1/1' },
            { label: "ID da Conta", value: conta.id, className: "col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4" },
        ];
        return <DetailsSubRow details={details} />;
    }, []);

    const columns: ColumnDef<ContaComNome>[] = [
        { header: "Fornecedor / Despesa", accessorKey: "fornecedorNome" },
        { header: "Vencimento", accessorKey: "dataVencimento", cell: ({ row }) => format(row.original.dataVencimento, 'dd/MM/yyyy') },
        { header: "Valor", cell: ({ row }) => `R$ ${row.original.valor.toFixed(2)}`},
        { header: "Status", cell: ({ row }) => (
            <Badge variant={row.original.status === 'Pendente' ? 'destructive' : 'default'}>
                {row.original.status}
            </Badge>
        )},
        { id: "actions", cell: ({ row }) => (
            <div className="text-right">
                {row.original.status === 'Pendente' && role === 'ADMINISTRADOR' && (
                    <Button size="sm" onClick={() => handleOpenDialog(row.original)}>Dar Baixa (Pagar)</Button>
                )}
            </div>
        )}
    ];

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Pagamento</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                         <p>Confirme a baixa para a conta no valor de <span className="font-semibold text-lg">R$ {selectedConta?.valor.toFixed(2)}</span>.</p>
                         <div className="space-y-2">
                            <Label htmlFor="conta-bancaria">Selecione a conta de origem do pagamento</Label>
                             <Select onValueChange={setSelectedContaBancaria} value={selectedContaBancaria}>
                                <SelectTrigger id="conta-bancaria">
                                    <SelectValue placeholder="Selecione a conta..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {contasBancarias.map(conta => (
                                        <SelectItem key={conta.id} value={conta.id!}>{`${conta.nomeConta} (Saldo: R$ ${conta.saldoAtual?.toFixed(2)})`}</SelectItem>
                                    ))}
                                </SelectContent>
                             </Select>
                         </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline" disabled={isProcessing}>Cancelar</Button></DialogClose>
                        <Button type="button" onClick={handleConfirmPayment} disabled={!selectedContaBancaria || isProcessing}>
                            {isProcessing && <IconLoader className="mr-2 h-4 w-4 animate-spin" />}
                            {isProcessing ? "Processando..." : "Confirmar Pagamento"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>Contas a Pagar</CardTitle>
                    <CardDescription>Visualize e gerencie as contas pendentes de pagamento.</CardDescription>
                </CardHeader>
                <CardContent>
                    <GenericTable
                        columns={columns}
                        data={contasComFornecedor}
                        filterPlaceholder="Filtrar por fornecedor ou despesa..."
                        filterColumnId="fornecedorNome"
                        renderSubComponent={renderSubComponent}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
