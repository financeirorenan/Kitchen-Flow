import { AdminSettings } from '../types';

let cachedPaymentMethods: AdminSettings['paymentMethods'] = undefined;

export const setCachedPaymentMethods = (methods?: AdminSettings['paymentMethods']) => {
  if (methods && methods.length > 0) {
    cachedPaymentMethods = methods;
  }
};

/**
 * Normaliza qualquer string ou identificador de método de pagamento para as chaves canônicas do sistema:
 * 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'vale_refeicao' | 'conta_cliente'
 */
export const normalizePaymentMethod = (method: string | undefined | null, adminSettings?: AdminSettings): string => {
  if (adminSettings?.paymentMethods && adminSettings.paymentMethods.length > 0) {
    cachedPaymentMethods = adminSettings.paymentMethods;
  }

  if (!method) return 'dinheiro';
  const cleanMethod = String(method).trim().toLowerCase();
  const cleanNoAccents = cleanMethod.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const standardKeys = [
    'dinheiro',
    'cartao_credito',
    'cartao_debito',
    'pix',
    'vale_refeicao',
    'conta_cliente',
  ];
  if (standardKeys.includes(cleanMethod)) return cleanMethod;

  // Equivalências diretas
  if (cleanNoAccents === 'cash' || cleanNoAccents === 'especie' || cleanNoAccents === 'cedula') return 'dinheiro';
  if (cleanNoAccents === 'debit' || cleanNoAccents === 'debito' || cleanNoAccents === 'cartao_debito' || cleanNoAccents === 'c. debito' || cleanNoAccents === 'c debito') return 'cartao_debito';
  if (cleanNoAccents === 'credit' || cleanNoAccents === 'credito' || cleanNoAccents === 'cartao_credito' || cleanNoAccents === 'c. credito' || cleanNoAccents === 'c credito') return 'cartao_credito';
  if (cleanNoAccents === 'card' || cleanNoAccents === 'cartao') return 'cartao_credito';
  if (cleanNoAccents === 'pix' || cleanNoAccents === 'qrcode' || cleanNoAccents === 'qr_code' || cleanNoAccents === 'transferencia' || cleanNoAccents === 'ted' || cleanNoAccents === 'doc') return 'pix';
  if (cleanNoAccents === 'voucher' || cleanNoAccents === 'vr' || cleanNoAccents === 'va' || cleanNoAccents === 'ticket' || cleanNoAccents === 'sodexo' || cleanNoAccents === 'alelo' || cleanNoAccents === 'ben' || cleanNoAccents === 'pluxee') return 'vale_refeicao';
  if (cleanNoAccents === 'account' || cleanNoAccents === 'fiado' || cleanNoAccents === 'carteira' || cleanNoAccents === 'promissoria' || cleanNoAccents === 'convenio') return 'conta_cliente';

  // Verificação no cadastro de métodos de pagamento das configurações (ou em cache)
  const methodsPool = adminSettings?.paymentMethods || cachedPaymentMethods;
  if (methodsPool && methodsPool.length > 0) {
    const config = methodsPool.find(
      (m) =>
        m.id === method ||
        m.name.trim().toLowerCase() === cleanMethod ||
        m.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === cleanNoAccents ||
        m.type.trim().toLowerCase() === cleanMethod
    );
    if (config) {
      const configNameNoAccents = config.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (configNameNoAccents.includes('debito') || configNameNoAccents.includes('debit')) return 'cartao_debito';
      if (configNameNoAccents.includes('credito') || configNameNoAccents.includes('credit')) return 'cartao_credito';
      if (configNameNoAccents.includes('pix')) return 'pix';
      if (configNameNoAccents.includes('vale') || configNameNoAccents.includes('refeicao') || configNameNoAccents.includes('alimentacao')) return 'vale_refeicao';
      if (configNameNoAccents.includes('fiado') || configNameNoAccents.includes('conta')) return 'conta_cliente';

      switch (config.type) {
        case 'cash': return 'dinheiro';
        case 'credit': return 'cartao_credito';
        case 'debit': return 'cartao_debito';
        case 'pix': return 'pix';
        case 'voucher': return 'vale_refeicao';
        case 'account': return 'conta_cliente';
        case 'other':
          return 'pix';
      }
    }
  }

  // Verificações por substring (Cartão e PIX nunca podem virar dinheiro!)
  if (cleanMethod.includes('pix') || cleanMethod.includes('qr') || cleanMethod.includes('chave') || cleanMethod.includes('transferencia') || cleanMethod.includes('transferência') || cleanMethod.includes('picpay') || cleanMethod.includes('mercadopago') || cleanMethod.includes('mercado_pago')) {
    return 'pix';
  }
  if (cleanMethod.includes('debito') || cleanMethod.includes('débito') || cleanMethod.includes('debit')) {
    return 'cartao_debito';
  }
  if (
    cleanMethod.includes('credito') || 
    cleanMethod.includes('crédito') || 
    cleanMethod.includes('credit') || 
    cleanMethod.includes('cartao') || 
    cleanMethod.includes('cartão') || 
    cleanMethod.includes('card') || 
    cleanMethod.includes('maquininha') || 
    cleanMethod.includes('pos') ||
    cleanMethod.includes('visa') ||
    cleanMethod.includes('master') ||
    cleanMethod.includes('elo') ||
    cleanMethod.includes('amex') ||
    cleanMethod.includes('hiper')
  ) {
    return 'cartao_credito';
  }
  if (
    cleanMethod.includes('vale') ||
    cleanMethod.includes('refeicao') ||
    cleanMethod.includes('refeição') ||
    cleanMethod.includes('alimentacao') ||
    cleanMethod.includes('alimentação') ||
    cleanMethod.includes('ticket') ||
    cleanMethod.includes('sodexo') ||
    cleanMethod.includes('alelo') ||
    cleanMethod.includes('vr') ||
    cleanMethod.includes('va') ||
    cleanMethod.includes('ben') ||
    cleanMethod.includes('pluxee')
  ) {
    return 'vale_refeicao';
  }
  if (
    cleanMethod.includes('fiado') ||
    cleanMethod.includes('cliente') ||
    cleanMethod.includes('carteira') ||
    cleanMethod.includes('conta') ||
    cleanMethod.includes('promissoria') ||
    cleanMethod.includes('promissória') ||
    cleanMethod.includes('convenio') ||
    cleanMethod.includes('convênio') ||
    cleanMethod.includes('a prazo')
  ) {
    return 'conta_cliente';
  }
  if (
    cleanMethod.includes('dinheiro') ||
    cleanMethod.includes('money') ||
    cleanMethod.includes('efetivo') ||
    cleanMethod.includes('cedula') ||
    cleanMethod.includes('cédula') ||
    cleanMethod.includes('especie') ||
    cleanMethod.includes('espécie') ||
    cleanMethod.includes('cash')
  ) {
    return 'dinheiro';
  }

  if (cleanMethod.includes('online') || cleanMethod.includes('app') || cleanMethod.includes('marketplace') || cleanMethod.includes('ifood')) {
    return 'pix';
  }

  return 'dinheiro';
};

/**
 * Traduz o método de pagamento para rótulo legível em UI e Comprovantes
 */
export const getPaymentMethodLabel = (method: string | undefined | null): string => {
  if (!method) return 'Não Informado';
  const norm = normalizePaymentMethod(method);
  switch (norm) {
    case 'dinheiro': return 'Dinheiro';
    case 'cartao_credito': return 'Cartão de Crédito';
    case 'cartao_debito': return 'Cartão de Débito';
    case 'pix': return 'Pix';
    case 'vale_refeicao': return 'Vale Refeição / Alimentação';
    case 'conta_cliente': return 'Conta Cliente / Fiado';
    default: return method;
  }
};

/**
 * Verifica se um pagamento é em dinheiro físico em mãos
 */
export const isCashPayment = (method: string | undefined | null): boolean => {
  return normalizePaymentMethod(method) === 'dinheiro';
};

/**
 * Verifica se um pagamento é eletrônico/digital
 */
export const isElectronicPayment = (method: string | undefined | null): boolean => {
  const norm = normalizePaymentMethod(method);
  return ['pix', 'cartao_credito', 'cartao_debito', 'vale_refeicao'].includes(norm);
};
