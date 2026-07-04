/* eslint-disable @typescript-eslint/no-explicit-any */
import forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
import { create } from 'xmlbuilder2';

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
  private p12: any;
  private privateKey: any;
  private certificate: any;
  private config: FiscalConfig;

  constructor(pfxBase64: string, password: string, config: FiscalConfig) {
    const pfxDer = forge.util.decode64(pfxBase64);
    const p12Asn1 = forge.asn1.fromDer(pfxDer);
    this.p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
    
    const keyBags = this.p12.getBags({ bagType: forge.pki.oids.keyBag });
    const pkcs8Bags = this.p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    
    const keyBag = keyBags[forge.pki.oids.keyBag]?.[0] || pkcs8Bags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    if (!keyBag) throw new Error('Private key not found in certificate');
    this.privateKey = keyBag.key as forge.pki.PrivateKey;

    const certBags = this.p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0];
    if (!certBag) throw new Error('Certificate not found in PFX');
    this.certificate = certBag.cert as forge.pki.Certificate;
    
    this.config = config;
  }

  public generateNfceXml(order: any, nfceNumber: number, series: number): string {
    const now = new Date().toISOString().replace(/\.\d+Z$/, '-03:00');
    const id = this.generateId(nfceNumber, series, now);
    
    const xmlObj = {
      NFe: {
        '@xmlns': 'http://www.portalfiscal.inf.br/nfe',
        infNFe: {
          '@Id': `NFe${id}`,
          '@versao': '4.00',
          ide: {
            cUF: '35', // SP example
            cNF: Math.floor(Math.random() * 99999999).toString().padStart(8, '0'),
            natOp: 'VENDA',
            mod: '65',
            serie: series.toString(),
            nNF: nfceNumber.toString(),
            dhEmi: now,
            tpNF: '1',
            idDest: '1',
            cMunFG: this.config.endereco.codigoMunicipio,
            tpImp: '4',
            tpEmis: '1',
            cDV: '0', // Will be calculated
            tpAmb: this.config.ambiente,
            finNFe: '1',
            indFinal: '1',
            indPres: '1',
            procEmi: '0',
            verProc: '1.0.0'
          },
          emit: {
            CNPJ: this.config.cnpj,
            xNome: this.config.razaoSocial,
            enderEmit: {
              xLgr: this.config.endereco.logradouro,
              nro: this.config.endereco.numero,
              xBairro: this.config.endereco.bairro,
              cMun: this.config.endereco.codigoMunicipio,
              xMun: this.config.endereco.municipio,
              UF: this.config.endereco.uf,
              CEP: this.config.endereco.cep,
              cPais: '1058',
              xPais: 'BRASIL'
            },
            IE: this.config.inscricaoEstadual,
            CRT: '1' // Simples Nacional
          },
          det: order.items.map((item: any, index: number) => ({
            '@nItem': (index + 1).toString(),
            prod: {
              cProd: item.productId,
              cEAN: 'SEM GTIN',
              xProd: item.name,
              NCM: '21069090', // Generic food NCM
              CFOP: '5102',
              uCom: 'UN',
              qCom: item.quantity.toFixed(4),
              vUnCom: item.price.toFixed(10),
              vProd: (item.quantity * item.price).toFixed(2),
              cEANTrib: 'SEM GTIN',
              uTrib: 'UN',
              qTrib: item.quantity.toFixed(4),
              vUnTrib: item.price.toFixed(10),
              indTot: '1'
            },
            imposto: {
              ICMS: {
                ICMSSN102: {
                  orig: '0',
                  CSOSN: '102'
                }
              },
              PIS: { PISOutr: { CST: '99', vBC: '0.00', pPIS: '0.00', vPIS: '0.00' } },
              COFINS: { COFINSOutr: { CST: '99', vBC: '0.00', pCOFINS: '0.00', vCOFINS: '0.00' } }
            }
          })),
          total: {
            ICMSTot: {
              vBC: '0.00', vICMS: '0.00', vICMSDeson: '0.00', vFCP: '0.00',
              vBCST: '0.00', vST: '0.00', vFCPST: '0.00', vFCPSTRet: '0.00',
              vProd: order.total.toFixed(2), vFrete: '0.00', vSeg: '0.00',
              vDesc: '0.00', vII: '0.00', vIPI: '0.00', vIPIDevol: '0.00',
              vPIS: '0.00', vCOFINS: '0.00', vOutro: '0.00', vNF: order.total.toFixed(2)
            }
          },
          transp: { modFrete: '9' },
          pag: {
            detPag: {
              tPag: this.mapPaymentMethod(order.paymentMethod),
              vPag: order.total.toFixed(2)
            }
          }
        }
      }
    };

    const xml = create(xmlObj).end({ prettyPrint: false });
    return this.signXml(xml, 'infNFe');
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
    // Simplified access key generation logic
    const cUF = '35';
    const yearMonth = date.substring(2, 4) + date.substring(5, 7);
    const cnpj = this.config.cnpj.replace(/\D/g, '');
    const mod = '65';
    const ser = series.toString().padStart(3, '0');
    const num = number.toString().padStart(9, '0');
    const tpEmis = '1';
    const cNF = Math.floor(Math.random() * 99999999).toString().padStart(8, '0');
    
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
      'vale_refeicao': '10'
    };
    return map[method] || '99';
  }

  public async transmitToSefaz(signedXml: string): Promise<any> {
    // This is a placeholder for the actual SOAP transmission
    // In a real scenario, you'd use a library like 'soap' or axios with a custom HTTPS agent
    // that uses the client certificate.
    console.log('Transmitting to SEFAZ...');
    
    // Mocking response for demonstration
    return {
      status: 'authorized',
      protocol: '135260000000001',
      accessKey: signedXml.match(/Id="NFe(\d+)"/)?.[1]
    };
  }
}
