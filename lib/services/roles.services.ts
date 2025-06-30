// lib/services/roles.services.ts
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    QuerySnapshot,
    DocumentData
} from "firebase/firestore";
import { Role } from "@/lib/schemas"; // <- Importa do schema central

export const addRole = (data: Omit<Role, 'id'>) => {
    const dataWithTimestamp = { ...data, createdAt: serverTimestamp() };
    return addDoc(collection(db, "roles"), dataWithTimestamp);
};

export const updateRole = (id: string, data: Partial<Omit<Role, 'id'>>) => {
    const roleDoc = doc(db, "roles", id);
    return updateDoc(roleDoc, data);
};

export const deleteRole = (id: string) => {
    const roleDoc = doc(db, "roles", id);
    return deleteDoc(roleDoc);
};

export const subscribeToRoles = (callback: (roles: Role[]) => void) => {
    return onSnapshot(collection(db, "roles"), (snapshot: QuerySnapshot<DocumentData>) => {
        const roles: Role[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Role));
        callback(roles);
    });
};
