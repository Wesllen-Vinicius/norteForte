import axios from "axios";

export interface Banco {
  ispb: string;
  name: string;
  code: string;
  fullName: string;
}

export interface Agencia {
  branchCode: string;
  name: string;
}

// Busca todos os bancos
export async function fetchBancos(): Promise<Banco[]> {
  const res = await axios.get<Banco[]>("https://brasilapi.com.br/api/banks/v1");
  return res.data;
}

// Busca agências do Banco do Brasil (necessário substituir URL real e headers OAuth)
export async function fetchAgenciasBancoDoBrasil(bankCode: string, city?: string): Promise<Agencia[]> {
  const url = `https://api.bb.com.br/open-banking/v1/branches?bankCode=${bankCode}${city ? `&city=${city}` : ""}`;
  const res = await axios.get<Agencia[]>(url, {
    headers: {
      Authorization: `Bearer SEU_TOKEN_OAUTH2`,
    },
  });
  return res.data;
}
