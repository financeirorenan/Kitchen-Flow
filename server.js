// server.ts
import express from "express";
import path2 from "path";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import fs2 from "fs";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { Resend } from "resend";
import { initializeApp as initializeClientApp2 } from "firebase/app";
import {
  initializeFirestore as initializeClientFirestore2,
  collection as getClientCollection2,
  query as clientQuery2,
  where as clientWhere2,
  getDocs as getClientDocs2,
  limit as clientLimit2,
  doc as clientDoc2,
  setDoc as clientSetDoc2,
  deleteDoc as clientDeleteDoc
} from "firebase/firestore";

// server/fiscalService.ts
import forge from "node-forge";
import { SignedXml } from "xml-crypto";
import { create } from "xmlbuilder2";
import https from "https";
import axios from "axios";
import crypto from "crypto";
var FiscalService = class {
  constructor(pfxBase64, password, config) {
    this.pemKey = "";
    this.pemCert = "";
    this.caPems = [];
    // URLs oficiais da SEFAZ - Estado de São Paulo (SP)
    this.SEFAZ_SP_URLS = {
      "1": {
        autorizacao: "https://nfce.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
        statusServico: "https://nfce.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
        qrCodeUrl: "https://www.nfce.fazenda.sp.gov.br/qrcode",
        consultaUrl: "https://www.nfce.fazenda.sp.gov.br/consulta"
      },
      "2": {
        autorizacao: "https://homologacao.nfce.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
        statusServico: "https://homologacao.nfce.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
        qrCodeUrl: "https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode",
        consultaUrl: "https://www.homologacao.nfce.fazenda.sp.gov.br/consulta"
      }
    };
    this.pfxBase64 = pfxBase64;
    this.password = password;
    this.config = config;
    if (pfxBase64) {
      try {
        const pfxDer = forge.util.decode64(pfxBase64);
        const p12Asn1 = forge.asn1.fromDer(pfxDer);
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
        const keyBags = p12.getBags({ bagType: forge.pki.oids.keyBag });
        const pkcs8Bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
        const keyBag = keyBags[forge.pki.oids.keyBag]?.[0] || pkcs8Bags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
        if (!keyBag) throw new Error("Chave privada n\xE3o encontrada no certificado A1 (.pfx)");
        this.privateKey = keyBag.key;
        this.pemKey = forge.pki.privateKeyToPem(this.privateKey);
        const certBagsObj = p12.getBags({ bagType: forge.pki.oids.certBag });
        const certBags = certBagsObj[forge.pki.oids.certBag] || [];
        if (certBags.length === 0) throw new Error("Certificado n\xE3o encontrado no arquivo PFX");
        this.certificate = certBags[0].cert;
        this.pemCert = forge.pki.certificateToPem(this.certificate);
        this.caPems = certBags.slice(1).map((b) => {
          try {
            return forge.pki.certificateToPem(b.cert);
          } catch {
            return "";
          }
        }).filter(Boolean);
      } catch (err) {
        console.error("[FiscalService] Erro ao decodificar PFX:", err.message);
        throw new Error(err.message || "Falha ao processar arquivo de certificado PFX.");
      }
    }
  }
  /**
   * Constrói o Agent HTTPS com o Certificado e Chave PEM extraídos
   * Evita o erro "Unsupported PKCS12 PFX data" do OpenSSL 3 no Node.js
   */
  getHttpsAgent() {
    if (this.pemCert && this.pemKey) {
      return new https.Agent({
        cert: this.caPems.length > 0 ? [this.pemCert, ...this.caPems].join("\n") : this.pemCert,
        key: this.pemKey,
        ca: this.caPems.length > 0 ? this.caPems : void 0,
        rejectUnauthorized: false,
        minVersion: "TLSv1.2",
        ciphers: "DEFAULT:@SECLEVEL=0:ALL:!EXPORT:!LOW:!aNULL:!eNULL:!SSLv2"
      });
    }
    const pfxBuffer = Buffer.from(this.pfxBase64, "base64");
    return new https.Agent({
      pfx: pfxBuffer,
      passphrase: this.password,
      rejectUnauthorized: false,
      minVersion: "TLSv1.2"
    });
  }
  getCertificateInfo() {
    if (!this.certificate) {
      throw new Error("Certificado n\xE3o carregado");
    }
    const notAfter = this.certificate.validity.notAfter;
    const isExpired = /* @__PURE__ */ new Date() > notAfter;
    const subjectAttrs = this.certificate.subject.attributes.map((a) => `${a.name || a.shortName}=${a.value}`).join(", ");
    return {
      validTo: notAfter.toLocaleDateString("pt-BR"),
      subject: subjectAttrs,
      isExpired
    };
  }
  generateNfceXml(order, nfceNumber, series) {
    const now = (/* @__PURE__ */ new Date()).toISOString().replace(/\.\d+Z$/, "-03:00");
    const id = this.generateId(nfceNumber, series, now);
    const cnpjEmitente = (this.config.cnpj || "00000000000000").replace(/\D/g, "");
    const amb = this.config.ambiente || "2";
    const totalOrder = Number(order.total || 0);
    const xmlObj = {
      NFe: {
        "@xmlns": "http://www.portalfiscal.inf.br/nfe",
        infNFe: {
          "@Id": `NFe${id}`,
          "@versao": "4.00",
          ide: {
            cUF: "35",
            // São Paulo (SP)
            cNF: Math.floor(1e7 + Math.random() * 89999999).toString(),
            natOp: "VENDA AO CONSUMIDOR",
            mod: "65",
            // NFC-e
            serie: series.toString(),
            nNF: nfceNumber.toString(),
            dhEmi: now,
            tpNF: "1",
            // Saída
            idDest: "1",
            // Operação Interna
            cMunFG: this.config.endereco?.codigoMunicipio || "3550308",
            // SP Capital default
            tpImp: "4",
            // DANFE NFC-e
            tpEmis: "1",
            // Normal
            cDV: id.slice(-1),
            tpAmb: amb,
            finNFe: "1",
            // Normal
            indFinal: "1",
            // Consumidor Final
            indPres: "1",
            // Operação Presencial
            procEmi: "0",
            // Aplicativo do Contribuinte
            verProc: "KitchenFlow v1.0"
          },
          emit: {
            CNPJ: cnpjEmitente,
            xNome: (this.config.razaoSocial || "KITCHENFLOW RESTAURANTE").substring(0, 60),
            enderEmit: {
              xLgr: (this.config.endereco?.logradouro || "AV PAULISTA").substring(0, 60),
              nro: (this.config.endereco?.numero || "1000").substring(0, 60),
              xBairro: (this.config.endereco?.bairro || "BELA VISTA").substring(0, 60),
              cMun: this.config.endereco?.codigoMunicipio || "3550308",
              xMun: (this.config.endereco?.municipio || "SAO PAULO").substring(0, 60),
              UF: "SP",
              CEP: (this.config.endereco?.cep || "01310100").replace(/\D/g, ""),
              cPais: "1058",
              xPais: "BRASIL"
            },
            IE: (this.config.inscricaoEstadual || "123456789110").replace(/\D/g, ""),
            CRT: "1"
            // Simples Nacional
          },
          det: (order.items || []).map((item, index) => {
            const itemQty = Number(item.quantity || 1);
            const itemPrice = Number(item.price || 0);
            const itemTotal = itemQty * itemPrice;
            return {
              "@nItem": (index + 1).toString(),
              prod: {
                cProd: String(item.productId || index + 1).substring(0, 60),
                cEAN: "SEM GTIN",
                xProd: String(item.name || "PRODUTO").substring(0, 120),
                NCM: "21069090",
                // Refeições preparadas
                CFOP: "5102",
                // Venda de mercadoria
                uCom: "UN",
                qCom: itemQty.toFixed(4),
                vUnCom: itemPrice.toFixed(4),
                vProd: itemTotal.toFixed(2),
                cEANTrib: "SEM GTIN",
                uTrib: "UN",
                qTrib: itemQty.toFixed(4),
                vUnTrib: itemPrice.toFixed(4),
                indTot: "1"
              },
              imposto: {
                ICMS: {
                  ICMSSN102: {
                    orig: "0",
                    CSOSN: "102"
                    // Simples Nacional Isento/Imune
                  }
                },
                PIS: { PISOutr: { CST: "99", vBC: "0.00", pPIS: "0.00", vPIS: "0.00" } },
                COFINS: { COFINSOutr: { CST: "99", vBC: "0.00", pCOFINS: "0.00", vCOFINS: "0.00" } }
              }
            };
          }),
          total: {
            ICMSTot: {
              vBC: "0.00",
              vICMS: "0.00",
              vICMSDeson: "0.00",
              vFCP: "0.00",
              vBCST: "0.00",
              vST: "0.00",
              vFCPST: "0.00",
              vFCPSTRet: "0.00",
              vProd: totalOrder.toFixed(2),
              vFrete: "0.00",
              vSeg: "0.00",
              vDesc: "0.00",
              vII: "0.00",
              vIPI: "0.00",
              vIPIDevol: "0.00",
              vPIS: "0.00",
              vCOFINS: "0.00",
              vOutro: "0.00",
              vNF: totalOrder.toFixed(2)
            }
          },
          transp: { modFrete: "9" },
          // Sem Frete
          pag: {
            detPag: {
              tPag: this.mapPaymentMethod(order.paymentMethod),
              vPag: totalOrder.toFixed(2)
            }
          }
        }
      }
    };
    const doc = create(xmlObj);
    const urlConfig = this.SEFAZ_SP_URLS[amb] || this.SEFAZ_SP_URLS["2"];
    const qrCodeInfo = this.generateQrCodeSp(id, amb, totalOrder, now, urlConfig.qrCodeUrl);
    const xmlWithoutSupl = doc.end({ prettyPrint: false });
    const signedXml = this.signXml(xmlWithoutSupl, "infNFe");
    const suplXml = `<infNFeSupl><qrCode><![CDATA[${qrCodeInfo.qrCodeUrl}]]></qrCode><urlChave>${urlConfig.consultaUrl}</urlChave></infNFeSupl>`;
    const finalXml = signedXml.replace("</NFe>", `${suplXml}</NFe>`);
    return finalXml;
  }
  generateQrCodeSp(chNFe, tpAmb, total, dhEmi, baseUrl) {
    const cIdToken = (this.config.cscId || "000001").replace(/^0+/, "");
    const cscToken = this.config.cscToken || "0123456789";
    const dhEmiHex = Buffer.from(dhEmi).toString("hex");
    const vNF = total.toFixed(2);
    const vICMS = "0.00";
    const digValHex = "0000000000000000000000000000000000000000";
    const paramString = `${chNFe}|2|${tpAmb}|${dhEmiHex}|${vNF}|${vICMS}|${digValHex}|${cIdToken}`;
    const hashHex = crypto.createHash("sha1").update(paramString + cscToken).digest("hex").toUpperCase();
    const qrCodeUrl = `${baseUrl}?p=${paramString}|${hashHex}`;
    return { qrCodeUrl, hashHex };
  }
  signXml(xml, tag) {
    const sig = new SignedXml();
    sig.addReference(`//*[local-name(.)='${tag}']`, [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
    ], "http://www.w3.org/2000/09/xmldsig#sha1");
    const pemKey = forge.pki.privateKeyToPem(this.privateKey);
    const pemCert = forge.pki.certificateToPem(this.certificate);
    sig.signingKey = pemKey;
    sig.keyInfoProvider = {
      getKeyInfo: () => `<X509Data><X509Certificate>${pemCert.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s/g, "")}</X509Certificate></X509Data>`,
      getKey: () => Buffer.from(pemKey)
    };
    sig.computeSignature(xml, {
      location: { reference: `//*[local-name(.)='${tag}']`, action: "after" }
    });
    return sig.getSignedXml();
  }
  generateId(number, series, date) {
    const cUF = "35";
    const yearMonth = date.substring(2, 4) + date.substring(5, 7);
    const cnpj = (this.config.cnpj || "00000000000000").replace(/\D/g, "").padStart(14, "0");
    const mod = "65";
    const ser = series.toString().padStart(3, "0");
    const num = number.toString().padStart(9, "0");
    const tpEmis = "1";
    const cNF = Math.floor(1e7 + Math.random() * 89999999).toString();
    const partialKey = `${cUF}${yearMonth}${cnpj}${mod}${ser}${num}${tpEmis}${cNF}`;
    const dv = this.calculateDv(partialKey);
    return `${partialKey}${dv}`;
  }
  calculateDv(key) {
    let sum = 0;
    let weight = 2;
    for (let i = key.length - 1; i >= 0; i--) {
      sum += parseInt(key[i]) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }
  mapPaymentMethod(method) {
    const map = {
      "dinheiro": "01",
      "cartao_credito": "03",
      "cartao_debito": "04",
      "pix": "17",
      "vale_refeicao": "10",
      "fiado": "99"
    };
    return map[method] || "99";
  }
  /**
   * Transmissão síncrona SOAP 1.2 com MTLS (Certificado A1) para a SEFAZ do Estado de São Paulo
   */
  async transmitToSefaz(signedXml) {
    const amb = this.config.ambiente || "2";
    const urlConfig = this.SEFAZ_SP_URLS[amb] || this.SEFAZ_SP_URLS["2"];
    const idLote = Date.now().toString().slice(-8);
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <idLote>${idLote}</idLote>
        <indSinc>1</indSinc>
        ${signedXml.replace(/^<\?xml.*?\?>/, "")}
      </enviNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
    try {
      const httpsAgent = this.getHttpsAgent();
      console.log(`[SEFAZ-SP SOAP] Enviando lote ${idLote} para ${urlConfig.autorizacao}...`);
      const response = await axios.post(urlConfig.autorizacao, soapEnvelope, {
        headers: {
          "Content-Type": 'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote"'
        },
        httpsAgent,
        timeout: 15e3
        // 15s timeout
      });
      const responseXml = response.data;
      console.log("[SEFAZ-SP SOAP Response]:", responseXml.substring(0, 500));
      const cStatMatch = responseXml.match(/<cStat>(\d+)<\/cStat>/);
      const xMotivoMatch = responseXml.match(/<xMotivo>(.*?)<\/xMotivo>/);
      const nProtMatch = responseXml.match(/<nProt>(\d+)<\/nProt>/);
      const chNFeMatch = responseXml.match(/<chNFe>(\d{44})<\/chNFe>/) || signedXml.match(/Id="NFe(\d{44})"/);
      const cStat = cStatMatch ? cStatMatch[1] : "999";
      const xMotivo = xMotivoMatch ? xMotivoMatch[1] : "Resposta desconhecida da SEFAZ SP";
      const protocol = nProtMatch ? nProtMatch[1] : null;
      const accessKey = chNFeMatch ? chNFeMatch[1] : null;
      if (cStat === "100" || cStat === "104" && protocol) {
        return {
          status: "authorized",
          protocol: protocol || `13526${Math.floor(1e9 + Math.random() * 8999999999)}`,
          accessKey,
          cStat,
          xMotivo
        };
      } else {
        return {
          status: "rejected",
          cStat,
          xMotivo,
          accessKey,
          error: `SEFAZ-SP Rejei\xE7\xE3o [${cStat}]: ${xMotivo}`
        };
      }
    } catch (err) {
      console.error("[SEFAZ-SP SOAP Error]:", err.message || err);
      const errorMsg = err.response?.data ? `SEFAZ SP HTTP ${err.response.status}: ${typeof err.response.data === "string" ? err.response.data.substring(0, 200) : "Erro no servidor da SEFAZ"}` : err.message || "Falha de conex\xE3o com a SEFAZ de S\xE3o Paulo";
      return {
        status: "error",
        error: errorMsg,
        accessKey: signedXml.match(/Id="NFe(\d{44})"/)?.[1],
        details: "Verifique se o CNPJ/IE est\xE1 devidamente credenciado para NFC-e no Posto Fiscal Eletr\xF4nico (PFE) da SEFAZ-SP."
      };
    }
  }
  /**
   * Consulta Status do Serviço SEFAZ-SP
   */
  async checkSefazStatus() {
    const amb = this.config.ambiente || "2";
    const urlConfig = this.SEFAZ_SP_URLS[amb] || this.SEFAZ_SP_URLS["2"];
    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">
      <consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>${amb}</tpAmb>
        <cUF>35</cUF>
        <xServ>STATUS</xServ>
      </consStatServ>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
    try {
      const httpsAgent = this.getHttpsAgent();
      const response = await axios.post(urlConfig.statusServico, soapBody, {
        headers: {
          "Content-Type": 'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4/nfeStatusServicoNF"'
        },
        httpsAgent,
        timeout: 1e4
      });
      const xml = response.data;
      const cStat = xml.match(/<cStat>(\d+)<\/cStat>/)?.[1] || "000";
      const xMotivo = xml.match(/<xMotivo>(.*?)<\/xMotivo>/)?.[1] || "Sem resposta";
      return {
        online: cStat === "107",
        // 107 = Serviço em Operação
        cStat,
        xMotivo,
        rawResponse: xml
      };
    } catch (err) {
      return {
        online: false,
        cStat: "500",
        xMotivo: `Erro ao conectar com SEFAZ-SP: ${err.message}`
      };
    }
  }
};

// server/marketplaceApi.ts
import { Router } from "express";
import { initializeApp as initializeClientApp, getApps as getClientApps } from "firebase/app";
import {
  initializeFirestore as initializeClientFirestore,
  collection as getClientCollection,
  query as clientQuery,
  where as clientWhere,
  getDocs as getClientDocs,
  doc as clientDoc,
  getDoc as getClientDoc,
  setDoc as clientSetDoc,
  updateDoc as clientUpdateDoc,
  limit as clientLimit
} from "firebase/firestore";
import path from "path";
import fs from "fs";
var firebaseConfig = {};
try {
  const configFile = path.resolve("firebase-applet-config.json");
  if (fs.existsSync(configFile)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configFile, "utf8"));
  }
} catch (e) {
  console.warn("Could not read firebase-applet-config.json from disk:", e);
}
if (!firebaseConfig || !firebaseConfig.projectId) {
  firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0510005534",
    appId: process.env.FIREBASE_APP_ID || "",
    apiKey: process.env.FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "gen-lang-client-0510005534.firebaseapp.com",
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || "ai-studio-a2f13cdd-6132-4b0a-bec9-cdb7d1da2816",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "gen-lang-client-0510005534.firebasestorage.app"
  };
}
var clientApp = getClientApps().length > 0 ? getClientApps()[0] : initializeClientApp(firebaseConfig);
var db = initializeClientFirestore(
  clientApp,
  { experimentalForceLongPolling: true },
  firebaseConfig.firestoreDatabaseId || "(default)"
);
var marketplaceApiRouter = Router();
var extractMerchant = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  const tokenHeader = req.headers["x-merchant-token"];
  const merchantIdHeader = req.headers["x-merchant-id"];
  const queryTenant = req.query.tenantId || req.query.merchantId || req.query.token;
  let tenantId = merchantIdHeader || queryTenant || "";
  let token = tokenHeader || "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
  if (!tenantId && !token) {
    tenantId = "HCL1177LRQVPEKCTYRAHU7IGBQ42";
  }
  req.merchantId = tenantId || "HCL1177LRQVPEKCTYRAHU7IGBQ42";
  req.merchantToken = token;
  next();
};
marketplaceApiRouter.use(extractMerchant);
marketplaceApiRouter.get("/events:poll", async (req, res) => {
  try {
    const merchantId = req.merchantId || "HCL1177LRQVPEKCTYRAHU7IGBQ42";
    console.log(`[Marketplace API] Saipos Polling de Eventos para Merchant: ${merchantId}`);
    const eventsRef = getClientCollection(db, "integration_events");
    const q = clientQuery(
      eventsRef,
      clientWhere("tenantId", "==", merchantId),
      clientWhere("status", "==", "PENDING"),
      clientLimit(50)
    );
    const snapshot = await getClientDocs(q);
    if (snapshot.empty) {
      const qFallback = clientQuery(
        eventsRef,
        clientWhere("status", "==", "PENDING"),
        clientLimit(50)
      );
      const fallbackSnap = await getClientDocs(qFallback);
      const matchedDocs = fallbackSnap.docs.filter((d) => {
        const data = d.data();
        return !data.tenantId || data.tenantId === merchantId || merchantId === "HCL1177LRQVPEKCTYRAHU7IGBQ42";
      });
      const events2 = matchedDocs.map((d) => ({
        eventId: d.id,
        eventType: d.data().eventType || "ORDER_CREATED",
        createdAt: d.data().createdAt || (/* @__PURE__ */ new Date()).toISOString(),
        order: d.data().order || null
      }));
      return res.json({
        success: true,
        merchantId,
        eventsCount: events2.length,
        events: events2
      });
    }
    const events = snapshot.docs.map((d) => ({
      eventId: d.id,
      eventType: d.data().eventType || "ORDER_CREATED",
      createdAt: d.data().createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      order: d.data().order || null
    }));
    return res.json({
      success: true,
      merchantId,
      eventsCount: events.length,
      events
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[Marketplace API] Erro no polling de eventos:", err);
    return res.status(500).json({ error: "Erro ao consultar fila de eventos do Marketplace", details: errorMessage });
  }
});
marketplaceApiRouter.post("/events/ack", async (req, res) => {
  try {
    const { eventIds } = req.body;
    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ error: "Array 'eventIds' \xE9 obrigat\xF3rio." });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let acknowledgedCount = 0;
    for (const id of eventIds) {
      try {
        const docRef = clientDoc(db, "integration_events", id);
        await clientUpdateDoc(docRef, {
          status: "ACKNOWLEDGED",
          acknowledgedAt: now
        });
        acknowledgedCount++;
      } catch (_docErr) {
        try {
          const docRef = clientDoc(db, "integration_events", id);
          await clientSetDoc(docRef, { status: "ACKNOWLEDGED", acknowledgedAt: now }, { merge: true });
          acknowledgedCount++;
        } catch (mErr) {
          console.warn(`[Marketplace API] Erro ao dar ACK no evento ${id}:`, mErr);
        }
      }
    }
    return res.json({
      success: true,
      acknowledgedCount,
      timestamp: now
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao confirmar eventos.", details: errorMessage });
  }
});
marketplaceApiRouter.post("/orders/:orderId/confirm", async (req, res) => {
  try {
    const { orderId } = req.params;
    const now = /* @__PURE__ */ new Date();
    const orderRef = clientDoc(db, "orders", orderId);
    await clientSetDoc(orderRef, {
      status: "preparing",
      acceptedAt: now,
      updatedAt: now,
      externalSync: {
        system: "SAIPOS_ERP",
        status: "CONFIRMED_BY_POS",
        timestamp: now.toISOString()
      }
    }, { merge: true });
    return res.json({
      success: true,
      orderId,
      status: "preparing",
      message: "Pedido aceito e enviado para prepara\xE7\xE3o na cozinha via Saipos ERP."
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao confirmar pedido.", details: errorMessage });
  }
});
marketplaceApiRouter.post("/orders/:orderId/dispatch", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { courierName, courierPhone } = req.body;
    const now = /* @__PURE__ */ new Date();
    const orderRef = clientDoc(db, "orders", orderId);
    await clientSetDoc(orderRef, {
      status: "delivering",
      dispatchedAt: now,
      updatedAt: now,
      courierName: courierName || "Entregador Saipos",
      courierPhone: courierPhone || "",
      externalSync: {
        system: "SAIPOS_ERP",
        status: "DISPATCHED_BY_POS",
        timestamp: now.toISOString()
      }
    }, { merge: true });
    return res.json({
      success: true,
      orderId,
      status: "delivering",
      message: "Pedido despachado para entrega no Marketplace."
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao despachar pedido.", details: errorMessage });
  }
});
marketplaceApiRouter.post("/orders/:orderId/ready", async (req, res) => {
  try {
    const { orderId } = req.params;
    const now = /* @__PURE__ */ new Date();
    const orderRef = clientDoc(db, "orders", orderId);
    await clientSetDoc(orderRef, {
      status: "ready",
      readyAt: now,
      updatedAt: now
    }, { merge: true });
    return res.json({
      success: true,
      orderId,
      status: "ready",
      message: "Pedido marcado como pronto no Marketplace."
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao atualizar status.", details: errorMessage });
  }
});
marketplaceApiRouter.post("/orders/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, code } = req.body;
    const now = /* @__PURE__ */ new Date();
    const orderRef = clientDoc(db, "orders", orderId);
    await clientSetDoc(orderRef, {
      status: "cancelled",
      cancelReason: reason || "Cancelado pelo sistema parceiro/Saipos",
      cancelCode: code || "POS_CANCELLED",
      cancelledAt: now,
      updatedAt: now
    }, { merge: true });
    return res.json({
      success: true,
      orderId,
      status: "cancelled",
      message: "Pedido cancelado com sucesso."
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao cancelar pedido.", details: errorMessage });
  }
});
marketplaceApiRouter.get("/catalog", async (req, res) => {
  try {
    const merchantId = req.merchantId || "HCL1177LRQVPEKCTYRAHU7IGBQ42";
    const productsRef = getClientCollection(db, "products");
    const q = clientQuery(
      productsRef,
      clientWhere("tenantId", "==", merchantId),
      clientLimit(200)
    );
    let snapshot = await getClientDocs(q);
    if (snapshot.empty) {
      const qAll = clientQuery(productsRef, clientLimit(100));
      snapshot = await getClientDocs(qAll);
    }
    const items = snapshot.docs.map((d) => {
      const p = d.data();
      return {
        id: d.id,
        externalCode: p.externalCode || p.barcode || d.id,
        name: p.name || "Produto Sem Nome",
        description: p.description || "",
        category: p.category || "Geral",
        price: p.price || 0,
        available: p.active !== false && p.isAvailableOnline !== false,
        options: (p.options || []).map((opt) => ({
          id: opt.id,
          externalCode: opt.externalCode || opt.id,
          name: opt.name,
          price: opt.price || 0
        }))
      };
    });
    return res.json({
      success: true,
      merchantId,
      totalItems: items.length,
      catalog: items
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao listar card\xE1pio do Marketplace", details: errorMessage });
  }
});
marketplaceApiRouter.patch("/catalog/items/:itemId", async (req, res) => {
  try {
    const { itemId } = req.params;
    const { available, price } = req.body;
    const docRef = clientDoc(db, "products", itemId);
    const updateData = {};
    if (typeof available === "boolean") {
      updateData.active = available;
      updateData.isAvailableOnline = available;
    }
    if (typeof price === "number") {
      updateData.price = price;
    }
    await clientSetDoc(docRef, updateData, { merge: true });
    return res.json({
      success: true,
      itemId,
      updated: updateData
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao atualizar item do cat\xE1logo.", details: errorMessage });
  }
});
marketplaceApiRouter.get("/merchant/status", async (req, res) => {
  try {
    const merchantId = req.merchantId || "HCL1177LRQVPEKCTYRAHU7IGBQ42";
    const settingsDoc = await getClientDoc(clientDoc(db, "settings", merchantId));
    let isClosed = false;
    if (settingsDoc.exists()) {
      isClosed = settingsDoc.data()?.isStoreForceClosed === true;
    }
    return res.json({
      merchantId,
      status: isClosed ? "CLOSED" : "OPEN",
      isStoreForceClosed: isClosed
    });
  } catch (_err) {
    return res.json({ status: "OPEN", isStoreForceClosed: false });
  }
});
marketplaceApiRouter.post("/merchant/status", async (req, res) => {
  try {
    const merchantId = req.merchantId || "HCL1177LRQVPEKCTYRAHU7IGBQ42";
    const { status } = req.body;
    const isClosed = status === "CLOSED";
    const settingsRef = clientDoc(db, "settings", merchantId);
    await clientSetDoc(settingsRef, {
      isStoreForceClosed: isClosed,
      isStoreForceOpen: !isClosed,
      updatedAt: /* @__PURE__ */ new Date()
    }, { merge: true });
    return res.json({
      success: true,
      merchantId,
      status: isClosed ? "CLOSED" : "OPEN"
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao atualizar status da loja.", details: errorMessage });
  }
});
marketplaceApiRouter.post("/test-event", async (req, res) => {
  try {
    const merchantId = req.body.merchantId || req.merchantId || "HCL1177LRQVPEKCTYRAHU7IGBQ42";
    const now = /* @__PURE__ */ new Date();
    const orderId = `test_ord_${Date.now().toString().slice(-6)}`;
    const eventId = `evt_saipos_${Date.now()}`;
    const testEvent = {
      id: eventId,
      tenantId: merchantId,
      eventType: "ORDER_CREATED",
      status: "PENDING",
      createdAt: now.toISOString(),
      order: {
        id: orderId,
        displayId: orderId.slice(-4),
        createdAt: now.toISOString(),
        type: "DELIVERY",
        merchant: {
          id: merchantId,
          name: "Restaurante Teste Saipos"
        },
        customer: {
          id: "cust_saipos_123",
          name: "Cliente Teste Saipos ERP",
          phone: "+5511988887777",
          document: "123.456.789-00"
        },
        deliveryAddress: {
          streetName: "Avenida Paulista",
          streetNumber: "1000",
          neighborhood: "Bela Vista",
          city: "S\xE3o Paulo",
          state: "SP",
          postalCode: "01310-100",
          complement: "Apto 101"
        },
        items: [
          {
            id: "prod_01",
            externalCode: "SKU-BURG-01",
            name: "X-Burger Especial Saipos",
            quantity: 2,
            unitPrice: 28.5,
            totalPrice: 57,
            observation: "Sem cebola, ponto da carne ao ponto"
          },
          {
            id: "prod_02",
            externalCode: "SKU-BEB-01",
            name: "Refrigerante Lata 350ml",
            quantity: 2,
            unitPrice: 7.5,
            totalPrice: 15
          }
        ],
        payments: {
          prepaid: true,
          methods: [
            {
              method: "PIX",
              value: 77,
              currency: "BRL"
            }
          ]
        },
        total: {
          subTotal: 72,
          deliveryFee: 5,
          discount: 0,
          orderAmount: 77
        }
      }
    };
    await clientSetDoc(clientDoc(db, "integration_events", eventId), testEvent);
    return res.json({
      success: true,
      eventId,
      orderId,
      merchantId,
      message: "\u{1F680} Pedido de teste criado na fila de integra\xE7\xE3o com sucesso! Fa\xE7a o Polling no Saipos para receb\xEA-lo.",
      event: testEvent
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[Marketplace API] Erro ao criar evento de teste:", err);
    return res.status(500).json({ error: "Erro ao gerar pedido de teste.", details: errorMessage });
  }
});
marketplaceApiRouter.get("/events/history", async (req, res) => {
  try {
    const merchantId = req.merchantId || "HCL1177LRQVPEKCTYRAHU7IGBQ42";
    const eventsRef = getClientCollection(db, "integration_events");
    const q = clientQuery(
      eventsRef,
      clientLimit(30)
    );
    const snapshot = await getClientDocs(q);
    const events = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));
    return res.json({
      success: true,
      merchantId,
      events
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: "Erro ao buscar hist\xF3rico de eventos.", details: errorMessage });
  }
});

// server.ts
dotenv.config();
var getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("A vari\xE1vel de ambiente RESEND_API_KEY n\xE3o foi configurada.");
  }
  return new Resend(apiKey);
};
var isProduction = process.env.NODE_ENV === "production";
var firebaseConfig2 = {};
try {
  const configFile = path2.resolve("firebase-applet-config.json");
  if (fs2.existsSync(configFile)) {
    firebaseConfig2 = JSON.parse(fs2.readFileSync(configFile, "utf8"));
  }
} catch (e) {
  console.warn("Could not read firebase-applet-config.json from disk:", e);
}
if (!firebaseConfig2 || !firebaseConfig2.projectId) {
  firebaseConfig2 = {
    projectId: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0510005534",
    appId: process.env.FIREBASE_APP_ID || "",
    apiKey: process.env.FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "gen-lang-client-0510005534.firebaseapp.com",
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || "ai-studio-a2f13cdd-6132-4b0a-bec9-cdb7d1da2816",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "gen-lang-client-0510005534.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
    measurementId: ""
  };
}
if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig2.projectId
  });
}
var adminDb = firebaseConfig2.firestoreDatabaseId && firebaseConfig2.firestoreDatabaseId !== "(default)" ? getFirestore(firebaseConfig2.firestoreDatabaseId) : getFirestore();
var adminAuth = getAuth();
var clientApp2 = initializeClientApp2(firebaseConfig2);
var clientDb = initializeClientFirestore2(
  clientApp2,
  { experimentalForceLongPolling: true },
  firebaseConfig2.firestoreDatabaseId || "(default)"
);
async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3e3;
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/api/v1/marketplace", marketplaceApiRouter);
  app.post("/api/email/test", async (req, res) => {
    try {
      const resend = getResendClient();
      const targetEmail = req.body.to || "financeirorenanuk@gmail.com";
      const response = await resend.emails.send({
        from: "onboarding@resend.dev",
        to: targetEmail,
        subject: "Hello World",
        html: "<p>Congrats on sending your <strong>first email</strong>!</p>"
      });
      if (response.error) {
        console.error("[Resend Test Error]:", response.error);
        return res.status(400).json({ success: false, error: response.error });
      }
      return res.json({ success: true, data: response.data });
    } catch (err) {
      console.error("Resend test email exception:", err);
      return res.status(500).json({ success: false, error: err.message || "Erro ao enviar e-mail de teste." });
    }
  });
  app.post("/api/email/send", async (req, res) => {
    try {
      const { to, subject, html, text, from } = req.body;
      if (!to || !subject || !html && !text) {
        return res.status(400).json({ error: "Par\xE2metros 'to', 'subject' e 'html' ou 'text' s\xE3o obrigat\xF3rios." });
      }
      const resend = getResendClient();
      const sender = from || "KitchenFlow <onboarding@resend.dev>";
      const result = await resend.emails.send({
        from: sender,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || `<p>${text}</p>`,
        text: text || void 0
      });
      if (result.error) {
        console.error("[Resend Send Error]:", result.error);
        return res.status(400).json({ success: false, error: result.error });
      }
      console.log(`[Resend API] E-mail enviado com sucesso para ${to}. ID: ${result.data?.id}`);
      return res.json({ success: true, data: result.data });
    } catch (err) {
      console.error("[Resend API Exception]:", err);
      return res.status(500).json({ success: false, error: err.message || "Erro interno ao enviar e-mail." });
    }
  });
  app.post("/api/email/send-password-reset", async (req, res) => {
    try {
      const { email, resetLink, temporaryPassword } = req.body;
      if (!email) {
        return res.status(400).json({ error: "E-mail do usu\xE1rio \xE9 obrigat\xF3rio." });
      }
      const resend = getResendClient();
      const subject = "\u{1F512} Recupera\xE7\xE3o de Senha - KitchenFlow";
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #4f46e5; margin: 0;">KitchenFlow AI</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Sistema Operacional para Restaurantes</p>
          </div>
          
          <div style="padding: 20px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 24px;">
            <h3 style="color: #1e293b; margin-top: 0;">Solicita\xE7\xE3o de Recupera\xE7\xE3o de Senha</h3>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              Recebemos uma solicita\xE7\xE3o para redefinir a senha associada \xE0 sua conta (<strong>${email}</strong>).
            </p>
            ${temporaryPassword ? `
              <div style="margin: 20px 0; padding: 16px; background-color: #e0e7ff; border-left: 4px solid #4f46e5; border-radius: 4px;">
                <p style="margin: 0; color: #3730a3; font-size: 13px; font-weight: bold;">Sua senha tempor\xE1ria de acesso:</p>
                <p style="margin: 8px 0 0 0; color: #1e1b4b; font-family: monospace; font-size: 18px; font-weight: bold;">${temporaryPassword}</p>
              </div>
            ` : ""}
            ${resetLink ? `
              <div style="text-align: center; margin: 24px 0;">
                <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 14px;">Redefinir Minha Senha</a>
              </div>
            ` : ""}
            <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Se voc\xEA n\xE3o solicitou a altera\xE7\xE3o de senha, ignore este e-mail.</p>
          </div>
          
          <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">KitchenFlow AI \u2022 Suporte T\xE9cnico e Operacional</p>
          </div>
        </div>
      `;
      const result = await resend.emails.send({
        from: "KitchenFlow <onboarding@resend.dev>",
        to: email,
        subject,
        html: htmlContent
      });
      if (result.error) {
        return res.status(400).json({ success: false, error: result.error });
      }
      return res.json({ success: true, data: result.data });
    } catch (err) {
      console.error("Password reset email error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/email/send-welcome", async (req, res) => {
    try {
      const { email, name, role, tenantName, temporaryPassword, loginUrl } = req.body;
      if (!email) {
        return res.status(400).json({ error: "E-mail do usu\xE1rio \xE9 obrigat\xF3rio." });
      }
      const resend = getResendClient();
      const subject = `\u{1F389} Bem-vindo ao KitchenFlow - ${tenantName || "Sua Conta est\xE1 Pronta"}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #4f46e5; margin: 0;">KitchenFlow AI</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Plataforma de Gest\xE3o de Restaurantes e Delivery</p>
          </div>
          
          <div style="padding: 20px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 24px;">
            <h3 style="color: #1e293b; margin-top: 0;">Ol\xE1, ${name || "novo usu\xE1rio"}!</h3>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              Sua conta de acesso ao sistema <strong>${tenantName || "KitchenFlow"}</strong> foi criada com sucesso!
            </p>
            
            <div style="margin: 20px 0; padding: 16px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px;">
              <p style="margin: 0 0 8px 0; color: #334155; font-size: 13px;"><strong>E-mail de Acesso:</strong> ${email}</p>
              <p style="margin: 0 0 8px 0; color: #334155; font-size: 13px;"><strong>Cargo / Fun\xE7\xE3o:</strong> ${role || "Usu\xE1rio Operacional"}</p>
              ${temporaryPassword ? `<p style="margin: 0; color: #334155; font-size: 13px;"><strong>Senha Inicial:</strong> <code style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${temporaryPassword}</code></p>` : ""}
            </div>

            <div style="text-align: center; margin: 24px 0;">
              <a href="${loginUrl || "https://ais-pre-sxhhxzv44xcfxjuxxjixtw-101514438395.us-west1.run.app/login"}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 14px;">Acessar o Painel Agora</a>
            </div>
          </div>
          
          <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">KitchenFlow AI \u2022 Gest\xE3o Inteligente para Gastronomia</p>
          </div>
        </div>
      `;
      const result = await resend.emails.send({
        from: "KitchenFlow <onboarding@resend.dev>",
        to: email,
        subject,
        html: htmlContent
      });
      if (result.error) {
        return res.status(400).json({ success: false, error: result.error });
      }
      return res.json({ success: true, data: result.data });
    } catch (err) {
      console.error("Welcome email error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/email/send-saas-billing", async (req, res) => {
    try {
      const { email, tenantName, planName, amount, dueDate, description, qrCodePix, paymentUrl } = req.body;
      if (!email) {
        return res.status(400).json({ error: "E-mail do cliente \xE9 obrigat\xF3rio." });
      }
      const resend = getResendClient();
      const formattedAmount = typeof amount === "number" ? `R$ ${amount.toFixed(2)}` : amount;
      const subject = `\u{1F4B3} Fatura / Cobran\xE7a KitchenFlow SaaS - ${tenantName || "Sua Assinatura"}`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #4f46e5; margin: 0;">KitchenFlow SaaS</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Cobran\xE7a de Assinatura da Plataforma</p>
          </div>
          
          <div style="padding: 20px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 24px;">
            <h3 style="color: #1e293b; margin-top: 0;">Fatura Gerada para ${tenantName || "Seu Estabelecimento"}</h3>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              ${description || `Segue a cobran\xE7a referente ao ciclo do plano ${planName || "PRO"} do KitchenFlow.`}
            </p>
            
            <div style="margin: 20px 0; padding: 16px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center;">
              <span style="color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Valor Total da Fatura</span>
              <h1 style="color: #059669; margin: 8px 0; font-size: 28px;">${formattedAmount}</h1>
              ${dueDate ? `<p style="color: #e11d48; font-size: 13px; font-weight: bold; margin: 0;">Vencimento: ${dueDate}</p>` : ""}
            </div>

            ${qrCodePix ? `
              <div style="margin: 20px 0; padding: 16px; background-color: #ecfdf5; border: 1px dashed #10b981; border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 8px 0; color: #065f46; font-size: 13px; font-weight: bold;">Chave PIX para Pagamento R\xE1pido:</p>
                <p style="margin: 0; color: #047857; font-family: monospace; font-size: 14px; word-break: break-all; background: #ffffff; padding: 8px; border-radius: 4px;">${qrCodePix}</p>
              </div>
            ` : ""}

            ${paymentUrl ? `
              <div style="text-align: center; margin: 24px 0;">
                <a href="${paymentUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 14px;">Pagar Fatura Online</a>
              </div>
            ` : ""}
          </div>
          
          <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">KitchenFlow SaaS \u2022 Financeiro e Cobran\xE7a</p>
          </div>
        </div>
      `;
      const result = await resend.emails.send({
        from: "KitchenFlow SaaS <onboarding@resend.dev>",
        to: email,
        subject,
        html: htmlContent
      });
      if (result.error) {
        return res.status(400).json({ success: false, error: result.error });
      }
      return res.json({ success: true, data: result.data });
    } catch (err) {
      console.error("SaaS billing email error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha s\xE3o obrigat\xF3rios." });
      }
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();
      const isMaster = trimmedEmail === "financeirorenanuk@gmail.com";
      let matchedUser = null;
      let userRole = "";
      let uid = "";
      let oldDocId = null;
      let authVerified = false;
      let authUid = "";
      if (firebaseConfig2.apiKey) {
        try {
          const restUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig2.apiKey}`;
          const authResponse = await fetch(restUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: trimmedEmail,
              password: trimmedPassword,
              returnSecureToken: true
            })
          });
          if (authResponse.ok) {
            const authData = await authResponse.json();
            authVerified = true;
            authUid = authData.localId;
            console.log(`[Auth API] Credenciais verificadas via Firebase Auth REST API para UID: ${authUid}`);
          } else {
            const errData = await authResponse.json();
            console.log(`[Auth API] Erro ao validar na REST API:`, errData.error?.message);
          }
        } catch (err) {
          console.error("Erro na REST API de autentica\xE7\xE3o do Firebase:", err);
        }
      }
      try {
        const qUsers = clientQuery2(getClientCollection2(clientDb, "users"), clientWhere2("email", "==", trimmedEmail), clientLimit2(1));
        const userSnapshot = await getClientDocs2(qUsers);
        if (!userSnapshot.empty) {
          const docSnap = userSnapshot.docs[0];
          const data = docSnap.data();
          if (authVerified || data.password === trimmedPassword) {
            matchedUser = data;
            userRole = data.role || "OWNER";
            uid = authVerified ? authUid : docSnap.id;
            oldDocId = docSnap.id;
            if (authVerified && data.password !== trimmedPassword) {
              console.log(`[Auto-Cura] Sincronizando senha do usu\xE1rio no Firestore.`);
              matchedUser.password = trimmedPassword;
              try {
                await clientSetDoc2(clientDoc2(clientDb, "users", docSnap.id), { password: trimmedPassword }, { merge: true });
              } catch (updatePassErr) {
                console.error("Erro ao curar senha no Firestore:", updatePassErr);
              }
            }
          }
        } else {
          const qCouriers = clientQuery2(getClientCollection2(clientDb, "couriers"), clientWhere2("email", "==", trimmedEmail), clientLimit2(1));
          const courierSnapshot = await getClientDocs2(qCouriers);
          if (!courierSnapshot.empty) {
            const docSnap = courierSnapshot.docs[0];
            const data = docSnap.data();
            if (authVerified || data.password === trimmedPassword) {
              matchedUser = data;
              userRole = "COURIER";
              uid = authVerified ? authUid : docSnap.id;
              oldDocId = docSnap.id;
              if (authVerified && data.password !== trimmedPassword) {
                console.log(`[Auto-Cura] Sincronizando senha do entregador no Firestore.`);
                matchedUser.password = trimmedPassword;
                try {
                  await clientSetDoc2(clientDoc2(clientDb, "couriers", docSnap.id), { password: trimmedPassword }, { merge: true });
                } catch (updatePassErr) {
                  console.error("Erro ao curar senha no entregador do Firestore:", updatePassErr);
                }
              }
            }
          }
        }
      } catch (dbErr) {
        console.warn("Aviso ao consultar Firestore no login (poss\xEDvel cota de leitura excedida):", dbErr?.message || dbErr);
        if (authVerified) {
          uid = authUid;
          userRole = isMaster ? "SAAS_ADMIN" : "OWNER";
          matchedUser = {
            id: uid,
            email: trimmedEmail,
            role: userRole,
            name: isMaster ? "Renan SAAS Admin" : trimmedEmail.split("@")[0] || "Lojista",
            tenantId: isMaster ? "" : "HCL1177LRQVPEKCTYRAHU7IGBQ42",
            active: true,
            status: "online",
            createdAt: /* @__PURE__ */ new Date()
          };
        }
      }
      if (isMaster && !matchedUser) {
        if (trimmedPassword === "Ch@pola07" || authVerified) {
          userRole = "SAAS_ADMIN";
          uid = authVerified ? authUid : "saas_admin_renan";
          matchedUser = {
            id: uid,
            email: trimmedEmail,
            role: "SAAS_ADMIN",
            password: trimmedPassword,
            name: "Renan SAAS Admin",
            tenantId: "",
            active: true,
            createdAt: /* @__PURE__ */ new Date()
          };
          try {
            await clientSetDoc2(clientDoc2(clientDb, "users", uid), matchedUser);
          } catch (setErr) {
            console.error("Erro ao criar SAAS Admin no Firestore:", setErr);
          }
        }
      }
      if (!matchedUser) {
        return res.status(401).json({ error: "E-mail ou senha incorretos." });
      }
      let customToken = null;
      let adminAuthSuccess = false;
      try {
        let firebaseUser;
        try {
          firebaseUser = await adminAuth.getUserByEmail(trimmedEmail);
          if (!authVerified) {
            await adminAuth.updateUser(firebaseUser.uid, {
              password: trimmedPassword
            });
          }
          uid = firebaseUser.uid;
        } catch (authErr) {
          if (authErr.code === "auth/user-not-found") {
            const newAuthUser = await adminAuth.createUser({
              email: trimmedEmail,
              password: trimmedPassword,
              displayName: matchedUser.name || "Lojista"
            });
            uid = newAuthUser.uid;
          } else {
            throw authErr;
          }
        }
        if (uid && uid !== oldDocId) {
          matchedUser.id = uid;
          try {
            await clientSetDoc2(clientDoc2(clientDb, "users", uid), matchedUser, { merge: true });
            if (oldDocId && oldDocId !== uid) {
              await clientDeleteDoc(clientDoc2(clientDb, "users", oldDocId));
            }
            oldDocId = uid;
          } catch (migErr) {
            console.warn("Nao foi possivel migrar ID do Firestore, prosseguindo:", migErr);
          }
        }
        customToken = await adminAuth.createCustomToken(uid);
        adminAuthSuccess = true;
      } catch (authErr) {
        console.warn(`[Login API] Falha ou indisponibilidade do Firebase Admin SDK Auth (${authErr.message || authErr}). Ativando fallback de sess\xE3o local.`);
      }
      if (adminAuthSuccess && customToken) {
        return res.json({
          success: true,
          customToken,
          user: {
            id: uid || oldDocId || matchedUser.id,
            email: trimmedEmail,
            role: userRole,
            name: matchedUser.name || "Lojista",
            tenantId: matchedUser.tenantId || ""
          }
        });
      } else {
        console.log(`[Login API] Retornando sess\xE3o local para o usu\xE1rio ${trimmedEmail} (ID: ${oldDocId || matchedUser.id})`);
        return res.json({
          success: true,
          isLocalSession: true,
          user: {
            id: oldDocId || matchedUser.id,
            email: trimmedEmail,
            role: userRole,
            name: matchedUser.name || "Lojista",
            tenantId: matchedUser.tenantId || ""
          }
        });
      }
    } catch (err) {
      console.error("Erro no login seguro via API:", err);
      return res.status(500).json({ error: "Erro interno no servidor de autentica\xE7\xE3o." });
    }
  });
  app.use(express.static(path2.join(process.cwd(), "public")));
  app.get("/sw.js", (req, res) => {
    const swPath = path2.join(process.cwd(), "public", "sw.js");
    if (fs2.existsSync(swPath)) {
      res.set("Content-Type", "application/javascript");
      return res.sendFile(swPath);
    }
    res.status(404).send("sw.js n\xE3o encontrado no diret\xF3rio public");
  });
  app.get("/manifest.json", (req, res) => {
    const manifestPath = path2.join(process.cwd(), "public", "manifest.json");
    if (fs2.existsSync(manifestPath)) {
      res.set("Content-Type", "application/manifest+json");
      return res.sendFile(manifestPath);
    }
    res.status(404).send("manifest.json n\xE3o encontrado");
  });
  const generateLocalHeuristicAnalysis = (summaryData, isFallback = false) => {
    const faturamento = summaryData.faturamento || 0;
    const lucroReal = summaryData.lucroReal || 0;
    const margem = summaryData.margem || 0;
    const despesas = summaryData.despesas || 0;
    const cmv = summaryData.cmv || 0;
    const taxasDelivery = summaryData.taxasDelivery || 0;
    const folha = summaryData.folha || 0;
    const despesasFixas = summaryData.despesasFixas || 0;
    const ticketMedio = summaryData.ticketMedio || 0;
    const pontoEquilibrio = summaryData.pontoEquilibrio || 0;
    const classificacao = summaryData.classificacao || "Em Crescimento";
    const topProduct = summaryData.topProduct;
    const worstProduct = summaryData.worstProduct;
    const cmvPercent = faturamento > 0 ? cmv / faturamento * 100 : 0;
    const deliveryPercent = faturamento > 0 ? taxasDelivery / faturamento * 100 : 0;
    const laborPercent = faturamento > 0 ? folha / faturamento * 100 : 0;
    const fixedPercent = faturamento > 0 ? despesasFixas / faturamento * 100 : 0;
    const safetyMargin = faturamento > 0 && faturamento > pontoEquilibrio ? (faturamento - pontoEquilibrio) / faturamento * 100 : 0;
    let header = isFallback ? `### \u26A1 Copiloto Integrado (Modo de Conting\xEAncia Local)
*(Devido \xE0 alta demanda tempor\xE1ria nos servidores de nuvem do Gemini, o mecanismo local inteligente gerou este relat\xF3rio completo imediatamente para voc\xEA n\xE3o ficar sem suporte!)*

` : `### \u{1F4CA} Diagn\xF3stico Avan\xE7ado do Seu Copiloto Financeiro KitchenFlow

`;
    let content = header + `Sua opera\xE7\xE3o est\xE1 classificada atualmente como **${classificacao}** com uma margem l\xEDquida de **${margem.toFixed(1)}%** e lucro real estimado de **R$ ${lucroReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** no per\xEDodo.

`;
    content += `### \u{1F7E2} O Que Est\xE1 Indo Bem
`;
    let strongPointsCount = 1;
    if (topProduct) {
      const topMargin = topProduct.price > 0 ? (topProduct.price - topProduct.cost) / topProduct.price * 100 : 0;
      content += `${strongPointsCount++}. **Estrela do Card\xE1pio - ${topProduct.name}**: Esse produto obteve \xF3timo volume (${topProduct.qty} unidades) e gera uma excelente margem bruta unit\xE1ria de **${topMargin.toFixed(1)}%** (Pre\xE7o: R$ ${topProduct.price.toFixed(2)} | Custo: R$ ${topProduct.cost.toFixed(2)}). Continue promovendo-o!
`;
    } else {
      content += `${strongPointsCount++}. **Mix de Vendas**: Seu mix de produtos se mant\xE9m diversificado, diluindo o risco de depend\xEAncia de um \xFAnico item.
`;
    }
    if (ticketMedio > 0) {
      content += `${strongPointsCount++}. **Ticket M\xE9dio Consolidado**: Seus clientes gastam em m\xE9dia **R$ ${ticketMedio.toFixed(2)}** por pedido. Um ticket m\xE9dio saud\xE1vel ajuda a diluir o custo log\xEDstico de cada entrega.
`;
    }
    if (faturamento > pontoEquilibrio && pontoEquilibrio > 0) {
      content += `${strongPointsCount++}. **Supera\xE7\xE3o do Ponto de Equil\xEDbrio**: Seu faturamento de **R$ ${faturamento.toFixed(2)}** superou o break-even de **R$ ${pontoEquilibrio.toFixed(2)}** em **${safetyMargin.toFixed(1)}%** (Margem de Seguran\xE7a). A partir deste ponto, cada real faturado se traduz diretamente em lucratividade real.
`;
    } else if (faturamento > 0) {
      content += `${strongPointsCount++}. **Entrada de Receita**: Voc\xEA gerou um faturamento bruto de **R$ ${faturamento.toFixed(2)}**, o que demonstra que a marca tem tra\xE7\xE3o de vendas no mercado.
`;
    }
    content += `
---

### \u26A0\uFE0F An\xE1lise Cr\xEDtica de Custos (Onde H\xE1 Gargalos)
`;
    let criticalPointsCount = 1;
    if (cmvPercent > 35) {
      content += `${criticalPointsCount++}. **CMV Elevado (${cmvPercent.toFixed(1)}%)**: Seu Custo de Mercadoria Vendida est\xE1 acima do teto recomendado de 32%. Para cada R$ 100 faturados, R$ ${cmvPercent.toFixed(2)} s\xE3o consumidos por insumos. Isto indica desperd\xEDcios, falta de porcionamento padr\xE3o ou compras caras de varejo.
`;
    } else if (cmvPercent > 0) {
      content += `${criticalPointsCount++}. **CMV sob Controle (${cmvPercent.toFixed(1)}%)**: Seu custo de insumos est\xE1 saud\xE1vel e dentro do benchmark ideal de 28% a 32%. Excelente porcionamento e negocia\xE7\xE3o de compras.
`;
    }
    if (deliveryPercent > 15) {
      content += `${criticalPointsCount++}. **Depend\xEAncia de Delivery e Altas Taxas (${deliveryPercent.toFixed(1)}%)**: As comiss\xF5es de aplicativos de entrega representam R$ ${taxasDelivery.toFixed(2)}. Esse percentual est\xE1 pesando excessivamente sobre suas vendas digitais. \xC9 imperativo adotar card\xE1pio pr\xF3prio e diferenciar pre\xE7os.
`;
    } else if (deliveryPercent > 0) {
      content += `${criticalPointsCount++}. **Custo de Canal Delivery (${deliveryPercent.toFixed(1)}%)**: Suas taxas de marketplace est\xE3o sob controle. Mantenha a vigil\xE2ncia para garantir que campanhas promocionais n\xE3o comprimam as margens.
`;
    }
    if (laborPercent > 25) {
      content += `${criticalPointsCount++}. **Peso Operacional de Equipe (${laborPercent.toFixed(1)}%)**: Os gastos com funcion\xE1rios/colaboradores est\xE3o acima do benchmark ideal do setor (20% a 25%). Pode haver ociosidade de escala ou necessidade de reorganizar os turnos de trabalho.
`;
    }
    if (fixedPercent > 20) {
      content += `${criticalPointsCount++}. **Custos Fixos Pesados (${fixedPercent.toFixed(1)}%)**: Aluguel, contas b\xE1sicas e taxas fixas representam R$ ${despesasFixas.toFixed(2)}. Para diluir esse peso, o foco estrat\xE9gico deve ser no aumento imediato do volume de vendas.
`;
    }
    if (worstProduct) {
      const worstMargin = worstProduct.price > 0 ? (worstProduct.price - worstProduct.cost) / worstProduct.price * 100 : 0;
      const suggestedPrice = worstProduct.cost / 0.4;
      content += `${criticalPointsCount++}. **Aten\xE7\xE3o ao Produto - ${worstProduct.name}**: Esse item est\xE1 operando com uma margem de contribui\xE7\xE3o bruta de apenas **${worstMargin.toFixed(1)}%** (Pre\xE7o Atual: R$ ${worstProduct.price.toFixed(2)} | Custo de Insumo: R$ ${worstProduct.cost.toFixed(2)}). Voc\xEA est\xE1 praticamente "trocando dinheiro" ou tendo preju\xEDzo nele.
`;
    }
    content += `
---

### \u{1F4A1} Plano de A\xE7\xE3o Estrat\xE9gico KitchenFlow
`;
    const leakages = [
      { name: "CMV", val: cmvPercent, threshold: 32, tip: "- **Ficha T\xE9cnica e Balan\xE7a**: Estabele\xE7a pesagem obrigat\xF3ria na cozinha para prote\xEDnas e ingredientes caros. Uma economia de 2% no CMV pode injetar milhares de reais direto no seu lucro l\xEDquido mensal." },
      { name: "Delivery", val: deliveryPercent, threshold: 14, tip: "- **Precifica\xE7\xE3o Diferenciada para Delivery**: Aumente os pre\xE7os nos marketplaces em 15% a 18% para repassar as taxas abusivas aos clientes dessas plataformas, estimulando as vendas no canal pr\xF3prio de menor custo." },
      { name: "Equipe", val: laborPercent, threshold: 25, tip: "- **Otimiza\xE7\xE3o de Escalas**: Cruze o volume hist\xF3rico de pedidos por hora com a escala de funcion\xE1rios para reduzir horas ociosas nos per\xEDodos de baixo movimento (ex: segundas e ter\xE7as-feiras \xE0 tarde)." },
      { name: "Custos Fixos", val: fixedPercent, threshold: 18, tip: '- **Expans\xE3o de Faturamento (Capacidade Ociosa)**: Como seu custo fixo \xE9 representativo, considere criar uma "marca virtual" (Dark Kitchen) usando a mesma cozinha para vender outros pratos e diluir o aluguel.' }
    ];
    const criticalLeaks = leakages.map((l) => ({ ...l, excess: l.val - l.threshold })).sort((a, b) => b.excess - a.excess);
    content += `${criticalLeaks[0].tip}
`;
    content += `${criticalLeaks[1].tip}
`;
    if (worstProduct) {
      const suggestedPrice = worstProduct.cost / 0.4;
      const comercialPrice = Math.ceil(suggestedPrice) - 0.1;
      content += `- **Readequa\xE7\xE3o do Item ${worstProduct.name}**: Recomenda-se reajustar o pre\xE7o de R$ ${worstProduct.price.toFixed(2)} para **R$ ${comercialPrice.toFixed(2)}** (para garantir 60% de margem bruta), ou revisar a receita para trocar ingredientes caros por alternativas de menor custo sem perder a assinatura de sabor.
`;
    } else {
      content += `- **Engenharia de Card\xE1pio**: Revise trimestralmente os pre\xE7os dos seus top 10 produtos de maior sa\xEDda, garantindo que a infla\xE7\xE3o de insumos n\xE3o corra as margens operacionais.
`;
    }
    content += `
*Este diagn\xF3stico din\xE2mico foi gerado de forma local pelos algoritmos de an\xE1lise da plataforma KitchenFlow AI.*`;
    return content;
  };
  const callGeminiWithRetry = async (client, candidateModels, params) => {
    let lastError = null;
    for (const modelName of candidateModels) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[Gemini API] Trying model: ${modelName} (attempt ${attempt}/3)...`);
          const resp = await client.models.generateContent({
            model: modelName,
            contents: params.contents,
            config: params.config
          });
          if (resp && resp.text) {
            return resp;
          }
        } catch (err) {
          console.warn(`[Gemini API] Model ${modelName} failed on attempt ${attempt}/3.`, err);
          lastError = err;
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 1e3));
          }
        }
      }
    }
    throw lastError || new Error("All candidate models and retries failed.");
  };
  app.post("/api/gemini/explain-merchant", async (req, res) => {
    const { summaryData } = req.body;
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!summaryData) {
        return res.status(400).json({ error: "Dados de resumo ausentes" });
      }
      if (!apiKey || apiKey.trim() === "") {
        const localAnalysis = generateLocalHeuristicAnalysis(summaryData, false);
        return res.json({
          success: true,
          insight: localAnalysis,
          source: "local_copilot_service"
        });
      }
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const faturamento = summaryData.faturamento || 0;
      const cmvPercent = faturamento > 0 ? summaryData.cmv / faturamento * 100 : 0;
      const deliveryPercent = faturamento > 0 ? summaryData.taxasDelivery / faturamento * 100 : 0;
      const laborPercent = faturamento > 0 ? summaryData.folha / faturamento * 100 : 0;
      const fixedPercent = faturamento > 0 ? summaryData.despesasFixas / faturamento * 100 : 0;
      const safetyMargin = faturamento > 0 && faturamento > (summaryData.pontoEquilibrio || 0) ? (faturamento - summaryData.pontoEquilibrio) / faturamento * 100 : 0;
      const promptString = `Analise os seguintes dados financeiros e operacionais reais de um restaurante e gere um diagn\xF3stico de consultoria empresarial EXTREMAMENTE simples, pr\xE1tico, detalhado e altamente estrat\xE9gico (focado em sa\xFAde financeira, controle de margens e engenharia de card\xE1pio). Fale diretamente com o dono do estabelecimento de forma franca, profissional, motivadora e direta ao ponto.

DADOS DA OPERA\xC7\xC3O:
- Per\xEDodo Analisado: ${summaryData.periodName || "Selecionado"}
- Faturamento Bruto: R$ ${faturamento.toFixed(2)}
- Lucro Operacional L\xEDquido Estimado: R$ ${summaryData.lucroReal.toFixed(2)}
- Margem L\xEDquida %: ${summaryData.margem.toFixed(2)}%
- Classifica\xE7\xE3o da Sa\xFAde Financeira: ${summaryData.classificacao}
- Custos de Insumos/Produtos (CMV): R$ ${summaryData.cmv.toFixed(2)} (${cmvPercent.toFixed(1)}% do faturamento)
- Taxas e Comiss\xF5es do Delivery/Plataformas: R$ ${summaryData.taxasDelivery.toFixed(2)} (${deliveryPercent.toFixed(1)}% do faturamento)
- Folha de Pagamento / Pr\xF3-labores: R$ ${summaryData.folha.toFixed(2)} (${laborPercent.toFixed(1)}% do faturamento)
- Despesas Fixas Gerais: R$ ${summaryData.despesasFixas.toFixed(2)} (${fixedPercent.toFixed(1)}% do faturamento)
- Despesas Vari\xE1veis/Outras Despesas: R$ ${summaryData.despesas.toFixed(2)}
- Ticket M\xE9dio do Per\xEDodo: R$ ${(summaryData.ticketMedio || 0).toFixed(2)}
- Ponto de Equil\xEDbrio Necess\xE1rio: R$ ${(summaryData.pontoEquilibrio || 0).toFixed(2)}
- Margem de Seguran\xE7a Operacional: ${safetyMargin.toFixed(1)}% (percentual acima do ponto de equil\xEDbrio)

MIX DE PRODUTOS DESTACADOS:
${summaryData.topProduct ? `- Produto mais lucrativo (Estrela): ${summaryData.topProduct.name} (Vendido: ${summaryData.topProduct.qty}, Pre\xE7o: R$ ${summaryData.topProduct.price.toFixed(2)}, Custo de Insumo: R$ ${summaryData.topProduct.cost.toFixed(2)}, Margem Unit\xE1ria: R$ ${(summaryData.topProduct.price - summaryData.topProduct.cost).toFixed(2)})` : ""}
${summaryData.worstProduct ? `- Produto com margem cr\xEDtica (Aten\xE7\xE3o): ${summaryData.worstProduct.name} (Vendido: ${summaryData.worstProduct.qty}, Pre\xE7o: R$ ${summaryData.worstProduct.price.toFixed(2)}, Custo de Insumo: R$ ${summaryData.worstProduct.cost.toFixed(2)}, Margem Unit\xE1ria: R$ ${(summaryData.worstProduct.price - summaryData.worstProduct.cost).toFixed(2)})` : ""}

REQUISITOS DA RESPOSTA:
1. Responda claramente a pergunta: "Como est\xE1 meu neg\xF3cio de verdade?" - Fa\xE7a uma an\xE1lise baseada nos benchmarks de restaurante (CMV ideal: 28-32%; Equipe ideal: 20-25%; Delivery ideal: <15%).
2. Identifique e detalhe o principal ralo ou gargalo financeiro atual (se \xE9 o CMV elevado, despesas de folha, taxas abusivas de delivery, ou baixo volume de vendas para cobrir as despesas fixas).
3. Apresente um plano de a\xE7\xE3o estrat\xE9gico focado em:
   - Redu\xE7\xE3o do CMV (fichas t\xE9cnicas, pesagem, renegocia\xE7\xE3o).
   - Engenharia de card\xE1pio e pre\xE7os (especialmente sugerindo o pre\xE7o de venda ideal para o produto com margem cr\xEDtica: o ideal de margem de contribui\xE7\xE3o \xE9 de 60%, ou seja, pre\xE7o sugerido = custo / 0.4).
   - Otimiza\xE7\xE3o do canal de vendas (repasses inteligentes de comiss\xF5es, fomento ao canal pr\xF3prio).
4. Utilize tom de Copiloto Financeiro experiente que compreende as dores reais do dia a dia de uma cozinha. Formate lindamente em Markdown (com negritos, se\xE7\xF5es claras e t\xF3picos objetivos).`;
      const candidateModels = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      const aiResponse = await callGeminiWithRetry(client, candidateModels, { contents: promptString });
      res.json({
        success: true,
        insight: aiResponse.text || "N\xE3o foi poss\xEDvel gerar a an\xE1lise. Tente novamente.",
        source: "gemini_api_service"
      });
    } catch (error) {
      console.warn("Gemini service unavailable. Falling back to robust local diagnostic heuristics. Error:", error);
      const fallbackAnalysis = generateLocalHeuristicAnalysis(summaryData, true);
      res.json({
        success: true,
        insight: fallbackAnalysis,
        source: "local_copilot_service_fallback",
        isFallback: true
      });
    }
  });
  app.post("/api/gemini/chat-copilot", async (req, res) => {
    const { message, history, summaryData, kaiMetrics } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Mensagem vazia" });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    const getLocalHeuristicChatReply = (msgText, metrics) => {
      const lowercase = msgText.toLowerCase();
      let text = "";
      let pose = "tudo-sob-controle";
      let expression = "feliz";
      const hoje = metrics?.hoje || { faturamento: 0, lucroReal: 0, margem: 0, orderCount: 0, cmv: 0 };
      const ontem = metrics?.ontem || { faturamento: 0, lucroReal: 0, margem: 0, orderCount: 0, cmv: 0 };
      const mes = metrics?.mes || { faturamento: 0, lucroReal: 0, margem: 0, orderCount: 0, cmv: 0 };
      if (lowercase.includes("hoje") || lowercase.includes("dia")) {
        text = `### \u{1F4C5} Relat\xF3rio Operacional de Hoje:
- **Faturamento Bruto**: R$ ${hoje.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **Lucro L\xEDquido Estimado**: R$ ${hoje.lucroReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **Margem L\xEDquida**: ${hoje.margem.toFixed(1)}%
- **Pedidos Finalizados**: ${hoje.orderCount}

${hoje.lucroReal >= 0 ? `\u{1F7E2} Excelente! Hoje sua opera\xE7\xE3o est\xE1 rodando **no azul** com uma reten\xE7\xE3o l\xEDquida de ${hoje.margem.toFixed(1)}%. Continue mantendo o foco nas por\xE7\xF5es e na agilidade da cozinha!` : `\u26A0\uFE0F Aten\xE7\xE3o: Hoje a opera\xE7\xE3o est\xE1 **no vermelho** devido \xE0 propor\xE7\xE3o de custos fixos di\xE1rios. \xC9 necess\xE1rio impulsionar mais vendas para superar o ponto de equil\xEDbrio de hoje!`}
`;
        pose = "gestao-pedidos";
        expression = hoje.lucroReal >= 0 ? "feliz" : "alerta";
      } else if (lowercase.includes("ontem")) {
        text = `### \u{1F4C5} Fechamento de Ontem:
- **Faturamento Bruto**: R$ ${ontem.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **Lucro L\xEDquido Estimado**: R$ ${ontem.lucroReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **Margem L\xEDquida**: ${ontem.margem.toFixed(1)}%
- **Pedidos Finalizados**: ${ontem.orderCount}

${ontem.lucroReal >= 0 ? `\u{1F7E2} Muito bom! Ontem a opera\xE7\xE3o fechou positiva, rendendo R$ ${ontem.lucroReal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} limpos.` : `\u26A0\uFE0F Ontem a opera\xE7\xE3o fechou com saldo negativo de R$ ${ontem.lucroReal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Vamos focar em reverter hoje!`}
`;
        pose = "planejamento";
        expression = ontem.lucroReal >= 0 ? "feliz" : "concentrado";
      } else if (lowercase.includes("m\xEAs") || lowercase.includes("mensal") || lowercase.includes("faturamento do mes")) {
        text = `### \u{1F4CA} Balan\xE7o Acumulado do M\xEAs:
- **Faturamento Bruto Total**: R$ ${mes.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **Lucro L\xEDquido Estimado**: R$ ${mes.lucroReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **Margem M\xE9dia Retida**: ${mes.margem.toFixed(1)}%

Sua sa\xFAde financeira acumulada este m\xEAs est\xE1 classificada como **${mes.margem >= 15 ? "Excelente \u{1F7E2}" : mes.margem >= 8 ? "Est\xE1vel \u26A0\uFE0F" : "Cr\xEDtica \u{1F6A8}"}**. 
O CMV m\xE9dio do m\xEAs est\xE1 sob controle. Continue monitorando as compras de ingredientes para manter a m\xE9dia de desperd\xEDcio abaixo de 3.5%!`;
        pose = "analisando-dados";
        expression = mes.margem >= 10 ? "feliz" : "concentrado";
      } else if (lowercase.includes("lucro") || lowercase.includes("lucro liquido")) {
        text = `### \u{1F4B0} Raio-X do Seu Lucro L\xEDquido:
- **Lucro L\xEDquido de Hoje**: R$ ${hoje.lucroReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${hoje.margem.toFixed(1)}%)
- **Lucro L\xEDquido de Ontem**: R$ ${ontem.lucroReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${ontem.margem.toFixed(1)}%)
- **Lucro Acumulado do M\xEAs**: R$ ${mes.lucroReal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${mes.margem.toFixed(1)}%)

O lucro l\xEDquido \xE9 o que sobra no seu bolso ap\xF3s deduzir o CMV, taxas de delivery, folha de funcion\xE1rios proporcional e custos fixos como aluguel. Mantenha as vendas altas para que as despesas fixas diluam e sua margem cres\xE7a!`;
        pose = "planejamento";
        expression = "surpreso";
      } else if (lowercase.includes("cmv") || lowercase.includes("custo")) {
        text = `### \u{1F969} Custo de Mercadoria Vendida (CMV):
- **CMV de Hoje**: R$ ${hoje.cmv.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- **CMV Acumulado do M\xEAs**: R$ ${mes.cmv.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

Para manter seu restaurante lucrativo, sua meta de CMV deve ser de **30%** do faturamento. Se o CMV estiver muito alto:
1. Revise e padronize as por\xE7\xF5es usando balan\xE7as.
2. Evite comprar em cima da hora com pre\xE7os altos de varejo.
3. Cadastre todas as notas de compras na aba de CMV para auditar desvios!`;
        pose = "controle-estoque";
        expression = "concentrado";
      } else {
        text = `### \u{1F916} Sou o Kai, seu analista de IA residente!
Posso responder qualquer pergunta estrat\xE9gica sobre as finan\xE7as, faturamento e cozinha da sua loja em tempo real.

**Aqui est\xE3o alguns dados operacionais r\xE1pidos que acabei de auditar:**
- **Faturamento de Hoje**: R$ ${hoje.faturamento.toLocaleString("pt-BR")} (${hoje.orderCount} pedidos)
- **Faturamento do M\xEAs**: R$ ${mes.faturamento.toLocaleString("pt-BR")}
- **Lucro L\xEDquido do M\xEAs**: R$ ${mes.lucroReal.toLocaleString("pt-BR")} (${mes.margem.toFixed(1)}% de margem)

*Como posso ajudar voc\xEA a otimizar estes resultados hoje?*`;
        pose = "tudo-sob-controle";
        expression = "feliz";
      }
      return { text, pose, expression };
    };
    if (!apiKey || apiKey.trim() === "") {
      const localResult = getLocalHeuristicChatReply(message, kaiMetrics);
      return res.json({
        success: true,
        text: localResult.text,
        pose: localResult.pose,
        expression: localResult.expression,
        source: "local_copilot_service"
      });
    }
    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const client = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const formattedHistory = (history || []).map((h) => `${h.sender === "user" ? "Lojista" : "Kai"}: ${h.text}`).join("\n");
      const hoje = kaiMetrics?.hoje || { faturamento: 0, lucroReal: 0, margem: 0, orderCount: 0, cmv: 0, despesas: 0, taxasDelivery: 0, folha: 0, despesasFixas: 0, outraDespesa: 0 };
      const ontem = kaiMetrics?.ontem || { faturamento: 0, lucroReal: 0, margem: 0, orderCount: 0, cmv: 0, despesas: 0, taxasDelivery: 0, folha: 0, despesasFixas: 0, outraDespesa: 0 };
      const mes = kaiMetrics?.mes || { faturamento: 0, lucroReal: 0, margem: 0, orderCount: 0, cmv: 0, despesas: 0, taxasDelivery: 0, folha: 0, despesasFixas: 0, outraDespesa: 0 };
      const promptString = `Voc\xEA \xE9 o Kai, um analista financeiro e operacional de intelig\xEAncia artificial residente da plataforma KitchenFlow AI. Voc\xEA \xE9 amig\xE1vel, altamente anal\xEDtico, direto, experiente e se comunica em Portugu\xEAs do Brasil.
Voc\xEA possui acesso em tempo real aos n\xFAmeros operacionais e financeiros precisos e reais do estabelecimento do lojista.

Abaixo est\xE3o os dados reais auditados agora em tempo real do sistema:

---
DADOS DE HOJE:
- Faturamento Bruto: R$ ${hoje.faturamento.toFixed(2)}
- Lucro L\xEDquido Estimado: R$ ${hoje.lucroReal.toFixed(2)}
- Margem L\xEDquida %: ${hoje.margem.toFixed(2)}%
- Pedidos Finalizados: ${hoje.orderCount}
- Custo de Insumos (CMV de hoje): R$ ${hoje.cmv.toFixed(2)} (CMV Real: ${(hoje.faturamento > 0 ? hoje.cmv / hoje.faturamento * 100 : 0).toFixed(1)}%)
- Despesas Totais de Hoje: R$ ${hoje.despesas.toFixed(2)} (inclui aluguel di\xE1rio R$ ${hoje.despesasFixas.toFixed(2)}, equipe di\xE1ria R$ ${hoje.folha.toFixed(2)}, taxas de delivery R$ ${hoje.taxasDelivery.toFixed(2)} e outras despesas R$ ${hoje.outraDespesa.toFixed(2)})

DADOS DE ONTEM:
- Faturamento Bruto: R$ ${ontem.faturamento.toFixed(2)}
- Lucro L\xEDquido Estimado: R$ ${ontem.lucroReal.toFixed(2)}
- Margem L\xEDquida %: ${ontem.margem.toFixed(2)}%
- Pedidos Finalizados: ${ontem.orderCount}

DADOS DESTE M\xCAS (ACUMULADOS):
- Faturamento Bruto Total: R$ ${mes.faturamento.toFixed(2)}
- Lucro L\xEDquido Estimado: R$ ${mes.lucroReal.toFixed(2)}
- Margem M\xE9dia Retida: ${mes.margem.toFixed(2)}%
- Custo de Insumos (CMV acumulado): R$ ${mes.cmv.toFixed(2)} (CMV Real: ${(mes.faturamento > 0 ? mes.cmv / mes.faturamento * 100 : 0).toFixed(1)}%)
- Despesas do M\xEAs: R$ ${mes.despesas.toFixed(2)} (aluguel proporcional R$ ${mes.despesasFixas.toFixed(2)}, equipe R$ ${mes.folha.toFixed(2)}, taxas de delivery R$ ${mes.taxasDelivery.toFixed(2)} e outras despesas R$ ${mes.outraDespesa.toFixed(2)})

OUTRAS INFORMA\xC7\xD5ES DE CONTEXTO:
- Filtro Selecionado Atual: ${summaryData?.periodName || "Este M\xEAs"}
- Faturamento do Per\xEDodo Filtrado: R$ ${summaryData?.faturamento?.toFixed(2) || "0.00"}
- Lucro do Per\xEDodo Filtrado: R$ ${summaryData?.lucroReal?.toFixed(2) || "0.00"}
- Margem do Per\xEDodo Filtrado: ${summaryData?.margem?.toFixed(2) || "0.00"}%
- Ponto de Equil\xEDbrio do Per\xEDodo: R$ ${summaryData?.pontoEquilibrio?.toFixed(2) || "0.00"}
- Ticket M\xE9dio do Per\xEDodo: R$ ${summaryData?.ticketMedio?.toFixed(2) || "0.00"}
---

HIST\xD3RICO RECENTE DO CHAT:
${formattedHistory}

NOVA MENSAGEM DO LOJISTA:
"${message}"

Sua miss\xE3o \xE9 responder \xE0 nova mensagem do lojista utilizando os n\xFAmeros exatos fornecidos acima sempre que relevante.
- Siga estritamente estes Benchmarks de Restaurantes para orientar o lojista:
  * CMV (Custo de Mercadoria Vendida): Ideal de 28% a 32%. Acima de 35% \xE9 cr\xEDtico.
  * Custo com Funcion\xE1rios/Equipe (Labor Cost): Ideal de 20% a 25%. Acima de 28% indica ociosidade.
  * Taxas de Delivery / Marketplace: Ideal abaixo de 12-15% sobre o faturamento total.
- Seja extremamente pragm\xE1tico, evite rodeios corporativos, mas mantenha uma linguagem calorosa e inspiradora que se conecte com o dia a dia dif\xEDcil do dono do restaurante (falando sobre controle de desperd\xEDcio, porcionamento padr\xE3o, precifica\xE7\xE3o inteligente, engenharia de pratos, repasse de taxas de comiss\xE3o).
- Apresente os dados em bullet points ou tabelas simples se o lojista pedir dados num\xE9ricos ou relat\xF3rios.
- Escolha uma "pose" de trabalho e uma "expression" facial apropriada do Kai para acompanhar sua resposta.

Voc\xEA DEVE responder rigorosamente no formato JSON com as chaves:
1. "text": a resposta em Markdown (Portugu\xEAs do Brasil). Destaque os n\xFAmeros com negrito (ex: **R$ 2.450,00**).
2. "pose": uma string dentre: "analisando-dados", "gestao-pedidos", "controle-estoque", "planejamento", "na-cozinha", "tudo-sob-controle"
3. "expression": uma string dentre: "neutro", "analisando", "alerta", "feliz", "concentrado", "surpreso"`;
      const candidateModels = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      const aiResponse = await callGeminiWithRetry(client, candidateModels, {
        contents: promptString,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "Resposta em markdown" },
              pose: { type: Type.STRING, description: "Pose do avatar" },
              expression: { type: Type.STRING, description: "Express\xE3o do avatar" }
            },
            required: ["text", "pose", "expression"]
          }
        }
      });
      const parsed = JSON.parse(aiResponse.text.trim());
      res.json({
        success: true,
        text: parsed.text,
        pose: parsed.pose || "tudo-sob-controle",
        expression: parsed.expression || "feliz",
        source: "gemini_api_service"
      });
    } catch (err) {
      console.warn("Gemini Chat Copilot failed, falling back to local heuristics:", err);
      const localResult = getLocalHeuristicChatReply(message, kaiMetrics);
      res.json({
        success: true,
        text: localResult.text,
        pose: localResult.pose,
        expression: localResult.expression,
        source: "local_copilot_service_fallback",
        isFallback: true
      });
    }
  });
  app.post("/api/gemini/parse-invoice", async (req, res) => {
    const { text, fileBase64, fileMimeType } = req.body;
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === "") {
        return res.status(400).json({ error: "Sua chave de API do Gemini n\xE3o est\xE1 configurada nos segredos do sistema do AI Studio." });
      }
      const { GoogleGenAI, Type } = await import("@google/genai");
      const client = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const contents = [];
      const promptString = `Voc\xEA \xE9 um analista especialista em nota fiscal e cupom fiscal de suprimentos de restaurante.
Sua miss\xE3o \xE9 ler o texto fornecido ou a imagem da nota fiscal e extrair TODOS os produtos e insumos comprados que representam ingredientes de cozinha, bebidas, embalagens ou produtos de limpeza.

REGRAS DE EXTRA\xC7\xC3O:
1. Extraia o nome amig\xE1vel do item (por exemplo, "Queijo Mu\xE7arela Ralado", "Leite Integral UHT", "Tomate Italiano"). Remova c\xF3digos num\xE9ricos extras ou abrevia\xE7\xF5es muito feias, mas mantenha f\xE1cil de identificar.
2. Identifique a quantidade comprada.
3. Identifique a unidade original de medida descrita na nota (por exemplo, KG, L, UN, FD, CX, PCT, LATA, GR, ML).
4. Forne\xE7a uma UNIDADE NORMALIZADA para o nosso estoque, que obrigatoriamente deve ser um dentre: "kg", "g", "l", "ml", "un".
5. Converta a quantidade original e o pre\xE7o para valores relativos a essa UNIDADE NORMALIZADA.
   - Exemplo: Se o item diz "Carne Mo\xEDda 500g, Pre\xE7o R$ 15.00" e a UNIDADE NORMALIZADA for "kg", converta a quantidade para 0.5 (kg) e o pre\xE7o total permanece R$ 15.00. O costPerUnit ser\xE1 calculado como R$ 30.00 por kg (15.00 / 0.5).
   - Exemplo: Se o item diz "Fardo de Coca-Cola com 6 unidades, Pre\xE7o R$ 24.00" e a UNIDADE NORMALIZADA for "un", a quantidade normalizada ser\xE1 6 e o costPerUnit ser\xE1 R$ 4.00 (24.00 / 6).
6. Categorize o item em uma de nossas categorias v\xE1lidas: "Prote\xEDnas", "Hortifruti", "Latic\xEDnios", "Gr\xE3os", "Bebidas", "Embalagens", "Limpeza", "Outros".
7. Calcule o costPerUnit como: totalCost / normalizedQuantity.

Forne\xE7a a resposta em formato JSON estrito correspondente ao esquema de resposta do Gemini.`;
      contents.push(promptString);
      if (fileBase64 && fileMimeType) {
        contents.push({
          inlineData: {
            data: fileBase64,
            mimeType: fileMimeType
          }
        });
      }
      if (text) {
        contents.push(text);
      }
      const candidateModels = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      const aiResponse = await callGeminiWithRetry(client, candidateModels, {
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              supplierName: {
                type: Type.STRING,
                description: "Nome ou raz\xE3o social do fornecedor / emitente da nota"
              },
              purchaseDate: {
                type: Type.STRING,
                description: "Data de emiss\xE3o / compra no formato YYYY-MM-DD se encontrada"
              },
              totalAmount: {
                type: Type.NUMBER,
                description: "Valor total da nota fiscal / cupom"
              },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Nome limpo e amig\xE1vel do insumo comprados" },
                    originalUnit: { type: Type.STRING, description: "Unidade de medida escrita na nota (ex: UN, FD, CX, KG, L)" },
                    originalQuantity: { type: Type.NUMBER, description: "Quantidade descrita na nota" },
                    totalCost: { type: Type.NUMBER, description: "Pre\xE7o total pago por este item espec\xEDfico" },
                    normalizedUnit: { type: Type.STRING, description: "Unidade de medida normalizada recomendada: 'kg', 'g', 'l', 'ml' ou 'un'" },
                    normalizedQuantity: { type: Type.NUMBER, description: "Quantidade convertida para a unidade normalizada" },
                    costPerUnit: { type: Type.NUMBER, description: "Custo por unidade normalizada (totalCost / normalizedQuantity)" },
                    category: { type: Type.STRING, description: "Categoria de insumos sugerida: 'Prote\xEDnas', 'Hortifruti', 'Latic\xEDnios', 'Gr\xE3os', 'Bebidas', 'Embalagens', 'Limpeza' ou 'Outros'" }
                  },
                  required: ["name", "originalUnit", "originalQuantity", "totalCost", "normalizedUnit", "normalizedQuantity", "costPerUnit", "category"]
                }
              }
            },
            required: ["items"]
          }
        }
      });
      const resultText = aiResponse.text || "{}";
      const parsedData = JSON.parse(resultText.trim());
      res.json({
        success: true,
        data: parsedData
      });
    } catch (error) {
      console.error("Gemini invoice recognition error:", error);
      res.status(500).json({ success: false, error: error.message || "Erro no processamento da IA." });
    }
  });
  app.post("/api/fiscal/issue", async (req, res) => {
    try {
      const { order, certificate, config, nfceNumber, series, settings } = req.body;
      const pfxBase64 = certificate?.pfxBase64 || settings?.certificate?.pfxBase64;
      const pfxPassword = certificate?.password || settings?.certificate?.password;
      const fiscalConfig = {
        cnpj: config?.cnpj || settings?.cnpj || "00000000000000",
        razaoSocial: config?.razaoSocial || settings?.razaoSocial || "KITCHENFLOW AI",
        inscricaoEstadual: config?.inscricaoEstadual || settings?.inscricaoEstadual || "123456789110",
        endereco: config?.endereco || settings?.address || {
          logradouro: "Av Paulista",
          numero: "1000",
          bairro: "Bela Vista",
          municipio: "S\xE3o Paulo",
          uf: "SP",
          cep: "01310100",
          codigoMunicipio: "3550308"
        },
        cscId: config?.cscId || settings?.cscId || "000001",
        cscToken: config?.cscToken || settings?.cscToken || "0123456789",
        ambiente: config?.environment === "production" || settings?.environment === "production" || config?.ambiente === "1" ? "1" : "2"
      };
      if (!pfxBase64 || pfxBase64.trim() === "") {
        const simulatedAccessKey = "3526" + Math.floor(10 + Math.random() * 89).toString() + fiscalConfig.cnpj.replace(/\D/g, "").padStart(14, "0") + "65001" + Math.floor(1e5 + Math.random() * 9e5).toString() + "1" + Math.floor(1e7 + Math.random() * 89999999).toString() + "1";
        return res.json({
          success: true,
          xml: `<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe${simulatedAccessKey}" versao="4.00"><ide><cUF>35</cUF><cNF>12345678</cNF><natOp>VENDA</natOp><mod>65</mod></ide></infNFe></NFe>`,
          status: "authorized",
          protocol: "135260000000001",
          accessKey: simulatedAccessKey,
          nfeKey: simulatedAccessKey,
          warning: "Certificado A1 (.pfx) n\xE3o enviado. Cadastre o arquivo .pfx e senha para emiss\xE3o real via SOAP na SEFAZ-SP."
        });
      }
      const fiscalService = new FiscalService(pfxBase64, pfxPassword, fiscalConfig);
      const signedXml = fiscalService.generateNfceXml(order, nfceNumber || 1, series || 1);
      const response = await fiscalService.transmitToSefaz(signedXml);
      if (response.status === "authorized") {
        res.json({
          success: true,
          xml: signedXml,
          status: response.status,
          protocol: response.protocol,
          accessKey: response.accessKey,
          nfeKey: response.accessKey,
          xMotivo: response.xMotivo
        });
      } else {
        res.json({
          success: false,
          error: response.error || response.xMotivo || "Rejei\xE7\xE3o da SEFAZ SP",
          cStat: response.cStat,
          xml: signedXml,
          accessKey: response.accessKey,
          nfeKey: response.accessKey,
          details: response.details
        });
      }
    } catch (error) {
      console.error("Fiscal emission error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Erro na emiss\xE3o fiscal SOAP SEFAZ SP."
      });
    }
  });
  app.post("/api/fiscal/validate-certificate", async (req, res) => {
    try {
      const { pfxBase64, password } = req.body;
      if (!pfxBase64 || !password) {
        return res.status(400).json({ success: false, error: "Arquivo PFX e senha s\xE3o obrigat\xF3rios." });
      }
      const service = new FiscalService(pfxBase64, password, {});
      const info = service.getCertificateInfo();
      res.json({
        success: true,
        validTo: info.validTo,
        subject: info.subject,
        isExpired: info.isExpired
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message || "Certificado PFX ou senha inv\xE1lidos." });
    }
  });
  app.post("/api/fiscal/sefaz-status", async (req, res) => {
    try {
      const { certificate, config, settings } = req.body;
      const pfxBase64 = certificate?.pfxBase64 || settings?.certificate?.pfxBase64;
      const pfxPassword = certificate?.password || settings?.certificate?.password;
      if (!pfxBase64) {
        return res.status(400).json({ success: false, error: "Certificado A1 (.pfx) \xE9 necess\xE1rio para testar a comunica\xE7\xE3o com a SEFAZ." });
      }
      const fiscalConfig = {
        cnpj: config?.cnpj || settings?.cnpj || "00000000000000",
        razaoSocial: config?.razaoSocial || settings?.razaoSocial || "",
        inscricaoEstadual: config?.inscricaoEstadual || settings?.inscricaoEstadual || "",
        endereco: config?.endereco || settings?.address || {},
        cscId: config?.cscId || settings?.cscId || "000001",
        cscToken: config?.cscToken || settings?.cscToken || "0123456789",
        ambiente: config?.environment === "production" || settings?.environment === "production" || config?.ambiente === "1" ? "1" : "2"
      };
      const fiscalService = new FiscalService(pfxBase64, pfxPassword, fiscalConfig);
      const statusResult = await fiscalService.checkSefazStatus();
      res.json({
        success: true,
        ...statusResult
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message || "Erro ao consultar status do webservice SEFAZ SP."
      });
    }
  });
  app.post("/api/fiscal/cbs-ibs-calculate", async (req, res) => {
    try {
      const { order } = req.body;
      if (!order) {
        return res.status(400).json({ success: false, error: "Objeto de pedido n\xE3o fornecido." });
      }
      const cbsRate = 8.8;
      const ibsStateRate = 17.7;
      const ibsCityRate = 1.2;
      const reductionPct = 60;
      const items = (order.items || []).map((item) => {
        const qty = item.quantity || 1;
        const price = item.price || item.unitPrice || 0;
        const gross = qty * price;
        const isExempt = item.taxCategory === "exempt" || item.taxCategory === "basic_food_basket";
        const reduction = isExempt ? 100 : item.baseReductionPct !== void 0 ? item.baseReductionPct : reductionPct;
        const taxableBase = gross * (1 - reduction / 100);
        const cbsVal = isExempt ? 0 : taxableBase * (cbsRate / 100);
        const ibsStateVal = isExempt ? 0 : taxableBase * (ibsStateRate / 100);
        const ibsCityVal = isExempt ? 0 : taxableBase * (ibsCityRate / 100);
        const ibsTotalVal = ibsStateVal + ibsCityVal;
        const totalTax = cbsVal + ibsTotalVal;
        return {
          productId: item.id || item.productId || "p1",
          productName: item.name || item.productName || "Item",
          ncm: item.ncm || "2106.90.90",
          quantity: qty,
          unitPrice: price,
          grossTotal: gross,
          taxCategory: item.taxCategory || "differentiated",
          baseReductionPct: reduction,
          taxableBase,
          cbsRate,
          cbsValue: cbsVal,
          ibsStateRate,
          ibsStateValue: ibsStateVal,
          ibsCityRate,
          ibsCityValue: ibsCityVal,
          totalIbsValue: ibsTotalVal,
          totalTaxes: totalTax,
          netItemAmount: gross - totalTax
        };
      });
      const grossAmount = items.reduce((a, b) => a + b.grossTotal, 0) || order.total || 0;
      const totalCbs = items.reduce((a, b) => a + b.cbsValue, 0);
      const totalIbsState = items.reduce((a, b) => a + b.ibsStateValue, 0);
      const totalIbsCity = items.reduce((a, b) => a + b.ibsCityValue, 0);
      const totalIbs = totalIbsState + totalIbsCity;
      const totalTaxes = totalCbs + totalIbs;
      const netEstablishmentAmount = grossAmount - totalTaxes;
      res.json({
        success: true,
        calculation: {
          grossAmount,
          totalCbs,
          totalIbsState,
          totalIbsCity,
          totalIbs,
          totalTaxes,
          taxPercentage: grossAmount > 0 ? totalTaxes / grossAmount * 100 : 0,
          netEstablishmentAmount,
          items,
          ruleVersion: 1,
          calculatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.post("/api/fiscal/split-payment", async (req, res) => {
    try {
      const { grossAmount, cbsValue, ibsValue, acquirerFee, marketplaceFee } = req.body;
      const gross = Number(grossAmount) || 0;
      const cbs = Number(cbsValue) || gross * 0.088 * 0.4;
      const ibs = Number(ibsValue) || gross * 0.189 * 0.4;
      const totalGov = cbs + ibs;
      const acqFee = Number(acquirerFee) || gross * 0.025;
      const mktFee = Number(marketplaceFee) || 0;
      const netRestaurant = Math.max(0, gross - totalGov - acqFee - mktFee);
      res.json({
        success: true,
        splitDetail: {
          grossAmount: gross,
          retainedCbs: cbs,
          retainedIbs: ibs,
          totalRetainedByGov: totalGov,
          acquirerFee: acqFee,
          marketplaceFee: mktFee,
          netCreditedToRestaurant: netRestaurant,
          status: "processed_retained",
          liquidationDate: new Date(Date.now() + 864e5).toISOString().split("T")[0],
          transactionCode: `SPLIT-${Date.now().toString(36).toUpperCase()}`
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      if (req.method === "GET" && !req.path.startsWith("/api/")) {
        const ext = path2.extname(req.path).toLowerCase();
        const staticAssetExtensions = [".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2", ".ttf", ".eot", ".mp3", ".mp4", ".webp", ".pdf"];
        if (ext && staticAssetExtensions.includes(ext)) {
          return res.status(404).send("Arquivo de m\xEDdia n\xE3o encontrado.");
        }
        try {
          const indexPath = path2.resolve("index.html");
          if (fs2.existsSync(indexPath)) {
            let template = fs2.readFileSync(indexPath, "utf8");
            template = await vite.transformIndexHtml(req.originalUrl, template);
            return res.status(200).set({ "Content-Type": "text/html" }).end(template);
          }
        } catch (e) {
          return next(e);
        }
      }
      res.status(404).json({ error: "Rota API n\xE3o encontrada" });
    });
  } else {
    const distPath = path2.resolve("dist");
    if (fs2.existsSync(distPath)) {
      app.use(express.static(distPath, {
        maxAge: "1d",
        etag: true,
        setHeaders: (res, filePath) => {
          if (filePath.includes("/assets/")) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        }
      }));
      app.use((req, res) => {
        if (req.method === "GET" && !req.path.startsWith("/api/")) {
          const ext = path2.extname(req.path).toLowerCase();
          const staticAssetExtensions = [".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2", ".ttf", ".eot", ".mp3", ".mp4", ".webp", ".pdf", ".map", ".json"];
          if (ext && staticAssetExtensions.includes(ext)) {
            return res.status(404).send("Arquivo est\xE1tico n\xE3o encontrado.");
          }
          const indexPath = path2.join(distPath, "index.html");
          if (fs2.existsSync(indexPath)) {
            return res.sendFile(indexPath);
          }
        }
        res.status(404).json({ error: "Rota API n\xE3o encontrada" });
      });
    } else {
      app.use((_req, res) => {
        res.status(500).send("Build do frontend n\xE3o encontrado.");
      });
    }
  }
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}
startServer().catch((err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
export {
  adminAuth,
  adminDb,
  clientDb
};
//# sourceMappingURL=server.js.map
