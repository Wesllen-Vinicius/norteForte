"use client"

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { z } from "zod";
import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Funcionario, funcionarioSchema, addFuncionario, subscribeToFuncionarios, updateFuncionario, deleteFuncionario } from "@/lib/services/funcionarios.services";
import { Cargo, subscribeToCargos } from "@/lib/services/cargos.services";

type FuncionarioFormValues = z.infer<typeof funcionarioSchema>;

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const form = useForm<FuncionarioFormValues>({
    resolver: zodResolver(funcionarioSchema),
    defaultValues: { id: "", nome: "", email: "", celular: "", cargoId: "" },
  });

  useEffect(() => {
    const unsubscribeFuncionarios = subscribeToFuncionarios(setFuncionarios);
    const unsubscribeCargos = subscribeToCargos(setCargos);
    return () => {
      unsubscribeFuncionarios();
      unsubscribeCargos();
    };
  }, []);

  const handleEdit = (funcionario: Funcionario) => {
    form.reset(funcionario);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Tem certeza que deseja remover este funcionário?")) return;
    try {
      await deleteFuncionario(id);
      toast.success("Funcionário removido com sucesso!");
    } catch (error) {
      toast.error("Erro ao remover o funcionário.");
    }
  };

  const resetForm = () => {
    form.reset({ id: "", nome: "", email: "", celular: "", cargoId: "" });
    setIsEditing(false);
  };

  const onSubmit = async (values: FuncionarioFormValues) => {
    try {
      const { id, ...data } = values;
      if (isEditing && id) {
        await updateFuncionario(id, data);
        toast.success(`Dados de "${data.nome}" atualizados com sucesso!`);
      } else {
        await addFuncionario(data);
        toast.success(`Funcionário "${data.nome}" cadastrado com sucesso!`);
      }
      resetForm();
    } catch (error) {
      toast.error("Ocorreu um erro ao salvar o funcionário.");
    }
  };

  const cargoMap = useMemo(() => {
    return cargos.reduce((acc, cargo) => {
      if (cargo.id) acc[cargo.id] = cargo.nome;
      return acc;
    }, {} as Record<string, string>);
  }, [cargos]);

  const columns: ColumnDef<Funcionario>[] = [
    { accessorKey: "nome", header: "Nome" },
    { accessorKey: "email", header: "E-mail" },
    { accessorKey: "cargoId", header: "Cargo", cell: ({ row }) => cargoMap[row.original.cargoId] || "N/A" },
    {
      id: "actions",
      cell: ({ row }) => {
        const funcionario = row.original;
        return (
          <div className="text-right">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(funcionario)}><IconPencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(funcionario.id!)}><IconTrash className="h-4 w-4" /></Button>
          </div>
        );
      },
    },
  ];

  const formContent = (
    <GenericForm schema={funcionarioSchema} onSubmit={onSubmit} formId="funcionario-form" form={form}>
      <div className="space-y-4">
        <FormField name="nome" control={form.control} render={({ field }) => (
          <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="Nome completo" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid md:grid-cols-2 gap-4">
          <FormField name="email" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input placeholder="email@exemplo.com" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField name="celular" control={form.control} render={({ field }) => (
            <FormItem><FormLabel>Celular</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField name="cargoId" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Cargo</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Selecione um cargo" /></SelectTrigger></FormControl>
              <SelectContent>{cargos.map((cargo) => (<SelectItem key={cargo.id} value={cargo.id!}>{cargo.nome}</SelectItem>))}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <div className="flex justify-end gap-2 pt-6">
        {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
        <Button type="submit" form="funcionario-form">{isEditing ? "Salvar Alterações" : "Cadastrar Funcionário"}</Button>
      </div>
    </GenericForm>
  );

  const tableContent = <GenericTable columns={columns} data={funcionarios} />;

  return (
    <CrudLayout
      formTitle={isEditing ? "Editar Funcionário" : "Novo Funcionário"}
      formContent={formContent}
      tableTitle="Funcionários Cadastrados"
      tableContent={tableContent}
    />
  );
}
