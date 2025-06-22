"use client";
import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  fetchBancos,
  fetchAgenciasBancoDoBrasil,
  Banco,
  Agencia,
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
  deleteContaBancaria,
} from "@/lib/services/contasBancarias.services";
import { GenericTable } from "@/components/generic-table";
import { useDataStore } from "@/store/data.store";
import { useAuthStore } from "@/store/auth.store";
import z from "zod";

import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";

type FormValues = z.infer<typeof contaBancariaSchema>;

export default function ContasBancariasPage() {
  const { contasBancarias } = useDataStore();
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [bancosList, setBancosList] = useState<Banco[]>([]);
  const [agenciasList, setAgenciasList] = useState<Agencia[]>([]);

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

  const onSelectBanco = (value: string) => {
    form.setValue("banco", value);
    const code = value.split(" – ")[0];
    const sel = bancosList.find((b) => b.code === code);
    if (!sel) {
      setAgenciasList([]);
      form.setValue("agencia", "");
      return;
    }
    fetchAgenciasBancoDoBrasil(sel.code)
      .then(setAgenciasList)
      .catch(() => setAgenciasList([]));
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) return toast.error("Usuário não autenticado.");

    const payload = {
      nomeConta: values.nomeConta,
      banco: values.banco,
      agencia: values.agencia,
      conta: values.conta,
      tipo: values.tipo,
      saldoInicial: values.saldoInicial,
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
      form.reset();
      setIsEditing(false);
      setAgenciasList([]);
    } catch {
      toast.error("Erro ao salvar conta.");
    }
  };

  const handleEdit = (data: ContaBancaria) => {
    form.reset(data);
    setIsEditing(true);
    onSelectBanco(data.banco);
    form.setValue("agencia", data.agencia);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Confirma exclusão?")) return;
    try {
      await deleteContaBancaria(id);
      toast.success("Conta deletada!");
    } catch {
      toast.error("Erro ao deletar.");
    }
  };

  const columns = [
    { header: "Nome", accessorKey: "nomeConta" },
    { header: "Banco", accessorKey: "banco" },
    { header: "Agência", accessorKey: "agencia" },
    { header: "Tipo", accessorKey: "tipo" },
    {
      header: "Saldo Atual",
      accessorKey: "saldoAtual",
      cell: ({ row }: any) => `R$ ${row.original.saldoAtual.toFixed(2)}`,
    },
    {
      header: "Ações",
      accessorKey: "actions",
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row.original)}
          >
            Editar
          </Button>
        </div>
      ),
    },
  ];

  const formContent = (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 max-w-lg"
          noValidate
        >
          <FormField
            name="nomeConta"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Conta</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Conta Principal, Caixa da Loja"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo Tipo usando seu Select Radix */}
          <FormField
            name="tipo"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(val) => field.onChange(val)}
                    value={field.value}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="Conta Corrente">
                          Conta Corrente
                        </SelectItem>
                        <SelectItem value="Conta Poupança">
                          Conta Poupança
                        </SelectItem>
                        <SelectItem value="Caixa">Caixa</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo Banco usando Combobox */}
          <FormField
            name="banco"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Banco</FormLabel>
                <FormControl>
                  <Combobox
                    options={bancosOptions}
                    value={field.value}
                    onChange={(val) => {
                      field.onChange(val);
                      onSelectBanco(val);
                    }}
                    placeholder="Selecione o banco..."
                    emptyMessage="Nenhum banco encontrado."
                    searchPlaceholder="Buscar banco..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              name="agencia"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agência</FormLabel>
                  <FormControl>
                    <Input
                      list="agencias"
                      placeholder="Ex: 0001-2"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="conta"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 12345-6" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            name="saldoInicial"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Saldo Inicial</FormLabel>
                <FormControl>
                  <Input type="number" {...field} disabled={isEditing} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setIsEditing(false);
                  setAgenciasList([]);
                }}
              >
                Cancelar
              </Button>
            )}
            <Button type="submit">
              {isEditing ? "Salvar Alterações" : "Adicionar Conta"}
            </Button>
          </div>
        </form>
      </Form>

      <datalist id="agencias">
        {agenciasList
          .filter((a) => a.branchCode != null)
          .map((a) => (
            <option
              key={a.branchCode}
              value={`${a.branchCode} – ${a.name || "Agência Sem Nome"}`}
            />
          ))}
      </datalist>
    </>
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
          globalFilter=""
          setGlobalFilter={() => {}}
        />
      }
    />
  );
}
