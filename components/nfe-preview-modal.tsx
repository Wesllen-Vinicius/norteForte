"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Cliente, CompanyInfo, Venda, Produto, Unidade, clienteSchema, enderecoSchema, ProdutoVenda } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";

const previewSchema = z.object({
    nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
    endereco: enderecoSchema,
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

const FieldBox = ({ label, children, className }: { label: string, children: React.ReactNode, className?: string }) => (
    <div className={cn("border border-muted-foreground p-1 flex flex-col h-full", className)}>
        <span className="text-[9px] text-muted-foreground uppercase">{label}</span>
        <div className="text-sm font-bold text-foreground mt-1 truncate">{children}</div>
    </div>
);

const FormInputBox = ({ name, label, control, disabled = false, className }: { name: any, label: string, control: any, disabled?: boolean, className?: string }) => (
    <div className={cn("flex flex-col", className)}>
         <span className="text-[9px] text-muted-foreground/80 uppercase mb-0.5">{label}</span>
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className="w-full">
                    <FormControl>
                        <Input className="h-8 border-muted-foreground/50 text-sm p-1" {...field} disabled={disabled} />
                    </FormControl>
                </FormItem>
            )}
        />
    </div>
)

const DataRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-start text-sm">
      <span className="text-muted-foreground/80">{label}:</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
);

