import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

const ambiente = process.env.NFE_AMBIENTE || "HOMOLOGACAO";
const FOCUS_NFE_URL = ambiente === "PRODUCAO"
    ? process.env.FOCUS_NFE_URL_PRODUCAO
    : process.env.FOCUS_NFE_URL_HOMOLOGACAO;
const FOCUS_NFE_TOKEN = ambiente === "PRODUCAO"
    ? process.env.FOCUS_NFE_TOKEN_PRODUCAO
    : process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO;

export async function POST(req: NextRequest) {
    if (!FOCUS_NFE_TOKEN || !FOCUS_NFE_URL) {
        return NextResponse.json({ message: "Erro de configuração do servidor." }, { status: 500 });
    }

    try {
        const { ref, justificativa } = await req.json();
        if (!ref || !justificativa) {
            return NextResponse.json({ message: "Referência e justificativa são obrigatórias." }, { status: 400 });
        }

        const response = await axios.delete(`${FOCUS_NFE_URL}/v2/nfe/${ref}`, {
            auth: {
                username: FOCUS_NFE_TOKEN,
                password: ''
            },
            data: {
                justificativa: justificativa
            }
        });

        return NextResponse.json(response.data, { status: response.status });

    } catch (error) {
        const axiosError = error as AxiosError<any>;

        if (axiosError.response && axiosError.response.data) {
            let errorMessage = "Ocorreu um erro desconhecido.";
            let errorDetails = axiosError.response.data;

            if (Buffer.isBuffer(errorDetails)) {
                 try {
                    errorDetails = JSON.parse(errorDetails.toString('utf-8'));
                } catch (e) {
                    errorDetails = { message: "Não foi possível decodificar a resposta de erro do servidor." };
                }
            }

            errorMessage = errorDetails.mensagem || errorDetails.message || "Falha ao cancelar a nota.";
            console.error("Erro na API Focus NF-e (cancelamento):", errorDetails);
            return NextResponse.json({ message: errorMessage, erros: errorDetails.erros }, { status: axiosError.response.status });

        } else {
            console.error("Erro desconhecido na API de cancelamento:", error);
        }

        return NextResponse.json({ message: "Falha na comunicação ao tentar cancelar a nota." }, { status: axiosError.response?.status || 500 });
    }
}
