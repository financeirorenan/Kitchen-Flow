import React, { useState, useMemo, useEffect } from 'react';
import { 
  Flame, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  Store, 
  Package, 
  Search, 
  Save, 
  Eye, 
  Tag, 
  Sliders, 
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { Tenant, Product, CityBestSellerItem, CityBestSellersConfig } from '../../../types';

interface CityBestSellersManagerViewProps {
  tenants: Tenant[];
  marketplaceProducts?: Product[];
  currentConfig?: CityBestSellersConfig;
  onSaveConfig: (newConfig: CityBestSellersConfig) => Promise<void>;
  onChangeConfig?: (newConfig: CityBestSellersConfig) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const BADGE_PRESETS = [
  '🔥 #1 MAIS PEDIDO',
  '🍔 FAVORITO DA CIDADE',
  '⭐ RECOMENDAÇÃO DO CHEF',
  '👑 CAMPEÃO DE VENDAS',
  '🍣 DESTAQUE DA SEMANA',
  '🏷️ SUPER OFERTA',
  '🍕 MAIS BEM AVALIADO',
  '🍧 MAIS PEDIDO DO DIA',
];

export const CityBestSellersManagerView: React.FC<CityBestSellersManagerViewProps> = ({
  tenants,
  marketplaceProducts = [],
  currentConfig,
  onSaveConfig,
  onChangeConfig,
  showToast,
}) => {
  // Extrair todas as cidades dos estabelecimentos cadastrados
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    tenants.forEach(t => {
      const addr = (t as any).city || t.address || '';
      const parts = addr.split('-').map((s: string) => s.trim());
      if (parts.length >= 2) {
        citySet.add(parts[parts.length - 2]);
      } else if (addr) {
        citySet.add(addr.split(',')[0].trim());
      }
    });
    // Cidade padrão sempre presente
    citySet.add('Pradópolis');
    return Array.from(citySet).filter(Boolean);
  }, [tenants]);

  const [selectedCity, setSelectedCity] = useState<string>(
    currentConfig?.defaultCity || availableCities[0] || 'Pradópolis'
  );
  const [newCityInput, setNewCityInput] = useState('');
  const [isAddingNewCity, setIsAddingNewCity] = useState(false);

  // Estados de configuração local
  const [mode, setMode] = useState<'auto' | 'curated' | 'promotions' | 'mixed'>(
    currentConfig?.mode || 'mixed'
  );
  const [defaultCity, setDefaultCity] = useState<string>(
    currentConfig?.defaultCity || 'Pradópolis'
  );
  const [maxItemsPerCity, setMaxItemsPerCity] = useState<number>(
    currentConfig?.maxItemsPerCity || 10
  );
  const [customItemsByCity, setCustomItemsByCity] = useState<Record<string, CityBestSellerItem[]>>(
    currentConfig?.customItemsByCity || {
      'Pradópolis': [
        {
          id: 'dish-pepperoni',
          name: 'Pizza Pepperoni Especial Grande (8 Fatias)',
          storeName: 'Pizzaria Bella Napoli',
          tenantId: 'tenant-bella-napoli',
          price: 54.90,
          image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?q=80&w=600&auto=format&fit=crop',
          badge: '🔥 #1 MAIS PEDIDO EM PRADÓPOLIS',
          city: 'Pradópolis',
          active: true,
          priority: 1
        },
        {
          id: 'dish-smash',
          name: 'Smash Burger Duplo Cheddar & Bacon',
          storeName: 'Burger Artesanal 99',
          tenantId: 'tenant-burger-artesanal',
          price: 34.90,
          image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop',
          badge: '🍔 FAVORITO DA CIDADE',
          city: 'Pradópolis',
          active: true,
          priority: 2
        },
        {
          id: 'dish-sushi',
          name: 'Combo Salmão Prime (20 Peças Frescas)',
          storeName: 'Sushi Master Express',
          tenantId: 'tenant-sushi-master',
          price: 68.90,
          image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=600&auto=format&fit=crop',
          badge: '🍣 DESTAQUE DA SEMANA',
          city: 'Pradópolis',
          active: true,
          priority: 3
        }
      ]
    }
  );

  useEffect(() => {
    if (currentConfig) {
      if (currentConfig.mode) setMode(currentConfig.mode);
      if (currentConfig.defaultCity) {
        setDefaultCity(currentConfig.defaultCity);
      }
      if (currentConfig.maxItemsPerCity) setMaxItemsPerCity(currentConfig.maxItemsPerCity);
      if (currentConfig.customItemsByCity) setCustomItemsByCity(currentConfig.customItemsByCity);
    }
  }, [currentConfig]);

  useEffect(() => {
    onChangeConfig?.({
      mode,
      defaultCity,
      maxItemsPerCity,
      customItemsByCity,
      allowMerchantHighlight: true,
    });
  }, [mode, defaultCity, maxItemsPerCity, customItemsByCity]);

  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalTab, setAddModalTab] = useState<'real_products' | 'manual'>('real_products');
  const [productSearch, setProductSearch] = useState('');

  // Item sendo editado ou adicionado manualmente
  const [editingItem, setEditingItem] = useState<Partial<CityBestSellerItem>>({
    name: '',
    storeName: '',
    price: 0,
    image: '',
    badge: `🔥 #1 EM ${selectedCity.toUpperCase()}`,
    city: selectedCity,
    active: true
  });

  const currentCityItems = customItemsByCity[selectedCity] || [];

  // Filtrar produtos reais cadastrados nos cardápios
  const filteredRealProducts = useMemo(() => {
    return marketplaceProducts.filter(p => {
      if (p.active === false) return false;
      if (!p.name || !p.price) return false;
      if (productSearch) {
        const s = productSearch.toLowerCase();
        return p.name.toLowerCase().includes(s) || (p.category || '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [marketplaceProducts, productSearch]);

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const fullConfig: CityBestSellersConfig = {
        mode,
        defaultCity,
        maxItemsPerCity,
        customItemsByCity,
        allowMerchantHighlight: true
      };
      await onSaveConfig(fullConfig);
      if (showToast) {
        showToast('Configuração dos Mais Vendidos por Cidade salva com sucesso!', 'success');
      } else {
        alert('Configuração salva com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao salvar configuração:', err);
      if (showToast) {
        showToast('Erro ao salvar configurações.', 'error');
      } else {
        alert('Erro ao salvar.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRealProduct = (product: Product) => {
    const tenant = tenants.find(t => t.id === product.tenantId);
    const newItem: CityBestSellerItem = {
      id: product.id,
      name: product.name,
      storeName: tenant?.name || 'Restaurante Local',
      ...(product.tenantId ? { tenantId: product.tenantId } : {}),
      price: (product.isPromotional && product.promoPrice) ? product.promoPrice : product.price,
      ...(product.isPromotional && product.price ? { originalPrice: product.price } : {}),
      image: product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop',
      badge: currentCityItems.length === 0 ? `🔥 #1 EM ${selectedCity.toUpperCase()}` : '🍔 MAIS PEDIDO',
      city: selectedCity,
      priority: currentCityItems.length + 1,
      active: true
    };

    const updatedList = [...currentCityItems, newItem];
    setCustomItemsByCity(prev => ({
      ...prev,
      [selectedCity]: updatedList
    }));
    setShowAddModal(false);
    if (showToast) showToast(`Prato "${product.name}" adicionado aos Mais Vendidos de ${selectedCity}!`);
  };

  const handleSaveManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem.name || !editingItem.storeName) {
      alert('Preencha pelo menos o nome do prato e da loja parceira.');
      return;
    }

    const newItem: CityBestSellerItem = {
      id: editingItem.id || `dish-${Date.now()}`,
      name: editingItem.name || '',
      storeName: editingItem.storeName || '',
      ...(editingItem.tenantId ? { tenantId: editingItem.tenantId } : {}),
      price: Number(editingItem.price) || 0,
      ...(editingItem.originalPrice ? { originalPrice: Number(editingItem.originalPrice) } : {}),
      image: editingItem.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop',
      badge: editingItem.badge || `🔥 #1 EM ${selectedCity.toUpperCase()}`,
      city: selectedCity,
      priority: editingItem.priority || (currentCityItems.length + 1),
      active: editingItem.active !== false
    };

    const existingIndex = currentCityItems.findIndex(i => i.id === newItem.id);
    let updatedList: CityBestSellerItem[];
    if (existingIndex >= 0) {
      updatedList = [...currentCityItems];
      updatedList[existingIndex] = newItem;
    } else {
      updatedList = [...currentCityItems, newItem];
    }

    setCustomItemsByCity(prev => ({
      ...prev,
      [selectedCity]: updatedList
    }));
    setShowAddModal(false);
    setEditingItem({
      name: '',
      storeName: '',
      price: 0,
      image: '',
      badge: `🔥 #1 EM ${selectedCity.toUpperCase()}`,
      city: selectedCity,
      active: true
    });
    if (showToast) showToast('Prato salvo com sucesso!');
  };

  const handleToggleActive = (id: string) => {
    const updated = currentCityItems.map(item => {
      if (item.id === id) return { ...item, active: !item.active };
      return item;
    });
    setCustomItemsByCity(prev => ({ ...prev, [selectedCity]: updated }));
  };

  const handleDeleteItem = (id: string) => {
    if (!confirm('Deseja remover este prato da lista dos Mais Vendidos desta cidade?')) return;
    const updated = currentCityItems.filter(item => item.id !== id);
    setCustomItemsByCity(prev => ({ ...prev, [selectedCity]: updated }));
    if (showToast) showToast('Prato removido.');
  };

  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentCityItems.length) return;
    const items = [...currentCityItems];
    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;
    // Atualizar prioridades
    items.forEach((it, idx) => {
      it.priority = idx + 1;
    });
    setCustomItemsByCity(prev => ({ ...prev, [selectedCity]: items }));
  };

  const handleAddNewCity = () => {
    const trimmed = newCityInput.trim();
    if (!trimmed) return;
    if (!customItemsByCity[trimmed]) {
      setCustomItemsByCity(prev => ({ ...prev, [trimmed]: [] }));
    }
    setSelectedCity(trimmed);
    setNewCityInput('');
    setIsAddingNewCity(false);
    if (showToast) showToast(`Cidade "${trimmed}" configurada!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Quick Actions */}
      <div className="p-6 bg-gradient-to-r from-orange-600 to-amber-600 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
              <Flame size={14} className="text-amber-200 fill-amber-200" /> Curadoria Regional B2C
            </span>
            <span className="text-xs text-orange-100 font-bold">• {selectedCity}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Mais Vendidos & Destaques por Cidade
          </h2>
          <p className="text-xs text-orange-100/90 mt-1 max-w-2xl font-medium">
            Defina exatamente quais pratos, lanches e sobremesas são exibidos no carrossel "Mais Pedidos da Cidade" do Marketplace para clientes de cada município.
          </p>
        </div>
      </div>

      {/* Global Config & Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Sliders size={14} className="text-orange-500" /> Modo de Alimentação
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            <option value="mixed">🔀 Misto (Curados primeiro + Automático)</option>
            <option value="curated">🎯 Exclusivo (Apenas curados manualmente)</option>
            <option value="promotions">🏷️ Priorizar Promoções & Ofertas Locais</option>
            <option value="auto">🤖 100% Automático (Produtos mais pedidos)</option>
          </select>
          <p className="text-[10px] text-slate-400 font-medium">
            No modo "Misto", seus destaques aparecem primeiro e os demais pratos completam o carrossel.
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <MapPin size={14} className="text-orange-500" /> Cidade Padrão
          </label>
          <input
            type="text"
            value={defaultCity}
            onChange={(e) => setDefaultCity(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Ex: Pradópolis"
          />
          <p className="text-[10px] text-slate-400 font-medium">
            Usada quando o cliente não compartilha localização nem seleciona endereço.
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Tag size={14} className="text-orange-500" /> Limite Máximo de Itens
          </label>
          <input
            type="number"
            min={3}
            max={30}
            value={maxItemsPerCity}
            onChange={(e) => setMaxItemsPerCity(Number(e.target.value) || 10)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
          />
          <p className="text-[10px] text-slate-400 font-medium">
            Quantidade de pratos no carrossel de mais vendidos por cidade (recomendado: 10).
          </p>
        </div>
      </div>

      {/* City Tabs Selector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <MapPin size={13} className="text-orange-500" /> Escolha a Cidade para Configurar
          </span>
          {!isAddingNewCity && (
            <button
              onClick={() => setIsAddingNewCity(true)}
              className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus size={13} /> Adicionar Outra Cidade
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {Array.from(new Set([...availableCities, ...Object.keys(customItemsByCity)])).map(city => {
            const count = (customItemsByCity[city] || []).length;
            const isSelected = selectedCity.toLowerCase() === city.toLowerCase();
            return (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200 scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                <span>📍 {city}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}

          {isAddingNewCity && (
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-orange-300">
              <input
                type="text"
                autoFocus
                placeholder="Nome da cidade..."
                value={newCityInput}
                onChange={(e) => setNewCityInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewCity()}
                className="px-2 py-1 bg-transparent text-xs font-bold text-slate-800 outline-none"
              />
              <button
                onClick={handleAddNewCity}
                className="px-2.5 py-1 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600"
              >
                Adicionar
              </button>
              <button
                onClick={() => setIsAddingNewCity(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dishes List & Management */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Flame size={18} className="text-orange-500" />
              Pratos nos Mais Vendidos de {selectedCity} ({currentCityItems.length})
            </h3>
            <p className="text-[11px] font-medium text-slate-400">
              Estes são os pratos que aparecem com destaque no carrossel para os usuários de {selectedCity}.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingItem({
                name: '',
                storeName: '',
                price: 0,
                image: '',
                badge: `🔥 #1 EM ${selectedCity.toUpperCase()}`,
                city: selectedCity,
                active: true
              });
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 bg-orange-500 text-white rounded-xl font-black text-[11px] uppercase tracking-wider hover:bg-orange-600 transition-all shadow-md shadow-orange-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} /> Adicionar Prato aos Mais Vendidos
          </button>
        </div>

        {currentCityItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto">
              <Flame size={28} />
            </div>
            <h4 className="text-base font-black text-slate-800">
              Nenhum prato configurado manualmente para {selectedCity}
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No momento, o sistema preencherá automaticamente com os produtos reais das lojas ativas da cidade. Clique abaixo para curar pratos específicos.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-600 transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Adicionar Primeiro Prato
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {currentCityItems.map((item, index) => (
              <div
                key={item.id}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                  item.active ? 'bg-white hover:bg-orange-50/30' : 'bg-slate-50/60 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="w-6 text-center text-xs font-black text-slate-400">
                    #{index + 1}
                  </span>

                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/80">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg bg-orange-100 text-orange-700 text-[9px] font-black uppercase tracking-wider border border-orange-200">
                        {item.badge}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        🏪 {item.storeName}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-slate-900 truncate mt-1">
                      {item.name}
                    </h4>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-black text-emerald-600">
                        R$ {Number(item.price).toFixed(2)}
                      </span>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="text-[11px] font-bold text-slate-400 line-through">
                          R$ {Number(item.originalPrice).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => handleMoveOrder(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-slate-500 hover:text-orange-600 disabled:opacity-30 cursor-pointer"
                      title="Mover para cima"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMoveOrder(index, 'down')}
                      disabled={index === currentCityItems.length - 1}
                      className="p-1 text-slate-500 hover:text-orange-600 disabled:opacity-30 cursor-pointer"
                      title="Mover para baixo"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => handleToggleActive(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      item.active
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {item.active ? 'Ativo' : 'Pausado'}
                  </button>

                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setAddModalTab('manual');
                      setShowAddModal(true);
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                    title="Editar"
                  >
                    <Edit3 size={15} />
                  </button>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Adicionar / Editar Prato nos Mais Vendidos */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Flame size={18} className="text-orange-500" />
                  Adicionar aos Mais Vendidos de {selectedCity}
                </h3>
                <p className="text-[11px] font-medium text-slate-400">
                  Selecione um prato existente de um cardápio parceiro ou cadastre um destaque customizado.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                onClick={() => setAddModalTab('real_products')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  addModalTab === 'real_products'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📦 Pratos Reais dos Lojistas ({marketplaceProducts.length})
              </button>
              <button
                onClick={() => setAddModalTab('manual')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  addModalTab === 'manual'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✍️ Entrada Manual / Personalizada
              </button>
            </div>

            {addModalTab === 'real_products' ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar prato, hambúrguer, pizza, pastel pelo nome..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100 border rounded-2xl">
                  {filteredRealProducts.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Nenhum produto cadastrado encontrado com essa busca.
                    </div>
                  ) : (
                    filteredRealProducts.slice(0, 25).map(prod => {
                      const tenant = tenants.find(t => t.id === prod.tenantId);
                      const isAlreadyAdded = currentCityItems.some(i => i.id === prod.id);
                      return (
                        <div
                          key={prod.id}
                          className="p-3.5 flex items-center justify-between gap-3 hover:bg-orange-50/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                              {prod.image ? (
                                <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <Package size={16} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 truncate">{prod.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase truncate">
                                🏪 {tenant?.name || 'Restaurante Local'} • {prod.category}
                              </p>
                              <p className="text-xs font-black text-emerald-600 mt-0.5">
                                R$ {Number(prod.price).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleAddRealProduct(prod)}
                            disabled={isAlreadyAdded}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                              isAlreadyAdded
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm'
                            }`}
                          >
                            {isAlreadyAdded ? 'Já Adicionado' : 'Adicionar'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveManualItem} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nome do Prato *</label>
                    <input
                      type="text"
                      required
                      value={editingItem.name || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      placeholder="Ex: Pizza Quatro Queijos Especial"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nome do Restaurante Parceiro *</label>
                    <input
                      type="text"
                      required
                      value={editingItem.storeName || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, storeName: e.target.value })}
                      placeholder="Ex: Pizzaria Bella Napoli"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Preço de Venda (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingItem.price || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                      placeholder="49.90"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Preço Original / Riscado (R$) Opcional</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingItem.originalPrice || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, originalPrice: parseFloat(e.target.value) || undefined })}
                      placeholder="59.90"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">URL da Imagem do Prato</label>
                  <input
                    type="url"
                    value={editingItem.image || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, image: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Selo / Badge em Destaque</label>
                  <div className="flex flex-wrap gap-1.5">
                    {BADGE_PRESETS.map(badge => (
                      <button
                        key={badge}
                        type="button"
                        onClick={() => setEditingItem({ ...editingItem, badge })}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          editingItem.badge === badge
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {badge}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={editingItem.badge || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, badge: e.target.value })}
                    placeholder="Ou digite um selo customizado..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-orange-600 shadow-md shadow-orange-200 cursor-pointer"
                  >
                    Salvar Prato
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CityBestSellersManagerView;
