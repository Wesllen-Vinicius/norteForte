// lib/services/nfe.services.ts
import { Venda, CompanyInfo, Cliente, Produto } from "@/lib/schemas";
import axios from 'axios';

/**
 * Chama a API interna do nosso sistema para emitir a Nota Fiscal Eletrônica.
 * @param venda - O objeto da venda.
 * @param empresa - As informações da empresa.
 * @param cliente - As informações do cliente.
 * @param todosProdutos - A lista completa de produtos.
 * @returns O resultado do processamento da NF-e.
 */
export const emitirNFe = async (venda: Venda, empresa: CompanyInfo, cliente: Cliente, todosProdutos: Produto[]) => {
    try {
        // Agora a chamada é para o nosso próprio backend
        const response = await axios.post('/api/nfe/emitir', {
            venda,
            empresa,
            cliente,
            todosProdutos
        });

        return response.data;
    } catch (error: any) {
        console.error("Erro ao chamar a API interna de NF-e:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || "Falha na comunicação com o servidor para emitir a NF-e.");
    }
};
