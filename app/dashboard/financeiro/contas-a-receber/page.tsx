"use client"

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";

import { GenericTable } from "@/components/generic-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContaAReceber, subscribeToContasAReceber, updateStatusContaAReceber } from "@/lib/services/contasAReceber.services";
import { useAuthStore } from "@/store/auth.store";


export default function ContasAReceberPage() {
    const [contas, setContas] = useState<ContaAReceber[]>([]);
    const { role } = useAuthStore();

    useEffect(() => {
        const unsubscribe = subscribeToContasAReceber(setContas);
        return () => unsubscribe();
    }, []);

    const handleMarcarComoRecebida = async (id: string) => {
        try {
            await updateStatusContaAReceber(id, "Recebida");
            toast.success("Conta marcada como recebida!");
        } catch (error) {
            toast.error("Erro ao atualizar o status da conta.");
        }
    };

    const columns: ColumnDef<ContaAReceber>[] = [
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
                    <GenericTable columns={columns} data={contas} />
                </CardContent>
            </Card>
        </div>
    );
}
