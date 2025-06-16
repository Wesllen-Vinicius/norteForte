"use client"

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { GenericForm } from "@/components/generic-form"
import { CenteredLayout } from "@/components/centered-layout"
import { z } from "zod"
import { useForm } from "react-hook-form"


const cargosDisponiveis = [
  { id: "1", nome: "Gerente de Projetos" },
  { id: "2", nome: "Desenvolvedor Frontend" },
  { id: "3", nome: "Desenvolvedor Backend" },
  { id: "4", nome: "Designer UI/UX" },
  { id: "5", nome: "Analista de Qualidade" },
];

const funcionarioSchema = z.object({
  nome: z.string().min(1, { message: "O nome é obrigatório." }),
  email: z.string().email({ message: "E-mail inválido." }).optional().or(z.literal("")),
  celular: z.string().optional().or(z.literal("")),
  cargoId: z.string().min(1, { message: "Selecione um cargo." }),
});

type FuncionarioFormValues = z.infer<typeof funcionarioSchema>;

export default function CadastrarFuncionarioPage() {
  const form = useForm<FuncionarioFormValues>();

  const onSubmit = (values: FuncionarioFormValues) => {
    console.log("Dados do funcionário:", values);
    toast("Funcionário Cadastrado!", {
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        </pre>
      ),
    });
  };

  const defaultValues: FuncionarioFormValues = {
    nome: "",
    email: "",
    celular: "",
    cargoId: "",
  };

  return (
    <CenteredLayout>
      <h1 className="text-2xl font-bold mb-6">Cadastro de Funcionário</h1>
      <GenericForm
        schema={funcionarioSchema}
        onSubmit={onSubmit}
        defaultValues={defaultValues}
      >
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome completo do funcionário" {...field} />
              </FormControl>
              <FormDescription>
                Nome completo do funcionário.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input placeholder="email@exemplo.com" {...field} />
              </FormControl>
              <FormDescription>
                E-mail para contato (opcional).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="celular"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Celular</FormLabel>
              <FormControl>
                <Input placeholder="(XX) XXXXX-XXXX" {...field} />
              </FormControl>
              <FormDescription>
                Número de celular (opcional).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cargoId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cargo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cargo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {cargosDisponiveis.map((cargo) => (
                    <SelectItem key={cargo.id} value={cargo.id}>
                      {cargo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Cargo do funcionário na empresa.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </GenericForm>
    </CenteredLayout>
  );
}
