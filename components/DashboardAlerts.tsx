
import React, { memo } from 'react';
import { Product, RawMaterial } from '../types';
import { AlertTriangle, ArrowRight, PackageSearch, RefreshCw } from 'lucide-react';

interface DashboardAlertsProps {
  products: Product[];
  rawMaterials: RawMaterial[];
  onNavigateToInventory: () => void;
}

const DashboardAlerts: React.FC<DashboardAlertsProps> = memo(({ products, rawMaterials, onNavigateToInventory }) => {
  const criticalRawMaterials = rawMaterials.filter(rm => rm.currentStock <= rm.minStock);

  if (criticalRawMaterials.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden animate-in slide-in-from-top-4 duration-500">
      <div className="p-1.5 border-b border-amber-50 bg-amber-50/30 flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <div className="p-1 bg-amber-500 text-white rounded-lg shadow-lg shadow-amber-200">
            <AlertTriangle size={16} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-xs">Alertas de Reposição</h3>
            <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest">Insumos com Estoque Crítico</p>
          </div>
        </div>
        <button 
          onClick={onNavigateToInventory}
          className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group transition-all"
        >
          Gerenciar Tudo <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
      
      <div className="p-1 max-h-[150px] overflow-y-auto custom-scrollbar">
        <div className="space-y-1">
          {criticalRawMaterials.map(rm => (
            <div 
              key={rm.id} 
              className="flex items-center justify-between p-1.5 rounded-lg bg-indigo-50/30 border border-indigo-100 group hover:border-amber-200 hover:bg-amber-50/30 transition-all"
            >
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-lg border bg-white flex items-center justify-center shadow-sm text-indigo-600">
                  <PackageSearch size={16} />
                </div>
                <div>
                  <p className="font-black text-slate-800 text-[10px]">{rm.name}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Insumo / {rm.category}</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <span className="text-sm font-black text-rose-600">{rm.currentStock}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">{rm.unit}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[8px] font-black text-amber-600 bg-amber-100 px-1.5 py-0 rounded-full uppercase tracking-tighter">
                  <RefreshCw size={8} className="animate-spin-slow" /> Repor
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-1 bg-slate-50/50 border-t border-slate-100">
        <div className="flex items-center justify-center gap-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
          <PackageSearch size={12} /> Total de {criticalRawMaterials.length} insumos em falta
        </div>
      </div>
    </div>
  );
});

export default DashboardAlerts;
