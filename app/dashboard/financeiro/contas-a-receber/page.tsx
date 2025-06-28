"use client"

import { useEffect, useState, useMemo } from "react";
import { onSnapshot, collection, doc, updateDoc, Timestamp } from "firebase/firestore";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { GenericTable } from "@/components/generic-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useDataStore } from "@/store/data.store";
import { useAuthStore } from "@/store/auth.store";
import { subscribeToContasAReceber, receberPagamento } from "@/lib/services/contasAReceber.services";
import { ContaAReceber } from "@/lib/schemas";

type ContaComNome = ContaAReceber & { clienteNome?: string };

export default function ContasAReceberPage() {
    const [contas, setContas] = useState<ContaAReceber[]>([]);
    const { clientes, contasBancarias } = useDataStore();
    const { user } = useAuthStore();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedConta, setSelectedConta] = useState<ContaAReceber | null>(null);
    const [selectedContaBancaria, setSelectedContaBancaria] = useState<string>("");

    useEffect(() => {
        const unsubContas = subscribeToContasAReceber((data) => {
            const contasComDataConvertida = data.map(c => ({
                ...c,
                dataEmissao: (c.dataEmissao as Timestamp).toDate(),
                dataVencimento: (c.dataVencimento as Timestamp).toDate()
            }));
            setContas(contasComDataConvertida);
        });

        return () => unsubContas();
    }, []);

    const handleOpenDialog = (conta: ContaAReceber) => {
        setSelectedConta(conta);
        setIsDialogOpen(true);
    };

    const handleConfirmRecebimento = async () => {
        if (!selectedConta || !selectedContaBancaria || !user) {
            toast.error("Selecione uma conta bancária para continuar.");
            return;
        }

        try {
            await receberPagamento(selectedConta, selectedContaBancaria, user);
            toast.success("Conta recebida e baixada com sucesso!");
        } catch (error: any) {
            toast.error("Falha ao processar recebimento.", { description: error.message });
        } finally {
            setIsDialogOpen(false);
            setSelectedConta(null);
            setSelectedContaBancaria("");
        }
    };

    const contasComCliente = useMemo(() => {
        return contas.map(conta => ({
            ...conta,
            clienteNome: clientes.find(c => c.id === conta.clienteId)?.nome || "N/A"
        }));
    }, [contas, clientes]);

    const columns: ColumnDef<ContaComNome>[] = [
        { header: "Cliente", accessorKey: "clienteNome" },
        { header: "Emissão", accessorKey: "dataEmissao", cell: ({ row }) => format(row.original.dataEmissao, 'dd/MM/yyyy') },
        { header: "Vencimento", accessorKey: "dataVencimento", cell: ({ row }) => row.original.dataVencimento ? format(row.original.dataVencimento, 'dd/MM/yyyy') : 'N/A' },
        { header: "Valor", accessorKey: "valor", cell: ({ row }) => `R$ ${row.original.valor.toFixed(2)}`},
        { header: "Status", accessorKey: "status", cell: ({ row }) => (
            <Badge variant={row.original.status === 'Pendente' ? 'destructive' : 'default'}>
                {row.original.status}
            </Badge>
        )},
        { id: "actions", cell: ({ row }) => (
            <div className="text-right">
                {row.original.status === 'Pendente' && (
                    <Button size="sm" onClick={() => handleOpenDialog(row.original)}>Dar Baixa (Receber)</Button>
                )}
            </div>
        )}
    ];

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Recebimento</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                         <p>Confirme a baixa para a conta:</p>
                         <p className="font-semibold text-lg">R$ {selectedConta?.valor.toFixed(2)}</p>
                         <Label htmlFor="conta-bancaria">Selecione a conta de destino do recebimento</Label>
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
                        <Button type="button" onClick={handleConfirmRecebimento} disabled={!selectedContaBancaria}>Confirmar Recebimento</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>Contas a Receber</CardTitle>
                    <CardDescription>Visualize e gerencie as contas de vendas a prazo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <GenericTable
                        columns={columns}
                        data={contasComCliente}
                        filterPlaceholder="Pesquisar por cliente..."
                        filterColumnId="clienteNome"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
