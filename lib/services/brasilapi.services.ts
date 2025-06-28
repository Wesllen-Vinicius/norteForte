import axios from "axios";

// Interface para tipar a resposta da API de CNPJ
interface CnpjData {
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  email: string | null;
  ddd_telefone_1: string;
}

/**
 * Busca dados de um CNPJ na BrasilAPI.
 * @param cnpj - O CNPJ a ser consultado (apenas números).
 * @returns Os dados da empresa.
 */
export async function fetchCnpjData(cnpj: string): Promise<CnpjData> {
  try {
    const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (response.status !== 200 || !response.data) {
        throw new Error("Resposta inválida da API.");
    }
    return response.data;
  } catch (error: any) {
    console.error("Erro ao buscar dados do CNPJ na BrasilAPI:", error.response?.data || error.message);
    // Lança um erro específico para ser tratado na UI
    if (error.response && error.response.status === 404) {
        throw new Error("CNPJ não encontrado na base de dados da Receita Federal.");
    }
    throw new Error("Falha ao se comunicar com a API de consulta de CNPJ.");
  }
}
