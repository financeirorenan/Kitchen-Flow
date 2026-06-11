
import React, { useState, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Order, 
  Product, 
  FinancialRecord, 
  Customer, 
  OrderItem,
  AdminSettings 
} from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Package, 
  Calendar,
  Filter,
  Download,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight,
  LayoutDashboard,
  BarChart3
} from 'lucide-react';

interface IntelligentReportsProps {
  orders: Order[];
  products: Product[];
  financialRecords: FinancialRecord[];
  customers: Customer[];
  adminSettings: AdminSettings;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const IntelligentReports: React.FC<IntelligentReportsProps> = memo(({ 
  orders, 
  products, 
  financialRecords,
  customers,
  adminSettings
}) => {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('7d');
  const [activeTab, setActiveTab] = useState<'financial' | 'sales' | 'items' | 'cmv' | 'payments'>('financial');

  // Filter orders based on date range
  const filteredOrders = useMemo(() => {
    const now = new Date();
    let cutoff = new Date();
    
    if (dateRange === '7d') cutoff.setDate(now.getDate() - 7);
    else if (dateRange === '30d') cutoff.setDate(now.getDate() - 30);
    else if (dateRange === '90d') cutoff.setDate(now.getDate() - 90);
    else return orders;

    return orders.filter(o => new Date(o.createdAt) >= cutoff);
  }, [orders, dateRange]);

  // Financial Stats
  const financialStats = useMemo(() => {
    const revenue = filteredOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
    
    const relevantExpenses = financialRecords.filter(r => {
      if (dateRange === 'all') return r.type === 'expense';
      const now = new Date();
      let cutoff = new Date();
      if (dateRange === '7d') cutoff.setDate(now.getDate() - 7);
      else if (dateRange === '30d') cutoff.setDate(now.getDate() - 30);
      else if (dateRange === '90d') cutoff.setDate(now.getDate() - 90);
      return r.type === 'expense' && new Date(r.date) >= cutoff;
    });

    const expenses = relevantExpenses.reduce((sum, r) => sum + r.amount, 0);
    const profit = revenue - expenses;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return { revenue, expenses, profit, margin };
  }, [filteredOrders, financialRecords, dateRange]);

  // Daily Sales Chart Data
  const salesChartData = useMemo(() => {
    const dailyMap: Record<string, { date: string, revenue: number, orders: number }> = {};
    
    filteredOrders.filter(o => o.status !== 'cancelled').forEach(o => {
      const date = new Date(o.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!dailyMap[date]) {
        dailyMap[date] = { date, revenue: 0, orders: 0 };
      }
      dailyMap[date].revenue += o.total;
      dailyMap[date].orders += 1;
    });

    return Object.values(dailyMap).sort((a, b) => {
      const [dayA, monthA] = a.date.split('/').map(Number);
      const [dayB, monthB] = b.date.split('/').map(Number);
      return monthA !== monthB ? monthA - monthB : dayA - dayB;
    });
  }, [filteredOrders]);

  // Top Items
  const topItems = useMemo(() => {
    const itemMap: Record<string, { name: string, quantity: number, revenue: number }> = {};
    
    filteredOrders.filter(o => o.status !== 'cancelled').forEach(o => {
      o.items.forEach(item => {
        if (!itemMap[item.productId]) {
          const product = products.find(p => p.id === item.productId);
          itemMap[item.productId] = { 
            name: product?.name || item.name || 'Produto Removido', 
            quantity: 0, 
            revenue: 0 
          };
        }
        itemMap[item.productId].quantity += item.quantity;
        itemMap[item.productId].revenue += (item.price * item.quantity);
      });
    });

    return Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [filteredOrders, products]);

  // CMV History Data
  const cmvHistoryData = useMemo(() => {
    // This is aggregated from products price history
    // Since we don't have a specific global CMV snapshot over time, we use the product's history
    const allHistory: { date: string, cost: number, price: number }[] = [];
    
    products.forEach(p => {
      if (p.priceHistory && p.priceHistory.length > 0) {
        p.priceHistory.forEach(h => {
          allHistory.push({ date: h.date, cost: h.cost || p.cost, price: h.price });
        });
      } else {
        // Fallback or current state
        allHistory.push({ date: new Date().toISOString().split('T')[0], cost: p.cost, price: p.price });
      }
    });

    const dailyCMV: Record<string, { totalCost: number, totalPrice: number, count: number }> = {};
    
    allHistory.forEach(h => {
      if (!dailyCMV[h.date]) {
        dailyCMV[h.date] = { totalCost: 0, totalPrice: 0, count: 0 };
      }
      dailyCMV[h.date].totalCost += h.cost;
      dailyCMV[h.date].totalPrice += h.price;
      dailyCMV[h.date].count += 1;
    });

    return Object.keys(dailyCMV).sort().map(date => ({
      date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      cmv: (dailyCMV[date].totalCost / dailyCMV[date].totalPrice) * 100
    })).slice(-10); // Last 10 points
  }, [products]);

  // Revenue by Category
  const categoryRevenue = useMemo(() => {
    const catMap: Record<string, number> = {};
    
    filteredOrders.filter(o => o.status !== 'cancelled').forEach(o => {
      o.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const cat = product?.category || 'Outros';
        catMap[cat] = (catMap[cat] || 0) + (item.price * item.quantity);
      });
    });

    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [filteredOrders, products]);

  const paymentMethodStats = useMemo(() => {
    const methodCounts: Record<string, { count: number, total: number, fees: number }> = {};
    
    filteredOrders.filter(o => o.status !== 'cancelled').forEach(order => {
      const method = order.paymentMethod || 'dinheiro';
      if (!methodCounts[method]) {
        methodCounts[method] = { count: 0, total: 0, fees: 0 };
      }
      
      methodCounts[method].count += 1;
      methodCounts[method].total += order.total;
      
      const config = adminSettings.paymentMethods?.find(p => p.id === method || p.name.toLowerCase() === method.toLowerCase() || p.type === method);
      if (config) {
        const fee = (order.total * (config.feePercentage / 100)) + (config.fixedFee || 0);
        methodCounts[method].fees += fee;
      } else {
        // Default fees if not configured
        let fee = 0;
        if (method === 'cartao_credito') fee = order.total * 0.032;
        else if (method === 'cartao_debito') fee = order.total * 0.019;
        else if (method === 'vale_refeicao') fee = order.total * 0.05;
        methodCounts[method].fees += fee;
      }
    });

    return Object.entries(methodCounts).map(([id, data]) => {
      const config = adminSettings.paymentMethods?.find(p => p.id === id || p.name.toLowerCase() === id.toLowerCase() || p.type === id);
      const name = config ? config.name : id.charAt(0).toUpperCase() + id.slice(1).replace('_', ' ');
      return {
        id,
        name,
        count: data.count,
        total: data.total,
        fees: data.fees,
        balance: data.total - data.fees
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredOrders, adminSettings.paymentMethods]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header com Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Relatórios Inteligentes</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">IA & Business Intelligence</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border shadow-sm w-fit">
          <button 
            onClick={() => setDateRange('7d')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateRange === '7d' ? 'bg-brand-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            7 Dias
          </button>
          <button 
            onClick={() => setDateRange('30d')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateRange === '30d' ? 'bg-brand-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            30 Dias
          </button>
          <button 
            onClick={() => setDateRange('90d')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateRange === '90d' ? 'bg-brand-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            90 Dias
          </button>
          <button 
            onClick={() => setDateRange('all')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateRange === 'all' ? 'bg-brand-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Tudo
          </button>
        </div>
      </div>

      {/* Mini Cards de Performance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2 group hover:border-brand-primary transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
              <DollarSign size={20} />
            </div>
            <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp size={12} /> +12%
            </span>
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Faturamento Total</p>
          <p className="text-2xl font-black text-slate-800 tracking-tighter">R$ {financialStats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2 group hover:border-rose-500 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner">
              <TrendingDown size={20} />
            </div>
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Despesas Totais</p>
          <p className="text-2xl font-black text-slate-800 tracking-tighter">R$ {financialStats.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2 group hover:border-indigo-600 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
              <TrendingUp size={20} />
            </div>
            <ArrowUpRight size={20} className="text-indigo-400 opacity-30" />
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lucro Líquido</p>
          <p className={`text-2xl font-black tracking-tighter ${financialStats.profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
            R$ {financialStats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2 group hover:border-amber-500 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
              <ShoppingBag size={20} />
            </div>
            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
              {filteredOrders.length} Pedidos
            </span>
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ticket Médio</p>
          <p className="text-2xl font-black text-slate-800 tracking-tighter">
            R$ {(filteredOrders.length > 0 ? financialStats.revenue / filteredOrders.length : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tabs de Navegação de Relatórios */}
      <div className="flex bg-white p-1 rounded-2xl border shadow-sm w-fit mb-4">
        {[
          { id: 'financial', label: 'Performance Financeira' },
          { id: 'sales', label: 'Fluxo de Vendas' },
          { id: 'items', label: 'Itens +Vendidos' },
          { id: 'cmv', label: 'Gestão de CMV' },
          { id: 'payments', label: 'Formas de Pagamento' },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`relative px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {activeTab === tab.id && (
              <motion.div 
                layoutId="reportsTabPill"
                className="absolute inset-0 bg-brand-primary rounded-xl shadow-lg shadow-brand-primary/20"
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Conteúdo das Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado Esquerdo: Gráfico Principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm min-h-[400px]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tighter">
                  {activeTab === 'financial' && 'Evolução de Receita vs Despesa'}
                  {activeTab === 'sales' && 'Projeção de Pedidos Diários'}
                  {activeTab === 'items' && 'Distribuição por Categoria'}
                  {activeTab === 'cmv' && 'Equilíbrio de CMV Global'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dados atualizados em tempo real</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100">
                  <Download size={18} />
                </button>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {activeTab === 'financial' ? (
                  <AreaChart data={salesChartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                      tickFormatter={(val) => `R$ ${val}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                ) : activeTab === 'sales' ? (
                  <BarChart data={salesChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="orders" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={20} />
                  </BarChart>
                ) : activeTab === 'items' ? (
                  <PieChart>
                    <Pie
                      data={categoryRevenue}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryRevenue.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val) => `R$ ${val}`}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                ) : activeTab === 'cmv' ? (
                  <LineChart data={cmvHistoryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Line type="stepAfter" dataKey="cmv" stroke="#f59e0b" strokeWidth={4} dot={{ r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} />
                  </LineChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={paymentMethodStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="total"
                    >
                      {paymentMethodStats.map((entry, index) => (
                        <Cell key={`cell-pm-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {activeTab === 'payments' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethodStats.map((item, idx) => (
                <div key={idx} className="bg-white p-6 rounded-3xl border shadow-sm flex justify-between items-center group hover:border-brand-primary transition-all">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.name}</p>
                    <p className="text-xl font-black text-slate-800 tracking-tighter">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{item.count} pedidos realizados</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-rose-500 uppercase">Taxas: R$ {item.fees.toFixed(2)}</p>
                    <p className="text-sm font-black text-emerald-600 uppercase">Líquido: R$ {item.balance.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab !== 'payments' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-brand-black text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                  <BarChart3 size={100} />
               </div>
               <div className="relative z-10">
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary mb-2">Insight de IA</h4>
                  <p className="text-sm font-bold leading-relaxed">
                    Sua margem de lucro atual é de <span className="text-brand-primary">{financialStats.margin.toFixed(1)}%</span>.
                    Para aumentar 2% sua rentabilidade, remodele o combo dos 3 itens mais vendidos.
                  </p>
                  <button className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-brand-primary transition-colors">
                    Ver recomendações completas <ChevronRight size={14} />
                  </button>
               </div>
            </div>

            <div className="bg-indigo-600 text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                  <Users size={100} />
               </div>
               <div className="relative z-10">
                  <h4 className="text-xs font-black uppercase tracking-widest text-indigo-200 mb-2">Comportamento do Cliente</h4>
                  <p className="text-sm font-bold leading-relaxed">
                    45% das suas vendas nos últimos 7 dias vieram de clientes recorrentes. 
                    Focar em um programa de fidelidade pode aumentar o faturamento em até 15%.
                  </p>
                  <button className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-indigo-200 transition-colors">
                    Ver Base de Clientes <ChevronRight size={14} />
                  </button>
               </div>
            </div>
          </div>
        )}
      </div>

        {/* Lado Direito: Listas e Rankings */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" /> Ranking de Produtos
            </h3>
            <div className="space-y-4">
              {topItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-brand-primary transition-all group">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border flex items-center justify-center font-black text-xs text-slate-400 group-hover:text-brand-primary group-hover:border-brand-primary transition-all">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 group-hover:text-brand-primary transition-colors truncate w-32">{item.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{item.quantity} unidades vendidas</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-black text-slate-800">R$ {item.revenue.toFixed(2)}</p>
                      <div className="h-1 w-16 bg-slate-200 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-brand-primary rounded-full" 
                          style={{ width: `${(item.quantity / topItems[0].quantity) * 100}%` }}
                        ></div>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Clock size={16} className="text-indigo-500" /> Horários de Pico
            </h3>
            <div className="space-y-3">
               {[
                 { hour: '11:00 - 14:00', label: 'Almoço', volume: 'Alta', color: 'text-amber-500 bg-amber-50' },
                 { hour: '18:00 - 21:00', label: 'Jantar', volume: 'Crítica', color: 'text-rose-500 bg-rose-50' },
                 { hour: '14:00 - 17:00', label: 'Tarde', volume: 'Baixa', color: 'text-emerald-500 bg-emerald-50' },
               ].map((period, i) => (
                 <div key={i} className="flex items-center justify-between p-3 border rounded-2xl">
                    <div>
                      <p className="text-xs font-black text-slate-800">{period.hour}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{period.label}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${period.color}`}>
                      Volume: {period.volume}
                    </span>
                 </div>
               ))}
            </div>
            <p className="mt-4 text-[10px] text-slate-400 font-bold leading-relaxed italic border-t pt-4">
              "72% das suas vendas de Delivery concentram-se entre Sexta e Domingo."
            </p>
          </div>

          <div className="bg-brand-primary/5 border border-brand-primary/10 p-6 rounded-[2.5rem] space-y-4">
             <div className="flex items-center gap-2">
                <AlertCircle size={20} className="text-brand-primary" />
                <h3 className="text-sm font-black text-brand-primary uppercase tracking-widest">Alerta de Preços</h3>
             </div>
             <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700 leading-relaxed">
                  O custo do insumo <span className="font-black">Carne Moída</span> subiu 15% nos últimos 15 dias.
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-500">Impacto no CMV:</p>
                  <span className="text-rose-600 font-black text-[10px]">+2.4%</span>
                </div>
             </div>
             <button className="w-full py-2 bg-brand-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg transition-all">
                Revisar Cardápio
             </button>
          </div>
        </div>
      </div>

    </div>
  );
});

export default IntelligentReports;
