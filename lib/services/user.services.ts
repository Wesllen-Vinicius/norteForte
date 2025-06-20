// lib/services/users.services.ts
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, QuerySnapshot, DocumentData } from "firebase/firestore";
import { z } from "zod";

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
