import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
  isFirestoreError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isFirestoreError: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    const msg = error?.message || String(error);
    const isFsError = (
      msg.includes('FIRESTORE') || 
      msg.includes('INTERNAL ASSERTION FAILED') || 
      msg.includes('Unexpected state') || 
      msg.includes('ca9') ||
      msg.includes('b815') ||
      msg.includes('Quota') || 
      msg.includes('quota') || 
      msg.includes('resource-exhausted')
    );
    return { hasError: true, error, errorInfo: null, isFirestoreError: isFsError };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const msg = error?.message || String(error);
    const isFsError = (
      msg.includes('FIRESTORE') || 
      msg.includes('INTERNAL ASSERTION FAILED') || 
      msg.includes('Unexpected state') || 
      msg.includes('ca9') ||
      msg.includes('b815') ||
      msg.includes('Quota') || 
      msg.includes('quota') || 
      msg.includes('resource-exhausted')
    );

    if (isFsError) {
      console.warn('[ErrorBoundary] Capturado erro de rede/Firestore:', msg);
    } else {
      console.error('Uncaught error:', error, errorInfo);
    }
    
    let errorDetails = '';
    try {
      const parsed = JSON.parse(error.message);
      errorDetails = JSON.stringify(parsed, null, 2);
    } catch {
      errorDetails = error.stack || error.message;
    }
    
    this.setState({ errorInfo: errorDetails, isFirestoreError: isFsError });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, isFirestoreError: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.state.isFirestoreError) {
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
                <RefreshCw size={32} className="animate-spin" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Sincronizando com KitchenFlow</h1>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Detectamos uma instabilidade temporária na conexão em tempo real com o banco de dados. Os dados em cache continuam seguros.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md"
                >
                  <RefreshCw size={18} />
                  Continuar
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  Recarregar
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100 p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={40} className="text-rose-500" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Ops! Algo deu errado</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Ocorreu um erro inesperado no sistema. Nossa equipe técnica já foi notificada.
              </p>
            </div>

            {this.state.errorInfo && (
              <div className="bg-slate-900 rounded-2xl p-4 text-left overflow-hidden">
                <p className="text-[10px] font-mono text-indigo-400 mb-2 uppercase tracking-widest font-bold">Detalhes do Erro</p>
                <div className="max-h-32 overflow-y-auto custom-scrollbar">
                  <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap leading-tight">
                    {this.state.errorInfo}
                  </pre>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
              >
                <RefreshCw size={18} />
                Recarregar
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                <Home size={18} />
                Início
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400 font-medium italic">
              Se o problema persistir, entre em contato com o suporte técnico.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
