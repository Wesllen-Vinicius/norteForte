"use client"

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { IconPencil, IconTrash, IconLock } from "@tabler/icons-react";
import { toast } from "sonner";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Cargo, cargoSchema } from "@/lib/schemas";
import { addCargo, setCargoStatus, updateCargo } from "@/lib/services/cargos.services";
import { useAuthStore } from "@/store/auth.store";
import { useDataStore } from "@/store/data.store";

type CargoFormValues = z.infer<typeof cargoSchema>;

export default function CargosPage() {
  const cargos = useDataStore((state) => state.cargos);
  const { role } = useAuthStore();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const isReadOnly = role !== 'ADMINISTRADOR';

  const form = useForm<CargoFormValues>({
    resolver: zodResolver(cargoSchema),
    defaultValues: { id: "", nome: "" },
  });

  const handleEdit = (cargo: Cargo) => {
    if (isReadOnly) return;
    form.reset(cargo);
    setIsEditing(true);
  };

  const handleInactivate = async (id: string) => {
    if (!confirm("Tem certeza que deseja inativar este cargo?")) return;
    try {
      await setCargoStatus(id, 'inativo');
      toast.success("Cargo inativado com sucesso!");
    } catch {
      toast.error("Erro ao inativar o cargo.");
    }
  };

  const resetForm = () => {
    form.reset({ id: "", nome: "" });
    setIsEditing(false);
  }

  const onSubmit = async (values: CargoFormValues) => {
    try {
      if (isEditing && values.id) {
        await updateCargo(values.id, { nome: values.nome });
        toast.success(`Cargo "${values.nome}" atualizado com sucesso!`);
      } else {
        await addCargo({ nome: values.nome });
        toast.success(`Cargo "${values.nome}" adicionado com sucesso!`);
      }
      resetForm();
    } catch {
      toast.error("Ocorreu um erro ao salvar o cargo.");
    }
  };

  const columns: ColumnDef<Cargo>[] = [
    {
      accessorKey: "nome",
      header: "Nome do Cargo",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-right">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} disabled={isReadOnly}>
                    <IconPencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Editar Cargo</p></TooltipContent>
              </Tooltip>
              {!isReadOnly && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleInactivate(item.id!)}>
                        <IconTrash className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Inativar Cargo</p></TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        )
      }
    }
  ];

  const formContent = (
    <fieldset disabled={isReadOnly} className="disabled:opacity-70">
      <GenericForm
        schema={cargoSchema}
        onSubmit={onSubmit}
        formId="cargo-form"
        form={form}
      >
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Cargo</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Açougueiro, Gerente de Produção" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 mt-4">
            {isEditing && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          <Button type="submit" form="cargo-form">{isEditing ? "Salvar Alterações" : "Adicionar Cargo"}</Button>
        </div>
      </GenericForm>
       {isReadOnly && (
          <Alert variant="destructive" className="mt-6">
              <IconLock className="h-4 w-4" />
              <AlertTitle>Acesso Restrito</AlertTitle>
              <AlertDescription>
                  Apenas administradores podem gerenciar cargos.
              </AlertDescription>
          </Alert>
        )}
    </fieldset>
  );

  const tableContent = (
    <GenericTable
        columns={columns}
        data={cargos}
        filterPlaceholder="Filtrar por cargo..."
        filterColumnId="nome"
    />
  );

  return (
    <CrudLayout
      formTitle={isEditing ? "Editar Cargo" : "Novo Cargo"}
      formContent={formContent}
      tableTitle="Cargos Cadastrados"
      tableContent={tableContent}
    />
  );
}
