import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, UserRole, Order, FinancialRecord } from '../types';
import { 
  Wallet, Coins, Calculator, Percent, PiggyBank, FileCheck, 
  CheckCircle, Plus, Edit3, Trash2, Calendar, FileText, Download,
  TrendingUp, AlertTriangle, HelpCircle, ArrowUpRight, DollarSign,
  Briefcase, Save, UserCheck, CreditCard, ChevronDown, RefreshCw, X, Printer
} from 'lucide-react';

interface PayrollSimulatorProps {
  users: User[];
  orders?: Order[];
  onUpdateUser: (id: string, updates: Partial<User>) => Promise<void> | void;
  onAddFinancialRecord?: (record: Partial<FinancialRecord>) => Promise<void> | void;
}

export const PayrollSimulator: React.FC<PayrollSimulatorProps> = ({
  users,
  orders = [],
  onUpdateUser,
  onAddFinancialRecord
}) => {
  // Estado para o funcionário em edição de contrato
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // Campos do formulário de edição de contrato
  const [contractType, setContractType] = useState<'CLT' | 'PJ' | 'Diarista' | 'Horista'>('CLT');
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [dailyRate, setDailyRate] = useState<number>(0);
  const [benefits, setBenefits] = useState<number>(0);
  const [discounts, setDiscounts] = useState<number>(0);
  const [bankInfo, setBankInfo] = useState<string>('');
  
  // Valores simulados de horas/dias no mês corrente (para visualização interativa)
  const [hoursSimulated, setHoursSimulated] = useState<Record<string, number>>({});
  const [daysSimulated, setDaysSimulated] = useState<Record<string, number>>({});

  // Holerite ativo para visualização em modal
  const [selectedPayslipUser, setSelectedPayslipUser] = useState<User | null>(null);
  const [showPayoutSuccess, setShowPayoutSuccess] = useState<string | null>(null);

  // 1. Calcular faturamento bruto do restaurante nos últimos 30 dias a partir dos pedidos
  const salesVolume30Days = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return orders
      .filter(order => {
        const isCompleted = order.status === 'finished' || order.status === 'delivered';
        const orderTime = new Date(order.createdAt).getTime();
        return isCompleted && orderTime >= thirtyDaysAgo;
      })
      .reduce((sum, order) => sum + (order.total || 0), 0);
  }, [orders]);

  // Auxiliar: obter valores com fallback de preset realista de mercado
  const getUserPayrollData = (user: User) => {
    const type = user.contractType || (
      user.role === 'WAITER' ? 'Horista' :
      user.role === 'COURIER' ? 'Diarista' : 'CLT'
    );
    
    // Presets realistas de salários
    const defaultSalary = user.baseSalary !== undefined ? user.baseSalary : (
      user.role === 'ADMIN' || user.role === 'OWNER' || user.role === 'MANAGER' ? 3500 :
      user.role === 'CHEF' ? 2800 :
      user.role === 'CASHIER' ? 1900 :
      user.role === 'STOCK_ANALYST' ? 2200 : 1800
    );

    const defaultHourly = user.hourlyRate !== undefined ? user.hourlyRate : 12;
    const defaultDaily = user.dailyRate !== undefined ? user.dailyRate : 110;
    const defaultCommission = user.commissionRate !== undefined ? user.commissionRate : (
      user.role === 'WAITER' ? 8 : 0
    );
    const defaultBenefits = user.benefits !== undefined ? user.benefits : 380;
    const defaultDiscounts = user.discounts !== undefined ? user.discounts : 0;
    const defaultBank = user.bankInfo || 'Chave Pix (E-mail ou CPF)';

    const hSim = hoursSimulated[user.id] !== undefined ? hoursSimulated[user.id] : (user.workingHoursSimulated || 160);
    const dSim = daysSimulated[user.id] !== undefined ? daysSimulated[user.id] : (user.workingDaysSimulated || 22);

    return {
      type,
      baseSalary: defaultSalary,
      hourlyRate: defaultHourly,
      dailyRate: defaultDaily,
      commissionRate: defaultCommission,
      benefits: defaultBenefits,
      discounts: defaultDiscounts,
      bankInfo: defaultBank,
      hoursWorked: hSim,
      daysWorked: dSim
    };
  };

  // 2. Calcular folha detalhada para cada usuário ativo
  const activeStaffList = useMemo(() => {
    return users.filter(u => u.active && u.role !== 'CUSTOMER');
  }, [users]);

  const analyzedStaff = useMemo(() => {
    return activeStaffList.map(user => {
      const pData = getUserPayrollData(user);
      
      // Calcular comissão individual sobre as vendas do restaurante se houver comissão configurada
      // Exemplo: se houver comissão de 10% do garçom, dividimos as vendas de mesas ou dividimos proporcionalmente
      // Para simular de forma fiel, calculamos a comissão individual com base no faturamento do restaurante
      // e dividimos entre a quantidade de garçons para ser super realista, ou direto % do faturamento
      const totalRestaurantSales = salesVolume30Days > 0 ? salesVolume30Days : 38500; // fallback realista se vazio
      
      let comissaoCalculada = 0;
      if (pData.commissionRate > 0) {
        if (user.role === 'WAITER') {
          // Garçons dividem a caixinha (ex: 8% do faturamento total de mesas ou proporcional)
          const waitersCount = activeStaffList.filter(u => u.role === 'WAITER').length || 1;
          const tableSales = totalRestaurantSales * 0.6; // mesas representam ~60% das vendas
          comissaoCalculada = (tableSales * (pData.commissionRate / 100)) / waitersCount;
        } else {
          comissaoCalculada = totalRestaurantSales * (pData.commissionRate / 100);
        }
      }

      // Cálculo de Salário Bruto baseado no contrato
      let salarioBruto = 0;
      if (pData.type === 'CLT' || pData.type === 'PJ') {
        salarioBruto = pData.baseSalary;
      } else if (pData.type === 'Horista') {
        salarioBruto = pData.hoursWorked * pData.hourlyRate;
      } else if (pData.type === 'Diarista') {
        salarioBruto = pData.daysWorked * pData.dailyRate;
      }

      // Adicionais e descontos
      const proventos = salarioBruto + pData.benefits + comissaoCalculada;
      const descontos = pData.discounts;
      const salarioLiquido = Math.max(0, proventos - descontos);

      // Custos corporativos adicionais (Encargos Trabalhistas Brasileiros CLT)
      // CLT: FGTS (8%), INSS patronal estimado (20%), Proporcional Férias (11.11%), 13º salário (8.33%) = ~47% adicionais
      // PJ: Sem encargos (0%)
      // Diarista/Horista: encargos reduzidos ou 0% dependendo do regime (simulamos 10% para cobertura/provisão)
      let encargosEmpresa = 0;
      if (pData.type === 'CLT') {
        encargosEmpresa = salarioBruto * 0.474;
      } else if (pData.type === 'Horista' || pData.type === 'Diarista') {
        encargosEmpresa = salarioBruto * 0.15; // Provisão básica
      }

      const custoTotalEmpresa = salarioBruto + encargosEmpresa + pData.benefits + comissaoCalculada;

      return {
        user,
        pData,
        salarioBruto,
        comissaoCalculada,
        proventos,
        descontos,
        salarioLiquido,
        encargosEmpresa,
        custoTotalEmpresa
      };
    });
  }, [activeStaffList, salesVolume30Days, hoursSimulated, daysSimulated]);

  // 3. Totais Gerais do Dashboard de Folha
  const totals = useMemo(() => {
    const totalLiquido = analyzedStaff.reduce((sum, s) => sum + s.salarioLiquido, 0);
    const totalCustoEmpresa = analyzedStaff.reduce((sum, s) => sum + s.custoTotalEmpresa, 0);
    const totalEncargos = analyzedStaff.reduce((sum, s) => sum + s.encargosEmpresa, 0);
    const totalBeneficios = analyzedStaff.reduce((sum, s) => sum + s.pData.benefits, 0);
    const totalComissoes = analyzedStaff.reduce((sum, s) => sum + s.comissaoCalculada, 0);
    
    // Proporção de custo de pessoal com faturamento (Labor Cost Ratio)
    const activeSales = salesVolume30Days > 0 ? salesVolume30Days : 38500;
    const laborCostRatio = (totalCustoEmpresa / activeSales) * 100;

    return {
      totalLiquido,
      totalCustoEmpresa,
      totalEncargos,
      totalBeneficios,
      totalComissoes,
      laborCostRatio,
      salesVolume: activeSales
    };
  }, [analyzedStaff, salesVolume30Days]);

  // Iniciar edição de contrato
  const startEditingContract = (user: User) => {
    const pData = getUserPayrollData(user);
    setEditingUserId(user.id);
    setContractType(pData.type);
    setBaseSalary(pData.baseSalary);
    setCommissionRate(pData.commissionRate);
    setHourlyRate(pData.hourlyRate);
    setDailyRate(pData.dailyRate);
    setBenefits(pData.benefits);
    setDiscounts(pData.discounts);
    setBankInfo(pData.bankInfo);
  };

  // Salvar alterações de contrato no usuário
  const saveContractSettings = async (userId: string) => {
    const updates: Partial<User> = {
      contractType,
      baseSalary,
      commissionRate,
      hourlyRate,
      dailyRate,
      benefits,
      discounts,
      bankInfo,
      workingHoursSimulated: hoursSimulated[userId] || 160,
      workingDaysSimulated: daysSimulated[userId] || 22
    };

    try {
      await onUpdateUser(userId, updates);
      setEditingUserId(null);
    } catch (err) {
      console.error("Erro ao atualizar contrato do funcionário", err);
    }
  };

  // Processar pagamento individual online/local (registra como despesa no financeiro)
  const handleProcessPayout = async (staffMember: typeof analyzedStaff[0]) => {
    if (!onAddFinancialRecord) return;

    const netVal = staffMember.salarioLiquido;
    const userName = staffMember.user.name;
    const userRole = staffMember.user.role;
    const dateNow = new Date();

    const record: Partial<FinancialRecord> = {
      type: 'expense',
      amount: netVal,
      category: 'staff',
      description: `Folha de Pgto: ${userName} (${userRole}) - Contrato ${staffMember.pData.type}`,
      date: dateNow,
      dueDate: dateNow,
      status: 'paid',
      paymentMethod: 'pix',
      isRecurring: false
    };

    try {
      await onAddFinancialRecord(record);
      setShowPayoutSuccess(staffMember.user.id);
      setTimeout(() => setShowPayoutSuccess(null), 3000);
    } catch (err) {
      console.error("Erro ao registrar pagamento financeiro", err);
    }
  };

  // Impressão rápida do holerite
  const handlePrintPayslip = () => {
    if (!selectedPayslipUser) return;
    
    const pData = getUserPayrollData(selectedPayslipUser);
    const sObj = analyzedStaff.find(s => s.user.id === selectedPayslipUser.id);
    if (!sObj) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      // Se bloqueado, usa o print nativo do navegador como fallback
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo de Pagamento - ${selectedPayslipUser.name}</title>
          <style>
            body {
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 20px;
              background-color: #ffffff;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              border: 2px solid #e2e8f0;
              border-radius: 16px;
              padding: 24px;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .header h2 {
              margin: 0;
              font-size: 18px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: -0.025em;
              color: #4f46e5;
            }
            .header p {
              margin: 4px 0 0;
              font-size: 11px;
              font-weight: 700;
              color: #94a3b8;
              text-transform: uppercase;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-bottom: 20px;
              border: 1px solid #f1f5f9;
              padding: 12px;
              border-radius: 12px;
              background-color: #f8fafc;
            }
            .info-block p {
              margin: 0;
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              color: #94a3b8;
              letter-spacing: 0.05em;
            }
            .info-block h4 {
              margin: 4px 0 0;
              font-size: 13px;
              font-weight: 700;
              color: #1e293b;
            }
            .info-block span {
              font-size: 11px;
              color: #64748b;
              display: block;
              margin-top: 2px;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .table-header {
              background-color: #f1f5f9;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              color: #475569;
              letter-spacing: 0.05em;
            }
            .table-header td {
              padding: 8px 12px;
            }
            .table-row {
              border-bottom: 1px solid #f1f5f9;
              font-size: 12px;
            }
            .table-row td {
              padding: 12px;
            }
            .font-bold {
              font-weight: 700;
            }
            .text-right {
              text-align: right;
            }
            .text-green {
              color: #16a34a;
              font-weight: 700;
            }
            .text-red {
              color: #dc2626;
              font-weight: 700;
            }
            .summary-box {
              background-color: #eef2ff;
              border: 1px solid #e0e7ff;
              padding: 16px;
              border-radius: 12px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 30px;
            }
            .summary-label p {
              margin: 0;
              font-size: 9px;
              font-weight: 800;
              color: #4f46e5;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .summary-label span {
              font-size: 11px;
              color: #64748b;
            }
            .summary-value {
              font-size: 20px;
              font-weight: 900;
              color: #3730a3;
            }
            .signature {
              margin-top: 50px;
              text-align: center;
            }
            .signature-line {
              border-top: 1px dashed #94a3b8;
              width: 250px;
              margin: 0 auto;
              padding-top: 8px;
              font-size: 11px;
              font-weight: 700;
              color: #64748b;
            }
            @media print {
              body {
                padding: 0;
              }
              .container {
                border: none;
                box-shadow: none;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Recibo de Pagamento (Holerite)</h2>
              <p>Demonstrativo Mensal Simplificado</p>
            </div>
            
            <div class="info-grid">
              <div class="info-block">
                <p>Empregador</p>
                <h4>KITCHENFLOW AI RESTAURANTE</h4>
                <span>CNPJ: 42.109.843/0001-99</span>
              </div>
              <div class="info-block">
                <p>Colaborador</p>
                <h4>${selectedPayslipUser.name}</h4>
                <span>${selectedPayslipUser.role} · Reg. ${pData.type}</span>
              </div>
            </div>

            <table class="table">
              <thead>
                <tr class="table-header">
                  <td>Descrição dos Itens</td>
                  <td class="text-right">Proventos</td>
                  <td class="text-right">Descontos</td>
                </tr>
              </thead>
              <tbody>
                <tr class="table-row">
                  <td>
                    <div class="font-bold">Vencimento Base</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                      ${pData.type === 'Horista' ? `${pData.hoursWorked} Horas trabalhadas` : 
                        pData.type === 'Diarista' ? `${pData.daysWorked} Diárias efetuadas` : 'Salário base do contrato'}
                    </div>
                  </td>
                  <td class="text-right font-bold">R$ ${sObj.salarioBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="text-right">-</td>
                </tr>
                
                ${sObj.comissaoCalculada > 0 ? `
                <tr class="table-row">
                  <td>
                    <div class="font-bold">Comissões de Vendas</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Taxa de serviço e caixinha de atendimento (${pData.commissionRate}%)</div>
                  </td>
                  <td class="text-right text-green">+ R$ ${sObj.comissaoCalculada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="text-right">-</td>
                </tr>
                ` : ''}

                <tr class="table-row">
                  <td>
                    <div class="font-bold">Auxílio Refeição e Transporte (VT/VR)</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Ajuda de custo de deslocamento e alimentação</div>
                  </td>
                  <td class="text-right text-green">+ R$ ${pData.benefits.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="text-right">-</td>
                </tr>

                ${pData.discounts > 0 ? `
                <tr class="table-row">
                  <td>
                    <div class="font-bold">Deduções Gerais / Vale</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Faltas não justificadas ou vale adiantado</div>
                  </td>
                  <td class="text-right">-</td>
                  <td class="text-right text-red">- R$ ${pData.discounts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                ` : ''}
              </tbody>
            </table>

            <div class="summary-box">
              <div class="summary-label">
                <p>Salário Líquido a Receber</p>
                <span>Chave de Destino: ${pData.bankInfo}</span>
              </div>
              <div class="summary-value">
                R$ ${sObj.salarioLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div class="signature">
              <div class="signature-line">
                Assinatura do Recebedor / Colaborador
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. SEÇÃO DE CARDS DE INDICADORES / METRICAS GERAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Folha Líquida Total</p>
            <h3 className="text-xl font-black text-slate-900 mt-1">
              R$ {totals.totalLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Transferência direta para equipe</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl">
            <PiggyBank size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Custo Real da Operação</p>
            <h3 className="text-xl font-black text-slate-900 mt-1">
              R$ {totals.totalCustoEmpresa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Inclui encargos + provisões (+ R$ {totals.totalEncargos.toFixed(0)})</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Percent size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Comprometimento de Vendas</p>
            <h3 className={`text-xl font-black mt-1 ${totals.laborCostRatio > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {totals.laborCostRatio.toFixed(1)}%
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Toast POS recomenda max 30%</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Faturamento base 30d</p>
            <h3 className="text-xl font-black text-slate-900 mt-1">
              R$ {totals.salesVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Reflete pedidos finalizados</p>
          </div>
        </div>

      </div>

      {/* Alerta de Labor Cost */}
      {totals.laborCostRatio > 30 && (
        <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4 flex gap-3 items-start">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div>
            <h5 className="font-bold text-amber-900 text-xs">Custo de Pessoal Elevado ({totals.laborCostRatio.toFixed(1)}%)</h5>
            <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
              O custo de folha de pagamento somado a encargos representa mais de 30% do seu faturamento bruto. 
              Para reequilibrar a operação, avalie ajustar as escalas de horistas/diaristas em dias de baixo movimento ou impulsione o ticket médio com promoções ativas no Cardápio Digital.
            </p>
          </div>
        </div>
      )}

      {/* 2. TABELA INTERATIVA DE SIMULAÇÃO DE FOLHA */}
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div>
            <h4 className="font-black text-sm text-slate-900 tracking-tight flex items-center gap-2 uppercase">
              <Calculator size={18} className="text-indigo-600" />
              Simulador Ativo de Pagamentos & Encargos
            </h4>
            <p className="text-[10px] text-slate-400 font-medium font-sans">Compare CLT, PJ, Horistas e Diaristas com cálculo de encargos patronais em tempo real</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
              {activeStaffList.length} Colaboradores
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4 w-[240px]">Colaborador / Nível</th>
                <th className="px-4 py-4 w-[160px] text-center">Regime de Contrato</th>
                <th className="px-4 py-4 w-[180px] text-center">Frequência / Horas</th>
                <th className="px-4 py-4 w-[130px] text-right">Proventos Base</th>
                <th className="px-4 py-4 w-[130px] text-right">Comissões (Caixa)</th>
                <th className="px-4 py-4 w-[130px] text-right">Descontos / Benefícios</th>
                <th className="px-4 py-4 w-[140px] text-right font-black text-slate-700">Salário Líquido</th>
                <th className="px-6 py-4 w-[160px] text-right">Ações de Folha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {analyzedStaff.map(({ user, pData, salarioBruto, comissaoCalculada, proventos, descontos, salarioLiquido, encargosEmpresa, custoTotalEmpresa }) => {
                const isEditing = editingUserId === user.id;

                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* Colaborador */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border text-slate-600 font-bold flex items-center justify-center shrink-0">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="truncate w-full">
                          <p className="font-bold text-slate-800 text-sm truncate">{user.name}</p>
                          {isEditing ? (
                            <div className="mt-1 w-full">
                              <span className="text-[8px] text-slate-400 font-bold uppercase block">Chave Pix / Conta</span>
                              <input 
                                type="text"
                                value={bankInfo}
                                onChange={(e) => setBankInfo(e.target.value)}
                                placeholder="E-mail, CPF, Telefone ou Pix"
                                className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{user.role}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Regime de Contrato */}
                    <td className="px-4 py-4 text-center">
                      {isEditing ? (
                        <select
                          value={contractType}
                          onChange={(e) => setContractType(e.target.value as any)}
                          className="w-full bg-white border rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500 font-bold text-xs"
                        >
                          <option value="CLT">CLT</option>
                          <option value="PJ">Prestador (PJ)</option>
                          <option value="Horista">Horista</option>
                          <option value="Diarista">Diarista / Extra</option>
                        </select>
                      ) : (
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          pData.type === 'CLT' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                          pData.type === 'PJ' ? 'bg-teal-50 text-teal-700 border-teal-100' :
                          pData.type === 'Horista' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-sky-50 text-sky-700 border-sky-100'
                        }`}>
                          {pData.type}
                        </span>
                      )}
                    </td>

                    {/* Frequência / Horas de simulação */}
                    <td className="px-4 py-4 text-center">
                      {pData.type === 'Horista' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <input 
                            type="number" 
                            min="0"
                            max="300"
                            value={pData.hoursWorked}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setHoursSimulated(prev => ({ ...prev, [user.id]: val }));
                            }}
                            className="w-12 text-center bg-slate-100 border-none font-extrabold focus:ring-1 focus:ring-indigo-500 rounded p-1 text-xs text-slate-800"
                          />
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase">Horas</span>
                        </div>
                      ) : pData.type === 'Diarista' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <input 
                            type="number" 
                            min="0"
                            max="31"
                            value={pData.daysWorked}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setDaysSimulated(prev => ({ ...prev, [user.id]: val }));
                            }}
                            className="w-10 text-center bg-slate-100 border-none font-extrabold focus:ring-1 focus:ring-indigo-500 rounded p-1 text-xs text-slate-800"
                          />
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase">Diárias</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Salário Mensal</span>
                      )}
                    </td>

                    {/* Proventos Base */}
                    <td className="px-4 py-4 text-right">
                      {isEditing ? (
                        <div className="flex flex-col gap-1 items-end">
                          {contractType === 'CLT' || contractType === 'PJ' ? (
                            <div className="flex items-center border rounded-lg p-1 w-24">
                              <span className="text-[10px] text-slate-400 pl-1">R$</span>
                              <input 
                                type="number" 
                                value={baseSalary} 
                                onChange={(e) => setBaseSalary(parseFloat(e.target.value) || 0)}
                                className="w-full text-right bg-transparent border-none text-xs focus:ring-0 p-0 pr-1 font-black"
                              />
                            </div>
                          ) : contractType === 'Horista' ? (
                            <div className="flex items-center border rounded-lg p-1 w-24">
                              <span className="text-[10px] text-slate-400 pl-1">R$/h</span>
                              <input 
                                type="number" 
                                value={hourlyRate} 
                                onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                                className="w-full text-right bg-transparent border-none text-xs focus:ring-0 p-0 pr-1 font-black"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center border rounded-lg p-1 w-24">
                              <span className="text-[10px] text-slate-400 pl-1">R$/d</span>
                              <input 
                                type="number" 
                                value={dailyRate} 
                                onChange={(e) => setDailyRate(parseFloat(e.target.value) || 0)}
                                className="w-full text-right bg-transparent border-none text-xs focus:ring-0 p-0 pr-1 font-black"
                              />
                            </div>
                          )}
                          <span className="text-[8px] text-slate-400 font-bold uppercase">Custo Base</span>
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-slate-800">
                            R$ {salarioBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {pData.type === 'Horista' && (
                            <p className="text-[9px] text-slate-400 font-medium">R$ {pData.hourlyRate.toFixed(2)}/h</p>
                          )}
                          {pData.type === 'Diarista' && (
                            <p className="text-[9px] text-slate-400 font-medium">R$ {pData.dailyRate.toFixed(2)}/diária</p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Comissões */}
                    <td className="px-4 py-4 text-right">
                      {isEditing ? (
                        <div className="flex flex-col gap-1 items-end">
                          <div className="flex items-center border rounded-lg p-1 w-20">
                            <input 
                              type="number" 
                              value={commissionRate} 
                              onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                              className="w-full text-right bg-transparent border-none text-xs focus:ring-0 p-0 pr-1 font-black"
                            />
                            <span className="text-[10px] text-slate-400 pr-1">%</span>
                          </div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase">Sob faturam.</span>
                        </div>
                      ) : (
                        <div>
                          <p className="font-black text-emerald-600">
                            + R$ {comissaoCalculada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {pData.commissionRate > 0 && (
                            <p className="text-[9px] text-slate-400 font-bold">{pData.commissionRate}% Comis.</p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Benefícios / Descontos */}
                    <td className="px-4 py-4 text-right">
                      {isEditing ? (
                        <div className="flex flex-col gap-1.5 items-end">
                          <div className="flex items-center border rounded-lg p-1 w-24">
                            <span className="text-[9px] text-emerald-500 font-bold pl-1">Benef. R$</span>
                            <input 
                              type="number" 
                              value={benefits} 
                              onChange={(e) => setBenefits(parseFloat(e.target.value) || 0)}
                              className="w-full text-right bg-transparent border-none text-xs focus:ring-0 p-0 pr-1 font-black"
                            />
                          </div>
                          <div className="flex items-center border rounded-lg p-1 w-24">
                            <span className="text-[9px] text-rose-500 font-bold pl-1">Desc. R$</span>
                            <input 
                              type="number" 
                              value={discounts} 
                              onChange={(e) => setDiscounts(parseFloat(e.target.value) || 0)}
                              className="w-full text-right bg-transparent border-none text-xs focus:ring-0 p-0 pr-1 font-black"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-emerald-600 font-semibold">+ R$ {pData.benefits.toFixed(2)} (VT/VR)</p>
                          {pData.discounts > 0 && (
                            <p className="text-rose-600 font-semibold">- R$ {pData.discounts.toFixed(2)}</p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Salário Líquido / Custo Total */}
                    <td className="px-4 py-4 text-right font-black">
                      <div>
                        <p className="text-slate-900 text-sm font-black">
                          R$ {salarioLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5" title="Custo corporativo incluindo encargos CLT (FGTS, INSS, Férias, 13º proporcional)">
                          Custo Real: R$ {custoTotalEmpresa.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => saveContractSettings(user.id)}
                            className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
                            title="Salvar Contrato"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="bg-slate-200 text-slate-600 p-2 rounded-xl hover:bg-slate-300 transition-all shadow-sm"
                            title="Cancelar"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end items-center gap-1.5">
                          <button
                            onClick={() => startEditingContract(user)}
                            className="bg-slate-50 text-slate-500 border p-2 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                            title="Editar Contrato"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => setSelectedPayslipUser(user)}
                            className="bg-slate-50 text-slate-500 border p-2 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100 transition-all"
                            title="Ver Holerite"
                          >
                            <FileText size={15} />
                          </button>
                          <button
                            onClick={() => handleProcessPayout({ user, pData, salarioBruto, comissaoCalculada, proventos, descontos, salarioLiquido, encargosEmpresa, custoTotalEmpresa })}
                            className={`p-2 rounded-xl font-bold border transition-all ${
                              showPayoutSuccess === user.id 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700'
                            }`}
                            title="Pagar Online / Pix"
                          >
                            {showPayoutSuccess === user.id ? <CheckCircle size={15} /> : <CreditCard size={15} />}
                          </button>
                        </div>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MODAIS: HOLERITE / RECIBO DE PAGAMENTO COMPLETO */}
      <AnimatePresence>
        {selectedPayslipUser && (() => {
          const pData = getUserPayrollData(selectedPayslipUser);
          const sObj = analyzedStaff.find(s => s.user.id === selectedPayslipUser.id);
          if (!sObj) return null;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden print:shadow-none"
              >
                
                {/* Header do Holerite */}
                <div className="p-6 bg-slate-50 border-b flex justify-between items-center print:bg-white print:border-b-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="text-indigo-600 print:text-black" size={24} />
                    <div>
                      <h4 className="font-black text-sm text-slate-900 uppercase tracking-tight">Recibo de Pagamento (Holerite)</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase print:text-black">Demonstrativo Mensal Simplificado</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 print:hidden">
                    <button
                      onClick={handlePrintPayslip}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-xl transition-all"
                      title="Imprimir"
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      onClick={() => setSelectedPayslipUser(null)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-xl transition-all"
                      title="Fechar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Corpo do Holerite */}
                <div className="p-8 space-y-6 print:p-4 print:space-y-4">
                  
                  {/* Informações da Empresa e Funcionário */}
                  <div className="grid grid-cols-2 gap-4 text-xs border border-slate-100 rounded-2xl p-4 print:border-2">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Empregador</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">KITCHENFLOW AI RESTAURANTE</p>
                      <p className="text-slate-500 font-medium text-[10px]">CNPJ: 42.109.843/0001-99</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Colaborador</p>
                      <p className="font-extrabold text-slate-800 mt-0.5">{selectedPayslipUser.name}</p>
                      <p className="text-slate-500 font-medium text-[10px] uppercase">{selectedPayslipUser.role} · Reg. {pData.type}</p>
                    </div>
                  </div>

                  {/* Demonstração Detalhada */}
                  <div className="border border-slate-100 rounded-2xl overflow-hidden print:border-2">
                    <div className="bg-slate-50 px-4 py-2 border-b text-[9px] font-black uppercase text-slate-400 tracking-wider flex justify-between">
                      <span>Descrição dos Itens</span>
                      <div className="flex gap-12">
                        <span>Proventos</span>
                        <span>Descontos</span>
                      </div>
                    </div>
                    
                    <div className="divide-y divide-slate-100 text-xs font-semibold p-1">
                      
                      {/* Custo Base */}
                      <div className="px-3 py-2.5 flex justify-between">
                        <div>
                          <p className="text-slate-800 font-bold">Vencimento Base</p>
                          <p className="text-[9px] text-slate-400">
                            {pData.type === 'Horista' ? `${pData.hoursWorked} Horas trabalhadas` : 
                             pData.type === 'Diarista' ? `${pData.daysWorked} Diárias efetuadas` : 'Salário base do contrato'}
                          </p>
                        </div>
                        <span className="text-slate-800">
                          R$ {sObj.salarioBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Comissões de Vendas */}
                      {sObj.comissaoCalculada > 0 && (
                        <div className="px-3 py-2.5 flex justify-between">
                          <div>
                            <p className="text-slate-800 font-bold">Comissões de Vendas (Restaurante)</p>
                            <p className="text-[9px] text-slate-400">Taxa de serviço e caixinha de atendimento ({pData.commissionRate}%)</p>
                          </div>
                          <span className="text-emerald-600">
                            + R$ {sObj.comissaoCalculada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      {/* Benefícios */}
                      <div className="px-3 py-2.5 flex justify-between">
                        <div>
                          <p className="text-slate-800 font-bold">Auxílio Refeição e Transporte (VT/VR)</p>
                          <p className="text-[9px] text-slate-400">Ajuda de custo mensal de deslocamento e alimentação</p>
                        </div>
                        <span className="text-emerald-600">
                          + R$ {pData.benefits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Descontos se houver */}
                      {pData.discounts > 0 && (
                        <div className="px-3 py-2.5 flex justify-between">
                          <div>
                            <p className="text-slate-800 font-bold">Deduções Gerais / Adiantamentos</p>
                            <p className="text-[9px] text-slate-400">Faltas não justificadas ou vale adiantado</p>
                          </div>
                          <span className="text-rose-600">
                            - R$ {pData.discounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Resumo de Liquidação */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex justify-between items-center print:bg-white print:border-2">
                    <div>
                      <p className="text-[9px] font-black text-indigo-500 uppercase tracking-wider print:text-black">Salário Líquido a Receber</p>
                      <p className="text-[10px] text-slate-500 font-medium">Chave de Destino: {pData.bankInfo}</p>
                    </div>
                    <div className="text-right">
                      <h3 className="text-lg font-black text-indigo-700 print:text-black">
                        R$ {sObj.salarioLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </h3>
                    </div>
                  </div>

                  {/* Campo de assinatura (Apenas visivel em impressao) */}
                  <div className="hidden print:block pt-12 text-center text-xs">
                    <div className="border-t border-dashed w-64 mx-auto pt-2 font-bold text-slate-600">
                      Assinatura do Recebedor / Colaborador
                    </div>
                  </div>

                </div>

              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
};
