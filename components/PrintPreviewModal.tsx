import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Printer, Copy, ExternalLink, X, Check, FileText, AlertTriangle, Download } from 'lucide-react';
import { Order, AdminSettings } from '../types';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  printJob: {
    order: Partial<Order>;
    settings: AdminSettings;
    html: string;
    rawText: string;
    isFiscal: boolean;
  } | null;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ isOpen, onClose, printJob }) => {
  const [copied, setCopied] = useState(false);
  const [isIframeSandbox, setIsIframeSandbox] = useState(false);

  useEffect(() => {
    // Detect if running inside an iframe (like the AI Studio Preview panel)
    try {
      setIsIframeSandbox(window.self !== window.top);
    } catch (e) {
      setIsIframeSandbox(true);
    }
  }, []);

  if (!printJob) return null;

  const { order, settings, html, rawText, isFiscal } = printJob;
  const orderIdShort = order.dailyNumber ? String(order.dailyNumber) : (order.id ? order.id.slice(-6).toUpperCase() : 'NOVO');

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar texto:', err);
    }
  };

  const handleOpenReceiptTab = () => {
    try {
      const newWin = window.open('', '_blank');
      if (newWin) {
        newWin.document.open();
        newWin.document.write(html);
        newWin.document.close();
      } else {
        alert('O bloqueador de popups do seu navegador impediu a abertura do recibo. Por favor, libere popups para o KitchenFlow AI neste navegador.');
      }
    } catch (err) {
      console.error('Falha ao abrir nova aba do recibo:', err);
    }
  };

  const handleNativePrint = () => {
    // Tenta imprimir chamando o print da janela temporária diretamente
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        // Adiciona um pequeno script para imprimir e fechar automaticamente
        const printHtmlWithScript = html.replace('</body>', `
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              }, 200);
            };
          </script>
        </body>`);
        doc.write(printHtmlWithScript);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error('Falha ao executar print direto no iframe:', e);
          }
        }, 500);
      }
    } catch (err) {
      console.error('Falha ao acionar impressão:', err);
    }
  };

  const handleDownloadTxt = () => {
    try {
      const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recibo_${orderIdShort}_${isFiscal ? 'fiscal' : 'normal'}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao baixar rascunho TXT:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="print-preview-overlay" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-full max-h-[90vh]"
          >
            {/* Left Box: Real Thermal Print Rendering (Like Paper) */}
            <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center border-b border-slate-800 md:border-b-0 md:border-r border-slate-800 h-[50vh] md:h-auto overflow-hidden">
              <div className="w-full flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-1.5">
                  <FileText size={12} /> Pré-Visualização Física (Bobina)
                </span>
                <span className="text-[10px] bg-slate-900 text-slate-400 px-2.5 py-1 rounded-full font-bold">
                  {settings.printing.paperWidth || '80mm'}
                </span>
              </div>
              
              {/* Paper Roll Wrapper */}
              <div className="w-full flex-1 bg-slate-100 rounded-2xl p-4 overflow-y-auto shadow-inner border border-stone-200 text-stone-900 relative">
                {/* Paper Strip Lines */}
                <div 
                  className="mx-auto w-full select-text selection:bg-indigo-200" 
                  style={{ 
                    fontFamily: "'Courier New', Courier, monospace", 
                    fontSize: settings.printing.paperWidth === '58mm' ? '11px' : '13px',
                    lineHeight: '1.25',
                    maxWidth: settings.printing.paperWidth === '58mm' ? '280px' : '380px'
                  }}
                >
                  {/* We render a beautifully visual mockup of the thermal tape */}
                  <pre className="whitespace-pre-wrap font-mono break-all text-xs font-black select-text">
                    {rawText}
                  </pre>
                </div>
              </div>
            </div>

            {/* Right Box: Action Hub and Diagnostics */}
            <div className="w-full md:w-[420px] bg-slate-900 p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                      <Printer size={18} className="text-indigo-400" />
                      Visualizador de Cupom
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Pedido: <span className="font-bold text-white">#{orderIdShort}</span> | Tipo: <span className="font-bold text-white uppercase">{order.type}</span></p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Sandbox / Iframe Alert Warnings */}
                {isIframeSandbox && (
                  <div className="mb-5 p-4 bg-amber-950/40 border border-amber-850/60 rounded-2xl flex gap-3 text-amber-200">
                    <AlertTriangle size={24} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold mb-1">Bloqueio de Ambiente Seguro Detectado (Sandbox)</p>
                      <p className="text-amber-300/90 leading-relaxed font-medium">
                        Você está visualizando a aplicação embutida no iframe do AI Studio. Por questões de segurança, navegadores tendem a bloquear comandos físicos de impressão (`print()`) e popups neste modo.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="inline-block px-2 py-0.5 bg-amber-500 text-stone-950 text-[9px] font-black uppercase rounded">Solução</span>
                        <span className="font-bold text-amber-100">
                          Clique em "Abrir em Nova Aba" no canto superior direito do painel para testar a impressão nativa direta.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Diagnostics */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 mb-5 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Metadados e Diagnóstico da Conexão</span>
                  <div className="grid grid-cols-2 gap-y-2 text-slate-400 font-medium">
                    <div>Modo Selecionado:</div>
                    <div className="text-right text-white font-bold capitalize">{settings.printing.connectionMode || 'browser'}</div>
                    
                    <div>Modelo Cupom:</div>
                    <div className="text-right text-white font-bold">{isFiscal ? 'NFC-e Fiscal' : 'Gerencial de Produção'}</div>
                    
                    <div>Largura do Papel:</div>
                    <div className="text-right text-white font-bold">{settings.printing.paperWidth || '80mm'}</div>
                    
                    <div>Itens do Pedido:</div>
                    <div className="text-right text-white font-bold">
                      {order.items?.reduce((acc, i) => acc + i.quantity, 0) || 0} u.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Column */}
              <div className="space-y-3 mt-6">
                <button
                  onClick={handleNativePrint}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-950/50"
                >
                  <Printer size={16} /> Disparar Impressão Direta
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleCopyText}
                    className="py-3 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-800"
                  >
                    {copied ? (
                      <>
                        <Check size={14} className="text-emerald-400" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copiar Texto
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleOpenReceiptTab}
                    className="py-3 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-800"
                  >
                    <ExternalLink size={14} /> Nova Janela
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleDownloadTxt}
                    className="py-3 text-slate-400 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all hover:bg-slate-950 rounded-xl"
                  >
                    <Download size={14} /> Baixar .txt
                  </button>

                  <button
                    onClick={onClose}
                    className="py-3 text-slate-400 hover:text-white font-black text-xs uppercase tracking-wider flex items-center justify-center transition-all bg-slate-950 hover:bg-slate-800 rounded-xl border border-slate-850"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
