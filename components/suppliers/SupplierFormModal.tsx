import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  DollarSign, 
  Truck, 
  X, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Layers, 
  Calendar,
  CreditCard,
  FileText
} from 'lucide-react';
import { B2BSupplier, SupplierType, SupplierStatus, FreightType, SupplierProductItem } from './types';
import { SUPPLIER_CATEGORIES } from './defaultSuppliersData';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplierData: B2BSupplier) => void;
  existingSupplier?: B2BSupplier | null;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingSupplier
}) => {
  const [activeStep, setActiveStep] = useState<'basics' | 'contact' | 'address' | 'coverage' | 'commercial' | 'products'>('basics');

  // Dados Básicos
  const [corporateName, setCorporateName] = useState(existingSupplier?.corporateName || '');
  const [tradeName, setTradeName] = useState(existingSupplier?.tradeName || '');
  const [cnpj, setCnpj] = useState(existingSupplier?.cnpj || '');
  const [category, setCategory] = useState(existingSupplier?.category || 'Carnes');
  const [customCategory, setCustomCategory] = useState('');
  const [supplierType, setSupplierType] = useState<SupplierType>(existingSupplier?.supplierType || 'distribuidor');
  const [status, setStatus] = useState<SupplierStatus>(existingSupplier?.status || 'active');

  // Contato
  const [phone, setPhone] = useState(existingSupplier?.phone || '');
  const [whatsapp, setWhatsapp] = useState(existingSupplier?.whatsapp || '');
  const [email, setEmail] = useState(existingSupplier?.email || '');
  const [website, setWebsite] = useState(existingSupplier?.website || '');
  const [contactPerson, setContactPerson] = useState(existingSupplier?.contactPerson || '');

  // Endereço
  const [cep, setCep] = useState(existingSupplier?.cep || '');
  const [street, setStreet] = useState(existingSupplier?.street || '');
  const [number, setNumber] = useState(existingSupplier?.number || '');
  const [complement, setComplement] = useState(existingSupplier?.complement || '');
  const [neighborhood, setNeighborhood] = useState(existingSupplier?.neighborhood || '');
  const [city, setCity] = useState(existingSupplier?.city || 'São Paulo');
  const [state, setState] = useState(existingSupplier?.state || 'SP');

  // Região de Atendimento
  const [servedCitiesInput, setServedCitiesInput] = useState(existingSupplier?.servedCities.join(', ') || 'São Paulo, Ribeirão Preto, Campinas');
  const [servedRegionsInput, setServedRegionsInput] = useState(existingSupplier?.servedRegions.join(', ') || 'Interior SP, Grande SP');
  const [maxDistance, setMaxDistance] = useState(existingSupplier?.maxDeliveryDistanceKm?.toString() || '300');

  // Comercial
  const [minOrder, setMinOrder] = useState(existingSupplier?.minOrderValue?.toString() || '350');
  const [avgDeliveryDays, setAvgDeliveryDays] = useState(existingSupplier?.avgDeliveryDays?.toString() || '2');
  const [deliveryDaysInput, setDeliveryDaysInput] = useState(existingSupplier?.deliveryDays.join(', ') || 'Segunda-feira, Quarta-feira, Sexta-feira');
  const [paymentMethodsInput, setPaymentMethodsInput] = useState(existingSupplier?.paymentMethods.join(', ') || 'Boleto 28 dias, Pix');
  const [paymentTerms, setPaymentTerms] = useState(existingSupplier?.paymentTerms || '28 dias faturado');
  const [freightType, setFreightType] = useState<FreightType>(existingSupplier?.freightType || 'CIF');
  const [deliveryFee, setDeliveryFee] = useState(existingSupplier?.deliveryFee?.toString() || '0');
  const [notes, setNotes] = useState(existingSupplier?.notes || '');

  // Initial Products List
  const [products, setProducts] = useState<SupplierProductItem[]>(existingSupplier?.products || [
    {
      id: 'p-init-1',
      productId: 'prod-init-1',
      productName: 'Bife Bovino kg',
      category: 'Carnes',
      unit: 'KG',
      price: 33.50,
      lastUpdated: 'Hoje',
      availability: 'available'
    }
  ]);
  const [tempProdName, setTempProdName] = useState('');
  const [tempProdUnit, setTempProdUnit] = useState('KG');
  const [tempProdPrice, setTempProdPrice] = useState('');

  if (!isOpen) return null;

  const handleAddTempProduct = () => {
    const priceNum = parseFloat(tempProdPrice.replace(',', '.'));
    if (!tempProdName.trim() || isNaN(priceNum) || priceNum <= 0) return;

    setProducts([
      ...products,
      {
        id: `p-${Date.now()}`,
        productId: `prod-${Date.now()}`,
        productName: tempProdName.trim(),
        category: category,
        unit: tempProdUnit,
        price: priceNum,
        lastUpdated: new Intl.DateTimeFormat('pt-BR').format(new Date()),
        availability: 'available'
      }
    ]);
    setTempProdName('');
    setTempProdPrice('');
  };

  const handleRemoveProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeName.trim()) {
      alert('Por favor informe o Nome Fantasia do fornecedor.');
      return;
    }

    const finalCategory = category === 'Outros' && customCategory.trim() ? customCategory.trim() : category;

    const servedCities = servedCitiesInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const servedRegions = servedRegionsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const deliveryDays = deliveryDaysInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const paymentMethods = paymentMethodsInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const historyRecord: Record<string, { date: string; price: number }[]> = {};
    products.forEach(p => {
      historyRecord[p.productName] = [
        { date: 'Atual', price: p.price }
      ];
    });

    const newSupplier: B2BSupplier = {
      id: existingSupplier?.id || `sup-${Date.now()}`,
      corporateName: corporateName.trim() || tradeName.trim(),
      tradeName: tradeName.trim(),
      cnpj: cnpj.trim() || '00.000.000/0001-00',
      category: finalCategory,
      supplierType,
      status,
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || phone.trim(),
      email: email.trim(),
      website: website.trim(),
      contactPerson: contactPerson.trim(),
      cep: cep.trim(),
      street: street.trim(),
      number: number.trim(),
      complement: complement.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim() || 'São Paulo',
      state: state.trim() || 'SP',
      servedCities: servedCities.length ? servedCities : [city.trim() || 'São Paulo'],
      servedRegions: servedRegions.length ? servedRegions : ['Geral'],
      maxDeliveryDistanceKm: parseFloat(maxDistance) || 200,
      deliversToRestaurant: true,
      minOrderValue: parseFloat(minOrder) || 0,
      avgDeliveryDays: parseInt(avgDeliveryDays) || 1,
      deliveryDays: deliveryDays.length ? deliveryDays : ['Segunda a Sexta'],
      paymentMethods: paymentMethods.length ? paymentMethods : ['Boleto', 'Pix'],
      paymentTerms: paymentTerms.trim() || 'À vista / Boleto',
      freightType,
      deliveryFee: parseFloat(deliveryFee) || 0,
      notes: notes.trim(),
      products,
      history: existingSupplier?.history || historyRecord,
      createdAt: existingSupplier?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPartner: true,
      rating: existingSupplier?.rating || 4.8
    };

    onSave(newSupplier);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[140] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {existingSupplier ? 'Editar Fornecedor B2B' : '+ Cadastrar Novo Fornecedor B2B'}
              </h2>
              <p className="text-[11px] text-emerald-100 font-semibold">
                Cadastre a empresa e estruture as condições comerciais para a rede de restaurantes
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Multi-step Header */}
        <div className="bg-slate-50 border-b border-slate-150 px-6 py-2.5 flex items-center gap-2 overflow-x-auto text-[11px] font-black uppercase tracking-wider custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveStep('basics')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 ${
              activeStep === 'basics' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Dados Básicos
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('contact')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 ${
              activeStep === 'contact' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Contato
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('address')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 ${
              activeStep === 'address' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            3. Endereço
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('coverage')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 ${
              activeStep === 'coverage' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            4. Atendimento
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('commercial')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 ${
              activeStep === 'commercial' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            5. Comercial
          </button>
          <button
            type="button"
            onClick={() => setActiveStep('products')}
            className={`px-3 py-1.5 rounded-xl transition-all shrink-0 ${
              activeStep === 'products' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            6. Produtos ({products.length})
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
          {activeStep === 'basics' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Nome Fantasia *</label>
                  <input
                    type="text"
                    required
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="Ex: Frigorífico Boi Gordo"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Razão Social</label>
                  <input
                    type="text"
                    value={corporateName}
                    onChange={(e) => setCorporateName(e.target.value)}
                    placeholder="Ex: Frigorífico Boi Gordo Distribuidora Ltda"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Categoria Principal</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {SUPPLIER_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {category === 'Outros' && (
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Nome da Categoria Personalizada</label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Ex: Automação Comercial, Sorvetes Especiais"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Tipo de Fornecedor</label>
                  <select
                    value={supplierType}
                    onChange={(e) => setSupplierType(e.target.value as SupplierType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="distribuidor">Distribuidor</option>
                    <option value="atacadista">Atacadista</option>
                    <option value="produtor">Produtor Direto</option>
                    <option value="frigorifico">Frigorífico</option>
                    <option value="hortifruti">Hortifruti</option>
                    <option value="bebidas">Distribuidor de Bebidas</option>
                    <option value="embalagens">Embalagens / Descartáveis</option>
                    <option value="limpeza">Produtos de Limpeza</option>
                    <option value="equipamentos">Equipamentos Food Service</option>
                    <option value="insumos">Insumos & Ingredientes</option>
                    <option value="servicos">Serviços Especializados</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SupplierStatus)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="active">Ativo (Habilitado para Cotações e Pedidos)</option>
                    <option value="pending">Em Homologação / Cadastro</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeStep === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Telefone Principal</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 3456-7890"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">WhatsApp Comercial</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">E-mail para Pedidos / Cotações</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pedidos@fornecedor.com.br"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Pessoa de Contato / Consultor</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Ex: Renato Faria (Representante)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Website / Catálogo Online</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://fornecedor.com.br"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeStep === 'address' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">CEP</label>
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="14010-000"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Logradouro / Rua</label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Av. Brasil, Rodovia..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Número</label>
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="1500"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Complemento / Galpão</label>
                  <input
                    type="text"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    placeholder="Bloco B, Galpão 3"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Bairro</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Distrito Industrial"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Cidade Sede</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Ribeirão Preto"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    placeholder="SP"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {activeStep === 'coverage' && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                  Cidades Atendidas (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={servedCitiesInput}
                  onChange={(e) => setServedCitiesInput(e.target.value)}
                  placeholder="Ribeirão Preto, Sertãozinho, Pradópolis, Cravinhos, São Paulo"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                  Macrorregiões Atendidas (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={servedRegionsInput}
                  onChange={(e) => setServedRegionsInput(e.target.value)}
                  placeholder="Região Metropolitana de Ribeirão Preto, Grande SP, Sul de Minas"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                  Distância Máxima de Entrega (km a partir da sede)
                </label>
                <input
                  type="number"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(e.target.value)}
                  placeholder="Ex: 250"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {activeStep === 'commercial' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Pedido Mínimo (R$)</label>
                  <input
                    type="number"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    placeholder="300"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Prazo Médio de Entrega (Dias)</label>
                  <input
                    type="number"
                    value={avgDeliveryDays}
                    onChange={(e) => setAvgDeliveryDays(e.target.value)}
                    placeholder="2"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Modalidade de Frete</label>
                  <select
                    value={freightType}
                    onChange={(e) => setFreightType(e.target.value as FreightType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CIF">Frete Incluso (CIF)</option>
                    <option value="FREE_ABOVE_MIN">Grátis acima do Pedido Mínimo</option>
                    <option value="VARIABLE">Frete Calculado por KM/Peso</option>
                    <option value="FOB">FOB (Por conta do restaurante)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Taxa Fixa de Entrega (R$)</label>
                  <input
                    type="number"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    placeholder="0"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Dias de Entrega na Semana</label>
                  <input
                    type="text"
                    value={deliveryDaysInput}
                    onChange={(e) => setDeliveryDaysInput(e.target.value)}
                    placeholder="Segunda-feira, Quarta-feira, Sexta-feira"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Formas de Pagamento (separadas por vírgula)</label>
                  <input
                    type="text"
                    value={paymentMethodsInput}
                    onChange={(e) => setPaymentMethodsInput(e.target.value)}
                    placeholder="Boleto Faturado 28d, Pix, Cartão B2B"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Prazo de Pagamento Padrão</label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="28 dias líquido"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Observações Comerciais</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Informações adicionais de logística, frota refrigerada, laudos ou políticas de devolução..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeStep === 'products' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Adicionar Produto / Insumo ao Catálogo Inicial
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Nome do produto (ex: Bife Bovino)"
                      value={tempProdName}
                      onChange={(e) => setTempProdName(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs"
                    />
                  </div>
                  <div>
                    <select
                      value={tempProdUnit}
                      onChange={(e) => setTempProdUnit(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs"
                    >
                      <option value="KG">KG</option>
                      <option value="UN">UN</option>
                      <option value="LT">LT</option>
                      <option value="CX">CX</option>
                      <option value="FD">FD</option>
                      <option value="GL">GL</option>
                      <option value="BD">BD</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Preço (R$)"
                      value={tempProdPrice}
                      onChange={(e) => setTempProdPrice(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddTempProduct}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl font-black shrink-0 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Added Products Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-150">
                    <tr>
                      <th className="py-2.5 px-4">Produto</th>
                      <th className="py-2.5 px-3">Unidade</th>
                      <th className="py-2.5 px-3">Preço Unitário</th>
                      <th className="py-2.5 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-4 font-bold text-slate-800">{p.productName}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-600">{p.unit}</td>
                        <td className="py-2.5 px-3 font-black text-emerald-700">R$ {p.price.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(p.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400 font-semibold">
                          Nenhum produto cadastrado ainda. Adicione pelo menos um item acima.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div>
              {activeStep !== 'basics' && (
                <button
                  type="button"
                  onClick={() => {
                    const steps: ('basics' | 'contact' | 'address' | 'coverage' | 'commercial' | 'products')[] = [
                      'basics', 'contact', 'address', 'coverage', 'commercial', 'products'
                    ];
                    const currentIndex = steps.indexOf(activeStep);
                    if (currentIndex > 0) setActiveStep(steps[currentIndex - 1]);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100 text-xs"
                >
                  Voltar Etapa
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeStep !== 'products' ? (
                <button
                  type="button"
                  onClick={() => {
                    const steps: ('basics' | 'contact' | 'address' | 'coverage' | 'commercial' | 'products')[] = [
                      'basics', 'contact', 'address', 'coverage', 'commercial', 'products'
                    ];
                    const currentIndex = steps.indexOf(activeStep);
                    if (currentIndex < steps.length - 1) setActiveStep(steps[currentIndex + 1]);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider text-[11px] shadow-sm"
                >
                  Avançar
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-[11px] shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} /> Concluir Cadastro
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
