"use client"

import { useEffect, useState, useMemo } from "react";
import { onSnapshot, collection, doc, updateDoc } from "firebase/firestore";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { GenericTable } from "@/components/generic-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContaAReceber } from "@/lib/schemas";
import { updateStatusContaAReceber } from "@/lib/services/contasAReceber.services";
import { useDataStore } from "@/store/data.store";
import { updateVendaStatus } from "@/lib/services/vendas.services";

type ContaComNome = ContaAReceber & { clienteNome?: string };

export default function ContasAReceberPage() {
    const [contas, setContas] = useState<ContaAReceber[]>([]);
    const clientes = useDataStore((state) => state.clientes);
    const [globalFilter, setGlobalFilter] = useState('');

    useEffect(() => {
        const unsubContas = onSnapshot(collection(db, "contasAReceber"), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContaAReceber));
            setContas(data);
        });

        return () => {
            unsubContas();
        };
    }, []);

    const handleMarcarComoRecebida = async (conta: ContaAReceber) => {
        try {
            await updateStatusContaAReceber(conta.id, "Recebida");
            if (conta.vendaId) {
                await updateVendaStatus(conta.vendaId, "Paga");
            }
            toast.success("Conta marcada como recebida!");
        } catch {
            toast.error("Erro ao atualizar o status da conta.");
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
        { header: "Emissão", accessorKey: "dataEmissao", cell: ({ row }) => format((row.original.dataEmissao as Timestamp).toDate(), 'dd/MM/yyyy') },
        { header: "Vencimento", accessorKey: "dataVencimento", cell: ({ row }) => row.original.dataVencimento ? format((row.original.dataVencimento as Timestamp).toDate(), 'dd/MM/yyyy') : 'N/A' },
        { header: "Valor", accessorKey: "valor", cell: ({ row }) => `R$ ${row.original.valor.toFixed(2)}`},
        { header: "Status", accessorKey: "status", cell: ({ row }) => (
            <Badge variant={row.original.status === 'Pendente' ? 'destructive' : 'default'}>
                {row.original.status}
            </Badge>
        )},
        { id: "actions", cell: ({ row }) => (
            <div className="text-right">
                {row.original.status === 'Pendente' && (
                    <Button size="sm" onClick={() => handleMarcarComoRecebida(row.original)}>Marcar como Recebida</Button>
                )}
            </div>
        )}
    ];

    const tableControls = (<Input placeholder="Pesquisar por cliente..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="max-w-full md:max-w-sm" />);

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Card>
                <CardHeader>
                    <CardTitle>Contas a Receber</CardTitle>
                    <CardDescription>Visualize e gerencie as contas de vendas a prazo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <GenericTable
                        columns={columns}
                        data={contasComCliente}
                        globalFilter={globalFilter}
                        setGlobalFilter={setGlobalFilter}
                        tableControlsComponent={tableControls}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
