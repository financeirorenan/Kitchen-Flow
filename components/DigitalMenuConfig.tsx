
import React, { useState, useMemo } from 'react';
import { DigitalMenuSettings, Product, Table, Order } from '../types';
import { 
  Smartphone, Palette, QrCode, 
  Save, Eye, Check, 
  Plus, Globe, 
  ShoppingCart, Copy, Share2, X, MousePointer2,
  Minus, MapPin, User, Wallet,
  CheckCircle2, ArrowLeft, MessageCircle,
  Bike, Home, UserCircle, Phone, Store,
  Image as ImageIcon, Sparkles, ArrowUp, ArrowDown, Zap, Tag, Star,
  Search, Filter
} from 'lucide-react';

interface DigitalMenuConfigProps {
  settings: DigitalMenuSettings;
  onUpdateSettings: (settings: DigitalMenuSettings) => void;
  products: Product[];
  tables: Table[];
  onUpdateProduct: (product: Product) => void;
  onPlaceDigitalOrder: (order: Order) => void;
}

interface SimCartItem {
  product: Product;
  quantity: number;
}

const DigitalMenuConfig: React.FC<DigitalMenuConfigProps> = ({ 
  settings, 
  onUpdateSettings, 
  products, 
  tables, 
  onUpdateProduct,
  onPlaceDigitalOrder 
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'management' | 'qrcode'>('visual');
  const [showTestMode, setShowTestMode] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  
  // States para a Simulação Interativa
  const [orderType, setOrderType] = useState<'table' | 'delivery' | 'takeout'>('table');
  const [testStep, setTestStep] = useState<'welcome' | 'menu' | 'cart' | 'checkout' | 'success'>('welcome');
  const [simCart, setSimCart] = useState<SimCartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [changeFor, setChangeFor] = useState('');
  const [activeSimCategory, setActiveSimCategory] = useState<string | null>(null);

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))), [products]);
  
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [products]);

  const menuUrl = `https://gastroai.me/cardapio/${settings.restaurantName.toLowerCase().replace(/\s+/g, '-')}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(menuUrl);
    setIsLinkCopied(true);
    setTimeout(() => setIsLinkCopied(false), 2000);
  };

  const handleUpdateCatImage = (category: string, url: string) => {
    const currentMap = settings.categoryImages || {};
    onUpdateSettings({
      ...settings,
      categoryImages: { ...currentMap, [category]: url }
    });
  };

  const togglePromo = (product: Product) => {
    onUpdateProduct({ ...product, isPromotional: !product.isPromotional });
  };

  const moveOrder = (product: Product, direction: 'up' | 'down') => {
    const currentOrder = product.displayOrder || 0;
    const newOrder = direction === 'up' ? Math.max(0, currentOrder - 1) : currentOrder + 1;
    onUpdateProduct({ ...product, displayOrder: newOrder });
  };

  const addToSimCart = (product: Product) => {
    setSimCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromSimCart = (productId: string) => {
    setSimCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
    ).filter(item => item.quantity > 0));
  };

  const simCartTotal = useMemo(() => {
    return simCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  }, [simCart]);

  const resetSimulation = () => {
    setShowTestMode(false);
    setTestStep('welcome');
    setSimCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setTableNumber('');
    setPaymentMethod('');
    setChangeFor('');
    setActiveSimCategory(null);
  };

  const handleFinishSimulation = () => {
    const finalOrder: Order = {
      id: `DIG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      createdAt: new Date(),
      items: simCart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      })),
      total: simCartTotal + (orderType === 'delivery' ? 7 : 0),
      status: 'pending',
      type: orderType,
      tableNumber: orderType === 'table' ? parseInt(tableNumber) : undefined,
      customerName: customerName,
      customerPhone: customerPhone,
      customerAddress: orderType === 'delivery' ? customerAddress : undefined,
      paymentMethod: paymentMethod === 'Dinheiro' ? 'dinheiro' : paymentMethod === 'PIX' ? 'pix' : 'cartao_credito',
      changeFor: paymentMethod === 'Dinheiro' ? parseFloat(changeFor) || undefined : undefined
    };

    onPlaceDigitalOrder(finalOrder);
    setTestStep('success');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-10rem)] animate-in fade-in duration-500">
      {/* Coluna Esquerda: Configurações */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 rounded-3xl text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Share2 size={80} /></div>
          <div className="relative z-10 flex flex-col gap-1">
            <h3 className="text-lg font-black tracking-tight">Merchandising do Cardápio</h3>
            <p className="text-indigo-100 text-[11px] font-medium">Personalize visualmente seu ponto de venda online.</p>
            <div className="mt-2 flex items-center gap-2 bg-black/20 p-1.5 rounded-xl backdrop-blur-md border border-white/10">
               <Globe size={12} className="text-indigo-300 ml-1" />
               <span className="text-[10px] font-mono font-bold truncate max-w-[180px]">{menuUrl}</span>
            </div>
          </div>
          <div className="relative z-10 flex gap-2">
             <button onClick={handleCopyLink} className={`flex items-center gap-2 px-4 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${isLinkCopied ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg'}`}>
                {isLinkCopied ? <Check size={14} /> : <Copy size={14} />}
                {isLinkCopied ? 'Link Copiado' : 'Copiar Link'}
             </button>
             <button onClick={() => setShowTestMode(true)} className="flex items-center gap-2 px-4 py-3 bg-indigo-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-400 border border-indigo-400 shadow-lg transition-all">
                <MousePointer2 size={14} /> Ver Simulador
             </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border shadow-sm space-y-5">
           <div className="flex bg-slate-50 p-1 rounded-xl w-fit border">
            <button onClick={() => setActiveTab('visual')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${activeTab === 'visual' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white'}`}>
              <Palette size={14} /> Estilo Visual
            </button>
          </div>

          {activeTab === 'visual' && (
            <div className="space-y-5 animate-in slide-in-from-left-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cor de Identidade</label>
                  <div className="flex items-center gap-3">
                    <input type="color" className="w-12 h-12 rounded-xl cursor-pointer border-2 border-slate-100" value={settings.primaryColor} onChange={(e) => onUpdateSettings({ ...settings, primaryColor: e.target.value })} />
                    <span className="text-xs font-mono text-slate-500 font-bold">{settings.primaryColor}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Banner Principal</label>
                  <input type="text" placeholder="URL da imagem..." className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none font-medium text-[11px]" value={settings.bannerUrl} onChange={(e) => onUpdateSettings({ ...settings, bannerUrl: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome de Exibição</label>
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none font-bold text-xs" value={settings.restaurantName} onChange={(e) => onUpdateSettings({ ...settings, restaurantName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mensagem de Boas-vindas</label>
                <textarea className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none font-medium text-xs resize-none" rows={2} value={settings.welcomeMessage} onChange={(e) => onUpdateSettings({ ...settings, welcomeMessage: e.target.value })} />
              </div>
            </div>
          )}

        </div>
      </div>


      {/* Preview Mobile Simulator */}
      <div className="w-full lg:w-[320px] flex flex-col gap-3">
        <h3 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 ml-4">
          <Eye size={14} /> Canal do Cliente
        </h3>
        <div className="flex-1 bg-slate-900 rounded-[2.5rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden relative group">
           {/* Visual estático se não estiver em modo teste */}
           {!showTestMode ? (
              <div className="h-full bg-white flex flex-col overflow-hidden">
                 <div className="h-24 bg-slate-100 flex items-center justify-center border-b"><ImageIcon className="text-slate-300" size={32} /></div>
                 <div className="p-6 space-y-4">
                    <div className="h-3 bg-slate-100 rounded-full w-3/4"></div>
                    <div className="h-3 bg-slate-100 rounded-full w-1/2"></div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="h-16 bg-slate-50 rounded-xl"></div>
                       <div className="h-16 bg-slate-50 rounded-xl"></div>
                    </div>
                 </div>
                 <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-[1px] flex flex-col items-center justify-center p-8 text-center gap-4 opacity-0 group-hover:opacity-100 transition-all z-40">
                    <div className="w-14 h-14 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse"><Smartphone size={28} /></div>
                    <div><p className="font-black text-slate-800 text-sm">Simulador Mobile</p><p className="text-[10px] text-slate-500 mt-1">Clique para simular a compra.</p></div>
                    <button onClick={() => setShowTestMode(true)} className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl border">Iniciar Teste</button>
                 </div>
              </div>
           ) : null}
        </div>
      </div>

      {/* MODAL SIMULATOR OVERLAY */}
      {showTestMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="absolute top-8 right-8 flex gap-4">
             <button onClick={resetSimulation} className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20"><X size={20} /> Encerrar Teste</button>
          </div>
          
          <div className="w-[380px] h-[780px] bg-slate-900 rounded-[3.5rem] border-[12px] border-slate-800 shadow-2xl overflow-hidden relative">
             {/* Status Bar Mock */}
             <div className="absolute top-0 inset-x-0 h-6 flex justify-between items-center px-8 z-[110]">
                <span className="text-[10px] font-bold text-white">12:45</span>
                <div className="flex gap-1.5"><div className="w-3 h-3 bg-white/20 rounded-full"></div><div className="w-3 h-3 bg-white/20 rounded-full"></div></div>
             </div>

             <div className="h-full bg-white flex flex-col relative overflow-hidden">
                {testStep === 'welcome' && (
                  <div className="h-full flex flex-col items-center justify-center p-10 text-center gap-10 animate-in fade-in zoom-in-95">
                     <div className="relative">
                        <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center border-4 border-slate-50 shadow-inner">
                           <img src={settings.logoUrl || 'https://picsum.photos/200'} className="w-16 h-16 rounded-2xl object-cover" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-xl shadow-lg border-2 border-white"><Smartphone size={16} /></div>
                     </div>
                     <div className="space-y-2">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{settings.restaurantName}</h2>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed px-4">{settings.welcomeMessage}</p>
                     </div>
                     <div className="w-full flex flex-col gap-3">
                        <button onClick={() => { setOrderType('table'); setTestStep('menu'); }} className="w-full py-5 bg-slate-50 rounded-3xl flex items-center justify-center gap-5 hover:border-indigo-600 border-2 border-transparent transition-all shadow-sm group">
                           <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all"><QrCode /></div>
                           <div className="text-left"><p className="font-black text-slate-800 text-sm">Na Mesa</p><p className="text-[9px] font-bold text-slate-400 uppercase">Peça via QR Code</p></div>
                        </button>
                        <button onClick={() => { setOrderType('delivery'); setTestStep('menu'); }} className="w-full py-5 bg-slate-50 rounded-3xl flex items-center justify-center gap-5 hover:border-rose-600 border-2 border-transparent transition-all shadow-sm group">
                           <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-all"><Bike /></div>
                           <div className="text-left"><p className="font-black text-slate-800 text-sm">Delivery</p><p className="text-[9px] font-bold text-slate-400 uppercase">Receba em casa</p></div>
                        </button>
                     </div>
                  </div>
                )}

                {testStep === 'menu' && (
                  <div className="h-full flex flex-col animate-in slide-in-from-right-10">
                     <div className="h-44 shrink-0 relative bg-slate-800 flex items-end p-6 overflow-hidden">
                        <img src={settings.bannerUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                        <div className="relative z-10 text-white w-full flex justify-between items-end">
                           <div>
                              <h3 className="text-2xl font-black tracking-tighter">{settings.restaurantName}</h3>
                              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 flex items-center gap-1"><Store size={12} /> {orderType === 'table' ? 'Atendimento Mesa' : 'Delivery Ativo'}</p>
                           </div>
                           <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/20"><Search size={18} /></div>
                        </div>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                        {/* Categorias Visuais */}
                        <div className="p-6 space-y-4">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">O que vamos pedir hoje?</p>
                           <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                              {categories.map(cat => (
                                 <button 
                                    key={cat} 
                                    onClick={() => setActiveSimCategory(activeSimCategory === cat ? null : cat)}
                                    className="flex flex-col items-center gap-2 group"
                                 >
                                    <div className={`w-20 h-20 rounded-[2rem] border-2 overflow-hidden transition-all shadow-sm ${activeSimCategory === cat ? 'border-indigo-600 scale-105' : 'border-slate-100 group-hover:border-indigo-200'}`}>
                                       {settings.categoryImages?.[cat] ? (
                                          <img src={settings.categoryImages[cat]} className="w-full h-full object-cover" />
                                       ) : (
                                          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300"><ImageIcon size={24} /></div>
                                       )}
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-tighter ${activeSimCategory === cat ? 'text-indigo-600' : 'text-slate-500'}`}>{cat}</span>
                                 </button>
                              ))}
                           </div>
                        </div>

                        {/* Lista de Produtos Ordenada e com Badge de Promo */}
                        <div className="px-6 pb-32 space-y-4">
                           <div className="flex justify-between items-center px-1">
                              <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">{activeSimCategory || 'Mais Pedidos'}</h4>
                              <Filter size={16} className="text-slate-400" />
                           </div>
                           
                           {sortedProducts
                              .filter(p => !activeSimCategory || p.category === activeSimCategory)
                              .map(product => (
                              <div key={product.id} className="relative flex gap-4 p-4 border-2 border-slate-50 rounded-[2.5rem] items-center group bg-white hover:border-indigo-100 transition-all shadow-sm">
                                 <div className="w-20 h-20 rounded-2xl bg-slate-50 overflow-hidden relative shadow-inner border border-slate-100">
                                    <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                    {product.isPromotional && (
                                       <div className="absolute top-1 left-1 bg-amber-500 text-white p-1 rounded-lg shadow-lg">
                                          <Zap size={10} fill="currentColor" />
                                       </div>
                                    )}
                                 </div>
                                 <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-1.5">
                                       <p className="font-black text-slate-800 text-xs">{product.name}</p>
                                       {product.isPromotional && <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[8px] font-black uppercase rounded-full">Oferta</span>}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{product.category}</p>
                                    <div className="flex items-center gap-2">
                                       <p className="font-black text-indigo-600 text-sm">R$ {product.price.toFixed(2)}</p>
                                       {product.isPromotional && <span className="text-[10px] text-slate-300 line-through font-bold">R$ {(product.price * 1.2).toFixed(2)}</span>}
                                    </div>
                                 </div>
                                 <button onClick={() => addToSimCart(product)} className="w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-90 transition-all" style={{ backgroundColor: settings.primaryColor }}><Plus size={20} /></button>
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* Floating Cart Button */}
                     <div className="absolute bottom-10 inset-x-8">
                        <button onClick={() => setTestStep('cart')} disabled={simCart.length === 0} className="w-full py-5 rounded-[2rem] text-white font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50" style={{ backgroundColor: settings.primaryColor }}>
                           <div className="p-2 bg-white/20 rounded-xl"><ShoppingCart size={18} /></div>
                           Sacola ({simCart.reduce((a,b)=>a+b.quantity, 0)})
                        </button>
                     </div>
                  </div>
                )}

                {testStep === 'cart' && (
                  <div className="h-full flex flex-col animate-in slide-in-from-right-10">
                     <div className="p-8 flex items-center gap-4">
                        <button onClick={() => setTestStep('menu')} className="p-3 bg-slate-50 text-slate-500 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors"><ArrowLeft size={20} /></button>
                        <h3 className="text-xl font-black text-slate-800 tracking-tighter">Minha Sacola</h3>
                     </div>
                     <div className="flex-1 overflow-y-auto p-8 space-y-5">
                        {simCart.map(item => (
                           <div key={item.product.id} className="flex justify-between items-center p-5 bg-slate-50/50 border border-slate-100 rounded-[2.5rem]">
                              <div className="flex-1">
                                 <p className="font-black text-slate-800 text-xs">{item.product.name}</p>
                                 <p className="text-[10px] text-indigo-600 font-black">R$ {item.product.price.toFixed(2)}</p>
                              </div>
                              <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                                 <button onClick={() => removeFromSimCart(item.product.id)} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><Minus size={14} /></button>
                                 <span className="font-black text-sm text-slate-700 min-w-[20px] text-center">{item.quantity}</span>
                                 <button onClick={() => addToSimCart(item.product)} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><Plus size={14} /></button>
                              </div>
                           </div>
                        ))}

                        <div className="bg-indigo-600 p-8 rounded-[3rem] text-white mt-10 space-y-4 shadow-xl shadow-indigo-100">
                           <div className="flex justify-between text-[10px] font-black uppercase opacity-60"><span>Subtotal Itens</span><span>R$ {simCartTotal.toFixed(2)}</span></div>
                           {orderType === 'delivery' && <div className="flex justify-between text-[10px] font-black uppercase opacity-60"><span>Taxa de Entrega Fixa</span><span>R$ 7.00</span></div>}
                           <div className="pt-4 border-t border-white/20 flex justify-between font-black text-2xl tracking-tighter"><span>Total</span><span>R$ {(simCartTotal + (orderType === 'delivery' ? 7 : 0)).toFixed(2)}</span></div>
                        </div>
                     </div>
                     <div className="p-8 pb-12">
                        <button onClick={() => setTestStep('checkout')} className="w-full py-6 rounded-[2rem] text-white font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all" style={{ backgroundColor: settings.primaryColor }}>Avançar Checkout</button>
                     </div>
                  </div>
                )}

                {testStep === 'checkout' && (
                  <div className="h-full flex flex-col animate-in slide-in-from-right-10">
                     <div className="p-8 flex items-center gap-4">
                        <button onClick={() => setTestStep('cart')} className="p-3 bg-slate-50 text-slate-500 rounded-2xl"><ArrowLeft size={20} /></button>
                        <h3 className="text-xl font-black text-slate-800 tracking-tighter">Identificação</h3>
                     </div>
                     <div className="flex-1 overflow-y-auto p-8 space-y-8">
                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quem é você?</label>
                           <div className="relative group">
                              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                              <input type="text" placeholder="Nome completo" className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all" value={customerName} onChange={(e)=>setCustomerName(e.target.value)} />
                           </div>
                           <div className="relative group">
                              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                              <input type="tel" placeholder="WhatsApp (DDD)" className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all" value={customerPhone} onChange={(e)=>setCustomerPhone(e.target.value)} />
                           </div>
                        </div>

                        {orderType === 'delivery' ? (
                          <div className="space-y-4">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Local de Entrega</label>
                             <div className="relative group">
                                <MapPin className="absolute left-5 top-5 text-slate-300" size={18} />
                                <textarea rows={3} placeholder="Rua, Número, Bairro e Complemento" className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none" value={customerAddress} onChange={(e)=>setCustomerAddress(e.target.value)} />
                             </div>
                          </div>
                        ) : (
                           <div className="space-y-4">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Em qual mesa você está?</label>
                              <div className="relative group">
                                 <Store className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                 <input type="number" placeholder="Número da Mesa" className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all" value={tableNumber} onChange={(e)=>setTableNumber(e.target.value)} />
                              </div>
                           </div>
                        )}

                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pagamento</label>
                           <div className="grid grid-cols-1 gap-3">
                              {['PIX', 'Cartão', 'Dinheiro'].map(method => (
                                 <div key={method} className="space-y-3">
                                    <button onClick={()=>setPaymentMethod(method)} className={`w-full p-5 rounded-[1.5rem] border-2 flex items-center justify-between transition-all font-black text-xs uppercase tracking-widest ${paymentMethod === method ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                                       <div className="flex items-center gap-4"><div className={`p-2 rounded-xl bg-white shadow-sm ${paymentMethod === method ? 'text-indigo-600' : 'text-slate-300'}`}><Wallet size={16} /></div>{method}</div>
                                       {paymentMethod === method && <CheckCircle2 size={20} />}
                                    </button>
                                    {paymentMethod === 'Dinheiro' && method === 'Dinheiro' && (
                                       <div className="px-4 pb-2 animate-in slide-in-from-top-2">
                                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Troco para quanto?</label>
                                          <input 
                                             type="number" 
                                             placeholder="Ex: 50" 
                                             className="w-full px-4 py-3 bg-white border-2 border-indigo-100 rounded-xl font-bold outline-none focus:border-indigo-600"
                                             value={changeFor}
                                             onChange={(e) => setChangeFor(e.target.value)}
                                          />
                                       </div>
                                    )}
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>
                     <div className="p-8 pb-12">
                        <button onClick={handleFinishSimulation} disabled={!customerName || !customerPhone || (orderType === 'delivery' ? !customerAddress : !tableNumber) || !paymentMethod} className="w-full py-6 rounded-[2rem] text-white font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all disabled:opacity-50 disabled:grayscale" style={{ backgroundColor: settings.primaryColor }}>Confirmar Pedido</button>
                     </div>
                  </div>
                )}

                {testStep === 'success' && (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-10 animate-in zoom-in-95">
                     <div className="w-32 h-32 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-bounce shadow-2xl shadow-emerald-50 shrink-0 border-8 border-white"><CheckCircle2 size={64} /></div>
                     <div className="space-y-3">
                        <h3 className="text-3xl font-black text-slate-800 tracking-tighter leading-none">Pedido Enviado!</h3>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed px-2">Sucesso! Agora nossa equipe está preparando seu pedido.</p>
                     </div>
                     <div className="w-full p-6 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 text-left space-y-4">
                        <div className="flex items-center gap-3"><div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100"><MessageCircle size={18} /></div><p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Canal de Status</p></div>
                        <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase">Você receberá atualizações automáticas via WhatsApp conforme o pedido avança para a cozinha e entrega.</p>
                     </div>
                     <div className="w-full flex flex-col gap-2">
                        <button 
                           onClick={() => {
                              alert("Solicitação de fechamento de conta enviada ao garçom! 🧾");
                              resetSimulation();
                           }} 
                           className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                        >
                           Pedir Conta / Encerrar
                        </button>
                        <button onClick={resetSimulation} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Sair do Simulador</button>
                     </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitalMenuConfig;
