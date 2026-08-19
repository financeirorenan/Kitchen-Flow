import { PaymentMethod, AdminSettings } from '../types';

/**
 * Normaliza qualquer string ou identificador de método de pagamento para as chaves canônicas do sistema:
 * 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'vale_refeicao' | 'conta_cliente'
 */
export const normalizePaymentMethod = (method: string | undefined | null, adminSettings?: AdminSettings): string => {
  if (!method) return 'dinheiro';
  const cleanMethod = String(method).trim().toLowerCase();

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
  if (cleanMethod === 'cash' || cleanMethod === 'especie' || cleanMethod === 'espécie') return 'dinheiro';
  if (cleanMethod === 'credit' || cleanMethod === 'credito' || cleanMethod === 'crédito' || cleanMethod === 'cartao_credito') return 'cartao_credito';
  if (cleanMethod === 'debit' || cleanMethod === 'debito' || cleanMethod === 'débito' || cleanMethod === 'cartao_debito') return 'cartao_debito';
  if (cleanMethod === 'card' || cleanMethod === 'cartao' || cleanMethod === 'cartão') return 'cartao_credito';
  if (cleanMethod === 'pix' || cleanMethod === 'qrcode' || cleanMethod === 'qr_code') return 'pix';
  if (cleanMethod === 'voucher' || cleanMethod === 'vr' || cleanMethod === 'va') return 'vale_refeicao';
  if (cleanMethod === 'account' || cleanMethod === 'fiado' || cleanMethod === 'carteira') return 'conta_cliente';

  // Verificação no cadastro de métodos de pagamento das configurações
  if (adminSettings && adminSettings.paymentMethods) {
    const config = adminSettings.paymentMethods.find(
      (m) =>
        m.id === method ||
        m.name.trim().toLowerCase() === cleanMethod ||
        m.type.trim().toLowerCase() === cleanMethod
    );
    if (config) {
      switch (config.type) {
        case 'cash': return 'dinheiro';
        case 'credit': return 'cartao_credito';
        case 'debit': return 'cartao_debito';
        case 'pix': return 'pix';
        case 'voucher': return 'vale_refeicao';
        case 'account': return 'conta_cliente';
      }
    }
  }

  // Verificações por substring (Cartão nunca pode virar dinheiro!)
  if (cleanMethod.includes('credito') || cleanMethod.includes('crédito') || cleanMethod.includes('credit')) {
    return 'cartao_credito';
  }
  if (cleanMethod.includes('debito') || cleanMethod.includes('débito') || cleanMethod.includes('debit')) {
    return 'cartao_debito';
  }
  if (cleanMethod.includes('cartao') || cleanMethod.includes('cartão') || cleanMethod.includes('card') || cleanMethod.includes('maquininha') || cleanMethod.includes('pos')) {
    return 'cartao_credito';
  }
  if (cleanMethod.includes('pix')) {
    return 'pix';
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
    cleanMethod.includes('va')
  ) {
    return 'vale_refeicao';
  }
  if (
    cleanMethod.includes('fiado') ||
    cleanMethod.includes('cliente') ||
    cleanMethod.includes('carteira') ||
    cleanMethod.includes('conta')
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
    cleanMethod.includes('espécie')
  ) {
    return 'dinheiro';
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
