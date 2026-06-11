
import React, { useState, useEffect, useMemo, memo } from 'react';
import { Product, PriceHistory, RawMaterial, DigitalMenuSettings, TechnicalSheetItem, Order } from '../types';
import { CATEGORIES, RAW_MATERIAL_CATEGORIES } from '../constants';
import { 
  Edit3, Package, TrendingUp, AlertCircle, AlertTriangle, Save, X, 
  Search, Filter, Download, Plus, History, ShoppingBag,
  Sparkles, Loader2, Image as ImageIcon, Zap, ChevronDown,
  CheckCircle2, Wand2, Barcode, Scan, ArrowUpRight, ArrowDownRight, 
  Minus, Percent, ClipboardList, Info, Beaker, Scale, Trash2, Tag,
  LayoutGrid, ListChecks, GripVertical, Eye, EyeOff, ArrowRightLeft,
  Truck, Utensils, Smartphone, QrCode, Upload, Box, Clock, LayoutDashboard, DollarSign,
  Pizza
} from 'lucide-react';
import { Reorder, AnimatePresence, motion } from 'framer-motion';
import { maskCurrency, parseCurrency } from '../utils/masks';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { compressImage } from '../lib/imageUtils';
import { StockAnalyst } from './StockAnalyst';

interface InventoryProps {
  products: Product[];
  rawMaterials: RawMaterial[];
  onUpdateProduct: (product: Product) => void;
  onAddProduct: (product: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateRawMaterial: (material: RawMaterial) => void;
  onAddRawMaterial: (material: Partial<RawMaterial>) => void;
  onDeleteRawMaterial: (id: string) => void;
  digitalMenuSettings: DigitalMenuSettings;
  onUpdateDigitalMenuSettings: (settings: DigitalMenuSettings) => void;
  productCategories: string[];
  setProductCategories: React.Dispatch<React.SetStateAction<string[]>>;
  rawMaterialCategories: string[];
  setRawMaterialCategories: React.Dispatch<React.SetStateAction<string[]>>;
  onSyncCloud?: () => Promise<boolean>;
  orders?: Order[];
}

const Inventory: React.FC<InventoryProps> = memo(({ 
  products, rawMaterials, onUpdateProduct, onAddProduct, onDeleteProduct, 
  onUpdateRawMaterial, onAddRawMaterial, onDeleteRawMaterial, 
  digitalMenuSettings, onUpdateDigitalMenuSettings,
  productCategories, setProductCategories,
  rawMaterialCategories, setRawMaterialCategories,
  onSyncCloud,
  orders = []
}) => {
  const allProductCategories = useMemo(() => {
    const fromProducts = products.map(p => p.category);
    const uniqueFromProducts = Array.from(new Set(fromProducts.filter(c => c)));
    
    // Ordem base: o que já estiver salvo em categoryOrder
    let baseOrder = [...(digitalMenuSettings.categoryOrder || [])];
    
    // Adiciona categorias que estão em productCategories mas não na ordem salva
    productCategories.forEach(cat => {
      if (!baseOrder.includes(cat)) baseOrder.push(cat);
    });
    
    // Adiciona categorias que estão nos produtos mas não na ordem salva
    uniqueFromProducts.forEach(cat => {
      if (!baseOrder.includes(cat)) baseOrder.push(cat);
    });

    // Remove categorias que não existem mais em lugar nenhum
    const finalSet = new Set([...productCategories, ...uniqueFromProducts]);
    return baseOrder.filter(cat => finalSet.has(cat));
  }, [productCategories, products, digitalMenuSettings.categoryOrder]);

  const [activeSubTab, setActiveSubTab] = useState<'products' | 'raw-materials' | 'analyst'>('products');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeMaterialTab, setActiveMaterialTab] = useState<'basic' | 'history'>('basic');
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [modalTab, setModalTab] = useState<'basic' | 'sheet' | 'options' | 'option-categories' | 'pizza-cmv'>('basic');
  const [pizzaBaseCost, setPizzaBaseCost] = useState<number>(4.50);
  const [pizzaSaborBId, setPizzaSaborBId] = useState<string>('');
  const [pizzaPricingRule, setPizzaPricingRule] = useState<'highest' | 'average'>('highest');
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);

  // Estados para Entrada Automatizada de Insumos via IA (Cupom/Nota Fiscal)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceText, setInvoiceText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ base64: string; name: string; mimeType: string } | null>(null);
  const [isParsingInvoice, setIsParsingInvoice] = useState(false);
  const [parsedInvoice, setParsedInvoice] = useState<{
    supplierName?: string;
    purchaseDate?: string;
    totalAmount?: number;
    items: {
      name: string;
      originalUnit: string;
      originalQuantity: number;
      totalCost: number;
      normalizedUnit: string;
      normalizedQuantity: number;
      costPerUnit: number;
      category: string;
    }[];
  } | null>(null);
  const [mappingToExisting, setMappingToExisting] = useState<Record<number, string>>({}); // index -> rawMaterialId ou 'NEW'
  const [selectedItemsForImport, setSelectedItemsForImport] = useState<Record<number, boolean>>({}); // index -> boolean

  const handleSetParsedInvoice = (invoice: any) => {
    setParsedInvoice(invoice);
    if (invoice && invoice.items) {
      const initialMapping: Record<number, string> = {};
      const initialSelection: Record<number, boolean> = {};
      invoice.items.forEach((item: any, idx: number) => {
        initialSelection[idx] = true; // selecionado por padrão
        // Tenta encontrar um insumo local com nome próximo
        const match = rawMaterials.find(rm => 
          rm.name.toLowerCase().trim() === item.name.toLowerCase().trim() ||
          rm.name.toLowerCase().includes(item.name.toLowerCase()) ||
          item.name.toLowerCase().includes(rm.name.toLowerCase())
        );
        if (match) {
          initialMapping[idx] = match.id;
        } else {
          initialMapping[idx] = 'NEW';
        }
      });
      setMappingToExisting(initialMapping);
      setSelectedItemsForImport(initialSelection);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setUploadedFile({
          base64: base64String,
          name: file.name,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    } else {
      // Arquivos de texto ou XML
      reader.onload = (event) => {
        const textContent = event.target?.result as string;
        setInvoiceText(textContent);
        setUploadedFile({
          base64: '',
          name: file.name,
          mimeType: file.type
        });
      };
      reader.readAsText(file);
    }
  };

  const [isUsingLocalParser, setIsUsingLocalParser] = useState(false);

  const runLocalInvoiceParser = (text: string, showWarning: boolean = false) => {
    setIsUsingLocalParser(true);

    const isXml = text.trim().startsWith('<') || text.includes('<?xml') || text.includes('<det') || text.includes('<prod');
    const items: any[] = [];
    let supplierName = "Fornecedor Local (Leitor Offline)";
    let purchaseDate = new Date().toISOString().split('T')[0];
    let totalAmount = 0;

    if (isXml) {
      // 1. Extrair fornecedor e data da nota se existirem no XML
      const emitMatch = /<emit>([\s\S]*?)<\/emit>/.exec(text);
      if (emitMatch) {
        const xNomeMatch = /<xNome>([^<]+)<\/xNome>/.exec(emitMatch[1]);
        if (xNomeMatch) supplierName = xNomeMatch[1].trim();
      }
      const dhEmiMatch = /<dhEmi>([^<T\s]+)/.exec(text) || /<dEmi>([^<]+)/.exec(text);
      if (dhEmiMatch) {
        purchaseDate = dhEmiMatch[1].trim();
      }
      const vNFMatch = /<vNF>([^<]+)<\/vNF>/.exec(text);
      if (vNFMatch) {
         totalAmount = parseFloat(vNFMatch[1]) || 0;
      }

      // 2. Extrair itens do XML
      const prodRegex = /<prod>([\s\S]*?)<\/prod>/g;
      let match;
      while ((match = prodRegex.exec(text)) !== null) {
        const prodXml = match[1];
        const xProdMatch = /<xProd>([^<]+)<\/xProd>/.exec(prodXml);
        const qComMatch = /<qCom>([^<]+)<\/qCom>/.exec(prodXml);
        const uComMatch = /<uCom>([^<]+)<\/uCom>/.exec(prodXml);
        const vUnComMatch = /<vUnCom>([^<]+)<\/vUnCom>/.exec(prodXml);
        const vProdMatch = /<vProd>([^<]+)<\/vProd>/.exec(prodXml);

        if (xProdMatch) {
          const name = xProdMatch[1].trim();
          const originalQuantity = parseFloat(qComMatch ? qComMatch[1] : '1') || 1;
          const originalUnit = (uComMatch ? uComMatch[1] : 'UN').toUpperCase().trim();
          const totalCost = parseFloat(vProdMatch ? vProdMatch[1] : (vUnComMatch ? (parseFloat(vUnComMatch[1]) * originalQuantity).toString() : '0')) || 0;
          
          let normalizedUnit = 'un';
          let normalizedQuantity = originalQuantity;
          const lowerUnit = originalUnit.toLowerCase();
          
          if (lowerUnit.includes('kg') || lowerUnit === 'g' || lowerUnit.includes('kilo')) {
            normalizedUnit = 'kg';
            if (lowerUnit === 'g') {
              normalizedQuantity = originalQuantity / 1000;
            }
          } else if (lowerUnit.includes('l') || lowerUnit === 'ml' || lowerUnit.includes('litro')) {
            normalizedUnit = 'l';
            if (lowerUnit === 'ml') {
              normalizedQuantity = originalQuantity / 1000;
            }
          }

          const costPerUnit = totalCost / (normalizedQuantity || 1);

          items.push({
            name,
            originalUnit,
            originalQuantity,
            totalCost,
            normalizedUnit,
            normalizedQuantity,
            costPerUnit: isFinite(costPerUnit) ? costPerUnit : 0,
            category: 'Outros'
          });
        }
      }
    } else {
      // Processar texto corrido (Nota de compra / WhatsApp / Texto estruturado)
      const lines = text.split('\n');
      lines.forEach(line => {
        if (!line.trim() || line.toLowerCase().includes('valor total') || line.toLowerCase().includes('subtotal') || line.toLowerCase().includes('pagamento')) return;

        // Tentar identificar preços como R$ 15,90 ou 15.90
        const priceRegex = /(?:R\$?\s*)?(\d+[\.,]\d{2})/g;
        const prices = [...line.matchAll(priceRegex)].map(m => parseFloat(m[1].replace(',', '.')));
        
        // Tentar identificar quantidade e unidade: "10kg", "2 l", "5 un", "3 cx", "12 pct"
        const qtyUnitRegex = /(\d+[\.,]?\d*)\s*(kg|g|l|ml|un|cx|fd|pct|lata|unid)/i;
        const qtyUnitMatch = qtyUnitRegex.exec(line);

        if (prices.length > 0) {
          const totalCost = prices[prices.length - 1]; // Último preço na linha costuma ser o total
          let originalQuantity = 1;
          let originalUnit = 'UN';

          if (qtyUnitMatch) {
            originalQuantity = parseFloat(qtyUnitMatch[1].replace(',', '.')) || 1;
            originalUnit = qtyUnitMatch[2].toUpperCase();
          } else {
            const simpleQtyMatch = /^\s*(\d+)\s+[a-zA-Z]/g.exec(line);
            if (simpleQtyMatch) {
              originalQuantity = parseFloat(simpleQtyMatch[1]) || 1;
            }
          }

          // Limpa o nome do produto retirando números extras e preços
          let cleanName = line
            .replace(priceRegex, '')
            .replace(qtyUnitRegex, '')
            .replace(/^\s*\d+\s+/, '')
            .replace(/[\*\-\#]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          if (cleanName.length > 3) {
            let normalizedUnit = 'un';
            let normalizedQuantity = originalQuantity;
            const lowerUnit = originalUnit.toLowerCase();

            if (lowerUnit.includes('kg') || lowerUnit === 'g' || lowerUnit.includes('kilo')) {
              normalizedUnit = 'kg';
              if (lowerUnit === 'g') {
                normalizedQuantity = originalQuantity / 1000;
              }
            } else if (lowerUnit.includes('l') || lowerUnit === 'ml' || lowerUnit.includes('litro')) {
              normalizedUnit = 'l';
              if (lowerUnit === 'ml') {
                normalizedQuantity = originalQuantity / 1000;
              }
            }

            const costPerUnit = totalCost / (normalizedQuantity || 1);

            items.push({
              name: cleanName,
              originalUnit,
              originalQuantity,
              totalCost,
              normalizedUnit,
              normalizedQuantity,
              costPerUnit: isFinite(costPerUnit) ? costPerUnit : 0,
              category: 'Outros'
            });
          }
        }
      });
    }

    if (items.length > 0) {
      handleSetParsedInvoice({
        supplierName,
        purchaseDate,
        totalAmount: totalAmount || items.reduce((acc, curr) => acc + curr.totalCost, 0),
        items
      });
      if (showWarning) {
        alert("💡 Limite da IA em nuvem atingido (ERRO 429). O GastroAI ativou o Processamento Inteligente Local para ler o texto offline e extrair todos os itens com sucesso!");
      }
    } else {
      alert("Não conseguimos extrair nenhum item no modo offline automático. Por favor, verifique se o texto importado possui nomes de ingredientes e preços legíveis na mesma linha.");
    }
  };

  const handleAnalyzeInvoice = async () => {
    if (!invoiceText && !uploadedFile) {
      alert("Por favor, cole o texto da nota ou envie um arquivo/imagem do cupom fiscal.");
      return;
    }
    setIsParsingInvoice(true);
    setIsUsingLocalParser(false);
    try {
      const response = await fetch('/api/gemini/parse-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: invoiceText || undefined,
          fileBase64: uploadedFile?.base64 || undefined,
          fileMimeType: uploadedFile?.mimeType || undefined
        })
      });

      const json = await response.json();
      if (json.success && json.data) {
        handleSetParsedInvoice(json.data);
      } else {
        const isQuotaErr = json.error && (json.error.includes("RESOURCE_EXHAUSTED") || json.error.includes("429") || json.error.includes("quota") || json.error.includes("Limit"));
        if (isQuotaErr && invoiceText) {
          runLocalInvoiceParser(invoiceText, true);
        } else if (isQuotaErr && uploadedFile) {
          alert("💡 Limite da IA em nuvem atingido (ERRO 429). Como você enviou uma imagem/arquivo binário, a IA offline não consegue extrair texto diretamente do arquivo no navegador. Por favor, COPIE os dados em formato de texto da sua nota/e-mail, cole na aba 'Copiar & Colar Texto' no lado direito, e clique em Analisar para que possamos ler Offline para você!");
        } else {
          alert(json.error || 'Não foi possível interpretar o cupom. Tente copiar e colar o texto ou enviar outra imagem legível.');
        }
      }
    } catch (err: any) {
      console.error(err);
      if (invoiceText) {
        runLocalInvoiceParser(invoiceText, true);
      } else {
        alert('Erro ao conectar com o serviço de Inteligência Artificial do GastroAI. Tente copiar e colar o texto da nota fiscal para usar o extrator offline local!');
      }
    } finally {
      setIsParsingInvoice(false);
    }
  };

