// app/dashboard/cargos/page.tsx
"use client"

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { CenteredLayout } from "@/components/centered-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { addCargo, subscribeToCargos, Cargo, deleteCargo, updateCargo } from "@/lib/services/cargos.services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const cargoSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(3, { message: "O nome do cargo deve ter pelo menos 3 caracteres." }),
});

type CargoFormValues = z.infer<typeof cargoSchema>;

export default function CargosPage() {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const form = useForm<CargoFormValues>({
    resolver: zodResolver(cargoSchema),
    defaultValues: { id: "", nome: "" },
  });

  useEffect(() => {
    const unsubscribe = subscribeToCargos(setCargos);
    return () => unsubscribe();
  }, []);

  const handleEdit = (cargo: Cargo) => {
    form.reset(cargo);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Tem certeza que deseja remover este cargo?")) return;
    try {
      await deleteCargo(id);
      toast.success("Cargo removido com sucesso!");
    } catch (error) {
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
    } catch (error) {
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
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => {
        const cargo = row.original;
        return (
          <div className="text-right">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(cargo)}>
              <IconPencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(cargo.id!)}>
              <IconTrash className="h-4 w-4" />
            </Button>
          </div>
        )
      }
    }
  ]

  return (
    <CenteredLayout>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Editar Cargo" : "Novo Cargo"}</CardTitle>
          </CardHeader>
          <CardContent>
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
                      Cancelar Edição
                    </Button>
                  )}
                <Button type="submit" form="cargo-form">{isEditing ? "Salvar Alterações" : "Adicionar Cargo"}</Button>
              </div>
            </GenericForm>
          </CardContent>
        </Card>

        <Card>
           <CardHeader>
            <CardTitle>Cargos Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <GenericTable columns={columns} data={cargos} />
          </CardContent>
        </Card>
      </div>
    </CenteredLayout>
  );
}
