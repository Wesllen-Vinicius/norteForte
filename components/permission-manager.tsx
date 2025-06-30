"use client";

import { z } from "zod";
import { IconEdit, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { roleSchema, modulosDePermissao } from "@/lib/schemas";
import { useState } from "react";

type RoleFormValues = z.infer<typeof roleSchema>;
type PermissoesState = RoleFormValues['permissoes'];

interface PermissionManagerProps {
    permissoes: PermissoesState;
    setPermissoes: (permissoes: PermissoesState) => void;
}

export function PermissionManager({ permissoes, setPermissoes }: PermissionManagerProps) {
    const [selectedModule, setSelectedModule] = useState("");

    const moduloOptions = Object.entries(modulosDePermissao)
        .filter(([key]) => !(permissoes && key in permissoes))
        .map(([key, label]) => ({ value: key, label }));

    const handleAddModule = () => {
        if (!selectedModule) return;
        setPermissoes({
            ...permissoes,
            [selectedModule]: { ler: true, criar: false, editar: false, inativar: false }
        });
        setSelectedModule("");
    };

    const handleRemoveModule = (moduleKey: string) => {
        const newPermissions = { ...permissoes };
        delete newPermissions[moduleKey];
        setPermissoes(newPermissions);
    };

    const handlePermissionChange = (moduleKey: string, action: string, isChecked: boolean) => {
        const currentModulePermissions = permissoes?.[moduleKey] ?? {
            ler: false, criar: false, editar: false, inativar: false,
        };
        setPermissoes({
            ...permissoes,
            [moduleKey]: { ...currentModulePermissions, [action]: isChecked },
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Gerenciar Permissões</h3>
                <p className="text-sm text-muted-foreground">Adicione módulos e defina as permissões para esta função.</p>
            </div>
            <div className="flex items-end gap-2">
                <div className="flex-grow">
                    <label className="text-sm font-medium">Módulo</label>
                    <Combobox options={moduloOptions} value={selectedModule} onChange={setSelectedModule} placeholder="Selecione um módulo..." searchPlaceholder="Buscar módulo..." />
                </div>
                <Button type="button" onClick={handleAddModule} disabled={!selectedModule}>
                    Adicionar
                </Button>
            </div>

            {permissoes && Object.keys(permissoes).length > 0 && (
                <div className="space-y-2">
                    {Object.entries(permissoes).map(([key, value]) => {
                       if (!value) return null;
                       const actions = Object.entries(value).filter(([, allowed]) => allowed).map(([action]) => action);
                       return (
                            // **NOVO CARD COMPACTO**
                            <div key={key} className="flex items-center justify-between rounded-lg border bg-muted/30 p-2 pl-4">
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-semibold">{modulosDePermissao[key as keyof typeof modulosDePermissao]}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {actions.length > 0 ? (
                                            actions.map(action => <Badge key={action} variant="secondary" className="capitalize">{action}</Badge>)
                                        ) : (
                                            <Badge variant="outline">Nenhuma permissão</Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <Popover>
                                        <PopoverTrigger asChild><Button variant="ghost" size="icon"><IconEdit className="h-4 w-4" /></Button></PopoverTrigger>
                                        <PopoverContent className="w-60">
                                            <div className="space-y-4 p-2">
                                                <h4 className="font-medium leading-none">Editar Permissões</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {['ler', 'criar', 'editar', 'inativar'].map(action => (
                                                         <div key={action} className="flex items-center space-x-2">
                                                            <Checkbox id={`${key}-${action}`} checked={value[action as keyof typeof value] || false} onCheckedChange={(checked) => handlePermissionChange(key, action, checked === true)} />
                                                            <label htmlFor={`${key}-${action}`} className="text-sm font-medium capitalize">{action}</label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleRemoveModule(key)}><IconX className="h-4 w-4" /></Button>
                                </div>
                            </div>
                       );
                    })}
                </div>
            )}
        </div>
    );
}
