import React, { useState, useMemo, useEffect } from 'react';
import { 
  Receipt, 
  Search, 
  Filter, 
  RefreshCw, 
  Printer, 
  Ban, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Copy, 
  Download, 
  FileText, 
  FileSpreadsheet, 
  ArrowUpRight, 
  ShieldCheck, 
  Building2, 
  User, 
  Calendar, 
  CreditCard, 
  DollarSign, 
  QrCode, 
  Check, 
  ChevronRight, 
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  Info,
  History,
  Lock,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FiscalDocument, FiscalDocumentStatus, Order, AdminSettings, User as UserType } from '../types';
import { handlePrintOrder } from '../services/printService';

interface FiscalCouponsProps {
  currentTenant: string;
  currentUser: UserType;
  adminSettings: AdminSettings;
  orders: Order[];
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  addLog?: (userId: string, action: string, details: string) => void;
}

export const parseFiscalDate = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof val === 'object') {
    if (typeof val.seconds === 'number') return new Date(val.seconds * 1000);
    if (typeof val._seconds === 'number') return new Date(val._seconds * 1000);
    if (typeof val.toDate === 'function') {
      try { return val.toDate(); } catch {}
    }
  }
  return new Date();
};

export const FiscalCoupons: React.FC<FiscalCouponsProps> = ({
  currentTenant,
  currentUser,
  adminSettings,
  orders = [],
  showToast,
  addLog
}) => {
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Unifica documentos da API com pedidos locais emitidos com chave fiscal
  const allDocuments = useMemo(() => {
    const docMap = new Map<string, FiscalDocument>();

    // 1. Inserir documentos vindos da API/Banco
    documents.forEach(doc => {
      docMap.set(doc.id, doc);
      if (doc.orderId) docMap.set(doc.orderId, doc);
      if (doc.fiscalKey) docMap.set(doc.fiscalKey, doc);
    });

    // 2. Mapear pedidos reais emitidos que possam ainda não estar na coleção
    orders.forEach((ord: any) => {
      if (ord.isFiscalIssued || ord.fiscalKey || ord.metadata?.nfceNumber) {
        const existing = docMap.get(ord.id) || (ord.fiscalKey ? docMap.get(ord.fiscalKey) : null);
        if (!existing) {
          const synthDoc: FiscalDocument = {
            id: `doc_nfce_${ord.id}`,
            tenantId: ord.tenantId || currentTenant,
            orderId: ord.id,
            orderDisplayId: ord.id ? ord.id.slice(-4) : '',
            tableNumber: ord.tableNumber,
            orderType: ord.type || 'takeout',
            nfceNumber: ord.metadata?.nfceNumber || adminSettings.fiscal?.nextNfceNumber || 1,
            series: ord.metadata?.series || adminSettings.fiscal?.series || 1,
            fiscalKey: ord.fiscalKey || `352600${ord.id.replace(/\D/g, '').padEnd(38, '0')}`,
            protocol: ord.metadata?.protocol || '135260000000001',
            status: (ord.status === 'cancelled' || ord.fiscalStatus === 'CANCELADA') ? 'CANCELADA' : 'AUTORIZADA',
            issuedAt: ord.createdAt || new Date(),
            authorizedAt: ord.createdAt || new Date(),
            environment: (adminSettings.fiscal?.environment as any) || 'homologation',
            model: '65',
            cStat: '100',
            xMotivo: 'Autorizado o uso da NFC-e',
            items: (ord.items || []).map((it: any, idx: number) => ({
              productId: it.productId || `prod_${idx}`,
              name: it.name,
              quantity: it.quantity || 1,
              unitPrice: it.price || 0,
              totalPrice: (it.price || 0) * (it.quantity || 1),
              ncm: it.ncm || '2106.90.90'
            })),
            subtotal: ord.total || 0,
            discount: ord.discount || 0,
            additionalFee: ord.additionalFee || 0,
            deliveryFee: ord.deliveryFee || 0,
            total: ord.total || 0,
            paymentMethod: ord.paymentMethod || 'dinheiro',
            customerName: ord.customerName,
            customerDocument: ord.customerDocument,
            emitterCnpj: adminSettings.fiscal?.cnpj || '00000000000000',
            emitterRazaoSocial: adminSettings.fiscal?.razaoSocial || adminSettings.companyName || 'KITCHENFLOW AI',
            reprintCount: 0,
            auditHistory: [
              {
                action: 'EMISSAO',
                timestamp: ord.createdAt || new Date(),
                userId: currentUser?.id || 'u1',
                userName: currentUser?.name || 'Operador',
                details: `Emissão de NFC-e para o pedido #${ord.id}`
              }
            ],
            createdAt: ord.createdAt || new Date()
          };
          docMap.set(synthDoc.id, synthDoc);
        }
      }
    });

    const list = Array.from(new Set(docMap.values()));
    return list.sort((a, b) => {
      const timeA = parseFiscalDate(a.issuedAt || a.createdAt).getTime();
      const timeB = parseFiscalDate(b.issuedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [documents, orders, currentTenant, adminSettings, currentUser]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [paymentFilter, setPaymentFilter] = useState<string>('TODOS');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modais
  const [selectedDoc, setSelectedDoc] = useState<FiscalDocument | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false);

  // Estado de Cancelamento
  const [cancelReason, setCancelReason] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [forceExtemporary, setForceExtemporary] = useState(false);

  // Estado de Reimpressão
  const [isReprinting, setIsReprinting] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'fiscal' | 'items' | 'consumer' | 'audit' | 'xml'>('fiscal');

  // Carregar Documentos Fiscais da API
  const fetchFiscalDocuments = async (showLoadingIndicator = true) => {
    if (!currentTenant) return;
    if (showLoadingIndicator) setIsLoading(true);
    setIsRefreshing(true);

    try {
      const params = new URLSearchParams({ tenantId: currentTenant });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (statusFilter !== 'TODOS') params.append('status', statusFilter);
      if (paymentFilter !== 'TODOS') params.append('paymentMethod', paymentFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/fiscal/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.documents)) {
          setDocuments(data.documents);
        }
      } else {
        console.error('Falha ao buscar cupons fiscais');
      }
    } catch (err) {
      console.error('Erro na requisição de cupons fiscais:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFiscalDocuments();
  }, [currentTenant]);

  // Estatísticas e Métricas Rápidas
  const metrics = useMemo(() => {
    const totalCount = allDocuments.length;
    const authorizedDocs = allDocuments.filter(d => d.status === 'AUTORIZADA');
    const canceledDocs = allDocuments.filter(d => d.status === 'CANCELADA');
    const rejectedDocs = allDocuments.filter(d => d.status === 'REJEITADA' || d.status === 'ERRO');
    const processingDocs = allDocuments.filter(d => d.status === 'PROCESSANDO' || d.status === 'PENDENTE');

    const totalAuthorizedValue = authorizedDocs.reduce((acc, d) => acc + (d.total || 0), 0);
    const totalCanceledValue = canceledDocs.reduce((acc, d) => acc + (d.total || 0), 0);

    return {
      totalCount,
      authorizedCount: authorizedDocs.length,
      totalAuthorizedValue,
      canceledCount: canceledDocs.length,
      totalCanceledValue,
      rejectedCount: rejectedDocs.length,
      processingCount: processingDocs.length
    };
  }, [allDocuments]);

  // Filtragem Client-Side Reativa
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter(doc => {
      // Filtro de Status
      if (statusFilter !== 'TODOS' && String(doc.status).toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }

      // Filtro de Forma de Pagamento
      if (paymentFilter !== 'TODOS' && String(doc.paymentMethod).toLowerCase() !== paymentFilter.toLowerCase()) {
        return false;
      }

      // Filtro de Data Inicial
      if (startDate) {
        const docDate = parseFiscalDate(doc.issuedAt || doc.createdAt).getTime();
        const filterStart = new Date(startDate).getTime();
        if (docDate < filterStart) return false;
      }

      // Filtro de Data Final
      if (endDate) {
        const docDate = parseFiscalDate(doc.issuedAt || doc.createdAt).getTime();
        const filterEnd = new Date(endDate).getTime() + (24 * 60 * 60 * 1000 - 1);
        if (docDate > filterEnd) return false;
      }

      // Busca por Texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const nfceStr = String(doc.nfceNumber || '');
        const orderIdStr = String(doc.orderId || '').toLowerCase();
        const orderDisplayStr = String(doc.orderDisplayId || '').toLowerCase();
        const keyStr = String(doc.fiscalKey || '').toLowerCase();
        const custName = String(doc.customerName || '').toLowerCase();
        const custDoc = String(doc.customerDocument || '').replace(/\D/g, '');
        const cleanTerm = term.replace(/\D/g, '');

        const matches = 
          nfceStr.includes(term) ||
          orderIdStr.includes(term) ||
          orderDisplayStr.includes(term) ||
          keyStr.includes(term) ||
          custName.includes(term) ||
          (cleanTerm.length >= 3 && custDoc.includes(cleanTerm));

        if (!matches) return false;
      }

      return true;
    });
  }, [allDocuments, statusFilter, paymentFilter, startDate, endDate, searchTerm]);

  // Copiar Chave de Acesso
  const handleCopyKey = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    showToast('Chave de acesso copiada para a área de transferência!', 'success');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Reimpressão Fiscal
  const handleReprint = async (doc: FiscalDocument) => {
    setSelectedDoc(doc);
    setIsReprinting(true);

    const safeTenantId = doc.tenantId || currentTenant || 't1';

    // Montar representação do pedido para a impressão
    const orderRepresentation: Order = {
      id: doc.orderId || `ord_${doc.nfceNumber}`,
      tenantId: safeTenantId,
      tableNumber: doc.tableNumber,
      type: (doc.orderType as any) || 'takeout',
      status: 'finished',
      items: (doc.items || []).map((it, idx) => ({
        productId: it.productId || `prod_${idx}`,
        name: it.name,
        quantity: it.quantity,
        price: it.unitPrice
      })),
      total: doc.total,
      deliveryFee: doc.deliveryFee,
      additionalFee: doc.additionalFee,
      discount: doc.discount,
      paymentMethod: doc.paymentMethod as any,
      customerName: doc.customerName,
      customerDocument: doc.customerDocument,
      customerAddress: doc.customerAddress,
      isFiscalIssued: true,
      fiscalKey: doc.fiscalKey,
      createdAt: parseFiscalDate(doc.issuedAt || doc.createdAt),
      metadata: {
        protocol: doc.protocol,
        nfceNumber: doc.nfceNumber,
        series: doc.series
      }
    };

    try {
      const res = await fetch('/api/fiscal/reprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: doc.id,
          document: doc,
          tenantId: safeTenantId,
          user: {
            id: currentUser?.id || 'u1',
            name: currentUser?.name || 'Operador',
            email: currentUser?.email || ''
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.document) {
          // Atualizar estado local do documento com o novo contador de reimpressões
          setDocuments(prev => prev.map(d => d.id === doc.id ? data.document : d));
          setSelectedDoc(data.document);
        }
      } else {
        // Incrementa localmente se a rede estiver instável
        const updatedDoc = {
          ...doc,
          reprintCount: (doc.reprintCount || 0) + 1,
          lastReprintAt: new Date().toISOString()
        };
        setDocuments(prev => prev.map(d => d.id === doc.id ? updatedDoc : d));
      }

      // Envia comando para a impressora térmica / modal de impressão
      handlePrintOrder(orderRepresentation, adminSettings, { isFiscal: true });
      showToast(`Reimpressão de NFC-e #${doc.nfceNumber || 'DANFE'} enviada para impressão!`, 'success');
      addLog?.(currentUser?.id || 'u1', 'REIMPRESSAO_FISCAL', `Reimpressão de NFC-e #${doc.nfceNumber} (Chave: ${doc.fiscalKey})`);
    } catch (err: any) {
      console.warn('Falha na requisição de log de reimpressão, prosseguindo com impressão física:', err);
      // Mesmo com erro de rede, não impede a impressora física de emitir a via
      handlePrintOrder(orderRepresentation, adminSettings, { isFiscal: true });
      showToast(`Reimpressão de NFC-e #${doc.nfceNumber || 'DANFE'} enviada para impressão!`, 'success');
    } finally {
      setIsReprinting(false);
    }
  };

  // Abrir Modal de Cancelamento
  const handleOpenCancelModal = (doc: FiscalDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedDoc(doc);
    setCancelReason('');
    setCancelError(null);
    setForceExtemporary(false);
    setIsCancelModalOpen(true);
  };

  // Confirmar Cancelamento Fiscal perante a SEFAZ
  const handleConfirmCancel = async () => {
    if (!selectedDoc) return;
    if (!cancelReason || cancelReason.trim().length < 15) {
      setCancelError('A justificativa de cancelamento deve conter no mínimo 15 caracteres (exigência regulamentar SEFAZ).');
      return;
    }

    setIsCanceling(true);
    setCancelError(null);

    try {
      const res = await fetch('/api/fiscal/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDoc.id,
          tenantId: currentTenant,
          reason: cancelReason.trim(),
          user: {
            id: currentUser?.id || 'u1',
            name: currentUser?.name || 'Operador',
            email: currentUser?.email || ''
          },
          settings: adminSettings.fiscal,
          certificate: (adminSettings.fiscal as any)?.certificate,
          forceExtemporary
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast(`NFC-e #${selectedDoc.nfceNumber} cancelada com sucesso na SEFAZ-SP!`, 'success');
        addLog?.(
          currentUser?.id || 'u1', 
          'CANCELAMENTO_FISCAL', 
          `NFC-e #${selectedDoc.nfceNumber} cancelada (Protocolo: ${data.protocol || data.cancelProtocol}). Motivo: ${cancelReason}`
        );

        // Atualizar lista local
        if (data.document) {
          setDocuments(prev => prev.map(d => d.id === selectedDoc.id ? data.document : d));
        } else {
          fetchFiscalDocuments(false);
        }

        setIsCancelModalOpen(false);
        if (isViewModalOpen) {
          setSelectedDoc(data.document || { ...selectedDoc, status: 'CANCELADA', isCanceled: true });
        }
      } else {
        setCancelError(data.error || 'Falha ao cancelar documento fiscal.');
        showToast(`Erro no cancelamento: ${data.error || 'Rejeição SEFAZ'}`, 'error');
      }
    } catch (err: any) {
      console.error('Erro de conexão ao cancelar NFC-e:', err);
      setCancelError('Erro de conexão com o servidor fiscal.');
      showToast('Erro de comunicação ao solicitar cancelamento.', 'error');
    } finally {
      setIsCanceling(false);
    }
  };

  // Cálculo de Prazo Restante para Cancelamento (30 minutos para NFC-e em SP)
  const getCancellationTimeInfo = (doc: FiscalDocument) => {
    const authTime = doc.authorizedAt ? parseFiscalDate(doc.authorizedAt).getTime() : parseFiscalDate(doc.issuedAt || doc.createdAt).getTime();
    const diffMs = Date.now() - authTime;
    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    const remainingMinutes = Math.max(0, 30 - diffMinutes);
    const isExpired = diffMinutes > 30;

    return {
      diffMinutes,
      remainingMinutes,
      isExpired
    };
  };

  // Exportar Relatório em Formato CSV com UTF-8 BOM para Excel
  const handleExportCSV = () => {
    if (filteredDocuments.length === 0) {
      showToast('Nenhum documento disponível para exportação com os filtros atuais.', 'info');
      return;
    }

    const headers = [
      'Data Emissao',
      'Hora Emissao',
      'Numero NF-e',
      'Serie',
      'Pedido',
      'Status',
      'Valor Total (R$)',
      'Forma Pagamento',
      'Cliente Nome',
      'Cliente CPF/CNPJ',
      'Chave de Acesso (44 digitos)',
      'Protocolo Autorizacao',
      'Cancelada',
      'Data Cancelamento',
      'Protocolo Cancelamento',
      'Motivo Cancelamento'
    ];

    const rows = filteredDocuments.map(d => {
      const dateObj = parseFiscalDate(d.issuedAt || d.createdAt);
      const dateStr = dateObj.toLocaleDateString('pt-BR');
      const timeStr = dateObj.toLocaleTimeString('pt-BR');

      return [
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${d.nfceNumber || ''}"`,
        `"${d.series || '1'}"`,
        `"${d.orderId || d.orderDisplayId || ''}"`,
        `"${d.status || ''}"`,
        `"${(d.total || 0).toFixed(2).replace('.', ',')}"`,
        `"${d.paymentMethod || ''}"`,
        `"${(d.customerName || '').replace(/"/g, '""')}"`,
        `"${d.customerDocument || ''}"`,
        `"${d.fiscalKey || ''}"`,
        `"${d.protocol || ''}"`,
        `"${d.isCanceled || d.status === 'CANCELADA' ? 'SIM' : 'NAO'}"`,
        `"${d.canceledAt ? parseFiscalDate(d.canceledAt).toLocaleString('pt-BR') : ''}"`,
        `"${d.cancelProtocol || ''}"`,
        `"${(d.cancelReason || '').replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_cupons_fiscais_${currentTenant}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Planilha de cupons fiscais exportada com sucesso!', 'success');
  };

  // Download do XML do Cupom
  const handleDownloadXml = (doc: FiscalDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!doc.xml) {
      showToast('O XML deste documento não está disponível no momento.', 'info');
      return;
    }

    const blob = new Blob([doc.xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `NFe_${doc.fiscalKey || doc.nfceNumber}.xml`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Download do XML concluído!', 'success');
  };

  // Badge Visual de Status
  const renderStatusBadge = (status: FiscalDocumentStatus | string) => {
    switch (String(status).toUpperCase()) {
      case 'AUTORIZADA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Autorizada
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60">
            <XCircle className="w-3.5 h-3.5" />
            Cancelada
          </span>
        );
      case 'REJEITADA':
      case 'ERRO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
            <AlertTriangle className="w-3.5 h-3.5" />
            Rejeitada
          </span>
        );
      case 'PROCESSANDO':
      case 'PENDENTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            Processando
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  // Formatação de Chave Fiscal em blocos de 4 dígitos
  const formatFiscalKey = (key?: string) => {
    if (!key) return '-';
    return key.replace(/(\d{4})/g, '$1 ').trim();
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Cabeçalho Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Cupons Fiscais (NFC-e)
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Gestão centralizada, consulta em tempo real, reimpressão e cancelamento de documentos fiscais
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-refresh-fiscal-docs"
            onClick={() => fetchFiscalDocuments()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700/60 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>Atualizar</span>
          </button>

          <button
            id="btn-export-fiscal-csv"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Cartões de Indicadores / Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Emitidos */}
        <div 
          onClick={() => setStatusFilter('TODOS')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'TODOS'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 dark:bg-emerald-950/30 dark:border-emerald-700'
              : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Cupons</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {metrics.totalCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Emitidos pelo estabelecimento
          </div>
        </div>

        {/* Autorizadas */}
        <div 
          onClick={() => setStatusFilter('AUTORIZADA')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'AUTORIZADA'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 dark:bg-emerald-950/30 dark:border-emerald-700'
              : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Autorizadas</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.authorizedCount}
          </div>
          <div className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1 font-medium">
            R$ {metrics.totalAuthorizedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Canceladas */}
        <div 
          onClick={() => setStatusFilter('CANCELADA')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'CANCELADA'
              ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20 dark:bg-rose-950/30 dark:border-rose-700'
              : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Canceladas</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {metrics.canceledCount}
          </div>
          <div className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-1 font-medium">
            Estornado: R$ {metrics.totalCanceledValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Rejeitadas ou Processando */}
        <div 
          onClick={() => setStatusFilter(metrics.rejectedCount > 0 ? 'REJEITADA' : 'PROCESSANDO')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === 'REJEITADA' || statusFilter === 'PROCESSANDO'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 dark:bg-amber-950/30 dark:border-amber-700'
              : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Rejeições / Erros</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {metrics.rejectedCount + metrics.processingCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {metrics.rejectedCount} rejeições • {metrics.processingCount} processando
          </div>
        </div>
      </div>

      {/* Painel de Filtros e Busca */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Busca Universal */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-fiscal"
              type="text"
              placeholder="Buscar por Nº NFC-e, Pedido, Chave de Acesso, Cliente, CPF/CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filtro de Status */}
          <div className="md:col-span-2">
            <select
              id="select-status-fiscal"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="TODOS">Status: Todos</option>
              <option value="AUTORIZADA">Autorizadas</option>
              <option value="CANCELADA">Canceladas</option>
              <option value="REJEITADA">Rejeitadas</option>
              <option value="PROCESSANDO">Processando</option>
            </select>
          </div>

          {/* Filtro de Forma de Pagamento */}
          <div className="md:col-span-2">
            <select
              id="select-payment-fiscal"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="TODOS">Pagamento: Todos</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="cartao_credito">Cartão de Crédito</option>
              <option value="cartao_debito">Cartão de Débito</option>
              <option value="vale_refeicao">Vale Refeição</option>
            </select>
          </div>

          {/* Data Inicial */}
          <div className="md:col-span-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="Data Inicial"
            />
          </div>

          {/* Data Final */}
          <div className="md:col-span-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="Data Final"
            />
          </div>
        </div>

        {/* Limpar Filtros se houver algum ativo */}
        {(searchTerm || statusFilter !== 'TODOS' || paymentFilter !== 'TODOS' || startDate || endDate) && (
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>
              Exibindo <strong>{filteredDocuments.length}</strong> de <strong>{documents.length}</strong> documentos fiscais
            </span>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('TODOS');
                setPaymentFilter('TODOS');
                setStartDate('');
                setEndDate('');
              }}
              className="text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Limpar todos os filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabela de Documentos Fiscais */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                <th className="py-3.5 px-4">Emissão</th>
                <th className="py-3.5 px-4">NFC-e Nº</th>
                <th className="py-3.5 px-4">Pedido</th>
                <th className="py-3.5 px-4">Consumidor</th>
                <th className="py-3.5 px-4">Valor Total</th>
                <th className="py-3.5 px-4">Pagamento</th>
                <th className="py-3.5 px-4">Status Fiscal</th>
                <th className="py-3.5 px-4 text-center">Reimp.</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                      <span>Carregando cupons fiscais...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-medium text-slate-600 dark:text-slate-300">Nenhum cupom fiscal encontrado</p>
                      <p className="text-xs text-slate-400">Tente ajustar os filtros de busca ou intervalo de datas.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const dateObj = parseFiscalDate(doc.issuedAt || doc.createdAt);
                  const isCanceled = doc.status === 'CANCELADA' || doc.isCanceled;
                  const timeInfo = getCancellationTimeInfo(doc);

                  return (
                    <tr 
                      key={doc.id}
                      onClick={() => {
                        setSelectedDoc(doc);
                        setIsViewModalOpen(true);
                      }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                      {/* Emissão */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {dateObj.toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-xs text-slate-500">
                          {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* NFC-e Nº & Série */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>#{String(doc.nfceNumber || 0).padStart(6, '0')}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Série {doc.series || 1}
                        </div>
                      </td>

                      {/* Pedido */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          #{doc.orderDisplayId || (doc.orderId ? doc.orderId.slice(-4) : 'S/N')}
                        </span>
                        {doc.orderType && (
                          <div className="text-xs text-slate-500 uppercase">
                            {doc.orderType === 'table' ? `Mesa ${doc.tableNumber || ''}` : doc.orderType}
                          </div>
                        )}
                      </td>

                      {/* Consumidor */}
                      <td className="py-3 px-4 max-w-[200px] truncate">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {doc.customerName || 'Consumidor Não Identificado'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {doc.customerDocument || 'Sem CPF/CNPJ'}
                        </div>
                      </td>

                      {/* Valor Total */}
                      <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                        R$ {(doc.total || 0).toFixed(2).replace('.', ',')}
                      </td>

                      {/* Pagamento */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 uppercase">
                        {doc.paymentMethod || 'Dinheiro'}
                      </td>

                      {/* Status Fiscal */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderStatusBadge(doc.status)}
                      </td>

                      {/* Reimpressões */}
                      <td className="py-3 px-4 whitespace-nowrap text-center text-xs font-semibold text-slate-500">
                        {doc.reprintCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {doc.reprintCount}x
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Visualizar */}
                          <button
                            title="Ver Detalhes do Cupom"
                            onClick={() => {
                              setSelectedDoc(doc);
                              setIsViewModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Copiar Chave */}
                          <button
                            title="Copiar Chave de Acesso (44 dígitos)"
                            onClick={(e) => handleCopyKey(doc.fiscalKey, e)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            {copiedKey === doc.fiscalKey ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* Reimprimir */}
                          <button
                            title="Reimprimir DANFE NFC-e"
                            onClick={() => handleReprint(doc)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Baixar XML */}
                          {doc.xml && (
                            <button
                              title="Baixar Arquivo XML"
                              onClick={(e) => handleDownloadXml(doc, e)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancelar (se autorizada) */}
                          {!isCanceled && doc.status === 'AUTORIZADA' && (
                            <button
                              title="Cancelar Cupom Fiscal perante a SEFAZ"
                              onClick={(e) => handleOpenCancelModal(doc, e)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                timeInfo.isExpired 
                                  ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40' 
                                  : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              }`}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE DETALHES DO CUPOM FISCAL */}
      <AnimatePresence>
        {isViewModalOpen && selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Header do Modal */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                    #{selectedDoc.nfceNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        NFC-e nº {selectedDoc.nfceNumber} (Série {selectedDoc.series || 1})
                      </h2>
                      {renderStatusBadge(selectedDoc.status)}
                    </div>
                    <p className="text-xs text-slate-500">
                      Pedido #{selectedDoc.orderDisplayId || selectedDoc.orderId} • Emitido em {parseFiscalDate(selectedDoc.issuedAt || selectedDoc.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReprint(selectedDoc)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Reimprimir</span>
                  </button>

                  {selectedDoc.status === 'AUTORIZADA' && !selectedDoc.isCanceled && (
                    <button
                      onClick={() => {
                        setIsViewModalOpen(false);
                        handleOpenCancelModal(selectedDoc);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg transition-colors border border-rose-200 dark:border-rose-800"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsViewModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="sr-only">Fechar</span>
                    ✕
                  </button>
                </div>
              </div>

              {/* Abas de Navegação no Modal */}
              <div className="flex items-center gap-2 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 overflow-x-auto text-sm">
                <button
                  onClick={() => setActiveDetailTab('fiscal')}
                  className={`py-3 px-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                    activeDetailTab === 'fiscal'
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Dados Fiscais & SEFAZ
                </button>

                <button
                  onClick={() => setActiveDetailTab('items')}
                  className={`py-3 px-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                    activeDetailTab === 'items'
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Itens e Totais ({selectedDoc.items?.length || 0})
                </button>

                <button
                  onClick={() => setActiveDetailTab('consumer')}
                  className={`py-3 px-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                    activeDetailTab === 'consumer'
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Consumidor & Emitente
                </button>

                <button
                  onClick={() => setActiveDetailTab('audit')}
                  className={`py-3 px-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                    activeDetailTab === 'audit'
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Auditoria & Histórico
                </button>

                {selectedDoc.xml && (
                  <button
                    onClick={() => setActiveDetailTab('xml')}
                    className={`py-3 px-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                      activeDetailTab === 'xml'
                        ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    XML SEFAZ
                  </button>
                )}
              </div>

              {/* Conteúdo da Aba */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {activeDetailTab === 'fiscal' && (
                  <div className="space-y-6">
                    {/* Alerta de Cancelamento se Cancelado */}
                    {selectedDoc.isCanceled && (
                      <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm space-y-1">
                        <div className="flex items-center gap-2 font-bold">
                          <XCircle className="w-5 h-5 text-rose-600" />
                          Documento Cancelado Perante a SEFAZ
                        </div>
                        <p className="text-xs">
                          Protocolo de Cancelamento: <strong>{selectedDoc.cancelProtocol || 'N/A'}</strong> • Cancelado em {selectedDoc.canceledAt ? parseFiscalDate(selectedDoc.canceledAt).toLocaleString('pt-BR') : 'N/A'}
                        </p>
                        <p className="text-xs mt-1">
                          Justificativa: <em>"{selectedDoc.cancelReason || 'Sem justificativa informada'}"</em>
                        </p>
                      </div>
                    )}

                    {/* Chave de Acesso */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Chave de Acesso (44 Dígitos)</span>
                        <button
                          onClick={() => handleCopyKey(selectedDoc.fiscalKey)}
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                        >
                          {copiedKey === selectedDoc.fiscalKey ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copiada!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Chave</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="font-mono text-sm font-bold text-slate-900 dark:text-white break-all tracking-wider">
                        {formatFiscalKey(selectedDoc.fiscalKey)}
                      </div>
                    </div>

                    {/* Grid de Informações Técnicas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="text-xs text-slate-500 uppercase font-semibold">Protocolo SEFAZ</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          {selectedDoc.protocol || 'Simulado / Sem Protocolo'}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="text-xs text-slate-500 uppercase font-semibold">Ambiente</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          {selectedDoc.environment === 'production' ? 'Produção (Real)' : 'Homologação (Testes)'}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="text-xs text-slate-500 uppercase font-semibold">Modelo Fiscal</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          65 - NFC-e (Consumidor)
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="text-xs text-slate-500 uppercase font-semibold">Status Retorno (cStat)</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          {selectedDoc.cStat || '100'} - {selectedDoc.xMotivo || 'Autorizado'}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="text-xs text-slate-500 uppercase font-semibold">Data/Hora Autorização</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          {parseFiscalDate(selectedDoc.authorizedAt || selectedDoc.issuedAt || selectedDoc.createdAt).toLocaleString('pt-BR')}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="text-xs text-slate-500 uppercase font-semibold">Reimpressões Realizadas</div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          {selectedDoc.reprintCount || 0} vez(es)
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === 'items' && (
                  <div className="space-y-4">
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 font-semibold uppercase">
                          <tr>
                            <th className="py-2.5 px-4">#</th>
                            <th className="py-2.5 px-4">Produto</th>
                            <th className="py-2.5 px-4">NCM</th>
                            <th className="py-2.5 px-4 text-center">Qtd</th>
                            <th className="py-2.5 px-4 text-right">Unitário</th>
                            <th className="py-2.5 px-4 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {(selectedDoc.items || []).map((it, idx) => (
                            <tr key={idx}>
                              <td className="py-2.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">{it.name}</td>
                              <td className="py-2.5 px-4 text-xs font-mono text-slate-500">{it.ncm || '2106.90.90'}</td>
                              <td className="py-2.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">{it.quantity}</td>
                              <td className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-300">
                                R$ {(it.unitPrice || 0).toFixed(2).replace('.', ',')}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                                R$ {(it.totalPrice || it.unitPrice * it.quantity || 0).toFixed(2).replace('.', ',')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Resumo Financeiro */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-sm">
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>Subtotal dos Itens:</span>
                        <span>R$ {((selectedDoc.total || 0) - (selectedDoc.additionalFee || 0) + (selectedDoc.discount || 0)).toFixed(2).replace('.', ',')}</span>
                      </div>
                      {selectedDoc.discount ? (
                        <div className="flex justify-between text-emerald-600">
                          <span>Desconto:</span>
                          <span>- R$ {selectedDoc.discount.toFixed(2).replace('.', ',')}</span>
                        </div>
                      ) : null}
                      {selectedDoc.additionalFee ? (
                        <div className="flex justify-between text-slate-600 dark:text-slate-300">
                          <span>Acréscimo / Taxa de Serviço:</span>
                          <span>+ R$ {selectedDoc.additionalFee.toFixed(2).replace('.', ',')}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span>VALOR TOTAL DO CUPOM:</span>
                        <span>R$ {(selectedDoc.total || 0).toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 pt-1">
                        <span>Forma de Pagamento:</span>
                        <span className="font-semibold uppercase">{selectedDoc.paymentMethod}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === 'consumer' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Consumidor */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                        <User className="w-4 h-4 text-emerald-600" />
                        Identificação do Consumidor
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="text-slate-500">Nome:</div>
                        <div className="font-semibold text-slate-900 dark:text-white text-sm">
                          {selectedDoc.customerName || 'NÃO IDENTIFICADO'}
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="text-slate-500">CPF / CNPJ:</div>
                        <div className="font-semibold text-slate-900 dark:text-white font-mono">
                          {selectedDoc.customerDocument || 'NÃO INFORMADO'}
                        </div>
                      </div>
                      {selectedDoc.customerAddress && (
                        <div className="space-y-1 text-xs">
                          <div className="text-slate-500">Endereço:</div>
                          <div className="text-slate-800 dark:text-slate-200">{selectedDoc.customerAddress}</div>
                        </div>
                      )}
                    </div>

                    {/* Emitente */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        Dados do Estabelecimento Emitente
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="text-slate-500">Razão Social:</div>
                        <div className="font-semibold text-slate-900 dark:text-white text-sm">
                          {selectedDoc.emitterRazaoSocial || adminSettings.fiscal?.razaoSocial || adminSettings.companyName || 'KITCHENFLOW AI'}
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="text-slate-500">CNPJ:</div>
                        <div className="font-semibold text-slate-900 dark:text-white font-mono">
                          {selectedDoc.emitterCnpj || adminSettings.fiscal?.cnpj || adminSettings.cnpj || '00.000.000/0000-00'}
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="text-slate-500">Inscrição Estadual:</div>
                        <div className="font-semibold text-slate-900 dark:text-white font-mono">
                          {selectedDoc.emitterInscricaoEstadual || adminSettings.fiscal?.inscricaoEstadual || 'ISENTO'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeDetailTab === 'audit' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <History className="w-4 h-4 text-emerald-600" />
                      Histórico e Trilha de Auditoria
                    </h3>

                    <div className="space-y-3">
                      {(selectedDoc.auditHistory || []).map((audit, idx) => (
                        <div 
                          key={idx}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            audit.action === 'EMISSAO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                            audit.action === 'CANCELAMENTO' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {audit.action === 'EMISSAO' ? 'EMI' : audit.action === 'CANCELAMENTO' ? 'CAN' : 'REI'}
                          </div>

                          <div className="flex-1 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-white">{audit.details}</span>
                              <span className="text-slate-400">{parseFiscalDate(audit.timestamp).toLocaleString('pt-BR')}</span>
                            </div>
                            <div className="text-slate-500">
                              Operador: <strong>{audit.userName}</strong> (ID: {audit.userId})
                            </div>
                            {audit.protocol && (
                              <div className="text-slate-500 font-mono">
                                Protocolo: {audit.protocol}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeDetailTab === 'xml' && selectedDoc.xml && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Arquivo XML Assinado da NFC-e</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedDoc.xml || '');
                            showToast('Conteúdo do XML copiado!', 'success');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 rounded-md"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar XML</span>
                        </button>
                        <button
                          onClick={() => handleDownloadXml(selectedDoc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar Arquivo .xml</span>
                        </button>
                      </div>
                    </div>

                    <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-[350px]">
                      {selectedDoc.xml}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CANCELAMENTO FISCAL (SEFAZ-SP) */}
      <AnimatePresence>
        {isCancelModalOpen && selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-6 p-6"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Cancelar NFC-e nº {selectedDoc.nfceNumber}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Transmissão de evento de cancelamento oficial perante a SEFAZ
                  </p>
                </div>
              </div>

              {/* Informações do Cupom */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Valor do Cupom:</span>
                  <span className="font-bold text-slate-900 dark:text-white">R$ {(selectedDoc.total || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data/Hora Emissão:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {parseFiscalDate(selectedDoc.issuedAt || selectedDoc.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>

                {/* Validador de Prazo */}
                {(() => {
                  const timeInfo = getCancellationTimeInfo(selectedDoc);
                  if (timeInfo.isExpired) {
                    return (
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 space-y-1 mt-2">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Prazo regulamentar de 30 min expirado
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Decorreram <strong>{timeInfo.diffMinutes} minutos</strong> desde a emissão. Na SEFAZ-SP, o prazo legal para cancelamento via evento da NFC-e é de 30 minutos.
                        </p>
                        <div className="pt-1">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={forceExtemporary}
                              onChange={(e) => setForceExtemporary(e.target.checked)}
                              className="rounded text-rose-600 focus:ring-rose-500"
                            />
                            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                              Tentar cancelamento extemporâneo / estorno
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex items-center gap-2 text-emerald-600 font-semibold pt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Dentro do prazo legal ({timeInfo.remainingMinutes} min restantes)</span>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Campo de Justificativa */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <label htmlFor="cancel-reason">Justificativa do Cancelamento (Mín. 15 caracteres):</label>
                  <span className={`text-xs ${cancelReason.trim().length >= 15 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                    {cancelReason.trim().length}/15
                  </span>
                </div>
                <textarea
                  id="cancel-reason"
                  rows={3}
                  placeholder="Ex: Cliente desistiu da compra antes da entrega dos produtos."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Erro se houver */}
              {cancelError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{cancelError}</span>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isCanceling}
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  id="btn-confirm-cancel-fiscal"
                  disabled={isCanceling || cancelReason.trim().length < 15}
                  onClick={handleConfirmCancel}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-xs"
                >
                  {isCanceling ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Transmitindo à SEFAZ...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      <span>Confirmar Cancelamento</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FiscalCoupons;
