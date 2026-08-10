
import React, { useState, useMemo } from 'react';
import { DigitalMenuSettings, Product, Table, Order } from '../types';
import { compressImage } from '../lib/imageUtils';
import { 
  Smartphone, Palette, QrCode, 
  Save, Eye, EyeOff, Check, 
  Plus, Globe, 
  ShoppingCart, Copy, Share2, X, MousePointer2,
  Minus, MapPin, User, Wallet,
  CheckCircle2, ArrowLeft, MessageCircle,
  Bike, Home, UserCircle, Phone, Store,
  Image as ImageIcon, Sparkles, ArrowUp, ArrowDown, Zap, Tag, Star,
  Search, Filter, Loader2, Package,
  Printer, Download, ExternalLink, Trash2, AlertTriangle
} from 'lucide-react';

import DigitalMenu from './DigitalMenu';

interface DigitalMenuConfigProps {
  tenantId?: string;
  settings: DigitalMenuSettings;
  onUpdateSettings: (settings: DigitalMenuSettings) => void;
  products: Product[];
  productCategories?: string[];
  setProductCategories?: (categories: string[] | ((prev: string[]) => string[])) => void;
  tables: Table[];
  onUpdateProduct: (product: Product) => void;
  onPlaceDigitalOrder: (order: Order) => void;
  onSaveSettings: () => Promise<boolean>;
  isDeliveryEnabled: boolean;
  isPickupEnabled: boolean;
  deliveryFee: number;
  minOrderValue?: number;
  estimatedDeliveryTime?: string;
  estimatedPickupTime?: string;
}

interface SimCartItem {
  product: Product;
  quantity: number;
}

