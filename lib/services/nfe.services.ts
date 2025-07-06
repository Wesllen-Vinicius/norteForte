import { Venda, CompanyInfo, Cliente, Produto, Unidade } from "@/lib/schemas";
import axios from 'axios';

/**
 * Chama a API interna do sistema para emitir a Nota Fiscal Eletrônica.
 */
export const emitirNFe = async (venda: Venda, empresa: CompanyInfo, cliente: Cliente, todosProdutos: Produto[], todasUnidades: Unidade[]) => {
    try {
        const response = await axios.post('/api/nfe/emitir', {
            venda,
            empresa,
            cliente,
            todosProdutos,
            todasUnidades
        });
        return response.data;
    } catch (error: any) {
        console.error("Erro ao chamar a API interna de NF-e:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || "Falha na comunicação com o servidor para emitir a NF-e.");
    }
};

/**
 * Consulta o status de uma NF-e na API Focus.
 */
export const consultarNFe = async (ref: string) => {
    try {
        const response = await axios.get(`/api/nfe/consultar?ref=${ref}`);
        return response.data;
    } catch (error: any) {
        console.error("Erro ao chamar a API interna de consulta de NF-e:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || "Falha ao consultar a NF-e.");
    }
};

/**
 * Cancela uma NF-e na API Focus.
 */
export const cancelarNFe = async (ref: string, justificativa: string) => {
    try {
        const response = await axios.post('/api/nfe/cancelar', { ref, justificativa });
        return response.data;
    } catch (error: any) {
        console.error("Erro ao chamar a API interna de cancelamento de NF-e:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || "Falha ao cancelar a NF-e.");
    }
};
