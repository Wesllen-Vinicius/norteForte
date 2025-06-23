"use client"

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addCargo, Cargo, deleteCargo, updateCargo, cargoSchema } from "@/lib/services/cargos.services";
import { useAuthStore } from "@/store/auth.store";
import { useDataStore } from "@/store/data.store";

type CargoFormValues = z.infer<typeof cargoSchema>;

export default function CargosPage() {
  const cargos = useDataStore((state) => state.cargos);
  const { role } = useAuthStore();
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const form = useForm<CargoFormValues>({
    resolver: zodResolver(cargoSchema),
    defaultValues: { id: "", nome: "" },
  });

  const handleEdit = (cargo: Cargo) => {
    form.reset(cargo);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Tem certeza que deseja remover este cargo?")) return;
    try {
      await deleteCargo(id);
      toast.success("Cargo removido com sucesso!");
    } catch (_error) {
      toast.error("Erro ao remover o cargo.");
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
    } catch (_error) {
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
        )
      }
    }
  ];

  const formContent = (
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
              <Input placeholder="Ex: Açougueiro, Gerente" {...field} />
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
