import { NextRequest, NextResponse } from 'next/server';
import { Venda, CompanyInfo, Produto, ItemVendido, Unidade } from "@/lib/schemas";
import { fetchMunicipioData } from '@/lib/services/brasilapi.services';
import axios from 'axios';

const ambiente = process.env.NFE_AMBIENTE || "HOMOLOGACAO";
const FOCUS_NFE_URL = ambiente === "PRODUCAO" ? process.env.FOCUS_NFE_URL_PRODUCAO : process.env.FOCUS_NFE_URL_HOMOLOGACAO;
const FOCUS_NFE_TOKEN = ambiente === "PRODUCAO" ? process.env.FOCUS_NFE_TOKEN_PRODUCAO : process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO;

const getPagamento = (venda: Venda) => {
    const mapaPagamentos: { [key: string]: string } = {
        'Dinheiro': '01', 'Cheque': '02', 'Cartão de Crédito': '03',
        'Cartão de Débito': '04', 'Boleto/Prazo': '15', 'PIX': '17',
    };
    return [{
        forma_pagamento: mapaPagamentos[venda.metodoPagamento] || '99',
        valor_pagamento: parseFloat(venda.valorFinal?.toFixed(2) || venda.valorTotal.toFixed(2))
    }];
};

const getItensNFe = (venda: Venda, todosProdutos: Produto[], todasUnidades: Unidade[], empresa: CompanyInfo) => {
    return venda.produtos.map((item: ItemVendido, index: number) => {
        const produtoCompleto = todosProdutos.find(p => p.id === item.produtoId);
        if (!produtoCompleto || produtoCompleto.tipoProduto !== 'VENDA' || !produtoCompleto.ncm || produtoCompleto.ncm.length !== 8) {
            throw new Error(`Dados fiscais (NCM de 8 dígitos) inválidos para o produto "${item.produtoNome}".`);
        }

        const unidadeInfo = todasUnidades.find(u => u.id === produtoCompleto.unidadeId);
        const unidadeComercial = unidadeInfo ? unidadeInfo.sigla.toUpperCase() : "UN";

        const cfop = produtoCompleto.cfop || empresa.configuracaoFiscal.cfop_padrao;
        const cst = produtoCompleto.cest || empresa.configuracaoFiscal.cst_padrao;
        const valorBruto = item.quantidade * item.precoUnitario;
        const aliquotaIcms = empresa.configuracaoFiscal.aliquota_icms_padrao || 0;
        const valorIcms = (valorBruto * aliquotaIcms) / 100;

        return {
            numero_item: index + 1,
            codigo_produto: produtoCompleto.codigo || item.produtoId,
            descricao: item.produtoNome,
            codigo_ncm: produtoCompleto.ncm,
            cfop: cfop,
            unidade_comercial: unidadeComercial,
            unidade_tributavel: unidadeComercial,
            quantidade_comercial: parseFloat(item.quantidade.toFixed(4)),
            valor_unitario_comercial: parseFloat(item.precoUnitario.toFixed(10)),
            quantidade_tributavel: parseFloat(item.quantidade.toFixed(4)),
            valor_unitario_tributavel: parseFloat(item.precoUnitario.toFixed(10)),
            valor_bruto: parseFloat(valorBruto.toFixed(2)),
            icms_origem: "0",
            icms_situacao_tributaria: cst,
            icms_modalidade_base_calculo: "3",
            icms_base_calculo: parseFloat(valorBruto.toFixed(2)),
            icms_aliquota: aliquotaIcms,
            icms_valor: parseFloat(valorIcms.toFixed(2)),
            pis_situacao_tributaria: "07",
            pis_valor: 0.00,
            cofins_situacao_tributaria: "07",
            cofins_valor: 0.00
        };
    });
};

export async function POST(req: NextRequest) {
    if (!FOCUS_NFE_TOKEN || !FOCUS_NFE_URL) {
        return NextResponse.json({ message: "Erro de configuração do servidor." }, { status: 500 });
    }

    try {
        const { venda, empresa, cliente, todosProdutos, todasUnidades } = await req.json();
        if (!venda || !empresa || !cliente || !todosProdutos || !todasUnidades) {
            return NextResponse.json({ message: 'Dados insuficientes para emitir a nota.' }, { status: 400 });
        }

        const municipioDestinatario = await fetchMunicipioData(cliente.endereco.uf, cliente.endereco.cidade);
        if (!municipioDestinatario) {
            throw new Error(`Município do destinatário é inválido: "${cliente.endereco.cidade} - ${cliente.endereco.uf}"`);
        }

        const ambienteNFe = ambiente === "PRODUCAO" ? "1" : "2";

        const nfeData = {
            natureza_operacao: "Venda de mercadoria",
            ambiente: ambienteNFe,
            data_emissao: new Date().toISOString(),
            tipo_documento: 1,
            finalidade_emissao: 1,
            consumidor_final: (cliente.tipoPessoa === 'fisica' || cliente.indicadorInscricaoEstadual === '9') ? 1 : 0,
            presenca_comprador: 1,
            cnpj_emitente: empresa.cnpj.replace(/\D/g, ''),
            nome_emitente: empresa.razaoSocial,
            rua_emitente: empresa.endereco.logradouro,
            numero_emitente: empresa.endereco.numero,
            bairro_emitente: empresa.endereco.bairro,
            municipio_emitente: empresa.endereco.cidade,
            uf_emitente: empresa.endereco.uf,
            cep_emitente: empresa.endereco.cep.replace(/\D/g, ''),
            inscricao_estadual_emitente: empresa.inscricaoEstadual,
            regime_tributario_emitente: 3,
            nome_destinatario: ambienteNFe === "2" ? "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL" : cliente.nome,
            cpf_destinatario: cliente.tipoPessoa === 'fisica' ? cliente.documento.replace(/\D/g, '') : undefined,
            cnpj_destinatario: cliente.tipoPessoa === 'juridica' ? cliente.documento.replace(/\D/g, '') : undefined,
            logradouro_destinatario: cliente.endereco.logradouro,
            numero_destinatario: cliente.endereco.numero,
            bairro_destinatario: cliente.endereco.bairro,
            municipio_destinatario: cliente.endereco.cidade,
            uf_destinatario: cliente.endereco.uf,
            cep_destinatario: cliente.endereco.cep.replace(/\D/g, ''),
            codigo_municipio_destinatario: municipioDestinatario.codigo_ibge,
            indicador_inscricao_estadual: cliente.indicadorInscricaoEstadual,
            inscricao_estadual_destinatario: cliente.indicadorInscricaoEstadual === '1' ? cliente.inscricaoEstadual : undefined,
            modalidade_frete: 9,
            items: getItensNFe(venda, todosProdutos, todasUnidades, empresa),
            informacoes_adicionais_contribuinte: empresa.configuracaoFiscal.informacoes_complementares,
            formas_pagamento: getPagamento(venda)
        };

        const response = await axios.post(`${FOCUS_NFE_URL}/v2/nfe?ref=${venda.id}`, nfeData, {
            auth: {
                username: FOCUS_NFE_TOKEN,
                password: ''
            }
        });

        return NextResponse.json(response.data, { status: response.status });

    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.mensagem || error.message;
            const errosDetalhados = error.response?.data?.erros;
            return NextResponse.json({ message: errorMessage, erros: errosDetalhados }, { status: error.response?.status || 500 });
        }

        return NextResponse.json({ message: error.message || "Falha ao processar a requisição de NF-e." }, { status: 500 });
    }
}
