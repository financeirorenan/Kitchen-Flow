/**
 * Utilities for LGPD (Lei Geral de Proteção de Dados) compliance.
 * Provides data masking (anonymization) functions for sensitive PII (Personally Identifiable Information).
 */

export const isLgpdMaskingEnabled = (): boolean => {
  return localStorage.getItem('lgpd_mask_pii') === 'true';
};

export const maskPhoneLGPD = (phone: string): string => {
  if (!phone) return '';
  if (!isLgpdMaskingEnabled()) return phone;
  
  const cleaned = phone.trim();
  if (cleaned.length < 8) return '****-****';
  
  // Mask middle characters
  // Example: (11) 98765-4321 -> (11) 9****-**21
  if (cleaned.includes(')')) {
    const parts = cleaned.split(')');
    const ddd = parts[0] + ')';
    const number = parts[1].trim();
    if (number.length >= 8) {
      return `${ddd} ${number.substring(0, 2)}****-${number.substring(number.length - 2)}`;
    }
  }
  
  return `${cleaned.substring(0, 2)}****-${cleaned.substring(cleaned.length - 2)}`;
};

export const maskEmailLGPD = (email: string): string => {
  if (!email) return '';
  if (!isLgpdMaskingEnabled()) return email;
  
  const trimmed = email.trim();
  const index = trimmed.indexOf('@');
  if (index === -1) return '*****';
  
  const username = trimmed.substring(0, index);
  const domain = trimmed.substring(index);
  
  if (username.length <= 2) {
    return `**${domain}`;
  }
  
  return `${username.substring(0, 2)}****${username.substring(username.length - 1)}${domain}`;
};

export const maskDocumentLGPD = (doc: string): string => {
  if (!doc) return '';
  if (!isLgpdMaskingEnabled()) return doc;
  
  const cleaned = doc.trim();
  // CPF: 123.456.789-00 -> 123.***.***-00
  if (cleaned.length === 14) {
    return `${cleaned.substring(0, 4)}***.***${cleaned.substring(11)}`;
  }
  // CNPJ: 12.345.678/0001-99 -> 12.***.***/0001-99
  if (cleaned.length === 18) {
    return `${cleaned.substring(0, 3)}***.***${cleaned.substring(10)}`;
  }
  
  return cleaned.substring(0, Math.min(3, cleaned.length)) + '*****';
};
