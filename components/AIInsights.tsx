
import React, { useEffect, useState } from 'react';
import { getManagerInsights } from '../services/gemini';
import { Brain, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';

const AIInsights: React.FC<{ sales: any; inventory: any }> = ({ sales, inventory }) => {
  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const res = await getManagerInsights(sales, inventory);
      setInsights(res || '');
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl p-2 text-white shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2 opacity-10">
        <Brain size={60} />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
            <Sparkles size={16} className="text-amber-300" />
          </div>
          <h2 className="text-base font-bold">Insights Inteligentes</h2>
        </div>

        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-white/20 rounded w-3/4"></div>
            <div className="h-3 bg-white/20 rounded w-1/2"></div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="prose prose-invert max-w-none">
              <p className="text-[11px] leading-relaxed text-indigo-50 font-medium italic whitespace-pre-wrap">
                "{insights}"
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              <div className="bg-white/10 backdrop-blur-sm p-1.5 rounded-lg flex items-center gap-3">
                <div className="p-1.5 bg-emerald-400/20 text-emerald-300 rounded-lg">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <p className="text-[9px] text-indigo-200 uppercase font-bold tracking-wider">Potencial de Lucro</p>
                  <p className="font-bold text-sm">+R$ 1.250 / sem</p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-1.5 rounded-lg flex items-center gap-3">
                <div className="p-1.5 bg-rose-400/20 text-rose-300 rounded-lg">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <p className="text-[9px] text-indigo-200 uppercase font-bold tracking-wider">Desperdício Estimado</p>
                  <p className="font-bold text-sm">3.2% do estoque</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsights;
