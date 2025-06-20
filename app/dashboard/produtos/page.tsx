"use client"

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Produto, addProduto, subscribeToProdutos, updateProduto, deleteProduto, produtoVendaSchema, produtoUsoInternoSchema, ProdutoVenda, ProdutoUsoInterno } from "@/lib/services/produtos.services";
import { Unidade, subscribeToUnidades } from "@/lib/services/unidades.services";
import { Categoria, subscribeToCategorias } from "@/lib/services/categorias.services";
import { useAuthStore } from "@/store/auth.store";

type FormType = "VENDA" | "USO_INTERNO";

export default function ProdutosPage() {
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [unidades, setUnidades] = useState<Unidade[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [currentForm, setCurrentForm] = useState<FormType | null>(null);
    const { role } = useAuthStore();

    const formVenda = useForm<ProdutoVenda>({
        resolver: zodResolver(produtoVendaSchema),
        defaultValues: { tipoProduto: "VENDA", nome: "", unidadeId: "", precoVenda: 0, custoUnitario: 0, sku: "", ncm: "" },
    });

    const formUsoInterno = useForm<ProdutoUsoInterno>({
        resolver: zodResolver(produtoUsoInternoSchema),
        defaultValues: { tipoProduto: "USO_INTERNO", nome: "", categoriaId: "", custoUnitario: 0 },
    });

    useEffect(() => {
        const unsubProdutos = subscribeToProdutos(setProdutos);
        const unsubUnidades = subscribeToUnidades(setUnidades);
        const unsubCategorias = subscribeToCategorias(setCategorias);
        return () => {
            unsubProdutos();
            unsubUnidades();
            unsubCategorias();
        };
    }, []);

    const produtosComNomes = useMemo(() => {
        return produtos.map(p => {
            if (p.tipoProduto === 'VENDA' && p.unidadeId) {
                return { ...p, unidadeNome: unidades.find(u => u.id === p.unidadeId)?.sigla };
            }
            if (p.tipoProduto === 'USO_INTERNO' && p.categoriaId) {
                return { ...p, categoriaNome: categorias.find(c => c.id === p.categoriaId)?.nome };
            }
            return p;
        });
    }, [produtos, unidades, categorias]);

    const handleEdit = (produto: Produto) => {
        setIsEditing(true);
        if (produto.tipoProduto === "VENDA") {
            setCurrentForm("VENDA");
            formVenda.reset(produto);
        } else if (produto.tipoProduto === "USO_INTERNO") {
            setCurrentForm("USO_INTERNO");
            formUsoInterno.reset(produto);
        }
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

    const resetForms = () => {
        formVenda.reset();
        formUsoInterno.reset();
        setIsEditing(false);
        setCurrentForm(null);
    };

    const onSubmit = async (values: ProdutoVenda | ProdutoUsoInterno) => {
        try {
            const { id, ...data } = values;
            if (isEditing && id) {
                await updateProduto(id, data);
                toast.success(`Produto "${data.nome}" atualizado com sucesso!`);
            } else {
                await addProduto(data);
                toast.success(`Produto "${data.nome}" adicionado com sucesso!`);
            }
            resetForms();
        } catch (error) {
            toast.error("Ocorreu um erro ao salvar o produto.");
        }
    };

    const columns: ColumnDef<Produto>[] = [
        { accessorKey: "nome", header: "Descrição" },
        { accessorKey: "tipoProduto", header: "Tipo", cell: ({ row }) => <Badge variant={row.original.tipoProduto === 'VENDA' ? 'default' : 'secondary'}>{row.original.tipoProduto === 'VENDA' ? 'Venda' : 'Uso Interno'}</Badge> },
        {
            id: "detalhes",
            header: "Detalhes",
            cell: ({ row }) => {
                const p = row.original;
                if (p.tipoProduto === "VENDA") return `Preço: R$ ${p.precoVenda.toFixed(2)} | Custo: R$ ${(p.custoUnitario || 0).toFixed(2)}`;
                if (p.tipoProduto === "USO_INTERNO") return `Custo: R$ ${p.custoUnitario.toFixed(2)} (${p.categoriaNome || 'N/A'})`;
                return null;
            },
        },
        { accessorKey: "quantidade", header: "Estoque" },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original;
                const createdAt = item.createdAt as Timestamp | undefined;
                const isEditable = role === 'ADMINISTRADOR' || (createdAt ? (new Date(Date.now() - 2 * 60 * 60 * 1000) < createdAt.toDate()) : false);

                return (
                    <div className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={!isEditable}>
                            <IconPencil className="h-4 w-4" />
                        </Button>
                        {role === 'ADMINISTRADOR' && (
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(item.id!)}>
                                <IconTrash className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            }
        },
    ];

    const formContent = (
      <div className="space-y-4">
          {!currentForm && !isEditing && (
            <Select onValueChange={(value) => setCurrentForm(value as FormType)}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo de produto para cadastrar" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="VENDA">Produto para Venda</SelectItem>
                    <SelectItem value="USO_INTERNO">Item de Uso Interno</SelectItem>
                </SelectContent>
            </Select>
          )}

          {currentForm === 'VENDA' && (
            <GenericForm schema={produtoVendaSchema} onSubmit={onSubmit} formId="venda-form" form={formVenda}>
                <div className="space-y-4">
                    <FormField name="nome" control={formVenda.control} render={({ field }) => (
                        <FormItem><FormLabel>Descrição do Produto</FormLabel><FormControl><Input placeholder="Ex: Picanha" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="unidadeId" control={formVenda.control} render={({ field }) => (
                        <FormItem><FormLabel>Unidade de Medida</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger></FormControl><SelectContent>{unidades.map(u => <SelectItem key={u.id} value={u.id!}>{u.nome} ({u.sigla})</SelectItem>)}</SelectContent></Select>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField name="precoVenda" control={formVenda.control} render={({ field }) => (
                        <FormItem><FormLabel>Preço de Venda</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="custoUnitario" control={formVenda.control} render={({ field }) => (
                        <FormItem><FormLabel>Custo Unitário (Preenchido na Compra)</FormLabel><FormControl><Input type="number" {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField name="sku" control={formVenda.control} render={({ field }) => (
                            <FormItem><FormLabel>Código/SKU (Opcional)</FormLabel><FormControl><Input placeholder="Código de barras" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name="ncm" control={formVenda.control} render={({ field }) => (
                            <FormItem><FormLabel>NCM (Opcional)</FormLabel><FormControl><Input placeholder="NCM do produto" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                </div>
            </GenericForm>
          )}

          {currentForm === 'USO_INTERNO' && (
            <GenericForm schema={produtoUsoInternoSchema} onSubmit={onSubmit} formId="uso-interno-form" form={formUsoInterno}>
                <div className="space-y-4">
                    <FormField name="nome" control={formUsoInterno.control} render={({ field }) => (
                       <FormItem><FormLabel>Descrição do Item</FormLabel><FormControl><Input placeholder="Ex: Faca, Bota" {...field} /></FormControl><FormMessage /></FormItem>
                   )} />
                    <FormField name="categoriaId" control={formUsoInterno.control} render={({ field }) => (
                       <FormItem><FormLabel>Categoria</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger></FormControl><SelectContent>{categorias.map(c => <SelectItem key={c.id} value={c.id!}>{c.nome}</SelectItem>)}</SelectContent></Select>
                       <FormMessage /></FormItem>
                    )} />
                    <FormField name="custoUnitario" control={formUsoInterno.control} render={({ field }) => (
                       <FormItem><FormLabel>Custo Unitário</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
            </GenericForm>
          )}

          {currentForm && (
            <div className="flex justify-end gap-2 pt-6">
                <Button type="button" variant="outline" onClick={resetForms}>Cancelar</Button>
                <Button type="submit" form={currentForm === 'VENDA' ? 'venda-form' : 'uso-interno-form'}>
                    {isEditing ? "Salvar Alterações" : "Adicionar Produto"}
                </Button>
            </div>
          )}
      </div>
    );

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Produto" : "Novo Produto"}
            formContent={formContent}
            tableTitle="Produtos Cadastrados"
            tableContent={<GenericTable columns={columns} data={produtosComNomes} />}
        />
    );
}
