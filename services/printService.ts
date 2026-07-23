import { Order, AdminSettings } from '../types';

/**
 * Safely parses any date/timestamp into a Date object
 */
export const parseOrderDate = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'object' && val.seconds !== undefined) {
    return new Date(val.seconds * 1000);
  }
  if (typeof val?.toDate === 'function') {
    return val.toDate();
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
};

/**
 * Traduz o método de pagamento para exibição amigável e legível
 */
const paymentMethodLabel = (method: string): string => {
  switch (method) {
    case 'dinheiro': return 'Dinheiro';
    case 'cartao_credito': return 'Cartão de Crédito';
    case 'cartao_debito': return 'Cartão de Débito';
    case 'pix': return 'Pix';
    case 'vale_refeicao': return 'Vale Refeição';
    case 'conta_cliente': return 'Conta Cliente';
    default: return method || 'Outro';
  }
};

/**
 * Formata a chave fiscal NFC-e em blocos de 4 dígitos para corresponder à nota real
 */
const formatFiscalKey = (key: string): string => {
  const clean = key.replace(/\s+/g, '');
  return clean.replace(/(.{4})/g, '$1 ').trim();
};

/**
 * Gera uma versão em TEXTO PLANO (RAW TXT) otimizada para bobinas térmicas de 80mm/58mm.
 * Excelente para spoolers de comandos diretos / ESC-POS.
 */
export const generateRawTextReceipt = (order: Partial<Order>, settings: AdminSettings): string => {
  const { companyName, address, phone, cnpj, fiscal, printing } = settings;
  const isFiscal = order.isFiscalIssued || order.wantsFiscalCoupon;
  const lineCharLimit = printing.paperWidth === '58mm' ? 32 : 48;
  
  const pad = (str: string, size: number, char = ' '): string => {
    if (str.length >= size) return str.substring(0, size);
    return str + char.repeat(size - str.length);
  };

  const center = (str: string, size: number): string => {
    if (str.length >= size) return str.substring(0, size);
    const left = Math.floor((size - str.length) / 2);
    return ' '.repeat(left) + str;
  };

  const right = (str: string, size: number): string => {
    if (str.length >= size) return str.substring(0, size);
    return ' '.repeat(size - str.length) + str;
  };

  const divider = '-'.repeat(lineCharLimit);
  const doubleDivider = '='.repeat(lineCharLimit);

  let out = '';
  
  // Header
  out += center(fiscal?.razaoSocial || companyName, lineCharLimit) + '\n';
  out += center(`CNPJ: ${fiscal?.cnpj || cnpj}`, lineCharLimit) + '\n';
  out += center(fiscal?.address ? `${fiscal.address.logradouro}, ${fiscal.address.numero}` : address, lineCharLimit) + '\n';
  if (phone) {
    out += center(`Fone: ${phone}`, lineCharLimit) + '\n';
  }
  
  out += divider + '\n';
  
  const orderTypeLabel = order.type === 'delivery' ? 'DELIVERY' : order.type === 'takeout' ? 'BALCAO' : 'SALAO';
  out += center(orderTypeLabel, lineCharLimit) + '\n';
  
  const createdAt = parseOrderDate(order.createdAt);
  const orderNumStr = order.dailyNumber ? String(order.dailyNumber) : (order.id ? order.id.slice(-6).toUpperCase() : 'NOVO');
  out += `PEDIDO: #${orderNumStr}\n`;
  out += `DATA  : ${createdAt.toLocaleDateString('pt-BR')} ${createdAt.toLocaleTimeString('pt-BR')}\n`;
  if (order.tableNumber) {
    out += `MESA/COMANDA: ${order.tableNumber}\n`;
  }
  
  if (order.type === 'delivery') {
    out += divider + '\n';
    out += center('DADOS DE ENTREGA', lineCharLimit) + '\n';
    out += `CLIENTE: ${order.customerName?.toUpperCase() || 'NÃO INFORMADO'}\n`;
    out += `FONE   : ${order.customerPhone || 'NÃO INFORMADO'}\n`;
    out += `END.   : ${order.customerAddress?.toUpperCase() || 'NÃO INFORMADO'}\n`;
    if (order.changeFor) {
      out += `TROCO P/: R$ ${order.changeFor.toFixed(2).replace('.', ',')}\n`;
    }
  }

  out += divider + '\n';
  out += pad('QTD DESCRICAO', lineCharLimit - 10) + right('Vl TOTAL', 10) + '\n';
  out += divider + '\n';

  order.items?.forEach((item) => {
    const cleanName = item.name.split('(')[0].trim().toUpperCase();
    const qtyStr = `${item.quantity}x `;
    const totalItemRow = (item.price * item.quantity).toFixed(2).replace('.', ',');
    
    // Nome do produto formatado
    const nameLine = cleanName;
    out += `${qtyStr}${nameLine}\n`;
    if (item.observation) {
      out += `  * OBS: ${item.observation.toUpperCase()} *\n`;
    }
    if (item.selectedOptions && item.selectedOptions.length > 0) {
      item.selectedOptions.forEach(opt => {
        out += `  + ${opt.name.toUpperCase()}\n`;
      });
    }
    out += right(totalItemRow, lineCharLimit) + '\n';
  });

  out += divider + '\n';
  const totalQuantity = order.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  out += `QTD. TOTAL DE ITENS: ${String(totalQuantity).padStart(3, '0')}\n`;
  out += divider + '\n';

  const subtotal = ((order.total || 0) - (order.additionalFee || 0) + (order.discount || 0)).toFixed(2).replace('.', ',');
  const acc = (order.additionalFee || 0).toFixed(2).replace('.', ',');
  const desc = (order.discount || 0).toFixed(2).replace('.', ',');
  const grandTotal = (order.total || 0).toFixed(2).replace('.', ',');

  out += pad('SUBTOTAL:', lineCharLimit - 12) + right(subtotal, 12) + '\n';
  out += pad('ACRESCIMO(+):', lineCharLimit - 12) + right(acc, 12) + '\n';
  out += pad('DESCONTO(-):', lineCharLimit - 12) + right(desc, 12) + '\n';
  out += doubleDivider + '\n';
  out += pad('TOTAL R$:', lineCharLimit - 12) + right(grandTotal, 12) + '\n';
  out += doubleDivider + '\n';

  if (order.paymentMethod) {
    out += `PAGO VIA: ${paymentMethodLabel(order.paymentMethod).toUpperCase()} - R$ ${grandTotal}\n`;
    out += divider + '\n';
  }

  if (isFiscal) {
    out += center('D.A.N.F.E  N.F.C.-e', lineCharLimit) + '\n';
    out += center('DOCUMENTO AUXILIAR DA NOTA FISCAL', lineCharLimit) + '\n';
    out += center('DE CONSUMIDOR ELETRONICA', lineCharLimit) + '\n';
    out += divider + '\n';
    out += `CHAVE DE ACESSO:\n`;
    out += `${formatFiscalKey(order.fiscalKey || '35260659256207000174650010000011091263520471')}\n`;
    out += divider + '\n';
    out += `PROTOCOLO: ${order.metadata?.protocol || '136263705823847'}\n`;
    out += `NFC-e Num: ${String(fiscal?.nextNfceNumber || 1109).padStart(9, '0')} Series: ${String(fiscal?.series || 1).padStart(3, '0')}\n`;
    out += divider + '\n';
    out += center('TRIBUTOS TOTAIS APROXIMADOS (IBPT)', lineCharLimit) + '\n';
    out += center(`R$ ${( (order.total || 0) * 0.3145 ).toFixed(2).replace('.', ',')} (31.45%)`, lineCharLimit) + '\n';
    out += divider + '\n';
  }

  out += center(printing.footerText || 'OBRIGADO PELA PREFERENCIA!', lineCharLimit) + '\n';
  return out;
};

