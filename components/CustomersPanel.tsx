
import React, { useState, useMemo, memo } from 'react';
import { Customer, CustomerTransaction, FinancialRecord } from '../types';
import { 
  UserPlus, Search, Phone, Mail, MapPin, 
  FileText, History, Wallet, ArrowDownCircle, 
  ArrowUpCircle, X, Check, Save, Plus,
  DollarSign, MoreVertical, CreditCard, Banknote, Smartphone,
  AlertCircle, ChevronRight, UserCircle, Edit3, Printer, Calendar,
  MessageSquare, CheckCircle2, Zap, Receipt, Share2, Sparkles
} from 'lucide-react';
import { maskPhone, maskCPF, maskCurrency, maskCEP } from '../utils/masks';
import { maskPhoneLGPD, maskEmailLGPD, maskDocumentLGPD } from '../utils/lgpd';

interface CustomersPanelProps {
  customers: Customer[];
  onAddCustomer: (customer: Partial<Customer>) => void;
  onUpdateCustomer: (id: string, updates: Partial<Customer>) => void;
  onAddFinancialRecord: (record: Partial<FinancialRecord>) => void;
}

const parseSafeDate = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date() : val;
  }
  // Se for Timestamp do Firestore
  if (val && typeof val.toDate === 'function') {
    return val.toDate();
  }
  if (val && typeof val._seconds === 'number') {
    return new Date(val._seconds * 1000);
  }
  if (val && typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000);
  }
  if (val && val.seconds && typeof val.seconds.low === 'number') {
    return new Date(val.seconds.low * 1000);
  }
  if (val && typeof val.getTime === 'function') {
    return new Date(val.getTime());
  }
  const dateStr = String(val);
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  if (/^\d+$/.test(dateStr)) {
    return new Date(Number(dateStr));
  }
  return new Date();
};

const PiiField: React.FC<{ value: string; maskFn: (val: string) => string; icon?: React.ReactNode; className?: string }> = ({ value, maskFn, icon, className = "" }) => {
  const [revealed, setRevealed] = useState(false);
  const isMasked = localStorage.getItem('lgpd_mask_pii') === 'true';

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); if (isMasked) setRevealed(!revealed); }}
      className={`flex items-center gap-1.5 text-[10px] font-bold text-slate-500 ${isMasked ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''} ${className}`}
      title={isMasked ? (revealed ? 'Clique para ocultar (LGPD)' : 'Clique para revelar (LGPD)') : undefined}
    >
      {icon}
      <span>{isMasked && !revealed ? maskFn(value) : value}</span>
      {isMasked && (
        <span className="text-[7px] px-1 py-0.2 bg-slate-100 text-slate-400 rounded font-normal shrink-0">
          {revealed ? 'exposto' : 'oculto'}
        </span>
      )}
    </div>
  );
};