export function NfePreviewModal({ isOpen, onOpenChange, previewData, onSubmit, isLoading }: NfePreviewModalProps) {
  const form = useForm<PreviewFormValues>({
    resolver: zodResolver(previewSchema),
  });

  useEffect(() => {
    if (previewData?.cliente) {
      form.reset(previewData.cliente);
    }
  }, [previewData, form]);

  if (!previewData) return null;

  const { venda, empresa, cliente, todosProdutos, todasUnidades } = previewData;
  const valorTotal = venda.valorTotal || 0;
  const valorFinal = venda.valorFinal ?? valorTotal;

  const handleFormSubmit = (data: PreviewFormValues) => {
    const finalData = {
        ...previewData,
        cliente: { ...cliente, ...data }
    };
    onSubmit(finalData);
  }

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xs uppercase font-semibold text-center my-1 text-muted-foreground">{children}</h3>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* **LARGURA ALTERADA AQUI** */}
      <DialogContent className="max-w-6xl w-full max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pré-Visualização da NF-e</DialogTitle>
          <DialogDescription>
            Confira todos os dados antes de enviar para autorização na Sefaz.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} id="nfe-confirm-form" className="flex-grow min-h-0">
            <ScrollArea className="h-full w-full border rounded-md p-2 bg-background">
                <div className="danfe-container space-y-2 text-foreground">
                    <header className="grid grid-cols-2 gap-2">
                        <div className="border border-muted-foreground p-2 flex items-center">
                            <h2 className="text-xl font-bold">{empresa.nomeFantasia || empresa.razaoSocial}</h2>
                        </div>
                        <div className="border border-muted-foreground p-2 text-center">
                            <h3 className="text-2xl font-bold">DANFE</h3>
                            <p className="text-xs">Documento Auxiliar da Nota Fiscal Eletrônica</p>
                        </div>
                    </header>

                    <main className="space-y-1">
                        <section className="border border-muted-foreground p-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                <div className="space-y-1">
                                    <DataRow label="Razão Social" value={empresa.razaoSocial} />
                                    <DataRow label="Endereço" value={`${empresa.endereco.logradouro}, ${empresa.endereco.numero}`} />
                                    <DataRow label="Município/UF" value={`${empresa.endereco.cidade} / ${empresa.endereco.uf}`} />
                                </div>
                                <div className="space-y-1">
                                    <DataRow label="CNPJ" value={empresa.cnpj} />
                                    <DataRow label="Inscrição Estadual" value={empresa.inscricaoEstadual} />
                                </div>
                            </div>
                        </section>

                        <section className="border border-muted-foreground p-2">
                            <SectionTitle>Destinatário / Remetente</SectionTitle>
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mt-1">
                                <FormInputBox name="nome" label="Nome / Razão Social" control={form.control} className="md:col-span-4"/>
                                <FormInputBox name="documento" label="CPF / CNPJ" control={form.control} disabled className="md:col-span-2"/>
                                <FormInputBox name="endereco.logradouro" label="Endereço" control={form.control} className="md:col-span-4"/>
                                <FormInputBox name="endereco.bairro" label="Bairro" control={form.control} className="md:col-span-2"/>
                                <FormInputBox name="endereco.cep" label="CEP" control={form.control} className="md:col-span-2"/>
                                <FormInputBox name="endereco.cidade" label="Município" control={form.control} className="md:col-span-3"/>
                                <FormInputBox name="endereco.uf" label="UF" control={form.control} className="md:col-span-1"/>
                            </div>
                        </section>

                        <section className="border border-muted-foreground p-1">
                            <SectionTitle>Dados dos Produtos / Serviços</SectionTitle>
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="border-b border-muted-foreground">
                                        <TableHead className="h-auto p-1 border-r border-muted-foreground">CÓD.</TableHead>
                                        <TableHead className="h-auto p-1 border-r border-muted-foreground">DESCRIÇÃO</TableHead>
                                        <TableHead className="h-auto p-1 border-r border-muted-foreground text-center">NCM</TableHead>
                                        <TableHead className="h-auto p-1 border-r border-muted-foreground text-center">CFOP</TableHead>
                                        <TableHead className="h-auto p-1 border-r border-muted-foreground text-center">UN.</TableHead>
                                        <TableHead className="h-auto p-1 text-right border-r border-muted-foreground">QTD.</TableHead>
                                        <TableHead className="h-auto p-1 text-right border-r border-muted-foreground">VLR. UNIT.</TableHead>
                                        <TableHead className="h-auto p-1 text-right">VLR. TOTAL</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {venda.produtos.map((item) => {
                                        const produtoCompleto = todosProdutos.find(p => p.id === item.produtoId);
                                        if (produtoCompleto && produtoCompleto.tipoProduto === 'VENDA') {
                                            const unidade = todasUnidades.find(u => u.id === produtoCompleto.unidadeId);
                                            return (
                                                <TableRow key={item.produtoId} className="border-0">
                                                    <TableCell className="p-1 font-mono">{produtoCompleto.codigo || produtoCompleto.id?.slice(0, 8)}</TableCell>
                                                    <TableCell className="p-1">{item.produtoNome}</TableCell>
                                                    <TableCell className="p-1 text-center font-mono">{produtoCompleto.ncm}</TableCell>
                                                    <TableCell className="p-1 text-center font-mono">{produtoCompleto.cfop}</TableCell>
                                                    <TableCell className="p-1 text-center">{unidade?.sigla.toUpperCase()}</TableCell>
                                                    <TableCell className="p-1 text-right font-mono">{item.quantidade.toFixed(2)}</TableCell>
                                                    <TableCell className="p-1 text-right font-mono">{item.precoUnitario.toFixed(2)}</TableCell>
                                                    <TableCell className="p-1 text-right font-mono">{(item.quantidade * item.precoUnitario).toFixed(2)}</TableCell>
                                                </TableRow>
                                            )
                                        }
                                        return null;
                                    })}
                                </TableBody>
                            </Table>
                        </section>

                        <section className="grid grid-cols-2 gap-1">
                            <div className="border border-muted-foreground p-2">
                                <h4 className="text-xs uppercase font-semibold mb-2">Dados Adicionais</h4>
                                <div className="text-xs space-y-1">
                                    <span className="text-muted-foreground/80">INFORMAÇÕES COMPLEMENTARES:</span>
                                    <p>{empresa.configuracaoFiscal.informacoes_complementares}</p>
                                </div>
                            </div>
                            <div className="border border-muted-foreground p-2 space-y-1">
                                <DataRow label="Subtotal" value={`R$ ${valorTotal.toFixed(2)}`} />
                                { (valorFinal > valorTotal) &&
                                    <DataRow label="Acréscimos" value={`R$ ${(valorFinal - valorTotal).toFixed(2)}`} />
                                }
                                <Separator className="my-2 bg-muted-foreground" />
                                <div className="flex justify-between items-center text-base">
                                    <span className="font-semibold">VALOR TOTAL NF-e</span>
                                    <span className="font-bold">R$ {valorFinal.toFixed(2)}</span>
                                </div>
                            </div>
                        </section>
                    </main>
                </div>
            </ScrollArea>
          </form>
        </Form>
        <DialogFooter className="mt-4 pt-4 border-t">
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button type="submit" form="nfe-confirm-form" disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white">
            {isLoading ? "Emitindo..." : "Confirmar e Emitir NF-e"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