export const generateReceiptHtml = (order: Partial<Order>, settings: AdminSettings): string => {
  const { printing, companyName, address, phone, cnpj, fiscal } = settings;
  const is80mm = printing.paperWidth === '80mm';
  const width = is80mm ? '72mm' : '48mm';
  const isFiscal = order.isFiscalIssued || order.wantsFiscalCoupon;
  
  // Escala de tamanho de fonte conforme configuração de nitidez
  const fontSizeLevel = printing.fontSizeLevel || 'large';
  const scale = fontSizeLevel === 'extra_large' ? 1.3 : fontSizeLevel === 'large' ? 1.15 : 1.0;

  // Variáveis de fontes e espaçamento otimizadas para impressoras térmicas (maior nitidez)
  const fontSizeBase = isFiscal 
    ? (is80mm ? `${Math.round(11.5 * scale * 10) / 10}px` : `${Math.round(10 * scale * 10) / 10}px`) 
    : (is80mm ? `${Math.round(13.5 * scale * 10) / 10}px` : `${Math.round(12 * scale * 10) / 10}px`);
  const fontSizeSmall = isFiscal 
    ? (is80mm ? `${Math.round(10 * scale * 10) / 10}px` : `${Math.round(9 * scale * 10) / 10}px`) 
    : (is80mm ? `${Math.round(11.5 * scale * 10) / 10}px` : `${Math.round(10 * scale * 10) / 10}px`);
  const fontSizeItem = isFiscal 
    ? (is80mm ? `${Math.round(11 * scale * 10) / 10}px` : `${Math.round(9.5 * scale * 10) / 10}px`) 
    : (is80mm ? `${Math.round(14.5 * scale * 10) / 10}px` : `${Math.round(12.5 * scale * 10) / 10}px`); 
  const fontSizeHeader = isFiscal 
    ? (is80mm ? `${Math.round(14 * scale * 10) / 10}px` : `${Math.round(12 * scale * 10) / 10}px`) 
    : (is80mm ? `${Math.round(17 * scale * 10) / 10}px` : `${Math.round(14.5 * scale * 10) / 10}px`);
  const qrCodeSize = is80mm ? '120px' : '90px';

  const isUltraBold = printing.fontDensity === 'ultra' || printing.highContrastMode !== false;

  const totalQuantity = order.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const createdAt = parseOrderDate(order.createdAt);

  // CSS global de alto contraste para garantir nitidez extrema em impressoras térmicas
  const thermalGlobalStyle = `
    @media print {
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        color: #000000 !important;
        background-color: #ffffff !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }
    }
    @page { margin: 0; size: auto; }
    html, body { 
      width: ${width}; 
      margin: 0 auto; 
      padding: 1.5mm 3.5mm; 
      font-family: 'Courier New', Courier, 'Liberation Mono', 'Consolas', monospace; 
      font-weight: ${isUltraBold ? '800' : '700'};
      color: #000000 !important;
      background-color: #ffffff !important;
      line-height: 1.25;
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: optimizeLegibility !important;
      font-smooth: never !important;
      letter-spacing: 0.1px;
    }
    .header { text-align: center; margin-bottom: 6px; }
    .header-title { font-weight: 900; font-size: ${fontSizeHeader}; text-transform: uppercase; margin-bottom: 3px; color: #000000 !important; }
    .header-info { font-size: ${fontSizeSmall}; margin-bottom: 2px; font-weight: 700; color: #000000 !important; }
    .divider { border-top: 1.5px solid #000000; margin: 6px 0; }
    .total-row { display: flex; justify-content: space-between; font-size: ${fontSizeBase}; font-weight: 900; margin-bottom: 4px; color: #000000 !important; }
    .fiscal-title { text-align: center; font-weight: 900; font-size: ${fontSizeBase}; margin: 6px 0; line-height: 1.3; color: #000000 !important; }
    .bold { font-weight: 900; color: #000000 !important; }
    .center { text-align: center; }
    img {
      image-rendering: -webkit-optimize-contrast !important;
      image-rendering: crisp-edges !important;
      image-rendering: pixelated !important;
    }
  `;

  // Se for IMPRESSÃO FISCAL baseada na NFC-e
  if (isFiscal) {
    // Itens formatados de forma oficial NFC-e com alto contraste
    const itemsHtml = order.items?.map((item, idx) => {
      const itemNumber = String(idx + 1).padStart(3, '0');
      const code = item.productId ? item.productId.slice(0, 8).toUpperCase().padStart(8, '0') : '23262449';
      const cleanName = item.name.split('(')[0].trim().toUpperCase();
      const totalItemRow = (item.price * item.quantity).toFixed(2).replace('.', ',');
      const priceStr = item.price.toFixed(2).replace('.', ',');
      
      return `
        <div style="font-size: ${fontSizeSmall}; margin-bottom: 6px; line-height: 1.25; font-family: 'Courier New', Courier, monospace; color: #000000 !important;">
          <div style="display: flex;">
            <span style="width: 10%; margin-right: 2px; font-weight: 900;">${itemNumber}</span>
            <span style="width: 25%; margin-right: 4px; font-weight: 700;">${code}</span>
            <span style="width: 65%; font-weight: 900; word-break: break-all;">${cleanName}</span>
          </div>
          <div style="text-align: right; font-weight: 900; margin-top: 1px;">
            ${item.quantity} UN X ${priceStr} Vl Unit. Vl Total ${totalItemRow}
          </div>
          ${item.observation ? `
            <div style="font-size: ${fontSizeSmall}; font-weight: 900; margin-left: 10%; text-transform: uppercase; font-style: italic; color: #000000 !important;">
              * OBS: ${item.observation} *
            </div>
          ` : ''}
          ${item.selectedOptions && item.selectedOptions.length > 0 ? `
            <div style="font-size: ${fontSizeSmall}; margin-left: 10%; font-weight: 700; color: #000000 !important;">
              ${item.selectedOptions.map(opt => `+ ${opt.name.toUpperCase()}`).join(', ')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('') || '';

    const dateStr = createdAt.toLocaleDateString('pt-BR');
    const timeStr = createdAt.toLocaleTimeString('pt-BR');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Cupom Fiscal NFC-e</title>
        <style>
          ${thermalGlobalStyle}
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-title">${fiscal?.razaoSocial || companyName}</div>
          <div class="header-info">CNPJ: ${fiscal?.cnpj || cnpj}</div>
          <div class="header-info">${fiscal?.address ? `${fiscal.address.logradouro}, ${fiscal.address.numero}` : address}</div>
          <div class="header-info">${fiscal?.address ? `${fiscal.address.bairro} - ${fiscal.address.municipio} - ${fiscal.address.uf}` : ''}</div>
          ${phone ? `<div class="header-info">Fone: ${phone} ${fiscal?.inscricaoEstadual ? `I.E.: ${fiscal.inscricaoEstadual}` : ''}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div class="fiscal-title">
          DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRÔNICA
        </div>

        <div class="divider"></div>

        <div style="display: flex; font-size: ${fontSizeSmall}; font-weight: 900; margin-bottom: 4px; color: #000000 !important;">
          <span style="width: 10%;">#</span>
          <span style="width: 25%;">CÓD</span>
          <span style="width: 35%;">DESCRIÇÃO</span>
          <span style="width: 30%; text-align: right;">QTD UN X VALOR</span>
        </div>
        
        <div class="divider"></div>

        <div class="items">
          ${itemsHtml || '<div style="text-align: center; padding: 10px; font-weight: 900;">NENHUM ITEM</div>'}
        </div>

        <div class="divider"></div>

        <div class="total-row">
          <span>QTD. TOTAL DE ITENS</span>
          <span>${String(totalQuantity).padStart(3, '0')}</span>
        </div>
        <div class="total-row">
          <span>VALOR TOTAL R$</span>
          <span>${(order.total || 0).toFixed(2).replace('.', ',')}</span>
        </div>
        <div class="total-row">
          <span>VALOR PAGO R$</span>
          <span>${(order.total || 0).toFixed(2).replace('.', ',')}</span>
        </div>

        <div class="bold" style="font-size: ${fontSizeSmall}; margin-top: 6px; margin-bottom: 3px; text-transform: uppercase;">FORMA DE PAGAMENTO:</div>
        <div style="display: flex; justify-content: space-between; font-size: ${fontSizeBase}; font-weight: 900; margin-bottom: 4px; color: #000000 !important;">
          <span style="text-transform: uppercase;">${paymentMethodLabel(order.paymentMethod || 'cartao_credito')}</span>
          <span class="bold">${(order.total || 0).toFixed(2).replace('.', ',')}</span>
        </div>

        <div class="divider"></div>

        <div class="center" style="font-size: ${fontSizeSmall}; margin-bottom: 6px; font-weight: 700;">
          Consulte pela Chave de Acesso em<br/>
          <strong>https://www.nfce.fazenda.sp.gov.br/qrcode</strong>
        </div>

        <div class="center bold" style="font-size: ${fontSizeBase}; margin-bottom: 12px; word-break: break-all; letter-spacing: 0.5px; font-weight: 900;">
          ${formatFiscalKey(order.fiscalKey || '35260659256207000174650010000011091263520471')}
        </div>

        <div style="font-size: ${fontSizeSmall}; line-height: 1.35; text-transform: uppercase; font-weight: 700;">
          <div><strong>CONSUMIDOR CNPJ / CPF:</strong> ${order.customerDocument || 'NÃO IDENTIFICADO'}</div>
          <div style="margin-top: 3px;"><strong>NFC-e nº</strong> ${String(fiscal?.nextNfceNumber || 1109).padStart(9, '0')} &nbsp;&nbsp; <strong>Série</strong> ${String(fiscal?.series || 1).padStart(3, '0')}</div>
          <div><strong>Data/Hora Emissão:</strong> ${dateStr} ${timeStr}</div>
          <div><strong>Protocolo de Autorização:</strong> ${order.metadata?.protocol || '136263705823847'}</div>
        </div>

        <div class="center" style="margin: 15px 0;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https://www.nfce.fazenda.sp.gov.br/qrcode?p=${order.fiscalKey || '34260659256207000174650010000011122263520412'}&ecc=M&format=png&color=000000&bgcolor=ffffff&qzone=1" style="width: ${qrCodeSize}; height: ${qrCodeSize}; image-rendering: pixelated;" />
        </div>

        <div class="divider"></div>

        <div class="center" style="font-size: ${fontSizeSmall}; line-height: 1.3; font-style: italic; font-weight: 700;">
          Tributos Aproximados - Total R$ ${( (order.total || 0) * 0.3145 ).toFixed(2).replace('.', ',')} (31.45%)<br/>
          Federal R$ ${( (order.total || 0) * 0.1345 ).toFixed(2).replace('.', ',')}, Estadual R$ ${( (order.total || 0) * 0.1800 ).toFixed(2).replace('.', ',')}, Municipal R$ 0,00 - Fonte IBPT<br/>
          www.satpox.com.br
        </div>

        <div class="divider"></div>

        <div class="center bold" style="font-size: ${fontSizeSmall}; text-transform: uppercase; margin-top: 8px;">
          ${printing.footerText || 'Obrigado pela preferência!'}
        </div>

        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.onafterprint = () => {
                window.close();
              };
              setTimeout(() => {
                window.onfocus = () => { window.close(); };
              }, 600);
            }, 300);
          };
        </script>
      </body>
      </html>
    `;
  }

  // Se for IMPRESSÃO NORMAL / TRADICIONAL
  const itemsHtml = order.items?.map((item) => {
    const cleanName = item.name.split('(')[0].trim().toUpperCase();
    return `
      <div style="margin-bottom: 10px; font-size: ${fontSizeItem}; font-family: 'Courier New', Courier, monospace; color: #000000 !important;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="display: flex; gap: 6px; flex: 1; overflow: hidden;">
            <span style="font-weight: 900; min-width: 22px;">${item.quantity}x</span>
            <span style="font-weight: 900; word-break: break-all;">${cleanName}</span>
          </div>
          <div style="text-align: right; min-width: 55px; font-weight: 900;">
            ${(item.price * item.quantity).toFixed(2).replace('.', ',')}
          </div>
        </div>
        ${item.observation ? `
          <div style="font-size: ${fontSizeSmall}; margin-left: 26px; margin-top: 2px; font-weight: 900; text-transform: uppercase; color: #000000 !important;">
            * OBS: ${item.observation} *
          </div>
        ` : ''}
        ${item.selectedOptions && item.selectedOptions.length > 0 ? `
          <div style="font-size: ${fontSizeSmall}; margin-left: 26px; font-weight: 700; color: #000000 !important;">
            ${item.selectedOptions.map(opt => `+ ${opt.name.toUpperCase()}`).join(', ')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('') || '';

  const orderTypeLabel = order.type === 'delivery' ? 'DELIVERY' : order.type === 'takeout' ? 'BALCÃO' : 'SALÃO';
  const timeElapsed = Math.floor((Date.now() - createdAt.getTime()) / 60000);
  const hours = Math.floor(timeElapsed / 60);
  const minutes = timeElapsed % 60;
  const timeStr = hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`;

  const deliveryHtml = order.type === 'delivery' ? `
    <div class="divider"></div>
    <div style="font-size: ${fontSizeBase}; font-weight: 900; text-align: center; margin-bottom: 8px; border: 1.5px solid #000; padding: 3px; text-transform: uppercase; color: #000000 !important;">DADOS DE ENTREGA</div>
    <div style="font-size: ${fontSizeSmall}; margin-bottom: 2px; font-weight: 700;"><strong>CLIENTE:</strong> ${order.customerName?.toUpperCase() || 'NÃO INFORMADO'}</div>
    <div style="font-size: ${fontSizeSmall}; margin-bottom: 2px; font-weight: 700;"><strong>TELEFONE:</strong> ${order.customerPhone || 'NÃO INFORMADO'}</div>
    <div style="font-size: ${fontSizeSmall}; margin-bottom: 2px; font-weight: 700;"><strong>ENDEREÇO:</strong> ${order.customerAddress?.toUpperCase() || 'NÃO INFORMADO'}</div>
    ${order.changeFor ? `<div style="font-size: ${fontSizeSmall}; font-weight: 700;"><strong>TROCO PARA:</strong> R$ ${order.changeFor.toFixed(2).replace('.', ',')}</div>` : ''}
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        ${thermalGlobalStyle}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-title">${companyName}</div>
        <div class="header-info">CNPJ: ${cnpj}</div>
        <div class="header-info">${address}</div>
        ${phone ? `<div class="header-info">Fone: ${phone}</div>` : ''}
      </div>

      <div class="divider"></div>

      <div style="text-align: center; font-weight: 900; font-size: ${fontSizeHeader}; text-transform: uppercase; margin-bottom: 5px; color: #000000 !important;">
        ${orderTypeLabel}
      </div>

      <div style="font-size: ${fontSizeSmall}; margin-top: 4px; line-height: 1.35; font-weight: 700;">
        ${order.tableNumber ? `<div><strong>Mesa/Comanda:</strong> ${order.tableNumber}</div>` : ''}
        <div><strong>Pedido:</strong> #${order.dailyNumber ? order.dailyNumber : (order.id ? order.id.slice(-6).toUpperCase() : 'NOVO')}</div>
        <div><strong>Data/Hora:</strong> ${createdAt.toLocaleDateString('pt-BR')} ${createdAt.toLocaleTimeString('pt-BR')}</div>
        <div><strong>Tempo de Casa:</strong> ${timeStr}</div>
      </div>

      ${deliveryHtml}

      <div class="divider"></div>

      <div style="display: flex; justify-content: space-between; font-size: ${fontSizeSmall}; font-weight: 900; margin-bottom: 5px; text-transform: uppercase; color: #000000 !important;">
        <span>QTD DESCRIÇÃO</span>
        <span>TOTAL</span>
      </div>
      
      <div class="divider" style="margin-top: 0;"></div>

      <div class="items">
        ${itemsHtml || '<div style="text-align: center; padding: 10px; font-weight: 900;">SEM ITENS</div>'}
      </div>

      <div class="divider"></div>

      <div style="font-size: ${fontSizeSmall}; font-weight: 900; margin-bottom: 5px;">
        QTD. TOTAL DE ITENS: ${totalQuantity}
      </div>

      <div class="divider"></div>

      <div class="total-row">
        <span>Subtotal</span>
        <span>${((order.total || 0) - (order.additionalFee || 0) + (order.discount || 0)).toFixed(2).replace('.', ',')}</span>
      </div>
      <div class="total-row">
        <span>Acréscimo(+)</span>
        <span>${(order.additionalFee || 0).toFixed(2).replace('.', ',')}</span>
      </div>
      ${order.additionalFeeReason ? `
        <div style="font-size: ${fontSizeSmall}; color: #000000 !important; margin-left: 10px; font-style: italic; margin-bottom: 2px; font-weight: 700;">
          Motivo acréscimo: ${order.additionalFeeReason}
        </div>
      ` : ''}
      <div class="total-row">
        <span>Desconto(-)</span>
        <span>${(order.discount || 0).toFixed(2).replace('.', ',')}</span>
      </div>
      
      <div class="divider" style="margin: 4px 0;"></div>
      
      <div class="total-row bold" style="font-size: ${fontSizeHeader}; border-top: 2px solid #000000; padding-top: 4px; font-weight: 900;">
        <span>TOTAL R$</span>
        <span>${(order.total || 0).toFixed(2).replace('.', ',')}</span>
      </div>

      ${order.paymentMethod ? `
        <div class="divider"></div>
        <div class="bold" style="font-size: ${fontSizeSmall}; margin-bottom: 2px;">PAGO VIA:</div>
        <div style="display: flex; justify-content: space-between; font-size: ${fontSizeBase}; font-weight: 900; color: #000000 !important;">
          <span style="text-transform: uppercase;">${paymentMethodLabel(order.paymentMethod)}</span>
          <span class="bold">R$ ${(order.total || 0).toFixed(2).replace('.', ',')}</span>
        </div>
      ` : ''}

      <div class="divider" style="margin-top: 15px;"></div>

      <div class="center bold" style="font-size: ${fontSizeSmall}; text-transform: uppercase;">
        ${printing.headerText || 'KITCHENFLOW AI APP'}
      </div>
      <div class="center" style="font-size: ${fontSizeSmall}; margin-top: 3px; font-weight: 700;">
        ${printing.footerText || 'Obrigado pela preferência!'}
      </div>

      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
            window.onafterprint = () => {
              window.close();
            };
            setTimeout(() => {
              window.onfocus = () => { window.close(); };
            }, 600);
          }, 300);
        };
      </script>
    </body>
    </html>
  `;
};

export const printTestReceipt = (settings: AdminSettings) => {
  const mockOrder: Partial<Order> = {
    id: 'TEST-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    items: [
      { productId: '1', name: 'Refeicao de Teste', quantity: 1, price: 30.90, observation: 'Ponto da carne correto' }
    ],
    total: 30.90,
    type: 'takeout',
    createdAt: new Date(),
    wantsFiscalCoupon: true,
    fiscalKey: '35260659256207000174650010000011091263520471',
    customerDocument: '96.556.642/0001-40',
    paymentMethod: 'cartao_credito'
  };
  
  handlePrintOrder(mockOrder, settings, { isFiscal: true });
};

/**
 * Auxiliar para pareamento de Impressora USB via WebUSB.
 * Tracionado diretamente da UI de Configurações
 */
export const pairUSBPrinter = async (): Promise<{ success: boolean; deviceName?: string; error?: string }> => {
  if (!(navigator as any).usb) {
    return { success: false, error: 'WebUSB API não é suportada neste navegador. Use Google Chrome ou Edge.' };
  }
  try {
    const device = await (navigator as any).usb.requestDevice({ filters: [] });
    // Guardar ID no localStorage para auto-reconectar posterior
    localStorage.setItem('paired_usb_vendor_id', String(device.vendorId));
    localStorage.setItem('paired_usb_product_id', String(device.productId));
    localStorage.setItem('paired_usb_name', device.productName || 'Impressora Térmica USB');

    return { 
      success: true, 
      deviceName: `${device.productName || 'Impressora'} (VID: ${device.vendorId}, PID: ${device.productId})`
    };
  } catch (error: any) {
    console.error('Erro de pareamento WebUSB:', error);
    let errorMsg = error?.message || 'Permissão negada pelo usuário';
    
    // Detectar cancelamento do usuário (fechou sem selecionar)
    const isUserCanceled = 
      errorMsg.toLowerCase().includes('no device selected') || 
      errorMsg.toLowerCase().includes('user cancelled') ||
      error?.name === 'NotFoundError';
      
    // Detectar especificamente restrição de política de segurança de iframe/sandbox
    const isSecurityOrPolicyError = 
      errorMsg.toLowerCase().includes('permissions policy') || 
      errorMsg.toLowerCase().includes('disallowed') || 
      error?.name === 'SecurityError';
      
    if (isUserCanceled) {
      errorMsg = 'Nenhum dispositivo foi selecionado. Pareamento cancelado.';
    } else if (isSecurityOrPolicyError) {
      errorMsg = 'Acesso ao USB rejeitado pelas políticas de segurança do frame incorporado do AI Studio. Para usar WebUSB, abra o aplicativo em uma Nova Aba fora do frame ou use os modos "Navegador" ou "WebSocket".';
    }
    
    return { success: false, error: errorMsg };
  }
};

/**
 * Converte string ASCII/Unicode para UTF-8/ISO-8859-1 Byte Array compatível com ESC/POS nativos
 */
const stringToESCBytes = (text: string): Uint8Array => {
  // Garantir finais de linha padrão ESC/POS com CR+LF (\r\n) para resetar a posição de impressão do carro na impressora térmica
  const textWithCRLF = text.replace(/\r?\n/g, '\r\n');

  // Substituir os acentos e símbolos especiais mais propensos a quebrar em impressoras de baixo custo
  const clean = textWithCRLF
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c')
    .replace(/º/g, '.')
    .replace(/ª/g, '.')
    .replace(/¹/g, '1')
    .replace(/²/g, '2')
    .replace(/³/g, '3');
    
  // Transforma cada caractere em 1 byte direto (ISO-8859-1 / Windows-1252)
  const bytes = new Uint8Array(clean.length);
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    // Preserva códigos padrão ASCII/Latin1 abaixo de 256; se maior, substitui por espaço (32) para evitar multibytes invasivos do UTF-8
    bytes[i] = code < 256 ? code : 32;
  }
  return bytes;
};

// Fila de impressão em memória (Spooler de Iframe em Background)
const printQueue: {
  order: Partial<Order>;
  settings: AdminSettings;
  options?: { isFiscal?: boolean };
}[] = [];

let isProcessingQueue = false;

const processNextPrintJob = async () => {
  if (printQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }

  isProcessingQueue = true;
  const { order, settings, options } = printQueue[0];
  const orderIdPart = order.id ? order.id.slice(-6).toUpperCase() : 'NOVO';

  try {
    const htmlContent = generateReceiptHtml(order, settings);
    
    // Remove scripts automáticos da geração para que o Spooler Iframe controle a impressão manualmente
    const cleanHtml = htmlContent.replace(/<script>[\s\S]*?<\/script>/gi, '');

    // Criar o iframe oculto posicionado fora da tela para evitar flicker ou novas abas/janelas
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      throw new Error('Não foi possível inicializar iframe de impressão.');
    }

    doc.open();
    doc.write(cleanHtml);
    doc.close();

    // Aguardar o carregamento de todas as imagens, fontes e estilos
    await new Promise<void>((resolve) => {
      const handleLoad = () => {
        setTimeout(resolve, 350); // delay suave para evitar páginas em branco
      };
      iframe.onload = handleLoad;
      setTimeout(resolve, 1500); // timeout de segurança
    });

    // Disparar o comando de impressão do navegador de forma isolada
    await new Promise<void>((resolve) => {
      let resolved = false;
      const finalize = () => {
        if (resolved) return;
        resolved = true;
        try {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        } catch (e) {
          console.warn('Erro ao limpar iframe de impressão:', e);
        }
        resolve();
      };

      if (iframe.contentWindow) {
        iframe.contentWindow.onafterprint = finalize;
      }

      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err: any) {
        console.error('Falha de execução do trigger de impressão na fila:', err);
        finalize();
      }

      // Timeout limite caso a janela de impressão do Chrome bloqueie a execução
      setTimeout(finalize, 6000);
    });

    window.dispatchEvent(new CustomEvent('kitchenflow-print-notifier', {
      detail: {
        message: `Fila de Impressão: Pedido #${orderIdPart} enviado à impressora padrão com sucesso!`,
        type: 'success'
      }
    }));

  } catch (err: any) {
    console.error('Erro na fila de impressão:', err);
    window.dispatchEvent(new CustomEvent('kitchenflow-print-notifier', {
      detail: {
        message: `Erro ao processar trabalho na fila: ${err?.message || err}`,
        type: 'error'
      }
    }));
  }

  // Avançar na fila de impressão
  printQueue.shift();
  setTimeout(processNextPrintJob, 300);
};

