import crypto from "crypto";

export function calculateNfceDv(key43: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = key43.length - 1; i >= 0; i--) {
    sum += parseInt(key43[i], 10) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function generateStandardNfceKey(params: {
  cUF?: string;
  date?: Date | string;
  cnpj?: string;
  series?: number | string;
  nfceNumber?: number | string;
  tpEmis?: string;
  cNF?: string | number;
}): { fiscalKey: string; cDV: number } {
  const cUF = (params.cUF || "35").replace(/\D/g, "").padStart(2, "0").slice(0, 2);
  const now = params.date ? (params.date instanceof Date ? params.date : new Date(params.date)) : new Date();
  const validDate = isNaN(now.getTime()) ? new Date() : now;
  const yy = String(validDate.getFullYear()).slice(-2);
  const mm = String(validDate.getMonth() + 1).padStart(2, "0");
  const aamm = `${yy}${mm}`;
  const cnpj = (params.cnpj || "59256207000174").replace(/\D/g, "").padStart(14, "0").slice(0, 14);
  const mod = "65"; // Modelo 65 - NFC-e
  const serie = String(params.series || 1).replace(/\D/g, "").padStart(3, "0").slice(-3);
  const nNF = String(params.nfceNumber || 1).replace(/\D/g, "").padStart(9, "0").slice(-9);
  const tpEmis = String(params.tpEmis || "1").replace(/\D/g, "").slice(0, 1) || "1";

  let cNF = params.cNF ? String(params.cNF).replace(/\D/g, "").padStart(8, "0").slice(-8) : "";
  if (!cNF || cNF.length !== 8) {
    cNF = Math.floor(10000000 + Math.random() * 89999999).toString();
  }

  const key43 = `${cUF}${aamm}${cnpj}${mod}${serie}${nNF}${tpEmis}${cNF}`;
  const cDV = calculateNfceDv(key43);
  const fiscalKey = `${key43}${cDV}`;

  return { fiscalKey, cDV };
}

export function buildSefazNfceQrCodeUrl(key44: string, amb: string, cscId?: string, cscToken?: string): string {
  const isProd = amb === "1";
  const baseQrUrl = isProd
    ? "https://www.nfce.fazenda.sp.gov.br/qrcode"
    : "https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode";
  const consultaUrl = isProd
    ? "https://www.nfce.fazenda.sp.gov.br/consulta"
    : "https://www.homologacao.nfce.fazenda.sp.gov.br/consulta";

  const cleanKey = key44.replace(/\D/g, "");
  if (!cleanKey || cleanKey.length !== 44) {
    return consultaUrl;
  }

  const cIdToken = (cscId || "000001").replace(/^0+/, "") || "1";
  if (cscToken && cscToken.length >= 6) {
    const paramString = `${cleanKey}|2|${amb}|${cIdToken}`;
    const hashHex = crypto.createHash("sha1").update(paramString + cscToken).digest("hex").toUpperCase();
    return `${baseQrUrl}?p=${paramString}|${hashHex}`;
  }

  return `${consultaUrl}?p=${cleanKey}`;
}
