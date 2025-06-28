"use client"

import { useEffect, useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
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

interface ContaAPagar {
    id: string;
    fornecedorId: string;
    notaFiscal: string;
    valor: number;
    dataEmissao: Date;
    dataVencimento: Date;
    condicaoPagamento: string;
    status: 'Pendente' | 'Paga';
    despesaId?: string;
}

export default function ContasAPagarPage() {
    const [contas, setContas] = useState<ContaAPagar[]>([]);
    const { fornecedores, contasBancarias } = useDataStore();
    const { user } = useAuthStore();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedConta, setSelectedConta] = useState<ContaAPagar | null>(null);
    const [selectedContaBancaria, setSelectedContaBancaria] = useState<string>("");

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

        try {
            await pagarConta(selectedConta, selectedContaBancaria, user);
            toast.success("Conta paga e baixada com sucesso!");
        } catch (error: any) {
            toast.error("Falha ao processar pagamento.", { description: error.message });
        } finally {
            setIsDialogOpen(false);
            setSelectedConta(null);
            setSelectedContaBancaria("");
        }
    };

    const contasComFornecedor = useMemo(() => {
        return contas.map(conta => ({
            ...conta,
            fornecedorNome: conta.fornecedorId === 'despesa_operacional'
                ? `Despesa: ${conta.notaFiscal}`
                : fornecedores.find(f => f.id === conta.fornecedorId)?.razaoSocial || "N/A"
        }));
    }, [contas, fornecedores]);

    const columns: ColumnDef<typeof contasComFornecedor[0]>[] = [
        { header: "Fornecedor / Despesa", accessorKey: "fornecedorNome" },
        { header: "NF / Categoria", accessorKey: "notaFiscal" },
        { header: "Vencimento", accessorKey: "dataVencimento", cell: ({ row }) => format(row.original.dataVencimento, 'dd/MM/yyyy') },
        { header: "Valor", cell: ({ row }) => `R$ ${row.original.valor.toFixed(2)}`},
        { header: "Status", cell: ({ row }) => (
            <Badge variant={row.original.status === 'Pendente' ? 'destructive' : 'default'}>
                {row.original.status}
            </Badge>
        )},
        { id: "actions", cell: ({ row }) => (
            <div className="text-right">
                {row.original.status === 'Pendente' && (
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
                    <div className="py-4 space-y-2">
                         <p>Confirme a baixa para a conta:</p>
                         <p className="font-semibold text-lg">R$ {selectedConta?.valor.toFixed(2)}</p>
                         <Label htmlFor="conta-bancaria">Selecione a conta de origem do pagamento</Label>
                         <Select onValueChange={setSelectedContaBancaria} value={selectedContaBancaria}>
                            <SelectTrigger id="conta-bancaria">
                                <SelectValue placeholder="Selecione a conta..." />
                            </SelectTrigger>
                            <SelectContent>
                                {contasBancarias.map(conta => (
                                    <SelectItem key={conta.id} value={conta.id!}>{conta.nomeConta}</SelectItem>
                                ))}
                            </SelectContent>
                         </Select>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                        <Button type="button" onClick={handleConfirmPayment} disabled={!selectedContaBancaria}>Confirmar Pagamento</Button>
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
                    />
                </CardContent>
            </Card>
        </div>
    );
}
