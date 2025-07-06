"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GenericForm } from "@/components/generic-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateUserProfileData, uploadProfileImage, changeUserPassword, updateUserEmail } from "@/lib/services/user.services";
import { reauthenticateUser } from "@/lib/services/auth.services";
import { useState, useEffect, ChangeEvent, forwardRef } from "react";
import React from "react";
import { Separator } from "@/components/ui/separator";

const profileSchema = z.object({
  displayName: z.string().min(3, "O nome deve ter pelo menos 3 caracteres."),
  photoFile: z.instanceof(FileList).optional(),
  currentPassword: z.string().optional(),
  email: z.string().email("Por favor, insira um e-mail válido."),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "A senha atual é obrigatória."),
    newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres.").optional().or(z.literal('')),
    confirmPassword: z.string().optional().or(z.literal('')),
}).refine(data => {
    if (data.newPassword || data.confirmPassword) {
        return data.newPassword === data.confirmPassword;
    }
    return true;
}, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
});

const FileInput = forwardRef<HTMLInputElement, Omit<React.ComponentProps<typeof Input>, 'value'>>((props, ref) => {
    return <Input {...props} ref={ref} />;
});
FileInput.displayName = "FileInput";

export default function AccountPage() {
    const { user } = useAuthStore();
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [isPasswordVerified, setIsPasswordVerified] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const profileForm = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: { displayName: "", email: "" },
    });

    const passwordForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

    const emailWatcher = profileForm.watch('email');
    const needsPasswordForProfileUpdate = user?.email !== emailWatcher;

    useEffect(() => {
        if(user) {
            profileForm.reset({ displayName: user.displayName || "", email: user.email || "" });
            setPhotoPreview(user.photoURL ?? null);
        }
    }, [user, profileForm]);

    const handleProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
        if (!user) return;
        setIsSavingProfile(true);
        const toastId = toast.loading("Salvando perfil...");
        try {
            if (needsPasswordForProfileUpdate) {
                if (!values.currentPassword) {
                    toast.error("Senha atual necessária para alterar o e-mail.", { id: toastId });
                    setIsSavingProfile(false);
                    return;
                }
                await reauthenticateUser(values.currentPassword);
                await updateUserEmail(user.uid, values.email);
            }

            let newPhotoURL: string | null = user.photoURL;
            if (values.photoFile && values.photoFile.length > 0) {
                newPhotoURL = await uploadProfileImage(values.photoFile[0], user.uid);
            }

            await updateUserProfileData(user.uid, values.displayName, newPhotoURL);
            toast.success("Perfil atualizado com sucesso!", { id: toastId });
            profileForm.setValue('currentPassword', '');
        } catch (error: any) {
            const description = error.code === 'auth/wrong-password' ? 'Senha atual incorreta.' : error.message;
            toast.error("Erro ao atualizar perfil.", { id: toastId, description });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
        setIsSavingPassword(true);
        if (!isPasswordVerified) {
            try {
                await reauthenticateUser(values.currentPassword);
                setIsPasswordVerified(true);
                toast.success("Senha atual verificada. Agora você pode definir a nova senha.");
            } catch (error) {
                toast.error("Senha atual incorreta.");
            } finally {
                setIsSavingPassword(false);
            }
        } else {
            if (!values.newPassword) {
                toast.error("Por favor, digite a nova senha.");
                setIsSavingPassword(false);
                return;
            }
            const toastId = toast.loading("Alterando senha...");
            try {
                await changeUserPassword(values.newPassword);
                toast.success("Senha alterada com sucesso!", { id: toastId });
                passwordForm.reset();
                setIsPasswordVerified(false);
            } catch (error: any) {
                toast.error("Erro ao alterar senha.", { id: toastId, description: error.message });
            } finally {
                setIsSavingPassword(false);
            }
        }
    };

    const photoFile = profileForm.watch("photoFile");
    useEffect(() => {
        if (photoFile && photoFile.length > 0) {
            const newPreviewUrl = URL.createObjectURL(photoFile[0]);
            setPhotoPreview(newPreviewUrl);
            return () => URL.revokeObjectURL(newPreviewUrl);
        }
    }, [photoFile]);

    if (!user) return null;

    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Meu Perfil</CardTitle>
                        <CardDescription>Atualize seu nome, e-mail e foto de perfil.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <GenericForm schema={profileSchema} onSubmit={handleProfileSubmit} formId="profile-form" form={profileForm} className="space-y-4 flex flex-col h-full">
                            <div className="flex-grow space-y-4">
                                <FormField name="displayName" control={profileForm.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome de Exibição</FormLabel>
                                        <FormControl><Input placeholder="Seu nome" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField name="email" control={profileForm.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>E-mail</FormLabel>
                                        <FormControl><Input type="email" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField name="photoFile" control={profileForm.control} render={({ field: { onChange, ...field } }) => (
                                    <FormItem>
                                        <FormLabel>Foto de Perfil</FormLabel>
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12 border">
                                                <AvatarImage src={photoPreview ?? undefined} />
                                                <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <FormControl>
                                                <FileInput type="file" accept="image/*" onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.files)} {...field} />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                {needsPasswordForProfileUpdate && (
                                    <div className="animate-in fade-in-50">
                                        <FormField name="currentPassword" control={profileForm.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Confirme sua senha para alterar o e-mail</FormLabel>
                                                <FormControl><Input type="password" placeholder="Sua senha atual" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                )}
                            </div>
                            <Button type="submit" form="profile-form" className="w-full mt-auto" disabled={isSavingProfile}>
                                {isSavingProfile ? "Salvando..." : "Salvar Alterações"}
                            </Button>
                        </GenericForm>
                    </CardContent>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Segurança</CardTitle>
                        <CardDescription>Para sua segurança, confirme sua senha atual antes de definir uma nova.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <GenericForm schema={passwordSchema} onSubmit={handlePasswordSubmit} formId="password-form" form={passwordForm} className="space-y-4 flex flex-col h-full">
                            <div className="flex-grow space-y-4">
                                <FormField name="currentPassword" control={passwordForm.control} render={({ field }) => (
                                   <FormItem>
                                       <FormLabel>Senha Atual</FormLabel>
                                       <FormControl><Input type="password" {...field} disabled={isPasswordVerified} /></FormControl>
                                       <FormMessage />
                                   </FormItem>
                               )} />

                               {isPasswordVerified && (
                                   <div className="space-y-4 animate-in fade-in-50">
                                       <Separator />
                                       <FormField name="newPassword" control={passwordForm.control} render={({ field }) => (
                                           <FormItem>
                                               <FormLabel>Nova Senha</FormLabel>
                                               <FormControl><Input type="password" {...field} /></FormControl>
                                               <FormMessage />
                                           </FormItem>
                                       )} />
                                       <FormField name="confirmPassword" control={passwordForm.control} render={({ field }) => (
                                           <FormItem>
                                               <FormLabel>Confirmar Nova Senha</FormLabel>
                                               <FormControl><Input type="password" {...field} /></FormControl>
                                               <FormMessage />
                                           </FormItem>
                                       )} />
                                   </div>
                               )}
                            </div>
                            <Button type="submit" form="password-form" className="w-full mt-auto" variant={isPasswordVerified ? 'default' : 'secondary'} disabled={isSavingPassword}>
                                {isSavingPassword ? "Verificando..." : (isPasswordVerified ? "Alterar Senha" : "Verificar e Continuar")}
                            </Button>
                        </GenericForm>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
