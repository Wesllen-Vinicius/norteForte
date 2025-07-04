import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

const ambiente = process.env.NFE_AMBIENTE || "HOMOLOGACAO";
const FOCUS_NFE_URL = ambiente === "PRODUCAO"
    ? process.env.FOCUS_NFE_URL_PRODUCAO
    : process.env.FOCUS_NFE_URL_HOMOLOGACAO;
const FOCUS_NFE_TOKEN = ambiente === "PRODUCAO"
    ? process.env.FOCUS_NFE_TOKEN_PRODUCAO
    : process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO;

export async function GET(
    req: NextRequest,
    { params }: { params: { type: 'pdf' | 'xml' } }
) {
    if (!FOCUS_NFE_TOKEN || !FOCUS_NFE_URL) {
        return NextResponse.json({ message: "Erro de configuração do servidor." }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');
    const fileType = params.type;

    if (!ref || !['pdf', 'xml'].includes(fileType)) {
        return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400 });
    }

    try {
        // 1. CONSULTA A NOTA PRIMEIRO PARA OBTER A URL DE DOWNLOAD
        const consultaUrl = `${FOCUS_NFE_URL}/v2/nfe/${ref}`;
        const consultaResponse = await axios.get(consultaUrl, {
            auth: { username: FOCUS_NFE_TOKEN, password: '' }
        });

        if (consultaResponse.data.status !== 'autorizado') {
            throw new Error(`A nota fiscal não está autorizada (status: ${consultaResponse.data.status}).`);
        }

        const downloadUrl = fileType === 'pdf' ? consultaResponse.data.url_danfe : consultaResponse.data.url_xml;

        if (!downloadUrl) {
            throw new Error(`URL para download do ${fileType.toUpperCase()} não encontrada.`);
        }

        // 2. BAIXA O ARQUIVO DA URL OBTIDA
        const fileResponse = await axios.get(downloadUrl, {
            responseType: 'arraybuffer'
        });

        const headers = new Headers();
        headers.set('Content-Type', fileResponse.headers['content-type']);
        headers.set('Content-Disposition', `attachment; filename="nfe_${ref}.${fileType}"`);

        return new NextResponse(fileResponse.data, { status: 200, headers });

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

            errorMessage = errorDetails.mensagem || errorDetails.message || `Falha no download do ${fileType.toUpperCase()}.`;
            console.error(`Erro na API Focus NF-e (download ${fileType}):`, errorDetails);
            return NextResponse.json({ message: errorMessage }, { status: axiosError.response.status });

        } else {
            console.error(`Erro desconhecido na API de download (${fileType}):`, error);
        }

        return NextResponse.json({ message: (error as Error).message || `Falha na comunicação ao tentar baixar o ${fileType.toUpperCase()}.` }, { status: axiosError.response?.status || 500 });
    }
}
