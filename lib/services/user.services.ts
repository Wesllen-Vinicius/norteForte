import { auth } from "@/lib/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile, updatePassword, User } from "firebase/auth";
import { useAuthStore } from "@/store/auth.store";

const storage = getStorage();

// Função para fazer upload da imagem de perfil
export const uploadProfileImage = async (file: File, userId: string): Promise<string> => {
    if (!file) throw new Error("Nenhum arquivo selecionado.");

    const fileRef = ref(storage, `profileImages/${userId}/${file.name}`);
    const snapshot = await uploadBytes(fileRef, file);
    const photoURL = await getDownloadURL(snapshot.ref);
    return photoURL;
};

// Função para atualizar o nome e a foto do usuário
// AQUI ESTÁ A CORREÇÃO: aceitando 'string | null | undefined'
export const updateUserProfile = async (displayName: string, photoURL?: string | null) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");

    // O photoURL pode ser nulo se o usuário não tiver foto
    await updateProfile(user, { displayName, photoURL: photoURL ?? user.photoURL });

    // Força a atualização do estado global do Zustand
    // É necessário recarregar o usuário para pegar os dados atualizados do Firebase Auth
    await user.reload();
    const updatedUser = auth.currentUser;
    useAuthStore.getState().setUser(updatedUser as User);
};

// Função para alterar a senha
export const changeUserPassword = async (newPassword: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");

    await updatePassword(user, newPassword);
}
