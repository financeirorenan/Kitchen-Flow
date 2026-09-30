
import React, { memo } from 'react';
import { Product, RawMaterial } from '../types';
import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

interface DashboardAlertsProps {
  products: Product[];
  rawMaterials: RawMaterial[];
  onNavigateToInventory: () => void;
  maxItems?: number;
}

const DashboardAlerts: React.FC<DashboardAlertsProps> = memo(({ products, rawMaterials, onNavigateToInventory, maxItems = 4 }) => {
  // Identify critical raw materials or fallback products
  const criticalRawMaterials = (rawMaterials && rawMaterials.length > 0)
    ? rawMaterials.filter(rm => rm.currentStock <= rm.minStock)
    : (products || []).filter(p => {
        const itemRecord = p as unknown as Record<string, unknown>;
        const stock = typeof itemRecord.stockQuantity === 'number' ? itemRecord.stockQuantity : (typeof p.stock === 'number' ? p.stock : 0);
        const min = typeof itemRecord.minStock === 'number' ? itemRecord.minStock : 2;
        return stock <= min;
      }).map(p => {
        const itemRecord = p as unknown as Record<string, unknown>;
        const stock = typeof itemRecord.stockQuantity === 'number' ? itemRecord.stockQuantity : (typeof p.stock === 'number' ? p.stock : 0);
        const min = typeof itemRecord.minStock === 'number' ? itemRecord.minStock : 2;
        return {
          id: p.id,
          name: p.name,
          currentStock: stock,
          minStock: min,
          unit: p.unit || 'UN',
          category: p.category || 'Geral'
        };
      });

  if (criticalRawMaterials.length === 0) return null;

  const displayItems = criticalRawMaterials.slice(0, maxItems);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
            <AlertTriangle size={16} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">Insumos Críticos</h3>
            <p className="text-[11px] font-medium text-slate-500">Abaixo do estoque mínimo de segurança</p>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/60">
          {criticalRawMaterials.length} em alerta
        </span>
      </div>
      
      <div className="divide-y divide-slate-100">
        {displayItems.map(item => {
          const isZero = item.currentStock <= 0;
          return (
            <div 
              key={item.id} 
              className="p-3 px-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isZero ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                <div>
                  <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                    Insumo / {item.category || 'Geral'}
                  </p>
                </div>
              </div>
              
              <div className="text-right flex items-center gap-3">
                <div>
                  <span className="font-mono font-black text-xs text-slate-900 tabular-nums">
                    {item.currentStock.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                    {item.unit || 'UN'}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1 shrink-0">
                  <RefreshCw size={9} /> Repor
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="p-3 px-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">
          <strong className="text-slate-900">{criticalRawMaterials.length} insumos</strong> precisam de atenção
        </span>
        <button 
          onClick={onNavigateToInventory}
          className="text-xs font-black text-orange-600 hover:text-orange-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer group"
        >
          <span>VER TODOS OS ALERTAS</span>
          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
});

export default DashboardAlerts;

