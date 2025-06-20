import { z } from "zod";

export const funcionarioSchema = z.object({
  nome: z.string().min(1, { message: "O nome é obrigatório." }),
  email: z.string().email({ message: "E-mail inválido." }).optional().or(z.literal("")),
  celular: z.string().optional().or(z.literal("")),
  cargoId: z.string().min(1, { message: "Selecione um cargo." }),
});

export const cargoSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(2, { message: "O nome do cargo deve ter pelo menos 2 caracteres." }),
});

