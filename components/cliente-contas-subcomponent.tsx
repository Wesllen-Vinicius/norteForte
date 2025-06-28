"use client";

import { useMemo } from "react";
import { Row } from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";

import { useDataStore } from "@/store/data.store";
import { Cliente, ContaAReceber } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const RenderContasAReceber = ({ row }: { row: Row<Cliente> }) => {
    const { id: clienteId } = row.original;
    const vendas = useDataStore((state) => state.vendas);

    const contasDoCliente = useMemo(() => {
        return vendas
            .filter(v => v.clienteId === clienteId && v.status === 'Pendente' && v.dataVencimento)
            .map(v => ({
                id: v.id!,
                vendaId: v.id!,
                clienteId: v.clienteId,
                clienteNome: row.original.nome,
                valor: v.valorFinal || v.valorTotal,
                dataEmissao: v.data,
                dataVencimento: v.dataVencimento!,
                status: 'Pendente'
            } as ContaAReceber));
    }, [clienteId, row.original.nome, vendas]);

    if (!contasDoCliente) {
        return <div className="p-4 text-center text-sm text-muted-foreground">Carregando contas...</div>;
    }

    return (
        <div className="p-4 bg-muted/50">
            <h4 className="font-semibold text-sm mb-2">Contas a Receber Pendentes</h4>
            {contasDoCliente.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="h-8">Vencimento</TableHead>
                            <TableHead className="h-8">Valor</TableHead>
                            <TableHead className="h-8 text-right">Ref. Venda</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {contasDoCliente.map(conta => (
                            <TableRow key={conta.id}>
                                <TableCell className="py-1">{format(new Date(conta.dataVencimento), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="py-1">R$ {conta.valor.toFixed(2)}</TableCell>
                                <TableCell className="py-1 text-right">
                                     <Button asChild variant="link" size="sm" className="p-0 h-auto">
                                        <Link href={`/dashboard/vendas?vendaId=${conta.vendaId}`}>
                                            Ver Venda
                                        </Link>
                                     </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <p className="text-sm text-muted-foreground px-2 py-4">Nenhuma conta a receber pendente para este cliente.</p>
            )}
        </div>
    );
};