const DigitalMenuConfig: React.FC<DigitalMenuConfigProps> = ({ 
  tenantId,
  settings, 
  onUpdateSettings, 
  products, 
  productCategories,
  setProductCategories,
  tables, 
  onUpdateProduct,
  onPlaceDigitalOrder,
  onSaveSettings,
  isDeliveryEnabled,
  isPickupEnabled,
  deliveryFee,
  minOrderValue,
  estimatedDeliveryTime,
  estimatedPickupTime
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'management' | 'qrcode' | 'promo' | 'totem'>('visual');
  const [showTestMode, setShowTestMode] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState<string | boolean>(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [totemSearch, setTotemSearch] = useState('');
  const [totemCategoryFilter, setTotemCategoryFilter] = useState<string>('all');
  
  const categories = useMemo(() => {
    const catsFromProducts = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const registered = productCategories && productCategories.length > 0 ? productCategories : [];
    
    const combined = [...registered];
    catsFromProducts.forEach(c => {
      if (!combined.includes(c)) {
        combined.push(c);
      }
    });

    const cleanCombined = combined.filter(c => c && c !== 'Geral');
    return cleanCombined.length > 0 ? cleanCombined : ['Entradas', 'Buffet', 'Pratos Principais', 'Lanches', 'Batatas Recheadas', 'Pasteis', 'Bebidas'];
  }, [products, productCategories]);
  
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [products]);

  const rawSlug = settings.customSlug || settings.restaurantName || '';
  const cleanMenuSlug = rawSlug
    ? rawSlug.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') 
    : 'viva-la-fome';
    
  const effectiveId = tenantId || 'HCL1177LRQVPEKCTYRAHU7IGBQ42';
  const menuUrl = `${window.location.origin}/cardapio/${cleanMenuSlug || 'viva-la-fome'}`;
  const menuUrlById = `${window.location.origin}/cardapio/${effectiveId}`;
  const lojistaUrl = `${window.location.origin}/lojista/${cleanMenuSlug || effectiveId}`;

  const downloadQrCode = async (dataUrl: string, fileName: string) => {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(dataUrl, '_blank');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setIsLinkCopied(label);
    setTimeout(() => setIsLinkCopied(false), 2000);
  };

  const handlePrintTableQr = (tableNum: number | string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tUrl = `${menuUrl}?mesa=${tableNum}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(tUrl)}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Mesa ${tableNum} - ${settings.restaurantName || 'Cardápio Digital'}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 90vh; background: #ffffff; margin: 0; }
            .card { width: 320px; padding: 28px; border: 3px solid #1e293b; border-radius: 24px; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
            .logo { max-height: 54px; margin-bottom: 12px; object-fit: contain; }
            .title { font-size: 16px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
            .subtitle { font-size: 11px; font-weight: 700; color: #64748b; margin-top: 4px; }
            .qr-box { background: #f8fafc; padding: 16px; border-radius: 20px; margin: 20px 0; border: 1px solid #e2e8f0; }
            .qr-img { width: 220px; height: 220px; display: block; margin: 0 auto; border-radius: 12px; }
            .badge { display: inline-block; background: #4f46e5; color: #ffffff; padding: 8px 22px; border-radius: 999px; font-size: 18px; font-weight: 900; letter-spacing: 1px; }
            .instruction { font-size: 12px; font-weight: 800; color: #334155; margin-top: 14px; line-height: 1.4; }
          </style>
        </head>
        <body>
          <div class="card">
            ${settings.logoUrl ? `<img src="${settings.logoUrl}" class="logo" />` : ''}
            <div class="title">${settings.restaurantName || 'NOSSO RESTAURANTE'}</div>
            <div class="subtitle">Peça direto da sua mesa pelo celular</div>
            <div class="qr-box">
              <img src="${qrSrc}" class="qr-img" />
            </div>
            <div class="badge">MESA ${tableNum}</div>
            <div class="instruction">Aponte sua câmera para o QR Code para abrir o cardápio e fazer seu pedido!</div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAllTableQrs = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cardsHtml = tables.map(t => {
      const tUrl = `${menuUrl}?mesa=${t.number}`;
      const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tUrl)}`;
      return `
        <div style="width: 280px; padding: 24px; border: 2px solid #cbd5e1; border-radius: 20px; text-align: center; font-family: sans-serif; box-sizing: border-box; page-break-inside: avoid; background: #ffffff;">
          ${settings.logoUrl ? `<img src="${settings.logoUrl}" style="height: 44px; object-fit: contain; margin-bottom: 8px;" />` : ''}
          <div style="font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${settings.restaurantName || 'NOSSO RESTAURANTE'}</div>
          <div style="margin: 14px 0; background: #f8fafc; padding: 12px; border-radius: 16px; border: 1px solid #e2e8f0;">
            <img src="${qrSrc}" style="width: 180px; height: 180px; display: block; margin: 0 auto; border-radius: 8px;" />
          </div>
          <div style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 6px 18px; border-radius: 20px; font-size: 16px; font-weight: 900;">
            MESA ${t.number}
          </div>
          <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-top: 10px; line-height: 1.3;">
            Escaneie o QR Code com a câmera para pedir
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cartões de QR Code de Mesas - ${settings.restaurantName || 'KitchenFlow'}</title>
          <style>
            @page { size: auto; margin: 15mm; }
            body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; padding: 20px; margin: 0; }
            .grid { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; }
            @media print {
              body { background: white; padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 12px 28px; background: #4f46e5; color: white; border: none; border-radius: 14px; font-weight: 900; cursor: pointer; font-size: 14px; font-family: sans-serif;">🖨️ Imprimir Todos os Cartões</button>
          </div>
          <div class="grid">
            ${cardsHtml}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const bannerPresets = [
    { name: 'Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2070&auto=format&fit=crop' },
    { name: 'Hambúrguer', url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=2072&auto=format&fit=crop' },
    { name: 'Sushi', url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=2070&auto=format&fit=crop' },
    { name: 'Massas', url: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?q=80&w=2070&auto=format&fit=crop' },
    { name: 'Sobremesas', url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=1964&auto=format&fit=crop' },
    { name: 'Café', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1974&auto=format&fit=crop' },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const compressed = await compressImage(base64String, type === 'logo' ? 400 : 800, type === 'logo' ? 400 : 450, 0.7);
          if (type === 'logo') {
            onUpdateSettings({ ...settings, logoUrl: compressed });
          } else {
            onUpdateSettings({ ...settings, bannerUrl: compressed });
          }
        } catch (err) {
          console.error("Error compressing image:", err);
          if (type === 'logo') {
            onUpdateSettings({ ...settings, logoUrl: base64String });
          } else {
            onUpdateSettings({ ...settings, bannerUrl: base64String });
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyLink = (urlToCopy?: string, copyKey: string | boolean = true) => {
    navigator.clipboard.writeText(urlToCopy || menuUrl);
    setIsLinkCopied(copyKey);
    setTimeout(() => setIsLinkCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    const success = await onSaveSettings();
    if (success) {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('idle');
      alert('Erro ao salvar configurações.');
    }
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

  const moveCategory = (category: string, direction: 'up' | 'down') => {
    const currentOrder = settings.categoryOrder || categories;
    const index = currentOrder.indexOf(category);
    if (index === -1) return;

    const newOrder = [...currentOrder];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < newOrder.length) {
      [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
      onUpdateSettings({ ...settings, categoryOrder: newOrder });
    }
  };

  const handleDeleteCategory = async (category: string) => {
    if (window.confirm(`Deseja excluir a categoria "${category}"? Os produtos nesta categoria ficarão sem categoria.`)) {
      const affected = products.filter(p => p.category === category);
      for (const p of affected) {
        await onUpdateProduct({ ...p, category: '' });
      }

      const currentHidden = settings.hiddenCategories || [];
      const currentOrder = settings.categoryOrder || categories;
      onUpdateSettings({
        ...settings,
        hiddenCategories: currentHidden.filter(c => c !== category),
        categoryOrder: currentOrder.filter(c => c !== category)
      });

      if (setProductCategories) {
        setProductCategories(prev => prev.filter(c => c !== category));
      }
    }
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
             <button 
               onClick={handleSave} 
               disabled={saveStatus !== 'idle'}
               className={`flex items-center gap-2 px-4 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg ${
                 saveStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-white text-indigo-600 hover:bg-indigo-50'
               }`}
             >
                {saveStatus === 'saving' ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : saveStatus === 'success' ? (
                  <Check size={14} />
                ) : (
                  <Save size={14} />
                )}
                {saveStatus === 'saving' ? 'Salvando...' : saveStatus === 'success' ? 'Salvo!' : 'Salvar'}
             </button>
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
            <button onClick={() => setActiveTab('management')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${activeTab === 'management' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white'}`}>
              <Zap size={14} /> Gestão de Exibição
            </button>
            <button onClick={() => setActiveTab('promo')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${activeTab === 'promo' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white'}`}>
              <Tag size={14} /> Promoção do Dia
            </button>
            <button onClick={() => setActiveTab('qrcode')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${activeTab === 'qrcode' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white'}`}>
              <QrCode size={14} /> QR Codes
            </button>
            <button onClick={() => setActiveTab('totem')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${activeTab === 'totem' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white'}`}>
              <Sparkles size={14} className="text-amber-500 animate-pulse" /> Método Totem (Upsell)
            </button>
          </div>

          {activeTab === 'visual' && (
            <div className="space-y-5 animate-in slide-in-from-left-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo Selection */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <ImageIcon size={14} /> Logo do Restaurante
                  </label>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 transition-all group relative overflow-hidden">
                    <div className="w-16 h-16 rounded-xl bg-white shadow-sm flex items-center justify-center overflow-hidden border border-slate-100">
                      {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="text-slate-300" size={24} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-500 mb-2">PNG ou JPG (Recomendado 512x512)</p>
                      <label className="cursor-pointer bg-white text-indigo-600 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm border hover:bg-indigo-50 transition-all inline-block">
                        Selecionar Arquivo
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Colors and Fonts */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Palette size={14} /> Cores e Tipografia
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cor Primária</span>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={settings.primaryColor} 
                          onChange={(e) => onUpdateSettings({ ...settings, primaryColor: e.target.value })}
                          className="w-10 h-10 rounded-lg border-2 border-white shadow-sm cursor-pointer"
                        />
                        <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">{settings.primaryColor}</span>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cor de Destaque</span>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          value={settings.accentColor || '#FACC15'} 
                          onChange={(e) => onUpdateSettings({ ...settings, accentColor: e.target.value })}
                          className="w-10 h-10 rounded-lg border-2 border-white shadow-sm cursor-pointer"
                        />
                        <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">{settings.accentColor || '#FACC15'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fonte do Sistema</span>
                    <div className="grid grid-cols-3 gap-2">
                      {['sans', 'serif', 'mono'].map(font => (
                        <button 
                          key={font}
                          onClick={() => onUpdateSettings({ ...settings, fontFamily: font as any })}
                          className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${settings.fontFamily === font ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}`}
                        >
                          {font}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Banner Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Sparkles size={14} /> Banner Principal
                  </label>
                  <label className="cursor-pointer text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                    <Plus size={12} /> Upload Personalizado
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'banner')} />
                  </label>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {bannerPresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => onUpdateSettings({ ...settings, bannerUrl: preset.url })}
                      className={`relative h-20 rounded-xl overflow-hidden border-2 transition-all group ${settings.bannerUrl === preset.url ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-transparent hover:border-indigo-200'}`}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[8px] font-black text-white uppercase tracking-widest">{preset.name}</span>
                      </div>
                      {settings.bannerUrl === preset.url && (
                        <div className="absolute top-1 right-1 bg-indigo-600 text-white p-1 rounded-lg">
                          <Check size={10} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Ou cole a URL de uma imagem externa..." 
                    className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-medium text-[11px] focus:border-indigo-500 focus:bg-white transition-all" 
                    value={settings.bannerUrl} 
                    onChange={(e) => onUpdateSettings({ ...settings, bannerUrl: e.target.value })} 
                  />
                  <ImageIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome de Exibição</label>
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none font-bold text-xs" value={settings.restaurantName} onChange={(e) => onUpdateSettings({ ...settings, restaurantName: e.target.value })} />
              </div>

              {/* URL E SLUG PERSONALIZADO DO CLIENTE */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-indigo-600" />
                    <label className="text-[10px] font-black text-indigo-950 uppercase tracking-wider">URLs de Acesso do Lojista (Links do Cardápio / Loja)</label>
                  </div>
                  <span className="px-2.5 py-0.5 bg-indigo-600 text-white text-[7px] font-black rounded-full uppercase tracking-wider">Acesso Direto</span>
                </div>

                {/* 1. Link por Nome / Slug Customizado */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-indigo-900 tracking-wider">1. Link Personalizado (por Nome ou Slug)</span>
                  <div className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-xl px-3 py-2 shadow-sm">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{window.location.origin}/cardapio/</span>
                    <input 
                      type="text" 
                      placeholder={cleanMenuSlug}
                      className="flex-1 outline-none font-mono font-black text-xs text-indigo-600 lowercase bg-transparent"
                      value={settings.customSlug || ''} 
                      onChange={(e) => {
                        const sanitized = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]/g, '');
                        onUpdateSettings({ ...settings, customSlug: sanitized });
                      }} 
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyLink(menuUrl, 'slug')}
                      className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1 ${
                        isLinkCopied === 'slug' ? 'bg-emerald-500 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      }`}
                    >
                      {isLinkCopied === 'slug' ? <Check size={12} /> : <Copy size={12} />}
                      {isLinkCopied === 'slug' ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>

                {/* 2. Link por ID do Lojista */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-indigo-900 tracking-wider">2. Link Direto (por ID do Lojista)</span>
                  <div className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-xl px-3 py-2 shadow-sm">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{window.location.origin}/cardapio/</span>
                    <span className="flex-1 font-mono font-black text-xs text-indigo-600 truncate">{effectiveId}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(menuUrlById, 'id')}
                      className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1 ${
                        isLinkCopied === 'id' ? 'bg-emerald-500 text-white' : 'bg-indigo-50 text-indigo-100 hover:bg-indigo-100'
                      }`}
                    >
                      {isLinkCopied === 'id' ? <Check size={12} /> : <Copy size={12} />}
                      {isLinkCopied === 'id' ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <p className="text-[8px] font-medium text-slate-500 pl-1">
                  Ambos os links levam seu cliente diretamente ao seu Cardápio Digital exclusivo. O cliente realiza o pedido diretamente sem ter acesso ao painel do lojista.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mensagem de Boas-vindas</label>
                <textarea className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none font-medium text-xs resize-none" rows={2} value={settings.welcomeMessage} onChange={(e) => onUpdateSettings({ ...settings, welcomeMessage: e.target.value })} />
              </div>
            </div>
          )}

          {activeTab === 'management' && (
            <div className="space-y-6 animate-in slide-in-from-left-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Organização do Cardápio</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Arraste ou use as setas para ordenar</p>
              </div>

              <div className="space-y-3">
                {sortedProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border bg-white shrink-0 flex items-center justify-center">
                      {product.image ? (
                        <img src={product.image} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={18} className="text-slate-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-xs truncate">{product.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{product.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => togglePromo(product)}
                        className={`p-2 rounded-lg transition-all ${product.isPromotional ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-300 hover:text-slate-400'}`}
                        title="Marcar como Promoção"
                      >
                        <Tag size={16} />
                      </button>
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => moveOrder(product, 'up')}
                          disabled={index === 0}
                          className="p-1 bg-white text-slate-400 rounded hover:text-indigo-600 disabled:opacity-30"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button 
                          onClick={() => moveOrder(product, 'down')}
                          disabled={index === sortedProducts.length - 1}
                          className="p-1 bg-white text-slate-400 rounded hover:text-indigo-600 disabled:opacity-30"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Organização das Categorias</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Defina a ordem de exibição</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(settings.categoryOrder || categories).map((cat, index) => (
                    <div key={cat} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 group hover:bg-white hover:shadow-md transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{cat}</span>
                          {settings.categoryImages?.[cat] && <CheckCircle2 size={14} className="text-emerald-500" />}
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => moveCategory(cat, 'up')}
                            disabled={index === 0}
                            className="p-1 bg-white text-slate-400 rounded hover:text-indigo-600 disabled:opacity-30"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button 
                            onClick={() => moveCategory(cat, 'down')}
                            disabled={index === (settings.categoryOrder || categories).length - 1}
                            className="p-1 bg-white text-slate-400 rounded hover:text-indigo-600 disabled:opacity-30"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              const currentHidden = settings.hiddenCategories || [];
                              const isHidden = currentHidden.includes(cat);
                              const newHidden = isHidden 
                                ? currentHidden.filter(c => c !== cat)
                                : [...currentHidden, cat];
                              onUpdateSettings({ ...settings, hiddenCategories: newHidden });
                            }}
                            className={`p-1 rounded transition-all ${settings.hiddenCategories?.includes(cat) ? 'bg-rose-50 text-rose-500' : 'bg-white text-slate-400 hover:text-emerald-500'}`}
                            title={settings.hiddenCategories?.includes(cat) ? "Mostrar no Cardápio" : "Ocultar no Cardápio"}
                          >
                            {settings.hiddenCategories?.includes(cat) ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                            title="Excluir Categoria"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white border flex items-center justify-center overflow-hidden shrink-0">
                          {settings.categoryImages?.[cat] ? (
                            <img src={settings.categoryImages[cat]} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={20} className="text-slate-200" />
                          )}
                        </div>
                        <input 
                          type="text" 
                          placeholder="URL da imagem..."
                          className="flex-1 px-3 py-2 bg-white border rounded-lg text-[10px] font-medium outline-none focus:border-indigo-500"
                          value={settings.categoryImages?.[cat] || ''}
                          onChange={(e) => handleUpdateCatImage(cat, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'promo' && (
            <div className="space-y-6 animate-in slide-in-from-left-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Configuração da Promoção do Dia</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Ativar Promoção</span>
                  <button 
                    onClick={() => onUpdateSettings({ 
                      ...settings, 
                      dailyPromo: { ...(settings.dailyPromo || { title: '', subtitle: '', price: 0, originalPrice: 0, active: false }), active: !settings.dailyPromo?.active } 
                    })}
                    className={`w-12 h-6 rounded-full relative transition-all ${settings.dailyPromo?.active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.dailyPromo?.active ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Título da Promoção</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none font-bold text-xs" 
                      placeholder="Ex: Combo Irresistível"
                      value={settings.dailyPromo?.title || ''} 
                      onChange={(e) => onUpdateSettings({ 
                        ...settings, 
                        dailyPromo: { ...(settings.dailyPromo || { title: '', subtitle: '', price: 0, originalPrice: 0, active: true }), title: e.target.value } 
                      })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Subtítulo / Descrição Curta</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none font-medium text-xs resize-none" 
                      rows={2} 
                      placeholder="Ex: Aproveite nossa seleção especial..."
                      value={settings.dailyPromo?.subtitle || ''} 
                      onChange={(e) => onUpdateSettings({ 
                        ...settings, 
                        dailyPromo: { ...(settings.dailyPromo || { title: '', subtitle: '', price: 0, originalPrice: 0, active: true }), subtitle: e.target.value } 
                      })} 
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Promocional (R$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none font-bold text-xs" 
                        value={settings.dailyPromo?.price || 0} 
                        onChange={(e) => onUpdateSettings({ 
                          ...settings, 
                          dailyPromo: { ...(settings.dailyPromo || { title: '', subtitle: '', price: 0, originalPrice: 0, active: true }), price: parseFloat(e.target.value) } 
                        })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço Original (R$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none font-bold text-xs" 
                        value={settings.dailyPromo?.originalPrice || 0} 
                        onChange={(e) => onUpdateSettings({ 
                          ...settings, 
                          dailyPromo: { ...(settings.dailyPromo || { title: '', subtitle: '', price: 0, originalPrice: 0, active: true }), originalPrice: parseFloat(e.target.value) } 
                        })} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">URL da Imagem (Opcional)</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none font-medium text-xs" 
                      placeholder="https://..."
                      value={settings.dailyPromo?.imageUrl || ''} 
                      onChange={(e) => onUpdateSettings({ 
                        ...settings, 
                        dailyPromo: { ...(settings.dailyPromo || { title: '', subtitle: '', price: 0, originalPrice: 0, active: true }), imageUrl: e.target.value } 
                      })} 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
                <Zap size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-amber-900 uppercase tracking-tight">Dica de Conversão</p>
                  <p className="text-[10px] font-medium text-amber-700">Promoções com "Preço Original" riscado tendem a converter 30% mais. Mantenha o título curto e impactante!</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qrcode' && (
            <div className="space-y-6 animate-in slide-in-from-left-4">
              {/* Header Box */}
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 p-6 md:p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <QrCode size={160} />
                </div>
                <div className="space-y-2 relative z-10 max-w-xl text-center md:text-left">
                  <span className="px-3 py-1 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5">
                    <Sparkles size={12} className="text-amber-300" /> Autoatendimento Instantâneo
                  </span>
                  <h4 className="text-xl md:text-2xl font-black tracking-tight">QR Codes Prontos para Pedidos</h4>
                  <p className="text-xs text-indigo-100/80 font-medium leading-relaxed">
                    Aponte e peça! Escaneie os QR Codes de mesas, balcão ou totem para abrir o cardápio digital vinculado direto à mesa do cliente.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10 shrink-0 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={handlePrintAllTableQrs}
                    disabled={tables.length === 0}
                    className="w-full sm:w-auto px-5 py-3 bg-white text-indigo-900 hover:bg-indigo-50 active:scale-95 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Printer size={16} /> Imprimir Todos os Cartões ({tables.length})
                  </button>
                </div>
              </div>

              {/* Section 1: Geral & Totem */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* QR Code Geral */}
                <div className="p-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6 group hover:shadow-md transition">
                  <div className="w-36 h-36 bg-slate-50 p-2 rounded-2xl border border-slate-200 flex items-center justify-center shrink-0">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(menuUrl)}`}
                      alt="QR Code Cardápio Geral"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <div className="space-y-3 flex-1 text-center md:text-left">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">Delivery & Balcão</span>
                      <h5 className="font-black text-slate-800 text-base mt-1">QR Code Geral do Cardápio</h5>
                      <p className="text-[11px] text-slate-500 font-medium">Link universal para divulgar no Instagram, WhatsApp ou balcão.</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl font-mono text-[10px] text-slate-600 truncate border border-slate-100">
                      {menuUrl}
                    </div>
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <button
                        type="button"
                        onClick={() => downloadQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(menuUrl)}`, 'qrcode-cardapio-geral.png')}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition"
                      >
                        <Download size={12} /> Baixar PNG
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(menuUrl, 'geral')}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition"
                      >
                        {isLinkCopied === 'geral' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        {isLinkCopied === 'geral' ? 'Copiado!' : 'Copiar'}
                      </button>
                      <a
                        href={menuUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition"
                        title="Abrir em nova aba"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* QR Code Totem */}
                <div className="p-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6 group hover:shadow-md transition">
                  <div className="w-36 h-36 bg-amber-50 p-2 rounded-2xl border border-amber-200 flex items-center justify-center shrink-0">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${menuUrl}?modo=totem`)}`}
                      alt="QR Code Totem"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <div className="space-y-3 flex-1 text-center md:text-left">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">Modo Kiosk / Totem</span>
                      <h5 className="font-black text-slate-800 text-base mt-1">QR Code de Autoatendimento</h5>
                      <p className="text-[11px] text-slate-500 font-medium">Inicia automaticamente no modo Totem de Tela Cheia com fotos ampliadas.</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl font-mono text-[10px] text-slate-600 truncate border border-slate-100">
                      {menuUrl}?modo=totem
                    </div>
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <button
                        type="button"
                        onClick={() => downloadQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${menuUrl}?modo=totem`)}`, 'qrcode-totem.png')}
                        className="px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition"
                      >
                        <Download size={12} /> Baixar PNG
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${menuUrl}?modo=totem`, 'totem')}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition"
                      >
                        {isLinkCopied === 'totem' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        {isLinkCopied === 'totem' ? 'Copiado!' : 'Copiar'}
                      </button>
                      <a
                        href={`${menuUrl}?modo=totem`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition"
                        title="Abrir Modo Totem"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Mesas */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">QR Codes das Mesas ({tables.length})</h4>
                    <p className="text-xs text-slate-500 font-medium">Cada QR Code identifica a mesa e lança os pedidos direto no KDS e Caixa.</p>
                  </div>
                  {tables.length > 0 && (
                    <button
                      type="button"
                      onClick={handlePrintAllTableQrs}
                      className="px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                    >
                      <Printer size={14} /> Imprimir Todos
                    </button>
                  )}
                </div>

                {tables.length === 0 ? (
                  <div className="p-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 space-y-3">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-slate-400 shadow-sm">
                      <QrCode size={32} />
                    </div>
                    <h5 className="font-black text-slate-700">Nenhuma mesa cadastrada ainda</h5>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">Cadastre suas mesas no salão para gerar os QR Codes individuais de atendimento em cada mesa.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {tables.map(table => {
                      const tableUrl = `${menuUrl}?mesa=${table.number}`;
                      const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tableUrl)}`;
                      return (
                        <div key={table.id} className="p-5 bg-white border border-slate-200 rounded-[2rem] flex flex-col items-center gap-3 hover:shadow-lg transition-all group relative overflow-hidden">
                          <div className="w-full flex items-center justify-between">
                            <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm">
                              Mesa {table.number}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${table.status === 'occupied' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {table.status === 'occupied' ? 'Em uso' : 'Livre'}
                            </span>
                          </div>

                          <div className="w-full aspect-square bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center justify-center group-hover:border-indigo-200 transition-all">
                            <img 
                              src={qrSrc} 
                              alt={`QR Code Mesa ${table.number}`}
                              className="w-full h-full object-contain rounded-lg shadow-sm"
                            />
                          </div>

                          <div className="w-full text-center space-y-2">
                            <p className="text-[10px] font-mono text-slate-500 truncate bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              ?mesa={table.number}
                            </p>
                            <div className="grid grid-cols-3 gap-1">
                              <button
                                type="button"
                                onClick={() => downloadQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(tableUrl)}`, `qrcode-mesa-${table.number}.png`)}
                                className="p-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 transition cursor-pointer"
                                title="Baixar Imagem PNG"
                              >
                                <Download size={14} />
                                <span className="text-[8px] uppercase">Baixar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(tableUrl, `table_${table.number}`)}
                                className="p-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 transition cursor-pointer"
                                title="Copiar Link da Mesa"
                              >
                                {isLinkCopied === `table_${table.number}` ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                <span className="text-[8px] uppercase">{isLinkCopied === `table_${table.number}` ? 'Copiado' : 'Copiar'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintTableQr(table.number)}
                                className="p-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1 transition cursor-pointer"
                                title="Imprimir Cartão de Mesa"
                              >
                                <Printer size={14} />
                                <span className="text-[8px] uppercase">Imprimir</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'totem' && (
            <div className="space-y-6 animate-in slide-in-from-left-4">
              {/* Header Box */}
              <div className="bg-gradient-to-br from-amber-400 to-amber-500 p-6 rounded-[2.5rem] text-slate-950 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={80} /></div>
                <div className="relative z-10 space-y-1">
                  <span className="bg-amber-950 text-amber-300 text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full">
                    AUMENTO DE TICKET MÉDIO
                  </span>
                  <h4 className="text-xl font-black italic uppercase tracking-tighter text-amber-950 mt-1">
                    Método de Vendas Totem (McDonald's)
                  </h4>
                  <p className="text-amber-950/80 text-[10px] font-bold max-w-xl">
                    Ofereça extras, bebidas geladas ou sobremesas irresistíveis no momento em que seu cliente clica em "Finalizar Pedido" para maximizar suas vendas de forma simples.
                  </p>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Configuração de Sugestão</span>
                    <h5 className="font-black text-slate-800 text-xs mt-0.5">Selecione o modo de geração das ofertas</h5>
                  </div>
                  <div className="flex bg-white p-1 rounded-xl border self-end sm:self-auto shadow-sm">
                    <button
                      onClick={() => onUpdateSettings({ ...settings, totemUpsellMode: 'auto' })}
                      className={`px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                        (settings.totemUpsellMode || 'auto') === 'auto'
                          ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Sparkles size={12} /> Inteligente (Auto)
                    </button>
                    <button
                      onClick={() => onUpdateSettings({ ...settings, totemUpsellMode: 'manual' })}
                      className={`px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                        settings.totemUpsellMode === 'manual'
                          ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Palette size={12} /> Manual (Editável)
                    </button>
                  </div>
                </div>

                {(settings.totemUpsellMode || 'auto') === 'auto' ? (
                  <div className="pt-2 text-slate-600 space-y-3">
                    <p className="text-xs font-semibold leading-relaxed">
                      💡 No <strong className="text-indigo-600">Modo Inteligente</strong>, nosso algoritmo heurístico mapeia as categorias de <span className="font-bold">Acompanhamentos, Bebidas e Sobremesas</span> e as exibe de forma rotativa e limpa no checkout. Você não precisa fazer nada!
                    </p>
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-[10px] font-semibold text-amber-800">
                      Ideal para quem busca facilidade e quer que o sistema faça o trabalho pesado sozinho usando as categorias cadastradas no estoque.
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                        ✏️ No <strong className="text-indigo-600">Modo Manual</strong>, você pode escolher exatamente quais produtos quer sugerir. Marque os itens abaixo para ativá-los no carrossel de sugestão do Totem.
                      </p>
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2.5 py-1 rounded-md inline-block mt-1">
                        {(settings.totemUpsellProducts || []).length} produtos selecionados para sugestão
                      </span>
                    </div>

                    {/* Filters & Search */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Buscar produtos para sugerir..."
                          value={totemSearch}
                          onChange={(e) => setTotemSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-white border rounded-xl outline-none text-xs font-bold focus:border-indigo-500 transition-all shadow-sm"
                        />
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        {totemSearch && (
                          <button
                            onClick={() => setTotemSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                          >
                            Limpar
                          </button>
                        )}
                      </div>
                      <div className="relative shrink-0">
                        <select
                          value={totemCategoryFilter}
                          onChange={(e) => setTotemCategoryFilter(e.target.value)}
                          className="appearance-none bg-white border rounded-xl pl-4 pr-10 py-3 text-xs font-bold outline-none focus:border-indigo-500 transition-all shadow-sm"
                        >
                          <option value="all">Todas as Categorias</option>
                          {categories.map(c => c && (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                      </div>
                    </div>

                    {/* Products Grid to select manual upsells */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {products
                        .filter(p => {
                          const matchesSearch = p.name.toLowerCase().includes(totemSearch.toLowerCase()) || 
                                                (p.category || '').toLowerCase().includes(totemSearch.toLowerCase());
                          const matchesCat = totemCategoryFilter === 'all' || p.category === totemCategoryFilter;
                          return matchesSearch && matchesCat;
                        })
                        .map(p => {
                          const isSelected = (settings.totemUpsellProducts || []).includes(p.id);
                          return (
                            <button
                              key={p.id}
                              onClick={() => {
                                const currentProducts = settings.totemUpsellProducts || [];
                                const newProducts = currentProducts.includes(p.id)
                                  ? currentProducts.filter(id => id !== p.id)
                                  : [...currentProducts, p.id];
                                onUpdateSettings({
                                  ...settings,
                                  totemUpsellProducts: newProducts
                                });
                              }}
                              className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                                isSelected
                                  ? 'bg-amber-50/50 border-amber-400 shadow-md shadow-amber-400/5 ring-1 ring-amber-400'
                                  : 'bg-white border-slate-100 hover:border-slate-200'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                                isSelected ? 'bg-amber-400 border-amber-400 text-amber-950' : 'border-slate-300 bg-slate-50'
                              }`}>
                                {isSelected && <Check size={12} strokeWidth={3} />}
                              </div>
                              
                              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-50 border flex items-center justify-center">
                                {p.image ? (
                                  <img src={p.image} className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={16} className="text-slate-300" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-xs truncate uppercase italic tracking-tight">{p.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] font-black text-slate-400 uppercase">{p.category}</span>
                                  <span className="text-[10px] font-bold text-slate-900">R$ {p.price.toFixed(2)}</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
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
                 <div className="h-32 shrink-0 relative bg-slate-100 flex items-center justify-center border-b overflow-hidden">
                    {settings.bannerUrl ? (
                      <img src={settings.bannerUrl} className="absolute inset-0 w-full h-full object-cover opacity-40" />
                    ) : (
                      <ImageIcon className="text-slate-300" size={32} />
                    )}
                    <div className="relative z-10 w-16 h-16 bg-white rounded-2xl shadow-lg border-2 border-white overflow-hidden">
                      {settings.logoUrl ? (
                        <img src={settings.logoUrl} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300"><Store size={24} /></div>
                      )}
                    </div>
                 </div>
                 <div className="p-6 space-y-4">
                    <div className="h-4 bg-slate-100 rounded-full w-3/4" style={{ backgroundColor: `${settings.primaryColor}20` }}></div>
                    <div className="h-3 bg-slate-100 rounded-full w-1/2"></div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                       <div className="h-20 bg-slate-50 rounded-2xl border border-slate-100"></div>
                       <div className="h-20 bg-slate-50 rounded-2xl border border-slate-100"></div>
                    </div>
                    <div className="h-12 rounded-2xl mt-4" style={{ backgroundColor: settings.primaryColor, opacity: 0.2 }}></div>
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
        <div className="flex bg-white/10 p-1 rounded-xl border border-white/10">
          <button 
            onClick={() => setPreviewDevice('mobile')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${previewDevice === 'mobile' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`}
          >
            Mobile
          </button>
          <button 
            onClick={() => setPreviewDevice('desktop')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${previewDevice === 'desktop' ? 'bg-white text-slate-900' : 'text-white hover:bg-white/10'}`}
          >
            Desktop
          </button>
        </div>
        <button onClick={() => setShowTestMode(false)} className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20"><X size={20} /> Encerrar Teste</button>
      </div>
      
      <div className={`transition-all duration-500 shadow-2xl overflow-hidden relative ${previewDevice === 'mobile' ? 'w-[380px] h-[780px] rounded-[3.5rem] border-[12px] border-slate-800' : 'w-[90vw] h-[85vh] rounded-3xl border-8 border-slate-800'}`}>
         {/* Status Bar Mock (Mobile only) */}
         {previewDevice === 'mobile' && (
           <div className="absolute top-0 inset-x-0 h-6 flex justify-between items-center px-8 z-[110]">
              <span className="text-[10px] font-bold text-white">12:45</span>
              <div className="flex gap-1.5"><div className="w-3 h-3 bg-white/20 rounded-full"></div><div className="w-3 h-3 bg-white/20 rounded-full"></div></div>
           </div>
         )}

         <div className="h-full bg-white flex flex-col relative overflow-y-auto custom-scrollbar">
            <DigitalMenu 
              settings={settings} 
              products={products} 
              isSimulation={true}
              isDeliveryEnabled={isDeliveryEnabled}
              isPickupEnabled={isPickupEnabled}
              deliveryFee={deliveryFee}
              minOrderValue={minOrderValue}
              estimatedDeliveryTime={estimatedDeliveryTime}
              estimatedPickupTime={estimatedPickupTime}
              onPlaceOrder={(order) => {
                onPlaceDigitalOrder(order);
                // The DigitalMenu component handles the success view
              }}
            />
         </div>
      </div>
    </div>
  )}
    </div>
  );
};

export default DigitalMenuConfig;
