
import React, { useState, useMemo, memo } from 'react';
import { Order, Courier, FinancialRecord, Product, AdminSettings } from '../types';
import { 
  Navigation, CheckCircle2, 
  User as UserIcon, Phone, MapPin, Package,
  ChevronRight, Bike, X, UserCheck, 
  TrendingUp, Settings, Plus, RefreshCw,
  Save, UserPlus, Wallet, ArrowRightLeft,
  Banknote, QrCode, ClipboardList, Timer, Clock,
  Coins, CreditCard, DollarSign, Calculator, AlertTriangle, Edit3,
  Search, Filter, Store, Edit, Loader2, Printer, ChefHat, Upload, Receipt
} from 'lucide-react';
import { generateReceiptHtml, handlePrintOrder } from '../services/printService';
import { maskPhone } from '../utils/masks';
import EditOrderModal from './EditOrderModal';
import { LiveTrackingMap } from './LiveTrackingMap';

interface DeliveryProps {
  orders: Order[];
  couriers: Courier[];
  products: Product[];
  deliveryFee: number;
  adminSettings: AdminSettings;
  onUpdateStatus: (id: string, status: Order['status']) => void;
  onAssignCourier: (orderId: string, courierId: string) => void;
  onDispatchCourier: (courierId: string) => void;
  onAddCourier: (courier: Partial<Courier>) => void;
  onUpdateCourier: (id: string, updates: Partial<Courier>) => void;
  onUpdateDeliveryFee: (fee: number) => void;
  isDeliveryEnabled: boolean;
  isPickupEnabled: boolean;
  minOrderValue?: number;
  estimatedDeliveryTime?: string;
  estimatedPickupTime?: string;
  onUpdateLogisticsSettings: (settings: { 
    deliveryFee: number, 
    isDeliveryEnabled: boolean, 
    isPickupEnabled: boolean,
    minOrderValue: number,
    estimatedDeliveryTime: string,
    estimatedPickupTime: string
  }) => void;
  onAddFinancialRecord: (record: Partial<FinancialRecord>) => void;
  onSettleOrders: (orderIds: string[], dailyFee?: number) => void;
  onUpdateOrder: (id: string, updates: Partial<Order>) => void;
  onEditOrderInPDV: (order: Order) => void;
  onNavigate: (tab: string) => void;
  onReturnCash: (courierId: string, amount: number) => void;
  onUpdateAdminSettings?: (settings: Partial<AdminSettings>) => void;
}

const getOrderAgeInMinutes = (createdAt: any) => {
  if (!createdAt) return 0;
  let oDate: Date;
  if (createdAt instanceof Date) {
    oDate = createdAt;
  } else if (typeof createdAt === 'object' && (createdAt as any).seconds) {
    oDate = new Date((createdAt as any).seconds * 1000);
  } else {
    oDate = new Date(createdAt);
  }
  if (isNaN(oDate.getTime())) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - oDate.getTime()) / 60000));
};

