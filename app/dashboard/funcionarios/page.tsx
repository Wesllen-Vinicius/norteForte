"use client"

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { Timestamp } from "firebase/firestore";

import { CrudLayout } from "@/components/crud-layout";
import { GenericForm } from "@/components/generic-form";
import { GenericTable } from "@/components/generic-table";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MaskedInput } from "@/components/ui/masked-input";
import { Funcionario, funcionarioSchema, addFuncionario, subscribeToFuncionarios, updateFuncionario, deleteFuncionario } from "@/lib/services/funcionarios.services";
import { Cargo, subscribeToCargos } from "@/lib/services/cargos.services";
import { useAuthStore } from "@/store/auth.store";


type FuncionarioFormValues = z.infer<typeof funcionarioSchema>;

export default function FuncionariosPage() {
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [cargos, setCargos] = useState<Cargo[]>([]);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const { role } = useAuthStore();

    const form = useForm<FuncionarioFormValues>({
        resolver: zodResolver(funcionarioSchema),
        defaultValues: { razaoSocial: "", cnpj: "", nomeCompleto: "", cpf: "", contato: "", cargoId: "", banco: "", agencia: "", conta: "" },
    });

    useEffect(() => {
        const unsubFuncionarios = subscribeToFuncionarios(setFuncionarios);
        const unsubCargos = subscribeToCargos(setCargos);
        return () => {
            unsubFuncionarios();
            unsubCargos();
        };
    }, []);

    const funcionariosComCargo = useMemo(() => {
        return funcionarios.map(f => ({
            ...f,
            cargoNome: cargos.find(c => c.id === f.cargoId)?.nome || "N/A",
        }));
    }, [funcionarios, cargos]);

    const handleEdit = (funcionario: Funcionario) => {
        form.reset(funcionario);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja remover este prestador?")) return;
        try {
            await deleteFuncionario(id);
            toast.success("Prestador removido com sucesso!");
        } catch (error) {
            toast.error("Erro ao remover o prestador.");
        }
    };

    const resetForm = () => {
        form.reset({ id: "", razaoSocial: "", cnpj: "", nomeCompleto: "", cpf: "", contato: "", cargoId: "", banco: "", agencia: "", conta: "" });
        setIsEditing(false);
    };

    const onSubmit = async (values: FuncionarioFormValues) => {
        try {
            const { id, ...data } = values;
            if (isEditing && id) {
                await updateFuncionario(id, data);
                toast.success("Dados atualizados com sucesso!");
            } else {
                await addFuncionario(data);
                toast.success(`Prestador "${data.nomeCompleto}" cadastrado com sucesso!`);
            }
            resetForm();
        } catch (error: any) {
            toast.error("Ocorreu um erro", { description: error.message });
        }
    };

    const columns: ColumnDef<Funcionario>[] = [
        { accessorKey: "nomeCompleto", header: "Nome" },
        { accessorKey: "razaoSocial", header: "Razão Social" },
        { accessorKey: "cargoNome", header: "Cargo" },
        { accessorKey: "contato", header: "Contato" },
        {
            id: "actions",
            cell: ({ row }) => {
                const prestador = row.original;
                const createdAt = prestador.createdAt as Timestamp | undefined;
                const isEditable = role === 'ADMINISTRADOR' || (createdAt ? (new Date(Date.now() - 2 * 60 * 60 * 1000) < createdAt.toDate()) : false);

                return (
                    <div className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(prestador)} disabled={!isEditable}>
                            <IconPencil className="h-4 w-4" />
                        </Button>
                        {role === 'ADMINISTRADOR' && (
                           <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(prestador.id!)}>
                               <IconTrash className="h-4 w-4" />
                           </Button>
                        )}
                    </div>
                );
            }
        },
    ];

    const formContent = (
        <GenericForm schema={funcionarioSchema} onSubmit={onSubmit} formId="funcionario-form" form={form}>
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium">Dados da Empresa (MEI)</h3>
                    <Separator className="mt-2" />
                    <div className="space-y-4 mt-4">
                        <FormField name="razaoSocial" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Razão Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name="cnpj" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>CNPJ</FormLabel>
                                <FormControl>
                                    <MaskedInput mask="99.999.999/9999-99" placeholder="00.000.000/0000-00" {...field} />
                                </FormControl>
                            <FormMessage /></FormItem>
                        )} />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium">Dados Pessoais</h3>
                    <Separator className="mt-2" />
                    <div className="space-y-4 mt-4">
                         <FormField name="nomeCompleto" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField name="cpf" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>CPF</FormLabel>
                                    <FormControl>
                                        <MaskedInput mask="999.999.999-99" placeholder="000.000.000-00" {...field} />
                                    </FormControl>
                                <FormMessage /></FormItem>
                            )} />
                             <FormField name="contato" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Telefone de Contato</FormLabel>
                                    <FormControl>
                                        <MaskedInput mask="(99) 99999-9999" placeholder="(00) 00000-0000" {...field} />
                                    </FormControl>
                                <FormMessage /></FormItem>
                            )} />
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium">Dados Internos</h3>
                    <Separator className="mt-2" />
                    <div className="space-y-4 mt-4">
                        <FormField name="cargoId" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Cargo/Função</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione um cargo" /></SelectTrigger></FormControl><SelectContent>{cargos.map(c => <SelectItem key={c.id} value={c.id!}>{c.nome}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium">Dados de Pagamento (Conta PJ)</h3>
                    <Separator className="mt-2" />
                    <div className="space-y-4 mt-4">
                        <div className="grid md:grid-cols-3 gap-4">
                             <FormField name="banco" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Banco</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField name="agencia" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Agência</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField name="conta" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Conta</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-8">
                {isEditing && (<Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>)}
                <Button type="submit" form="funcionario-form">{isEditing ? "Salvar Alterações" : "Cadastrar Prestador"}</Button>
            </div>
        </GenericForm>
    );

    const tableContent = <GenericTable columns={columns} data={funcionariosComCargo} />;

    return (
        <CrudLayout
            formTitle={isEditing ? "Editar Prestador" : "Novo Prestador de Serviço"}
            formContent={formContent}
            tableTitle="Prestadores Cadastrados"
            tableContent={tableContent}
        />
    );
}
