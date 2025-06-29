"use client";
import { useState, useEffect, useCallback } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { IconPencil, IconTrash, IconLock } from "@tabler/icons-react";
import {
  fetchBancos,
  Banco,
} from "@/lib/services/bancos.service";
import { CrudLayout } from "@/components/crud-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { contaBancariaSchema, ContaBancaria } from "@/lib/schemas";
import {
  addContaBancaria,
  updateContaBancaria,
  setContaBancariaStatus,
} from "@/lib/services/contasBancarias.services";
import { GenericTable } from "@/components/generic-table";
import { useDataStore } from "@/store/data.store";
import { useAuthStore } from "@/store/auth.store";
import { z } from "zod";

import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { ColumnDef, Row } from "@tanstack/react-table";
import { DetailsSubRow } from "@/components/details-sub-row";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";


type FormValues = z.infer<typeof contaBancariaSchema>;

export default function ContasBancariasPage() {
  const { contasBancarias } = useDataStore();
  // Agora pegamos o isLoading diretamente do authStore
  const { user, role, isLoading: isAuthLoading } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [bancosList, setBancosList] = useState<Banco[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(contaBancariaSchema),
    defaultValues: {
      nomeConta: "",
      banco: "",
      agencia: "",
      conta: "",
      tipo: "Conta Corrente",
      saldoInicial: 0,
    },
  });

  useEffect(() => {
    fetchBancos().then(setBancosList).catch(console.error);
  }, []);

  const bancosOptions = bancosList
    .filter((b) => b.code && b.name)
    .map((b) => ({
      label: `${b.code} – ${b.name}`,
      value: `${b.code} – ${b.name}`,
    }));

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (!user) return toast.error("Usuário não autenticado.");

    const payload = {
      ...values,
      saldoInicial: values.saldoInicial || 0,
    };

    try {
      if (isEditing && values.id) {
        await updateContaBancaria(values.id, payload);
        toast.success("Conta atualizada!");
      } else {
        await addContaBancaria(payload, {
          uid: user.uid,
          nome: user.displayName || "N/A",
        });
        toast.success("Conta adicionada!");
      }
      form.reset({
        nomeConta: "",
        banco: "",
        agencia: "",
        conta: "",
        tipo: "Conta Corrente",
        saldoInicial: 0,
      });
      setIsEditing(false);
    } catch {
      toast.error("Erro ao salvar conta.");
    }
  };

  const handleEdit = (data: ContaBancaria) => {
    form.reset(data);
    setIsEditing(true);
    if(data.banco) form.setValue("banco", data.banco);
  };

  const handleInactivate = async (id: string | undefined) => {
    if(!id) return;
    if (!confirm("Tem certeza que deseja inativar esta conta?")) return;
    try {
      await setContaBancariaStatus(id, 'inativa');
      toast.success("Conta inativada!");
    } catch {
      toast.error("Erro ao inativar conta.");
    }
  };

  const renderSubComponent = useCallback(({ row }: { row: Row<ContaBancaria> }) => {
    const conta = row.original;
    const details = [
        { label: "Tipo de Conta", value: conta.tipo },
        { label: "Saldo Inicial", value: `R$ ${(conta.saldoInicial ?? 0).toFixed(2)}` },
    ];
    return <DetailsSubRow details={details} />;
  }, []);

  const columns: ColumnDef<ContaBancaria>[] = [
    { header: "Nome da Conta", accessorKey: "nomeConta" },
    { header: "Banco", accessorKey: "banco" },
    { header: "Agência", accessorKey: "agencia" },
    { header: "Conta", accessorKey: "conta" },
    {
      header: "Saldo Atual",
      accessorKey: "saldoAtual",
      cell: ({ row }) => `R$ ${(row.original.saldoAtual ?? 0).toFixed(2)}`,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const isEditable = role === 'ADMINISTRADOR';
        return (
            <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} disabled={!isEditable}>
                    <IconPencil className="h-4 w-4"/>
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleInactivate(row.original.id)} disabled={!isEditable}>
                    <IconTrash className="h-4 w-4" />
                </Button>
            </div>
        )
      },
    },
  ];

  const formContent = (
    isAuthLoading ? (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <div className="flex justify-end pt-4">
            <Skeleton className="h-10 w-32" />
        </div>
      </div>
    ) : (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} id="contabancaria-form">
          <fieldset disabled={role !== 'ADMINISTRADOR'} className="space-y-4 disabled:opacity-70 disabled:pointer-events-none">
              <FormField name="nomeConta" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nome da Conta</FormLabel><FormControl><Input placeholder="Ex: Conta Principal, Caixa da Loja" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField name="tipo" control={form.control} render={({ field }) => (
                  <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                          <SelectContent><SelectGroup>
                              <SelectItem value="Conta Corrente">Conta Corrente</SelectItem>
                              <SelectItem value="Conta Poupança">Conta Poupança</SelectItem>
                              <SelectItem value="Caixa">Caixa</SelectItem>
                          </SelectGroup></SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
              )} />
              <FormField name="banco" control={form.control} render={({ field }) => (
                  <FormItem>
                      <FormLabel>Banco</FormLabel>
                      <FormControl><Combobox options={bancosOptions} value={field.value ?? ""} onChange={field.onChange} placeholder="Selecione o banco..."/></FormControl>
                      <FormMessage />
                  </FormItem>
              )} />
              <div className="grid md:grid-cols-2 gap-4">
                  <FormField name="agencia" control={form.control} render={({ field }) => (<FormItem><FormLabel>Agência</FormLabel><FormControl><Input placeholder="Ex: 0001-2" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField name="conta" control={form.control} render={({ field }) => (<FormItem><FormLabel>Conta</FormLabel><FormControl><Input placeholder="Ex: 12345-6" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)}/>
              </div>
              <FormField name="saldoInicial" control={form.control} render={({ field }) => (
                  <FormItem>
                      <FormLabel>Saldo Inicial</FormLabel>
                      <FormControl><Input type="number" {...field} value={field.value ?? 0} disabled={isEditing} /></FormControl>
                      <FormMessage />
                  </FormItem>
              )} />
          </fieldset>

          <div className="flex justify-end gap-2 pt-4">
              {isEditing && (<Button type="button" variant="outline" onClick={() => { form.reset(); setIsEditing(false);}}>Cancelar</Button>)}
              <Button type="submit" form="contabancaria-form" disabled={role !== 'ADMINISTRADOR'}>{isEditing ? "Salvar Alterações" : "Adicionar Conta"}</Button>
          </div>

          {role !== 'ADMINISTRADOR' && !isAuthLoading && (
               <Alert variant="destructive" className="mt-6">
                  <IconLock className="h-4 w-4" />
                  <AlertTitle>Acesso Restrito</AlertTitle>
                  <AlertDescription>Apenas administradores podem gerenciar contas bancárias.</AlertDescription>
              </Alert>
          )}
        </form>
      </Form>
    )
  );

  return (
    <CrudLayout
      formTitle={isEditing ? "Editar Conta" : "Nova Conta Bancária"}
      formContent={formContent}
      tableTitle="Contas Cadastradas"
      tableContent={
        <GenericTable
          columns={columns}
          data={contasBancarias}
          filterPlaceholder="Buscar por nome da conta..."
          filterColumnId="nomeConta"
          renderSubComponent={renderSubComponent}
        />
      }
    />
  );
}