  const handleImportInvoiceItems = () => {
    if (!parsedInvoice || !parsedInvoice.items) return;

    let addedCount = 0;
    let updatedCount = 0;

    parsedInvoice.items.forEach((item, idx) => {
      if (!selectedItemsForImport[idx]) return;

      const mappingId = mappingToExisting[idx];
      const purchaseDate = parsedInvoice.purchaseDate ? new Date(parsedInvoice.purchaseDate) : new Date();

      if (mappingId === 'NEW') {
        const newMaterial: Partial<RawMaterial> = {
          id: `raw-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: item.name,
          unit: item.normalizedUnit || 'kg',
          currentStock: Number(item.normalizedQuantity) || 0,
          minStock: 1,
          costPerUnit: Number(item.costPerUnit) || 0,
          category: item.category || 'Outros',
          lastPurchaseDate: purchaseDate,
          priceHistory: [
            {
              date: purchaseDate.toISOString().split('T')[0],
              price: Number(item.costPerUnit) || 0,
              cost: Number(item.costPerUnit) || 0
            }
          ]
        };
        onAddRawMaterial(newMaterial);
        addedCount++;
      } else {
        const existing = rawMaterials.find(rm => rm.id === mappingId);
        if (existing) {
          const updatedRaw: RawMaterial = {
            ...existing,
            currentStock: Number(existing.currentStock || 0) + (Number(item.normalizedQuantity) || 0),
            costPerUnit: Number(item.costPerUnit) || 0,
            lastPurchaseDate: purchaseDate,
            priceHistory: [
              ...(existing.priceHistory || []),
              {
                date: purchaseDate.toISOString().split('T')[0],
                price: Number(item.costPerUnit) || 0,
                cost: Number(item.costPerUnit) || 0
              }
            ]
          };
          onUpdateRawMaterial(updatedRaw);
          updatedCount++;
        }
      }
    });

    // Limpar estados
    setIsInvoiceModalOpen(false);
    setInvoiceText('');
    setUploadedFile(null);
    setParsedInvoice(null);
    alert(`Importação concluída com sucesso!\n\nForam cadastrados ${addedCount} novos insumos e atualizados ${updatedCount} insumos existentes.`);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [isManagingDigitalCategories, setIsManagingDigitalCategories] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRawCategory, setSelectedRawCategory] = useState<string | null>(null);

  // Pizza Meio-a-Meio Wizard State
  const [isPizzaWizardOpen, setIsPizzaWizardOpen] = useState(false);
  const [wizardAllowedFlavorIds, setWizardAllowedFlavorIds] = useState<string[]>([]);
  const [wizardFlavorSearch, setWizardFlavorSearch] = useState('');
  const [wizardFlavorCategoryFilter, setWizardFlavorCategoryFilter] = useState('Todos');
  const [wizardBaseCost, setWizardBaseCost] = useState(4.50);
  const [wizardPricingModel, setWizardPricingModel] = useState<'variable' | 'fixed'>('variable');
  const [wizardName, setWizardName] = useState('Pizza Meio-a-Meio Especial');
  const [wizardPrice, setWizardPrice] = useState(39.90);
  const [wizardCategory, setWizardCategory] = useState('Pizzas');

  // Update master price automatically based on pricing model and set initial flavor category filter
  useEffect(() => {
    if (isPizzaWizardOpen) {
      if (wizardPricingModel === 'variable') {
        setWizardPrice(0); // Under variable average model, master product price is 0, and each added flavor option costs half its original price
      } else if (wizardPrice === 0) {
        setWizardPrice(45.00); // Default flat price if they switch to fixed
      }

      // Auto-select initial category filter for flavors based on registered categories
      const hasPizzas = allProductCategories.includes('Pizzas');
      const pizzaLikeCat = allProductCategories.find(c => c.toLowerCase().includes('pizza'));
      if (hasPizzas) {
        setWizardFlavorCategoryFilter('Pizzas');
      } else if (pizzaLikeCat) {
        setWizardFlavorCategoryFilter(pizzaLikeCat);
      } else {
        setWizardFlavorCategoryFilter('Todos');
      }
    }
  }, [wizardPricingModel, isPizzaWizardOpen, allProductCategories]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  } | null>(null);

  const confirmAction = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'danger') => {
    setConfirmConfig({ title, message, onConfirm, type });
    setShowConfirmModal(true);
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        // Import compressImage if needed (I'll add it to the file)
        const compressed = await compressImage(base64, 800, 600, 0.8);
        setEditingProduct({ ...editingProduct, image: compressed });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error uploading product image:", err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const parseCurrency = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    return Number(cleanValue) / 100;
  };

  const handleEditClick = (product: Product) => {
    setModalTab('basic');
    setEditingProduct({ ...product });
  };

  const handleAddProductClick = () => {
    setModalTab('basic');
    setEditingProduct({
      id: '',
      tenantId: '',
      name: '',
      category: productCategories[0] || 'Sem Categoria',
      price: 0,
      cost: 0,
      stock: 0,
      minStock: 0,
      unit: 'un',
      options: [],
      optionCategories: [],
      technicalSheet: [],
      isAvailableDelivery: true,
      isAvailableDineIn: true,
      isAvailableOnline: true,
      isAvailableDigitalMenu: true,
      active: true
    });
  };

  const handleSyncCloud = async () => {
    if (!onSyncCloud) return;
    setIsSyncing(true);
    try {
      const success = await onSyncCloud();
      if (success) {
        alert("Sincronização concluída com sucesso! Seus produtos já estão disponíveis no Marketplace.");
      } else {
        alert("Ocorreu um erro ao sincronizar. Tente novamente.");
      }
    } catch (err) {
      console.error("Sync Error:", err);
      alert("Erro ao sincronizar com a nuvem.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteProduct = (id: string) => {
    confirmAction(
      "Excluir Produto",
      "Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.",
      () => {
        onDeleteProduct(id);
        if (editingProduct?.id === id) {
          setEditingProduct(null);
        }
      }
    );
  };

  const handleSave = () => {
    if (editingProduct) {
      if (editingProduct.id) {
        onUpdateProduct(editingProduct);
      } else {
        onAddProduct(editingProduct);
      }
      setEditingProduct(null);
    }
  };

  const handleSaveMaterial = () => {
    if (editingMaterial) {
      if (editingMaterial.id) {
        onUpdateRawMaterial(editingMaterial);
      } else {
        onAddRawMaterial(editingMaterial);
      }
      setEditingMaterial(null);
    }
  };

  const handleSavePizzaMeioMeio = () => {
    if (wizardAllowedFlavorIds.length === 0) {
      alert("Por favor, selecione pelo menos um sabor de pizza permitido.");
      return;
    }

    const flavors = products.filter(p => wizardAllowedFlavorIds.includes(p.id));
    const flavorsCount = flavors.length;

    // Calculate aggregated (expected average) technical sheet
    // Since any two flavors could be selected, statistically, we expect the average of 50% / 50%
    const mergedSheet: TechnicalSheetItem[] = [];
    const ingredientSum: Record<string, { quantity: number; unit: string }> = {};

    flavors.forEach(flavor => {
      if (flavor.technicalSheet) {
        flavor.technicalSheet.forEach(item => {
          if (!ingredientSum[item.rawMaterialId]) {
            ingredientSum[item.rawMaterialId] = { quantity: 0, unit: item.unit || 'g' };
          }
          // Factor in the 50% portion size of each flavor divided by total flavor choices (statistical average)
          ingredientSum[item.rawMaterialId].quantity += item.quantity * 0.5;
        });
      }
    });

    Object.keys(ingredientSum).forEach(rawId => {
      mergedSheet.push({
        rawMaterialId: rawId,
        quantity: parseFloat((ingredientSum[rawId].quantity / flavorsCount).toFixed(4)),
        unit: ingredientSum[rawId].unit
      });
    });

    // Calculate the statistical average topping cost of allowed flavors
    let totalToppingsCostSum = 0;
    flavors.forEach(flavor => {
      let flavorToppingCost = 0;
      if (flavor.technicalSheet && flavor.technicalSheet.length > 0) {
        flavorToppingCost = flavor.technicalSheet.reduce((acc, item) => {
          const rawMat = rawMaterials.find(m => m.id === item.rawMaterialId);
          return acc + (rawMat ? rawMat.costPerUnit * item.quantity : 0);
        }, 0);
      } else {
        flavorToppingCost = Math.max(0, flavor.cost - wizardBaseCost);
      }
      totalToppingsCostSum += flavorToppingCost;
    });

    const averageToppingCost = totalToppingsCostSum / flavorsCount;
    // Estimated cost is 50% Sabor A + 50% Sabor B + base cost (which is mathematically equal to average toppings cost + base cost)
    const estimatedCost = averageToppingCost + wizardBaseCost;

    // Create the Option Category with the chosen allowed flavors
    const flavorOptions = flavors.map(f => ({
      id: `opt-${f.id}-${Date.now()}`,
      name: f.name,
      description: `Metade do sabor ${f.name}`,
      price: wizardPricingModel === 'variable' ? parseFloat((f.price * 0.5).toFixed(2)) : 0,
      active: true
    }));

    const optionCategories = [
      {
        id: `cat-${Date.now()}`,
        name: "Escolha as Metades (Selecione até 2)",
        min: 1,
        max: 2,
        options: flavorOptions
      }
    ];

    const description = `Pizza Meio-a-Meio com ${flavorsCount} sabores permitidos: ${flavors.slice(0, 4).map(f => f.name).join(', ')}${flavorsCount > 4 ? ` e mais ${flavorsCount - 4} sabores` : ''}. ` +
      (wizardPricingModel === 'variable' 
        ? "Precificação dinâmica: o valor final é a soma das metades selecionadas."
        : `Preço fixo de R$ ${wizardPrice.toFixed(2)} independente da combinação escolhida.`);

    const newPizza: Partial<Product> = {
      id: `p-${Date.now()}`,
      tenantId: '',
      name: wizardName || 'Pizza Meio-a-Meio Tradicional',
      category: wizardCategory || 'Pizzas',
      price: wizardPricingModel === 'variable' ? 0 : wizardPrice, // Variable pricing starts at 0 and adds half of flavor prices
      cost: parseFloat(estimatedCost.toFixed(2)),
      stock: 0,
      minStock: 0,
      unit: 'un',
      trackStock: true,
      technicalSheet: mergedSheet,
      options: [],
      optionCategories: optionCategories,
      description: description,
      isAvailableDelivery: true,
      isAvailableDineIn: true,
      isAvailableOnline: true,
      isAvailableDigitalMenu: true,
      active: true
    };

    onAddProduct(newPizza);

    setIsPizzaWizardOpen(false);
    setWizardAllowedFlavorIds([]);
    setWizardFlavorSearch('');
    alert(`Sucesso!\nA Pizza Meio-a-Meio "${newPizza.name}" foi cadastrada com sucesso! Ela possui ${flavorsCount} sabores configurados como opcionais de meio-a-meio e custo estatístico calculado.`);
  };

  const handleAddMaterial = () => {
    setEditingMaterial({
      id: '',
      tenantId: '',
      name: '',
      unit: 'kg',
      currentStock: 0,
      minStock: 0,
      costPerUnit: 0,
      category: rawMaterialCategories[0] || 'Sem Categoria'
    });
  };

  const handleDeleteMaterial = (id: string) => {
    confirmAction(
      "Excluir Insumo",
      "Tem certeza que deseja excluir este insumo? Esta ação não pode ser desfeita.",
      () => {
        onDeleteRawMaterial(id);
        if (editingMaterial?.id === id) {
          setEditingMaterial(null);
        }
      }
    );
  };

  const handleMockScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const randomBarcode = Math.floor(Math.random() * 1000000000000).toString().padStart(13, '0');
      if (editingProduct) {
        setEditingProduct({ ...editingProduct, barcode: randomBarcode });
      }
      setIsScanning(false);
      alert("Código de barras escaneado com sucesso!");
    }, 2000);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !rawMaterialCategories.includes(newCategoryName.trim())) {
      setRawMaterialCategories([...rawMaterialCategories, newCategoryName.trim()]);
      setNewCategoryName('');
    }
  };

  const handleUpdateCategory = (index: number, newName: string) => {
    if (newName.trim() && !rawMaterialCategories.includes(newName.trim())) {
      const updated = [...rawMaterialCategories];
      updated[index] = newName.trim();
      setRawMaterialCategories(updated);
      setEditingCategoryIndex(null);
    }
  };

  const handleDeleteCategory = (category: string) => {
    confirmAction(
      "Excluir Categoria",
      `Deseja excluir a categoria "${category}"? Insumos nesta categoria não serão excluídos.`,
      () => {
        setRawMaterialCategories(rawMaterialCategories.filter(c => c !== category));
      },
      'warning'
    );
  };

  const handleCategoryReorder = (newOrder: string[]) => {
    onUpdateDigitalMenuSettings({
      ...digitalMenuSettings,
      categoryOrder: newOrder
    });
  };

  const handleProductReorder = (reorderedProducts: Product[]) => {
    // Update displayOrder for all affected products
    reorderedProducts.forEach((p, idx) => {
      if (p.displayOrder !== idx) {
        onUpdateProduct({ ...p, displayOrder: idx });
      }
    });
  };

  const productAvailability = useMemo(() => {
    const availability: Record<string, number> = {};
    products.forEach(product => {
      if (!product.technicalSheet || product.technicalSheet.length === 0) {
        availability[product.id] = product.stock;
        return;
      }

      let maxPossible = Infinity;
      product.technicalSheet.forEach(item => {
        const material = rawMaterials.find(m => m.id === item.rawMaterialId);
        if (material) {
          const possibleWithThisMaterial = Math.floor(material.currentStock / item.quantity);
          maxPossible = Math.min(maxPossible, possibleWithThisMaterial);
        } else {
          maxPossible = 0;
        }
      });
      availability[product.id] = maxPossible;
    });
    return availability;
  }, [products, rawMaterials]);

  const filteredProducts = useMemo(() => {
    const hidden = digitalMenuSettings.hiddenCategories || [];
    return products
      .filter(p => 
        (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode?.includes(searchTerm)) &&
        (categoryFilter === '' || p.category === categoryFilter) &&
        (selectedCategory !== null || !hidden.includes(p.category))
      )
      .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
  }, [products, searchTerm, categoryFilter, selectedCategory, digitalMenuSettings.hiddenCategories]);

  const filteredRawMaterials = useMemo(() => {
    const hidden = digitalMenuSettings.hiddenRawCategories || [];
    return rawMaterials.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (categoryFilter === '' || m.category === categoryFilter) &&
      (selectedRawCategory === null || m.category === selectedRawCategory) &&
      (selectedRawCategory !== null || !hidden.includes(m.category))
    );
  }, [rawMaterials, searchTerm, categoryFilter, selectedRawCategory, digitalMenuSettings.hiddenRawCategories]);

  const lowStockCount = products.filter(p => p.stock < (p.minStock || 0)).length;
  const lowRawStockCount = rawMaterials.filter(m => m.currentStock < m.minStock).length;
  const totalStockValue = products.reduce((acc, p) => acc + (p.stock * p.cost), 0);
  const totalRawValue = rawMaterials.reduce((acc, m) => acc + (m.currentStock * m.costPerUnit), 0);

  const chartData = editingProduct?.priceHistory?.map(h => ({
    ...h,
    dateFormatted: new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  })) || [];

  const sortedHistory = [...(editingProduct?.priceHistory || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const allOptionCategories = useMemo(() => {
    const categoriesMap = new Map<string, any>();
    products.forEach(p => {
      p.optionCategories?.forEach(cat => {
        if (cat.name && !categoriesMap.has(cat.name)) {
          categoriesMap.set(cat.name, cat);
        }
      });
    });
    return Array.from(categoriesMap.values());
  }, [products]);

  const allRawMaterialCategories = useMemo(() => {
    const fromMaterials = rawMaterials.map(m => m.category);
    const existing = new Set(rawMaterialCategories);
    const extra = fromMaterials.filter(c => c && !existing.has(c));
    return [...rawMaterialCategories, ...Array.from(new Set(extra))];
  }, [rawMaterialCategories, rawMaterials]);

  const categories = useMemo(() => {
    return activeSubTab === 'products' ? allProductCategories : allRawMaterialCategories;
  }, [activeSubTab, allProductCategories, allRawMaterialCategories]);

  return (
    <div className="space-y-2 animate-in fade-in duration-500">
      {/* Sub-tabs for Products vs Raw Materials */}
      <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200 shadow-inner">
        {[
          { id: 'products', label: 'Produtos', icon: Package },
          { id: 'raw-materials', label: 'Insumos', icon: Beaker },
          { id: 'analyst', label: 'Analista de Estoque', icon: TrendingUp },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => { setActiveSubTab(tab.id as any); setCategoryFilter(''); }}
            className={`relative flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              activeSubTab === tab.id ? 'text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'text-slate-400 hover:bg-slate-100'
            }`}
          >
            {activeSubTab === tab.id && (
              <motion.div 
                layoutId="inventoryTabPill"
                className="absolute inset-0 bg-indigo-600 rounded-xl"
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <tab.icon size={14} strokeWidth={activeSubTab === tab.id ? 3.5 : 2} />
              {tab.label}
              {activeSubTab === tab.id && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-1 h-1 bg-white rounded-full absolute -bottom-1.5 left-1/2 -translate-x-1/2" />}
            </span>
          </button>
        ))}
      </div>

      {/* Stats Header */}
      {activeSubTab !== 'analyst' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
            <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl group-hover:scale-110 transition-transform">
              {activeSubTab === 'products' ? <Package size={24} /> : <Beaker size={24} />}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeSubTab === 'products' ? 'Total de Produtos' : 'Total de Insumos'}</p>
              <p className="text-2xl font-black text-slate-900 tracking-tighter">{activeSubTab === 'products' ? products.length : rawMaterials.length}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque Crítico</p>
              <p className="text-2xl font-black text-rose-600 tracking-tighter">{activeSubTab === 'products' ? lowStockCount : lowRawStockCount}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor em Estoque</p>
              <p className="text-2xl font-black text-slate-900 tracking-tighter">R$ {(activeSubTab === 'products' ? totalStockValue : totalRawValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeSubTab === 'products' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar: Categories */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-280px)]">
              <div className="p-6 border-b bg-white flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">Categorias</h3>
                <button 
                  onClick={() => setIsManagingDigitalCategories(true)}
                  className="bg-teal-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 flex items-center gap-2"
                >
                  <Plus size={14} /> Cadastrar categoria
                </button>
              </div>

              <div className="p-3 border-b bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Pesquise por categoria" 
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs text-slate-600"
                    value={categorySearchTerm}
                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <Reorder.Group 
                axis="y" 
                values={allProductCategories} 
                onReorder={handleCategoryReorder}
                className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/30"
              >
                {allProductCategories
                  .filter(cat => cat.toLowerCase().includes(categorySearchTerm.toLowerCase()))
                  .map((cat, index) => {
                    const isHidden = digitalMenuSettings.hiddenCategories?.includes(cat);
                    const isSelected = selectedCategory === cat;
                    
                    return (
                      <Reorder.Item 
                        key={cat} 
                        value={cat}
                        onClick={() => setSelectedCategory(isSelected ? null : cat)}
                        className={`flex items-center justify-between p-4 rounded-[1.25rem] border transition-all cursor-pointer group outline-none ${
                          isSelected 
                            ? 'bg-white border-teal-500 shadow-lg shadow-teal-500/10 ring-1 ring-teal-500/20' 
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg transition-all cursor-grab active:cursor-grabbing ${isSelected ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-400 group-hover:bg-white'}`}>
                            <GripVertical size={14} />
                          </div>
                          <span className={`text-sm font-black tracking-tight ${isHidden ? 'text-slate-400 line-through' : isSelected ? 'text-teal-700' : 'text-slate-700'}`}>{cat}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                             <div 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 const currentHidden = digitalMenuSettings.hiddenCategories || [];
                                 const newHidden = isHidden 
                                   ? currentHidden.filter(c => c !== cat)
                                   : [...currentHidden, cat];
                                 onUpdateDigitalMenuSettings({ ...digitalMenuSettings, hiddenCategories: newHidden });
                               }}
                               className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${isHidden ? 'bg-slate-200' : 'bg-teal-600'}`}
                             >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${isHidden ? 'left-1' : 'left-6'}`} />
                             </div>
                             <span className={`text-[8px] font-black uppercase tracking-widest ${isHidden ? 'text-slate-400' : 'text-teal-600'}`}>
                                {isHidden ? 'Oculto' : 'Visível'}
                             </span>
                          </div>
                        </div>
                      </Reorder.Item>
                    );
                  })}
              </Reorder.Group>
            </div>
          </div>

          {/* Main List: Products */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden flex flex-col h-[calc(100vh-280px)]">
              <div className="p-6 border-b bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">Todos os produtos</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsPizzaWizardOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-orange-100 flex items-center gap-2 cursor-pointer"
                  >
                    <Pizza size={14} className="animate-[spin_40s_linear_infinite]" /> NOVA PIZZA MEIO-A-MEIO
                  </button>
                  <button 
                    onClick={handleAddProductClick}
                    className="bg-rose-500 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={14} /> NOVO PRODUTO
                  </button>
                </div>
              </div>

              <div className="p-4 border-b bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Pesquise por produto. Digite ao menos 3 caracteres" 
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-sm text-slate-600"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/50 border-b sticky top-0 z-20">
                    <tr>
                      <th className="px-4 py-3 font-black text-slate-400 text-[9px] uppercase tracking-widest">PRODUTO</th>
                      <th className="px-4 py-3 font-black text-slate-400 text-[9px] uppercase tracking-widest">DELIVERY</th>
                      <th className="px-4 py-3 font-black text-slate-400 text-[9px] uppercase tracking-widest">SALÃO/FICHA</th>
                      <th className="px-4 py-3 font-black text-slate-400 text-[9px] uppercase tracking-widest">PEDIDO ONLINE</th>
                      <th className="px-4 py-3 font-black text-slate-400 text-[9px] uppercase tracking-widest">CARDÁPIO DIGITAL</th>
                      <th className="px-4 py-3 font-black text-slate-400 text-[9px] uppercase tracking-widest text-center">STATUS</th>
                      <th className="px-4 py-3 font-black text-slate-400 text-[9px] uppercase tracking-widest text-right">AÇÕES</th>
                    </tr>
                  </thead>
                  <Reorder.Group 
                    as="tbody" 
                    axis="y" 
                    values={searchTerm.length >= 3 || searchTerm === '' ? (selectedCategory ? filteredProducts.filter(p => p.category === selectedCategory) : filteredProducts) : []} 
                    onReorder={handleProductReorder}
                    className="divide-y divide-slate-100"
                  >
                    {(searchTerm.length >= 3 || searchTerm === '' ? (selectedCategory ? filteredProducts.filter(p => p.category === selectedCategory) : filteredProducts) : []).map(product => {
                      const isLowStock = product.stock < (product.minStock || 0);
                      return (
                        <Reorder.Item 
                          key={product.id} 
                          value={product}
                          as="tr" 
                          className={`transition-colors group hover:bg-slate-50/80 outline-none`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm shrink-0">
                                {product.image ? (
                                  <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <ImageIcon size={16} />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-black text-slate-800 text-xs tracking-tight">{product.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                   <div className="bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                                      <span className="text-[10px] font-black text-slate-500">R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                   </div>
                                   {isLowStock && (
                                     <span className="flex items-center gap-1 text-rose-500 text-[8px] font-black uppercase tracking-widest">
                                       <AlertCircle size={10} /> Estoque Baixo
                                     </span>
                                   )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input 
                              type="checkbox" 
                              checked={product.isAvailableDelivery ?? true} 
                              onChange={() => onUpdateProduct({ ...product, isAvailableDelivery: !(product.isAvailableDelivery ?? true) })}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input 
                              type="checkbox" 
                              checked={product.isAvailableDineIn ?? true} 
                              onChange={() => onUpdateProduct({ ...product, isAvailableDineIn: !(product.isAvailableDineIn ?? true) })}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input 
                              type="checkbox" 
                              checked={product.isAvailableOnline ?? true} 
                              onChange={() => onUpdateProduct({ ...product, isAvailableOnline: !(product.isAvailableOnline ?? true) })}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input 
                              type="checkbox" 
                              checked={product.isAvailableDigitalMenu ?? true} 
                              onChange={() => onUpdateProduct({ ...product, isAvailableDigitalMenu: !(product.isAvailableDigitalMenu ?? true) })}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-3">
                              <div 
                                onClick={() => onUpdateProduct({ ...product, active: !(product.active ?? true) })}
                                className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${product.active ?? true ? 'bg-indigo-600' : 'bg-slate-200'}`}
                              >
                                 <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${product.active ?? true ? 'left-6' : 'left-1'}`} />
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-widest min-w-[40px] ${product.active ?? true ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {product.active ?? true ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                             <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleEditClick(product)}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                >
                                  <Edit3 size={16} />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-grab active:cursor-grabbing">
                                   <GripVertical size={16} />
                                </button>
                             </div>
                          </td>
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
                  <tbody className="divide-y divide-slate-100">
                    {(searchTerm.length > 0 && searchTerm.length < 3) && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 opacity-40">
                             <Search size={32} strokeWidth={1.5} className="text-slate-400" />
                             <p className="font-black text-xs uppercase tracking-widest text-slate-600">Digite ao menos 3 caracteres para buscar</p>
                          </div>
                        </td>
                      </tr>
                    )}
                    {((searchTerm.length >= 3 || searchTerm === '') && (selectedCategory ? filteredProducts.filter(p => p.category === selectedCategory) : filteredProducts).length === 0) && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 opacity-40">
                             <Package size={32} strokeWidth={1.5} className="text-slate-400" />
                             <p className="font-black text-xs uppercase tracking-widest text-slate-600">Nenhum produto encontrado</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : activeSubTab === 'raw-materials' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar: Categories for Insumos */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-280px)]">
              <div className="p-6 border-b bg-white flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">Categorias</h3>
                <button 
                  onClick={() => setIsManagingCategories(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                >
                  <Plus size={14} /> GERENCIAR
                </button>
              </div>

              <div className="p-3 border-b bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Pesquise por categoria" 
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs text-slate-600"
                    value={categorySearchTerm}
                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/30">
                {allRawMaterialCategories
                  .filter(cat => cat.toLowerCase().includes(categorySearchTerm.toLowerCase()))
                  .map((cat, index) => {
                    const isSelected = selectedRawCategory === cat;
                    const itemsInCat = rawMaterials.filter(m => m.category === cat).length;
                    const isHidden = digitalMenuSettings.hiddenRawCategories?.includes(cat);
                    
                    return (
                      <div 
                        key={cat} 
                        onClick={() => setSelectedRawCategory(isSelected ? null : cat)}
                        className={`flex items-center justify-between p-4 rounded-[1.25rem] border transition-all cursor-pointer group outline-none ${
                          isSelected 
                            ? 'bg-white border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/20' 
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg transition-all ${isSelected ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400 group-hover:bg-white'}`}>
                            <Beaker size={14} />
                          </div>
                          <span className={`text-sm font-black tracking-tight ${isHidden ? 'text-slate-400 line-through' : isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{cat}</span>
                        </div>
                        
                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                             <div 
                               onClick={() => {
                                 const currentHidden = digitalMenuSettings.hiddenRawCategories || [];
                                 const newHidden = isHidden 
                                   ? currentHidden.filter(c => c !== cat)
                                   : [...currentHidden, cat];
                                 onUpdateDigitalMenuSettings({ ...digitalMenuSettings, hiddenRawCategories: newHidden });
                               }}
                               className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${isHidden ? 'bg-slate-200' : 'bg-indigo-600'}`}
                             >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${isHidden ? 'left-1' : 'left-6'}`} />
                             </div>
                             <span className={`text-[8px] font-black uppercase tracking-widest ${isHidden ? 'text-slate-400' : 'text-indigo-600'}`}>
                                {isHidden ? 'Oculto' : 'Visível'}
                             </span>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                            {itemsInCat}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Main List: Insumos */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden flex flex-col h-[calc(100vh-280px)]">
              <div className="p-6 border-b bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">Todos os Insumos</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={() => setIsInvoiceModalOpen(true)}
                    className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center gap-2"
                  >
                    <Sparkles size={15} className="text-emerald-200 animate-pulse" /> ENTRADA VIA CUPOM/NOTA (IA)
                  </button>
                  <button 
                    onClick={handleAddMaterial}
                    className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                  >
                    <Plus size={16} /> NOVO INSUMO
                  </button>
                </div>
              </div>

              <div className="p-4 border-b bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Pesquise por insumo..." 
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-sm text-slate-600"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/50 border-b sticky top-0 z-20">
                    <tr>
                      <th className="px-4 py-3 font-black text-slate-400 text-[9px] uppercase tracking-widest">INSUMO</th>
                      <th className="px-4 py-3 font-black text-slate-400 text-[9px] uppercase tracking-widest">CATEGORIA</th>
                      <th className="px-4 py-3 font-black text-slate-400 text-[9px] uppercase tracking-widest text-right">CUSTO UNIT.</th>
                      <th className="px-4 py-3 font-black text-slate-400 text-[9px] uppercase tracking-widest text-center">ESTOQUE</th>
                      <th className="px-4 py-3 font-black text-slate-400 text-[9px] uppercase tracking-widest text-center">STATUS</th>
                      <th className="px-4 py-3 font-black text-slate-400 text-[9px] uppercase tracking-widest text-right">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRawMaterials.map(material => {
                      const isLowStock = material.currentStock < material.minStock;
                      return (
                        <tr key={material.id} className={`transition-colors group hover:bg-slate-50/80`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                                <Beaker size={20} />
                              </div>
                              <div>
                                <p className="font-black text-slate-800 text-xs tracking-tight">{material.name}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-1">Ref: #{material.id.slice(-6)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-black uppercase tracking-tight bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">{material.category}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-col items-end">
                              <p className="font-black text-slate-800 text-xs">R$ {material.costPerUnit.toFixed(2)}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">por {material.unit}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className={`font-black text-xs tracking-tighter ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                              {material.currentStock} {material.unit}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center">
                              {isLowStock ? (
                                <div className="flex items-center gap-1.5 text-rose-600 font-black text-[8px] uppercase tracking-widest bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                                  <AlertCircle size={10} /> REPOSIÇÃO
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-emerald-600 font-black text-[8px] uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                  <CheckCircle2 size={10} /> ESTOQUE OK
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                             <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => setEditingMaterial(material)}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                >
                                  <Edit3 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteMaterial(material.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredRawMaterials.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 opacity-40">
                             <Beaker size={32} strokeWidth={1.5} className="text-slate-400" />
                             <p className="font-black text-xs uppercase tracking-widest text-slate-600">Nenhum insumo encontrado</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <StockAnalyst products={products} orders={orders} />
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>

      {/* Confirmation Modal */}
      {showConfirmModal && confirmConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className={`p-6 text-center ${confirmConfig.type === 'danger' ? 'bg-rose-50' : confirmConfig.type === 'warning' ? 'bg-amber-50' : 'bg-indigo-50'}`}>
              <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${confirmConfig.type === 'danger' ? 'bg-rose-500 text-white' : confirmConfig.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white'}`}>
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tighter mb-2">{confirmConfig.title}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">{confirmConfig.message}</p>
            </div>
            <div className="p-4 flex gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  confirmConfig.onConfirm();
                  setShowConfirmModal(false);
                }}
                className={`flex-1 py-3 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${confirmConfig.type === 'danger' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-100' : confirmConfig.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-100'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Material Modal */}
      {/* NOVO MODAL DE INSUMO (Inspirado no de Produtos) */}
      <AnimatePresence>
        {editingMaterial && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-5xl h-[90vh] md:h-[80vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header Sophisticado */}
              <div className="p-6 border-b bg-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${editingMaterial.id ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-emerald-500 text-white shadow-emerald-100'}`}>
                    <Beaker size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-slate-800 tracking-tighter italic uppercase">
                        {editingMaterial.id ? 'Editar Insumo' : 'Novo Insumo'}
                      </h2>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${editingMaterial.currentStock >= editingMaterial.minStock ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {editingMaterial.currentStock >= editingMaterial.minStock ? 'Em Estoque' : 'Estoque Baixo'}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {editingMaterial.name || 'Sem nome definido'} • {editingMaterial.category || 'Sem categoria'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingMaterial(null)} 
                  className="p-3 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-slate-900"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Sidebar de Navegação */}
                <div className="w-64 border-r bg-slate-50/50 p-6 flex flex-col gap-2 shrink-0">
                  <button 
                    onClick={() => setActiveMaterialTab('basic')}
                    className={`flex items-center gap-3 p-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${activeMaterialTab === 'basic' ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100/50 border-2 border-indigo-50' : 'text-slate-400 hover:bg-slate-100'}`}
                  >
                    <LayoutDashboard size={18} /> Dados Gerais
                  </button>
                  <button 
                    onClick={() => setActiveMaterialTab('history')}
                    className={`flex items-center gap-3 p-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${activeMaterialTab === 'history' ? 'bg-white text-indigo-600 shadow-xl shadow-indigo-100/50 border-2 border-indigo-50' : 'text-slate-400 hover:bg-slate-100'}`}
                  >
                    <History size={18} /> Histórico de Preços
                  </button>
                  
                  <div className="mt-auto hidden md:block">
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
                      <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Dica AI</p>
                      <p className="text-[10px] font-medium text-slate-600 leading-tight">
                        Mantenha o custo atualizado para capturar variações no CMV em tempo real.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Área de Conteúdo */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                  {activeMaterialTab === 'basic' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                      {/* Grid Bento para Dados Básicos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 col-span-1 md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Fantasia do Insumo</label>
                          <input 
                            type="text" 
                            className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-slate-800 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                            placeholder="Ex: Queijo Muçarela Ralado"
                            value={editingMaterial.name}
                            onChange={(e) => setEditingMaterial({...editingMaterial, name: e.target.value})}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                          <select 
                            className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-slate-800 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                            value={editingMaterial.category}
                            onChange={(e) => setEditingMaterial({...editingMaterial, category: e.target.value})}
                          >
                            {allRawMaterialCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidade de Medida</label>
                          <select 
                            className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-slate-800 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner uppercase"
                            value={editingMaterial.unit}
                            onChange={(e) => setEditingMaterial({...editingMaterial, unit: e.target.value})}
                          >
                            <option value="kg">Quilograma (kg)</option>
                            <option value="g">Grama (g)</option>
                            <option value="l">Litro (l)</option>
                            <option value="ml">Mililitro (ml)</option>
                            <option value="un">Unidade (un)</option>
                            <option value="pct">Pacote (pct)</option>
                            <option value="cx">Caixa (cx)</option>
                          </select>
                        </div>
                      </div>

                      {/* Gestão de Estoque e Custos */}
                      <div className="bg-slate-50/50 rounded-[2rem] p-6 lg:p-8 border border-slate-100/50 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 group hover:border-indigo-500 transition-all shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-hover:text-indigo-600">
                                <Box size={14} /> Estoque Atual
                              </label>
                              <span className="text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{editingMaterial.unit}</span>
                            </div>
                            <input 
                              type="number" 
                              className="w-full bg-transparent font-black text-slate-800 text-sm outline-none"
                              value={editingMaterial.currentStock}
                              onChange={(e) => setEditingMaterial({...editingMaterial, currentStock: parseFloat(e.target.value) || 0})}
                            />
                          </div>

                          <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 group hover:border-rose-500 transition-all shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-hover:text-rose-500">
                                <AlertTriangle size={14} /> Estoque Mínimo
                              </label>
                              <span className="text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{editingMaterial.unit}</span>
                            </div>
                            <input 
                              type="number" 
                              className="w-full bg-transparent font-black text-slate-800 text-sm outline-none"
                              value={editingMaterial.minStock}
                              onChange={(e) => setEditingMaterial({...editingMaterial, minStock: parseFloat(e.target.value) || 0})}
                            />
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 group hover:border-emerald-500 transition-all shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-hover:text-emerald-600">
                              <DollarSign size={14} /> Custo Unitário
                            </label>
                            <span className="text-[8px] font-black bg-emerald-50 px-2 py-0.5 rounded text-emerald-600 uppercase">BRL / {editingMaterial.unit}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-emerald-600 text-sm">R$</span>
                            <input 
                              type="text" 
                              inputMode="numeric"
                              className="w-full bg-transparent font-black text-slate-800 text-sm outline-none"
                              value={formatCurrency(editingMaterial.costPerUnit)}
                              onChange={(e) => setEditingMaterial({...editingMaterial, costPerUnit: parseCurrency(maskCurrency(e.target.value))})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeMaterialTab === 'history' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                      <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 flex flex-col items-center justify-center text-center py-20 gap-4">
                        <div className="p-5 bg-white rounded-3xl shadow-lg text-slate-300">
                          <TrendingUp size={48} strokeWidth={1} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 italic uppercase italic">Histórico de Preços</h3>
                          <p className="text-[11px] font-medium text-slate-400 max-w-xs mx-auto">
                            Acompanhe as oscilações de custo do insumo nos últimos 90 dias para ajustar sua margem.
                          </p>
                        </div>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mt-4">Nenhum dado de variação recente</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar Resumo (Lado Direito) */}
                <div className="hidden lg:flex w-72 border-l bg-slate-50/30 p-8 flex-col gap-6 shrink-0">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resumo do Ativo</h4>
                    
                    <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Valor do Estoque</p>
                      <p className="text-xl font-black text-slate-900 tracking-tighter">
                        R$ {(editingMaterial.currentStock * editingMaterial.costPerUnit).toFixed(2)}
                      </p>
                    </div>

                    <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sugestão Compra</p>
                      <p className="text-xl font-black text-rose-600 tracking-tighter">
                         {editingMaterial.currentStock < editingMaterial.minStock ? (editingMaterial.minStock * 2 - editingMaterial.currentStock).toFixed(1) : 0} {editingMaterial.unit}
                      </p>
                    </div>

                    {editingMaterial.lastPurchaseDate && (
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Última Entrada</p>
                        <p className="text-[10px] font-black text-emerald-800 uppercase">
                          {new Date(editingMaterial.lastPurchaseDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ações do Footer */}
              <div className="p-8 border-t bg-slate-50 flex justify-between items-center shrink-0">
                <div>
                  {editingMaterial.id && (
                    <button 
                      onClick={() => {
                        handleDeleteMaterial(editingMaterial.id);
                        setEditingMaterial(null);
                      }}
                      className="px-6 py-4 rounded-2xl font-black text-rose-500 hover:bg-rose-50 transition-all border-2 border-transparent hover:border-rose-100 uppercase tracking-widest text-[10px] flex items-center gap-2"
                    >
                      <Trash2 size={18} /> Remover do Sistema
                    </button>
                  )}
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setEditingMaterial(null)} 
                    className="px-8 py-4 rounded-2xl font-black text-slate-400 hover:bg-white transition-all uppercase tracking-widest text-[10px]"
                  >
                    Descartar
                  </button>
                  <button 
                    onClick={handleSaveMaterial}
                    className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-3 uppercase tracking-[0.2em] text-[11px]"
                  >
                    <Save size={20} /> {editingMaterial.id ? 'Salvar Alterações' : 'Confirmar Insumo'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Entrada Inteligente de Insumos (Cupom/Nota Fiscal com IA) */}
      <AnimatePresence>
        {isInvoiceModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-5xl h-[90vh] md:h-[80vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b bg-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 animate-pulse">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Entrada Inteligente de Estoque (IA)</h2>
                    <p className="text-xs font-semibold text-slate-400">Escaneie cupons fiscais, imagens ou códigos XML e adicione insumos automaticamente com auxílio da IA.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsInvoiceModalOpen(false);
                    setUploadedFile(null);
                    setInvoiceText('');
                    setParsedInvoice(null);
                  }} 
                  className="p-3 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-slate-900"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Corpo */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                {!parsedInvoice ? (
                  /* Passo 1 - Envio do cupom / Nota */
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                    {/* Lado Esquerdo: Upload de Arquivos */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <ImageIcon className="text-emerald-500" size={18} />
                          <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">Enviar Imagem ou XML</h3>
                        </div>
                        <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
                          Tire uma foto nítida do Cupom Fiscal impresso no seu celular e envie aqui, ou faça o upload de um arquivo XML de NFe/NFCe diretamente do seu computador.
                        </p>

                        {!uploadedFile ? (
                          <label className="flex flex-col items-center justify-center border-4 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-[2rem] p-10 cursor-pointer transition-all group">
                            <Upload size={40} className="text-slate-300 group-hover:text-emerald-500 transition-all mb-4" />
                            <span className="text-xs font-black text-slate-900 uppercase tracking-widest block mb-1">Escolher arquivo</span>
                            <span className="text-[10px] font-semibold text-slate-400 text-center">Arraste e solte imagens (JPEG, PNG), PDFs ou XMLs</span>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*,application/pdf,text/xml,application/xml" 
                              onChange={handleFileChange} 
                            />
                          </label>
                        ) : (
                          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white rounded-xl border flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                {uploadedFile.name.split('.').pop()}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 max-w-xs truncate">{uploadedFile.name}</h4>
                                <p className="text-[10px] text-slate-400 font-semibold uppercase">{uploadedFile.mimeType || 'Arquivo Fiscal'}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setUploadedFile(null)}
                              className="p-2 bg-white border rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all text-slate-400"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex gap-3 mt-6">
                        <Info size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                          A IA interpretará as quantidades originais (como caixas, fardos, latas) e as converterá automaticamente para as unidades métricas que você usa no GastroAI (como kg, litros ou unidades individuais).
                        </p>
                      </div>
                    </div>

                    {/* Lado Direito: Copiar e Colar Texto */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <ClipboardList className="text-indigo-500" size={18} />
                          <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">Copiar & Colar Texto</h3>
                        </div>
                        <p className="text-xs text-slate-400 mb-4 font-medium leading-relaxed">
                          Não tem o arquivo salvo? Sem problemas! Você pode copiar e colar o texto cru do extrato do cupom fiscal ou da nota fiscal que recebeu via e-mail ou WhatsApp no espaço abaixo.
                        </p>

                        <textarea
                          placeholder="Cole aqui as informações textuais do cupom, os dados XML copiados ou a listagem detalhada de compras recebida do seu fornecedor de suprimentos..."
                          className="w-full h-44 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs text-slate-600 resize-none custom-scrollbar"
                          value={invoiceText}
                          onChange={(e) => setInvoiceText(e.target.value)}
                        />
                      </div>

                      {/* Botão de Envio */}
                      <div className="mt-6 pt-4 border-t">
                        <button
                          onClick={handleAnalyzeInvoice}
                          disabled={isParsingInvoice || (!invoiceText && !uploadedFile)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-4 rounded-2xl font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl shadow-emerald-100 transition-all"
                        >
                          {isParsingInvoice ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Lendo com Inteligência GastroAI...
                            </>
                          ) : (
                            <>
                              <Sparkles size={16} className="text-emerald-200 animate-pulse" />
                              Analisar Nota Fiscal com IA
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Passo 2 - Revisão de Dados Extraídos */
                  <div className="space-y-6">
                    {/* Cabeçalho de metadados gerais */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Fornecedor Identificado</span>
                        <input 
                          type="text" 
                          value={parsedInvoice.supplierName || ''} 
                          onChange={(e) => setParsedInvoice({...parsedInvoice, supplierName: e.target.value})}
                          className="w-full font-black text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
                          placeholder="Razão Social / Nome Fantasia"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Data do Documento</span>
                        <input 
                          type="date" 
                          value={parsedInvoice.purchaseDate || ''} 
                          onChange={(e) => setParsedInvoice({...parsedInvoice, purchaseDate: e.target.value})}
                          className="w-full font-bold text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Valor Total da Compra</span>
                        <div className="w-full font-black text-sm text-emerald-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center">
                          R$ {Number(parsedInvoice.totalAmount || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Tabela de itens extraídos */}
                    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
                      <div className="p-5 border-b bg-slate-50/50 flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <h4 className="font-black text-xs text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            {isUsingLocalParser ? (
                              <>
                                <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] px-2.5 py-1 rounded-full font-black flex items-center gap-1">
                                  <Zap size={11} className="fill-amber-500 text-amber-500 animate-bounce" /> LEITOR OFFLINE ATIVADO
                                </span>
                                Itens Extraídos Localmente
                              </>
                            ) : (
                              <>
                                <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] px-2.5 py-1 rounded-full font-black flex items-center gap-1">
                                  <Sparkles size={11} className="fill-emerald-500 text-emerald-500 animate-pulse" /> IA GASTROAI NUVEM
                                </span>
                                Insumos Mapeados Pela IA
                              </>
                            )}
                          </h4>
                          <p className="text-[10px] font-medium text-slate-400 mt-0.5">Revise o nome, a conversão métrica e associe cada compra a um insumo do seu banco de dados.</p>
                        </div>
                        <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-3 py-1 rounded-full border border-indigo-100">
                          {parsedInvoice.items?.length || 0} Itens Encontrados
                        </span>
                      </div>

                      <div className="overflow-x-auto max-h-80 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50 border-b text-[9px] text-slate-400 font-black uppercase tracking-widest sticky top-0 bg-white">
                            <tr>
                              <th className="px-4 py-3 text-center w-12">
                                <input 
                                  type="checkbox" 
                                  checked={Object.values(selectedItemsForImport).every(v => v)}
                                  onChange={(e) => {
                                    const next: Record<number, boolean> = {};
                                    parsedInvoice.items?.forEach((_, i) => {
                                      next[i] = e.target.checked;
                                    });
                                    setSelectedItemsForImport(next);
                                  }}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </th>
                              <th className="px-4 py-3 w-1/3">Insumo na Nota Fiscal</th>
                              <th className="px-4 py-3 text-center">Unid. Orig.</th>
                              <th className="px-4 py-3 text-right">Compra</th>
                              <th className="px-4 py-3 text-right">Preço Total</th>
                              <th className="px-4 py-3 w-1/4">Estrutura de Conversão & Estoque</th>
                              <th className="px-4 py-3 w-1/4">Mapeamento no GastroAI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-xs">
                            {parsedInvoice.items?.map((item, idx) => {
                              const isChecked = selectedItemsForImport[idx];
                              const mapping = mappingToExisting[idx];

                              return (
                                <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${!isChecked ? 'opacity-50' : ''}`}>
                                  {/* Checkbox */}
                                  <td className="px-4 py-4 text-center">
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={(e) => {
                                        setSelectedItemsForImport({
                                          ...selectedItemsForImport,
                                          [idx]: e.target.checked
                                        });
                                      }}
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                  </td>

                                  {/* Nome extraído (editável) */}
                                  <td className="px-4 py-4">
                                    <input 
                                      type="text" 
                                      value={item.name}
                                      onChange={(e) => {
                                        const newItems = [...parsedInvoice.items];
                                        newItems[idx].name = e.target.value;
                                        setParsedInvoice({...parsedInvoice, items: newItems});
                                      }}
                                      className="w-full font-black text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 px-1 py-0.5 outline-none"
                                    />
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.category || 'Outros'}</span>
                                  </td>

                                  {/* Unidade Original */}
                                  <td className="px-4 py-4 text-center font-bold text-slate-500 uppercase">
                                    {item.originalUnit}
                                  </td>

                                  {/* Quantidade Comprada */}
                                  <td className="px-4 py-4 text-right font-bold text-slate-700">
                                    {item.originalQuantity}
                                  </td>

                                  {/* Preço Total do Item */}
                                  <td className="px-4 py-4 text-right font-black text-slate-800">
                                    R$ {Number(item.totalCost).toFixed(2)}
                                  </td>

                                  {/* Conversão da IA */}
                                  <td className="px-4 py-4 space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <Scale size={12} className="text-emerald-500" />
                                      <span className="font-black text-emerald-600">
                                        + {item.normalizedQuantity} {item.normalizedUnit}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">
                                      Custo: R$ {Number(item.costPerUnit || 0).toFixed(2)} / {item.normalizedUnit}
                                    </div>
                                  </td>

                                  {/* Associação do Insumo */}
                                  <td className="px-4 py-4">
                                    <select
                                      value={mapping || 'NEW'}
                                      onChange={(e) => {
                                        setMappingToExisting({
                                          ...mappingToExisting,
                                          [idx]: e.target.value
                                        });
                                      }}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:border-indigo-500 text-xs font-semibold text-slate-700 outline-none"
                                    >
                                      <option value="NEW">✨ Criar Como Novo Insumo</option>
                                      <option disabled>── Associar a Insumo Existente ──</option>
                                      {rawMaterials.map(rm => (
                                        <option key={rm.id} value={rm.id}>
                                          🔄 {rm.name} ({rm.unit})
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Botões do Próximo Passo */}
                    <div className="flex justify-between items-center pt-4 border-t">
                      <button
                        onClick={() => {
                          setParsedInvoice(null);
                        }}
                        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
                      >
                        Voltar / Escanear Outro
                      </button>

                      <button
                        onClick={handleImportInvoiceItems}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black text-xs tracking-widest uppercase flex items-center gap-2 shadow-xl shadow-indigo-100 transition-all"
                      >
                        <CheckCircle2 size={16} />
                        Confirmar e Atualizar Estoque
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPizzaWizardOpen && (() => {
          const eligiblePizzas = products.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(wizardFlavorSearch.toLowerCase());
            const matchCategory = wizardFlavorCategoryFilter === 'Todos' || p.category === wizardFlavorCategoryFilter;
            return matchSearch && matchCategory;
          });

          const toggleFlavor = (id: string) => {
            if (wizardAllowedFlavorIds.includes(id)) {
              setWizardAllowedFlavorIds(wizardAllowedFlavorIds.filter(fId => fId !== id));
            } else {
              setWizardAllowedFlavorIds([...wizardAllowedFlavorIds, id]);
            }
          };

          const selectAllEligiblePizzas = () => {
            const allIds = eligiblePizzas.map(p => p.id);
            setWizardAllowedFlavorIds(prev => {
              const next = [...prev];
              allIds.forEach(id => {
                if (!next.includes(id)) next.push(id);
              });
              return next;
            });
          };

          const clearAllEligiblePizzas = () => {
            const allIds = eligiblePizzas.map(p => p.id);
            setWizardAllowedFlavorIds(prev => prev.filter(id => !allIds.includes(id)));
          };

          const selectedFlavors = products.filter(p => wizardAllowedFlavorIds.includes(p.id));
          const flavorsCount = selectedFlavors.length;

          // Raw materials expected average usage
          const mergedList: { name: string; quantity: number; unit: string }[] = [];
          const ingredientSum: Record<string, { quantity: number; unit: string }> = {};

          selectedFlavors.forEach(flavor => {
            if (flavor.technicalSheet) {
              flavor.technicalSheet.forEach(item => {
                if (!ingredientSum[item.rawMaterialId]) {
                  ingredientSum[item.rawMaterialId] = { quantity: 0, unit: item.unit || 'g' };
                }
                ingredientSum[item.rawMaterialId].quantity += item.quantity * 0.5;
              });
            }
          });

          Object.keys(ingredientSum).forEach(rawId => {
            const raw = rawMaterials.find(m => m.id === rawId);
            if (raw) {
              mergedList.push({
                name: raw.name,
                quantity: ingredientSum[rawId].quantity / (flavorsCount || 1),
                unit: raw.unit
              });
            }
          });

          // Price range and average for selected flavors
          const prices = selectedFlavors.map(f => f.price).filter(p => p > 0);
          const minPrice = prices.length ? Math.min(...prices) : 0;
          const maxPrice = prices.length ? Math.max(...prices) : 0;
          const avgPrice = prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

          // Average toppings cost calculation
          let totalCostSum = 0;
          selectedFlavors.forEach(flavor => {
            let flavorToppingCost = 0;
            if (flavor.technicalSheet && flavor.technicalSheet.length > 0) {
              flavorToppingCost = flavor.technicalSheet.reduce((acc, item) => {
                const rawMat = rawMaterials.find(m => m.id === item.rawMaterialId);
                return acc + (rawMat ? rawMat.costPerUnit * item.quantity : 0);
              }, 0);
            } else {
              flavorToppingCost = Math.max(0, flavor.cost - wizardBaseCost);
            }
            totalCostSum += flavorToppingCost;
          });

          const avgToppingCost = flavorsCount > 0 ? (totalCostSum / flavorsCount) : 0;
          const totalExpectedCost = avgToppingCost + wizardBaseCost;

          // Selling price used for metrics
          const referencePrice = wizardPricingModel === 'fixed' ? wizardPrice : avgPrice;
          const profitCombined = referencePrice - totalExpectedCost;
          const cmvCombined = referencePrice > 0 ? (totalExpectedCost / referencePrice) * 100 : 0;

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-slate-900/60 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-5xl h-[90vh] md:h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="p-6 border-b bg-gradient-to-r from-orange-500/5 to-amber-500/5 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-100">
                      <Pizza size={28} className="animate-[spin_40s_linear_infinite]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 tracking-tighter italic uppercase flex items-center gap-2">
                        Montar Pizza Meio-a-Meio <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-200">CMV Integrado</span>
                      </h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Crie uma pizza meio-a-meio customizável selecionando quais sabores o cliente poderá escolher
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsPizzaWizardOpen(false)} 
                    className="p-3 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-900"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar bg-slate-50/30">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-5">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 border-b pb-1">
                          <TrendingUp size={12} /> Sabores Permitidos
                        </h3>

                        <div className="space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="flex gap-1">
                              <span className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-50/50 px-2.5 rounded-xl border border-slate-100 min-h-[38px]">
                                Categoria:
                              </span>
                              <select
                                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all cursor-pointer min-h-[38px]"
                                value={wizardFlavorCategoryFilter}
                                onChange={(e) => setWizardFlavorCategoryFilter(e.target.value)}
                              >
                                <option value="Todos">Todas as Categorias</option>
                                {allProductCategories.map(cat => (
                                  <option key={`wizard-flv-filter-cat-${cat}`} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                className="flex-1 px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all placeholder:text-slate-300 min-h-[38px]"
                                placeholder="Buscar sabor existente..."
                                value={wizardFlavorSearch}
                                onChange={(e) => setWizardFlavorSearch(e.target.value)}
                              />
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={selectAllEligiblePizzas}
                                  className="px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap min-h-[38px]"
                                >
                                  Marcar
                                </button>
                                <button
                                  type="button"
                                  onClick={clearAllEligiblePizzas}
                                  className="px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap min-h-[38px]"
                                >
                                  Limpar
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="max-h-56 overflow-y-auto custom-scrollbar border rounded-2xl p-2.5 space-y-1 bg-slate-50/20">
                            {eligiblePizzas.map(flavor => {
                              const isChecked = wizardAllowedFlavorIds.includes(flavor.id);
                              return (
                                <label
                                  key={`flavor-checkbox-${flavor.id}`}
                                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border text-xs transition-all ${
                                    isChecked
                                      ? 'bg-orange-50/30 border-orange-200 shadow-sm'
                                      : 'bg-white border-transparent hover:bg-slate-50 text-slate-600'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleFlavor(flavor.id)}
                                    className="w-4.5 h-4.5 rounded text-orange-500 focus:ring-orange-500/20 border-slate-200 cursor-pointer"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold truncate text-slate-800">{flavor.name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{flavor.category || 'Geral'}</p>
                                  </div>
                                  <span className="font-mono font-bold text-slate-500">
                                    R$ {flavor.price.toFixed(2)}
                                  </span>
                                </label>
                              );
                            })}
                            {eligiblePizzas.length === 0 && (
                              <div className="py-8 text-center text-slate-400">
                                <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum sabor de pizza encontrado</p>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 p-1 font-bold uppercase tracking-tight">
                            <span>{flavorsCount} sabores permitidos para seleção</span>
                            {flavorsCount > 0 && <span className="text-orange-500">{((flavorsCount / products.length) * 100).toFixed(0)}% da base total</span>}
                          </div>
                        </div>

                        <div className="space-y-2 border-t pt-4">
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Regra de Precificação das Opções</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              type="button"
                              onClick={() => setWizardPricingModel('variable')}
                              className={`py-3 px-4 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center gap-1 leading-tight ${
                                wizardPricingModel === 'variable' 
                                  ? 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-100' 
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span>Média dos Sabores</span>
                              <span className="text-[8px] opacity-85 font-bold uppercase tracking-normal">Soma 50% de cada meio</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => setWizardPricingModel('fixed')}
                              className={`py-3 px-4 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center justify-center gap-1 leading-tight ${
                                wizardPricingModel === 'fixed' 
                                  ? 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-100' 
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span>Valor Fixo (Flat)</span>
                              <span className="text-[8px] opacity-85 font-bold uppercase tracking-normal">Preço estático na pizza</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-t pt-4">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Custo Base Massa/Forno/Caixa</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-bold">R$</span>
                            <input 
                              type="number" 
                              step="0.05"
                              className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-right outline-none text-slate-700 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500"
                              value={wizardBaseCost}
                              onChange={(e) => setWizardBaseCost(Math.max(0, parseFloat(e.target.value) || 0))}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                          <Beaker size={12} className="text-indigo-500" /> Ficha Técnica Média Estimada
                        </h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                          Média estatística de ingredientes de todos os sabores permitidos para cálculo preciso de estoque.
                        </p>

                        {mergedList.length === 0 ? (
                          <div className="py-6 text-center border border-dashed border-slate-100 rounded-2xl text-slate-400">
                            <p className="text-[9.5px] font-bold uppercase tracking-wide">Marque sabores para ver a receita média</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar border rounded-2xl p-3 bg-slate-50/50">
                            {mergedList.map((item, index) => (
                              <div key={`integrated-sheet-${index}`} className="flex justify-between items-center text-[10.5px] py-1 border-b border-slate-100/60 last:border-0 font-bold">
                                <span className="text-slate-600">{item.name}</span>
                                <span className="text-slate-800 font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded-md border text-right">
                                  {item.quantity.toFixed(3)} {item.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                        <div className="flex flex-col items-center justify-center py-4 bg-orange-50/10 rounded-3xl border border-orange-100/50">
                          <div className="relative w-32 h-32 rounded-full border-4 border-amber-600 bg-amber-50 overflow-hidden flex shadow-lg shadow-orange-100/30">
                            <div className="w-1/2 h-full bg-orange-100/50 hover:bg-orange-200/50 border-r border-dashed border-amber-800/10 relative flex items-center justify-center flex-col transition-all text-center px-1">
                              <span className="text-[9px] font-black text-orange-950 uppercase">Múltiplos</span>
                              <span className="text-[7.5px] font-black text-orange-700 bg-orange-200/50 px-1 rounded truncate w-14">
                                {flavorsCount > 0 ? `${selectedFlavors[0]?.name.slice(0, 6)}...` : 'Vazio'}
                              </span>
                            </div>
                            <div className="w-1/2 h-full bg-amber-50/50 relative flex items-center justify-center flex-col transition-all text-center px-1">
                              <span className="text-[9px] font-black text-amber-950 uppercase">Sabores</span>
                              <span className="text-[7.5px] font-black text-amber-700 bg-amber-200/50 px-1 rounded truncate w-14">
                                {flavorsCount > 1 ? `${selectedFlavors[1]?.name.slice(0, 6)}...` : 'Vazio'}
                              </span>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="bg-amber-100 text-amber-900 border border-amber-300 rounded-full px-2 py-0.5 text-[8.5px] font-black shadow-sm uppercase tracking-widest scale-90">
                                Base: R$ {wizardBaseCost.toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-3">Disponível em Meio-a-Meio Customizável</p>
                        </div>

                        <div className="space-y-4 pt-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Nome do Produto Principal</label>
                            <input 
                              type="text"
                              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500"
                              placeholder="Ex: Pizza Meio-a-Meio Customizada"
                              value={wizardName}
                              onChange={(e) => setWizardName(e.target.value)}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Categoria</label>
                              <select 
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 cursor-pointer"
                                value={wizardCategory}
                                onChange={(e) => setWizardCategory(e.target.value)}
                              >
                                <option value="Pizzas">Pizzas</option>
                                {productCategories.filter(c => c !== 'Pizzas').map(cat => (
                                  <option key={`wizard-cat-${cat}`} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                {wizardPricingModel === 'variable' ? 'Preço de Venda Base' : 'Preço de Venda Fixo (R$)'}
                              </label>
                              <input 
                                type="number"
                                step="0.50"
                                disabled={wizardPricingModel === 'variable'}
                                className={`w-full px-3 py-2.5 border rounded-2xl text-xs font-black text-slate-800 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 ${
                                  wizardPricingModel === 'variable' ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                                }`}
                                value={wizardPrice}
                                onChange={(e) => setWizardPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                              />
                            </div>
                          </div>

                          <div className="p-4 bg-orange-50/15 rounded-2xl border border-orange-100/50 space-y-2.5 text-[11px] font-bold">
                            <div className="flex justify-between text-slate-500">
                              <span>Faixa de Preço dos Sabores:</span>
                              <span className="text-slate-800 font-mono">
                                {minPrice > 0 ? `R$ ${minPrice.toFixed(2)} - R$ ${maxPrice.toFixed(2)}` : 'R$ 0,00'}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Custo Toppings Médio Estimado:</span>
                              <span className="text-slate-800 font-mono">R$ {avgToppingCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>Custo Base (Massa/Caixa):</span>
                              <span className="text-slate-800 font-mono">R$ {wizardBaseCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-indigo-600 font-black border-t pt-2 font-mono">
                              <span>Custo Médio Total Est.:</span>
                              <span>R$ {totalExpectedCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 font-mono border-t pt-1 border-dashed">
                              <span>Lucro Bruto Médio Est.:</span>
                              <span className="text-emerald-600 font-extrabold font-mono">R$ {profitCombined.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center ${
                            cmvCombined > 35 
                              ? 'bg-rose-50 border-rose-100 text-rose-800' 
                              : cmvCombined > 28 
                                ? 'bg-amber-50 border-amber-100 text-amber-800' 
                                : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                          }`}>
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">CMV Realizado Estimado</span>
                            <span className="text-lg font-black mt-1 font-mono">
                              {referencePrice > 0 ? `${cmvCombined.toFixed(1)}%` : '0%'}
                            </span>
                            <span className="text-[9px] font-bold uppercase mt-0.5">
                              {referencePrice <= 0 ? 'Precificação Dinâmica das Opções' : cmvCombined <= 28 ? '🌟 CMV Excelente (Meta <28%)' : cmvCombined <= 35 ? '⚠️ CMV Moderado' : '🚨 Margem Perigosa! Aumente o Preço.'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t bg-slate-50 flex gap-4 justify-between items-center shrink-0 font-bold">
                  <button 
                    onClick={() => setIsPizzaWizardOpen(false)} 
                    className="px-8 py-4 rounded-xl font-black text-slate-400 hover:bg-white transition-all uppercase tracking-widest text-[10px]"
                  >
                    Descartar
                  </button>
                  <button 
                    onClick={handleSavePizzaMeioMeio}
                    className="bg-orange-500 text-white px-10 py-4 rounded-xl font-black hover:bg-orange-600 transition-all shadow-xl shadow-orange-100 flex items-center gap-3 uppercase tracking-[0.2em] text-[11px] cursor-pointer"
                  >
                    <Save size={18} /> Confirmar & Salvar no Estoque
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl rounded-[1.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
            <div className="p-4 border-b flex justify-between items-center bg-indigo-50/30">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-2 rounded-xl text-white">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800">Editar Produto</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Gestão detalhada e histórico de preços</p>
                </div>
              </div>
              <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="px-4 py-2 border-b bg-white flex gap-4 overflow-x-auto">
              <button 
                onClick={() => setModalTab('basic')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                  modalTab === 'basic' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <LayoutGrid size={14} /> Dados Básicos
              </button>
              <button 
                onClick={() => setModalTab('sheet')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                  modalTab === 'sheet' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Beaker size={14} /> Ficha Técnica
              </button>
              <button 
                onClick={() => setModalTab('option-categories')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                  modalTab === 'option-categories' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <LayoutGrid size={14} /> Categorias de Opcionais
              </button>
              <button 
                onClick={() => setModalTab('pizza-cmv')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                  modalTab === 'pizza-cmv' ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Pizza size={14} /> Pizza & CMV Inteligente
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
              {modalTab === 'basic' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-left-4 duration-300">
                  <div className="space-y-5">
                  <section className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 border-b pb-1 tracking-widest flex items-center gap-2">
                      <Package size={14} /> Dados Principais
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Nome do Produto</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                            value={editingProduct.name}
                            onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                          />
                        </div>
                        <div className="flex flex-col gap-1 items-center shrink-0">
                           <div className="w-32 h-32 rounded-2xl border bg-white overflow-hidden relative group flex items-center justify-center border-slate-200 shadow-sm">
                              {editingProduct.image ? (
                                 <img src={editingProduct.image} className="w-full h-full object-cover" alt={editingProduct.name} />
                              ) : (
                                 <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50 p-4 text-center">
                                    <ImageIcon size={32} strokeWidth={1} />
                                    <span className="text-[8px] font-black uppercase mt-2">Sem Imagem</span>
                                 </div>
                              )}
                              
                              {editingProduct.image && (
                                 <div className="absolute inset-0 bg-slate-900/80 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                    <label className="w-full h-full hover:bg-white/10 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer">
                                       <Upload size={14} className="text-emerald-400" /> Upload Foto
                                       <input type="file" className="hidden" accept="image/*" onChange={handleProductImageUpload} />
                                    </label>
                                 </div>
                              )}
                           </div>
                           {!editingProduct.image && (
                              <div className="flex flex-col gap-2 w-full mt-2">
                                 <label className="w-full py-2 bg-white text-slate-600 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:text-emerald-600 transition-all cursor-pointer flex items-center justify-center gap-2">
                                    <Upload size={14} /> <span className="text-[10px] font-black uppercase">Fazer Upload de Foto</span>
                                    <input id="product-image-upload" type="file" className="hidden" accept="image/*" onChange={handleProductImageUpload} />
                                 </label>
                              </div>
                           )}
                           {editingProduct.image && (
                              <button 
                                onClick={() => setEditingProduct({ ...editingProduct, image: '' })}
                                className="p-1 bg-rose-50 text-rose-500 rounded-lg border border-rose-100 hover:bg-rose-100 transition-all mt-0.5"
                                title="Remover Foto"
                              >
                                <Trash2 size={10} />
                              </button>
                           )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Descrição (Ingredientes/Detalhes)</label>
                        <textarea 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs resize-none"
                          rows={2}
                          placeholder="Ex: Pão brioche, blend de 160g, queijo cheddar, bacon crocante e maionese da casa."
                          value={editingProduct.description || ''}
                          onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Código de Barras (EAN / GTIN)</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                              type="text" 
                              placeholder="Escaneie ou digite o código..."
                              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono text-xs"
                              value={editingProduct.barcode || ''}
                              onChange={(e) => setEditingProduct({...editingProduct, barcode: e.target.value})}
                            />
                          </div>
                          <button 
                            onClick={handleMockScan}
                            disabled={isScanning}
                            className="p-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center group relative overflow-hidden"
                            title="Simular Escaneamento"
                          >
                            {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Scan size={16} />}
                            {isScanning && (
                              <div className="absolute inset-x-0 h-[2px] bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-[scan_1s_linear_infinite]"></div>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Custo (R$)</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                            value={formatCurrency(editingProduct.cost)}
                            onChange={(e) => setEditingProduct({...editingProduct, cost: parseCurrency(maskCurrency(e.target.value))})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Venda (R$)</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                            value={formatCurrency(editingProduct.price)}
                            onChange={(e) => setEditingProduct({...editingProduct, price: parseCurrency(maskCurrency(e.target.value))})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                           <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Categoria</label>
                           <select 
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs cursor-pointer"
                              value={editingProduct.category}
                              onChange={(e) => {
                                if (e.target.value === "__NEW__") {
                                  const newCat = prompt("Digite o nome da nova categoria de produto:");
                                  if (newCat && newCat.trim()) {
                                    const trimmedCat = newCat.trim();
                                    if (!productCategories.includes(trimmedCat)) {
                                      setProductCategories([...productCategories, trimmedCat]);
                                    }
                                    setEditingProduct({...editingProduct, category: trimmedCat});
                                  }
                                } else {
                                  setEditingProduct({...editingProduct, category: e.target.value});
                                }
                              }}
                           >
                              {allProductCategories.map(cat => (
                                 <option key={cat} value={cat}>{cat}</option>
                              ))}
                              <option value="__NEW__">➕ Criar Nova Categoria...</option>
                           </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Estoque Atual</label>
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                              value={editingProduct.stock}
                              onChange={(e) => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Estoque Mín.</label>
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                              value={editingProduct.minStock || 0}
                              onChange={(e) => setEditingProduct({...editingProduct, minStock: parseInt(e.target.value) || 0})}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider ml-1">Estratégia de Estoque</label>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => setEditingProduct({...editingProduct, trackStock: true})}
                             className={`flex-1 py-3 rounded-xl border text-[9px] font-black uppercase tracking-tighter transition-all flex flex-col items-center justify-center gap-1 ${
                               editingProduct.trackStock 
                                 ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-100' 
                                 : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                             }`}
                           >
                             <Box size={14} /> Controlar Estoque
                           </button>
                           <button 
                             onClick={() => setEditingProduct({...editingProduct, trackStock: false})}
                             className={`flex-1 py-3 rounded-xl border text-[9px] font-black uppercase tracking-tighter transition-all flex flex-col items-center justify-center gap-1 ${
                               !editingProduct.trackStock 
                                 ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-100' 
                                 : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                             }`}
                           >
                             <Clock size={14} /> Sob Demanda
                           </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 border-b pb-1 tracking-widest flex items-center gap-2">
                      <ListChecks size={14} /> Canais de Venda e Status
                    </h3>
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Delivery</span>
                        <input 
                          type="checkbox" 
                          checked={editingProduct.isAvailableDelivery ?? true} 
                          onChange={(e) => setEditingProduct({...editingProduct, isAvailableDelivery: e.target.checked})}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Salão/Ficha</span>
                        <input 
                          type="checkbox" 
                          checked={editingProduct.isAvailableDineIn ?? true} 
                          onChange={(e) => setEditingProduct({...editingProduct, isAvailableDineIn: e.target.checked})}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Marketplace</span>
                        <input 
                          type="checkbox" 
                          checked={editingProduct.isAvailableOnline ?? true} 
                          onChange={(e) => setEditingProduct({...editingProduct, isAvailableOnline: e.target.checked})}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Cardápio Digital</span>
                        <input 
                          type="checkbox" 
                          checked={editingProduct.isAvailableDigitalMenu ?? true} 
                          onChange={(e) => setEditingProduct({...editingProduct, isAvailableDigitalMenu: e.target.checked})}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                        />
                      </div>
                      <div className="col-span-2 pt-2 border-t border-slate-200 mt-1 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Status do Produto</span>
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${editingProduct.active ?? true ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {editingProduct.active ?? true ? 'Ativo' : 'Inativo'}
                          </span>
                          <button 
                            type="button"
                            onClick={() => setEditingProduct({ ...editingProduct, active: !(editingProduct.active ?? true) })}
                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${editingProduct.active ?? true ? 'bg-indigo-600' : 'bg-slate-200'}`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editingProduct.active ?? true ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-5 flex flex-col max-h-[600px]">
                  <section className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 border-b pb-1 tracking-widest flex items-center gap-2">
                      <History size={14} /> Evolução 90 dias (Preço x Custo)
                    </h3>
                    <div className="h-[180px] w-full bg-slate-50 rounded-2xl p-2 border border-slate-100">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="dateFormatted" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 'bold', fill: '#94a3b8'}} />
                          <YAxis hide />
                          <Tooltip 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                            itemStyle={{fontSize: '10px'}}
                          />
                          <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{fontSize: '9px'}} />
                          <Line type="monotone" dataKey="price" name="Venda" stroke="#4f46e5" strokeWidth={2} dot={{r: 3, fill: '#4f46e5', strokeWidth: 1, stroke: '#fff'}} activeDot={{r: 5}} />
                          <Line type="monotone" dataKey="cost" name="Custo" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={{r: 3, fill: '#ef4444', strokeWidth: 1, stroke: '#fff'}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  <section className="flex-1 space-y-3 flex flex-col min-h-0">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 border-b pb-1 tracking-widest flex items-center gap-2">
                      <ClipboardList size={14} /> Registros de Alteração
                    </h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-2xl bg-slate-50/50">
                       <table className="w-full text-left border-collapse">
                          <thead className="bg-white border-b sticky top-0 z-10">
                             <tr>
                                <th className="px-3 py-1.5 font-black text-slate-400 text-[8px] uppercase tracking-widest">Data</th>
                                <th className="px-3 py-1.5 font-black text-slate-400 text-[8px] uppercase tracking-widest text-right">Custo</th>
                                <th className="px-3 py-1.5 font-black text-slate-400 text-[8px] uppercase tracking-widest text-right">Venda</th>
                                <th className="px-3 py-1.5 font-black text-slate-400 text-[8px] uppercase tracking-widest text-center">Margem</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {sortedHistory.map((entry, idx) => {
                                const nextEntry = sortedHistory[idx + 1];
                                const costTrend = nextEntry ? (entry.cost > nextEntry.cost ? 'up' : entry.cost < nextEntry.cost ? 'down' : 'stable') : 'stable';
                                const margin = ((entry.price - entry.cost) / entry.price) * 100;
                                
                                return (
                                   <tr key={`raw-hist-${idx}-${entry.date}`} className="hover:bg-white transition-colors group">
                                      <td className="px-3 py-2">
                                         <p className="text-[10px] font-bold text-slate-600">{new Date(entry.date).toLocaleDateString('pt-BR')}</p>
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                         <div className="flex items-center justify-end gap-1">
                                            <span className="text-[10px] font-black text-slate-700">R$ {entry.cost.toFixed(2)}</span>
                                            {costTrend === 'up' ? <ArrowUpRight size={12} className="text-rose-500" /> : costTrend === 'down' ? <ArrowDownRight size={12} className="text-emerald-500" /> : <Minus size={12} className="text-slate-300" />}
                                         </div>
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                         <span className="text-[10px] font-black text-indigo-600">R$ {entry.price.toFixed(2)}</span>
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                         <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${margin > 50 ? 'bg-emerald-100 text-emerald-700' : margin > 30 ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {margin.toFixed(0)}%
                                         </div>
                                      </td>
                                   </tr>
                                );
                             })}
                             {sortedHistory.length === 0 && (
                                <tr>
                                   <td colSpan={4} className="px-3 py-6 text-center opacity-30">
                                      <p className="text-[8px] font-black uppercase tracking-widest">Sem histórico registrado</p>
                                   </td>
                                </tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                    <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl flex gap-2 text-indigo-700 items-start">
                       <Info size={14} className="shrink-0 mt-0.5" />
                       <p className="text-[9px] font-medium leading-tight">O sistema registra automaticamente as variações quando os preços de custo ou venda são atualizados durante o salvamento.</p>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {modalTab === 'sheet' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex gap-3 items-start">
                    <Beaker size={18} className="text-indigo-600 shrink-0 mt-1" />
                    <div>
                      <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-wider">Ficha Técnica Automatizada</h4>
                      <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">
                        Vincule insumos para calcular o custo real de produção. O sistema atualizará o CMV automaticamente conforme os preços dos insumos variarem.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Insumos Utilizados</h3>
                      <button 
                        onClick={() => setEditingProduct({
                          ...editingProduct,
                          technicalSheet: [...(editingProduct.technicalSheet || []), { rawMaterialId: '', quantity: 0, unit: 'un' }]
                        })}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-1"
                      >
                        <Plus size={12} /> Adicionar Insumo
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {editingProduct.technicalSheet?.map((item, idx) => (
                        <div key={`raw-item-${idx}-${item.rawMaterialId}`} className="flex gap-3 items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm group hover:border-indigo-200 transition-all">
                          <div className="flex-1 space-y-1">
                            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Insumo / Matéria-Prima</label>
                            <select 
                              className="w-full bg-transparent border-none outline-none text-[11px] font-bold text-slate-700"
                              value={item.rawMaterialId}
                              onChange={(e) => {
                                const newSheet = [...(editingProduct.technicalSheet || [])];
                                newSheet[idx].rawMaterialId = e.target.value;
                                const material = rawMaterials.find(m => m.id === e.target.value);
                                if (material) newSheet[idx].unit = material.unit;
                                setEditingProduct({ ...editingProduct, technicalSheet: newSheet });
                              }}
                            >
                              <option value="">Selecione um insumo...</option>
                              {rawMaterials.map(m => (
                                <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24 space-y-1">
                            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Quantidade</label>
                            <div className="flex items-center gap-1">
                              <input 
                                type="number" 
                                className="w-full bg-transparent border-none outline-none text-[11px] font-black text-indigo-600"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newSheet = [...(editingProduct.technicalSheet || [])];
                                  newSheet[idx].quantity = parseFloat(e.target.value) || 0;
                                  setEditingProduct({ ...editingProduct, technicalSheet: newSheet });
                                }}
                              />
                              <span className="text-[9px] font-bold text-slate-400">{item.unit}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const newSheet = (editingProduct.technicalSheet || []).filter((_, i) => i !== idx);
                              setEditingProduct({ ...editingProduct, technicalSheet: newSheet });
                            }}
                            className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {(!editingProduct.technicalSheet || editingProduct.technicalSheet.length === 0) && (
                        <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                          <Beaker size={32} className="mx-auto text-slate-200 mb-2" />
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum insumo vinculado</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'option-categories' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Categorias de Opcionais</h3>
                      <p className="text-[9px] text-slate-500 font-bold">Ex: "Escolha seu molho", "Adicionais", etc.</p>
                    </div>
                    <div className="flex gap-2">
                      {editingProduct.options && editingProduct.options.length > 0 && (!editingProduct.optionCategories || editingProduct.optionCategories.length === 0) && (
                        <button 
                          onClick={() => {
                            const legacyCategory = {
                              id: `cat-legacy-${Date.now()}`,
                              name: 'Opcionais',
                              min: 0,
                              max: 0,
                              options: editingProduct.options || []
                            };
                            setEditingProduct({
                              ...editingProduct,
                              optionCategories: [legacyCategory],
                              options: [] // Limpa os antigos após migrar
                            });
                          }}
                          className="bg-amber-50 text-amber-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center gap-2 border border-amber-200"
                        >
                          <ArrowRightLeft size={14} /> Migrar Opcionais Antigos
                        </button>
                      )}
                      <button 
                        onClick={() => setEditingProduct({
                          ...editingProduct, 
                          optionCategories: [...(editingProduct.optionCategories || []), { id: `cat-${Date.now()}`, name: '', min: 0, max: 1, options: [] }]
                        })}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                      >
                        <Plus size={14} /> Nova Categoria
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {editingProduct.optionCategories?.map((cat, catIdx) => (
                      <div key={cat.id} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-white border-b flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                          <div className="flex-1 space-y-1 w-full">
                            <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Nome da Categoria</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                list="all-option-categories"
                                placeholder="Ex: Escolha seu molho"
                                className="flex-1 bg-transparent border-none outline-none text-xs font-black text-slate-800"
                                value={cat.name}
                                onChange={(e) => {
                                  const newCats = [...(editingProduct.optionCategories || [])];
                                  newCats[catIdx].name = e.target.value;
                                  setEditingProduct({ ...editingProduct, optionCategories: newCats });
                                }}
                              />
                              <datalist id="all-option-categories">
                                {allOptionCategories.map(oc => (
                                  <option key={oc.id} value={oc.name} />
                                ))}
                              </datalist>
                              {cat.name && allOptionCategories.find(oc => oc.name === cat.name) && cat.options.length === 0 && (
                                <button 
                                  onClick={() => {
                                    const existing = allOptionCategories.find(oc => oc.name === cat.name);
                                    if (existing) {
                                      const newCats = [...(editingProduct.optionCategories || [])];
                                      newCats[catIdx] = {
                                        ...newCats[catIdx],
                                        min: existing.min,
                                        max: existing.max,
                                        options: JSON.parse(JSON.stringify(existing.options))
                                      };
                                      setEditingProduct({ ...editingProduct, optionCategories: newCats });
                                    }
                                  }}
                                  className="text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100"
                                >
                                  Importar Estrutura
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-4 w-full md:w-auto">
                            <div className="w-20 space-y-1">
                              <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Mínimo</label>
                              <input 
                                type="number" 
                                className="w-full bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 outline-none text-[11px] font-bold"
                                value={cat.min}
                                onChange={(e) => {
                                  const newCats = [...(editingProduct.optionCategories || [])];
                                  newCats[catIdx].min = parseInt(e.target.value) || 0;
                                  setEditingProduct({ ...editingProduct, optionCategories: newCats });
                                }}
                              />
                            </div>
                            <div className="w-20 space-y-1">
                              <label className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Máximo</label>
                              <input 
                                type="number" 
                                className="w-full bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 outline-none text-[11px] font-bold"
                                value={cat.max}
                                onChange={(e) => {
                                  const newCats = [...(editingProduct.optionCategories || [])];
                                  newCats[catIdx].max = parseInt(e.target.value) || 0;
                                  setEditingProduct({ ...editingProduct, optionCategories: newCats });
                                }}
                              />
                            </div>
                            <button 
                              onClick={() => {
                                const newCats = (editingProduct.optionCategories || []).filter((_, i) => i !== catIdx);
                                setEditingProduct({ ...editingProduct, optionCategories: newCats });
                              }}
                              className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-all self-end"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Opções desta Categoria</h4>
                            <button 
                              onClick={() => {
                                const newCats = [...(editingProduct.optionCategories || [])];
                                newCats[catIdx].options.push({ id: `opt-${Date.now()}`, name: '', price: 0 });
                                setEditingProduct({ ...editingProduct, optionCategories: newCats });
                              }}
                              className="text-indigo-600 hover:text-indigo-700 text-[8px] font-black uppercase tracking-widest flex items-center gap-1"
                            >
                              <Plus size={10} /> Adicionar Opção
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {cat.options.map((opt, optIdx) => (
                              <div key={opt.id} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm group">
                                <div className="flex-1">
                                  <input 
                                    type="text" 
                                    placeholder="Nome da opção"
                                    className="w-full bg-transparent border-none outline-none text-[10px] font-bold text-slate-700"
                                    value={opt.name}
                                    onChange={(e) => {
                                      const newCats = [...(editingProduct.optionCategories || [])];
                                      newCats[catIdx].options[optIdx].name = e.target.value;
                                      setEditingProduct({ ...editingProduct, optionCategories: newCats });
                                    }}
                                  />
                                </div>
                                <div className="w-20 flex items-center gap-1">
                                  <span className="text-[8px] font-bold text-slate-400">R$</span>
                                  <input 
                                    type="number" 
                                    className="w-full bg-transparent border-none outline-none text-[10px] font-black text-emerald-600"
                                    value={opt.price}
                                    onChange={(e) => {
                                      const newCats = [...(editingProduct.optionCategories || [])];
                                      newCats[catIdx].options[optIdx].price = parseFloat(e.target.value) || 0;
                                      setEditingProduct({ ...editingProduct, optionCategories: newCats });
                                    }}
                                  />
                                </div>
                                <div className="flex items-center gap-1 border-l pl-2 border-slate-100">
                                  <div className="flex flex-col items-center gap-0.5" title="Delivery">
                                    <Truck size={8} className={opt.isAvailableDelivery !== false ? 'text-indigo-600' : 'text-slate-300'} />
                                    <input 
                                      type="checkbox" 
                                      checked={opt.isAvailableDelivery !== false} 
                                      onChange={(e) => {
                                        const newCats = [...(editingProduct.optionCategories || [])];
                                        newCats[catIdx].options[optIdx].isAvailableDelivery = e.target.checked;
                                        setEditingProduct({ ...editingProduct, optionCategories: newCats });
                                      }}
                                      className="w-2.5 h-2.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                                    />
                                  </div>
                                  <div className="flex flex-col items-center gap-0.5" title="Salão">
                                    <Utensils size={8} className={opt.isAvailableDineIn !== false ? 'text-indigo-600' : 'text-slate-300'} />
                                    <input 
                                      type="checkbox" 
                                      checked={opt.isAvailableDineIn !== false} 
                                      onChange={(e) => {
                                        const newCats = [...(editingProduct.optionCategories || [])];
                                        newCats[catIdx].options[optIdx].isAvailableDineIn = e.target.checked;
                                        setEditingProduct({ ...editingProduct, optionCategories: newCats });
                                      }}
                                      className="w-2.5 h-2.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                                    />
                                  </div>
                                  <div className="flex flex-col items-center gap-0.5" title="Online">
                                    <Smartphone size={8} className={opt.isAvailableOnline !== false ? 'text-indigo-600' : 'text-slate-300'} />
                                    <input 
                                      type="checkbox" 
                                      checked={opt.isAvailableOnline !== false} 
                                      onChange={(e) => {
                                        const newCats = [...(editingProduct.optionCategories || [])];
                                        newCats[catIdx].options[optIdx].isAvailableOnline = e.target.checked;
                                        setEditingProduct({ ...editingProduct, optionCategories: newCats });
                                      }}
                                      className="w-2.5 h-2.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                                    />
                                  </div>
                                  <div className="flex flex-col items-center gap-0.5" title="Cardápio Digital">
                                    <QrCode size={8} className={opt.isAvailableDigitalMenu !== false ? 'text-indigo-600' : 'text-slate-300'} />
                                    <input 
                                      type="checkbox" 
                                      checked={opt.isAvailableDigitalMenu !== false} 
                                      onChange={(e) => {
                                        const newCats = [...(editingProduct.optionCategories || [])];
                                        newCats[catIdx].options[optIdx].isAvailableDigitalMenu = e.target.checked;
                                        setEditingProduct({ ...editingProduct, optionCategories: newCats });
                                      }}
                                      className="w-2.5 h-2.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                                    />
                                  </div>
                                  <div className="flex flex-col items-center gap-0.5 ml-1" title="Ativo">
                                    <span className={`text-[6px] font-black uppercase ${opt.active !== false ? 'text-emerald-600' : 'text-slate-300'}`}>Status</span>
                                    <input 
                                      type="checkbox" 
                                      checked={opt.active !== false} 
                                      onChange={(e) => {
                                        const newCats = [...(editingProduct.optionCategories || [])];
                                        newCats[catIdx].options[optIdx].active = e.target.checked;
                                        setEditingProduct({ ...editingProduct, optionCategories: newCats });
                                      }}
                                      className="w-2.5 h-2.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                                    />
                                  </div>
                                </div>
                                <button 
                                  onClick={() => {
                                    const newCats = [...(editingProduct.optionCategories || [])];
                                    newCats[catIdx].options = newCats[catIdx].options.filter((_, i) => i !== optIdx);
                                    setEditingProduct({ ...editingProduct, optionCategories: newCats });
                                  }}
                                  className="p-1 text-rose-400 hover:bg-rose-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                            {cat.options.length === 0 && (
                              <div className="col-span-full py-4 text-center border border-dashed border-slate-200 rounded-xl">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Nenhuma opção nesta categoria</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!editingProduct.optionCategories || editingProduct.optionCategories.length === 0) && (
                      <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                        <LayoutGrid size={32} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhuma categoria de opcionais configurada</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {modalTab === 'pizza-cmv' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  {/* Header info */}
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-3xl border border-orange-100 flex gap-4 items-start shadow-sm">
                    <div className="bg-orange-500 text-white p-2.5 rounded-2xl shrink-0 shadow-lg shadow-orange-100 flex items-center justify-center">
                      <Pizza size={22} className="animate-[spin_40s_linear_infinite]" />
                    </div>
                    <div>
                      <h4 className="text-[12px] font-black text-orange-950 uppercase tracking-wider">Cálculo de CMV Avançado para Pizzas</h4>
                      <p className="text-[10px] text-orange-800 font-bold leading-relaxed mt-0.5">
                        Pizzarias operam com custos fracionados e composições de meio-a-meio. Utilize este painel para analisar a rentabilidade desse sabor individual de pizza e rodar simulações de vendas cruzadas!
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Coluna 1: Análise Sabor Atual */}
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 border-b pb-1">
                        <TrendingUp size={12} /> Rentabilidade do Sabor Atual
                      </h3>

                      {/* Custos Base */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Custo Base de Confecção (Massa + Caixa + Forno)</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-bold">R$</span>
                            <input 
                              type="number" 
                              step="0.05"
                              className="w-20 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-right outline-none text-slate-700"
                              value={pizzaBaseCost}
                              onChange={(e) => setPizzaBaseCost(Math.max(0, parseFloat(e.target.value) || 0))}
                            />
                          </div>
                        </div>

                        {/* Info on Topping cost */}
                        {(() => {
                          const toppingsCostA = (editingProduct.technicalSheet || []).reduce((acc, item) => {
                            const rawMat = rawMaterials.find(m => m.id === item.rawMaterialId);
                            return acc + (rawMat ? rawMat.costPerUnit * item.quantity : 0);
                          }, 0);
                          const totalUnitCostA = toppingsCostA + pizzaBaseCost;
                          const priceA = editingProduct.price || 0;
                          const cmvA = priceA > 0 ? (totalUnitCostA / priceA) * 100 : 0;
                          const profitA = priceA - totalUnitCostA;
                          
                          // Recommended price to reach 28% target CMV
                          const recommendedPriceA = cmvA > 0 ? totalUnitCostA / 0.28 : priceA;

                          return (
                            <>
                              <div className="space-y-2 border-t pt-3">
                                <div className="flex justify-between text-[11px] font-bold">
                                  <span className="text-slate-500">Custo dos Ingredientes (Topping):</span>
                                  <span className="text-slate-800">R$ {toppingsCostA.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-[11px] font-bold">
                                  <span className="text-slate-500">Custo Base da Pizzaria:</span>
                                  <span className="text-slate-800">R$ {pizzaBaseCost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-[12px] font-black border-t border-dashed pt-2">
                                  <span className="text-slate-700">Custo Unitário Total de Produção:</span>
                                  <span className="text-indigo-600">R$ {totalUnitCostA.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-[11px] font-bold">
                                  <span className="text-slate-500">Preço de Venda Registrado:</span>
                                  <span className="text-slate-800">R$ {priceA.toFixed(2)}</span>
                                </div>
                              </div>

                              {/* Metrics Grid */}
                              <div className="grid grid-cols-2 gap-2 pt-2">
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center font-medium">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">CMV Realizado</span>
                                  <span className={`text-base font-black mt-0.5 ${
                                    cmvA > 35 ? 'text-rose-500' : cmvA > 25 ? 'text-amber-500' : 'text-emerald-500'
                                  }`}>
                                    {priceA > 0 ? `${cmvA.toFixed(1)}%` : 'N/A'}
                                  </span>
                                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                    {cmvA <= 25 ? '🌟 Excelente' : cmvA <= 35 ? '⚠️ Bom/Moderado' : '🚨 Margem Crítica'}
                                  </span>
                                </div>
                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lucro Bruto Unitário</span>
                                  <span className="text-base font-black text-slate-800 mt-0.5">
                                    R$ {profitA.toFixed(2)}
                                  </span>
                                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                    {priceA > 0 ? `Margem: ${((profitA / priceA) * 100).toFixed(0)}%` : 'N/A'}
                                  </span>
                                </div>
                              </div>

                              {/* Sync Button */}
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProduct({
                                      ...editingProduct,
                                      cost: parseFloat(totalUnitCostA.toFixed(2))
                                    });
                                    alert(`Sucesso! O custo convencional do estoque deste produto foi atualizado para R$ ${totalUnitCostA.toFixed(2)} de acordo com a ficha técnica da Pizza.`);
                                  }}
                                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-200 cursor-pointer"
                                >
                                  <CheckCircle2 size={14} className="text-emerald-500" /> Sincronizar Custo no Estoque
                                </button>
                              </div>

                              {/* Warning Indicator */}
                              {cmvA > 35 && (
                                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex gap-2 text-rose-800">
                                  <AlertTriangle size={16} className="shrink-0 mt-0.5 animate-bounce" />
                                  <div className="space-y-0.5">
                                    <h5 className="text-[10px] font-black uppercase tracking-wider">CMV Elevado Detectado!</h5>
                                    <p className="text-[9px] font-medium leading-tight text-rose-700">
                                      O custo representa {cmvA.toFixed(0)}% do preço de venda. Para atingir a meta operacional saudável de 28%, sugerimos precificar este sabor a <strong className="font-extrabold text-rose-900 border-b border-rose-400 pb-0.5">R$ {recommendedPriceA.toFixed(2)}</strong>.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Coluna 2: Simulador Cruzado Meio-a-Meio */}
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 border-b pb-1">
                        <Pizza size={12} /> Simulador Cruzado de Meio-a-Meio
                      </h3>

                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        {/* Select other pizza */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Selecione o Outro Sabor (Sabor B)</label>
                          <select 
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all cursor-pointer"
                            value={pizzaSaborBId}
                            onChange={(e) => setPizzaSaborBId(e.target.value)}
                          >
                            <option value="">Selecione outro sabor para simulação...</option>
                            {(() => {
                              const otherPizzas = products.filter(p => 
                                p.id !== editingProduct.id && 
                                (p.category.toLowerCase().includes('pizza') || p.name.toLowerCase().includes('pizza') || p.category.toLowerCase().includes('entrada') || p.category.toLowerCase().includes('lanche'))
                              );
                              const finalOptions = otherPizzas.length > 0 ? otherPizzas : products.filter(p => p.id !== editingProduct.id);
                              return finalOptions.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (R$ {p.price.toFixed(2)})</option>
                              ));
                            })()}
                          </select>
                        </div>

                        {/* Pricing rule selector */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Regra de Precificação Fracionada</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              type="button"
                              onClick={() => setPizzaPricingRule('highest')}
                              className={`py-2 px-3 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                pizzaPricingRule === 'highest' 
                                  ? 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-100' 
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Sabor Mais Caro
                            </button>
                            <button 
                              type="button"
                              onClick={() => setPizzaPricingRule('average')}
                              className={`py-2 px-3 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                pizzaPricingRule === 'average' 
                                  ? 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-100' 
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Média dos Sabores
                            </button>
                          </div>
                        </div>

                        {/* Simulator calculation */}
                        {(() => {
                          const toppingsCostA = (editingProduct.technicalSheet || []).reduce((acc, item) => {
                            const rawMat = rawMaterials.find(m => m.id === item.rawMaterialId);
                            return acc + (rawMat ? rawMat.costPerUnit * item.quantity : 0);
                          }, 0);

                          const targetB = products.find(p => p.id === pizzaSaborBId);
                          const toppingsCostB = targetB 
                            ? (targetB.technicalSheet && targetB.technicalSheet.length > 0
                                ? targetB.technicalSheet.reduce((acc, item) => {
                                    const rawMat = rawMaterials.find(m => m.id === item.rawMaterialId);
                                    return acc + (rawMat ? rawMat.costPerUnit * item.quantity : 0);
                                  }, 0)
                                : Math.max(0, targetB.cost - pizzaBaseCost))
                            : 0;

                          const combinedToppingCost = (toppingsCostA * 0.5) + (toppingsCostB * 0.5);
                          const totalCombinedCost = combinedToppingCost + pizzaBaseCost;
                          const priceA = editingProduct.price || 0;
                          const priceB = targetB ? targetB.price : 0;
                          const finalPrice = pizzaPricingRule === 'highest' ? Math.max(priceA, priceB) : (priceA + priceB) / 2;
                          const profitCombined = finalPrice - totalCombinedCost;
                          const cmvCombined = finalPrice > 0 ? (totalCombinedCost / finalPrice) * 100 : 0;

                          return (
                            <div className="space-y-4">
                              {/* Pizza split visualization */}
                              <div className="flex flex-col items-center justify-center py-2 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="relative w-28 h-28 rounded-full border-4 border-amber-600 bg-amber-50 overflow-hidden flex shadow-inner group">
                                  {/* Left half: Sabor A */}
                                  <div className="w-1/2 h-full bg-orange-100 hover:bg-orange-200 border-r border-dashed border-amber-800/10 relative flex items-center justify-center flex-col transition-all">
                                    <span className="text-[10px] font-black text-orange-950 uppercase select-none">Metade A</span>
                                    <span className="text-[8px] font-bold text-orange-700">R$ {(toppingsCostA * 0.5).toFixed(2)}</span>
                                  </div>
                                  {/* Right half: Sabor B */}
                                  <div className="w-1/2 h-full bg-amber-50 relative flex items-center justify-center flex-col transition-all text-center px-1">
                                    <span className="text-[10px] font-black text-amber-950 uppercase select-none">Metade B</span>
                                    <span className="text-[8px] font-bold text-amber-700">
                                      {targetB ? `R$ ${(toppingsCostB * 0.5).toFixed(2)}` : 'Selecione...'}
                                    </span>
                                  </div>
                                  {/* Crust label overlay */}
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-amber-100 text-amber-900 border border-amber-300 rounded-full px-2 py-0.5 text-[8px] font-black shadow-sm uppercase tracking-widest scale-90">
                                      Base: R$ {pizzaBaseCost.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-2.5">Representação Visual do Mix de Ingredientes</p>
                              </div>

                              {/* Simulation report */}
                              {targetB ? (
                                <div className="p-3 bg-orange-50/20 rounded-2xl border border-orange-100 space-y-2">
                                  <h4 className="text-[9px] font-black text-orange-950 uppercase tracking-wider">Simulação Financeira: Meio-a-Meio</h4>
                                  <div className="space-y-1.5 text-[11px] font-bold">
                                    <div className="flex justify-between text-slate-500">
                                      <span>Preço Cobrado do Cliente:</span>
                                      <span className="text-slate-800 font-extrabold font-mono">R$ {finalPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                      <span>Custo Fracionado Toppings:</span>
                                      <span className="text-slate-700 font-mono">R$ {combinedToppingCost.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                      <span>Custo Base da Pizza:</span>
                                      <span className="text-slate-700 font-mono">R$ {pizzaBaseCost.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-700 font-black border-t pt-1.5 font-mono">
                                      <span>Custo Total Combinado:</span>
                                      <span className="text-indigo-600">R$ {totalCombinedCost.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-700 font-black pb-1 font-mono">
                                      <span>Lucro Bruto Realizado:</span>
                                      <span className="text-emerald-600">R$ {profitCombined.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-black border-t border-dashed pt-2">
                                      <span>CMV Cruzado Combinado:</span>
                                      <span className={cmvCombined > 35 ? 'text-rose-500' : 'text-emerald-600'}>
                                        {cmvCombined.toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                                  <AlertCircle size={24} className="mx-auto text-slate-200 mb-1.5 animate-pulse" />
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-normal">Selecione outro sabor acima para simular a composição de vendas meio-a-meio e margens!</p>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-slate-50/50 flex gap-2 justify-between items-center">
              <div>
                {editingProduct.id && (
                  <button 
                    onClick={() => handleDeleteProduct(editingProduct.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 transition-all"
                  >
                    <Trash2 size={16} /> Excluir Produto
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setEditingProduct(null)} 
                  className="px-4 py-2 rounded-xl font-black text-slate-500 hover:bg-white transition-all border border-transparent hover:border-slate-200 uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 uppercase tracking-widest text-[10px]"
                >
                  <Save size={16} /> Salvar e Atualizar Histórico
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Manage Digital Menu Categories Modal */}
      {isManagingDigitalCategories && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[1.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
            <div className="p-4 border-b flex justify-between items-center bg-indigo-50/30">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-2 rounded-xl text-white">
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800">Categorias de Produtos</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Gerenciar e Organizar Categorias</p>
                </div>
              </div>
              <button onClick={() => setIsManagingDigitalCategories(false)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nova categoria de produto..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCategoryName.trim()) {
                      setProductCategories([...productCategories, newCategoryName.trim()]);
                      setNewCategoryName('');
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (newCategoryName.trim()) {
                      setProductCategories([...productCategories, newCategoryName.trim()]);
                      setNewCategoryName('');
                    }
                  }}
                  className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex gap-2 items-start">
                <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[9px] font-medium text-amber-700 leading-tight">
                  Arraste as categorias para mudar a ordem no cardápio digital. Use o ícone de olho para mostrar ou ocultar uma categoria inteira.
                </p>
              </div>

              <Reorder.Group 
                axis="y" 
                values={allProductCategories} 
                onReorder={(newOrder) => setProductCategories(newOrder)}
                className="space-y-2"
              >
                {allProductCategories.map((cat, index) => {
                  const isHidden = digitalMenuSettings.hiddenCategories?.includes(cat);
                  return (
                    <Reorder.Item 
                      key={cat} 
                      value={cat}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${isHidden ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300'}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical size={14} className="text-slate-300" />
                        {editingCategoryIndex === index ? (
                          <input 
                            autoFocus
                            type="text"
                            className="flex-1 px-2 py-1 bg-white border border-indigo-300 rounded-lg outline-none text-xs font-bold"
                            defaultValue={cat}
                            onBlur={(e) => {
                              const newCats = [...allProductCategories];
                              newCats[index] = e.target.value;
                              setProductCategories(newCats);
                              setEditingCategoryIndex(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newCats = [...allProductCategories];
                                newCats[index] = e.currentTarget.value;
                                setProductCategories(newCats);
                                setEditingCategoryIndex(null);
                              }
                              if (e.key === 'Escape') setEditingCategoryIndex(null);
                            }}
                          />
                        ) : (
                          <span className={`text-xs font-black uppercase tracking-tight ${isHidden ? 'text-slate-400' : 'text-slate-700'}`}>{cat}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setEditingCategoryIndex(index)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const currentHidden = digitalMenuSettings.hiddenCategories || [];
                            const newHidden = isHidden 
                              ? currentHidden.filter(c => c !== cat)
                              : [...currentHidden, cat];
                            onUpdateDigitalMenuSettings({ ...digitalMenuSettings, hiddenCategories: newHidden });
                          }}
                          className={`p-2 rounded-lg transition-all ${isHidden ? 'text-rose-500 bg-rose-50' : 'text-emerald-500 bg-emerald-50 hover:bg-emerald-100'}`}
                          title={isHidden ? "Mostrar no Cardápio" : "Ocultar no Cardápio"}
                        >
                          {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`Excluir a categoria "${cat}"? Qualquer produto nesta categoria será movido para "Geral".`)) {
                              // Update affected products
                              products.forEach(p => {
                                if (p.category === cat) {
                                  onUpdateProduct({ ...p, category: 'Geral' });
                                }
                              });
                              
                              // Clear from hidden categories and category order
                              const currentHidden = digitalMenuSettings.hiddenCategories || [];
                              const currentOrder = digitalMenuSettings.categoryOrder || [];
                              onUpdateDigitalMenuSettings({
                                ...digitalMenuSettings,
                                hiddenCategories: currentHidden.filter(c => c !== cat),
                                categoryOrder: currentOrder.filter(c => c !== cat)
                              });

                              // Update the registered categories array
                              setProductCategories(productCategories.filter(c => c !== cat));
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </div>

            <div className="p-4 border-t bg-slate-50/50">
              <button 
                onClick={() => setIsManagingDigitalCategories(false)}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {isManagingCategories && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[1.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
            <div className="p-4 border-b flex justify-between items-center bg-indigo-50/30">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-2 rounded-xl text-white">
                  <Tag size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800">Categorias de Insumos</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Gerenciar categorias disponíveis</p>
                </div>
              </div>
              <button onClick={() => setIsManagingCategories(false)} className="p-2 hover:bg-white rounded-full transition-all text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nova categoria..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-xs"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <button 
                  onClick={handleAddCategory}
                  className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="space-y-2">
                {allRawMaterialCategories.map((cat, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100 group">
                    {editingCategoryIndex === index ? (
                      <input 
                        autoFocus
                        type="text"
                        className="flex-1 px-2 py-1 bg-white border border-indigo-300 rounded-lg outline-none text-xs font-bold"
                        defaultValue={cat}
                        onBlur={(e) => handleUpdateCategory(index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateCategory(index, e.currentTarget.value);
                          if (e.key === 'Escape') setEditingCategoryIndex(null);
                        }}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-700">{cat}</span>
                    )}
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => setEditingCategoryIndex(index)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50/50">
              <button 
                onClick={() => setIsManagingCategories(false)}
                className="w-full bg-slate-800 text-white py-2 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 transition-all"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default Inventory;
