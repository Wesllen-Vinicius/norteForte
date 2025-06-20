import { auth } from "@/lib/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile, updatePassword, User } from "firebase/auth";
import { useAuthStore } from "@/store/auth.store";

const storage = getStorage();

export const uploadProfileImage = async (file: File, userId: string): Promise<string> => {
    if (!file) throw new Error("Nenhum arquivo selecionado.");

    const fileRef = ref(storage, `profileImages/${userId}/${file.name}`);
    const snapshot = await uploadBytes(fileRef, file);
    const photoURL = await getDownloadURL(snapshot.ref);
    return photoURL;
};

export const updateUserProfile = async (displayName: string, photoURL?: string | null) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");

    await updateProfile(user, { displayName, photoURL: photoURL ?? user.photoURL });

    await user.reload();
    const updatedUser = auth.currentUser;
    useAuthStore.getState().setUser(updatedUser as User);
};

export const changeUserPassword = async (newPassword: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");

    await updatePassword(user, newPassword);
};
