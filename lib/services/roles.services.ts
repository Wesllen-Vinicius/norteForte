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
    DocumentData,
    query,
    where
} from "firebase/firestore";
import { Role } from "@/lib/schemas";

export const addRole = (data: Omit<Role, 'id' | 'createdAt' | 'status'>) => {
    const dataWithTimestamp = { ...data, status: 'ativo', createdAt: serverTimestamp() };
    return addDoc(collection(db, "roles"), dataWithTimestamp);
};

export const updateRole = (id: string, data: Partial<Omit<Role, 'id' | 'createdAt' | 'status'>>) => {
    const roleDoc = doc(db, "roles", id);
    return updateDoc(roleDoc, data);
};

export const setRoleStatus = (id: string, status: 'ativo' | 'inativo') => {
    const roleDoc = doc(db, "roles", id);
    return updateDoc(roleDoc, { status });
};

export const subscribeToRoles = (callback: (roles: Role[]) => void) => {
    const q = query(collection(db, "roles"), where("status", "==", "ativo"));
    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const roles: Role[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Role));
        callback(roles);
    });
};
