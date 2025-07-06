"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Cliente, CompanyInfo, Venda, Produto, Unidade, clienteSchema } from "@/lib/schemas";

const previewSchema = clienteSchema.pick({
    nome: true,
    documento: true,
    endereco: true,
});

type PreviewFormValues = z.infer<typeof previewSchema>;

interface NfePreviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: {
    venda: Venda;
    empresa: CompanyInfo;
    cliente: Cliente;
    todosProdutos: Produto[];
    todasUnidades: Unidade[];
  } | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export function NfePreviewModal({
  isOpen,
  onOpenChange,
  previewData,
  onSubmit,
  isLoading
}: NfePreviewModalProps) {
  const form = useForm<PreviewFormValues>({
    resolver: zodResolver(previewSchema),
    defaultValues: previewData?.cliente || {},
  });

  useEffect(() => {
    if (previewData?.cliente) {
      form.reset(previewData.cliente);
    }
  }, [previewData, form]);

  const handleFormSubmit = (data: PreviewFormValues) => {
    if (!previewData) return;
    const finalData = {
        ...previewData,
        cliente: { ...previewData.cliente, ...data }
    };
    onSubmit(finalData);
  }

  if (!previewData) return null;

  const { venda } = previewData;
  const valorTotal = venda.valorTotal || 0;
  const valorFinal = venda.valorFinal ?? valorTotal;
  const taxaCartao = venda.taxaCartao || 0;
  const taxaCartaoValor = valorFinal - valorTotal;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Conferir Dados para Emissão da NF-e</DialogTitle>
          <DialogDescription>
            Revise os dados antes de emitir. As alterações feitas aqui são apenas para esta nota fiscal.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} id="nfe-confirm-form">
            <ScrollArea className="h-[60vh] w-full p-4">
                <div className="space-y-6">
                    <section>
                        <h3 className="text-lg font-semibold mb-2">Destinatário</h3>
                        <div className="space-y-4 rounded-md border p-4">
                            <FormField control={form.control} name="nome" render={({ field }) => ( <FormItem><FormLabel>Nome / Razão Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="documento" render={({ field }) => ( <FormItem><FormLabel>CPF / CNPJ</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField control={form.control} name="endereco.logradouro" render={({ field }) => ( <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="endereco.numero" render={({ field }) => ( <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="endereco.bairro" render={({ field }) => ( <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="endereco.cidade" render={({ field }) => ( <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="endereco.uf" render={({ field }) => ( <FormItem><FormLabel>UF</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                        </div>
                    </section>
                    <Separator/>
                    <section>
                        <h3 className="text-lg font-semibold mb-2">Produtos</h3>
                        <div className="space-y-2 rounded-md border p-4">
                            {venda.produtos.map((item, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <span className="truncate pr-2">{item.quantidade}x {item.produtoNome}</span>
                                    <span className="font-mono">R$ {(item.quantidade * item.precoUnitario).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                     <Separator/>
                     <section className="text-right space-y-2 rounded-md border p-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-mono">R$ {valorTotal.toFixed(2)}</span>
                        </div>
                        {taxaCartao > 0 && (
                             <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Taxa Cartão ({taxaCartao}%)</span>
                                <span className="font-mono">R$ {taxaCartaoValor.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base font-bold">
                           <span >Valor Total da NF-e</span>
                           <span className="font-mono text-lg">R$ {valorFinal.toFixed(2)}</span>
                        </div>
                     </section>
                </div>
            </ScrollArea>
          </form>
        </Form>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button type="submit" form="nfe-confirm-form" disabled={isLoading}>
            {isLoading ? "Emitindo..." : "Confirmar e Emitir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
