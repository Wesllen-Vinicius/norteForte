"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { registrarMovimentacao } from "@/lib/services/estoque.services";
import { useDataStore } from "@/store/data.store";
import { movimentacaoSchema, Produto } from "@/lib/schemas";

type MovimentacaoFormValues = z.infer<typeof movimentacaoSchema>;

export default function EstoquePage() {
    const produtos = useDataStore((state) => state.produtos);
    const unidades = useDataStore((state) => state.unidades);

    const form = useForm<MovimentacaoFormValues>({
        resolver: zodResolver(movimentacaoSchema),
        defaultValues: { produtoId: "", quantidade: 0, tipo: undefined, motivo: "" }
    });

    const onSubmit = async (values: MovimentacaoFormValues) => {
        const produtoSelecionado = produtos.find(p => p.id === values.produtoId);
        if (!produtoSelecionado) {
            toast.error("Produto selecionado é inválido.");
            return;
        }

        try {
            await registrarMovimentacao({
                ...values,
                produtoNome: produtoSelecionado.nome,
            });
            toast.success("Movimentação de estoque registrada com sucesso!");
            form.reset({ produtoId: '', tipo: undefined, quantidade: 0, motivo: '' });
        } catch (error: any) {
            toast.error("Erro ao registrar movimentação.", {
                description: error.message,
            });
        }
    };

    const columns: ColumnDef<Produto>[] = [
        { accessorKey: "nome", header: "Produto" },
        {
            accessorKey: "quantidade",
            header: "Quantidade em Estoque",
            cell: ({ row }) => {
                const produto = row.original;
                let unidadeSigla = 'un';

                if (produto.tipoProduto === 'VENDA' && produto.unidadeId) {
                  const unidade = unidades.find(u => u.id === produto.unidadeId);
                  unidadeSigla = unidade?.sigla || 'un';
                }

                return `${produto.quantidade || 0} ${unidadeSigla}`;
            }
        },
    ];

    const formContent = (
      <>
        <CardDescription className="mb-6">
          Use este formulário para registrar entradas e saídas manuais.
        </CardDescription>
        <GenericForm schema={movimentacaoSchema} onSubmit={onSubmit} formId="movimentacao-form" form={form}>
            <div className="space-y-4">
              <FormField name="produtoId" control={form.control} render={({ field }) => (
                  <FormItem>
                      <FormLabel>Produto</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger></FormControl>
                          <SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id!}>{p.nome}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
              )} />
              <div className="grid md:grid-cols-2 gap-4">
                  <FormField name="quantidade" control={form.control} render={({ field }) => (
                      <FormItem>
                          <FormLabel>Quantidade</FormLabel>
                          <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )} />
                  <FormField name="tipo" control={form.control} render={({ field }) => (
                      <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                              <SelectContent>
                                  <SelectItem value="entrada"><IconArrowUp className="inline-block h-4 w-4 mr-2 text-green-500"/>Entrada</SelectItem>
                                  <SelectItem value="saida"><IconArrowDown className="inline-block h-4 w-4 mr-2 text-red-500"/>Saída</SelectItem>
                              </SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                  )} />
              </div>
              <FormField name="motivo" control={form.control} render={({ field }) => (
                  <FormItem>
                      <FormLabel>Motivo (Opcional)</FormLabel>
                      <FormControl><Input placeholder="Ex: Ajuste de inventário" {...field} /></FormControl>
                      <FormMessage />
                  </FormItem>
              )} />
            </div>
            <div className="flex justify-end pt-6">
                <Button type="submit" form="movimentacao-form">Registrar Movimentação</Button>
            </div>
        </GenericForm>
      </>
    );

    const tableContent = (
        <GenericTable
            columns={columns}
            data={produtos}
            filterPlaceholder="Filtrar por produto..."
            filterColumnId="nome"
        />
    );

    return (
        <CrudLayout
            formTitle="Movimentação de Estoque"
            formContent={formContent}
            tableTitle="Estoque Atual"
            tableContent={tableContent}
        />
    );
}
