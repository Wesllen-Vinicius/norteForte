// lib/services/brasilapi.services.ts
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

// Interface para a resposta da API de CEP
interface CepData {
    cep: string;
    state: string;
    city: string;
    neighborhood: string;
    street: string;
}

/**
 * Busca dados de um CNPJ na BrasilAPI.
 * @param cnpj - O CNPJ a ser consultado (apenas números).
 * @returns Os dados da empresa.
 */
export async function fetchCnpjData(cnpj: string): Promise<CnpjData> {
  try {
    const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (response.status !== 200 || !response.data || !response.data.razao_social) {
        throw new Error("Resposta inválida da API. Verifique o CNPJ digitado.");
    }
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      // **TRATAMENTO ESPECÍFICO PARA ERRO 404**
      throw new Error(`O CNPJ informado não foi encontrado na base da Receita Federal.`);
    }
    // Tratamento para outros erros (ex: falha de rede)
    console.error("Erro na BrasilAPI:", error.message);
    throw new Error("Falha na comunicação com o serviço de consulta. Verifique sua conexão e tente novamente.");
  }
}

/**
 * Busca dados de endereço a partir de um CEP na BrasilAPI.
 * @param cep - O CEP a ser consultado (apenas números).
 * @returns Os dados do endereço.
 */
export async function fetchCepData(cep: string): Promise<CepData> {
    try {
        const response = await axios.get(`https://brasilapi.com.br/api/cep/v1/${cep}`);
        if (response.status !== 200 || !response.data) {
            throw new Error("Resposta inválida da API de CEP.");
        }
        return response.data;
    } catch (error: any) {
        console.error("Erro ao buscar dados do CEP na BrasilAPI:", error.response?.data || error.message);
        if (error.response && error.response.status === 404) {
            throw new Error("CEP não encontrado.");
        }
        throw new Error("Falha ao se comunicar com a API de consulta de CEP.");
    }
}
