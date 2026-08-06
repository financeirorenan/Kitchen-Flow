export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export interface PasswordResetParams {
  email: string;
  resetLink?: string;
  temporaryPassword?: string;
}

export interface WelcomeEmailParams {
  email: string;
  name: string;
  role?: string;
  tenantName?: string;
  temporaryPassword?: string;
  loginUrl?: string;
}

export interface SaasInvoiceParams {
  email: string;
  tenantName: string;
  amount: number | string;
  planName?: string;
  dueDate?: string;
  description?: string;
  qrCodePix?: string;
  paymentUrl?: string;
}

/**
 * Envia um e-mail genérico através do endpoint backend que utiliza a API do Resend
 */
export async function sendGenericEmail(params: SendEmailParams) {
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.error || 'Erro ao enviar e-mail');
    }
    return data;
  } catch (error: any) {
    console.error('Error in sendGenericEmail:', error);
    throw error;
  }
}

/**
 * Envia um e-mail de recuperação de senha formatado via Resend
 */
export async function sendPasswordResetEmailResend(params: PasswordResetParams) {
  try {
    const response = await fetch('/api/email/send-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.error || 'Erro ao enviar e-mail de recuperação');
    }
    return data;
  } catch (error: any) {
    console.error('Error in sendPasswordResetEmailResend:', error);
    throw error;
  }
}

/**
 * Envia e-mail de boas-vindas para novos usuários criados no sistema via Resend
 */
export async function sendWelcomeEmailResend(params: WelcomeEmailParams) {
  try {
    const response = await fetch('/api/email/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.error || 'Erro ao enviar e-mail de boas-vindas');
    }
    return data;
  } catch (error: any) {
    console.error('Error in sendWelcomeEmailResend:', error);
    throw error;
  }
}

/**
 * Envia fatura / cobrança de SaaS por e-mail via Resend
 */
export async function sendSaasInvoiceEmailResend(params: SaasInvoiceParams) {
  try {
    const response = await fetch('/api/email/send-saas-billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.error || 'Erro ao enviar e-mail de cobrança SaaS');
    }
    return data;
  } catch (error: any) {
    console.error('Error in sendSaasInvoiceEmailResend:', error);
    throw error;
  }
}

/**
 * Teste rápido da API do Resend (envia Hello World para financeirorenanuk@gmail.com)
 */
export async function sendTestEmailResend(to?: string) {
  try {
    const response = await fetch('/api/email/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.error || 'Erro no envio de teste do Resend');
    }
    return data;
  } catch (error: any) {
    console.error('Error in sendTestEmailResend:', error);
    throw error;
  }
}