export const enqueueBrowserPrint = (order: Partial<Order>, settings: AdminSettings, options?: { isFiscal?: boolean }) => {
  const wantsFiscal = options?.isFiscal !== undefined 
    ? options.isFiscal 
    : (!!order.isFiscalIssued || !!order.wantsFiscalCoupon);
  const printOrder = { 
    ...order, 
    wantsFiscalCoupon: wantsFiscal,
    isFiscalIssued: wantsFiscal 
  };
  
  printQueue.push({ order: printOrder, settings, options });
  
  const orderIdPart = order.id ? order.id.slice(-6).toUpperCase() : 'NOVO';
  window.dispatchEvent(new CustomEvent('kitchenflow-print-notifier', {
    detail: {
      message: `Cupom do pedido #${orderIdPart} adicionado à fila de impressão...`,
      type: 'info'
    }
  }));

  if (!isProcessingQueue) {
    processNextPrintJob();
  }
};

export const handlePrintOrder = async (order: Partial<Order>, settings: AdminSettings, options?: { isFiscal?: boolean }) => {
  if (!order) return;
  const wantsFiscal = options?.isFiscal !== undefined 
    ? options.isFiscal 
    : (!!order.isFiscalIssued || !!order.wantsFiscalCoupon);
  const printOrder = { 
    ...order, 
    wantsFiscalCoupon: wantsFiscal,
    isFiscalIssued: wantsFiscal 
  };
  const orderIdPart = order.id ? order.id.slice(-6).toUpperCase() : 'NOVO';
  
  const mode = settings.printing.connectionMode || 'browser';
  const rawTextContent = generateRawTextReceipt(printOrder, settings);

  // Despachar evento para que a interface global do App exiba o modal interativo de impressão
  window.dispatchEvent(new CustomEvent('kitchenflow-show-print-modal', {
    detail: {
      order: printOrder,
      settings,
      html: generateReceiptHtml(printOrder, settings),
      rawText: rawTextContent,
      isFiscal: wantsFiscal
    }
  }));

  // ==========================================
  // OPÇÃO 1: WEBUSB DIRECT ESC/POS SILENT PRINTING
  // ==========================================
  if (mode === 'webusb') {
    let device: any = null;
    let claimedInterfaceNum: number | null = null;
    try {
      if (!(navigator as any).usb) {
        throw new Error('API WebUSB indisponível no navegador');
      }

      const vendorIdStr = localStorage.getItem('paired_usb_vendor_id');
      const productIdStr = localStorage.getItem('paired_usb_product_id');

      if (!vendorIdStr || !productIdStr) {
        throw new Error('Nenhuma impressora USB pareada nas configurações.');
      }

      const targetVendorId = Number(vendorIdStr);
      const targetProductId = Number(productIdStr);

      const devices = await (navigator as any).usb.getDevices();
      device = devices.find(d => d.vendorId === targetVendorId && d.productId === targetProductId);

      if (!device) {
        throw new Error('Impressora USB pareada não está conectada ou ligada.');
      }

      // Conexão e Ativação do Canal
      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      
      // Auto-descoberta de interface e endpoint BULK OUT (de saída de dados)
      let interfaceNumber = 0;
      let endpointOut = 1;
      let found = false;

      // Primeiro passo: procurar uma interface de classe de impressora (7)
      for (const inst of device.configuration?.interfaces || []) {
        for (const alt of inst.alternates) {
          if (alt.interfaceClass === 7) {
            for (const ep of alt.endpoints) {
              if (ep.direction === 'out' && ep.type === 'bulk') {
                interfaceNumber = inst.interfaceNumber;
                endpointOut = ep.endpointNumber;
                found = true;
                break;
              }
            }
          }
          if (found) break;
        }
        if (found) break;
      }

      // Segundo passo: se não achou na classe de impressora (7), varre qualquer interface que possua Bulk Out
      if (!found) {
        for (const inst of device.configuration?.interfaces || []) {
          for (const alt of inst.alternates) {
            for (const ep of alt.endpoints) {
              if (ep.direction === 'out' && ep.type === 'bulk') {
                interfaceNumber = inst.interfaceNumber;
                endpointOut = ep.endpointNumber;
                found = true;
                break;
              }
            }
            if (found) break;
          }
          if (found) break;
        }
      }

      // Reivindica a interface correta identificada de forma dinâmica
      await device.claimInterface(interfaceNumber);
      claimedInterfaceNum = interfaceNumber;

      // Preparar comandos nativos ESC/POS
      const ESC = 0x1B;
      const GS = 0x1D;
      
      const commands: number[] = [
        ESC, 0x40, // Inicializar impressora (Reset)
        ESC, 0x74, 16, // Configura tabela de caracteres para WPC1252 / ISO-8859-1
        ESC, 0x45, 1, // ESC E 1 - Ativar modo Negrito/Encorpado para aquecimento térmico mais nítido
      ];

      // Enviar os comandos de inicialização
      await device.transferOut(endpointOut, new Uint8Array(commands));
      await new Promise(r => setTimeout(r, 30));

      // Dividir linhas de texto em blocos de até 64 bytes com pequeno delay para evitar buffer overflow físico
      const dataBytes = stringToESCBytes(rawTextContent);
      const chunkSize = 64;
      for (let offset = 0; offset < dataBytes.length; offset += chunkSize) {
        const chunk = dataBytes.slice(offset, offset + chunkSize);
        await device.transferOut(endpointOut, chunk);
        await new Promise(r => setTimeout(r, 12)); // delay controlado de 12ms por lote para as mídias térmicas lentas
      }

      // Comando nativo de Avanço de papel de 5 linhas para garantir visualização
      const feedPaper = new Uint8Array([ESC, 0x64, 0x05]);
      await device.transferOut(endpointOut, feedPaper);
      await new Promise(r => setTimeout(r, 30));

      // Enviar comando de guilhotina de forma isolada, prevenindo que falhe caso a impressora não tenha guilhotina física
      try {
        const cutCommand = new Uint8Array([GS, 0x56, 42, 0x00]); // GS V B 0 (Corte parcial avançado mais tolerado do que GS V A)
        await device.transferOut(endpointOut, cutCommand);
      } catch (cutErr) {
        console.warn("Comando de corte de guilhotina rejeitado de forma segura:", cutErr);
      }

      console.log(`Impressão silenciosa via WebUSB concluída para o pedido #${orderIdPart}`);
      
      window.dispatchEvent(new CustomEvent('kitchenflow-print-notifier', {
        detail: {
          message: `Cupom #${orderIdPart} impresso silenciosamente via USB!`,
          type: 'success'
        }
      }));
      return;
    } catch (error: any) {
      console.warn("Falha física via WebUSB, revertendo para download spooled .print:", error);
      
      window.dispatchEvent(new CustomEvent('kitchenflow-print-notifier', {
        detail: {
          message: `USB Indisponível: ${error?.message || error}. Disparando download do arquivo temporário.`,
          type: 'info'
        }
      }));
      // Prossegue para o fluxo de download caso falhe a conexão física direta, garantindo que o usuário nunca fique sem o cupom!
    } finally {
      // Liberar com segurança o dispositivo USB e suas interfaces associadas
      if (device) {
        if (claimedInterfaceNum !== null) {
          try {
            await device.releaseInterface(claimedInterfaceNum);
          } catch (e) {
            console.warn("Erro ao desalocar interface WebUSB:", e);
          }
        }
        try {
          await device.close();
        } catch (e) {
          console.warn("Erro ao fechar conexão física WebUSB:", e);
        }
      }
    }
  }

  // ==========================================
  // OPÇÃO 2: LOCAL WEBSOCKET PRINTER BRIDGE
  // ==========================================
  if (mode === 'websocket') {
    try {
      const socketUrl = settings.printing.websocketUrl || 'ws://localhost:1221';
      const ws = new WebSocket(socketUrl);
      
      const printJob = {
        action: 'print',
        text: rawTextContent,
        html: generateReceiptHtml(printOrder, settings),
        wantsFiscal,
        orderId: order.id,
        printerWidth: settings.printing.paperWidth || '80mm',
        timestamp: Date.now()
      };

      ws.onopen = () => {
        ws.send(JSON.stringify(printJob));
        
        // Fechar com graciosidade
        setTimeout(() => ws.close(), 500);

        window.dispatchEvent(new CustomEvent('kitchenflow-print-notifier', {
          detail: {
            message: `Impressão enviada com sucesso para o Spooler Local! Pedido #${orderIdPart}`,
            type: 'success'
          }
        }));
      };

      ws.onerror = (err) => {
        console.error("Erro na ponte de impressão WebSocket:", err);
        throw new Error("Não foi possível conectar ao bridge na porta 1221. Iniciando download do arquivo temporário.");
      };
      return;
    } catch (error: any) {
      console.warn("WebSocket Spooler falhou, revertendo para download:", error);
      window.dispatchEvent(new CustomEvent('kitchenflow-print-notifier', {
        detail: {
          message: error?.message || 'Erro na ponte de impressão.',
          type: 'info'
        }
      }));
      // Prossegue para download de spool
    }
  }

  // ==========================================
  // OPÇÃO 3: NAVEGADOR (FILA DE IMPRESSÃO BACKGROUND) OU DOWNLOAD (SPOOL DE ARQUIVO)
  // ==========================================
  if (mode === 'browser') {
    enqueueBrowserPrint(printOrder, settings, options);
    return;
  }

  try {
    const blobPrint = new Blob([rawTextContent], { type: 'text/plain;charset=utf-8' });
    const blobPrintUrl = URL.createObjectURL(blobPrint);
    
    // Dispara o download em background do arquivo de spool
    const spoolLink = document.createElement('a');
    spoolLink.href = blobPrintUrl;
    
    const docName = wantsFiscal ? 'spool_fiscal' : 'spool_pedido';
    
    // Usamos extensões ideais .print e .tmp para fácil associação do driver de automação do restaurante
    spoolLink.download = `${docName}_${orderIdPart}.print`;
    document.body.appendChild(spoolLink);
    spoolLink.click();
    document.body.removeChild(spoolLink);
    
    // Revoga o link após um curtíssimo intervalo
    setTimeout(() => {
      URL.revokeObjectURL(blobPrintUrl);
    }, 1000);
    
    console.log(`Arquivo spooled .print gerado com sucesso para o pedido ${orderIdPart}.`);

    // Disparar evento personalizado para que a aplicação mostre o feedback instantâneo sem abrir popup
    window.dispatchEvent(new CustomEvent('kitchenflow-print-notifier', {
      detail: {
        message: wantsFiscal 
          ? `Arquivo temporário NFCe #${orderIdPart} gerado com sucesso!` 
          : `Arquivo temporário gerado para Pedido #${orderIdPart}!`,
        type: 'success'
      }
    }));
  } catch (error) {
    console.error("Falha ao exportar spooled file temporário de impressão:", error);
    
    window.dispatchEvent(new CustomEvent('kitchenflow-print-notifier', {
      detail: {
        message: 'Erro ao gerar arquivo temporário de impressão.',
        type: 'error'
      }
    }));
  }
};
