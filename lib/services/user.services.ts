// lib/services/user.services.ts
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, QuerySnapshot, DocumentData } from "firebase/firestore";
import { updateProfile, updatePassword } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { z } from "zod";

// --- Funções de Gerenciamento de Documentos de Usuário (Firestore) ---

export const userSchema = z.object({
  uid: z.string(),
  displayName: z.string().min(1, "O nome de exibição é obrigatório."),
  email: z.string().email(),
  role: z.enum(['ADMINISTRADOR', 'USUARIO']),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres.").optional().or(z.literal('')),
});

export type SystemUser = z.infer<typeof userSchema>;

export const setUserDoc = async (userData: Omit<SystemUser, 'password'>) => {
  const userDocRef = doc(db, "users", userData.uid);
  await setDoc(userDocRef, userData, { merge: true });
};

export const updateUserRole = async (uid: string, role: 'ADMINISTRADOR' | 'USUARIO') => {
  const userDocRef = doc(db, "users", uid);
  await updateDoc(userDocRef, { role });
};

export const subscribeToUsers = (callback: (users: SystemUser[]) => void) => {
  return onSnapshot(collection(db, "users"), (querySnapshot: QuerySnapshot<DocumentData>) => {
    const users: SystemUser[] = [];
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as SystemUser);
    });
    callback(users);
  });
};

export const deleteUserDoc = async (uid: string) => {
  const userDocRef = doc(db, "users", uid);
  await deleteDoc(userDocRef);
};


// --- NOVAS FUNÇÕES DE GERENCIAMENTO DE PERFIL (Auth, Storage) ---

/**
 * Atualiza o nome de exibição e a foto do usuário autenticado.
 * @param displayName - O novo nome de exibição.
 * @param photoURL - A nova URL da foto.
 */
export const updateUserProfile = async (displayName: string, photoURL: string | null) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");

    // Atualiza o perfil no Firebase Auth
    await updateProfile(user, { displayName, photoURL });

    // Atualiza também o documento no Firestore para consistência
    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, { displayName, photoURL });
};

/**
 * Altera a senha do usuário autenticado.
 * @param newPassword - A nova senha.
 */
export const changeUserPassword = async (newPassword: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");

    await updatePassword(user, newPassword);
};

/**
 * Faz o upload de uma imagem de perfil para o Firebase Storage.
 * @param file - O arquivo de imagem a ser enviado.
 * @param uid - O ID do usuário para nomear a pasta.
 * @returns A URL de download da imagem.
 */
export const uploadProfileImage = async (file: File, uid: string): Promise<string> => {
    const storage = getStorage();
    const storageRef = ref(storage, `profile_images/${uid}/${file.name}`);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
};
