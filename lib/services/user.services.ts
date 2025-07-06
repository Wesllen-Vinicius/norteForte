// lib/services/user.services.ts
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, QuerySnapshot, DocumentData, query, where } from "firebase/firestore";
import { updateProfile, updatePassword, updateEmail } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { SystemUser } from "@/lib/schemas";
import { reauthenticateUser } from "@/lib/services/auth.services";


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
      users.push({
        ...doc.data(),
        uid: doc.id,
      } as SystemUser);
    });
    callback(users);
  });
};

export const subscribeToUsersByStatus = (status: 'ativo' | 'inativo', callback: (users: SystemUser[]) => void) => {
  const q = query(collection(db, "users"), where("status", "==", status));
  return onSnapshot(q, (querySnapshot) => {
    const users: SystemUser[] = [];
    querySnapshot.forEach((doc) => {
      users.push({ ...doc.data(), uid: doc.id } as SystemUser);
    });
    callback(users);
  });
};

export const deleteUserDoc = async (uid: string) => {
  const userDocRef = doc(db, "users", uid);
  await deleteDoc(userDocRef);
};

export const setUserStatus = async (uid: string, status: 'ativo' | 'inativo') => {
    const userDocRef = doc(db, "users", uid);
    await updateDoc(userDocRef, { status });
};

export const updateUserProfileData = async (uid: string, displayName: string, photoURL: string | null) => {
    const user = auth.currentUser;
    if (!user || user.uid !== uid) throw new Error("Operação não permitida.");

    await updateProfile(user, { displayName, photoURL });
    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, { displayName, photoURL });
};

export const updateUserEmail = async (uid: string, newEmail: string) => {
    const user = auth.currentUser;
    if (!user || user.uid !== uid) throw new Error("Operação não permitida.");

    await updateEmail(user, newEmail);
    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, { email: newEmail });
}

export const changeUserPassword = async (newPassword: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");
    await updatePassword(user, newPassword);
};

export const uploadProfileImage = async (file: File, uid: string): Promise<string> => {
    const storage = getStorage();
    const storageRef = ref(storage, `profile_images/${uid}/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};