const CustomersPanel: React.FC<CustomersPanelProps> = memo(({ 
  customers, 
  onAddCustomer, 
  onUpdateCustomer,
  onAddFinancialRecord 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const activeCustomer = useMemo(() => {
    if (!selectedCustomer) return null;
    return customers.find(c => c.id === selectedCustomer.id) || selectedCustomer;
  }, [customers, selectedCustomer]);

  const [showBaixaModal, setShowBaixaModal] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Baixa Form
  const [baixaAmount, setBaixaAmount] = useState('');
  const [baixaMethod, setBaixaMethod] = useState<string>('dinheiro');
  const [manualTransactionType, setManualTransactionType] = useState<'credit' | 'debit'>('credit');
  const [manualTransactionDescription, setManualTransactionDescription] = useState('');
  const [sendWhatsAppAfterBaixa, setSendWhatsAppAfterBaixa] = useState<boolean>(true);
  const [printReceiptAfterBaixa, setPrintReceiptAfterBaixa] = useState<boolean>(false);

  // Customer Form
  const [formName, setFormName] = useState('');
  const [formDoc, setFormDoc] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCrmStatus, setFormCrmStatus] = useState<Customer['crmStatus']>('active');
  const [formTags, setFormTags] = useState<string>('');

  // Extrato Filter
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'movimentos' | 'itens'>('movimentos');
  const [onlyDebit, setOnlyDebit] = useState<boolean>(false);

  const debtorsCount = useMemo(() => {
    return customers.filter(c => (c.balance ?? 0) > 0).length;
  }, [customers]);

  const totalDebtSum = useMemo(() => {
    return customers.reduce((acc, c) => acc + Math.max(0, c.balance ?? 0), 0);
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const term = (searchTerm || '').toLowerCase().trim();
    return customers.filter(c => {
      const matchesSearch = !term ||
        (c.name || '').toLowerCase().includes(term) || 
        (c.document || '').includes(term) ||
        (c.phone || '').includes(term);

      if (!matchesSearch) return false;
      if (onlyDebit) {
        return (c.balance ?? 0) > 0;
      }
      return true;
    });
  }, [customers, searchTerm, onlyDebit]);

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormDoc(customer.document || '');
    setFormPhone(customer.phone || '');
    setFormEmail(customer.email || '');
    setFormAddress(customer.address || '');
    setFormCrmStatus(customer.crmStatus || 'active');
    setFormTags(customer.tags?.join(', ') || '');
    setShowAddModal(true);
  };

  const handleOpenBaixa = (customer: Customer, type: 'credit' | 'debit' = 'credit', prefillAmount?: number) => {
    setShowBaixaModal(customer);
    setManualTransactionType(type);
    if (prefillAmount !== undefined) {
      setBaixaAmount(prefillAmount > 0 ? prefillAmount.toFixed(2) : '');
    } else if (type === 'credit' && (customer.balance ?? 0) > 0) {
      setBaixaAmount((customer.balance ?? 0).toFixed(2));
    } else {
      setBaixaAmount('');
    }
    setManualTransactionDescription(type === 'credit' ? 'Baixa / Pagamento de Fiado' : 'Lançamento de Débito Fiado');
  };

  const handlePrintReceipt = (customer: Customer, transaction: CustomerTransaction, remainingBalance: number) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const d = parseSafeDate(transaction.date);
    const dateFormatted = `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante de Pagamento - ${customer.name}</title>
          <style>
            body { font-family: monospace; padding: 15px; color: #000; width: 300px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .header h2 { margin: 0; font-size: 14px; text-transform: uppercase; }
            .header p { margin: 2px 0; font-size: 11px; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 11px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .amount { font-size: 16px; font-weight: bold; text-align: center; margin: 10px 0; }
            .footer { text-align: center; font-size: 10px; margin-top: 12px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>RECIBO DE PAGAMENTO</h2>
            <p>BAIXA DE CONTA / FIADO</p>
          </div>
          <div class="row">
            <span>Cliente:</span>
            <strong>${customer.name}</strong>
          </div>
          ${customer.document ? `<div class="row"><span>Doc:</span><span>${customer.document}</span></div>` : ''}
          ${customer.phone ? `<div class="row"><span>Tel:</span><span>${customer.phone}</span></div>` : ''}
          <div class="row">
            <span>Data/Hora:</span>
            <span>${dateFormatted}</span>
          </div>
          <div class="divider"></div>
          <div class="row">
            <span>Operação:</span>
            <span>${transaction.description || 'Pagamento Recebido'}</span>
          </div>
          <div class="row">
            <span>Forma de Pgto:</span>
            <strong>${(transaction.paymentMethod || 'Dinheiro').toUpperCase()}</strong>
          </div>
          <div class="amount">
            VALOR RECEBIDO: R$ ${(transaction.amount ?? 0).toFixed(2)}
          </div>
          <div class="divider"></div>
          <div class="row">
            <span>Saldo Anterior:</span>
            <span>R$ ${(remainingBalance + transaction.amount).toFixed(2)}</span>
          </div>
          <div class="row">
            <span>Saldo Restante:</span>
            <strong>R$ ${remainingBalance.toFixed(2)}</strong>
          </div>
          ${remainingBalance <= 0 ? '<p style="text-align:center;font-weight:bold;margin:6px 0;">*** CONTA QUITADA ***</p>' : ''}
          <div class="divider"></div>
          <div class="footer">
            <p>Obrigado pela preferência!</p>
            <p>Comprovante gerado pelo sistema</p>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSendWhatsAppReceipt = (customer: Customer, transaction: CustomerTransaction, remainingBalance: number) => {
    if (!customer.phone) {
      alert("Este cliente não possui telefone cadastrado para envio de WhatsApp.");
      return;
    }

    const cleanPhone = customer.phone.replace(/\D/g, '');
    const phoneFormatted = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const d = parseSafeDate(transaction.date);
    const dateFormatted = `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    let message = `Olá, *${customer.name}*!\n\n`;
    message += `✅ *COMPROVANTE DE PAGAMENTO / BAIXA DE FIADO*\n\n`;
    message += `💰 *Valor Recebido:* R$ ${(transaction.amount ?? 0).toFixed(2)}\n`;
    message += `💳 *Forma de Pagamento:* ${(transaction.paymentMethod || 'Dinheiro').toUpperCase()}\n`;
    message += `📅 *Data/Hora:* ${dateFormatted}\n`;
    message += `📝 *Detalhes:* ${transaction.description || 'Quitação de conta'}\n\n`;
    
    if (remainingBalance <= 0) {
      message += `🎉 *Saldo Restante:* R$ 0,00 (Sua conta está totalmente quitada! Muito obrigado!)\n\n`;
    } else {
      message += `📊 *Saldo Restante em Aberto:* R$ ${remainingBalance.toFixed(2)}\n\n`;
    }
    message += `Agradecemos pela pontualidade e preferência! 🍽️`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneFormatted}?text=${encodedMessage}`, '_blank');
  };

  const handleSaveCustomer = () => {
    if (!formName || !formPhone) {
      alert("Nome e Telefone são obrigatórios.");
      return;
    }

    const normFormPhone = (formPhone || '').replace(/\D/g, '');

    // Validação de duplicidade de telefone (procurar se já existe outro cliente com este telefone)
    const existing = customers.find(c => {
      if (editingCustomer && c.id === editingCustomer.id) return false;
      return (c.phone || '').replace(/\D/g, '') === normFormPhone;
    });

    const customerData = {
      name: formName,
      document: formDoc,
      phone: formPhone,
      email: formEmail,
      address: formAddress,
      crmStatus: formCrmStatus,
      tags: formTags.split(',').map(t => t.trim()).filter(t => t.length > 0),
      addresses: editingCustomer?.addresses || (formAddress ? [formAddress] : [])
    };

    if (existing) {
      const confirmUnify = window.confirm(
        `O telefone fornecido (${formPhone}) já está cadastrado para o cliente: "${existing.name}".\n\nDeseja unificar todas as contas, saldos devedores (fiado) e históricos de pedidos sob o primeiro cadastro de "${existing.name}" para evitar duplicados?`
      );

      if (!confirmUnify) {
        return;
      }

      if (editingCustomer) {
        onUpdateCustomer(editingCustomer.id, customerData);
      } else {
        onAddCustomer({
          ...customerData,
          balance: 0,
          history: []
        });
      }

      alert(`Registros e histórico/pedidos de fiado unificados com sucesso sob o cadastro de: ${existing.name}`);
      setSelectedCustomer(existing);
      setShowAddModal(false);
      resetForm();
      return;
    }

    if (editingCustomer) {
      onUpdateCustomer(editingCustomer.id, customerData);
    } else {
      onAddCustomer({
        ...customerData,
        balance: 0,
        history: []
      });
    }

    setShowAddModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormName('');
    setFormDoc('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormCrmStatus('active');
    setFormTags('');
    setEditingCustomer(null);
  };

  const handleBaixa = () => {
    if (!showBaixaModal || !baixaAmount) return;
    const amount = parseFloat(baixaAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Por favor, informe um valor numérico válido maior que zero.");
      return;
    }
    
    const transaction: CustomerTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: manualTransactionType,
      amount: amount,
      description: manualTransactionDescription || (manualTransactionType === 'credit' ? `Recebimento de Fiado via ${baixaMethod.toUpperCase()}` : 'Lançamento de Débito Manual (Fiado)'),
      date: new Date(),
      paymentMethod: manualTransactionType === 'credit' ? baixaMethod : undefined
    };

    const newBalance = manualTransactionType === 'debit' 
      ? (showBaixaModal.balance ?? 0) + amount 
      : Math.max(0, (showBaixaModal.balance ?? 0) - amount);

    onUpdateCustomer(showBaixaModal.id, {
      balance: newBalance,
      history: [transaction, ...(showBaixaModal.history || [])]
    });

    if (manualTransactionType === 'credit') {
      onAddFinancialRecord({
        type: 'income',
        amount: amount,
        category: 'Recebimento Fiado',
        description: `Baixa de conta: ${showBaixaModal.name} (${baixaMethod.toUpperCase()})`,
        paymentMethod: baixaMethod,
        date: new Date()
      });

      if (sendWhatsAppAfterBaixa && showBaixaModal.phone) {
        handleSendWhatsAppReceipt(showBaixaModal, transaction, newBalance);
      }

      if (printReceiptAfterBaixa) {
        handlePrintReceipt(showBaixaModal, transaction, newBalance);
      }
    }

    const settledCustomer = showBaixaModal;
    setShowBaixaModal(null);
    setBaixaAmount('');
    setManualTransactionDescription('');
  };

  const filteredHistory = useMemo(() => {
    if (!activeCustomer) return [];
    let history = [...(activeCustomer.history || [])];
    if (startDate) {
      const [year, month, day] = startDate.split('-').map(Number);
      const start = new Date(year, month - 1, day, 0, 0, 0, 0);
      history = history.filter(t => parseSafeDate(t.date).getTime() >= start.getTime());
    }
    if (endDate) {
      const [year, month, day] = endDate.split('-').map(Number);
      const end = new Date(year, month - 1, day, 23, 59, 59, 999);
      history = history.filter(t => parseSafeDate(t.date).getTime() <= end.getTime());
    }
    return history;
  }, [activeCustomer, startDate, endDate]);

  const aggregatedItems = useMemo(() => {
    const itemMap: Record<string, number> = {};
    filteredHistory.forEach(t => {
      if (t.type === 'debit' && t.items) {
        t.items.forEach(item => {
          const qty = item.quantity || 1;
          const name = item.name || '';
          if (name) {
            itemMap[name] = (itemMap[name] || 0) + qty;
          }
        });
      }
    });
    return Object.entries(itemMap)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [filteredHistory]);

  const handlePrintExtrato = () => {
    if (!activeCustomer) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const historyHtml = filteredHistory.map(t => {
      const d = parseSafeDate(t.date);
      return `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px; font-size: 12px;">${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
          <td style="padding: 8px; font-size: 12px;">${t.description}</td>
          <td style="padding: 8px; font-size: 12px; text-align: right; color: ${t.type === 'debit' ? '#e11d48' : '#059669'}; font-weight: bold;">
            ${t.type === 'debit' ? '+' : '-'} R$ ${(t.amount ?? 0).toFixed(2)}
          </td>
        </tr>
      `;
    }).join('');

    const aggregatedHtml = aggregatedItems.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px; font-size: 12px; font-weight: bold; width: 60px;">${item.quantity}x</td>
        <td style="padding: 8px; font-size: 12px; color: #334155; font-weight: 500;">${item.name}</td>
      </tr>
    `).join('');

    const itemsTableHtml = aggregatedItems.length > 0 ? `
      <div style="margin-top: 35px;">
        <h2 style="font-size: 13px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; color: #4f46e5; text-transform: uppercase; font-weight: 950; letter-spacing: 0.5px;">Resumo de Itens Consumidos (Período)</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 8px; font-size: 11px; text-transform: uppercase; text-align: left; width: 60px;">Qtd</th>
              <th style="padding: 8px; font-size: 11px; text-transform: uppercase; text-align: left;">Item / Produto</th>
            </tr>
          </thead>
          <tbody>
            ${aggregatedHtml}
          </tbody>
        </table>
      </div>
    ` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Extrato - ${activeCustomer.name}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #334155; }
            h1 { font-size: 20px; margin-bottom: 5px; }
            p { font-size: 12px; margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; background: #f8fafc; padding: 8px; font-size: 12px; border-bottom: 2px solid #e2e8f0; }
            .footer { margin-top: 30px; border-top: 2px solid #e2e8f0; padding-top: 10px; text-align: right; }
            .balance { font-size: 18px; font-weight: 900; color: #4f46e5; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1>Extrato da Conta</h1>
              <p><strong>Cliente:</strong> ${activeCustomer.name}</p>
              <p><strong>Documento:</strong> ${activeCustomer.document || ''}</p>
              <p><strong>Período:</strong> ${startDate || 'Início'} até ${endDate || 'Fim'}</p>
            </div>
            <div style="text-align: right;">
              <p>Data de Emissão: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th style="text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${historyHtml.length > 0 ? historyHtml : '<tr><td colspan="3" style="text-align: center; padding: 20px;">Nenhuma movimentação no período</td></tr>'}
            </tbody>
          </table>

          ${itemsTableHtml}
          
          <div class="footer">
            <p>Saldo Consolidado</p>
            <p class="balance">R$ ${(activeCustomer.balance ?? 0).toFixed(2)}</p>
          </div>
          
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header Cards & Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <UserCircle size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Clientes</p>
            <p className="text-xl font-black text-slate-900">{customers.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertCircle size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contas em Aberto (Fiado)</p>
            <p className="text-xl font-black text-rose-600">{debtorsCount} clientes</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total a Receber (Fiados)</p>
            <p className="text-xl font-black text-emerald-600">R$ {totalDebtSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Action Bar & Search Filters */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por nome, telefone ou CPF/CNPJ..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <label 
            htmlFor="filter-only-debit"
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-black cursor-pointer transition-all select-none shadow-sm ${
              onlyDebit 
                ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-500/20' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <input 
              id="filter-only-debit"
              type="checkbox" 
              checked={onlyDebit}
              onChange={(e) => setOnlyDebit(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-600"
            />
            <span>Apenas com Saldo Devedor (Fiado)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              onlyDebit ? 'bg-rose-200 text-rose-900' : 'bg-slate-100 text-slate-600'
            }`}>
              {debtorsCount}
            </span>
          </label>
        </div>

        <button 
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 shrink-0"
        >
          <UserPlus size={16} /> Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista de Clientes */}
        <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {filteredCustomers.length === 0 ? (
            <div className="bg-white p-8 rounded-[2rem] border border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Search size={20} />
              </div>
              <p className="text-sm font-bold text-slate-700">Nenhum cliente encontrado</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {onlyDebit 
                  ? 'Não há clientes cadastrados com saldo devedor pendente no momento.'
                  : 'Tente ajustar os termos da busca.'}
              </p>
              {onlyDebit && (
                <button
                  type="button"
                  onClick={() => setOnlyDebit(false)}
                  className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700 underline"
                >
                  Ver todos os clientes
                </button>
              )}
            </div>
          ) : (
            filteredCustomers.map(customer => {
              const hasDebt = (customer.balance ?? 0) > 0;
              const isSelected = selectedCustomer?.id === customer.id;

              return (
                <div 
                  key={customer.id} 
                  className={`bg-white p-3.5 rounded-[1.5rem] border-2 transition-all cursor-pointer group ${isSelected ? 'border-indigo-600 shadow-xl' : 'border-transparent hover:border-slate-200 shadow-sm'}`}
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${hasDebt ? 'bg-rose-50 text-rose-600 ring-2 ring-rose-100' : 'bg-emerald-50 text-emerald-600'}`}>
                        {(customer.name || 'C').charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-800">{customer.name || ''}</h3>
                          {customer.crmStatus && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[6px] font-black uppercase border ${
                              customer.crmStatus === 'vip' ? 'bg-amber-100 text-amber-600 border-amber-200' :
                              customer.crmStatus === 'lead' ? 'bg-indigo-100 text-indigo-600 border-indigo-200' :
                              customer.crmStatus === 'active' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                              'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {customer.crmStatus}
                            </span>
                          )}
                          {customer.source && (
                            <span className="px-1.5 py-0.5 rounded-full text-[6px] font-black uppercase bg-indigo-50 text-indigo-400 border border-indigo-100">
                               {customer.source}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <PiiField 
                            value={customer.document} 
                            maskFn={maskDocumentLGPD} 
                            className="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                          />
                          {customer.tags && customer.tags.length > 0 && (
                            <div className="flex gap-1 ml-2">
                               {customer.tags.map((tag, i) => (
                                 <span key={i} className="text-[7px] font-bold text-slate-400">#{tag}</span>
                               ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">
                         {hasDebt ? 'Saldo Devedor (Fiado)' : 'Saldo em Conta'}
                       </p>
                       <p className={`text-xl font-black tracking-tighter ${hasDebt ? 'text-rose-600' : 'text-emerald-600'}`}>
                         R$ {(customer.balance ?? 0).toFixed(2)}
                       </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex gap-3">
                      <PiiField 
                        value={customer.phone} 
                        maskFn={maskPhoneLGPD} 
                        icon={<Phone size={12} className="text-indigo-500" />} 
                        className="text-[10px] font-bold text-slate-500"
                      />
                      {customer.email && (
                        <PiiField 
                          value={customer.email} 
                          maskFn={maskEmailLGPD} 
                          icon={<Mail size={12} className="text-indigo-500" />} 
                          className="text-[10px] font-bold text-slate-500"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditClick(customer); }}
                        className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        title="Editar Perfil"
                      >
                        <Edit3 size={14} />
                      </button>

                      {/* BOTÃO PRINCIPAL DE BAIXA DE FIADO */}
                      {hasDebt ? (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleOpenBaixa(customer, 'credit');
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md shadow-emerald-200 flex items-center gap-1.5 transition-all"
                          title="Dar baixa no fiado / receber pagamento deste cliente"
                        >
                          <Receipt size={13} />
                          <span>Dar Baixa (Receber)</span>
                        </button>
                      ) : (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleOpenBaixa(customer, 'credit', 0);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                          title="Lançar crédito em conta"
                        >
                          + Crédito
                        </button>
                      )}

                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleOpenBaixa(customer, 'debit', 0);
                        }}
                        className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                        title="Lançar compra a prazo (novo débito fiado)"
                      >
                        + Lançar Débito
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detalhes e Histórico */}
        <div className="bg-white rounded-[2rem] border shadow-sm flex flex-col h-[70vh] overflow-hidden">
          {activeCustomer ? (
            <>
              <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                <div>
                   <h3 className="text-sm font-black text-slate-800">Extrato da Conta</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">{activeCustomer.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handlePrintExtrato}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 text-[10px] font-black uppercase tracking-widest"
                    title="Imprimir Extrato"
                  >
                    <Printer size={14} /> Imprimir
                  </button>
                  <History size={18} className="text-indigo-300" />
                </div>
              </div>

              {/* CARD DE AÇÃO RÁPIDA DE BAIXA DE FIADO NO EXTRATO */}
              {(activeCustomer.balance ?? 0) > 0 && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <p className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">Saldo Devedor Pendente</p>
                    </div>
                    <p className="text-lg font-black text-emerald-900 tracking-tight">
                      R$ {(activeCustomer.balance ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleOpenBaixa(activeCustomer, 'credit')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md shadow-emerald-300/40 flex items-center gap-1.5 transition-all"
                  >
                    <Receipt size={14} />
                    <span>Dar Baixa no Fiado</span>
                  </button>
                </div>
              )}
              
              {/* Filtro de Datas */}
              <div className="p-3 border-b bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Período do Extrato</span>
                  </div>
                  {(startDate || endDate) && (
                    <button 
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                      className="text-[9px] font-black text-rose-500 uppercase hover:text-rose-600 transition-colors flex items-center gap-1"
                    >
                      <X size={10} /> Limpar Filtros
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1 tracking-tighter">Data Inicial</label>
                    <input 
                      type="date" 
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold outline-none focus:border-indigo-500 transition-all"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1 tracking-tighter">Data Final</label>
                    <input 
                      type="date" 
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold outline-none focus:border-indigo-500 transition-all"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Abas de Navegação (Movimentos vs Itens Consumidos) */}
              <div className="px-4 py-2 border-b bg-slate-50 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('movimentos')}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    activeTab === 'movimentos'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 text-[9px]'
                  }`}
                >
                  Movimentações ({filteredHistory.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('itens')}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    activeTab === 'itens'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 text-[9px]'
                  }`}
                >
                  Produtos Consumidos ({aggregatedItems.reduce((acc, i) => acc + i.quantity, 0)})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {activeTab === 'movimentos' ? (
                  filteredHistory.length > 0 ? filteredHistory.map(t => {
                    const isCredit = t.type === 'credit';
                    return (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                         <div className="flex items-center gap-2 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 ${!isCredit ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                               {!isCredit ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                            </div>
                            <div className="min-w-0">
                               <p className="text-[10px] font-black text-slate-700 leading-tight truncate">{t.description}</p>
                               <div className="flex items-center gap-2 mt-0.5">
                                 <p className="text-[8px] font-bold text-slate-400 uppercase">
                                   {parseSafeDate(t.date).toLocaleDateString()} {parseSafeDate(t.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                 </p>
                                 {t.paymentMethod && (
                                   <span className="text-[8px] font-black uppercase bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200">
                                     {t.paymentMethod}
                                   </span>
                                 )}
                               </div>
                            </div>
                         </div>
                         <div className="text-right shrink-0 pl-2 flex items-center gap-2">
                           <div>
                             <p className={`font-black text-xs ${!isCredit ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {!isCredit ? '+' : '-'} R$ {(t.amount ?? 0).toFixed(2)}
                             </p>
                           </div>
                           {isCredit && (
                             <div className="flex items-center gap-1">
                               {activeCustomer.phone && (
                                 <button
                                   onClick={() => handleSendWhatsAppReceipt(activeCustomer, t, activeCustomer.balance ?? 0)}
                                   className="p-1 hover:bg-emerald-100 text-emerald-600 rounded transition-colors"
                                   title="Reenviar Recibo no WhatsApp"
                                 >
                                   <MessageSquare size={12} />
                                 </button>
                               )}
                               <button
                                 onClick={() => handlePrintReceipt(activeCustomer, t, activeCustomer.balance ?? 0)}
                                 className="p-1 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                                 title="Imprimir Comprovante de Pagamento"
                                >
                                 <Printer size={12} />
                               </button>
                             </div>
                           )}
                         </div>
                      </div>
                    );
                  }) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale p-6">
                       <FileText size={32} className="mb-2" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Sem movimentação registrada</p>
                    </div>
                  )
                ) : (
                  aggregatedItems.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[8px] font-black tracking-widest uppercase text-slate-400 mb-2 border-b pb-1">Lista Consolidada de Itens</p>
                      {aggregatedItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-indigo-50/20 rounded-xl border border-indigo-100/30">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-black text-[10px]">
                              {item.quantity}x
                            </span>
                            <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-tight">
                              {item.name}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-6">
                       <FileText size={32} className="mb-2 text-indigo-400" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Nenhum produto registrado</p>
                       <p className="text-[9px] font-medium text-slate-400 mt-1 max-w-xs leading-relaxed">
                         Os produtos inseridos nas vendas/mesas vinculadas a este cliente serão consolidados aqui para novos registros.
                       </p>
                    </div>
                  )
                )}
              </div>
              <div className="p-4 border-t bg-slate-900 text-white flex items-center justify-between">
                 <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Saldo Consolidado</span>
                    <p className={`text-xl font-black ${(activeCustomer.balance ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      R$ {(activeCustomer.balance ?? 0).toFixed(2)}
                    </p>
                 </div>
                 {(activeCustomer.balance ?? 0) > 0 && (
                   <button
                     onClick={() => handleOpenBaixa(activeCustomer, 'credit')}
                     className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5"
                   >
                     <Receipt size={13} />
                     <span>Receber Agora</span>
                   </button>
                 )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-3 opacity-50 grayscale">
              <UserCircle size={48} strokeWidth={1} />
              <p className="font-bold text-[10px] uppercase tracking-widest">Selecione um cliente para ver o extrato detalhado</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Novo Cliente / Editar Cliente */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-xl rounded-[1.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-4 border-b bg-indigo-50/30 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                       {editingCustomer ? <Edit3 size={18} /> : <UserPlus size={18} />}
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-800">{editingCustomer ? 'Editar Cliente' : 'Cadastrar Cliente'}</h2>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{editingCustomer ? 'Atualize as informações do perfil' : 'Novo registro de conta fiado'}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
              </div>
              <div className="p-4 space-y-3">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome / Razão Social</label>
                    <input type="text" className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold outline-none focus:border-indigo-500 transition-all text-xs" value={formName} onChange={(e)=>setFormName(e.target.value)} />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF / CNPJ</label>
                       <input type="text" className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold outline-none focus:border-indigo-500 transition-all text-xs" value={formDoc} onChange={(e)=>setFormDoc(maskCPF(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                       <input type="text" className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold outline-none focus:border-indigo-500 transition-all text-xs" value={formPhone} onChange={(e)=>setFormPhone(maskPhone(e.target.value))} />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                    <input type="email" className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold outline-none focus:border-indigo-500 transition-all text-xs" value={formEmail} onChange={(e)=>setFormEmail(e.target.value)} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Principal</label>
                    <textarea rows={2} className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold outline-none resize-none focus:border-indigo-500 transition-all text-xs" value={formAddress} onChange={(e)=>setFormAddress(e.target.value)} />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Status CRM</label>
                       <select 
                        className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold outline-none focus:border-indigo-500 transition-all text-xs appearance-none" 
                        value={formCrmStatus} 
                        onChange={(e)=>setFormCrmStatus(e.target.value as any)}
                       >
                         <option value="lead">Lead (Novo)</option>
                         <option value="active">Ativo (Cliente)</option>
                         <option value="vip">VIP (Estrela)</option>
                         <option value="blocked">Bloqueado</option>
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tags (Separadas por vírgula)</label>
                       <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold outline-none focus:border-indigo-500 transition-all text-xs" 
                        value={formTags} 
                        onChange={(e)=>setFormTags(e.target.value)} 
                        placeholder="frequente, delivery, etc"
                       />
                    </div>
                 </div>
                 {editingCustomer && editingCustomer.addresses && editingCustomer.addresses.length > 1 && (
                   <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Outros Endereços Salvos</label>
                     <div className="space-y-1">
                       {editingCustomer.addresses.filter(a => a !== formAddress).map((addr, idx) => (
                         <div key={idx} className="p-2 bg-slate-50 rounded-lg border text-[10px] font-bold text-slate-600 flex justify-between items-center">
                           <span>{addr}</span>
                           <button 
                            onClick={() => setFormAddress(addr)}
                            className="text-[8px] font-black text-indigo-600 uppercase hover:underline"
                           >
                             Tornar Principal
                           </button>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
              </div>
              <div className="p-4 border-t bg-slate-50 flex gap-3">
                 <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 font-black text-slate-400 uppercase tracking-widest text-[9px]">Cancelar</button>
                 <button onClick={handleSaveCustomer} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-black uppercase text-[9px] shadow-xl hover:bg-indigo-700 transition-all">{editingCustomer ? 'Salvar Alterações' : 'Salvar Cadastro'}</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal: Baixa de Pagamento de Fiado / Lançamento Manual */}
      {showBaixaModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 bg-slate-900/80 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className={`p-4 border-b text-white flex justify-between items-center ${manualTransactionType === 'credit' ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-rose-600 to-red-600'}`}>
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 rounded-xl">
                      {manualTransactionType === 'credit' ? <Receipt size={20} /> : <DollarSign size={20} />}
                    </div>
                    <div>
                       <h2 className="text-lg font-black">
                         {manualTransactionType === 'credit' ? 'Dar Baixa em Fiado (Receber)' : 'Lançar Débito Manual'}
                       </h2>
                       <p className="text-[10px] font-bold uppercase opacity-90">{showBaixaModal.name}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowBaixaModal(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                 {/* Tipo de Operação Tabs */}
                 <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                   <button
                     type="button"
                     onClick={() => {
                       setManualTransactionType('credit');
                       if ((showBaixaModal.balance ?? 0) > 0) {
                         setBaixaAmount((showBaixaModal.balance ?? 0).toFixed(2));
                       }
                     }}
                     className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                       manualTransactionType === 'credit'
                         ? 'bg-emerald-600 text-white shadow-md'
                         : 'text-slate-600 hover:text-slate-900'
                     }`}
                   >
                     <ArrowDownCircle size={14} />
                     <span>Receber Fiado (Crédito)</span>
                   </button>
                   <button
                     type="button"
                     onClick={() => setManualTransactionType('debit')}
                     className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                       manualTransactionType === 'debit'
                         ? 'bg-rose-600 text-white shadow-md'
                         : 'text-slate-600 hover:text-slate-900'
                     }`}
                   >
                     <ArrowUpCircle size={14} />
                     <span>Lançar Débito (Fiado)</span>
                   </button>
                 </div>

                 {/* Cartão de Saldo Atual & Simulação */}
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Devedor Atual</p>
                      <p className="text-2xl font-black text-slate-800 tracking-tighter">
                        R$ {(showBaixaModal.balance ?? 0).toFixed(2)}
                      </p>
                    </div>

                    {manualTransactionType === 'credit' && baixaAmount && parseFloat(baixaAmount) > 0 && (
                      <div className="text-right pl-4 border-l border-slate-200">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Após Baixa</p>
                        {(() => {
                          const rem = Math.max(0, (showBaixaModal.balance ?? 0) - parseFloat(baixaAmount));
                          return (
                            <p className={`text-xl font-black tracking-tighter ${rem === 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                              {rem === 0 ? 'Quitado (R$ 0,00)' : `R$ ${rem.toFixed(2)}`}
                            </p>
                          );
                        })()}
                      </div>
                    )}
                 </div>

                 {/* Atalhos Rápidos de Valor */}
                 {manualTransactionType === 'credit' && (showBaixaModal.balance ?? 0) > 0 && (
                   <div className="space-y-1.5">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Atalhos de Quitação</p>
                     <div className="flex flex-wrap gap-1.5">
                       <button
                         type="button"
                         onClick={() => setBaixaAmount((showBaixaModal.balance ?? 0).toFixed(2))}
                         className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1"
                       >
                         <Zap size={11} />
                         <span>Quitar Total: R$ {(showBaixaModal.balance ?? 0).toFixed(2)}</span>
                       </button>

                       {(showBaixaModal.balance ?? 0) > 10 && (
                         <button
                           type="button"
                           onClick={() => setBaixaAmount(((showBaixaModal.balance ?? 0) / 2).toFixed(2))}
                           className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors"
                         >
                           50%: R$ {((showBaixaModal.balance ?? 0) / 2).toFixed(2)}
                         </button>
                       )}

                       {[20, 50, 100].filter(v => v < (showBaixaModal.balance ?? 0)).map(val => (
                         <button
                           key={val}
                           type="button"
                           onClick={() => setBaixaAmount(val.toFixed(2))}
                           className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors"
                         >
                           R$ {val},00
                         </button>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Campo de Entrada de Valor */}
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {manualTransactionType === 'credit' ? 'Valor a Receber / Baixar (R$)' : 'Valor a Debitar (R$)'}
                    </label>
                    <input 
                     type="number" 
                     step="0.01"
                     className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-2xl text-2xl font-black outline-none text-center ${manualTransactionType === 'credit' ? 'border-emerald-200 text-emerald-600 focus:border-emerald-500' : 'border-rose-200 text-rose-600 focus:border-rose-500'}`} 
                     value={baixaAmount}
                     onChange={(e)=>setBaixaAmount(e.target.value)}
                     placeholder="0,00"
                     autoFocus
                    />
                 </div>

                 {/* Forma de Pagamento */}
                 {manualTransactionType === 'credit' && (
                   <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Forma de Pagamento Recebida</label>
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                       {[
                         { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                         { id: 'pix', label: 'PIX', icon: Smartphone },
                         { id: 'debito', label: 'Débito', icon: CreditCard },
                         { id: 'credito', label: 'Crédito', icon: CreditCard }
                       ].map(m => (
                           <button 
                             key={m.id} 
                             type="button"
                             onClick={() => setBaixaMethod(m.id)}
                             className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 transition-all font-bold text-xs ${baixaMethod === m.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'}`}
                           >
                               <m.icon size={15} /> {m.label}
                           </button>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Descrição / Observação */}
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição / Observação</label>
                    <input 
                     type="text" 
                     className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 text-xs" 
                     value={manualTransactionDescription}
                     onChange={(e)=>setManualTransactionDescription(e.target.value)}
                     placeholder={manualTransactionType === 'credit' ? "Ex: Pagamento parcial de fiado" : "Ex: Compra de marmitex / consumo"}
                    />
                 </div>

                 {/* Opções de Comprovante */}
                 {manualTransactionType === 'credit' && (
                   <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Comprovante de Quitação</p>
                     
                     <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 select-none">
                       <input 
                         type="checkbox"
                         checked={sendWhatsAppAfterBaixa}
                         onChange={(e) => setSendWhatsAppAfterBaixa(e.target.checked)}
                         className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                       />
                       <span className="flex items-center gap-1 text-slate-700">
                         <MessageSquare size={13} className="text-emerald-600" />
                         <span>Enviar recibo automático por WhatsApp</span>
                         {showBaixaModal.phone && (
                           <span className="text-[10px] text-slate-400">({showBaixaModal.phone})</span>
                         )}
                       </span>
                     </label>

                     <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 select-none">
                       <input 
                         type="checkbox"
                         checked={printReceiptAfterBaixa}
                         onChange={(e) => setPrintReceiptAfterBaixa(e.target.checked)}
                         className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                       />
                       <span className="flex items-center gap-1 text-slate-700">
                         <Printer size={13} className="text-indigo-600" />
                         <span>Imprimir comprovante térmico (80mm)</span>
                       </span>
                     </label>
                   </div>
                 )}
              </div>

              <div className="p-4 border-t bg-slate-50 flex gap-3">
                 <button 
                   onClick={() => setShowBaixaModal(null)} 
                   className="flex-1 py-2.5 font-black text-slate-400 uppercase tracking-widest text-[10px] hover:text-slate-600 transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                  onClick={handleBaixa} 
                  disabled={!baixaAmount || parseFloat(baixaAmount) <= 0} 
                  className={`flex-1 py-2.5 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg disabled:opacity-40 transition-all flex items-center justify-center gap-2 ${manualTransactionType === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'}`}
                 >
                   <CheckCircle2 size={15} />
                   <span>{manualTransactionType === 'credit' ? 'Confirmar Recebimento' : 'Confirmar Lançamento'}</span>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
});

export default CustomersPanel;

