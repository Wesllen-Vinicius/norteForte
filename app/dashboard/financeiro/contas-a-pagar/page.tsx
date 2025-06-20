"use client"

import { useEffect, useState, useMemo } from "react";
import { onSnapshot, collection, doc, updateDoc } from "firebase/firestore";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { Fornecedor, subscribeToFornecedores } from "@/lib/services/fornecedores.services";
import { GenericTable } from "@/components/generic-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ContaAPagar {
    id: string;
    fornecedorId: string;
    notaFiscal: string;
    valor: number;
    dataEmissao: { toDate: () => Date };
    condicaoPagamento: string;
    status: 'Pendente' | 'Paga';
}

export default function ContasAPagarPage() {
    const [contas, setContas] = useState<ContaAPagar[]>([]);
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

    useEffect(() => {
        const unsubContas = onSnapshot(collection(db, "contasAPagar"), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContaAPagar));
            setContas(data);
        });
        const unsubFornecedores = subscribeToFornecedores(setFornecedores);

        return () => {
            unsubContas();
            unsubFornecedores();
        };
    }, []);

    const handleMarcarComoPago = async (id: string) => {
        const contaDoc = doc(db, "contasAPagar", id);
        try {
            await updateDoc(contaDoc, { status: "Paga" });
            toast.success("Conta marcada como paga!");
        } catch (error) {
            toast.error("Erro ao atualizar o status da conta.");
        }
    };

    const contasComFornecedor = useMemo(() => {
        return contas.map(conta => ({
            ...conta,
            fornecedorNome: fornecedores.find(f => f.id === conta.fornecedorId)?.razaoSocial || "N/A"
        }));
    }, [contas, fornecedores]);

    const columns: ColumnDef<typeof contasComFornecedor[0]>[] = [
        { header: "Fornecedor", accessorKey: "fornecedorNome" },
        { header: "Nota Fiscal", accessorKey: "notaFiscal" },
        { header: "Emissão", cell: ({ row }) => format(row.original.dataEmissao.toDate(), 'dd/MM/yyyy') },
        { header: "Valor", cell: ({ row }) => `R$ ${row.original.valor.toFixed(2)}`},
        { header: "Condição", accessorKey: "condicaoPagamento" },
        { header: "Status", cell: ({ row }) => (
            <Badge variant={row.original.status === 'Pendente' ? 'destructive' : 'default'}>
                {row.original.status}
            </Badge>
        )},
        { id: "actions", cell: ({ row }) => (
            <div className="text-right">
                {row.original.status === 'Pendente' && (
                    <Button size="sm" onClick={() => handleMarcarComoPago(row.original.id)}>Marcar como Paga</Button>
                )}
            </div>
        )}
    ];

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <Card>
                <CardHeader>
                    <CardTitle>Contas a Pagar</CardTitle>
                    <CardDescription>Visualize e gerencie as contas pendentes de pagamento.</CardDescription>
                </CardHeader>
                <CardContent>
                    <GenericTable columns={columns} data={contasComFornecedor} />
                </CardContent>
            </Card>
        </div>
    );
}
