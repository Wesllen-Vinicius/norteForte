"use client"

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { IconPencil, IconTrash, IconAlertTriangle } from "@tabler/icons-react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import Link from "next/link";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
    Produto,
    produtoVendaSchema,
    produtoUsoInternoSchema,
    produtoMateriaPrimaSchema,
    ProdutoVenda,
    ProdutoUsoInterno,
    ProdutoMateriaPrima
} from "@/lib/schemas";
import { addProduto, updateProduto, setProdutoStatus } from "@/lib/services/produtos.services";
import { useAuthStore } from "@/store/auth.store";
import { useDataStore } from "@/store/data.store";

type FormType = "VENDA" | "USO_INTERNO" | "MATERIA_PRIMA";

export default function ProdutosPage() {
    const { produtos, unidades, categorias } = useDataStore();
    const { role } = useAuthStore();

    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [currentForm, setCurrentForm] = useState<FormType | null>(null);

    const formVenda = useForm<ProdutoVenda>({
        resolver: zodResolver(produtoVendaSchema),
        defaultValues: { tipoProduto: "VENDA", nome: "", unidadeId: "", precoVenda: 0, custoUnitario: 0, sku: "", ncm: "" },
    });

    const formUsoInterno = useForm<ProdutoUsoInterno>({
        resolver: zodResolver(produtoUsoInternoSchema),
        defaultValues: { tipoProduto: "USO_INTERNO", nome: "", categoriaId: "", custoUnitario: 0 },
    });

    const formMateriaPrima = useForm<ProdutoMateriaPrima>({
        resolver: zodResolver(produtoMateriaPrimaSchema),
        defaultValues: { tipoProduto: "MATERIA_PRIMA", nome: "", unidadeId: "", custoUnitario: 0 },
    });

    const dependencias = useMemo(() => ({
        venda: !unidades || unidades.length === 0,
        usoInterno: !categorias || categorias.length === 0,
        materiaPrima: !unidades || unidades.length === 0,
    }), [unidades, categorias]);

    const produtosComNomes = useMemo(() => {
        return produtos.map(p => {
            if (p.tipoProduto === 'VENDA' && p.unidadeId) {
                return { ...p, unidadeNome: unidades.find(u => u.id === p.unidadeId)?.sigla };
            }
            if (p.tipoProduto === 'USO_INTERNO' && p.categoriaId) {
                return { ...p, categoriaNome: categorias.find(c => c.id === p.categoriaId)?.nome };
            }
             if (p.tipoProduto === 'MATERIA_PRIMA' && p.unidadeId) {
                return { ...p, unidadeNome: unidades.find(u => u.id === p.unidadeId)?.sigla };
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
        } else if (produto.tipoProduto === "MATERIA_PRIMA") {
            setCurrentForm("MATERIA_PRIMA");
            formMateriaPrima.reset(produto);
        }
    };

    const handleInactivate = async (id: string) => {
        if (!confirm("Tem certeza que deseja inativar este produto?")) return;
        try {
            await setProdutoStatus(id, 'inativo');
            toast.success("Produto inativado com sucesso!");
        } catch (error) {
            toast.error("Erro ao inativar o produto.");
        }
    };

    const resetForms = () => {
        formVenda.reset({ tipoProduto: "VENDA", nome: "", unidadeId: "", precoVenda: 0, custoUnitario: 0, sku: "", ncm: "" });
        formUsoInterno.reset({ tipoProduto: "USO_INTERNO", nome: "", categoriaId: "", custoUnitario: 0 });
        formMateriaPrima.reset({ tipoProduto: "MATERIA_PRIMA", nome: "", unidadeId: "", custoUnitario: 0 });
        setIsEditing(false);
        setCurrentForm(null);
    };

    const onSubmit = async (values: Produto) => {
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
        {
            accessorKey: "tipoProduto",
            header: "Tipo",
            cell: ({ row }) => {
                const tipo = row.original.tipoProduto;
                const variant = tipo === 'VENDA' ? 'default' : tipo === 'USO_INTERNO' ? 'secondary' : 'outline';
                const text = tipo === 'VENDA' ? 'Venda' : tipo === 'USO_INTERNO' ? 'Uso Interno' : 'Matéria-Prima';
                return <Badge variant={variant}>{text}</Badge>
            }
        },
        {
            id: "detalhes",
            header: "Detalhes",
            cell: ({ row }) => {
                const p = row.original;
                if (p.tipoProduto === "VENDA") return `Preço: R$ ${p.precoVenda.toFixed(2)} | Custo: R$ ${(p.custoUnitario || 0).toFixed(2)}`;
                if (p.tipoProduto === "USO_INTERNO" || p.tipoProduto === "MATERIA_PRIMA") return `Custo: R$ ${p.custoUnitario.toFixed(2)}`;
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
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleInactivate(item.id!)}>
                                <IconTrash className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            }
        },
    ];

    const renderDependencyAlert = (type: FormType) => {
        const depMap = {
            VENDA: { link: "/dashboard/unidades", name: "Unidades de Medida"},
            USO_INTERNO: { link: "/dashboard/categorias", name: "Categorias"},
            MATERIA_PRIMA: { link: "/dashboard/unidades", name: "Unidades de Medida"},
        }
        return (
            <Alert variant="destructive" className="mt-4">
                <IconAlertTriangle className="h-4 w-4" />
                <AlertTitle>Cadastro de pré-requisito necessário</AlertTitle>
                <AlertDescription>
                    Para cadastrar este tipo de item, você precisa primeiro cadastrar:
                    <ul className="list-disc pl-5 mt-2">
                        <li>
                            <Button variant="link" asChild className="p-0 h-auto font-bold">
                                <Link href={depMap[type].link}>
                                    {depMap[type].name}
                                </Link>
                            </Button>
                        </li>
                    </ul>
                </AlertDescription>
            </Alert>
        )
    };

    const formContent = (
      <div className="space-y-4">
          {!currentForm && !isEditing && (
            <Select onValueChange={(value) => setCurrentForm(value as FormType)}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo de produto para cadastrar" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="MATERIA_PRIMA" disabled={dependencias.materiaPrima}>Matéria-Prima</SelectItem>
                    <SelectItem value="VENDA" disabled={dependencias.venda}>Produto para Venda</SelectItem>
                    <SelectItem value="USO_INTERNO" disabled={dependencias.usoInterno}>Item de Uso Interno</SelectItem>
                </SelectContent>
            </Select>
          )}

          {currentForm === 'VENDA' && dependencias.venda && !isEditing && renderDependencyAlert('VENDA')}
          {currentForm === 'USO_INTERNO' && dependencias.usoInterno && !isEditing && renderDependencyAlert('USO_INTERNO')}
          {currentForm === 'MATERIA_PRIMA' && dependencias.materiaPrima && !isEditing && renderDependencyAlert('MATERIA_PRIMA')}

          {(currentForm === 'MATERIA_PRIMA' && (!dependencias.materiaPrima || isEditing)) && (
             <GenericForm schema={produtoMateriaPrimaSchema} onSubmit={onSubmit} formId="materia-prima-form" form={formMateriaPrima}>
                <div className="space-y-4">
                    <FormField name="nome" control={formMateriaPrima.control} render={({ field }) => (
                       <FormItem><FormLabel>Descrição da Matéria-Prima</FormLabel><FormControl><Input placeholder="Ex: Animal Vivo, Embalagem" {...field} /></FormControl><FormMessage /></FormItem>
                   )} />
                    <FormField name="unidadeId" control={formMateriaPrima.control} render={({ field }) => (
                       <FormItem><FormLabel>Unidade de Medida</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger></FormControl><SelectContent>{unidades.map(u => <SelectItem key={u.id} value={u.id!}>{u.nome} ({u.sigla})</SelectItem>)}</SelectContent></Select>
                       <FormMessage /></FormItem>
                    )} />
                    <FormField name="custoUnitario" control={formMateriaPrima.control} render={({ field }) => (
                       <FormItem><FormLabel>Custo Unitário</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
            </GenericForm>
          )}

          {(currentForm === 'VENDA' && (!dependencias.venda || isEditing)) && (
            <GenericForm schema={produtoVendaSchema} onSubmit={onSubmit} formId="venda-form" form={formVenda}>
                <div className="space-y-4">
                    {/* Campos do produto para venda... */}
                </div>
            </GenericForm>
          )}

          {(currentForm === 'USO_INTERNO' && (!dependencias.usoInterno || isEditing)) && (
            <GenericForm schema={produtoUsoInternoSchema} onSubmit={onSubmit} formId="uso-interno-form" form={formUsoInterno}>
                <div className="space-y-4">
                    {/* Campos do item de uso interno... */}
                </div>
            </GenericForm>
          )}

          {currentForm && (
            <div className="flex justify-end gap-2 pt-6">
                <Button type="button" variant="outline" onClick={resetForms}>Cancelar</Button>
                <Button type="submit" form={`${currentForm.toLowerCase()}-form`}>
                    {isEditing ? "Salvar Alterações" : "Adicionar Produto"}
                </Button>
            </div>
          )}
      </div>
    );

    const tableContent = (
        <GenericTable
            columns={columns}
            data={produtosComNomes}
            filterPlaceholder="Filtrar por descrição..."
            filterColumnId="nome"
        />
    );

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Produto" : "Novo Produto"}
            formContent={formContent}
            tableTitle="Produtos Cadastrados"
            tableContent={tableContent}
        />
    );
}
