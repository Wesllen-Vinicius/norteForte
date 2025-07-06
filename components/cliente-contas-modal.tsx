"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/store/data.store";
import { Cliente, ContaAReceber } from "@/lib/schemas";

interface ClienteContasModalProps {
  cliente: Cliente | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ClienteContasModal({ cliente, isOpen, onOpenChange }: ClienteContasModalProps) {
  const { vendas } = useDataStore();

  const contasDoCliente = useMemo(() => {
    if (!cliente) return [];
    return vendas
        .filter(v => v.clienteId === cliente.id && v.status === 'Pendente' && v.dataVencimento)
        .map(v => ({
            id: v.id!,
            vendaId: v.id!,
            clienteId: v.clienteId,
            clienteNome: cliente.nome,
            valor: v.valorFinal || v.valorTotal,
            dataEmissao: v.data,
            dataVencimento: v.dataVencimento!,
            status: 'Pendente'
        } as ContaAReceber));
  }, [cliente, vendas]);

  if (!cliente) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contas a Receber de {cliente.nome}</DialogTitle>
          <DialogDescription>
            Lista de todas as contas pendentes para este cliente.
          </DialogDescription>
        </DialogHeader>
        {contasDoCliente.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contasDoCliente.map(conta => (
                <TableRow key={conta.id}>
                  <TableCell>{format(new Date(conta.dataVencimento), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>R$ {conta.valor.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="link" size="sm">
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
          <p className="text-sm text-muted-foreground py-4">
            Nenhuma conta pendente.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
