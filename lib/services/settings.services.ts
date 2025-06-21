// lib/services/settings.services.ts
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { z } from "zod";

// Schema para as informações da empresa
export const companyInfoSchema = z.object({
  razaoSocial: z.string().optional(),
  nomeFantasia: z.string().min(3, "O nome fantasia é obrigatório."),
  cnpj: z.string().optional(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("Insira um e-mail válido.").optional().or(z.literal("")),
});

export type CompanyInfo = z.infer<typeof companyInfoSchema>;

const settingsDocRef = doc(db, "settings", "companyInfo");

/**
 * Salva as informações da empresa no Firestore.
 * @param data - As informações da empresa a serem salvas.
 */
export const saveCompanyInfo = async (data: CompanyInfo) => {
  await setDoc(settingsDocRef, data, { merge: true });
};

/**
 * Busca as informações da empresa do Firestore.
 * @returns As informações da empresa salvas ou null se não existirem.
 */
export const getCompanyInfo = async (): Promise<CompanyInfo | null> => {
  const docSnap = await getDoc(settingsDocRef);
  if (docSnap.exists()) {
    return docSnap.data() as CompanyInfo;
  }
  return null;
};
