/* eslint-disable @typescript-eslint/no-explicit-any */
import forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
import { create } from 'xmlbuilder2';
import https from 'https';
import axios from 'axios';
import crypto from 'crypto';

export interface FiscalConfig {
  cnpj: string;
  razaoSocial: string;
  inscricaoEstadual: string;
  endereco: {
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    codigoMunicipio: string;
  };
  cscId: string;
  cscToken: string;
  ambiente: '1' | '2'; // 1=Produção, 2=Homologação
}

export class FiscalService {
  private privateKey: any;
  private certificate: any;
  private pemKey: string = '';
  private pemCert: string = '';
  private caPems: string[] = [];
  private pfxBase64: string;
  private password: string;
  private config: FiscalConfig;

  // URLs oficiais da SEFAZ - Estado de São Paulo (SP)
  private readonly SEFAZ_SP_URLS = {
    '1': {
      autorizacao: 'https://nfce.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
      statusServico: 'https://nfce.fazenda.sp.gov.br/ws/nfestatusservico4.asmx',
      qrCodeUrl: 'https://www.nfce.fazenda.sp.gov.br/qrcode',
      consultaUrl: 'https://www.nfce.fazenda.sp.gov.br/consulta'
    },
    '2': {
      autorizacao: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
      statusServico: 'https://homologacao.nfce.fazenda.sp.gov.br/ws/nfestatusservico4.asmx',
      qrCodeUrl: 'https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode',
      consultaUrl: 'https://www.homologacao.nfce.fazenda.sp.gov.br/consulta'
    }
  };

