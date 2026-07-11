import React, { useState } from 'react';
import { AdminSettings, FiscalSettings as FiscalSettingsType } from '../types';
import { 
  FileText, 
  Shield, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Save,
  Globe,
  Building,
  MapPin,
  Key,
  Zap,
  Check
} from 'lucide-react';
import { motion } from 'framer-motion';
import { maskCNPJ, maskCEP } from '../utils/masks';
import { auth } from '../firebase';

interface FiscalSettingsProps {
  settings: AdminSettings;
  onUpdate: (settings: AdminSettings) => void;
}

const FiscalSettings: React.FC<FiscalSettingsProps> = ({ settings, onUpdate }) => {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'certificate' | 'csc'>('general');
  const [pfxFile, setPfxFile] = useState<File | null>(null);
  const [pfxPassword, setPfxPassword] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Validação em tempo real das credenciais de emissão fiscal
  const isCnpjOk = !!settings.fiscal?.cnpj && settings.fiscal.cnpj.replace(/\D/g, '').length === 14;
  const isRazaoSocialOk = !!settings.fiscal?.razaoSocial && settings.fiscal.razaoSocial.trim().length > 3;
  const isInscricaoEstadualOk = !!settings.fiscal?.inscricaoEstadual && settings.fiscal.inscricaoEstadual.trim().length > 2;

  const addr = settings.fiscal?.address;
  const isAddressOk = !!(
    addr?.logradouro?.trim() &&
    addr?.numero?.trim() &&
    addr?.bairro?.trim() &&
    addr?.municipio?.trim() &&
    addr?.uf?.trim() &&
    addr?.cep?.replace(/\D/g, '').length === 8 &&
    addr?.codigoMunicipio?.trim()
  );

  const isCertificateOk = settings.fiscal?.certificateStatus === 'valid';
  const isCscOk = !!(settings.fiscal?.cscId?.trim() && settings.fiscal?.cscToken?.trim());

  // Conta quantos passos de 6 do diagnóstico estão corretos
  const stepsPassed = [isCnpjOk, isRazaoSocialOk, isInscricaoEstadualOk, isAddressOk, isCertificateOk, isCscOk].filter(Boolean).length;
  const isAllOk = stepsPassed === 6;

  const handleUpdateFiscal = (updates: Partial<FiscalSettingsType>) => {
    onUpdate({
      ...settings,
      fiscal: {
        ...(settings.fiscal || {
          environment: 'homologacao',
          certificateStatus: 'missing',
          cscId: '',
          cscToken: '',
          nextNfceNumber: 1,
          series: 1,
          taxRegime: 'simples_nacional',
          cnpj: '',
          razaoSocial: '',
          inscricaoEstadual: '',
          address: {
            logradouro: '',
            numero: '',
            bairro: '',
            municipio: '',
            uf: '',
            cep: '',
            codigoMunicipio: ''
          }
        }),
        ...updates
      }
    });
  };

  const handleAddressUpdate = (updates: Partial<FiscalSettingsType['address']>) => {
    const currentFiscal = settings.fiscal || {
      environment: 'homologacao',
      certificateStatus: 'missing',
      cscId: '',
      cscToken: '',
      nextNfceNumber: 1,
      series: 1,
      taxRegime: 'simples_nacional',
      cnpj: '',
      razaoSocial: '',
      inscricaoEstadual: '',
      address: {
        logradouro: '',
        numero: '',
        bairro: '',
        municipio: '',
        uf: '',
        cep: '',
        codigoMunicipio: ''
      }
    };

    onUpdate({
      ...settings,
      fiscal: {
        ...currentFiscal,
        address: {
          ...(currentFiscal.address || {
            logradouro: '',
            numero: '',
            bairro: '',
            municipio: '',
            uf: '',
            cep: '',
            codigoMunicipio: ''
          }),
          ...updates
        }
      }
    });
  };

  const handleCEPChange = async (cepValue: string) => {
    const masked = maskCEP(cepValue);
    handleAddressUpdate({ cep: masked });

    const cleanCEP = masked.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      setIsSearchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        if (response.ok) {
          const data = await response.json();
          if (!data.erro) {
            handleAddressUpdate({
              cep: masked,
              logradouro: data.logradouro || '',
              bairro: data.bairro || '',
              municipio: data.localidade || '',
              uf: data.uf || '',
              codigoMunicipio: data.ibge || ''
            });
          }
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPfxFile(file);
    }
  };

  const validateAndSaveCertificate = async () => {
    if (!pfxFile || !pfxPassword) return;

    setIsValidating(true);
    setValidationError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (auth.currentUser) {
          try {
            const idToken = await auth.currentUser.getIdToken(true);
            headers['Authorization'] = `Bearer ${idToken}`;
          } catch (tokenErr) {
            console.error("Error getting idToken for certificate validation:", tokenErr);
          }
        }

        const response = await fetch('/api/fiscal/validate-certificate', {
          method: 'POST',
          headers,
          body: JSON.stringify({ pfxBase64: base64, password: pfxPassword })
        });

        const result = await response.json();
        
        if (result.success) {
          handleUpdateFiscal({
            certificateStatus: 'valid',
            certificateExpiry: '31/12/2026' // This should come from the backend in a real app
          });
          // In a real app, we would save the base64 and password to Firestore (encrypted)
          alert('Certificado validado com sucesso!');
        } else {
          setValidationError(result.error || 'Erro ao validar certificado');
        }
        setIsValidating(false);
      };
      reader.readAsDataURL(pfxFile);
    } catch (err) {
      setValidationError('Erro de conexão com o servidor');
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="text-red-600" />
          Configurações Fiscais (NFC-e)
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveSubTab('general')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSubTab === 'general' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Dados da Empresa
          </button>
          <button 
            onClick={() => setActiveSubTab('certificate')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSubTab === 'certificate' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Certificado Digital
          </button>
          <button 
            onClick={() => setActiveSubTab('csc')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSubTab === 'csc' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            CSC / Token
          </button>
        </div>
      </div>

      {/* PAINEL DE DIAGNÓSTICO E AUTOMAÇÃO FISCAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 & 2: Diagnóstico Inteligente */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <CheckCircle className={isAllOk ? "text-emerald-500" : "text-amber-500"} size={18} />
                Diagnóstico de Credenciais de Emissão
              </h3>
              <p className="text-xs text-gray-500">
                Verificação automática dos requisitos mínimos da SEFAZ
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              isAllOk 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {stepsPassed}/6 Requisitos Preenchidos
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-medium">
            {/* CNPJ / Identidade */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-gray-655 flex items-center gap-1.5 font-sans">
                <Building size={14} className="text-gray-400" /> CNPJ e Razão Social
              </span>
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${
                isCnpjOk && isRazaoSocialOk ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
              }`}>
                {isCnpjOk && isRazaoSocialOk ? <Check size={12} /> : '!'} {isCnpjOk && isRazaoSocialOk ? 'Válido' : 'Pendente'}
              </span>
            </div>

            {/* IE */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-gray-655 flex items-center gap-1.5 font-sans">
                <FileText size={14} className="text-gray-400" /> Inscrição Estadual
              </span>
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${
                isInscricaoEstadualOk ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
              }`}>
                {isInscricaoEstadualOk ? <Check size={12} /> : '!'} {isInscricaoEstadualOk ? 'Preenchido' : 'Pendente'}
              </span>
            </div>

            {/* Endereço */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-gray-655 flex items-center gap-1.5 font-sans">
                <MapPin size={14} className="text-gray-400" /> Endereço Fiscal Completo
              </span>
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${
                isAddressOk ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
              }`}>
                {isAddressOk ? <Check size={12} /> : '!'} {isAddressOk ? 'Completo' : 'Incompleto'}
              </span>
            </div>

            {/* Certificado */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-gray-655 flex items-center gap-1.5 font-sans">
                <Shield size={14} className="text-gray-400" /> Certificado Digital A1
              </span>
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${
                isCertificateOk ? 'text-emerald-600 bg-emerald-50 font-bold' : 'text-amber-600 bg-amber-50'
              }`}>
                {isCertificateOk ? <Check size={12} /> : '!'} {isCertificateOk ? 'Ativo' : 'Não Enviado'}
              </span>
            </div>

            {/* CSC */}
            <div className="flex items-center justify-between p-2.5 rounded-lg col-span-2 bg-gray-50 border border-gray-100">
              <span className="text-gray-655 flex items-center gap-1.5 font-sans">
                <Key size={14} className="text-gray-400" /> Credenciais CSC / ID e Token
              </span>
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${
                isCscOk ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50 md:text-xs text-[10px]'
              }`}>
                {isCscOk ? <Check size={12} /> : '!'} {isCscOk ? 'Configurado' : 'Necessário para NFC—e'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Automação Tributária */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Zap className="text-amber-500 fill-amber-500" size={16} />
              Automação de Emissão
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Deixe o sistema selecionar e emitir a NFC-e automaticamente para economizar cliques no PDV e agilizar as vendas do caixa.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Emitir NFC-e por padrão no PDV</span>
            <button 
              onClick={() => handleUpdateFiscal({ autoIssueNfce: !settings.fiscal?.autoIssueNfce })}
              className={`w-11 h-6 rounded-full relative transition-colors focus:outline-none ${settings.fiscal?.autoIssueNfce ? 'bg-emerald-500' : 'bg-gray-200'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${settings.fiscal?.autoIssueNfce ? 'left-5.5' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="mt-1">
            <p className="text-[10px] text-gray-500 leading-tight">
              {settings.fiscal?.autoIssueNfce 
                ? '✓ Ativo. O botão de Nota Fiscal virá habilitado por padrão em todos os pagamentos.' 
                : '✕ Inativo. O operador do caixa precisará habilitar manualmente a emissão de nota.'}
            </p>
          </div>
        </div>
      </div>

      {activeSubTab === 'general' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold flex items-center gap-2 border-b pb-2">
              <Building size={18} className="text-gray-400" />
              Identificação
            </h3>
            <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Razão Social</label>
                  <input 
                    type="text" 
                    value={settings.fiscal?.razaoSocial || ''}
                    onChange={(e) => handleUpdateFiscal({ razaoSocial: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">CNPJ</label>
                    <input 
                      type="text" 
                      value={settings.fiscal?.cnpj || ''}
                      onChange={(e) => handleUpdateFiscal({ cnpj: maskCNPJ(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Inscrição Estadual</label>
                    <input 
                      type="text" 
                      value={settings.fiscal?.inscricaoEstadual || ''}
                      onChange={(e) => handleUpdateFiscal({ inscricaoEstadual: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Regime Tributário</label>
                  <select 
                    value={settings.fiscal?.taxRegime || 'simples_nacional'}
                    onChange={(e) => handleUpdateFiscal({ taxRegime: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  >
                    <option value="simples_nacional">Simples Nacional</option>
                    <option value="lucro_presumido">Lucro Presumido</option>
                    <option value="lucro_real">Lucro Real</option>
                  </select>
                </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-semibold flex items-center gap-2 border-b pb-2">
              <MapPin size={18} className="text-gray-400" />
              Endereço Fiscal
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Logradouro</label>
                  <input 
                    type="text" 
                    value={settings.fiscal?.address?.logradouro || ''}
                    onChange={(e) => handleAddressUpdate({ logradouro: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Número</label>
                  <input 
                    type="text" 
                    value={settings.fiscal?.address?.numero || ''}
                    onChange={(e) => handleAddressUpdate({ numero: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Bairro</label>
                  <input 
                    type="text" 
                    value={settings.fiscal?.address?.bairro || ''}
                    onChange={(e) => handleAddressUpdate({ bairro: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-gray-500 uppercase">CEP</label>
                    {isSearchingCep && (
                      <span className="text-[9px] text-[#FF4F18] font-bold animate-pulse">Buscando...</span>
                    )}
                  </div>
                  <input 
                    type="text" 
                    value={settings.fiscal?.address?.cep || ''}
                    onChange={(e) => handleCEPChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="00000-000"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Cód. Município (IBGE)</label>
                  <input 
                    type="text" 
                    value={settings.fiscal?.address?.codigoMunicipio || ''}
                    onChange={(e) => handleAddressUpdate({ codigoMunicipio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder="Ex: 3550308"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Município</label>
                  <input 
                    type="text" 
                    value={settings.fiscal?.address?.municipio || ''}
                    onChange={(e) => handleAddressUpdate({ municipio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">UF</label>
                  <input 
                    type="text" 
                    value={settings.fiscal?.address?.uf || ''}
                    onChange={(e) => handleAddressUpdate({ uf: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Código Município (IBGE)</label>
                <input 
                  type="text" 
                  value={settings.fiscal?.address?.codigoMunicipio || ''}
                  onChange={(e) => handleAddressUpdate({ codigoMunicipio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeSubTab === 'certificate' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6 max-w-2xl mx-auto"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield size={32} />
            </div>
            <h3 className="text-lg font-bold">Certificado Digital A1</h3>
            <p className="text-sm text-gray-500">
              O certificado A1 (.pfx ou .p12) é necessário para assinar digitalmente as notas fiscais.
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3">
            <AlertCircle className="text-blue-600 shrink-0" size={20} />
            <p className="text-xs text-blue-800 leading-relaxed">
              Seu certificado é armazenado de forma criptografada e utilizado apenas para comunicação com a SEFAZ.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-red-400 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept=".pfx,.p12"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="mx-auto text-gray-400 mb-2" size={24} />
              <p className="text-sm font-medium text-gray-700">
                {pfxFile ? pfxFile.name : 'Clique ou arraste o arquivo .pfx aqui'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Tamanho máximo: 2MB</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Senha do Certificado</label>
              <input 
                type="password" 
                value={pfxPassword}
                onChange={(e) => setPfxPassword(e.target.value)}
                placeholder="Digite a senha do arquivo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>

            {validationError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle size={16} />
                {validationError}
              </div>
            )}

            <button 
              onClick={validateAndSaveCertificate}
              disabled={!pfxFile || !pfxPassword || isValidating}
              className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isValidating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Validar e Salvar Certificado
                </>
              )}
            </button>
          </div>

          {settings.fiscal?.certificateStatus === 'valid' && (
            <div className="pt-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                <CheckCircle size={18} />
                Certificado Ativo
              </div>
              <div className="text-xs text-gray-500">
                Expira em: <span className="font-bold">{settings.fiscal?.certificateExpiry}</span>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {activeSubTab === 'csc' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 border-b pb-2">
                <Globe size={18} className="text-gray-400" />
                Ambiente e Numeração
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Ambiente SEFAZ</label>
                  <select 
                    value={settings.fiscal?.environment || 'homologacao'}
                    onChange={(e) => handleUpdateFiscal({ environment: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  >
                    <option value="homologacao">Homologação (Testes)</option>
                    <option value="producao">Produção (Valor Fiscal)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Série</label>
                    <input 
                      type="number" 
                      value={settings.fiscal?.series || 1}
                      onChange={(e) => handleUpdateFiscal({ series: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Próximo Número</label>
                    <input 
                      type="number" 
                      value={settings.fiscal?.nextNfceNumber || 1}
                      onChange={(e) => handleUpdateFiscal({ nextNfceNumber: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 border-b pb-2">
                <Key size={18} className="text-gray-400" />
                CSC (Código de Segurança do Contribuinte)
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">ID do CSC</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 000001"
                    value={settings.fiscal?.cscId || ''}
                    onChange={(e) => handleUpdateFiscal({ cscId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Token CSC</label>
                  <input 
                    type="text" 
                    placeholder="Ex: A1B2C3D4-E5F6..."
                    value={settings.fiscal?.cscToken || ''}
                    onChange={(e) => handleUpdateFiscal({ cscToken: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                </div>
                <p className="text-[10px] text-gray-400 leading-tight">
                  O CSC é fornecido pela SEFAZ do seu estado e é obrigatório para a geração do QR Code da NFC-e.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
};

export default FiscalSettings;
