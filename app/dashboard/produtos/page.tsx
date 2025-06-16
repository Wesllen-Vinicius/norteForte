// app/dashboard/produtos/page.tsx
"use client"

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ColumnDef } from "@tanstack/react-table";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

import { CenteredLayout } from "@/components/centered-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Produto, produtoSchema, addProduto, subscribeToProdutos, updateProduto, deleteProduto, unidadesDeMedida } from "@/lib/services/produtos.services";

type ProdutoFormValues = z.infer<typeof produtoSchema>;

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const form = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues: { id: "", nome: "", unidadeDeMedida: undefined },
  });

  useEffect(() => {
    const unsubscribe = subscribeToProdutos(setProdutos);
    return () => unsubscribe();
  }, []);

  const handleEdit = (produto: Produto) => {
    form.reset(produto);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este produto?")) return;
    try {
      await deleteProduto(id);
      toast.success("Produto removido com sucesso!");
    } catch (error) {
      toast.error("Erro ao remover o produto.");
    }
  };

  const resetForm = () => {
    form.reset({ id: "", nome: "", unidadeDeMedida: undefined });
    setIsEditing(false);
  };

  const onSubmit = async (values: ProdutoFormValues) => {
    try {
      const { id, ...data } = values;
      if (isEditing && id) {
        await updateProduto(id, data);
        toast.success(`Produto "${data.nome}" atualizado com sucesso!`);
      } else {
        await addProduto(data);
        toast.success(`Produto "${data.nome}" adicionado com sucesso!`);
      }
      resetForm();
    } catch (error) {
      toast.error("Ocorreu um erro ao salvar o produto.");
    }
  };

  const columns: ColumnDef<Produto>[] = [
    {
      accessorKey: "nome",
      header: "Nome do Produto",
    },
    {
      accessorKey: "unidadeDeMedida",
      header: "Unidade",
      cell: ({ row }) => <span className="uppercase">{row.original.unidadeDeMedida}</span>
    },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => {
        const produto = row.original;
        return (
          <div className="text-right">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(produto)}>
              <IconPencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(produto.id!)}>
              <IconTrash className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <CenteredLayout>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Editar Produto" : "Novo Produto"}</CardTitle>
          </CardHeader>
          <CardContent>
            <GenericForm schema={produtoSchema} onSubmit={onSubmit} formId="produto-form" form={form}>
              <div className="grid md:grid-cols-2 gap-4">
                <FormField name="nome" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto</FormLabel>
                    <FormControl><Input placeholder="Ex: Picanha, Maminha" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="unidadeDeMedida" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade de Medida</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a unidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {unidadesDeMedida.map((unidade) => (
                          <SelectItem key={unidade} value={unidade}>
                            {unidade.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                <Button type="submit" form="produto-form">{isEditing ? "Salvar Alterações" : "Adicionar Produto"}</Button>
              </div>
            </GenericForm>
          </CardContent>
        </Card>

        <Card>
           <CardHeader><CardTitle>Produtos Cadastrados</CardTitle></CardHeader>
           <CardContent>
             <GenericTable columns={columns} data={produtos} />
           </CardContent>
        </Card>
      </div>
    </CenteredLayout>
  );
}
