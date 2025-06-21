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
import { ContaAReceber, updateStatusContaAReceber } from "@/lib/services/contasAReceber.services";
import { useDataStore } from "@/store/data.store";

export default function ContasAReceberPage() {
    const [contas, setContas] = useState<ContaAReceber[]>([]);
    const clientes = useDataStore((state) => state.clientes);

    useEffect(() => {
        const unsubContas = onSnapshot(collection(db, "contasAReceber"), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContaAReceber));
            setContas(data);
        });

        return () => {
            unsubContas();
        };
    }, []);

    const handleMarcarComoRecebida = async (id: string) => {
        try {
            await updateStatusContaAReceber(id, "Recebida");
            toast.success("Conta marcada como recebida!");
        } catch (error) {
            toast.error("Erro ao atualizar o status da conta.");
        }
    };

    const contasComCliente = useMemo(() => {
        return contas.map(conta => ({
            ...conta,
            clienteNome: clientes.find(c => c.id === conta.clienteId)?.nome || "N/A"
        }));
    }, [contas, clientes]);

    const columns: ColumnDef<typeof contasComCliente[0]>[] = [
        { header: "Cliente", accessorKey: "clienteNome" },
        { header: "Emissão", cell: ({ row }) => format((row.original.dataEmissao as Timestamp).toDate(), 'dd/MM/yyyy') },
        { header: "Vencimento", cell: ({ row }) => format((row.original.dataVencimento as Timestamp).toDate(), 'dd/MM/yyyy') },
        { header: "Valor", cell: ({ row }) => `R$ ${row.original.valor.toFixed(2)}`},
        { header: "Status", cell: ({ row }) => (
            <Badge variant={row.original.status === 'Pendente' ? 'destructive' : 'default'}>
                {row.original.status}
            </Badge>
        )},
        { id: "actions", cell: ({ row }) => (
            <div className="text-right">
                {row.original.status === 'Pendente' && (
                    <Button size="sm" onClick={() => handleMarcarComoRecebida(row.original.id)}>Marcar como Recebida</Button>
                )}
            </div>
        )}
    ];

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
                        filterPlaceholder="Filtrar por cliente..."
                        filterColumnId="clienteNome"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