const Delivery: React.FC<DeliveryProps> = memo(({ 
  orders, 
  couriers, 
  products,
  deliveryFee,
  adminSettings,
  onUpdateStatus, 
  onAssignCourier,
  onDispatchCourier,
  onAddCourier,
  onUpdateCourier,
  onUpdateDeliveryFee,
  isDeliveryEnabled,
  isPickupEnabled,
  minOrderValue = 0,
  estimatedDeliveryTime = '',
  estimatedPickupTime = '',
  onUpdateLogisticsSettings,
  onAddFinancialRecord,
  onSettleOrders,
  onUpdateOrder,
  onEditOrderInPDV,
  onNavigate,
  onReturnCash,
  onUpdateAdminSettings
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'monitor' | 'couriers' | 'settlement' | 'settings'>('monitor');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showAddCourierModal, setShowAddCourierModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState<any | null>(null);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [settlementSuccess, setSettlementSuccess] = useState<string | null>(null);
  
  // States para filtros do monitor
  const [monitorSearch, setMonitorSearch] = useState('');
  const [monitorStatusFilter, setMonitorStatusFilter] = useState<'ready' | 'preparing' | 'all'>('ready');
  const [fiscalPrintDefault, setFiscalPrintDefault] = useState(false);
  const [monitorViewMode, setMonitorViewMode] = useState<'cards' | 'map'>('map');

  // Logistics Settings Local State
  const [localDeliveryEnabled, setLocalDeliveryEnabled] = useState(isDeliveryEnabled);
  const [localPickupEnabled, setLocalPickupEnabled] = useState(isPickupEnabled);
  const [localDeliveryFee, setLocalDeliveryFee] = useState(deliveryFee);
  const [localMinOrderValue, setLocalMinOrderValue] = useState(minOrderValue);
  const [localEstimatedDeliveryTime, setLocalEstimatedDeliveryTime] = useState(estimatedDeliveryTime);
  const [localEstimatedPickupTime, setLocalEstimatedPickupTime] = useState(estimatedPickupTime);

  // Sincronizar estado local quando os props mudarem
  React.useEffect(() => {
    setLocalDeliveryEnabled(isDeliveryEnabled);
    setLocalPickupEnabled(isPickupEnabled);
    setLocalDeliveryFee(deliveryFee);
    setLocalMinOrderValue(minOrderValue);
    setLocalEstimatedDeliveryTime(estimatedDeliveryTime);
    setLocalEstimatedPickupTime(estimatedPickupTime);
  }, [isDeliveryEnabled, isPickupEnabled, deliveryFee, minOrderValue, estimatedDeliveryTime, estimatedPickupTime]);

  const handleSaveSettings = () => {
    setSaveStatus('saving');
    try {
      onUpdateLogisticsSettings({
        deliveryFee: localDeliveryFee,
        isDeliveryEnabled: localDeliveryEnabled,
        isPickupEnabled: localPickupEnabled,
        minOrderValue: localMinOrderValue,
        estimatedDeliveryTime: localEstimatedDeliveryTime,
        estimatedPickupTime: localEstimatedPickupTime
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('idle');
      console.error("Erro ao salvar configurações:", error);
    }
  };

  // Settlement Multimeios
  const [settlementPayments, setSettlementPayments] = useState<{ [key: string]: number }>({
    dinheiro: 0,
    pix: 0,
    cartao: 0
  });

  // States para filtros de acerto de entregadores
  const [settlementStartDate, setSettlementStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [settlementEndDate, setSettlementEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [settlementCourierId, setSettlementCourierId] = useState('all');
  const [settlementStatus, setSettlementStatus] = useState('all');
  const [settlementTurn, setSettlementTurn] = useState('all');
  const [selectedCourierIds, setSelectedCourierIds] = useState<string[]>([]);

  // Courier Form
  const [newCourierName, setNewCourierName] = useState('');
  const [newCourierPhone, setNewCourierPhone] = useState('');
  const [newCourierEmail, setNewCourierEmail] = useState('');
  const [newCourierDocument, setNewCourierDocument] = useState('');
  const [newCourierCnh, setNewCourierCnh] = useState('');
  const [newCourierPlate, setNewCourierPlate] = useState('');
  const [newCourierAddress, setNewCourierAddress] = useState('');
  const [newCourierPix, setNewCourierPix] = useState('');
  const [newCourierDailyFee, setNewCourierDailyFee] = useState('0');
  const [newCourierEarningsPerDelivery, setNewCourierEarningsPerDelivery] = useState('0');
  const [newCourierVehicle, setNewCourierVehicle] = useState<'moto' | 'bike' | 'car'>('moto');

  const deliveryOrders = useMemo(() => orders.filter(o => o.type === 'delivery'), [orders]);

  // Filtro dinâmico para a coluna de despacho
  const filteredDispatchOrders = useMemo(() => {
    return deliveryOrders.filter(o => {
      const matchesStatus = monitorStatusFilter === 'all' 
        ? ['preparing', 'ready'].includes(o.status) 
        : o.status === monitorStatusFilter;
      
      const matchesSearch = 
        o.id.toLowerCase().includes(monitorSearch.toLowerCase()) ||
        (o.customerName || '').toLowerCase().includes(monitorSearch.toLowerCase()) ||
        (o.customerAddress || '').toLowerCase().includes(monitorSearch.toLowerCase());
        
      return matchesStatus && matchesSearch;
    });
  }, [deliveryOrders, monitorStatusFilter, monitorSearch]);

  // Cálculo de acerto de contas por entregador (Geral - sem filtros de data, para o Monitor)
  const courierSettlementData = useMemo(() => {
    return couriers.map(courier => {
      const courierOrders = deliveryOrders.filter(o => o.courierId === courier.id && o.status === 'delivered' && !o.isSettled);
      const activeOrdersCount = deliveryOrders.filter(o => o.courierId === courier.id && ['ready', 'preparing', 'delivering'].includes(o.status)).length;
      
      const totalFees = courierOrders.reduce((acc, o) => acc + (o.courierEarnings || 0), 0);
      const cashCollected = courierOrders.filter(o => o.paymentMethod === 'dinheiro').reduce((acc, o) => acc + o.total, 0);
      
      // A diária só conta a partir da primeira entrega feita para aquele dia (lote)
      const dailyFee = courierOrders.length > 0 ? (courier.dailyFee || 0) : 0;
      
      return {
        courier,
        orderCount: courierOrders.length,
        activeOrdersCount,
        totalFees, 
        cashCollected,
        dailyFee,
        balance: Math.max(0, (totalFees + dailyFee) - cashCollected)
      };
    });
  }, [couriers, deliveryOrders]);

  // Cálculo de acerto de contas por entregador com Filtros (Para a aba de Acertos Financeiros)
  const courierSettlementFilteredData = useMemo(() => {
    return couriers.map(courier => {
      // Filtrar pedidos do entregador usando filtros de data e status de acerto
      const courierOrders = deliveryOrders.filter(o => {
        if (o.courierId !== courier.id) return false;
        
        // Data format: DD/MM/YYYY ou ISO string
        let oDate: Date;
        if (!o.createdAt) {
          oDate = new Date();
        } else if (o.createdAt instanceof Date) {
          oDate = o.createdAt;
        } else if (typeof o.createdAt === 'object' && (o.createdAt as any).seconds) {
          oDate = new Date((o.createdAt as any).seconds * 1000);
        } else {
          oDate = new Date(o.createdAt);
        }
        
        if (isNaN(oDate.getTime())) {
          oDate = new Date();
        }
        const oDateStr = oDate.toISOString().split('T')[0];
        
        if (settlementStartDate && oDateStr < settlementStartDate) return false;
        if (settlementEndDate && oDateStr > settlementEndDate) return false;
        
        // Filtro de Status de Acerto: 'all', 'settled' (acertados), 'unsettled' (pendentes)
        if (settlementStatus === 'unsettled' && o.isSettled) return false;
        if (settlementStatus === 'settled' && !o.isSettled) return false;
        if (settlementStatus === 'all' && o.status === 'cancelled') return false; // Ignora canceladas por padrão
        
        return true;
      });

      const activeOrdersCount = deliveryOrders.filter(o => o.courierId === courier.id && ['ready', 'preparing', 'delivering'].includes(o.status)).length;
      
      // Filtramos apenas pedidos entregues para fazer o acerto, mas podemos mostrar quantidade total se o status for "all"
      const ordersToSettle = courierOrders.filter(o => o.status === 'delivered' && !o.isSettled);
      
      const totalFees = ordersToSettle.reduce((acc, o) => acc + (o.courierEarnings || 0), 0);
      const cashCollected = ordersToSettle.filter(o => o.paymentMethod === 'dinheiro').reduce((acc, o) => acc + o.total, 0);
      const otherPayments = ordersToSettle.filter(o => o.paymentMethod !== 'dinheiro').reduce((acc, o) => acc + o.total, 0);
      const totalDeliveriesValue = ordersToSettle.reduce((acc, o) => acc + o.total, 0);
      
      // Quantidade de diárias (pode ser 1 se o motorista realizou entregas no período, ou 0 caso contrário)
      const dailyQuantity = ordersToSettle.length > 0 ? 1 : 0;
      const dailyFeeValue = dailyQuantity * (courier.dailyFee || 0);
      
      const discounts = 0; // Campo para futuros descontos
      const valorAPagar = totalFees + dailyFeeValue; // Taxas + Diária
      const valorPago = 0; // Quantidade paga (ou podemos deixar nulo/zero estático como no modelo)
      
      return {
        courier,
        orderCount: ordersToSettle.length,
        activeOrdersCount,
        totalFees, 
        cashCollected,
        otherPayments,
        totalDeliveriesValue,
        dailyQuantity,
        dailyFeeValue,
        discounts,
        valorAPagar,
        valorPago,
        balance: Math.max(0, valorAPagar - cashCollected) // Total a pagar - dinheiro coletado na rua = saldo final (não-negativo)
      };
    });
  }, [couriers, deliveryOrders, settlementStartDate, settlementEndDate, settlementStatus]);

  // Filtra de acordo com o entregador selecionado no select
  const displayedSettlementData = useMemo(() => {
    return courierSettlementFilteredData.filter(d => {
      if (settlementCourierId !== 'all' && d.courier.id !== settlementCourierId) return false;
      return true;
    });
  }, [courierSettlementFilteredData, settlementCourierId]);

  const handleEditCourier = (courier: Courier) => {
    setEditingCourier(courier);
    setNewCourierName(courier.name);
    setNewCourierPhone(courier.phone);
    setNewCourierEmail(courier.email || '');
    setNewCourierDocument(courier.document || '');
    setNewCourierCnh(courier.cnh || '');
    setNewCourierPlate(courier.vehiclePlate || '');
    setNewCourierAddress(courier.address || '');
    setNewCourierPix(courier.pixKey || '');
    setNewCourierDailyFee(courier.dailyFee?.toString() || '0');
    setNewCourierEarningsPerDelivery(courier.earningsPerDelivery?.toString() || '0');
    setNewCourierVehicle(courier.vehicleType || 'moto');
    setShowAddCourierModal(true);
  };

  const handleSaveCourier = () => {
    if (!newCourierName || !newCourierPhone) return;

    const courierData: Partial<Courier> = { 
      name: newCourierName, 
      phone: newCourierPhone, 
      email: newCourierEmail,
      document: newCourierDocument,
      cnh: newCourierCnh,
      vehiclePlate: newCourierPlate,
      address: newCourierAddress,
      pixKey: newCourierPix,
      dailyFee: parseFloat(newCourierDailyFee) || 0,
      earningsPerDelivery: parseFloat(newCourierEarningsPerDelivery) || 0,
      earnings: editingCourier ? editingCourier.earnings : 0, // Mantem ganhos se ja existir
      vehicleType: newCourierVehicle,
      active: editingCourier ? editingCourier.active : true
    };

    if (editingCourier) {
      onUpdateCourier(editingCourier.id, courierData);
    } else {
      onAddCourier(courierData);
    }

    resetCourierForm();
    setShowAddCourierModal(false);
  };

  const resetCourierForm = () => {
    setNewCourierName('');
    setNewCourierPhone('');
    setNewCourierEmail('');
    setNewCourierDocument('');
    setNewCourierCnh('');
    setNewCourierPlate('');
    setNewCourierAddress('');
    setNewCourierPix('');
    setNewCourierDailyFee('0');
    setNewCourierEarningsPerDelivery('0');
    setNewCourierVehicle('moto');
    setEditingCourier(null);
  };

  const [settlementOptions, setSettlementOptions] = useState({
    discountCash: true,
    totalReturn: false
  });

  const openSettlement = (data: any) => {
    setShowSettlementModal(data);
    setSettlementOptions({
      discountCash: true,
      totalReturn: false
    });
    setSettlementPayments({
      dinheiro: data.balance > 0 ? data.balance : 0,
      pix: 0,
      cartao: 0
    });
  };

  const handleRealizeSettlement = () => {
    if (!showSettlementModal) return;
    const { courier, totalFees, dailyFee, cashCollected } = showSettlementModal;
    
    // Calcular o saldo com base nas opções selecionadas
    const effectiveCashDeduction = settlementOptions.discountCash ? cashCollected : 0;
    const effectiveBalance = (totalFees + dailyFee) - effectiveCashDeduction;

    const totalSelected = (Object.values(settlementPayments) as number[]).reduce((a, b) => a + b, 0);
    
    if (Math.abs(totalSelected - Math.abs(effectiveBalance)) > 0.01) {
      setSettlementError("A soma dos valores informados não confere com o saldo do acerto!");
      setTimeout(() => setSettlementError(null), 5000);
      return;
    }

    Object.entries(settlementPayments).forEach(([method, amount]) => {
      if ((amount as number) > 0) {
        onAddFinancialRecord({
          type: effectiveBalance >= 0 ? 'expense' : 'income',
          amount: amount as number,
          category: 'Acerto Motoboy',
          description: `Acerto com ${courier.name} (${method.toUpperCase()}). Taxas: R$${totalFees.toFixed(2)} | Diária: R$${dailyFee.toFixed(2)}${settlementOptions.discountCash ? ` | Dinheiro rua: R$${cashCollected.toFixed(2)}` : ''}`,
          date: new Date()
        });
      }
    });

    // Marcar pedidos como acertados
    const orderIds = deliveryOrders
      .filter(o => o.courierId === courier.id && o.status === 'delivered' && !o.isSettled)
      .map(o => o.id);
    
    if (orderIds.length > 0) {
      onSettleOrders(orderIds, dailyFee);
    }

    // Se houve devolução de dinheiro
    if (settlementOptions.totalReturn) {
      // Devolução total do saldo em mãos
      onReturnCash(courier.id, courier.cashHeld || 0);
    } else if (settlementOptions.discountCash && cashCollected > 0) {
      // Devolução apenas do correspondente a estas entregas
      onReturnCash(courier.id, cashCollected);
    }

    setSettlementSuccess(`Acerto de ${courier.name} finalizado com sucesso!`);
    setTimeout(() => setSettlementSuccess(null), 5000);
    setShowSettlementModal(null);
  };

  // Recalcular saldo baseado nas opções
  const effectiveCashDeduction_UI = showSettlementModal && settlementOptions.discountCash ? showSettlementModal.cashCollected : 0;
  const effectiveBalance_UI = showSettlementModal ? (showSettlementModal.totalFees + showSettlementModal.dailyFee) - effectiveCashDeduction_UI : 0;
  const totalSettlementInput = (Object.values(settlementPayments) as number[]).reduce((a, b) => a + b, 0);
  const remainingSettlement = showSettlementModal ? Math.abs(effectiveBalance_UI) - totalSettlementInput : 0;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Integracao: Delivery + Kitchen Flow Header */}
      <div className="bg-white p-4 rounded-3xl border shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
              <Bike size={18} className="text-indigo-600" />
              Painel Operacional
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Gestão Unificada de Delivery e Produção</p>
          </div>
          <div className="h-8 w-px bg-slate-100 hidden md:block" />
          <div className="flex items-center gap-3">
             <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Digital Menu</span>
              <div className="flex items-center gap-2 mt-0.5">
                <button 
                  onClick={() => onUpdateLogisticsSettings({ 
                    deliveryFee: adminSettings?.deliveryFee ?? 0,
                    isDeliveryEnabled: !adminSettings?.isDeliveryEnabled,
                    isPickupEnabled: adminSettings?.isPickupEnabled ?? false,
                    minOrderValue: adminSettings?.minOrderValue || 0,
                    estimatedDeliveryTime: adminSettings?.estimatedDeliveryTime || '',
                    estimatedPickupTime: adminSettings?.estimatedPickupTime || ''
                  })}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${isDeliveryEnabled ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-rose-100 text-rose-600 border border-rose-200'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${isDeliveryEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  Delivery: {isDeliveryEnabled ? 'Aberto' : 'Fechado'}
                </button>
                <button 
                  onClick={() => onUpdateLogisticsSettings({ 
                    deliveryFee: adminSettings?.deliveryFee ?? 0,
                    isDeliveryEnabled: adminSettings?.isDeliveryEnabled ?? false,
                    isPickupEnabled: !adminSettings?.isPickupEnabled,
                    minOrderValue: adminSettings?.minOrderValue || 0,
                    estimatedDeliveryTime: adminSettings?.estimatedDeliveryTime || '',
                    estimatedPickupTime: adminSettings?.estimatedPickupTime || ''
                  })}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${isPickupEnabled ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-rose-100 text-rose-600 border border-rose-200'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${isPickupEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  Balcão: {isPickupEnabled ? 'Aberto' : 'Fechado'}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Navegação Secundária */}
      <div className="flex bg-white p-0.5 rounded-lg border shadow-sm w-fit">
        {[
          { id: 'monitor', label: 'Monitor Despacho', icon: Navigation },
          { id: 'couriers', label: 'Equipe de Entregadores', icon: UserCheck },
          { id: 'settlement', label: 'Acertos Financeiros', icon: Wallet },
          { id: 'settings', label: 'Configurações', icon: Settings }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-1 px-3 py-1 rounded-md font-black text-[8px] uppercase tracking-widest transition-all ${activeSubTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <tab.icon size={12} /> {tab.label}
          </button>
        ))}
      </div>
      {activeSubTab === 'monitor' && (
        <div className="space-y-4">
          {/* Quick Metrics Bento Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border shadow-sm flex items-center gap-3 hover:bg-white hover:border-indigo-100 transition-all duration-300">
              <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                <Package size={16} />
              </div>
              <div>
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">Ped. Pendentes</span>
                <p className="text-sm font-black text-slate-800 leading-none mt-1">{deliveryOrders.filter(o => ['preparing', 'ready'].includes(o.status)).length} ords</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border shadow-sm flex items-center gap-3 hover:bg-white hover:border-indigo-100 transition-all duration-300">
              <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl animate-pulse">
                <Bike size={16} />
              </div>
              <div>
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">A Caminho (Rua)</span>
                <p className="text-sm font-black text-slate-800 leading-none mt-1">{deliveryOrders.filter(o => o.status === 'delivering').length} rotas</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border shadow-sm flex items-center gap-3 hover:bg-white hover:border-indigo-100 transition-all duration-300">
              <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                <UserCheck size={16} />
              </div>
              <div>
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">Equipe de Escala</span>
                <p className="text-sm font-black text-slate-800 leading-none mt-1">
                  {couriers.filter(c => c.active && c.status === 'available').length} / {couriers.filter(c => c.active).length} motos
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border shadow-sm flex items-center gap-3 hover:bg-white hover:border-indigo-100 transition-all duration-300">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <DollarSign size={16} />
              </div>
              <div>
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">Dinheiro em Mão</span>
                <p className="text-sm font-black text-rose-600 leading-none mt-1">R$ {couriers.reduce((sum, c) => sum + (c.cashHeld || 0), 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border shadow-sm flex items-center gap-3 hover:bg-white hover:border-indigo-100 transition-all duration-300 col-span-2 lg:col-span-1">
              <div className="p-2.5 bg-teal-100 text-teal-600 rounded-xl">
                <Settings size={16} />
              </div>
              <div>
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">Modo Delivery</span>
                <p className="text-sm font-black text-teal-600 leading-none mt-1">{isDeliveryEnabled ? 'Aberto' : 'Pausado'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Coluna de Despacho com Filtros */}
          <div className="lg:col-span-4 space-y-2">
            <div className="space-y-1">
              <h3 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1">
                <Package size={12} /> Aguardando Envio ({filteredDispatchOrders.length})
              </h3>
              
              <div className="bg-white p-2 rounded-xl border shadow-sm space-y-1.5">
                 <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                    <input 
                       type="text" 
                       placeholder="Buscar cliente..."
                       className="w-full pl-8 pr-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-bold outline-none focus:border-indigo-500 transition-all"
                       value={monitorSearch}
                       onChange={(e) => setMonitorSearch(e.target.value)}
                    />
                 </div>
                 <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                       <input 
                          type="checkbox" 
                          className="w-3 h-3 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          checked={fiscalPrintDefault}
                          onChange={(e) => setFiscalPrintDefault(e.target.checked)}
                       />
                       <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Cupom Fiscal</span>
                    </label>
                 </div>
                 <div className="flex gap-1">
                    {(['ready', 'preparing', 'all'] as const).map(status => (
                       <button
                          key={status}
                          onClick={() => setMonitorStatusFilter(status)}
                          className={`flex-1 py-1 rounded-md text-[7px] font-black uppercase tracking-widest border transition-all ${monitorStatusFilter === status ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                       >
                          {status === 'ready' ? 'Prontos' : status === 'preparing' ? 'Preparo' : 'Todos'}
                       </button>
                    ))}
                 </div>
              </div>
            </div>

            <div className="space-y-2 h-[calc(100vh-16rem)] overflow-y-auto pr-1 custom-scrollbar">
              {filteredDispatchOrders.map(order => (
                <div key={order.id} className={`bg-white p-2.5 rounded-xl border-2 shadow-sm space-y-2 hover:border-indigo-200 transition-colors ${order.status === 'ready' ? 'border-amber-100' : 'border-slate-50 opacity-80'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-center gap-1">
                           <h4 className="text-sm font-black text-slate-800">#{order.id.slice(-4)}</h4>
                           <span className={`px-1 py-0.5 rounded-full text-[6px] font-black uppercase ${order.status === 'ready' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-500'}`}>
                              {order.status === 'ready' ? 'Pronto' : 'Cozinha'}
                           </span>
                        </div>
                        <p className="text-[7px] font-black uppercase text-slate-400 flex items-center gap-0.5 mt-0.5">
                           <Clock size={8} /> {getOrderAgeInMinutes(order.createdAt)}m
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => onEditOrderInPDV(order)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                        >
                          <Edit size={12} />
                        </button>
                        <button 
                          onClick={() => handlePrintOrder(order, adminSettings, { isFiscal: true })}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                          title="Imprimir Cupom Fiscal"
                        >
                          <Receipt size={12} />
                        </button>
                        <button 
                          onClick={() => handlePrintOrder(order, adminSettings, { isFiscal: false })}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                          title="Imprimir Recibo"
                        >
                          <Printer size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-black text-indigo-600">R$ {order.total.toFixed(2)}</p>
                  </div>
                  
                  <div className="space-y-0.5">
                     <p className="text-[9px] font-black text-slate-700 uppercase">{order.customerName}</p>
                     <div className="flex items-start gap-1 text-[9px] font-medium text-slate-500 bg-slate-50 p-1.5 rounded-lg border">
                        <MapPin size={10} className="text-rose-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-1 leading-relaxed">{order.customerAddress}</span>
                     </div>
                  </div>

                  <button 
                    disabled={order.status !== 'ready'}
                    onClick={() => setSelectedOrderId(order.id)} 
                    className="w-full py-1.5 bg-indigo-600 text-white rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-indigo-700 shadow-sm disabled:opacity-30 disabled:grayscale transition-all"
                  >
                     {order.status === 'ready' ? 'Atribuir Entregador' : 'Aguardando Cozinha'}
                  </button>
                </div>
              ))}

              {filteredDispatchOrders.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-20 grayscale">
                    <Package size={32} strokeWidth={1} />
                    <p className="font-black uppercase tracking-widest mt-1 text-[8px]">Nenhum pedido</p>
                 </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                <Bike size={12} className="text-indigo-600" /> Entregadores em Atividade
              </h3>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border self-start sm:self-auto">
                <button
                  onClick={() => setMonitorViewMode('map')}
                  className={`px-2.5 py-1 rounded-md text-[7px] font-black uppercase tracking-wider transition-all ${
                    monitorViewMode === 'map'
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Mapa Ao Vivo
                </button>
                <button
                  onClick={() => setMonitorViewMode('cards')}
                  className={`px-2.5 py-1 rounded-md text-[7px] font-black uppercase tracking-wider transition-all ${
                    monitorViewMode === 'cards'
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Cards em Grade ({couriers.filter(c => c.active).length})
                </button>
              </div>
            </div>

            {monitorViewMode === 'map' ? (
              <LiveTrackingMap
                couriers={couriers}
                orders={orders}
                adminSettings={adminSettings}
                onUpdateAdminSettings={onUpdateAdminSettings}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {courierSettlementData.filter(c => c.courier.active).map(data => (
                    <div key={data.courier.id} className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
                       <div className="p-2.5 border-b flex justify-between items-center bg-slate-50/50">
                          <div className="flex items-center gap-2">
                             <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-black text-xs">{data.courier.name.charAt(0)}</div>
                             <div>
                                <p className="font-black text-slate-800 text-[10px]">{data.courier.name}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{data.courier.vehicleType}</p>
                             </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                             <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter ${data.courier.status === 'delivering' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {data.courier.status === 'delivering' ? 'Em Rota' : 'Livre'}
                             </span>
                             {data.courier.status === 'available' && data.activeOrdersCount > 0 && (
                                <button 
                                  onClick={() => onDispatchCourier(data.courier.id)}
                                  className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-[7px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-sm shadow-indigo-100 animate-pulse"
                                >
                                  Despachar
                                </button>
                             )}
                          </div>
                       </div>
                       <div className="p-2 bg-indigo-50/30 grid grid-cols-3 gap-2 mx-2 my-1.5 rounded-lg border border-indigo-100">
                          <div className="text-center">
                             <p className="text-[6px] font-black uppercase text-indigo-400">Ganhos</p>
                             <p className="text-[9px] font-black text-indigo-700">R$ {(data.courier.earnings || 0).toFixed(2)}</p>
                          </div>
                          <div className="text-center border-x border-indigo-100">
                             <p className="text-[6px] font-black uppercase text-indigo-400">Acerto</p>
                             <p className="text-[9px] font-black text-indigo-700">R$ {(data.balance ?? 0).toFixed(2)}</p>
                          </div>
                          <div className="text-center">
                             <p className="text-[6px] font-black uppercase text-rose-400">Em Mãos</p>
                             <p className="text-[9px] font-black text-rose-700">R$ {(data.courier.cashHeld || 0).toFixed(2)}</p>
                          </div>
                       </div>
                       <div className="flex-1 p-2.5 space-y-1.5">
                          {deliveryOrders
                            .filter(o => o.courierId === data.courier.id && o.status === 'delivering')
                            .sort((a, b) => (a.routePosition || 0) - (b.routePosition || 0))
                            .map(order => (
                             <div key={order.id} className="flex items-center justify-between p-2 bg-white border border-indigo-100 rounded-lg shadow-sm">
                                <div className="flex items-center gap-1.5">
                                   <div className="w-6 h-6 bg-indigo-600 text-white rounded-md flex items-center justify-center text-[8px] font-black relative">
                                      #{order.id.slice(-4)}
                                      {order.routePosition && (
                                        <span className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center text-[8px] border border-white">
                                          {order.routePosition}
                                        </span>
                                      )}
                                   </div>
                                   <div>
                                     <p className="text-[8px] font-black text-slate-700 uppercase">{order.customerName?.split(' ')[0]}</p>
                                     <p className="text-[6px] text-slate-400 truncate w-24">{order.customerAddress}</p>
                                   </div>
                                </div>
                                 <div className="flex items-center gap-1">
                                   <button 
                                     onClick={() => setSelectedOrderId(order.id)} 
                                     title="Mudar Entregador" 
                                     className="p-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md shadow-sm transition-all"
                                   >
                                     <RefreshCw size={12} />
                                   </button>
                                   <button 
                                     onClick={() => onUpdateStatus(order.id, 'delivered')} 
                                     title="Marcar como Entregue" 
                                     className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md shadow-sm transition-all"
                                   >
                                     <CheckCircle2 size={12} />
                                   </button>
                                 </div>
                             </div>
                          ))}
                          {deliveryOrders.filter(o => o.courierId === data.courier.id && o.status === 'delivering').length === 0 && (
                             <div className="py-2 text-center opacity-20 text-[8px] font-black uppercase tracking-widest">Sem entregas</div>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {activeSubTab === 'couriers' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center">
             <h3 className="text-lg font-black text-slate-800">Equipe de Entrega</h3>
             <button onClick={() => { resetCourierForm(); setShowAddCourierModal(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 shadow-md shadow-indigo-100"><Plus size={14} /> Cadastrar Entregador</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {couriers.map(courier => (
              <div key={courier.id} className="bg-white p-3 rounded-xl border shadow-sm space-y-3 group hover:shadow-md transition-all">
                <div className="flex items-center gap-2.5">
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${courier.active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                      {courier.name.charAt(0)}
                   </div>
                   <div>
                     <h4 className={`font-black text-[10px] ${courier.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{courier.name}</h4>
                     <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">R$ {(courier.dailyFee || 0).toFixed(2)} diária • R$ {(courier.earningsPerDelivery || 0).toFixed(2)} p/ ent. • {courier.vehicleType}</p>
                   </div>
                </div>
                <div className="space-y-1.5">
                   <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-lg"><Phone size={10} className="text-slate-400" /><span className="text-[9px] font-bold">{courier.phone}</span></div>
                   <div className="flex items-center gap-1.5 p-1.5 bg-indigo-50 rounded-lg border border-indigo-100"><QrCode size={10} className="text-indigo-600" /><div className="flex-1 overflow-hidden"><p className="text-[6px] font-black text-indigo-400 uppercase">PIX</p><p className="text-[9px] font-bold text-indigo-700 truncate">{courier.pixKey || 'Não cadastrado'}</p></div></div>
                </div>
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => handleEditCourier(courier)} 
                    className="flex-1 py-1 bg-indigo-50 text-indigo-600 rounded-md font-black text-[7px] uppercase tracking-widest hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit3 size={10} /> Editar
                  </button>
                  <button 
                    onClick={() => onUpdateCourier(courier.id, { active: !courier.active })}
                    className={`flex-1 py-1 border rounded-md font-black text-[7px] uppercase tracking-widest transition-colors ${courier.active ? 'text-rose-500 border-rose-100 hover:bg-rose-50' : 'text-emerald-500 border-emerald-100 hover:bg-emerald-50'}`}
                  >
                    {courier.active ? 'Inativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'settlement' && (() => {
        // Seleção múltipla para acertos em lote
        const handleToggleSelectAllCouriers = (displayed: any[]) => {
          if (selectedCourierIds.length === displayed.length) {
            setSelectedCourierIds([]);
          } else {
            setSelectedCourierIds(displayed.map(d => d.courier.id));
          }
        };

        const handleToggleSelectCourier = (id: string) => {
          setSelectedCourierIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
          );
        };

        const handleFazerAcertoBulk = () => {
          if (selectedCourierIds.length === 0) {
            alert("Selecione ao menos um entregador na tabela para realizar o acerto.");
            return;
          }

          if (selectedCourierIds.length === 1) {
            const data = displayedSettlementData.find(d => d.courier.id === selectedCourierIds[0]);
            if (data) {
              openSettlement({
                courier: data.courier,
                totalFees: data.totalFees,
                dailyFee: data.dailyFeeValue,
                cashCollected: data.cashCollected,
                balance: data.balance
              });
            }
          } else {
            const confirmBulk = window.confirm(`Deseja realmente realizar o acerto em lote de ${selectedCourierIds.length} entregadores? Todos os pedidos entregues pendentes deste período serão arquivados.`);
            if (!confirmBulk) return;

            selectedCourierIds.forEach(id => {
              const data = displayedSettlementData.find(d => d.courier.id === id);
              if (data && (data.orderCount > 0 || data.dailyFeeValue > 0)) {
                if (data.balance > 0) {
                  onAddFinancialRecord({
                    type: 'expense',
                    amount: data.balance,
                    category: 'Acerto Motoboy',
                    description: `Acerto em Lote com ${data.courier.name}. Taxas: R$${data.totalFees.toFixed(2)} | Diária: R$${data.dailyFeeValue.toFixed(2)} | Dinheiro rua: R$${data.cashCollected.toFixed(2)}`,
                    date: new Date()
                  });
                }

                const orderIds = deliveryOrders
                  .filter(o => o.courierId === id && o.status === 'delivered' && !o.isSettled)
                  .map(o => o.id);

                if (orderIds.length > 0) {
                  onSettleOrders(orderIds, data.dailyFeeValue);
                }

                if (data.cashCollected > 0) {
                  onReturnCash(id, data.cashCollected);
                }
              }
            });

            setSelectedCourierIds([]);
            setSettlementSuccess(`Acerto em lote finalizado para os entregadores selecionados!`);
            setTimeout(() => setSettlementSuccess(null), 5000);
          }
        };

        const handlePrintSettlementReport = () => {
          const printWindow = window.open('', '_blank');
          if (!printWindow) {
            alert("Por favor, permita pop-ups para imprimir o relatório.");
            return;
          }

          const rowsHtml = displayedSettlementData.map(data => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px; font-weight: bold; font-size: 11px;">
                ${data.courier.name}<br/>
                <span style="font-size: 9px; color: #888; font-weight: normal;">Diária</span>
              </td>
              <td style="padding: 10px; text-align: center; font-size: 11px;">${data.orderCount}</td>
              <td style="padding: 10px; text-align: right; font-size: 11px;">R$ ${data.totalFees.toFixed(2)}</td>
              <td style="padding: 10px; text-align: center; font-size: 11px;">${data.dailyQuantity}</td>
              <td style="padding: 10px; text-align: right; font-size: 11px;">R$ ${data.dailyFeeValue.toFixed(2)}</td>
              <td style="padding: 10px; text-align: right; font-size: 11px;">R$ ${data.cashCollected.toFixed(2)}</td>
              <td style="padding: 10px; text-align: right; font-size: 11px;">R$ ${data.otherPayments.toFixed(2)}</td>
              <td style="padding: 10px; text-align: right; font-size: 11px;">R$ ${data.totalDeliveriesValue.toFixed(2)}</td>
              <td style="padding: 10px; text-align: right; font-weight: bold; font-size: 11px;">R$ ${data.valorAPagar.toFixed(2)}</td>
              <td style="padding: 10px; text-align: right; font-size: 11px;">R$ ${data.valorPago.toFixed(2)}</td>
              <td style="padding: 10px; text-align: right; font-size: 11px;">R$ ${data.discounts.toFixed(2)}</td>
              <td style="padding: 10px; text-align: right; font-weight: bold; color: #4CAF50; font-size: 11px;">R$ ${data.balance.toFixed(2)}</td>
            </tr>
          `).join('');

          const html = `
            <html>
              <head>
                <title>Acerto de Entregadores - KitchenFlow AI</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11px; margin: 30px; color: #333; }
                  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                  h1 { font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; }
                  .meta { font-size: 10px; color: #555; text-align: right; }
                  table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                  th { background: #f8fafc; padding: 10px; border: 1px solid #e2e8f0; font-size: 9px; text-transform: uppercase; font-weight: 800; color: #475569; }
                  td { border: 1px solid #e2e8f0; }
                </style>
              </head>
              <body>
                <div class="header">
                  <div>
                    <h1>Acerto de Entregadores</h1>
                    <span style="font-size: 10px; font-weight: bold; color: #666;">KITCHENFLOW AI - GESTÃO INTELIGENTE DE ENTREGAS</span>
                  </div>
                  <div class="meta">
                    Período: ${settlementStartDate.split('-').reverse().join('/')} até ${settlementEndDate.split('-').reverse().join('/')}<br/>
                    Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th rowspan="2" style="text-align: left;">Entregador</th>
                      <th rowspan="2">Qtd Entregas</th>
                      <th rowspan="2" style="text-align: right;">Taxas</th>
                      <th rowspan="2">Qtd Diárias</th>
                      <th rowspan="2" style="text-align: right;">Vale Diárias</th>
                      <th colspan="3" style="text-align: center; border-bottom: 1px solid #e2e8f0;">Entregas Realizadas</th>
                      <th rowspan="2" style="text-align: right;">A Pagar</th>
                      <th rowspan="2" style="text-align: right;">Valor Pago</th>
                      <th rowspan="2" style="text-align: right;">Descontos</th>
                      <th rowspan="2" style="text-align: right;">Saldo a Pagar</th>
                    </tr>
                    <tr>
                      <th style="text-align: right;">Dinheiro</th>
                      <th style="text-align: right;">Outras</th>
                      <th style="text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
                <script>
                  window.onload = function() { window.print(); window.close(); }
                </script>
              </body>
            </html>
          `;
          printWindow.document.write(html);
          printWindow.document.close();
        };

        return (
          <div className="space-y-4 animate-in slide-in-from-right-4">
             {settlementSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold uppercase tracking-wide">
                   {settlementSuccess}
                </div>
             )}
             
             <div className="flex justify-between items-center bg-white/70 backdrop-blur p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2">
                   <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Wallet size={18} />
                   </div>
                   <div>
                      <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Acerto de entregadores</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Gestão e conciliação de fechamento de caixas da frota</p>
                   </div>
                </div>
             </div>

             {/* Painel de Filtros */}
             <div className="bg-[#fcfcfc] p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row flex-wrap items-end gap-3.5">
                <div className="flex flex-col space-y-1">
                   <label className="text-[8px] uppercase font-black text-slate-500 tracking-wider">De</label>
                   <input 
                      type="date" 
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold" 
                      value={settlementStartDate}
                      onChange={(e) => setSettlementStartDate(e.target.value)}
                   />
                </div>
                <div className="flex flex-col space-y-1">
                   <label className="text-[8px] uppercase font-black text-slate-500 tracking-wider">Até</label>
                   <input 
                      type="date" 
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold" 
                      value={settlementEndDate}
                      onChange={(e) => setSettlementEndDate(e.target.value)}
                   />
                </div>
                <div className="flex flex-col space-y-1">
                   <label className="text-[8px] uppercase font-black text-slate-500 tracking-wider">Entregador</label>
                   <select 
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold leading-tight min-w-[140px]"
                      value={settlementCourierId}
                      onChange={(e) => setSettlementCourierId(e.target.value)}
                   >
                      <option value="all">Todos</option>
                      {couriers.map(c => (
                         <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                   </select>
                </div>
                <div className="flex flex-col space-y-1">
                   <label className="text-[8px] uppercase font-black text-slate-500 tracking-wider">Status</label>
                   <select 
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold leading-tight min-w-[120px]"
                      value={settlementStatus}
                      onChange={(e) => setSettlementStatus(e.target.value)}
                   >
                      <option value="unsettled">Pendentes</option>
                      <option value="all">Todos</option>
                      <option value="settled">Acertados</option>
                   </select>
                </div>
                <div className="flex flex-col space-y-1">
                   <label className="text-[8px] uppercase font-black text-slate-500 tracking-wider">Turno</label>
                   <select 
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold leading-tight min-w-[100px]"
                      value={settlementTurn}
                      onChange={(e) => setSettlementTurn(e.target.value)}
                   >
                      <option value="all">Todos</option>
                      <option value="manha">Manhã</option>
                      <option value="tarde">Tarde</option>
                      <option value="noite">Noite</option>
                   </select>
                </div>
                <div className="flex items-center gap-2 ml-auto w-full md:w-auto justify-end">
                   <button 
                      onClick={() => {}}
                      className="bg-[#2196F3] cursor-pointer text-white hover:bg-blue-600 px-4 py-1.5 font-bold uppercase rounded shadow-sm text-[10px] tracking-wider transition-all flex items-center gap-1.5"
                   >
                      <Search size={12} strokeWidth={3} /> BUSCAR
                   </button>
                   <button 
                      onClick={handlePrintSettlementReport}
                      className="bg-[#2196F3] cursor-pointer text-white hover:bg-blue-600 px-4 py-1.5 font-bold uppercase rounded shadow-sm text-[10px] tracking-wider transition-all flex items-center gap-1.5"
                   >
                      <Printer size={12} strokeWidth={3} /> IMPRIMIR
                   </button>
                </div>
             </div>

             {/* Botão de Fazer Acerto */}
             <div className="flex justify-start">
                <button 
                   onClick={handleFazerAcertoBulk}
                   className="bg-[#4CAF50] cursor-pointer text-white hover:bg-[#43a047] px-4 py-2 font-black uppercase text-[10px] tracking-widest rounded transition-all shadow-sm flex items-center gap-1.5"
                >
                   <DollarSign size={13} strokeWidth={3} /> FAZER ACERTO
                </button>
             </div>

             {/* Tabela de Lançamentos do Acerto */}
             <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                   <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[#475569] text-[9px] font-extrabold tracking-wider">
                         <th rowSpan={2} className="px-3 py-2.5 text-center border-r border-slate-200 w-10">
                            <input 
                               type="checkbox" 
                               className="w-4 h-4 text-[#4CAF50] border-slate-300 rounded focus:ring-[#4CAF50]"
                               checked={displayedSettlementData.length > 0 && selectedCourierIds.length === displayedSettlementData.length}
                               onChange={() => handleToggleSelectAllCouriers(displayedSettlementData)}
                            />
                         </th>
                         <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-200">ENTREGADOR</th>
                         <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-200 text-center uppercase">QTDE DE ENTREGAS</th>
                         <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-200 text-right uppercase">VALOR DE TAXAS</th>
                         <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-200 text-center uppercase">QTDE DE DIÁRIAS</th>
                         <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-200 text-right uppercase">VALOR DIÁRIAS</th>
                         <th colSpan={3} className="px-3 py-1.5 border-r border-b border-slate-200 text-center font-black">VALORES ENTREGAS REALIZADAS</th>
                         <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-200 text-right uppercase">VALOR A PAGAR</th>
                         <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-200 text-right uppercase">VALOR PAGO</th>
                         <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-200 text-right uppercase">DESCONTOS</th>
                         <th rowSpan={2} className="px-3 py-2.5 text-right uppercase">SALDO A PAGAR</th>
                      </tr>
                      <tr className="bg-slate-50/50 border-b border-slate-200 text-[#475569] text-[8px] font-extrabold tracking-wider">
                         <th className="px-2 py-1 text-center border-r border-slate-200">DINHEIRO</th>
                         <th className="px-2 py-1 text-center border-r border-slate-200">OUTRAS</th>
                         <th className="px-2 py-1 text-center border-r border-slate-200">TOTAL</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                      {displayedSettlementData.map((data, idx) => {
                         const isChecked = selectedCourierIds.includes(data.courier.id);
                         return (
                            <tr key={idx} className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-indigo-50/20' : ''}`}>
                               <td className="px-3 py-3 text-center border-r border-slate-100">
                                  <input 
                                     type="checkbox" 
                                     className="w-4 h-4 text-[#4CAF50] border-slate-300 rounded focus:ring-[#4CAF50]"
                                     checked={isChecked}
                                     onChange={() => handleToggleSelectCourier(data.courier.id)}
                                  />
                               </td>
                               <td className="px-3 py-3 border-r border-slate-100">
                                  <div className="font-bold text-slate-800 leading-tight">{data.courier.name}</div>
                                  <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-tight">Diária</div>
                               </td>
                               <td className="px-3 py-3 border-r border-slate-100 text-center font-semibold text-slate-600">{data.orderCount}</td>
                               <td className="px-3 py-3 border-r border-slate-100 text-right font-semibold text-slate-600">R$ {data.totalFees.toFixed(2)}</td>
                               <td className="px-3 py-3 border-r border-slate-100 text-center font-semibold text-slate-600">{data.dailyQuantity}</td>
                               <td className="px-3 py-3 border-r border-slate-100 text-right font-semibold text-slate-600">R$ {data.dailyFeeValue.toFixed(2)}</td>
                               <td className="px-2 py-3 border-r border-slate-100 text-center font-semibold text-slate-500">R$ {data.cashCollected.toFixed(2)}</td>
                               <td className="px-2 py-3 border-r border-slate-100 text-center font-semibold text-slate-500">R$ {data.otherPayments.toFixed(2)}</td>
                               <td className="px-2 py-3 border-r border-slate-100 text-center font-semibold text-slate-500">R$ {data.totalDeliveriesValue.toFixed(2)}</td>
                               <td className="px-3 py-3 border-r border-slate-100 text-right font-bold text-slate-800">R$ {data.valorAPagar.toFixed(2)}</td>
                               <td className="px-3 py-3 border-r border-slate-100 text-right font-semibold text-slate-500">R$ {data.valorPago.toFixed(2)}</td>
                               <td className="px-3 py-3 border-r border-slate-100 text-right font-semibold text-slate-500">R$ {data.discounts.toFixed(2)}</td>
                               <td className={`px-3 py-3 text-right font-black text-xs ${data.balance >= 0 ? 'text-[#4CAF50]' : 'text-rose-600'}`}>R$ {data.balance.toFixed(2)}</td>
                            </tr>
                         );
                      })}
                      {displayedSettlementData.length === 0 && (
                         <tr>
                            <td colSpan={13} className="px-4 py-8 text-center text-slate-400 font-bold uppercase tracking-wider">
                               Nenhum entregador encontrado com os filtros atuais.
                            </td>
                         </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        );
      })()}

      {/* Modal de Seleção de Entregador (Despacho) */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b bg-indigo-50/30 flex justify-between items-center"><div><h2 className="text-sm font-black text-slate-800">Despachar Pedido</h2><p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Pedido #{selectedOrderId.slice(-4)}</p></div><button onClick={() => setSelectedOrderId(null)} className="p-1.5 hover:bg-white rounded-full"><X size={16} /></button></div>
            <div className="p-3 space-y-2">
              {couriers.filter(c => c.active).map(courier => {
                const activeOrdersCount = orders.filter(o => o.courierId === courier.id && o.status === 'delivering').length;
                const isDelivering = courier.status === 'delivering';
                
                return (
                    <button 
                      key={courier.id} 
                      onClick={() => { onAssignCourier(selectedOrderId, courier.id); setSelectedOrderId(null); }} 
                      className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-slate-50 hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left group"
                    >
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-white shadow-sm border rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all"><Bike size={16} /></div>
                        <div>
                          <p className="font-black text-slate-800 text-[10px]">{courier.name}</p>
                          <p className={`text-[8px] font-black uppercase ${courier.status === 'offline' ? 'text-slate-400' : (isDelivering ? 'Em Rota' : (activeOrdersCount > 0 ? `${activeOrdersCount} pedidos aguardando saída` : 'Livre agora'))}`}>
                            {courier.status === 'offline' ? 'Offline' : (isDelivering ? 'Em Rota' : (activeOrdersCount > 0 ? `${activeOrdersCount} aguardando` : 'Livre'))}
                          </p>
                        </div>
                     </div>
                     <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-600" />
                   </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cadastro / Edição Entregador */}
      {showAddCourierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b bg-indigo-50/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md">
                  {editingCourier ? <Edit3 size={18} /> : <UserPlus size={18} />}
                </div>
                <div>
                  <h2 className="text-sm font-black">{editingCourier ? 'Editar Entregador' : 'Novo Entregador'}</h2>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{editingCourier ? 'Atualize os dados de perfil e pagamento' : 'Adicione um novo membro à frota'}</p>
                </div>
              </div>
              <button onClick={() => setShowAddCourierModal(false)} className="p-1.5 hover:bg-white rounded-full transition-colors"><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input type="text" className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-[10px] font-bold outline-none focus:border-indigo-500 transition-all" value={newCourierName} onChange={(e)=>setNewCourierName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                    <input type="text" className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-[10px] font-bold outline-none focus:border-indigo-500 transition-all" value={newCourierPhone} onChange={(e)=>setNewCourierPhone(maskPhone(e.target.value))} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Email (Acesso App)</label>
                    <input type="email" className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-[10px] font-bold outline-none focus:border-indigo-500 transition-all" value={newCourierEmail} onChange={(e)=>setNewCourierEmail(e.target.value)} />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF</label>
                    <input type="text" className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-[10px] font-bold outline-none focus:border-indigo-500 transition-all" value={newCourierDocument} onChange={(e)=>setNewCourierDocument(e.target.value)} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">CNH</label>
                    <input type="text" className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-[10px] font-bold outline-none focus:border-indigo-500 transition-all" value={newCourierCnh} onChange={(e)=>setNewCourierCnh(e.target.value)} />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Repasse/Entrega (R$)</label>
                    <input type="number" className="w-full px-3 py-2 bg-slate-50 border-2 border-teal-100 rounded-lg font-black text-teal-600 text-[10px] outline-none focus:border-teal-500 transition-all" value={newCourierEarningsPerDelivery} onChange={(e)=>setNewCourierEarningsPerDelivery(e.target.value)} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Diária (R$)</label>
                    <input type="number" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-black text-slate-600 text-[10px] outline-none focus:border-indigo-500 transition-all" value={newCourierDailyFee} onChange={(e)=>setNewCourierDailyFee(e.target.value)} />
                 </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Controle de Acesso</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-800">Status da Conta</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Ativar ou desativar acesso ao App</p>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={editingCourier ? editingCourier.active : true}
                      onChange={(e) => {
                        if (editingCourier) {
                          onUpdateCourier(editingCourier.id, { active: e.target.checked });
                          setEditingCourier({...editingCourier, active: e.target.checked});
                        }
                      }}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Residencial</label>
                <input type="text" className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-[10px] font-bold outline-none focus:border-indigo-500 transition-all" value={newCourierAddress} onChange={(e)=>setNewCourierAddress(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Chave PIX</label>
                <input type="text" className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-[10px] font-bold outline-none focus:border-indigo-500 transition-all" value={newCourierPix} onChange={(e)=>setNewCourierPix(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Veículo</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['moto', 'bike', 'car'] as const).map(v => (
                    <button key={v} onClick={() => setNewCourierVehicle(v)} className={`py-1.5 rounded-lg border-2 font-black text-[8px] uppercase transition-all ${newCourierVehicle === v ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex gap-3">
              <button onClick={() => setShowAddCourierModal(false)} className="flex-1 py-2 font-black text-slate-400 uppercase text-[9px]">Cancelar</button>
              <button onClick={handleSaveCourier} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-black uppercase text-[9px] shadow-md hover:bg-indigo-700 transition-all">
                {editingCourier ? 'Salvar Alterações' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOVO Modal: Acerto Financeiro Multimeios */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-4 border-b bg-indigo-600 text-white flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl shadow-inner"><Wallet size={18} /></div>
                    <div>
                       <h2 className="text-sm font-black">Acerto: {showSettlementModal.courier.name}</h2>
                       <p className="text-[8px] font-bold uppercase tracking-widest opacity-80">Conciliação Multimeios</p>
                    </div>
                 </div>
                 <button onClick={() => setShowSettlementModal(null)} className="p-1.5 hover:bg-white/20 rounded-full"><X size={18} /></button>
              </div>

              <div className="p-4 flex flex-col lg:flex-row gap-4">
                 {/* Resumo Esquerda */}
                 <div className="flex-1 space-y-3">
                    <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Resumo do Período</p>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-600"><span>Diária</span><span className="text-indigo-600 font-black">+ R$ {showSettlementModal.dailyFee.toFixed(2)}</span></div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-600"><span>Taxas ({showSettlementModal.orderCount} ent.)</span><span className="text-emerald-600 font-black">+ R$ {showSettlementModal.totalFees.toFixed(2)}</span></div>
                        <div className="pt-2 mt-2 border-t space-y-2">
                           <label className="flex items-center gap-2 cursor-pointer group">
                              <input 
                                 type="checkbox" 
                                 className="w-3 h-3 rounded text-indigo-600 border-slate-300"
                                 checked={settlementOptions.discountCash}
                                 onChange={(e) => {
                                    const val = e.target.checked;
                                    setSettlementOptions(prev => ({ ...prev, discountCash: val }));
                                    // Atualizar o pagamento sugerido
                                    const newBalance = (showSettlementModal.totalFees + showSettlementModal.dailyFee) - (val ? showSettlementModal.cashCollected : 0);
                                    setSettlementPayments({ dinheiro: newBalance > 0 ? newBalance : 0, pix: 0, cartao: 0 });
                                 }}
                              />
                              <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-indigo-600 transition-colors">Descontar dinheiro em mãos (Lote)</span>
                           </label>
                           
                           {settlementOptions.discountCash && (
                              <div className="flex justify-between items-center text-[10px] font-bold text-rose-500 ml-5 italic">
                                 <span>Dinheiro rua (lote atual)</span>
                                 <span>- R$ {showSettlementModal.cashCollected.toFixed(2)}</span>
                              </div>
                           )}

                           <label className="flex items-center gap-2 cursor-pointer group">
                              <input 
                                 type="checkbox" 
                                 className="w-3 h-3 rounded text-rose-600 border-slate-300"
                                 checked={settlementOptions.totalReturn}
                                 onChange={(e) => setSettlementOptions(prev => ({ ...prev, totalReturn: e.target.checked }))}
                              />
                              <div className="flex flex-col">
                                 <span className="text-[9px] font-black uppercase text-rose-500 group-hover:text-rose-700 transition-colors">Devolução Total</span>
                                 <span className="text-[7px] text-slate-400 font-bold">Zerar todo saldo em mãos: R$ {(showSettlementModal.courier.cashHeld || 0).toFixed(2)}</span>
                              </div>
                           </label>
                        </div>
                       <div className="pt-2 border-t flex justify-between items-center">
                          <span className="font-black text-slate-800 text-xs">Saldo Final</span>
                          <span className={`text-lg font-black ${effectiveBalance_UI >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>R$ {Math.abs(effectiveBalance_UI).toFixed(2)}</span>
                       </div>
                    </div>
                    {effectiveBalance_UI < 0 && (
                       <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg flex gap-2 text-rose-700">
                          <AlertTriangle size={14} className="shrink-0" />
                          <p className="text-[8px] font-bold leading-tight uppercase">O entregador possui mais dinheiro em espécie do que tem a receber. Ele deve devolver a diferença.</p>
                       </div>
                    )}
                 </div>

                 {/* Checkout Direita */}
                 <div className="flex-1 space-y-3">
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1">Como o acerto será pago?</p>
                    <div className="space-y-2">
                       {[
                         { id: 'dinheiro', label: 'Dinheiro', icon: Banknote },
                         { id: 'pix', label: 'PIX', icon: QrCode },
                         { id: 'cartao', label: 'Cartão / Depósito', icon: CreditCard }
                       ].map(m => (
                          <div key={m.id} className="relative group">
                             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><m.icon size={14} /></div>
                             <input 
                               type="number" 
                               placeholder={m.label}
                               className="w-full pl-9 pr-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-[10px] font-black outline-none focus:border-indigo-500 transition-all"
                               value={settlementPayments[m.id] || ''}
                               onChange={(e) => setSettlementPayments({...settlementPayments, [m.id]: parseFloat(e.target.value) || 0})}
                             />
                          </div>
                       ))}
                    </div>

                    <div className="p-3 bg-indigo-50 rounded-xl space-y-1 border border-indigo-100">
                       <div className="flex justify-between items-center text-[7px] font-black uppercase text-indigo-400"><span>Restante</span><span>Status</span></div>
                       <div className="flex justify-between items-center">
                          <span className={`text-sm font-black ${remainingSettlement === 0 ? 'text-emerald-500' : 'text-indigo-600'}`}>R$ {remainingSettlement.toFixed(2)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${remainingSettlement === 0 ? 'bg-emerald-500 text-white' : 'bg-indigo-200 text-indigo-700'}`}>
                             {remainingSettlement === 0 ? 'Conferido' : 'Pendente'}
                          </span>
                       </div>
                    </div>

                    {settlementError && (
                       <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 text-rose-600 animate-in slide-in-from-top-2">
                          <AlertTriangle size={14} />
                          <p className="text-[8px] font-black uppercase">{settlementError}</p>
                       </div>
                    )}

                    {settlementSuccess && (
                       <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2 text-emerald-600 animate-in slide-in-from-top-2">
                          <CheckCircle2 size={14} />
                          <p className="text-[8px] font-black uppercase">{settlementSuccess}</p>
                       </div>
                    )}
                 </div>
              </div>

              <div className="p-4 border-t bg-slate-50 flex gap-3">
                 <button onClick={() => setShowSettlementModal(null)} className="flex-1 py-2 font-black text-slate-400 uppercase tracking-widest text-[10px]">Cancelar</button>
                 <button 
                  onClick={handleRealizeSettlement} 
                  disabled={remainingSettlement !== 0}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-md disabled:opacity-30 disabled:grayscale transition-all"
                 >
                    Confirmar e Gerar Lançamentos
                 </button>
              </div>
          </div>
        </div>
      )}
      {activeSubTab === 'settings' && (
        <div className="space-y-6 animate-in slide-in-from-left-4">
          <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm max-w-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-xl shadow-indigo-100">
                <Settings size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tighter">Configurações de Logística</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controle as modalidades de entrega e taxas</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Canais de Venda */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modalidades Ativas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`flex flex-col gap-3 p-6 rounded-3xl border transition-all ${localDeliveryEnabled ? 'bg-slate-50 border-slate-100 group hover:bg-white hover:border-indigo-200' : 'bg-slate-100/50 border-slate-200 opacity-60'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl shadow-sm transition-all ${localDeliveryEnabled ? 'bg-white group-hover:bg-indigo-600 group-hover:text-white' : 'bg-slate-200 text-slate-400'}`}>
                          <Bike size={20} />
                        </div>
                        <div>
                          <p className={`font-black text-sm ${localDeliveryEnabled ? 'text-slate-800' : 'text-slate-500'}`}>Delivery</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Entrega em domicílio</p>
                        </div>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={localDeliveryEnabled}
                          onChange={(e) => setLocalDeliveryEnabled(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </div>
                    </div>
                    <div className={`space-y-1 transition-all ${!localDeliveryEnabled ? 'pointer-events-none' : ''}`}>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Tempo Estimado</label>
                      <input 
                        type="text" 
                        placeholder="Ex: 30-50 min"
                        disabled={!localDeliveryEnabled}
                        className={`w-full px-3 py-2 border rounded-xl text-[10px] font-bold outline-none transition-all ${localDeliveryEnabled ? 'bg-white border-slate-100 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                        value={localEstimatedDeliveryTime}
                        onChange={(e) => setLocalEstimatedDeliveryTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={`flex flex-col gap-3 p-6 rounded-3xl border transition-all ${localPickupEnabled ? 'bg-slate-50 border-slate-100 group hover:bg-white hover:border-indigo-200' : 'bg-slate-100/50 border-slate-200 opacity-60'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl shadow-sm transition-all ${localPickupEnabled ? 'bg-white group-hover:bg-indigo-600 group-hover:text-white' : 'bg-slate-200 text-slate-400'}`}>
                          <Store size={20} />
                        </div>
                        <div>
                          <p className={`font-black text-sm ${localPickupEnabled ? 'text-slate-800' : 'text-slate-500'}`}>Retirada</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Cliente retira no balcão</p>
                        </div>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={localPickupEnabled}
                          onChange={(e) => setLocalPickupEnabled(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </div>
                    </div>
                    <div className={`space-y-1 transition-all ${!localPickupEnabled ? 'pointer-events-none' : ''}`}>
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Tempo Estimado</label>
                      <input 
                        type="text" 
                        placeholder="Ex: 15-20 min"
                        disabled={!localPickupEnabled}
                        className={`w-full px-3 py-2 border rounded-xl text-[10px] font-bold outline-none transition-all ${localPickupEnabled ? 'bg-white border-slate-100 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                        value={localEstimatedPickupTime}
                        onChange={(e) => setLocalEstimatedPickupTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Taxa de Entrega e Pedido Mínimo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Taxa de Entrega Padrão</h4>
                  <div className={`p-6 rounded-[2.5rem] border flex flex-col items-center justify-between gap-4 transition-all ${localDeliveryEnabled ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-100/50 border-slate-200 opacity-60'}`}>
                    <div className="flex items-center gap-4 w-full">
                      <div className={`p-3 rounded-2xl shadow-md transition-all ${localDeliveryEnabled ? 'bg-white text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                        <Coins size={20} />
                      </div>
                      <div>
                        <p className={`font-black text-xs ${localDeliveryEnabled ? 'text-slate-800' : 'text-slate-500'}`}>Taxa Única</p>
                        <p className={`text-[8px] font-bold uppercase ${localDeliveryEnabled ? 'text-indigo-400' : 'text-slate-400'}`}>Pedidos Delivery</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full justify-end">
                      <span className={`text-xl font-black ${localDeliveryEnabled ? 'text-indigo-600' : 'text-slate-400'}`}>R$</span>
                      <input 
                        type="number" 
                        disabled={!localDeliveryEnabled}
                        className={`w-full max-w-[120px] px-4 py-3 border-2 rounded-2xl text-xl font-black outline-none transition-all ${localDeliveryEnabled ? 'bg-white border-indigo-200 text-indigo-600 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                        value={localDeliveryFee}
                        onChange={(e) => setLocalDeliveryFee(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pedido Mínimo</h4>
                  <div className={`p-6 rounded-[2.5rem] border flex flex-col items-center justify-between gap-4 transition-all ${(localDeliveryEnabled || localPickupEnabled) ? 'bg-amber-50 border-amber-100' : 'bg-slate-100/50 border-slate-200 opacity-60'}`}>
                    <div className="flex items-center gap-4 w-full">
                      <div className={`p-3 rounded-2xl shadow-md transition-all ${(localDeliveryEnabled || localPickupEnabled) ? 'bg-white text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                        <DollarSign size={20} />
                      </div>
                      <div>
                        <p className={`font-black text-xs ${(localDeliveryEnabled || localPickupEnabled) ? 'text-slate-800' : 'text-slate-500'}`}>Valor Mínimo</p>
                        <p className={`text-[8px] font-bold uppercase ${(localDeliveryEnabled || localPickupEnabled) ? 'text-amber-500' : 'text-slate-400'}`}>Para aceitar pedidos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full justify-end">
                      <span className={`text-xl font-black ${(localDeliveryEnabled || localPickupEnabled) ? 'text-amber-600' : 'text-slate-400'}`}>R$</span>
                      <input 
                        type="number" 
                        disabled={!(localDeliveryEnabled || localPickupEnabled)}
                        className={`w-full max-w-[120px] px-4 py-3 border-2 rounded-2xl text-xl font-black outline-none transition-all ${(localDeliveryEnabled || localPickupEnabled) ? 'bg-white border-amber-200 text-amber-600 focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                        value={localMinOrderValue}
                        onChange={(e) => setLocalMinOrderValue(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleSaveSettings}
                  disabled={saveStatus !== 'idle'}
                  className={`flex items-center gap-2 px-8 py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl transition-all ${
                    saveStatus === 'success' 
                      ? 'bg-emerald-500 text-white shadow-emerald-100' 
                      : 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700'
                  }`}
                >
                  {saveStatus === 'saving' ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : saveStatus === 'success' ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Save size={16} />
                  )}
                  {saveStatus === 'saving' ? 'Salvando...' : saveStatus === 'success' ? 'Configurações Salvas!' : 'Salvar Configurações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default Delivery;
