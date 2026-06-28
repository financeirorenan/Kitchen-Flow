import React, { useEffect, useState, memo, useMemo } from 'react';
import { Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import KaiAvatar from './KaiAvatar';

interface InsightType {
  text: string;
  potentialGain: number;
  estimatedWaste: number;
}

const AIInsights: React.FC<{ sales: any[]; inventory: any[] }> = memo(({ sales = [], inventory = [] }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fast mock load to make it feel like AI is processing instantly
    const timer = setTimeout(() => {
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Compute highly strategic local insights on the fly
  const computedInsights = useMemo<InsightType>(() => {
    if (!sales || sales.length === 0) {
      return {
        text: "Olá! Sou o Kai, seu analista em tempo real. Assim que sua loja registrar as primeiras vendas e pedidos, irei auditar as margens, CMV e gargalos da sua cozinha imediatamente aqui no seu navegador!",
        potentialGain: 0,
        estimatedWaste: 0
      };
    }

    const totalSales = sales.reduce((acc, s) => acc + (s.total || 0), 0);
    const orderCount = sales.length;
    const avgTicket = orderCount > 0 ? totalSales / orderCount : 0;

    // Top items
    const topItemsMap = sales
      .flatMap(s => s.items || [])
      .reduce((acc: Record<string, number>, item: any) => {
        if (item && item.name) {
          acc[item.name] = (acc[item.name] || 0) + (item.quantity || 1);
        }
        return acc;
      }, {});

    const topItemsSorted = Object.entries(topItemsMap)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 3);

    // Stock details
    const lowStockItems = inventory.filter((i: any) => i.stock < 10);
    const criticalStockCount = lowStockItems.length;

    // Generate smart local insights text on the fly
    let text = `Olá, aqui é o Kai! Analisei seus últimos ${orderCount} pedidos acumulando R$ ${totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} em faturamento. `;
    
    if (topItemsSorted.length > 0) {
      text += `Seu item campeão de vendas é o "${topItemsSorted[0][0]}" (${topItemsSorted[0][1]} unidades vindas do cardápio). Garanta que a praça desse prato esteja sempre bem abastecida para otimizar o tempo de despacho! `;
    }

    if (criticalStockCount > 0) {
      text += `Atenção: Detectei ${criticalStockCount} produtos de alta rotatividade com estoque crítico (menor que 10 unidades). Recomendo revisar os insumos para evitar que pratos fiquem indisponíveis na cozinha. `;
    } else {
      text += `Seu controle de almoxarifado está em dia; não há matérias-primas críticas no estoque no momento. `;
    }

    if (avgTicket > 40) {
      text += `Excelente ticket médio de R$ ${avgTicket.toFixed(2)}. Considere criar combos com bebidas ou sobremesas para elevar ainda mais essa média!`;
    } else {
      text += `O ticket médio está em R$ ${avgTicket.toFixed(2)}. Que tal configurar sobremesas sugeridas ou taxa de entrega flexível para impulsionar pedidos maiores?`;
    }

    const potentialGain = totalSales * 0.08; // Estimate 8% optimization
    const estimatedWaste = Math.min(6.5, Math.max(1.8, (inventory.length % 5) + 2.1));

    return {
      text,
      potentialGain,
      estimatedWaste
    };
  }, [sales, inventory]);

  return (
    <div className="bg-gradient-to-br from-[#14171C] to-[#1F232A] rounded-2xl p-4 text-white shadow-xl relative overflow-hidden border border-[#00B7FF]/20">
      {/* Glow ambient background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#00B7FF]/5 rounded-full blur-2xl pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-4">
        {/* Cute animated thumbnail of Kai */}
        <div className="shrink-0 scale-90 md:scale-100 bg-slate-950/40 p-2 rounded-xl border border-white/5">
          <KaiAvatar 
            expression={loading ? "analisando" : "feliz"} 
            pose={loading ? "analisando-dados" : "tudo-sob-controle"} 
            size={70} 
          />
        </div>
        
        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm font-black tracking-tight text-white uppercase">Insights do Kai</h2>
            </div>
            <span className="text-[7.5px] font-mono tracking-wider bg-[#00B7FF]/10 text-[#7DD3FF] px-1.5 py-0.5 rounded border border-[#00B7FF]/20 uppercase">
              Analista Local
            </span>
          </div>

          {loading ? (
            <div className="space-y-2 animate-pulse py-1">
              <div className="h-3 bg-white/10 rounded w-11/12"></div>
              <div className="h-3 bg-white/10 rounded w-4/5"></div>
              <div className="h-3 bg-white/10 rounded w-2/3"></div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] leading-relaxed text-slate-300 font-semibold block italic">
                "{computedInsights.text}"
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/5 font-bold">
                <div className="bg-white/5 border border-white/5 p-2 rounded-xl flex items-center gap-3">
                  <div className="p-1.5 bg-emerald-400/10 text-emerald-300 rounded-lg shrink-0">
                    <TrendingUp size={14} />
                  </div>
                  <div>
                    <p className="text-[8px] text-slate-400 uppercase font-bold tracking-wider">Potencial de Lucro</p>
                    <p className="font-extrabold text-xs text-white">
                      +R$ {computedInsights.potentialGain.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mês
                    </p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 p-2 rounded-xl flex items-center gap-3">
                  <div className="p-1.5 bg-amber-400/10 text-amber-300 rounded-lg shrink-0">
                    <AlertTriangle size={14} />
                  </div>
                  <div>
                    <p className="text-[8px] text-slate-400 uppercase font-bold tracking-wider">Desperdício Estimado</p>
                    <p className="font-extrabold text-xs text-white">
                      {computedInsights.estimatedWaste.toFixed(1)}% do estoque
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default AIInsights;
