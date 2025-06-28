import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, QuerySnapshot, DocumentData } from "firebase/firestore";
import { updateProfile, updatePassword } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { SystemUser } from "@/lib/schemas";

// O schema que estava aqui foi removido.

export const setUserDoc = async (userData: Omit<SystemUser, 'password'>) => {
  const userDocRef = doc(db, "users", userData.uid);
  await setDoc(userDocRef, userData, { merge: true });
};

export const updateUserRole = async (uid: string, role: 'ADMINISTRADOR' | 'USUARIO') => {
  const userDocRef = doc(db, "users", uid);
  await updateDoc(userDocRef, { role });
};

export const subscribeToUsers = (callback: (users: SystemUser[]) => void) => {
  // Ajustado para filtrar apenas usuários ativos por padrão, se houver campo 'status'
  // const q = query(collection(db, "users"), where("status", "==", "ativo"));
  // Para ver todos os usuários (ativos e inativos) para a tela de gestão, removemos o filtro padrão aqui.
  // Se a intenção é mostrar apenas ativos no app, mas todos na gestão, a lógica de filtro deve ser no componente.
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

// Nova função para inativar um usuário (soft delete)
export const setUserStatus = async (uid: string, status: 'ativo' | 'inativo') => {
    const userDocRef = doc(db, "users", uid);
    await updateDoc(userDocRef, { status });
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