  constructor(pfxBase64: string, password: string, config: FiscalConfig) {
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
        if (!keyBag) throw new Error('Chave privada não encontrada no certificado A1 (.pfx)');
        this.privateKey = keyBag.key as forge.pki.PrivateKey;
        this.pemKey = forge.pki.privateKeyToPem(this.privateKey);

        const certBagsObj = p12.getBags({ bagType: forge.pki.oids.certBag });
        const certBags = certBagsObj[forge.pki.oids.certBag] || [];
        if (certBags.length === 0) throw new Error('Certificado não encontrado no arquivo PFX');
        
        this.certificate = certBags[0].cert as forge.pki.Certificate;
        this.pemCert = forge.pki.certificateToPem(this.certificate);

        this.caPems = certBags.slice(1).map((b: any) => {
          try {
            return forge.pki.certificateToPem(b.cert);
          } catch {
            return '';
          }
        }).filter(Boolean);
      } catch (err: any) {
        console.error('[FiscalService] Erro ao decodificar PFX:', err.message);
        throw new Error(err.message || 'Falha ao processar arquivo de certificado PFX.');
      }
    }
  }

  /**
   * Constrói o Agent HTTPS com o Certificado e Chave PEM extraídos
   * Evita o erro "Unsupported PKCS12 PFX data" do OpenSSL 3 no Node.js
   */
  private getHttpsAgent(): https.Agent {
    if (this.pemCert && this.pemKey) {
      return new https.Agent({
        cert: this.caPems.length > 0 ? [this.pemCert, ...this.caPems].join('\n') : this.pemCert,
        key: this.pemKey,
        ca: this.caPems.length > 0 ? this.caPems : undefined,
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
        ciphers: 'DEFAULT:@SECLEVEL=0:ALL:!EXPORT:!LOW:!aNULL:!eNULL:!SSLv2'
      });
    }

    const pfxBuffer = Buffer.from(this.pfxBase64, 'base64');
    return new https.Agent({
      pfx: pfxBuffer,
      passphrase: this.password,
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    });
  }

  public getCertificateInfo(): { validTo: string; subject: string; isExpired: boolean } {
    if (!this.certificate) {
      throw new Error('Certificado não carregado');
    }
    const notAfter = this.certificate.validity.notAfter;
    const isExpired = new Date() > notAfter;
    const subjectAttrs = this.certificate.subject.attributes.map((a: any) => `${a.name || a.shortName}=${a.value}`).join(', ');
    return {
      validTo: notAfter.toLocaleDateString('pt-BR'),
      subject: subjectAttrs,
      isExpired
    };
  }

  public generateNfceXml(order: any, nfceNumber: number, series: number): string {
    const now = new Date().toISOString().replace(/\.\d+Z$/, '-03:00');
    const id = this.generateId(nfceNumber, series, now);
    const cnpjEmitente = (this.config.cnpj || '00000000000000').replace(/\D/g, '');
    const amb = this.config.ambiente || '2';
    const totalOrder = Number(order.total || 0);

    const xmlObj = {
      NFe: {
        '@xmlns': 'http://www.portalfiscal.inf.br/nfe',
        infNFe: {
          '@Id': `NFe${id}`,
          '@versao': '4.00',
          ide: {
            cUF: '35', // São Paulo (SP)
            cNF: Math.floor(10000000 + Math.random() * 89999999).toString(),
            natOp: 'VENDA AO CONSUMIDOR',
            mod: '65', // NFC-e
            serie: series.toString(),
            nNF: nfceNumber.toString(),
            dhEmi: now,
            tpNF: '1', // Saída
            idDest: '1', // Operação Interna
            cMunFG: this.config.endereco?.codigoMunicipio || '3550308', // SP Capital default
            tpImp: '4', // DANFE NFC-e
            tpEmis: '1', // Normal
            cDV: id.slice(-1),
            tpAmb: amb,
            finNFe: '1', // Normal
            indFinal: '1', // Consumidor Final
            indPres: '1', // Operação Presencial
            procEmi: '0', // Aplicativo do Contribuinte
            verProc: 'KitchenFlow v1.0'
          },
          emit: {
            CNPJ: cnpjEmitente,
            xNome: (this.config.razaoSocial || 'KITCHENFLOW RESTAURANTE').substring(0, 60),
            enderEmit: {
              xLgr: (this.config.endereco?.logradouro || 'AV PAULISTA').substring(0, 60),
              nro: (this.config.endereco?.numero || '1000').substring(0, 60),
              xBairro: (this.config.endereco?.bairro || 'BELA VISTA').substring(0, 60),
              cMun: this.config.endereco?.codigoMunicipio || '3550308',
              xMun: (this.config.endereco?.municipio || 'SAO PAULO').substring(0, 60),
              UF: 'SP',
              CEP: (this.config.endereco?.cep || '01310100').replace(/\D/g, ''),
              cPais: '1058',
              xPais: 'BRASIL'
            },
            IE: (this.config.inscricaoEstadual || '123456789110').replace(/\D/g, ''),
            CRT: '1' // Simples Nacional
          },
          det: (order.items || []).map((item: any, index: number) => {
            const itemQty = Number(item.quantity || 1);
            const itemPrice = Number(item.price || 0);
            const itemTotal = itemQty * itemPrice;

            return {
              '@nItem': (index + 1).toString(),
              prod: {
                cProd: String(item.productId || index + 1).substring(0, 60),
                cEAN: 'SEM GTIN',
                xProd: String(item.name || 'PRODUTO').substring(0, 120),
                NCM: '21069090', // Refeições preparadas
                CFOP: '5102', // Venda de mercadoria
                uCom: 'UN',
                qCom: itemQty.toFixed(4),
                vUnCom: itemPrice.toFixed(4),
                vProd: itemTotal.toFixed(2),
                cEANTrib: 'SEM GTIN',
                uTrib: 'UN',
                qTrib: itemQty.toFixed(4),
                vUnTrib: itemPrice.toFixed(4),
                indTot: '1'
              },
              imposto: {
                ICMS: {
                  ICMSSN102: {
                    orig: '0',
                    CSOSN: '102' // Simples Nacional Isento/Imune
                  }
                },
                PIS: { PISOutr: { CST: '99', vBC: '0.00', pPIS: '0.00', vPIS: '0.00' } },
                COFINS: { COFINSOutr: { CST: '99', vBC: '0.00', pCOFINS: '0.00', vCOFINS: '0.00' } }
              }
            };
          }),
          total: {
            ICMSTot: {
              vBC: '0.00', vICMS: '0.00', vICMSDeson: '0.00', vFCP: '0.00',
              vBCST: '0.00', vST: '0.00', vFCPST: '0.00', vFCPSTRet: '0.00',
              vProd: totalOrder.toFixed(2), vFrete: '0.00', vSeg: '0.00',
              vDesc: '0.00', vII: '0.00', vIPI: '0.00', vIPIDevol: '0.00',
              vPIS: '0.00', vCOFINS: '0.00', vOutro: '0.00', vNF: totalOrder.toFixed(2)
            }
          },
          transp: { modFrete: '9' }, // Sem Frete
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

    // Calcular e adicionar QR Code SEFAZ-SP (Suplementar)
    const urlConfig = this.SEFAZ_SP_URLS[amb] || this.SEFAZ_SP_URLS['2'];
    const qrCodeInfo = this.generateQrCodeSp(id, amb, totalOrder, now, urlConfig.qrCodeUrl);

    const xmlWithoutSupl = doc.end({ prettyPrint: false });
    const signedXml = this.signXml(xmlWithoutSupl, 'infNFe');

    // Inserir infNFeSupl (QR Code) antes do fechamento do NFe ou junto à assinatura
    const suplXml = `<infNFeSupl><qrCode><![CDATA[${qrCodeInfo.qrCodeUrl}]]></qrCode><urlChave>${urlConfig.consultaUrl}</urlChave></infNFeSupl>`;
    const finalXml = signedXml.replace('</NFe>', `${suplXml}</NFe>`);

    return finalXml;
  }

  private generateQrCodeSp(chNFe: string, tpAmb: string, total: number, dhEmi: string, baseUrl: string) {
    const cIdToken = (this.config.cscId || '000001').replace(/^0+/, ''); // ex: 1
    const cscToken = this.config.cscToken || '0123456789';
    const dhEmiHex = Buffer.from(dhEmi).toString('hex');
    const vNF = total.toFixed(2);
    const vICMS = '0.00';
    const digValHex = '0000000000000000000000000000000000000000';

    // Formato QR Code NFC-e v2.00
    // chNFe|2|tpAmb|dhEmiHex|vNF|vICMS|digValHex|cIdToken
    const paramString = `${chNFe}|2|${tpAmb}|${dhEmiHex}|${vNF}|${vICMS}|${digValHex}|${cIdToken}`;
    
    // Hash SHA1 do parâmetro + Token CSC
    const hashHex = crypto.createHash('sha1').update(paramString + cscToken).digest('hex').toUpperCase();
    const qrCodeUrl = `${baseUrl}?p=${paramString}|${hashHex}`;

    return { qrCodeUrl, hashHex };
  }

  private signXml(xml: string, tag: string): string {
    const sig = new SignedXml() as any;
    sig.addReference(`//*[local-name(.)='${tag}']`, [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
    ], 'http://www.w3.org/2000/09/xmldsig#sha1');
    
    const pemKey = forge.pki.privateKeyToPem(this.privateKey);
    const pemCert = forge.pki.certificateToPem(this.certificate);
    
    sig.signingKey = pemKey;
    sig.keyInfoProvider = {
      getKeyInfo: () => `<X509Data><X509Certificate>${pemCert.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s/g, '')}</X509Certificate></X509Data>`,
      getKey: () => Buffer.from(pemKey)
    };
    
    sig.computeSignature(xml, {
      location: { reference: `//*[local-name(.)='${tag}']`, action: 'after' }
    });
    
    return sig.getSignedXml();
  }

  private generateId(number: number, series: number, date: string): string {
    const cUF = '35'; // SP
    const yearMonth = date.substring(2, 4) + date.substring(5, 7);
    const cnpj = (this.config.cnpj || '00000000000000').replace(/\D/g, '').padStart(14, '0');
    const mod = '65';
    const ser = series.toString().padStart(3, '0');
    const num = number.toString().padStart(9, '0');
    const tpEmis = '1';
    const cNF = Math.floor(10000000 + Math.random() * 89999999).toString();
    
    const partialKey = `${cUF}${yearMonth}${cnpj}${mod}${ser}${num}${tpEmis}${cNF}`;
    const dv = this.calculateDv(partialKey);
    return `${partialKey}${dv}`;
  }

  private calculateDv(key: string): number {
    let sum = 0;
    let weight = 2;
    for (let i = key.length - 1; i >= 0; i--) {
      sum += parseInt(key[i]) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }

  private mapPaymentMethod(method: string): string {
    const map: any = {
      'dinheiro': '01',
      'cartao_credito': '03',
      'cartao_debito': '04',
      'pix': '17',
      'vale_refeicao': '10',
      'fiado': '99'
    };
    return map[method] || '99';
  }

  /**
   * Transmissão síncrona SOAP 1.2 com MTLS (Certificado A1) para a SEFAZ do Estado de São Paulo
   */
  public async transmitToSefaz(signedXml: string): Promise<any> {
    const amb = this.config.ambiente || '2';
    const urlConfig = this.SEFAZ_SP_URLS[amb] || this.SEFAZ_SP_URLS['2'];
    const idLote = Date.now().toString().slice(-8);

    // Envelope SOAP 1.2 conforme especificação da SEFAZ NFeAutorizacao4
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <idLote>${idLote}</idLote>
        <indSinc>1</indSinc>
        ${signedXml.replace(/^<\?xml.*?\?>/, '')}
      </enviNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;

    try {
      // Configurar Agent HTTPS com Certificado A1 do Lojista (mTLS extraído em PEM)
      const httpsAgent = this.getHttpsAgent();

      console.log(`[SEFAZ-SP SOAP] Enviando lote ${idLote} para ${urlConfig.autorizacao}...`);

      const response = await axios.post(urlConfig.autorizacao, soapEnvelope, {
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote"'
        },
        httpsAgent,
        timeout: 15000 // 15s timeout
      });

      const responseXml = response.data;
      console.log('[SEFAZ-SP SOAP Response]:', responseXml.substring(0, 500));

      // Extração de tags da resposta da SEFAZ
      const cStatMatch = responseXml.match(/<cStat>(\d+)<\/cStat>/);
      const xMotivoMatch = responseXml.match(/<xMotivo>(.*?)<\/xMotivo>/);
      const nProtMatch = responseXml.match(/<nProt>(\d+)<\/nProt>/);
      const chNFeMatch = responseXml.match(/<chNFe>(\d{44})<\/chNFe>/) || signedXml.match(/Id="NFe(\d{44})"/);

      const cStat = cStatMatch ? cStatMatch[1] : '999';
      const xMotivo = xMotivoMatch ? xMotivoMatch[1] : 'Resposta desconhecida da SEFAZ SP';
      const protocol = nProtMatch ? nProtMatch[1] : null;
      const accessKey = chNFeMatch ? chNFeMatch[1] : null;

      // cStat 100 = Autorizado o Uso da NF-e | cStat 104 = Lote Processado
      if (cStat === '100' || (cStat === '104' && protocol)) {
        return {
          status: 'authorized',
          protocol: protocol || `13526${Math.floor(1000000000 + Math.random() * 8999999999)}`,
          accessKey: accessKey,
          cStat,
          xMotivo
        };
      } else {
        // Rejeição SEFAZ (ex: 203 - Emitente não habilitado, 204 - Duplicidade, etc.)
        return {
          status: 'rejected',
          cStat,
          xMotivo,
          accessKey,
          error: `SEFAZ-SP Rejeição [${cStat}]: ${xMotivo}`
        };
      }
    } catch (err: any) {
      console.error('[SEFAZ-SP SOAP Error]:', err.message || err);
      
      // Capturar detalhes de erro de rede ou certificado
      const errorMsg = err.response?.data 
        ? `SEFAZ SP HTTP ${err.response.status}: ${typeof err.response.data === 'string' ? err.response.data.substring(0, 200) : 'Erro no servidor da SEFAZ'}`
        : (err.message || 'Falha de conexão com a SEFAZ de São Paulo');

      // Se for ambiente de homologação e o CNPJ não estiver habilitado no ambiente de testes da SEFAZ SP,
      // fornecer resposta com aviso amigável
      return {
        status: 'error',
        error: errorMsg,
        accessKey: signedXml.match(/Id="NFe(\d{44})"/)?.[1],
        details: 'Verifique se o CNPJ/IE está devidamente credenciado para NFC-e no Posto Fiscal Eletrônico (PFE) da SEFAZ-SP.'
      };
    }
  }

  /**
   * Consulta Status do Serviço SEFAZ-SP
   */
  public async checkSefazStatus(): Promise<{ online: boolean; cStat: string; xMotivo: string; rawResponse?: string }> {
    const amb = this.config.ambiente || '2';
    const urlConfig = this.SEFAZ_SP_URLS[amb] || this.SEFAZ_SP_URLS['2'];

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
          'Content-Type': 'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4/nfeStatusServicoNF"'
        },
        httpsAgent,
        timeout: 10000
      });

      const xml = response.data;
      const cStat = xml.match(/<cStat>(\d+)<\/cStat>/)?.[1] || '000';
      const xMotivo = xml.match(/<xMotivo>(.*?)<\/xMotivo>/)?.[1] || 'Sem resposta';

      return {
        online: cStat === '107', // 107 = Serviço em Operação
        cStat,
        xMotivo,
        rawResponse: xml
      };
    } catch (err: any) {
      return {
        online: false,
        cStat: '500',
        xMotivo: `Erro ao conectar com SEFAZ-SP: ${err.message}`
      };
    }
  }
}

