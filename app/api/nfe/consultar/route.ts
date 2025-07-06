// app/api/nfe/consultar/route.ts

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const ambiente = process.env.NFE_AMBIENTE || "HOMOLOGACAO";
const FOCUS_NFE_URL = ambiente === "PRODUCAO" ? process.env.FOCUS_NFE_URL_PRODUCAO : process.env.FOCUS_NFE_URL_HOMOLOGACAO;
const FOCUS_NFE_TOKEN = ambiente === "PRODUCAO" ? process.env.FOCUS_NFE_TOKEN_PRODUCAO : process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO;

export async function GET(req: NextRequest) {
    if (!FOCUS_NFE_TOKEN || !FOCUS_NFE_URL) {
        return NextResponse.json({ message: "Erro de configuração do servidor." }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');

    if (!ref) {
        return NextResponse.json({ message: "Referência da NF-e não fornecida." }, { status: 400 });
    }

    try {
        const response = await axios.get(`${FOCUS_NFE_URL}/v2/nfe/${ref}`, {
            auth: {
                username: FOCUS_NFE_TOKEN,
                password: ''
            }
        });
        return NextResponse.json(response.data, { status: 200 });
    } catch (error: any) {
        console.error("Erro na API de consulta Focus NF-e:", error.response?.data || error.message);
        return NextResponse.json({ message: error.response?.data?.mensagem || "Falha na consulta." }, { status: error.response?.status || 500 });
    }
}
