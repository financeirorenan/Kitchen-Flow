import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ShoppingCart, ChevronRight, Plus, Minus, 
  MapPin, Clock, Info, X, Check, ArrowLeft,
  User, Wallet, CreditCard, Smartphone, Receipt, MessageCircle,
  Menu as MenuIcon, ChevronDown, Trash2, Sparkles, Star, Filter, Zap,
  Truck, ShoppingBag, Package, AlertTriangle, DollarSign, ChefHat, UtensilsCrossed, Bike, Heart,
  CheckCircle2, Navigation
} from 'lucide-react';
import { maskPhone } from '../utils/masks';
import { DigitalMenuSettings, Product, ProductOption } from '../types';

interface DigitalMenuProps {
  settings: DigitalMenuSettings;
  products: Product[];
  onPlaceOrder?: (order: any) => void;
  isSimulation?: boolean;
  initialTable?: string;
  isDeliveryEnabled?: boolean;
  isPickupEnabled?: boolean;
  deliveryFee?: number;
  minOrderValue?: number;
  estimatedDeliveryTime?: string;
  estimatedPickupTime?: string;
  whatsappNumber?: string;
  autoStart?: boolean;
  onBack?: () => void;
  isMarketplace?: boolean;
  initialAddress?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  restaurantAddress?: string;
  restaurantCity?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  selectedOptions?: ProductOption[];
}

