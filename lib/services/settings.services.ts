// lib/services/settings.services.ts
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
// CORREÇÃO: Importando o schema e o tipo corretos do arquivo central.
import { companyInfoSchema, CompanyInfo } from "@/lib/schemas";

const settingsDocRef = doc(db, "settings", "companyInfo");

/**
 * Salva as informações da empresa no Firestore.
 * @param data - As informações da empresa a serem salvas.
 */
export const saveCompanyInfo = async (data: CompanyInfo) => {
  // A validação agora acontece no formulário, então aqui apenas salvamos.
  await setDoc(settingsDocRef, data, { merge: true });
};

/**
 * Busca as informações da empresa do Firestore.
 * @returns As informações da empresa salvas ou null se não existirem.
 */
export const getCompanyInfo = async (): Promise<CompanyInfo | null> => {
  const docSnap = await getDoc(settingsDocRef);
  if (docSnap.exists()) {
    // Validamos os dados retornados para garantir que estão no formato esperado.
    const parsedData = companyInfoSchema.safeParse(docSnap.data());
    if(parsedData.success) {
      return parsedData.data;
    }
  }
  return null;
};


export { companyInfoSchema };
// O schema local foi removido para evitar inconsistências.
