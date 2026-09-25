import React, { useState } from 'react';
import { 
  X, 
  BellRing, 
  Save, 
  Sliders, 
  ShieldCheck, 
  Check 
} from 'lucide-react';
import { AuditAlertRule } from '../../types';

interface AuditAlertRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  discountThreshold: number;
  setDiscountThreshold: (val: number) => void;
  cancellationThreshold: number;
  setCancellationThreshold: (val: number) => void;
  reversalThreshold: number;
  setReversalThreshold: (val: number) => void;
  maxUserCancels: number;
  setMaxUserCancels: (val: number) => void;
}

export const AuditAlertRulesModal: React.FC<AuditAlertRulesModalProps> = ({
  isOpen,
  onClose,
  discountThreshold,
  setDiscountThreshold,
  cancellationThreshold,
  setCancellationThreshold,
  reversalThreshold,
  setReversalThreshold,
  maxUserCancels,
  setMaxUserCancels
}) => {
  const [tempDiscount, setTempDiscount] = useState(discountThreshold);
  const [tempCancellation, setTempCancellation] = useState(cancellationThreshold);
  const [tempReversal, setTempReversal] = useState(reversalThreshold);
  const [tempMaxUserCancels, setTempMaxUserCancels] = useState(maxUserCancels);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setDiscountThreshold(tempDiscount);
    setCancellationThreshold(tempCancellation);
    setReversalThreshold(tempReversal);
    setMaxUserCancels(tempMaxUserCancels);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-base font-black text-slate-900">
                Regras e Gatilhos de Alerta Automático
              </h3>
              <span className="text-xs text-slate-500">
                Ajuste os parâmetros que disparam alertas na Central de Auditoria
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Regra 1: Desconto Máximo */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="font-black text-slate-900">
                Teto de Desconto Comercial (%)
              </label>
              <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                {tempDiscount}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Pedidos com desconto superior a esta porcentagem geram alerta imediato.
            </p>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={tempDiscount}
              onChange={e => setTempDiscount(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          {/* Regra 2: Cancelamento de Valor Alto */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="font-black text-slate-900">
                Cancelamento de Alto Valor (R$)
              </label>
              <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                R$ {tempCancellation}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Pedidos cancelados acima deste montante são sinalizados como suspeitos.
            </p>
            <input
              type="range"
              min="50"
              max="1000"
              step="25"
              value={tempCancellation}
              onChange={e => setTempCancellation(Number(e.target.value))}
              className="w-full accent-rose-600"
            />
          </div>

          {/* Regra 3: Estorno Máximo */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="font-black text-slate-900">
                Alerta de Estorno / Reversão (R$)
              </label>
              <span className="font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                R$ {tempReversal}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Estornos superiores a este valor exigem atenção da gerência.
            </p>
            <input
              type="range"
              min="50"
              max="1500"
              step="50"
              value={tempReversal}
              onChange={e => setTempReversal(Number(e.target.value))}
              className="w-full accent-purple-600"
            />
          </div>

          {/* Regra 4: Cancelamentos por Usuário */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="font-black text-slate-900">
                Cancelamentos por Operador (Qtd.)
              </label>
              <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                {tempMaxUserCancels} cancelamentos
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Limite de cancelamentos pelo mesmo colaborador no período de auditoria.
            </p>
            <input
              type="range"
              min="2"
              max="20"
              step="1"
              value={tempMaxUserCancels}
              onChange={e => setTempMaxUserCancels(Number(e.target.value))}
              className="w-full accent-amber-600"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Salvo!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Parâmetros
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