const DigitalMenu: React.FC<DigitalMenuProps> = ({ 
  settings, 
  products, 
  onPlaceOrder,
  isSimulation = false,
  initialTable,
  isDeliveryEnabled = true,
  isPickupEnabled = true,
   deliveryFee = 0,
  minOrderValue = 0,
  estimatedDeliveryTime = '30-45 min',
  estimatedPickupTime = '15-20 min',
  whatsappNumber,
  autoStart,
  onBack,
  isMarketplace = false,
  initialAddress,
  isFavorite,
  onToggleFavorite,
  restaurantAddress,
  restaurantCity,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedProductForOptions, setSelectedProductForOptions] = useState<Product | null>(null);
  const [selectedOptionsInModal, setSelectedOptionsInModal] = useState<ProductOption[]>([]);
  const [menuStep, setMenuStep] = useState<'welcome' | 'menu'>(autoStart || isSimulation ? 'menu' : 'welcome'); 
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'details' | 'payment' | 'success'>('cart');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [showTotemUpsell, setShowTotemUpsell] = useState(false);
  const [totemUpsellViewed, setTotemUpsellViewed] = useState(false);
  const [totemActiveTab, setTotemActiveTab] = useState<'sides' | 'drinks' | 'desserts'>('sides');

  const hasExternalFavorite = isFavorite !== undefined && onToggleFavorite !== undefined;
  const [internalFavorite, setInternalFavorite] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('marketplace_favorites');
      const favs: string[] = saved ? JSON.parse(saved) : [];
      return favs.includes(settings.restaurantName);
    } catch {
      return false;
    }
  });

  const activeIsFavorite = hasExternalFavorite ? isFavorite : internalFavorite;

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasExternalFavorite) {
      onToggleFavorite(e);
    } else {
      setInternalFavorite(prev => {
        const newVal = !prev;
        try {
          const saved = localStorage.getItem('marketplace_favorites');
          let favs: string[] = saved ? JSON.parse(saved) : [];
          if (newVal) {
            if (!favs.includes(settings.restaurantName)) {
              favs.push(settings.restaurantName);
            }
          } else {
            favs = favs.filter(name => name !== settings.restaurantName);
          }
          localStorage.setItem('marketplace_favorites', JSON.stringify(favs));
        } catch (err) {
          console.error(err);
        }
        return newVal;
      });
    }
  };

  const effectivePrimaryColor = isMarketplace ? '#FF4F18' : settings.primaryColor;
  const accentColor = isMarketplace ? '#facc15' : (settings.accentColor || '#facc15');
  const fontFamilyClass = settings.fontFamily === 'serif' ? 'font-serif' : settings.fontFamily === 'mono' ? 'font-mono' : 'font-sans';
  
  // Order context
  const [orderType, setOrderType] = useState<'table' | 'delivery' | 'takeout' | null>(() => {
    if (initialTable) return 'table';
    if (isDeliveryEnabled) return 'delivery';
    if (isPickupEnabled) return 'takeout';
    return null;
  });
  const [customerName, setCustomerName] = useState(() => {
    try {
      const saved = localStorage.getItem('marketplace_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.name || '';
      }
    } catch {}
    return '';
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    try {
      const saved = localStorage.getItem('marketplace_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.phone || '';
      }
    } catch {}
    return '';
  });
  const [customerAddress, setCustomerAddress] = useState(() => {
    if (initialAddress) return initialAddress;
    try {
      const saved = localStorage.getItem('marketplace_customer_address');
      if (saved) return saved;
    } catch {}
    return 'Av. Central, 123';
  });
  const [tableNumber, setTableNumber] = useState(initialTable || '');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [changeFor, setChangeFor] = useState('');

  // States for enhanced selection fluid process
  const [modalQuantity, setModalQuantity] = useState(1);
  const [optionsModalQuantity, setOptionsModalQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // Geolocation and City Validation state
  const [isValidatingCity, setIsValidatingCity] = useState(false);
  const [validatedCity, setValidatedCity] = useState<string | null>(null);
  const [cityMatchError, setCityMatchError] = useState<string | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  // CEP (postal code) search robust states
  const [addressMode, setAddressMode] = useState<'cep' | 'manual'>('cep');
  const [cepInput, setCepInput] = useState('');
  const [cepNumber, setCepNumber] = useState('');
  const [cepComplement, setCepComplement] = useState('');
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [cepData, setCepData] = useState<{ street?: string; neighborhood?: string; city?: string; state?: string } | null>(null);

  // Sync CEP components into customerAddress
  React.useEffect(() => {
    if (addressMode === 'cep' && cepData) {
      const { street = '', neighborhood = '', city = '', state = '' } = cepData;
      const numPart = cepNumber ? `, Nº ${cepNumber}` : '';
      const compPart = cepComplement ? ` - ${cepComplement}` : '';
      const formattedCep = cepInput ? ` - CEP ${cepInput}` : '';
      const fullAddress = `${street}${numPart}${compPart}, ${neighborhood}, ${city} - ${state}${formattedCep}`;
      setCustomerAddress(fullAddress);
    }
  }, [cepNumber, cepComplement, cepData, addressMode, cepInput]);

  const handleCepSearch = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) {
      setCepError('O CEP deve conter 8 dígitos.');
      return;
    }
    setIsCepLoading(true);
    setCepError(null);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json();
      if (data.erro) {
        setCepError('CEP não encontrado. Verifique os dígitos ou use o modo manual.');
        setCepData(null);
      } else {
        setCepData({
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || ''
        });
        setCepError(null);
      }
    } catch (err) {
      console.error(err);
      setCepError('Erro de conexão ao buscar o CEP. Digite o endereço manualmente.');
      setCepData(null);
    } finally {
      setIsCepLoading(false);
    }
  };

  const normalizeText = (str: string): string => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim();
  };

  const validateCityMatch = async (addressStr: string) => {
    if (!isMarketplace || !restaurantCity || !addressStr) {
      setCityMatchError(null);
      setValidatedCity(null);
      return;
    }

    setIsValidatingCity(true);
    setCityMatchError(null);

    try {
      let detectedCity: string | null = null;
      if (typeof window !== "undefined" && window.google?.maps?.Geocoder) {
        detectedCity = await new Promise<string | null>((resolve) => {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ address: addressStr }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              let city: string | null = null;
              for (const component of results[0].address_components) {
                if (component.types.includes("locality")) {
                  city = component.long_name;
                  break;
                }
                if (component.types.includes("administrative_area_level_2")) {
                  city = component.long_name;
                }
              }
              resolve(city);
            } else {
              resolve(null);
            }
          });
        });
      }

      const normRestCity = normalizeText(restaurantCity);

      if (detectedCity) {
        setValidatedCity(detectedCity);
        const normUserCity = normalizeText(detectedCity);
        
        if (normUserCity === normRestCity || normUserCity.includes(normRestCity) || normRestCity.includes(normUserCity)) {
          setCityMatchError(null);
        } else {
          setCityMatchError(
            `O endereço informado pertence a ${detectedCity}, mas este restaurante (${settings.restaurantName}) fica em ${restaurantCity}. Por favor, utilize um endereço na mesma cidade.`
          );
        }
      } else {
        const normAddr = normalizeText(addressStr);
        if (normAddr.includes(normRestCity)) {
          setValidatedCity(restaurantCity);
          setCityMatchError(null);
        } else {
          const parts = addressStr.split("-");
          let fallbackDetected = "Outra cidade";
          if (parts.length > 1) {
            const lastPart = parts[parts.length - 1].trim();
            const secondLastPart = parts[parts.length - 2].trim();
            if (lastPart.length === 2 && lastPart.toUpperCase() === lastPart) {
              const parts2 = secondLastPart.split(",");
              fallbackDetected = parts2[parts2.length - 1].trim();
            }
          }
          setValidatedCity(fallbackDetected);
          setCityMatchError(
            `Não conseguimos confirmar se o endereço informado fica em ${restaurantCity}. Por favor, inclua o nome da cidade "${restaurantCity}" no endereço completo.`
          );
        }
      }
    } catch (err) {
      console.error("Erro na validação do endereço:", err);
    } finally {
      setIsValidatingCity(false);
    }
  };

  const handleGeolocateUser = () => {
    if (!navigator.geolocation) {
      alert("Seu navegador não oferece suporte para geolocalização.");
      return;
    }

    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (typeof window !== "undefined" && window.google?.maps?.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              const fullAddr = results[0].formatted_address;
              setCustomerAddress(fullAddr);
              
              let city: string | null = null;
              for (const component of results[0].address_components) {
                if (component.types.includes("locality")) {
                  city = component.long_name;
                  break;
                }
                if (component.types.includes("administrative_area_level_2")) {
                  city = component.long_name;
                }
              }
              if (city) {
                setValidatedCity(city);
                const normUserCity = normalizeText(city);
                const normRestCity = normalizeText(restaurantCity || "");
                if (normUserCity === normRestCity || normUserCity.includes(normRestCity) || normRestCity.includes(normUserCity)) {
                  setCityMatchError(null);
                } else {
                  setCityMatchError(
                    `Sua localização atual aproximada é em ${city}, mas este restaurante fica em ${restaurantCity}. Por favor, altere para um endereço de entrega válido em ${restaurantCity}.`
                  );
                }
              }
            } else {
              alert("Não foi possível resolver seu endereço a partir da geolocalização GPS.");
            }
            setIsLocatingUser(false);
          });
        } else {
          setCustomerAddress(`Latitude: ${latitude.toFixed(5)}, Longitude: ${longitude.toFixed(5)}`);
          alert(`Coordenadas obtidas: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}. Google Maps Geocoder indisponível.`);
          setIsLocatingUser(false);
        }
      },
      (error) => {
        console.error("GPS error:", error);
        alert("Não conseguimos obter sua geolocalização por GPS. Verifique se as permissões de localização estão habilitadas.");
        setIsLocatingUser(false);
      }
    );
  };

  React.useEffect(() => {
    if (orderType === 'delivery' && customerAddress) {
      const delayDebounceFn = setTimeout(() => {
        validateCityMatch(customerAddress);
      }, 800);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setCityMatchError(null);
      setValidatedCity(null);
    }
  }, [customerAddress, orderType, restaurantCity]);

  // Reset orderType if modality is disabled
  React.useEffect(() => {
    if (orderType === 'delivery' && !isDeliveryEnabled) {
      setOrderType(isPickupEnabled ? 'takeout' : null);
    } else if (orderType === 'takeout' && !isPickupEnabled) {
      setOrderType(isDeliveryEnabled ? 'delivery' : null);
    }
  }, [isDeliveryEnabled, isPickupEnabled, orderType]);

  const availableProducts = useMemo(() => {
    return products
      .filter(p => p && p.name) // Ensure product exists and has a name
      // Extremely permissive: show everything that has a name
      .filter(p => {
        // Only hide if explicitly set to false or 'false'
        if (p.active === false || (p.active as any) === 'false') return false;
        
        // Availability filters should also be permissive
        if (orderType === 'table') {
          if (p.isAvailableDigitalMenu === false || (p.isAvailableDigitalMenu as any) === 'false') return false;
        }
        if (orderType === 'delivery' || orderType === 'takeout') {
          if (p.isAvailableOnline === false || (p.isAvailableOnline as any) === 'false') return false;
        }
        return true;
      })
      .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
  }, [products, orderType]);

  const availableUpsells = useMemo(() => {
    const isManual = settings.totemUpsellMode === 'manual';
    const manualIds = settings.totemUpsellProducts || [];
    
    const candidates = isManual 
      ? availableProducts.filter(p => manualIds.includes(p.id))
      : availableProducts;

    const drinks: Product[] = [];
    const desserts: Product[] = [];
    const sides: Product[] = [];

    candidates.forEach(p => {
      const cat = (p.category || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      
      const isDrink = cat.includes('bebida') || cat.includes('suco') || cat.includes('refri') ||
                      name.includes('coca') || name.includes('guaran') || name.includes('suco') || 
                      name.includes('água') || name.includes('agua') || name.includes('fanta') || 
                      name.includes('refrigerante') || name.includes('refrigerantes');
                      
      const isDessert = cat.includes('sobremesa') || cat.includes('doce') || cat.includes('sorvete') || cat.includes('milk') ||
                        name.includes('doce') || name.includes('sorvete') || name.includes('torta') || 
                        name.includes('brownie') || name.includes('pudim') || name.includes('casquinha') || 
                        name.includes('sundae') || name.includes('petit') || name.includes('shake') || 
                        name.includes('sobremesa') || name.includes('mousse');
                        
      const isSide = cat.includes('acompanhamento') || cat.includes('porção') || cat.includes('porcao') || cat.includes('entrada') ||
                     name.includes('frita') || name.includes('batata') || name.includes('onion') || 
                     name.includes('anéis') || name.includes('nuggets') || name.includes('bacon') || 
                     name.includes('molho') || name.includes('pão de alho') || name.includes('pao de alho');

      if (isDrink) drinks.push(p);
      else if (isDessert) desserts.push(p);
      else if (isSide) sides.push(p);
      else {
        if (isManual) {
          sides.push(p);
        }
      }
    });

    return { drinks: drinks.slice(0, 4), desserts: desserts.slice(0, 4), sides: sides.slice(0, 4) };
  }, [availableProducts, settings.totemUpsellMode, settings.totemUpsellProducts]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(availableProducts.map(p => p.category || 'Geral')));
    const order = settings.categoryOrder || [];
    const hidden = settings.hiddenCategories || [];
    
    // Sort categories based on categoryOrder, then add any remaining ones
    const sortedCats = [...order.filter(c => cats.includes(c))];
    cats.forEach(c => {
      if (!sortedCats.includes(c)) sortedCats.push(c);
    });

    // Filter out hidden categories
    return sortedCats.filter(c => !hidden.includes(c));
  }, [availableProducts, settings.categoryOrder, settings.hiddenCategories]);

  // Set initial active category or reset if current becomes hidden
  React.useEffect(() => {
    if (categories.length > 0) {
      if (!activeCategory || !categories.includes(activeCategory)) {
        setActiveCategory(categories[0]);
      }
    } else {
      setActiveCategory('');
    }
  }, [categories, activeCategory]);

  const filteredProducts = useMemo(() => {
    return availableProducts
      .filter(p => (p.category || 'Geral') === activeCategory)
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [availableProducts, activeCategory, searchQuery]);

  const cartTotal = cart.reduce((acc, item) => {
    const itemPrice = item.product.price + (item.selectedOptions?.reduce((sum, opt) => sum + (opt.price || 0), 0) || 0);
    return acc + (itemPrice * item.quantity);
  }, 0);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const addToCart = (product: Product, options?: ProductOption[], customQuantity = 1) => {
    const hasOptions = (product.optionCategories && product.optionCategories.length > 0) || (product.options && product.options.length > 0);
    
    if (hasOptions && !options) {
      setSelectedProductForOptions(product);
      setSelectedOptionsInModal([]);
      setOptionsModalQuantity(customQuantity);
      setShowOptionsModal(true);
      return;
    }

    setCart(prev => {
      // For items with options, we treat them as unique entries in the cart
      if (options && options.length > 0) {
        const existing = prev.find(item => 
          item.product.id === product.id && 
          JSON.stringify(item.selectedOptions?.map(o => o.id).sort()) === JSON.stringify(options.map(o => o.id).sort())
        );
        if (existing) {
          return prev.map(item => 
            (item.product.id === product.id && 
             JSON.stringify(item.selectedOptions?.map(o => o.id).sort()) === JSON.stringify(options.map(o => o.id).sort())) 
            ? { ...item, quantity: item.quantity + customQuantity } 
            : item
          );
        }
        return [...prev, { product, quantity: customQuantity, selectedOptions: options }];
      }

      const existing = prev.find(item => item.product.id === product.id && (!item.selectedOptions || item.selectedOptions.length === 0));
      if (existing) {
        return prev.map(item => (item.product.id === product.id && (!item.selectedOptions || item.selectedOptions.length === 0)) ? { ...item, quantity: item.quantity + customQuantity } : item);
      }
      return [...prev, { product, quantity: customQuantity }];
    });
    
    if (showOptionsModal) {
      setShowOptionsModal(false);
      setSelectedProductForOptions(null);
      setSelectedOptionsInModal([]);
    }
  };

  const toggleOptionInModal = (option: ProductOption, categoryId?: string) => {
    if (!selectedProductForOptions) return;

    const category = selectedProductForOptions.optionCategories?.find(c => c.id === categoryId);
    
    setSelectedOptionsInModal(prev => {
      const isSelected = prev.find(o => o.id === option.id);
      
      if (isSelected) {
        return prev.filter(o => o.id !== option.id);
      } else {
        // If it's a single selection category (max 1), remove other options from same category
        if (category && category.max === 1) {
          const otherOptionsInCat = category.options.map(o => o.id);
          return [...prev.filter(o => !otherOptionsInCat.includes(o.id)), option];
        }
        
        // Check if max limit reached for this category
        if (category && category.max > 1) {
          const currentInCat = prev.filter(o => category.options.find(co => co.id === o.id)).length;
          if (currentInCat >= category.max) {
            return prev; // Don't add if limit reached
          }
        }

        return [...prev, option];
      }
    });
  };

  const confirmOptions = () => {
    if (!selectedProductForOptions) return;

    // Validate min requirements
    if (selectedProductForOptions.optionCategories) {
      for (const cat of selectedProductForOptions.optionCategories) {
        const selectedInCat = selectedOptionsInModal.filter(o => cat.options.find(co => co.id === o.id)).length;
        if (selectedInCat < cat.min) {
          alert(`Por favor, selecione pelo menos ${cat.min} opção(ões) em "${cat.name}"`);
          return;
        }
      }
    }

    addToCart(selectedProductForOptions, selectedOptionsInModal, optionsModalQuantity);
  };

  const removeFromCart = (productId: string, options?: ProductOption[]) => {
    setCart(prev => prev.map(item => {
      const sameProduct = item.product.id === productId;
      const sameOptions = JSON.stringify(item.selectedOptions?.map(o => o.id).sort()) === JSON.stringify(options?.map(o => o.id).sort());
      
      if (sameProduct && sameOptions) {
        return { ...item, quantity: item.quantity - 1 };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleFinishOrder = () => {
    const orderId = `DIG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const orderData = {
      id: orderId,
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price + (item.selectedOptions?.reduce((sum, opt) => sum + (opt.price || 0), 0) || 0),
        quantity: item.quantity,
        selectedOptions: item.selectedOptions
      })),
      total: cartTotal + (orderType === 'delivery' ? deliveryFee : 0),
      customerName,
      customerPhone,
      customerAddress: orderType === 'delivery' ? customerAddress : undefined,
      tableNumber: orderType === 'table' ? parseInt(tableNumber) : undefined,
      paymentMethod,
      changeFor: paymentMethod === 'dinheiro' ? parseFloat(changeFor) || undefined : undefined,
      type: orderType,
      notes: notes || undefined,
      status: 'pending',
      createdAt: new Date()
    };

    if (onPlaceOrder) {
      onPlaceOrder(orderData);
    }

    // Save profile and latest address to localStorage for effortless future checkouts
    try {
      localStorage.setItem('marketplace_profile', JSON.stringify({ name: customerName, phone: customerPhone }));
      if (orderType === 'delivery' && customerAddress) {
        localStorage.setItem('marketplace_customer_address', customerAddress);
      }
    } catch (err) {
      console.warn("Could not save profile details to localStorage", err);
    }

    localStorage.setItem(`last_order_${settings.restaurantName}`, JSON.stringify({
      id: orderId,
      time: new Date().getTime()
    }));
    setCurrentOrderId(orderId);

    // WhatsApp Redirection logic
    if (whatsappNumber && !initialTable) {
      const message = encodeURIComponent(
        `📌 *PEDIDO NOVO - ${orderId}*\n\n` +
        `👤 *Cliente:* ${customerName}\n` +
        `📞 *Telefone:* ${customerPhone}\n` +
        `📍 *Tipo:* ${orderType === 'delivery' ? 'Entrega' : 'Retirada'}\n` +
        (orderType === 'delivery' ? `🏠 *Endereço:* ${customerAddress}\n` : '') +
        (notes ? `📝 *Observação:* ${notes}\n` : '') +
        `💳 *Pagamento:* ${paymentMethod.toUpperCase()}\n` +
        (paymentMethod === 'dinheiro' && changeFor ? `💵 *Troco para:* R$ ${parseFloat(changeFor).toFixed(2)}\n` : '') +
        `\n🛒 *ITENS:*\n` +
        cart.map(item => 
          `- ${item.quantity}x ${item.product.name} (R$ ${(item.product.price + (item.selectedOptions?.reduce((sum, opt) => sum + (opt.price || 0), 0) || 0)).toFixed(2)})\n` +
          (item.selectedOptions?.length ? `  _Adicionais: ${item.selectedOptions.map(o => o.name).join(', ')}_\n` : '')
        ).join('') +
        `\n💰 *TOTAL: R$ ${(cartTotal + (orderType === 'delivery' ? deliveryFee : 0)).toFixed(2)}*`
      );
      window.open(`https://wa.me/55${whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
    }

    setCart([]); // Clear the cart so the bottom bar disappears immediately
    setCheckoutStep('success');
  };

  const resetOrder = () => {
    setCart([]);
    setShowCart(false);
    setMenuStep('menu');
    setCheckoutStep('cart');
    setTotemUpsellViewed(false);
    // Clear notes & change for next order, but DO NOT wipe saved name/phone/address so repeat order is super easy!
    setNotes('');
    setChangeFor('');
  };

  if (menuStep === 'welcome' && !initialTable) {
    return (
      <div className="min-h-full bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 relative overflow-hidden">
        {/* Background Gradient & Animated Shapes */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white" />
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="absolute -top-32 -right-32 w-64 h-64 bg-brand-primary/5 rounded-[4rem] blur-3xl" 
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-32 -left-32 w-64 h-64 bg-brand-primary/5 rounded-[4rem] blur-3xl" 
        />
        
        <motion.div 
          initial={{ scale: 0.8, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="relative z-10 w-full max-w-sm"
        >
          {/* Logo Area */}
          <div className="mb-12 relative flex justify-center">
            <div 
              className="w-48 h-48 rounded-[3.5rem] flex items-center justify-center shadow-2xl overflow-hidden relative group"
              style={{ backgroundColor: effectivePrimaryColor }}
            >
              <img 
                src={settings.logoUrl || `https://picsum.photos/seed/${settings.restaurantName}/400/400`} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                alt={settings.restaurantName}
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
            </div>
            {/* Badge */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="absolute -bottom-4 -right-4 w-16 h-16 rounded-3xl flex items-center justify-center shadow-xl border-4 border-white rotate-12" 
              style={{ backgroundColor: accentColor }}
            >
              <ChefHat className="text-slate-900" size={28} />
            </motion.div>
          </div>

              <div className="space-y-6 mb-12">
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none uppercase italic">
              {settings.restaurantName}
            </h2>
            <div className="flex items-center justify-center gap-3">
              <div className="h-1.5 w-16 rounded-full bg-slate-100" />
              <div className="h-1.5 w-6 rounded-full" style={{ backgroundColor: accentColor }} />
              <div className="h-1.5 w-16 rounded-full bg-slate-100" />
            </div>
            <p className="text-lg text-slate-500 font-bold leading-tight px-6 opacity-80">{settings.welcomeMessage}</p>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={() => { setOrderType('delivery'); setMenuStep('menu'); }}
              className="w-full py-6 text-white rounded-[2.5rem] font-black text-xl uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group"
              style={{ 
                backgroundColor: effectivePrimaryColor,
                boxShadow: `0 25px 50px -12px ${effectivePrimaryColor}66`
              }}
            >
              <span className="relative z-10">Pular pro Cardápio</span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <ChevronRight className="relative z-10" size={24} strokeWidth={3} />
            </button>
            
            {onBack && (
              <button 
                onClick={onBack}
                className="w-full py-5 text-slate-400 font-black text-xs uppercase tracking-[0.2em] hover:text-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} /> Voltar ao Marketplace
              </button>
            )}
            
            <div className="flex items-center justify-center gap-8 py-4">
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                  <Clock size={18} />
                </div>
                <span className="text-[10px] font-black uppercase text-slate-400">{estimatedDeliveryTime}</span>
              </div>
              <div className="w-px h-10 bg-slate-100" />
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                  <Truck size={18} />
                </div>
                <span className="text-[10px] font-black uppercase text-slate-400">Entrega</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-full bg-[#f8fafb] ${fontFamilyClass} text-slate-900 overflow-x-hidden pb-32`}>
      {/* RESTAURANT HEADER (Screen 6) */}
      <div className="relative h-64 w-full">
        <img 
          src={settings.bannerUrl || `https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop`} 
          className="w-full h-full object-cover"
          alt={settings.restaurantName}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
        
        {/* Navigation Actions */}
        <div className="absolute top-8 inset-x-6 flex justify-between items-center z-10">
          {onBack ? (
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20"
            >
              <ArrowLeft size={24} />
            </motion.button>
          ) : (
            <div />
          )}
          
          <div className="flex gap-3">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleHeartClick}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
                activeIsFavorite 
                  ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/30' 
                  : 'bg-white/20 backdrop-blur-md text-white border-white/20 hover:bg-white/30'
              }`}
            >
              <Heart 
                size={22} 
                fill={activeIsFavorite ? "currentColor" : "none"} 
                className={`transition-transform duration-300 ${activeIsFavorite ? 'scale-110' : ''}`} 
              />
            </motion.button>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20"
            >
              <Info size={22} />
            </motion.button>
          </div>
        </div>

        {/* Store Info Overlay */}
        <div className="absolute -bottom-1 inset-x-0 p-6 pt-12 bg-gradient-to-t from-[#f8fafb] to-transparent">
          <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl shadow-slate-200/50 relative">
             <div className="absolute -top-10 right-8 w-20 h-20 bg-white p-1.5 rounded-[2rem] shadow-2xl border border-slate-50">
               <img 
                 src={settings.logoUrl || `https://picsum.photos/seed/${settings.restaurantName}/200/200`} 
                 className="w-full h-full object-cover rounded-[1.5rem]" 
                 alt={settings.restaurantName}
               />
             </div>
             
             <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-2">{settings.restaurantName}</h2>
             
             <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
               <div className="flex items-center gap-1.5">
                 <Star size={14} className="text-amber-500" fill="currentColor" />
                 <span className="text-slate-700">4.9</span>
                 <span>(500+)</span>
               </div>
               <span className="w-1 h-1 bg-slate-200 rounded-full" />
               <div className="flex items-center gap-1.5">
                 <Clock size={14} className="text-brand-primary" />
                 <span className="text-slate-700">{estimatedDeliveryTime}</span>
               </div>
               <span className="w-1 h-1 bg-slate-200 rounded-full" />
               <div className="flex items-center gap-1.5 text-emerald-500">
                 <Bike size={14} />
                 <span>R$ {deliveryFee > 0 ? deliveryFee.toFixed(2) : 'Grátis'}</span>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* SEARCH AND CATEGORIES (Screen 6) */}
      <div className="px-6 mt-8 space-y-6">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} strokeWidth={3} />
          <input 
            type="text" 
            placeholder="Buscar no cardápio..." 
            className="w-full bg-white border border-slate-100 rounded-3xl py-5 pl-16 pr-8 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary transition-all shadow-sm outline-none placeholder:text-slate-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap ${
                activeCategory === cat 
                ? 'text-white shadow-xl shadow-brand-primary/20' 
                : 'bg-white text-slate-400 border border-slate-100'
              }`}
              style={{ backgroundColor: activeCategory === cat ? effectivePrimaryColor : undefined }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION TITLE */}
      <div className="px-6 mt-8 mb-6">
        <h3 className="text-xl font-extrabold text-slate-800 tracking-tight uppercase flex items-center gap-3">
          {activeCategory}
          <div className="h-0.5 flex-1 bg-slate-100/60 rounded-full" />
          <Filter size={18} className="text-slate-300" />
        </h3>
      </div>

      {/* PRODUCT LIST - UPDATED CARD DESIGN */}
      <div className="px-6 space-y-5">
        {filteredProducts.map(product => (
          <motion.div 
            layout
            key={product.id} 
            onClick={() => {
              setModalQuantity(1);
              setSelectedProductForModal(product);
              setShowProductModal(true);
            }}
            className="bg-white rounded-[2.5rem] p-3 flex gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-50 relative group active:scale-[0.98] transition-all hover:shadow-xl hover:shadow-slate-100/50 cursor-pointer"
          >
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2rem] overflow-hidden shrink-0 border border-slate-100/50 relative flex items-center justify-center bg-slate-50">
              {product.image ? (
                <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex flex-col items-center gap-1 opacity-20">
                   <Package size={32} className="text-slate-500" />
                   <span className="text-[10px] font-black uppercase text-slate-500">Sem Foto</span>
                </div>
              )}
              {product.isPromotional && (
                <div 
                  className="absolute top-3 left-3 text-white p-2 rounded-full z-20 shadow-md backdrop-blur-md"
                  style={{ backgroundColor: `${effectivePrimaryColor}cc` }}
                >
                  <Zap size={12} fill="currentColor" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-between py-1.5 pr-2">
              <div className="max-h-[85px] overflow-hidden">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-slate-800 text-base leading-tight pr-4 group-hover:text-emerald-600 transition-colors uppercase italic truncate">{product.name}</h4>
                    {((product.optionCategories && product.optionCategories.length > 0) || (product.options && product.options.length > 0)) && (
                      <span className="text-[7px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-100 mt-1 inline-block">
                        Customizável
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-bold mt-1.5 line-clamp-2 leading-relaxed opacity-70">
                  {product.description || 'Ingredientes selecionados com o toque especial da casa.'}
                </p>
              </div>
              
              <div className="flex items-end justify-between mt-auto">
                <div className="flex flex-col font-sans">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Preço base</span>
                  <span className="text-lg font-black tracking-tighter" style={{ color: effectivePrimaryColor }}>
                    R$ {product.price.toFixed(2)}
                  </span>
                </div>
                
                {(() => {
                  const hasOptions = (product.optionCategories && product.optionCategories.length > 0) || (product.options && product.options.length > 0);
                  const itemInCartNoOptions = !hasOptions && cart.find(item => item.product.id === product.id && (!item.selectedOptions || item.selectedOptions.length === 0));

                  if (itemInCartNoOptions) {
                    return (
                      <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100/60 shadow-inner" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => removeFromCart(product.id)}
                          className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-100 border border-slate-100/60 transition-all shadow-sm"
                        >
                          <Minus size={14} strokeWidth={2.5} />
                        </button>
                        <span className="font-black text-sm w-5 text-center text-slate-800">{itemInCartNoOptions.quantity}</span>
                        <button 
                          onClick={() => addToCart(product)}
                          className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100/60 hover:scale-105 transition-all shadow-sm"
                          style={{ color: effectivePrimaryColor }}
                        >
                          <Plus size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasOptions) {
                          setModalQuantity(1);
                          setSelectedProductForModal(product);
                          setShowProductModal(true);
                        } else {
                          addToCart(product);
                        }
                      }}
                      className="w-12 h-12 rounded-[1.3rem] flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.08)] active:scale-95 transition-all border-none"
                      style={{ backgroundColor: effectivePrimaryColor }}
                    >
                      <Plus size={24} className="text-white" strokeWidth={3} />
                    </button>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* EMPTY STATE */}
      {filteredProducts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
            <Search size={32} />
          </div>
          <h4 className="font-black text-slate-800 uppercase tracking-tight">Nenhum item encontrado</h4>
          <p className="text-xs text-slate-400 font-medium mt-1">Tente buscar por outro nome ou categoria.</p>
        </div>
      )}

      {/* BOTTOM NAV / CART BUTTON */}
      {cartCount > 0 && checkoutStep !== 'success' && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t p-4 z-50 flex items-center justify-between shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-4">
            <div className="relative">
              <ShoppingCart size={24} style={{ color: effectivePrimaryColor }} />
              <span className="absolute -top-2 -right-2 text-slate-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white" style={{ backgroundColor: accentColor }}>
                {cartCount}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
              <p className="text-lg font-black leading-none" style={{ color: effectivePrimaryColor }}>R$ {cartTotal.toFixed(2)}</p>
            </div>
          </div>
          <button 
            onClick={() => { setShowCart(true); setCheckoutStep('cart'); }}
            className="text-slate-900 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
            style={{ backgroundColor: accentColor, boxShadow: `0 10px 15px -3px ${accentColor}33` }}
          >
            Ver Carrinho
          </button>
        </div>
      )}

      {/* CART MODAL */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-md bg-[#F5F5F5] rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* CART HEADER */}
              <div className="p-6 flex items-center justify-between" style={{ backgroundColor: effectivePrimaryColor }}>
                <div className="flex items-center gap-4">
                  <button onClick={() => checkoutStep === 'details' ? setCheckoutStep('cart' as const) : setShowCart(false)} className="text-white select-none active:scale-90 transition-transform"><ArrowLeft size={24} /></button>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    {checkoutStep === 'cart' ? 'Seu Carrinho' : checkoutStep === 'details' ? 'Finalizar Pedido' : 'Pedido Confirmado'}
                  </h3>
                </div>
                <button onClick={() => setShowCart(false)} className="text-white"><ShoppingCart size={24} /></button>
              </div>

              {/* STEPPER INDICATOR */}
              {checkoutStep !== 'success' && (
                <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-evenly font-sans shrink-0 shadow-sm z-10">
                  <button 
                    onClick={() => setCheckoutStep('cart' as const)}
                    className="flex items-center gap-2 select-none"
                  >
                    <span 
                      className="w-6 h-6 rounded-full flex items-center justify-center font-black text-xs transition-colors"
                      style={{ 
                        backgroundColor: checkoutStep === 'cart' ? effectivePrimaryColor : '#F1F5F9',
                        color: checkoutStep === 'cart' ? '#FFFFFF' : '#64748B'
                      }}
                    >
                      1
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wider transition-colors ${checkoutStep === 'cart' ? 'text-slate-900' : 'text-slate-400'}`}>Sacola</span>
                  </button>

                  <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden relative">
                    <div 
                      className="absolute left-0 top-0 bottom-0 transition-all duration-300" 
                      style={{ 
                        backgroundColor: effectivePrimaryColor,
                        width: checkoutStep === 'details' ? '100%' : '0%' 
                      }} 
                    />
                  </div>

                  <button 
                    disabled={cart.length === 0 || cartTotal < minOrderValue}
                    onClick={() => setCheckoutStep('details' as const)}
                    className="flex items-center gap-2 select-none disabled:opacity-50"
                  >
                    <span 
                      className="w-6 h-6 rounded-full flex items-center justify-center font-black text-xs transition-colors"
                      style={{ 
                        backgroundColor: checkoutStep === 'details' ? effectivePrimaryColor : '#F1F5F9',
                        color: checkoutStep === 'details' ? '#FFFFFF' : '#64748B'
                      }}
                    >
                      2
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wider transition-colors ${checkoutStep === 'details' ? 'text-slate-900' : 'text-slate-400'}`}>Dados</span>
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-slate-50/50">
                {checkoutStep === 'cart' && (
                  cart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 px-6 space-y-6">
                        <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-slate-200">
                          <ShoppingBag size={48} strokeWidth={1.5} />
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xl font-black text-slate-800 tracking-tight">Carrinho Vazio</h4>
                          <p className="text-xs text-slate-400 font-bold max-w-[200px] mx-auto leading-relaxed">
                            Opa! Parece que você ainda não escolheu nada delicioso.
                          </p>
                        </div>
                        <button 
                          onClick={() => setShowCart(false)}
                          className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-100 shadow-lg shadow-slate-100 hover:scale-105 active:scale-95 transition-all"
                        >
                          Explorar Cardápio
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4">
                        <div className="flex justify-between items-center px-2">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sua Sacola ({cartCount})</h4>
                           <button onClick={resetOrder} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">Limpar</button>
                        </div>
                          {cart.map((item, idx) => (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          key={idx} 
                          className="bg-white rounded-[2.5rem] p-5 shadow-sm border border-slate-50 flex gap-5 group"
                        >
                          <div className="w-20 h-20 rounded-3xl overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center border border-slate-100 relative">
                             {item.product.image ? (
                               <img src={item.product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                             ) : (
                               <Package size={24} className="text-slate-300" />
                             )}
                             <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-brand-primary text-white rounded-xl flex items-center justify-center font-black text-xs shadow-lg border-2 border-white">
                                {item.quantity}
                             </div>
                          </div>
                          
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                             <div>
                                <div className="flex justify-between items-start">
                                   <h4 className="font-black text-slate-800 text-sm italic uppercase truncate tracking-tight">{item.product.name}</h4>
                                </div>
                                {item.selectedOptions && item.selectedOptions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {item.selectedOptions.map(o => (
                                      <span key={o.id} className="text-[7px] font-black uppercase text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100/50">
                                        {o.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                             </div>
                             
                             <div className="flex justify-between items-center mt-3">
                                <span className="font-black text-slate-900 text-xs">
                                  R$ {( (item.product.price + (item.selectedOptions?.reduce((s, o) => s + (o.price || 0), 0) || 0)) * item.quantity).toFixed(2)}
                                </span>
                                <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
                                  <button onClick={() => removeFromCart(item.product.id, item.selectedOptions)} className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm"><Minus size={14} /></button>
                                  <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                                  <button onClick={() => addToCart(item.product, item.selectedOptions)} className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-brand-primary hover:scale-105 transition-all shadow-sm"><Plus size={14} /></button>
                                </div>
                             </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* OBSERVATIONS */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/50 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações</label>
                      <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Alguma observação para o preparo? Ex: Sem cebola, sachês extras, etc."
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold outline-none transition-all resize-none focus:bg-white"
                        rows={2}
                      />
                    </div>

                    {/* SCREEN 8 SUMMARY INTEGRATION */}
                    <div className="mt-6 space-y-6">
                      <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-slate-50 space-y-5">
                         <div className="flex justify-between items-center text-slate-500">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                                 <ShoppingBag size={14} />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest">Subtotal</span>
                           </div>
                           <span className="text-sm font-black text-slate-800">R$ {cartTotal.toFixed(2)}</span>
                         </div>
                         
                         {orderType === 'delivery' && (
                           <div className="flex justify-between items-center text-emerald-500">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-300">
                                   <Bike size={14} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Taxa de Entrega</span>
                             </div>
                             <span className="text-sm font-black tracking-tight">{deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2)}` : 'Grátis'}</span>
                           </div>
                         )}

                         <div className="pt-6 border-t border-slate-100 border-dashed flex justify-between items-end">
                           <div className="space-y-1">
                              <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2rem] italic">Total a pagar</p>
                              <span className="text-lg font-black uppercase tracking-tighter text-slate-900">Total do Pedido</span>
                           </div>
                           <span className="text-4xl font-black tracking-tighter italic" style={{ color: effectivePrimaryColor }}>
                             R$ {(cartTotal + (orderType === 'delivery' ? deliveryFee : 0)).toFixed(2)}
                           </span>
                         </div>
                      </div>
                    </div>
                  </>
                ))}
                {checkoutStep === 'details' && (
                  <div className="space-y-6">
                    {!initialTable && (
                      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-50 space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Pedido</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {isDeliveryEnabled && (
                            <button 
                              onClick={() => setOrderType('delivery')}
                              className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${orderType === 'delivery' ? 'text-white' : 'bg-white border-slate-100 text-slate-400'}`}
                              style={{ 
                                backgroundColor: orderType === 'delivery' ? effectivePrimaryColor : undefined, 
                                borderColor: orderType === 'delivery' ? effectivePrimaryColor : undefined 
                              }}
                            >
                              <Truck size={16} />
                              <span className="text-[8px] font-black uppercase tracking-widest">Delivery</span>
                            </button>
                          )}
                          {isPickupEnabled && (
                            <button 
                              onClick={() => setOrderType('takeout')}
                              className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${orderType === 'takeout' ? 'text-white' : 'bg-white border-slate-100 text-slate-400'}`}
                              style={{ 
                                backgroundColor: orderType === 'takeout' ? effectivePrimaryColor : undefined, 
                                borderColor: orderType === 'takeout' ? effectivePrimaryColor : undefined 
                              }}
                            >
                              <ShoppingBag size={16} />
                              <span className="text-[8px] font-black uppercase tracking-widest">Retirada</span>
                            </button>
                          )}
                        </div>
                        {orderType === 'delivery' && (
                          <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço de Entrega</label>
                              <button
                                type="button"
                                onClick={handleGeolocateUser}
                                disabled={isLocatingUser}
                                className="text-[9px] font-black uppercase text-brand-primary flex items-center gap-1.5 bg-brand-primary/5 px-2.5 py-1.5 rounded-full border border-brand-primary/15 transition-all hover:bg-brand-primary/10 active:scale-95 disabled:opacity-50"
                              >
                                <Navigation size={10} className={isLocatingUser ? "animate-pulse" : ""} />
                                {isLocatingUser ? "Obtendo GPS..." : "Usar GPS Atual"}
                              </button>
                            </div>
                            
                            {/* Toggle Mode */}
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                              <button
                                type="button"
                                onClick={() => setAddressMode('cep')}
                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${addressMode === 'cep' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                              >
                                🔍 Buscar CEP
                              </button>
                              <button
                                type="button"
                                onClick={() => setAddressMode('manual')}
                                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${addressMode === 'manual' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                              >
                                ✍️ Endereço Manual
                              </button>
                            </div>

                            {addressMode === 'cep' ? (
                              <div className="space-y-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl animate-in fade-in duration-200">
                                <div className="flex gap-2">
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      placeholder="Digite seu CEP (Ex: 01310-100)"
                                      maxLength={9}
                                      value={cepInput}
                                      onChange={(e) => {
                                        const clean = e.target.value.replace(/\D/g, '');
                                        let formatted = clean;
                                        if (clean.length > 5) {
                                          formatted = `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
                                        }
                                        setCepInput(formatted);
                                        if (clean.length === 8) {
                                          handleCepSearch(clean);
                                        }
                                      }}
                                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold placeholder-slate-400 outline-none focus:border-brand-primary"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCepSearch(cepInput)}
                                    disabled={isCepLoading}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                                  >
                                    {isCepLoading ? 'Buscando...' : 'Buscar'}
                                  </button>
                                </div>

                                {cepError && (
                                  <p className="text-[10px] text-red-600 font-bold uppercase tracking-tight">{cepError}</p>
                                )}

                                {cepData && (
                                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                    <p className="text-[11px] font-bold text-slate-700">
                                      📍 {cepData.street || 'Rua não definida (zona rural)'}, {cepData.neighborhood || 'Bairro não definido'}
                                    </p>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                      {cepData.city} - {cepData.state}
                                    </p>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <input
                                      type="text"
                                      placeholder="Número (Ex: 105)"
                                      value={cepNumber}
                                      onChange={(e) => setCepNumber(e.target.value)}
                                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      placeholder="Complemento (Apto, bloco...)"
                                      value={cepComplement}
                                      onChange={(e) => setCepComplement(e.target.value)}
                                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <textarea 
                                placeholder="Rua, número, bairro, complemento, cidade e estado..."
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none resize-none"
                                rows={3}
                                value={customerAddress}
                                onChange={(e) => setCustomerAddress(e.target.value)}
                              />
                            )}

                            {/* City Match Feedback Block */}
                            {isMarketplace && restaurantCity && (
                              <div className="mt-1 space-y-2 animate-in fade-in duration-200">
                                {isValidatingCity ? (
                                  <div className="flex items-center gap-2 text-brand-primary bg-brand-primary/5 p-3 rounded-xl border border-brand-primary/10">
                                    <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin shrink-0"></div>
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Validando geolocalização do endereço...</span>
                                  </div>
                                ) : cityMatchError ? (
                                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-2 text-red-800">
                                    <div className="flex items-start gap-2.5">
                                      <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                      <div className="text-[10px] font-bold uppercase tracking-tight flex-1">
                                        Zona de Entrega Indisponível
                                      </div>
                                    </div>
                                    <p className="text-[10px] leading-relaxed text-red-600 font-medium">
                                      {cityMatchError}
                                    </p>
                                    <div className="text-[9px] uppercase tracking-wider text-red-400 font-extrabold bg-red-100/50 px-2 py-1 rounded inline-block">
                                      Cidade do Restaurante: {restaurantCity}
                                    </div>
                                  </div>
                                ) : validatedCity ? (
                                  <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100 flex items-start gap-2.5 text-emerald-800">
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <div className="flex-1 space-y-0.5">
                                      <div className="text-[10px] font-bold uppercase tracking-tight">
                                        Endereço Confirmado
                                      </div>
                                      <p className="text-[10px] leading-relaxed text-emerald-600 font-medium font-bold">
                                        Cidade compatível: <span className="font-extrabold uppercase">{validatedCity}</span>
                                      </p>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-50 space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação</h4>
                      <input 
                        type="text"
                        placeholder="Seu nome"
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                      <input 
                        type="tel"
                        placeholder="WhatsApp"
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(maskPhone(e.target.value))}
                      />
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-50 space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamento</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {['pix', 'cartao', 'dinheiro'].map(method => (
                          <button 
                            key={method}
                            onClick={() => setPaymentMethod(method)}
                            className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === method ? 'text-white' : 'bg-white border-slate-100 text-slate-400'}`}
                            style={{ backgroundColor: paymentMethod === method ? effectivePrimaryColor : undefined, borderColor: paymentMethod === method ? effectivePrimaryColor : undefined }}
                          >
                            {method === 'pix' ? <Smartphone size={16} /> : method === 'cartao' ? <CreditCard size={16} /> : <Wallet size={16} />}
                            <span className="text-[8px] font-black uppercase">{method}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {checkoutStep === 'success' && (
                  <div className="flex flex-col items-center justify-center text-center space-y-8 py-8 px-4">
                    <div className="relative">
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-xl shadow-emerald-100 relative z-10"
                      >
                        <Check size={48} />
                      </motion.div>
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 bg-emerald-400 rounded-full -z-0"
                      />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-3xl font-black tracking-tight text-slate-800">Pedido Enviado!</h3>
                      <p className="text-slate-500 font-medium text-sm leading-relaxed">
                        Seu pedido foi recebido com sucesso. Se você optou por finalizar no WhatsApp, certifique-se de ter enviado a mensagem.
                      </p>
                    </div>

                    {/* TRACKING TIMELINE SIMULATION */}
                    <div className="w-full bg-slate-50 rounded-[2rem] p-6 space-y-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Acompanhamento em Tempo Real</h4>
                      <div className="space-y-6 relative">
                         <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-slate-200" />
                         
                         <div className="flex gap-4 relative">
                            <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-100 z-10">
                               <Check size={14} />
                            </div>
                            <div className="text-left">
                               <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">Pedido Confirmado</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acabamos de receber sua solicitação</p>
                            </div>
                         </div>

                         <div className="flex gap-4 relative">
                            <div className="w-7 h-7 rounded-full bg-white border-2 border-teal-600 text-teal-600 flex items-center justify-center z-10 animate-pulse">
                               <Package size={14} />
                            </div>
                            <div className="text-left">
                               <p className="text-xs font-black text-teal-600 uppercase tracking-tighter">Sendo Preparado</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">O chef já está trabalhando no seu prato</p>
                            </div>
                         </div>

                         <div className="flex gap-4 relative opacity-40">
                            <div className="w-7 h-7 rounded-full bg-white border-2 border-slate-300 text-slate-400 flex items-center justify-center z-10">
                               <Truck size={14} />
                            </div>
                            <div className="text-left">
                               <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">Saiu para Entrega</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seu pedido está a caminho de você</p>
                            </div>
                         </div>
                      </div>
                    </div>

                    <div className="w-full space-y-3 pt-4">
                      <button 
                        onClick={() => {
                          setShowCart(false);
                          if (isMarketplace && onBack) {
                            onBack(); // Takes customer back to Marketplace main screen with tracking
                          } else {
                            resetOrder();
                          }
                        }}
                        className="w-full py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        style={{ backgroundColor: effectivePrimaryColor }}
                      >
                        <Clock size={18} />
                        {isMarketplace ? 'Acompanhar Pedido' : 'Ir para o Cardápio'}
                      </button>
                      <button 
                        onClick={resetOrder}
                        className="w-full py-4 text-slate-500 hover:text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"
                      >
                        <ShoppingBag size={14} />
                        Fazer novo pedido
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {checkoutStep !== 'success' && (
                <div className="p-6 bg-white border-t space-y-4">
                  {checkoutStep === 'cart' && cartTotal < minOrderValue && (
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-center gap-3 text-amber-700">
                      <AlertTriangle size={18} className="shrink-0" />
                      <p className="text-[10px] font-bold uppercase tracking-tight">
                        Pedido mínimo de R$ {minOrderValue.toFixed(2)}. Faltam R$ {(minOrderValue - cartTotal).toFixed(2)}.
                      </p>
                    </div>
                  )}
                  <button 
                    disabled={
                      (checkoutStep === 'cart' && cartTotal < minOrderValue) ||
                      (checkoutStep === 'details' && (!customerName || !customerPhone || !paymentMethod || !orderType)) ||
                      (checkoutStep === 'details' && orderType === 'delivery' && (!customerAddress || !!cityMatchError || isValidatingCity))
                    }
                    onClick={() => {
                      if (checkoutStep === 'cart') {
                        const hasSides = availableUpsells.sides.length > 0;
                        const hasDrinks = availableUpsells.drinks.length > 0;
                        const hasDesserts = availableUpsells.desserts.length > 0;
                        if (!totemUpsellViewed && (hasSides || hasDrinks || hasDesserts)) {
                          if (hasSides) setTotemActiveTab('sides');
                          else if (hasDrinks) setTotemActiveTab('drinks');
                          else if (hasDesserts) setTotemActiveTab('desserts');
                          setShowTotemUpsell(true);
                          setTotemUpsellViewed(true);
                        } else {
                          setCheckoutStep('details');
                        }
                      } else {
                        handleFinishOrder();
                      }
                    }}
                    className="w-full py-5 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-50"
                    style={{ backgroundColor: accentColor, boxShadow: `0 20px 25px -5px ${accentColor}33` }}
                  >
                    {checkoutStep === 'cart' ? 'Finalizar Pedido' : 'Confirmar Pedido'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MCDONALD'S TOTEM UP-SELLING MODAL */}
      <AnimatePresence>
        {showTotemUpsell && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowTotemUpsell(false);
                setCheckoutStep('details');
              }}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="relative w-full max-w-3xl bg-white rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col h-[100vh] sm:h-[85vh] z-10"
            >
              {/* Gold/Yellow Theme Totem Header */}
              <div className="p-6 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-amber-950 flex flex-col items-center justify-center text-center relative shadow-md shrink-0">
                <button 
                  onClick={() => {
                    setShowTotemUpsell(false);
                    setCheckoutStep('details');
                  }}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/30 hover:bg-white/50 backdrop-blur-md rounded-2xl flex items-center justify-center text-amber-950 transition-all active:scale-95"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
                <div className="inline-flex items-center gap-2 bg-amber-950 text-amber-300 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-3 shadow-lg shadow-amber-950/20">
                  <Sparkles size={12} className="text-amber-300 animate-pulse" />
                  MÉTODO TOTEM SUGERIDO
                </div>
                <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-amber-950">
                  Que tal um acompanhamento especial?
                </h3>
                <p className="text-xs text-amber-900 font-bold mt-1.5 max-w-md">
                  Complete seu pedido com nossas opções mais queridas com descontos exclusivos e garanta a melhor experiência!
                </p>
              </div>

              {/* TABS SELECTOR */}
              <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-center gap-3 shrink-0">
                {availableUpsells.sides.length > 0 && (
                  <button
                    onClick={() => setTotemActiveTab('sides')}
                    className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                      totemActiveTab === 'sides' 
                        ? 'bg-amber-400 text-amber-950 shadow-md shadow-amber-400/20 scale-105' 
                        : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>🍟</span> Acompanhamentos
                  </button>
                )}
                {availableUpsells.drinks.length > 0 && (
                  <button
                    onClick={() => setTotemActiveTab('drinks')}
                    className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                      totemActiveTab === 'drinks' 
                        ? 'bg-amber-400 text-amber-950 shadow-md shadow-amber-400/20 scale-105' 
                        : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>🥤</span> Bebidas Geladas
                  </button>
                )}
                {availableUpsells.desserts.length > 0 && (
                  <button
                    onClick={() => setTotemActiveTab('desserts')}
                    className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                      totemActiveTab === 'desserts' 
                        ? 'bg-amber-400 text-amber-950 shadow-md shadow-amber-400/20 scale-105' 
                        : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>🍨</span> Sobremesas
                  </button>
                )}
              </div>

              {/* PRODUCT CARDS LIST */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableUpsells[totemActiveTab].map((p: Product) => {
                    const countInCart = cart.filter(item => item.product.id === p.id).reduce((sum, item) => sum + item.quantity, 0);
                    return (
                      <motion.div
                        layout
                        key={p.id}
                        className="bg-white rounded-[2.5rem] p-5 border border-slate-100 shadow-sm flex gap-4 items-center relative hover:shadow-md transition-all duration-300 group"
                      >
                        {/* Image / Icon container */}
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl overflow-hidden shrink-0 flex items-center justify-center border border-slate-100 relative shadow-inner">
                          {p.image ? (
                            <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                          ) : (
                            <UtensilsCrossed size={28} className="text-slate-300" />
                          )}
                          {countInCart > 0 && (
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 text-white rounded-xl flex items-center justify-center font-black text-xs shadow-lg border-2 border-white animate-scale-up">
                              {countInCart}
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <span className="text-[8px] font-black uppercase text-amber-500 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md inline-block mb-1">
                            {totemActiveTab === 'sides' ? 'Crocante & Quentinho' : totemActiveTab === 'drinks' ? 'Refrescante' : 'Irresistível'}
                          </span>
                          <h4 className="font-black text-slate-800 text-sm truncate uppercase italic tracking-tight block">
                            {p.name}
                          </h4>
                          {p.description && (
                            <p className="text-[10px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                              {p.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="font-black text-slate-900 text-sm">
                              R$ {p.price.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Add/Remove Actions inside Totem Kiosk */}
                        <div className="shrink-0">
                          {countInCart > 0 ? (
                            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100 shadow-inner">
                              <button 
                                onClick={() => removeFromCart(p.id)} 
                                className="w-8 h-8 bg-white text-slate-400 hover:text-rose-500 rounded-xl flex items-center justify-center transition-colors shadow-sm active:scale-90"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="font-black text-xs w-4 text-center text-slate-700">{countInCart}</span>
                              <button 
                                onClick={() => addToCart(p)} 
                                className="w-8 h-8 bg-white text-brand-primary rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-90"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(p)}
                              className="px-4 py-2.5 bg-slate-900 text-white hover:bg-amber-400 hover:text-amber-950 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all duration-300 active:scale-95 shadow-md flex items-center gap-1"
                            >
                              <Plus size={12} strokeWidth={3} /> Adicionar
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Totem Footer with Total and Confirm buttons */}
              <div className="p-6 pb-8 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <div className="text-center sm:text-left">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Resumo com adicionais</p>
                  <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                    <span className="text-2xl font-black text-slate-900">R$ {cartTotal.toFixed(2)}</span>
                    <span className="text-xs text-slate-400 font-bold">({cartCount} {cartCount === 1 ? 'item' : 'itens'})</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setShowTotemUpsell(false);
                      setCheckoutStep('details');
                    }}
                    className="flex-1 sm:flex-initial px-6 py-4 border border-slate-200 hover:border-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 bg-white transition-all active:scale-95"
                  >
                    Não, obrigado
                  </button>
                  <button
                    onClick={() => {
                      setShowTotemUpsell(false);
                      setCheckoutStep('details');
                    }}
                    className="flex-1 sm:flex-initial px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-900 active:scale-95 transition-all shadow-xl shadow-amber-400/20"
                    style={{ backgroundColor: accentColor }}
                  >
                    Confirmar e Avançar ✨
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRODUCT DETAIL MODAL (Screen 7) */}
      <AnimatePresence>
        {showProductModal && selectedProductForModal && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProductModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-lg bg-white rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
            >
              <div className="h-72 relative bg-slate-100 flex items-center justify-center">
                <button 
                  onClick={() => setShowProductModal(false)}
                  className="absolute top-6 right-6 z-10 w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center text-slate-800 shadow-xl border border-white/20"
                >
                  <X size={24} strokeWidth={3} />
                </button>
                {selectedProductForModal.image ? (
                  <img src={selectedProductForModal.image} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-3 opacity-20">
                    <Package size={64} className="text-slate-400" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Sem Foto</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              </div>

              <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none uppercase italic">{selectedProductForModal.name}</h3>
                    <div className="text-right shrink-0">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">A partir de</span>
                       <span className="text-2xl font-black" style={{ color: effectivePrimaryColor }}>R$ {selectedProductForModal.price.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-slate-500 font-bold leading-relaxed">{selectedProductForModal.description || 'Uma experiência gastronômica única, preparada com ingredientes selecionados para proporcionar o melhor sabor em cada detalhe.'}</p>
                </div>

                {/* Characteristics */}
                <div className="grid grid-cols-3 gap-3 border-y border-slate-50 py-6">
                   {[
                     { icon: ChefHat, label: 'Especialidade', val: 'Casa' },
                     { icon: Clock, label: 'Preparo', val: '20 min' },
                     { icon: UtensilsCrossed, label: 'Sabor', val: 'Premium' }
                   ].map((item, i) => (
                     <div key={i} className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-2xl">
                        <item.icon size={16} className="text-slate-400" />
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{item.label}</span>
                        <span className="text-[10px] font-black text-slate-800 uppercase">{item.val}</span>
                     </div>
                   ))}
                </div>

                {/* Options Logic (if present) or simpler Add button */}
                {((selectedProductForModal.optionCategories && selectedProductForModal.optionCategories.length > 0) || (selectedProductForModal.options && selectedProductForModal.options.length > 0)) ? (
                   <div className="space-y-4">
                      <div className="bg-brand-primary/5 p-5 rounded-3xl border border-brand-primary/10 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                               <Sparkles size={20} />
                            </div>
                            <div>
                               <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Personalize seu prato</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Selecione acompanhamentos e extras</p>
                            </div>
                         </div>
                         <button 
                           onClick={() => {
                             setSelectedProductForOptions(selectedProductForModal);
                             setSelectedOptionsInModal([]); setOptionsModalQuantity(modalQuantity);
                             setShowOptionsModal(true);
                           }}
                           className="bg-brand-primary text-white p-2.5 rounded-xl shadow-lg shadow-brand-primary/20 active:scale-90 transition-all font-black text-[10px] uppercase"
                         >
                           Editar
                         </button>
                      </div>
                   </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-3xl">
                       <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Quantidade</span>
                       <div className="flex items-center gap-6">
                         <button className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 border border-slate-100" onClick={() => setModalQuantity(prev => Math.max(1, prev - 1))}><Minus size={18} /></button>
                         <span className="text-lg font-black">{modalQuantity}</span>
                         <button className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-brand-primary border border-slate-100" onClick={() => setModalQuantity(prev => prev + 1)}><Plus size={18} /></button>
                       </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Action Bar (Screen 7 style) */}
              <div className="p-8 pb-12 bg-white border-t border-slate-50 shadow-[0_-20px_50px_rgba(0,0,0,0.03)]">
                 <button 
                   onClick={() => {
                     addToCart(selectedProductForModal);
                     setShowProductModal(false);
                   }}
                   className="w-full py-6 rounded-[2.5rem] text-white font-black text-xl uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-between px-10 relative overflow-hidden group"
                   style={{ 
                     backgroundColor: effectivePrimaryColor,
                     boxShadow: `0 25px 50px -12px ${effectivePrimaryColor}66`
                   }}
                 >
                   <span className="relative z-10">Adicionar</span>
                   <span className="relative z-10">R$ {selectedProductForModal.price.toFixed(2)}</span>
                   <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OPTIONS MODAL (Refinement for Screen 7 logic) */}
      <AnimatePresence>
        {showOptionsModal && selectedProductForOptions && (
          <div className="fixed inset-0 z-[130] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOptionsModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-lg bg-white rounded-t-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <button onClick={() => setShowOptionsModal(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100"><X size={24} /></button>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic truncate">{selectedProductForOptions.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Escolha suas opções favoritas</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-10 custom-scrollbar">
                {selectedProductForOptions.optionCategories?.map(category => (
                  <div key={category.id} className="space-y-6">
                    <div className="flex justify-between items-end border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-base font-black text-slate-800 uppercase tracking-tighter">{category.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                           {category.min > 0 ? (
                             <span className="bg-brand-primary text-white text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Obrigatório</span>
                           ) : (
                             <span className="bg-slate-100 text-slate-500 text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Opcional</span>
                           )}
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">até {category.max} {category.max === 1 ? 'item' : 'itens'}</span>
                        </div>
                      </div>
                      {selectedOptionsInModal.filter(o => category.options.find(co => co.id === o.id)).length >= category.min && (
                        <div className="bg-emerald-500 text-white p-1 rounded-lg shadow-lg shadow-emerald-500/20">
                          <Check size={14} strokeWidth={4} />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {category.options.filter(option => {
                        if (option.active === false) return false;
                        if (orderType === 'table') return option.isAvailableDigitalMenu !== false;
                        if (orderType === 'delivery' || orderType === 'takeout') return option.isAvailableOnline !== false;
                        return true;
                      }).map(option => {
                        const isSelected = selectedOptionsInModal.find(o => o.id === option.id);
                        return (
                          <button
                            key={option.id}
                            onClick={() => toggleOptionInModal(option, category.id)}
                            className={`w-full p-5 rounded-[1.8rem] border-2 flex items-center justify-between transition-all relative overflow-hidden group ${
                              isSelected 
                                ? 'border-brand-primary bg-brand-primary/5' 
                                : 'border-slate-100 hover:border-slate-200 bg-white shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${
                                isSelected ? 'bg-brand-primary border-brand-primary shadow-lg shadow-brand-primary/20' : 'bg-white border-slate-200'
                              }`}>
                                {isSelected && <Plus size={14} strokeWidth={4} className="text-white" />}
                              </div>
                              <div className="text-left">
                                <span className={`text-sm font-black uppercase tracking-tight block ${isSelected ? 'text-brand-primary' : 'text-slate-700'}`}>
                                  {option.name}
                                </span>
                                {option.description && <p className="text-[10px] text-slate-400 font-bold">{option.description}</p>}
                              </div>
                            </div>
                            {option.price > 0 && (
                              <span className={`text-[11px] font-black ${isSelected ? 'text-brand-primary' : 'text-emerald-500'}`}>
                                + R$ {option.price.toFixed(2)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-8 pb-12 bg-white border-t border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                        <ShoppingBag size={20} />
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preço Individual</p>
                        <p className="text-lg font-black text-slate-900">R$ {((selectedProductForOptions.price + selectedOptionsInModal.reduce((sum, o) => sum + (o.price || 0), 0)) * optionsModalQuantity).toFixed(2)}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <button className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300" onClick={() => setOptionsModalQuantity(prev => Math.max(1, prev - 1))}><Minus size={18} /></button>
                    <span className="text-lg font-black">{optionsModalQuantity}</span>
                    <button className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-brand-primary" onClick={() => setOptionsModalQuantity(prev => prev + 1)}><Plus size={18} /></button>
                  </div>
                </div>
                <button 
                  onClick={confirmOptions}
                  className="w-full py-6 rounded-[2.5rem] text-white font-black text-xl uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                  style={{ 
                    backgroundColor: effectivePrimaryColor,
                    boxShadow: `0 25px 50px -12px ${effectivePrimaryColor}66`
                  }}
                >
                  Adicionar ao Carrinho <ChevronRight size={24} strokeWidth={3} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUMMARY (Screen 8 Style) */}
      <div className="bg-white rounded-t-[3rem] p-10 shadow-[0_-20px_60px_rgba(0,0,0,0.06)] space-y-6">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-4">Detalhamento de Valores</h4>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 text-slate-500">
               <Package size={16} />
               <span className="text-xs font-black uppercase tracking-widest">Subtotal dos Itens:</span>
            </div>
            <span className="text-sm font-black text-slate-800 tracking-tight">R$ {cartTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 text-emerald-500">
               <Bike size={16} />
               <span className="text-xs font-black uppercase tracking-widest">Taxa de Entrega:</span>
            </div>
            <span className="text-sm font-black text-emerald-600 tracking-tight">{deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2)}` : 'Grátis'}</span>
          </div>
          <div className="flex justify-between items-center opacity-40">
            <div className="flex items-center gap-3 text-slate-400">
               <Sparkles size={16} />
               <span className="text-xs font-black uppercase tracking-widest">Taxa de Serviço:</span>
            </div>
            <span className="text-[10px] font-black tracking-tight">Sob consulta</span>
          </div>
          <div className="pt-6 border-t-2 border-slate-50 border-dashed flex justify-between items-end">
            <div>
               <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Total a pagar</p>
               <span className="text-lg font-black uppercase tracking-tighter">Valor Final</span>
            </div>
            <span className="text-3xl font-black tracking-tighter" style={{ color: effectivePrimaryColor }}>
              R$ {(cartTotal + (orderType === 'delivery' ? deliveryFee : 0)).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalMenu;
