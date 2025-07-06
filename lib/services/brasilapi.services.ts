// lib/services/brasilapi.services.ts
import axios from "axios";

// Interfaces para tipar as respostas
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

interface CepData {
    cep: string;
    state: string;
    city: string;
    neighborhood: string;
    street: string;
}

interface MunicipioData {
    nome: string;
    codigo_ibge: string;
}

/**
 * Busca dados de um CNPJ na BrasilAPI.
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
      throw new Error(`O CNPJ informado não foi encontrado na base da Receita Federal.`);
    }
    console.error("Erro na BrasilAPI:", error.message);
    throw new Error("Falha na comunicação com o serviço de consulta. Verifique sua conexão e tente novamente.");
  }
}

/**
 * Busca dados de endereço a partir de um CEP na BrasilAPI.
 */
export async function fetchCepData(cep: string): Promise<CepData> {
    try {
        const response = await axios.get(`https://brasilapi.com.br/api/cep/v1/${cep}`);
        if (response.status !== 200 || !response.data) {
            throw new Error("Resposta inválida da API de CEP.");
        }
        return response.data;
    } catch (error: any) {
        if (error.response && error.response.status === 404) {
            throw new Error("CEP não encontrado.");
        }
        throw new Error("Falha ao se comunicar com a API de consulta de CEP.");
    }
}

/**
 * Busca o código IBGE de um município a partir da UF.
 */
export async function fetchMunicipioData(uf: string, cidade: string): Promise<MunicipioData | undefined> {
    try {
        const response = await axios.get<MunicipioData[]>(`https://brasilapi.com.br/api/ibge/municipios/v1/${uf}`);
        // Normaliza os nomes para uma comparação mais confiável
        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const cidadeNormalizada = normalize(cidade);
        return response.data.find(m => normalize(m.nome) === cidadeNormalizada);
    } catch (error) {
        console.error("Erro ao buscar dados do município:", error);
        throw new Error("Não foi possível validar o município do destinatário.");
    }
}
