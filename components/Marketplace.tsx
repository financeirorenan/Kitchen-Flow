import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Bell,
  ShoppingBag,
  Pizza,
  Coffee,
  IceCream,
  Store,
  Smartphone,
  Star,
  Clock,
  ChevronRight,
  ChevronDown,
  Filter,
  Sparkles,
  Heart,
  User as UserIcon,
  Home,
  MessageSquare,
  MessageCircle,
  Truck,
  Fish,
  Sandwich,
  Snowflake,
  ChefHat,
  Leaf,
  Ticket,
  UtensilsCrossed,
  X,
  Package,
  Bike,
  CheckCircle2,
  Navigation,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
  addDoc,
  setDoc,
  limit,
} from "firebase/firestore";
import {
  Tenant,
  DigitalMenuSettings,
  Product,
  Order,
  Courier,
  MarketplaceSettings,
} from "../types";
import { maskPhone } from "../utils/masks";
import DigitalMenu from "./DigitalMenu";

interface MarketplaceProps {
  onSelectTenant: (tenantId: string) => void;
  currentUser: any;
  profile: { name: string; phone: string } | null;
  onUpdateProfile: (data: { name: string; phone: string }) => void;
}

const resolveIcon = (iconName: string) => {
  const iconMap: Record<string, any> = {
    Pizza,
    Coffee,
    IceCream,
    Fish,
    Sandwich,
    UtensilsCrossed,
    ChefHat,
    Leaf,
    Store,
    Clock,
    Search,
  };
  return iconMap[iconName] || UtensilsCrossed;
};

const getCategoryPresets = (name: string) => {
  const normalized = name.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove accents for accurate matching

  if (normalized.includes("pizza")) {
    return {
      bg: "bg-rose-50",
      border: "border-rose-100",
      activeBorder: "border-rose-500",
      ring: "ring-rose-500/20",
      color: "text-rose-500",
      img: "https://cdn-icons-png.flaticon.com/512/3132/3132693.png",
      icon: Pizza,
    };
  }
  if (
    normalized.includes("japa") ||
    normalized.includes("sushi") ||
    normalized.includes("peixe") ||
    normalized.includes("mar") ||
    normalized.includes("oriental")
  ) {
    return {
      bg: "bg-blue-50",
      border: "border-blue-100",
      activeBorder: "border-blue-500",
      ring: "ring-blue-500/20",
      color: "text-blue-500",
      img: "https://cdn-icons-png.flaticon.com/512/906/906175.png", // Sushi
      icon: Fish,
    };
  }
  if (
    normalized.includes("burger") ||
    normalized.includes("hamburg") ||
    normalized.includes("lanche") ||
    normalized.includes("artesanal")
  ) {
    return {
      bg: "bg-amber-50",
      border: "border-amber-100",
      activeBorder: "border-amber-500",
      ring: "ring-amber-500/20",
      color: "text-amber-500",
      img: "https://cdn-icons-png.flaticon.com/512/3075/3075929.png", // Burger
      icon: Sandwich,
    };
  }
  if (
    normalized.includes("doce") ||
    normalized.includes("sobremesa") ||
    normalized.includes("bolo") ||
    normalized.includes("acai") ||
    normalized.includes("chocolate") ||
    normalized.includes("sorvete") ||
    normalized.includes("gelato") ||
    normalized.includes("confeitaria")
  ) {
    return {
      bg: "bg-pink-50",
      border: "border-pink-100",
      activeBorder: "border-pink-500",
      ring: "ring-pink-500/20",
      color: "text-pink-500",
      img: "https://cdn-icons-png.flaticon.com/512/2454/2454512.png", // IceCream
      icon: IceCream,
    };
  }
  if (
    normalized.includes("bebida") ||
    normalized.includes("suco") ||
    normalized.includes("refrigerante") ||
    normalized.includes("cerveja") ||
    normalized.includes("vinho") ||
    normalized.includes("coquetel") ||
    normalized.includes("drink")
  ) {
    return {
      bg: "bg-cyan-50",
      border: "border-cyan-100",
      activeBorder: "border-cyan-500",
      ring: "ring-cyan-500/20",
      color: "text-cyan-500",
      img: "https://cdn-icons-png.flaticon.com/512/3126/3126504.png", // Drink straw
      icon: Coffee,
    };
  }
  if (
    normalized.includes("mercado") ||
    normalized.includes("mercearia") ||
    normalized.includes("horti") ||
    normalized.includes("supermercado") ||
    normalized.includes("mercearia") ||
    normalized.includes("fruta")
  ) {
    return {
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      activeBorder: "border-emerald-500",
      ring: "ring-emerald-500/20",
      color: "text-emerald-500",
      img: "https://cdn-icons-png.flaticon.com/512/3081/3081840.png", // Store
      icon: Store,
    };
  }
  if (
    normalized.includes("farma") ||
    normalized.includes("medicamento") ||
    normalized.includes("saude") ||
    normalized.includes("drogaria")
  ) {
    return {
      bg: "bg-teal-50",
      border: "border-teal-100",
      activeBorder: "border-teal-500",
      ring: "ring-teal-500/20",
      color: "text-teal-500",
      img: "https://cdn-icons-png.flaticon.com/512/3004/3004458.png", // Tablet/Leaf
      icon: Leaf,
    };
  }
  if (
    normalized.includes("pastel") ||
    normalized.includes("empanada") ||
    normalized.includes("salgado") ||
    normalized.includes("frito")
  ) {
    return {
      bg: "bg-orange-50",
      border: "border-orange-100",
      activeBorder: "border-orange-500",
      ring: "ring-orange-500/20",
      color: "text-orange-500",
      img: "https://cdn-icons-png.flaticon.com/512/3218/3218768.png", // Pie/Pastry
      icon: UtensilsCrossed,
    };
  }
  if (
    normalized.includes("churrasco") ||
    normalized.includes("carne") ||
    normalized.includes("espeto") ||
    normalized.includes("grelhado") ||
    normalized.includes("bbq") ||
    normalized.includes("rodizio")
  ) {
    return {
      bg: "bg-red-50",
      border: "border-red-100",
      activeBorder: "border-red-500",
      ring: "ring-red-500/20",
      color: "text-red-500",
      img: "https://cdn-icons-png.flaticon.com/512/3075/3075959.png", // Steak
      icon: UtensilsCrossed,
    };
  }
  if (
    normalized.includes("massa") ||
    normalized.includes("italiana") ||
    normalized.includes("macarrao") ||
    normalized.includes("lasanha") ||
    normalized.includes("pasta")
  ) {
    return {
      bg: "bg-yellow-50",
      border: "border-yellow-100",
      activeBorder: "border-yellow-500",
      ring: "ring-yellow-500/20",
      color: "text-amber-600",
      img: "https://cdn-icons-png.flaticon.com/512/2718/2718224.png", // Pasta
      icon: UtensilsCrossed,
    };
  }
  if (
    normalized.includes("frango") ||
    normalized.includes("galeto") ||
    normalized.includes("ave")
  ) {
    return {
      bg: "bg-amber-50",
      border: "border-amber-100",
      activeBorder: "border-amber-500",
      ring: "ring-amber-500/20",
      color: "text-amber-500",
      img: "https://cdn-icons-png.flaticon.com/512/3075/3075973.png", // Fried chicken leg
      icon: UtensilsCrossed,
    };
  }
  if (
    normalized.includes("saudavel") ||
    normalized.includes("fit") ||
    normalized.includes("salada") ||
    normalized.includes("veg") ||
    normalized.includes("natural")
  ) {
    return {
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      activeBorder: "border-emerald-500",
      ring: "ring-emerald-500/20",
      color: "text-emerald-500",
      img: "https://cdn-icons-png.flaticon.com/512/2917/2917633.png", // Salad
      icon: Leaf,
    };
  }
  if (
    normalized.includes("cafe") ||
    normalized.includes("padaria") ||
    normalized.includes("pao") ||
    normalized.includes("desjejum") ||
    normalized.includes("breakfast")
  ) {
    return {
      bg: "bg-orange-50",
      border: "border-orange-100",
      activeBorder: "border-orange-500",
      ring: "ring-orange-500/20",
      color: "text-amber-700",
      img: "https://cdn-icons-png.flaticon.com/512/2830/2830206.png", // Bread/croissant
      icon: Coffee,
    };
  }
  if (
    normalized.includes("petisco") ||
    normalized.includes("bar") ||
    normalized.includes("chope") ||
    normalized.includes("porcao") ||
    normalized.includes("porcoes")
  ) {
    return {
      bg: "bg-violet-50",
      border: "border-violet-100",
      activeBorder: "border-violet-500",
      ring: "ring-violet-500/20",
      color: "text-violet-500",
      img: "https://cdn-icons-png.flaticon.com/512/2405/2405479.png", // Beer Toast
      icon: Coffee,
    };
  }

  // Deterministic fallback generator for unrecognized names (keeps SaaS custom fields beautiful!)
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 5;
  const fallbacks = [
    { bg: "bg-indigo-50", border: "border-indigo-100", activeBorder: "border-indigo-500", ring: "ring-indigo-500/20", color: "text-indigo-500", img: "", icon: UtensilsCrossed },
    { bg: "bg-violet-50", border: "border-violet-100", activeBorder: "border-violet-500", ring: "ring-violet-500/20", color: "text-violet-500", img: "", icon: UtensilsCrossed },
    { bg: "bg-fuchsia-50", border: "border-fuchsia-100", activeBorder: "border-fuchsia-500", ring: "ring-fuchsia-500/20", color: "text-fuchsia-500", img: "", icon: UtensilsCrossed },
    { bg: "bg-purple-50", border: "border-purple-100", activeBorder: "border-purple-500", ring: "ring-purple-500/20", color: "text-purple-500", img: "", icon: UtensilsCrossed },
    { bg: "bg-amber-50", border: "border-amber-100", activeBorder: "border-amber-500", ring: "ring-amber-500/20", color: "text-amber-500", img: "", icon: UtensilsCrossed }
  ];

  return fallbacks[index];
};

const Marketplace: React.FC<MarketplaceProps> = ({
  onSelectTenant,
  currentUser,
  profile,
  onUpdateProfile,
}) => {
  const { tenantId: routeTenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsSettings, setTenantsSettings] = useState<Record<string, any>>({});
  const [commerceCategories, setCommerceCategories] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState("todos");

  const dynamicCategories = useMemo(() => {
    const todosCategory = {
      id: "todos",
      label: "Todas",
      icon: UtensilsCrossed,
      bg: "bg-brand-primary/10",
      border: "border-brand-primary/30",
      activeBorder: "border-brand-primary",
      ring: "ring-brand-primary/25",
      color: "text-brand-primary",
      img: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
    };

    if (!commerceCategories || commerceCategories.length === 0) {
      return [
        todosCategory,
        {
          id: "pizza",
          label: "Pizza",
          icon: Pizza,
          bg: "bg-rose-50",
          border: "border-rose-100",
          activeBorder: "border-rose-500",
          ring: "ring-rose-500/20",
          color: "text-rose-500",
          img: "https://cdn-icons-png.flaticon.com/512/3132/3132693.png",
        },
        {
          id: "japa",
          label: "Japa",
          icon: Fish,
          bg: "bg-blue-50",
          border: "border-blue-100",
          activeBorder: "border-blue-500",
          ring: "ring-blue-500/20",
          color: "text-blue-500",
          img: "https://cdn-icons-png.flaticon.com/512/2252/2252431.png",
        },
        {
          id: "burger",
          label: "Burger",
          icon: Sandwich,
          bg: "bg-amber-50",
          border: "border-amber-100",
          activeBorder: "border-amber-500",
          ring: "ring-amber-500/20",
          color: "text-amber-500",
          img: "https://cdn-icons-png.flaticon.com/512/3075/3075929.png",
        },
        {
          id: "doces",
          label: "Doces",
          icon: IceCream,
          bg: "bg-pink-50",
          border: "border-pink-100",
          activeBorder: "border-pink-500",
          ring: "ring-pink-500/20",
          color: "text-pink-500",
          img: "https://cdn-icons-png.flaticon.com/512/2454/2454512.png",
        },
        {
          id: "bebidas",
          label: "Bebidas",
          icon: Coffee,
          bg: "bg-cyan-50",
          border: "border-cyan-100",
          activeBorder: "border-cyan-500",
          ring: "ring-cyan-500/20",
          color: "text-cyan-500",
          img: "https://cdn-icons-png.flaticon.com/512/3126/3126504.png",
        },
      ];
    }

    const mapped = commerceCategories.map((cat) => {
      const presets = getCategoryPresets(cat.name);
      return {
        id: cat.name.toLowerCase(),
        label: cat.name,
        icon: cat.iconName ? resolveIcon(cat.iconName) : presets.icon,
        bg: cat.bg || presets.bg,
        border: presets.border,
        activeBorder: presets.activeBorder,
        ring: presets.ring,
        color: cat.color || presets.color,
        img: cat.img || presets.img,
      };
    });

    return [todosCategory, ...mapped];
  }, [commerceCategories]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activePromotionId, setActivePromotionId] = useState<string | null>(
    null,
  );

  // Navigation State
  const [navView, setNavView] = useState<
    "home" | "orders" | "favorites" | "profile"
  >("home");

  // Favorites State
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("marketplace_favorites");
    return saved ? JSON.parse(saved) : [];
  });

  const toggleFavorite = (e: React.MouseEvent, tenantId: string) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const newFavs = prev.includes(tenantId)
        ? prev.filter((id) => id !== tenantId)
        : [...prev, tenantId];
      localStorage.setItem("marketplace_favorites", JSON.stringify(newFavs));
      return newFavs;
    });
  };

  // History State
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);

  // Profile State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [tempName, setTempName] = useState(profile?.name || "");
  const [tempPhone, setTempPhone] = useState(profile?.phone || "");

  // Address State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [currentAddress, setCurrentAddress] = useState(
    "Av. Paulista, 1000 - São Paulo",
  );
  const [tempAddress, setTempAddress] = useState(currentAddress);

  // CEP (postal code) search robust states
  const [addressMode, setAddressMode] = useState<'cep' | 'manual'>('cep');
  const [cepInput, setCepInput] = useState('');
  const [cepNumber, setCepNumber] = useState('');
  const [cepComplement, setCepComplement] = useState('');
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [cepData, setCepData] = useState<{ street?: string; neighborhood?: string; city?: string; state?: string } | null>(null);

  // Sync CEP components into tempAddress
  useEffect(() => {
    if (addressMode === 'cep' && cepData) {
      const { street = '', neighborhood = '', city = '', state = '' } = cepData;
      const numPart = cepNumber ? `, Nº ${cepNumber}` : '';
      const compPart = cepComplement ? ` - ${cepComplement}` : '';
      const formattedCep = cepInput ? ` - CEP ${cepInput}` : '';
      const fullAddress = `${street}${numPart}${compPart}, ${neighborhood}, ${city} - ${state}${formattedCep}`;
      setTempAddress(fullAddress);
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
      setCepError('Erro ao buscar o CEP. Digite o endereço manualmente.');
      setCepData(null);
    } finally {
      setIsCepLoading(false);
    }
  };

  // Address matching helper
  const normalizeString = (str: string): string => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim();
  };

  const getRestaurantCity = (tenant: Tenant, adminSettings: any) => {
    if (adminSettings?.fiscal?.address?.municipio) {
      return adminSettings.fiscal.address.municipio;
    }
    const rAddr = adminSettings?.address || tenant?.address || "";
    if (rAddr) {
      const parts = rAddr.split("-");
      if (parts.length > 1) {
        const lastPart = parts[parts.length - 1].trim(); 
        const subParts = lastPart.split(","); 
        if (subParts.length > 0) {
          return subParts[0].trim();
        }
      }
      const words = rAddr.split(",");
      if (words.length > 1) {
        const lastWord = words[words.length - 1].trim();
        const slashParts = lastWord.split(/[\/-]/);
        if (slashParts.length > 0) {
          return slashParts[0].trim();
        }
      }
    }
    return tenant?.name?.toLowerCase()?.includes("pizza") ? "São Paulo" : "São Paulo"; // Fallback default
  };

  const getTenantOpenStatus = (tenantId: string) => {
    const settingSnapshot = tenantsSettings[tenantId];
    if (!settingSnapshot) {
      return { isOpen: true, message: "Aberto agora", showTime: "Aberto" };
    }

    const hours = settingSnapshot.businessHours;
    if (!hours || !Array.isArray(hours) || hours.length === 0) {
      return { isOpen: true, message: "Aberto agora", showTime: "Aberto" };
    }

    const DAYS_MAP = [
      "Domingo",
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado"
    ];

    const now = new Date();
    const todayIndex = now.getDay();
    const todayName = DAYS_MAP[todayIndex];

    const todaySchedule = hours.find((h) => {
      if (!h || !h.day) return false;
      const dayClean = h.day.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const todayClean = todayName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return dayClean === todayClean || dayClean.replace("-feira", "") === todayClean.replace("-feira", "");
    });

    if (!todaySchedule) {
      return { isOpen: true, message: "Aberto agora", showTime: "Aberto" };
    }

    if (todaySchedule.isClosed) {
      return { isOpen: false, showTime: `Fechado (${todaySchedule.day})`, message: "Fechado agora" };
    }

    const openTime = todaySchedule.open || "00:00";
    const closeTime = todaySchedule.close || "23:59";
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeStr = `${String(currentHours).padStart(2, "0")}:${String(currentMinutes).padStart(2, "0")}`;

    let isOpen = false;
    if (closeTime < openTime) {
      isOpen = currentTimeStr >= openTime || currentTimeStr <= closeTime;
    } else {
      isOpen = currentTimeStr >= openTime && currentTimeStr <= closeTime;
    }

    if (isOpen) {
      return { isOpen: true, message: "Aberto agora", showTime: `Aberto até ${closeTime}` };
    } else {
      return { isOpen: false, message: "Fechado agora", showTime: `Aberto hoje das ${openTime} às ${closeTime}` };
    }
  };

  const customerCity = useMemo(() => {
    if (!currentAddress) return "São Paulo";
    const parts = currentAddress.split("-");
    if (parts.length > 1) {
      const secondLast = parts[parts.length - 2]?.trim();
      const last = parts[parts.length - 1]?.trim();
      if (last && last.toUpperCase() === last && last.length === 2 && secondLast) {
        return secondLast.split(",").pop()?.trim() || "São Paulo";
      }
    }
    const commaParts = currentAddress.split(",");
    if (commaParts.length > 1) {
      const last = commaParts[commaParts.length - 1]?.trim().split(/[\/-]/)[0]?.trim();
      if (last) return last;
    }
    return "São Paulo";
  }, [currentAddress]);

  const [isLocating, setIsLocating] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Seu navegador não suporta geolocalização por GPS.");
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (typeof window !== "undefined" && window.google?.maps?.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              const matchedAddr = results[0].formatted_address;
              setCurrentAddress(matchedAddr);
              setTempAddress(matchedAddr);
              setShowAddressModal(false);
            } else {
              alert("Não foi possível resolver seu endereço a partir das coordenadas.");
            }
            setIsLocating(false);
          });
        } else {
          setCurrentAddress(`Latitude: ${latitude.toFixed(5)}, Longitude: ${longitude.toFixed(5)}`);
          setTempAddress(`Latitude: ${latitude.toFixed(5)}, Longitude: ${longitude.toFixed(5)}`);
          setShowAddressModal(false);
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("GPS error:", error);
        alert("Não conseguimos capturar sua geolocalização. Por favor, verifique suas permissões.");
        setIsLocating(false);
      }
    );
  };

  // Help Modal State
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedOrderForHelp, setSelectedOrderForHelp] =
    useState<Order | null>(null);
  const [helpModalLoading, setHelpModalLoading] = useState(false);

  // Store Detail State
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [storeSettings, setStoreSettings] =
    useState<DigitalMenuSettings | null>(null);
  const [storeAdminSettings, setStoreAdminSettings] = useState<any | null>(
    null,
  );
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [isStoreLoading, setIsStoreLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Use ref for Firestore product listener to prevent leaks and isolation issues
  const productListenerRef = React.useRef<(() => void) | null>(null);

  // Tracking states
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [trackingCourier, setTrackingCourier] = useState<Courier | null>(null);
  const [marketplaceSettings, setMarketplaceSettings] =
    useState<MarketplaceSettings | null>(null);
  const storeListRef = React.useRef<HTMLDivElement>(null);

  // Sync profile state when prop changes
  useEffect(() => {
    if (profile) {
      setTempName(profile.name);
      setTempPhone(profile.phone);
    }
  }, [profile]);

  useEffect(() => {
    const q = query(
      collection(db, "tenants"),
      where("active", "==", true),
      limit(50),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setTenants(
          snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Tenant),
        );
        setInitialLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar restaurantes:", error);
        setInitialLoading(false);
      },
    );

    const unsubscribeMarketplaceSettings = onSnapshot(
      doc(db, "settings", "marketplace"),
      (snapshot) => {
        if (snapshot.exists()) {
          setMarketplaceSettings(snapshot.data() as MarketplaceSettings);
        }
      },
    );

    const unsubscribeSettings = onSnapshot(
      collection(db, "settings"),
      (snapshot) => {
        const settingsMap: Record<string, any> = {};
        snapshot.docs.forEach((doc) => {
          settingsMap[doc.id] = doc.data();
        });
        setTenantsSettings(settingsMap);
      },
      (error) => {
        console.error("Erro ao carregar configurações de inquilinos:", error);
      },
    );

    const unsubscribeCategories = onSnapshot(
      collection(db, "commerceCategories"),
      (snapshot) => {
        const cats = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })).sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        setCommerceCategories(cats);
      },
      (error) => {
        console.error("Erro ao carregar categorias de comércio:", error);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeMarketplaceSettings();
      unsubscribeSettings();
      unsubscribeCategories();
    };
  }, []);

  // Monitor active orders for tracking
  useEffect(() => {
    if (!profile?.phone) return;

    const q = query(
      collection(db, "orders"),
      where("customerPhone", "==", profile.phone),
      where("status", "in", ["pending", "preparing", "ready", "delivering"]),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id }) as Order,
      );
      setActiveOrders(orders);
    });

    return () => unsubscribe();
  }, [profile?.phone]);

  // Fetch full order history (including finished/delivered)
  useEffect(() => {
    if (!profile?.phone || navView !== "orders") return;

    const q = query(
      collection(db, "orders"),
      where("customerPhone", "==", profile.phone),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs
        .map((doc) => ({ ...doc.data(), id: doc.id }) as Order)
        .sort((a, b) => {
          const dateA =
            a.createdAt instanceof Date
              ? a.createdAt.getTime()
              : (a.createdAt as any)?.toDate?.()?.getTime() || 0;
          const dateB =
            b.createdAt instanceof Date
              ? b.createdAt.getTime()
              : (b.createdAt as any)?.toDate?.()?.getTime() || 0;
          return dateB - dateA;
        });
      setOrderHistory(orders);
    });

    return () => unsubscribe();
  }, [profile?.phone, navView]);

  // Monitor courier for the most important active order
  useEffect(() => {
    const deliveringOrder = activeOrders.find((o) => o.status === "delivering");
    if (!deliveringOrder?.courierId) {
      setTrackingCourier(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "couriers", deliveringOrder.courierId),
      (snapshot) => {
        if (snapshot.exists()) {
          setTrackingCourier({
            ...snapshot.data(),
            id: snapshot.id,
          } as Courier);
        }
      },
    );

    return () => unsubscribe();
  }, [activeOrders]);

  useEffect(() => {
    // Function to load store data
    const loadStoreData = async (tenant: Tenant) => {
      setIsStoreLoading(true);
      // Clear current state immediately to avoid showing wrong products
      setStoreProducts([]);

      if (productListenerRef.current) {
        productListenerRef.current();
        productListenerRef.current = null;
      }

      try {
        const settingsRef = doc(db, "settings", tenant.id);
        const settingsSnap = await getDoc(settingsRef);

        const productsQ = query(
          collection(db, "products"),
          where("tenantId", "==", tenant.id),
          limit(300),
        );

        // Save the listener ref
        productListenerRef.current = onSnapshot(
          productsQ,
          (snapshot) => {
            const loadedProducts = snapshot.docs.map(
              (doc) => ({ ...doc.data(), id: doc.id }) as Product,
            );
            console.log(
              `Loaded ${loadedProducts.length} products for tenant ${tenant.id}`,
            );
            setStoreProducts(loadedProducts);
          },
          (error) => {
            console.error("Erro ao carregar produtos da loja:", error);
          },
        );

        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setStoreSettings({
            restaurantName: tenant.name,
            primaryColor: "#008080",
            welcomeMessage: "Bem-vindo ao nosso cardápio!",
            bannerUrl: "",
            logoUrl: tenant.logoUrl || "",
            allowOrdering: true,
            showStock: false,
            ...(data.digitalMenu || {}),
          });
          if (data.admin) setStoreAdminSettings(data.admin);
        } else {
          setStoreSettings({
            restaurantName: tenant.name,
            primaryColor: "#008080",
            welcomeMessage: "Bem-vindo ao nosso cardápio!",
            bannerUrl: "",
            logoUrl: tenant.logoUrl || "",
            allowOrdering: true,
            showStock: false,
          });
        }
        setSelectedTenant(tenant);
      } catch (err) {
        console.error("Error loading store data:", err);
      } finally {
        setIsStoreLoading(false);
      }
    };

    if (routeTenantId) {
      const tenant = tenants.find((t) => t.id === routeTenantId);
      if (tenant) {
        if (!selectedTenant || selectedTenant.id !== routeTenantId) {
          loadStoreData(tenant);
        }
      } else if (!initialLoading) {
        // If not in primary list, fetch directly
        const fetchTenantDirectly = async () => {
          setIsStoreLoading(true);
          try {
            const tenantRef = doc(db, "tenants", routeTenantId);
            const tenantSnap = await getDoc(tenantRef);
            if (tenantSnap.exists()) {
              const tenantData = {
                ...tenantSnap.data(),
                id: tenantSnap.id,
              } as Tenant;
              loadStoreData(tenantData);
            } else {
              console.warn("Tenant not found:", routeTenantId);
              setIsStoreLoading(false);
            }
          } catch (err) {
            console.error("Error fetching tenant directly:", err);
            setIsStoreLoading(false);
          }
        };
        fetchTenantDirectly();
      }
    } else {
      // Clear data if no routeTenantId
      setSelectedTenant(null);
      setStoreSettings(null);
      setStoreProducts([]);
      if (productListenerRef.current) {
        productListenerRef.current();
        productListenerRef.current = null;
      }
    }
  }, [routeTenantId, tenants, initialLoading, selectedTenant?.id]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (productListenerRef.current) productListenerRef.current();
    };
  }, []);

  const handleStoreClick = async (tenant: Tenant) => {
    navigate(`/marketplace/${tenant.id}`);
  };

  const filteredTenants = useMemo(() => {
    const list = tenants.filter((t) => {
      const matchesCategory =
        activeCategory === "todos" ||
        t.category?.toLowerCase() === activeCategory;
      const matchesSearch = t.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      // Filtro de Promoção
      let matchesPromotion = true;
      if (activePromotionId) {
        const promotion = marketplaceSettings?.promotions?.find(
          (p) => p.id === activePromotionId,
        );
        if (promotion) {
          matchesPromotion =
            promotion.participatingTenantIds?.includes(t.id) || false;
        }
      }

      return matchesCategory && matchesSearch && matchesPromotion;
    });

    // Ordenar lojistas: abertos vêm primeiro, fechados por último
    return [...list].sort((a, b) => {
      const statusA = getTenantOpenStatus(a.id);
      const statusB = getTenantOpenStatus(b.id);
      if (statusA.isOpen && !statusB.isOpen) return -1;
      if (!statusA.isOpen && statusB.isOpen) return 1;
      return 0;
    });
  }, [tenants, activeCategory, searchTerm, activePromotionId, marketplaceSettings, tenantsSettings]);

  const isMaintenanceActive = useMemo(() => {
    if (!marketplaceSettings?.maintenance?.active) return false;

    const now = new Date();
    const startAtRaw = marketplaceSettings.maintenance.startAt as any;
    const endAtRaw = marketplaceSettings.maintenance.endAt as any;

    const start = startAtRaw?.toDate
      ? startAtRaw.toDate()
      : startAtRaw
        ? new Date(startAtRaw)
        : null;
    const end = endAtRaw?.toDate
      ? endAtRaw.toDate()
      : endAtRaw
        ? new Date(endAtRaw)
        : null;

    if (!start && !end) return true; // Ativo sem agendamento
    if (start && now < start) return false; // Ainda não começou
    if (end && now > end) return false; // Já terminou

    return true; // Dentro do período
  }, [marketplaceSettings]);

  if (isStoreLoading || (!initialLoading && isMaintenanceActive)) {
    return (
      <div className="min-h-screen bg-brand-white flex flex-col items-center justify-center gap-6 p-10 text-center">
        {isMaintenanceActive ? (
          <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
            <div className="w-24 h-24 bg-amber-100 text-amber-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-amber-100/50 relative">
              <div className="absolute inset-0 bg-amber-500/10 rounded-[2rem] animate-ping" />
              <Store size={48} className="relative z-10" />
            </div>
            <h2 className="text-3xl font-black tracking-tighter text-slate-800 mb-2">
              Marketplace em Pausa
            </h2>
            <p className="text-sm font-bold text-amber-600/80 uppercase tracking-widest mb-4">
              Manutenção Programada
            </p>
            <div className="max-w-xs p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
              <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                "
                {marketplaceSettings?.maintenance?.message ||
                  "Estamos realizando melhorias programadas. Voltaremos em breve com novidades deliciosas!"}
                "
              </p>
            </div>
            <div className="mt-8 flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-900 transition-all"
              >
                <Clock size={14} /> Tentar Novamente
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">
              Preparando sua experiência...
            </p>
          </>
        )}
      </div>
    );
  }

  if (selectedTenant && storeSettings) {
    return (
      <div className="h-full overflow-y-auto bg-white w-full">
        <DigitalMenu
          settings={{
            ...storeSettings,
            primaryColor: storeSettings.primaryColor || "#0d9488",
          }}
          products={storeProducts}
          autoStart={true}
          whatsappNumber={
            storeAdminSettings?.socialMedia?.whatsapp ||
            storeAdminSettings?.phone
          }
          isDeliveryEnabled={storeAdminSettings?.isDeliveryEnabled ?? true}
          isPickupEnabled={storeAdminSettings?.isPickupEnabled ?? true}
          deliveryFee={storeAdminSettings?.deliveryFee}
          minOrderValue={storeAdminSettings?.minOrderValue}
          estimatedDeliveryTime={storeAdminSettings?.estimatedDeliveryTime}
          estimatedPickupTime={storeAdminSettings?.estimatedPickupTime}
          onBack={() => {
            setSelectedTenant(null);
            navigate("/marketplace");
          }}
          isMarketplace={true}
          initialAddress={currentAddress}
          isFavorite={favorites.includes(selectedTenant.id)}
          onToggleFavorite={(e) => toggleFavorite(e, selectedTenant.id)}
          restaurantAddress={storeAdminSettings?.address || selectedTenant?.address}
          restaurantCity={getRestaurantCity(selectedTenant, storeAdminSettings)}
          onPlaceOrder={async (order) => {
            // Se o perfil local não estiver preenchido, preenchemos com os dados do pedido atual
            if (!profile?.name || !profile?.phone) {
              onUpdateProfile({
                name: order.customerName || "Cliente Marketplace",
                phone: order.customerPhone || "",
              });
            }

            try {
              const sanitize = (obj: any) => {
                const cleaned = { ...obj };
                Object.keys(cleaned).forEach((key) => {
                  if (cleaned[key] === undefined) {
                    delete cleaned[key];
                  } else if (
                    cleaned[key] &&
                    typeof cleaned[key] === "object" &&
                    !(cleaned[key] instanceof Date)
                  ) {
                    if (Array.isArray(cleaned[key])) {
                      cleaned[key] = cleaned[key].map((item: any) =>
                        typeof item === "object" ? sanitize(item) : item,
                      );
                    } else {
                      cleaned[key] = sanitize(cleaned[key]);
                    }
                  }
                });
                return cleaned;
              };

              const isAutoAccept = storeAdminSettings?.autoAcceptOrders === true;
              const initialStatus = isAutoAccept ? "preparing" : "pending";
              const mFeePercent = marketplaceSettings?.serviceFee || 0;
              const marketplaceFeeAmount = (order.total * mFeePercent) / 100;

              const orderWithTenant = sanitize({
                ...order,
                status: initialStatus,
                tenantId: selectedTenant.id,
                source: "marketplace",
                marketplaceFee: marketplaceFeeAmount,
                createdAt: new Date(),
                acceptedAt: isAutoAccept ? new Date() : undefined,
              });

              // Salvar o pedido no Firestore
              const orderRef = await addDoc(
                collection(db, "orders"),
                orderWithTenant,
              );
              console.log("Pedido salvo com sucesso! ID:", orderRef.id);

              // Persistir cliente na coleção 'customers' do tenant para CRM
              const customerPhone = order.customerPhone || profile?.phone;
              if (customerPhone) {
                const customerData = {
                  id: customerPhone,
                  name:
                    order.customerName ||
                    profile?.name ||
                    "Cliente Marketplace",
                  phone: customerPhone,
                  email: currentUser?.email || "",
                  tenantId: selectedTenant.id,
                  source: "marketplace",
                  createdAt: new Date(),
                  crmStatus: "active",
                };
                await setDoc(
                  doc(db, "customers", customerPhone),
                  customerData,
                  { merge: true },
                );
              }

              // Registrar fatura de serviço do marketplace
              await addDoc(collection(db, "marketplaceInvoices"), {
                tenantId: selectedTenant.id,
                orderId: orderRef.id,
                amount: marketplaceFeeAmount,
                status: "pending",
                createdAt: new Date(),
              });
            } catch (err) {
              console.error("Erro ao salvar pedido do marketplace:", err);
              alert("Erro ao enviar pedido. Por favor, tente novamente.");
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-brand-white flex flex-col font-sans pb-36 custom-scrollbar">
      {/* Header with Address Selection - Fixed/Sticky with frosted glassmorphism */}
      <header
        className="px-6 py-5 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-[60] border-b border-slate-100/65 cursor-pointer shadow-sm hover:bg-slate-50/50 transition-colors"
        onClick={() => setShowAddressModal(true)}
      >
        <div className="flex items-center gap-3.5">
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="bg-brand-primary text-white p-3 rounded-2xl shadow-lg shadow-brand-primary/20 flex-shrink-0"
          >
            <MapPin size={20} strokeWidth={2.5} className="animate-pulse" />
          </motion.div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-brand-primary uppercase tracking-[0.2em]">
                Entregar em
              </span>
              <ChevronDown size={11} className="text-brand-primary" strokeWidth={3} />
            </div>
            <h1 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2 max-w-[210px] truncate">
              {currentAddress}
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </h1>
          </div>
        </div>
        <div
          className="flex items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 flex items-center justify-center text-slate-700 relative bg-slate-50/80 backdrop-blur-md rounded-2xl hover:bg-slate-100/90 transition-all border border-slate-100 shadow-sm"
          >
            <Bell size={21} />
            <div className="absolute top-3.5 right-3.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-md animate-pulse" />
          </motion.button>
        </div>
      </header>

      <main className="flex-1 w-full">
        {navView === "home" ? (
          <>
            {/* Search Bar - Breathtakingly Modern & Smooth */}
            <div className="px-6 my-7">
              <div className="relative group">
                <div className="absolute inset-0 bg-brand-primary/10 blur-xl rounded-[2rem] opacity-40 group-focus-within:opacity-100 group-focus-within:scale-102 transition-all duration-300 pointer-events-none" />
                <Search
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-primary transition-transform duration-300 group-focus-within:scale-110"
                  size={20}
                  strokeWidth={3}
                />
                <input
                  type="text"
                  placeholder="Buscar pratos, hambúrgueres, doces ou lojas..."
                  className="w-full bg-slate-50 border border-slate-150 rounded-[2rem] py-4.5 pl-16 pr-8 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-brand-primary/8 focus:border-brand-primary focus:bg-white transition-all outline-none placeholder:text-slate-400 shadow-inner"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Hero Section / Banner / Promotions Swiper */}
            <div className="px-6 mb-12 space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles size={12} className="text-brand-primary" /> Ofertas & Eventos
                </h3>
                {activePromotionId && (
                  <button
                    onClick={() => setActivePromotionId(null)}
                    className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1 hover:underline"
                  >
                    Ver Tudo <X size={10} />
                  </button>
                )}
              </div>

              <div className="flex gap-5 overflow-x-auto no-scrollbar pb-3 snap-x snap-mandatory">
                {/* Main Banner */}
                <div
                  className={`relative h-48 min-w-[320px] sm:min-w-[420px] rounded-[2.5rem] overflow-hidden group shadow-xl hover:shadow-2xl flex-shrink-0 transition-all cursor-pointer snap-start ${!activePromotionId ? "ring-4 ring-brand-primary scale-[0.98]" : "opacity-90 hover:opacity-100"}`}
                  onClick={() => setActivePromotionId(null)}
                >
                  <img
                    src={
                      marketplaceSettings?.bannerUrl ||
                      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop"
                    }
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s]"
                    alt="Mercado"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/50 to-transparent" />
                  <div className="absolute inset-0 p-8 flex flex-col justify-center text-left">
                    <span className="bg-gradient-to-r from-brand-primary to-orange-500 text-white text-[9px] font-black uppercase tracking-[0.25em] px-3.5 py-1.5 rounded-full w-fit mb-3.5 shadow-md">
                      Destaque Geral
                    </span>
                    <h2 className="text-2xl font-black text-white tracking-tighter leading-snug mb-1.5">
                      Explorar Cardápio Geral
                    </h2>
                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">
                      Todos os estabelecimentos integrados
                    </p>
                  </div>
                </div>

                {/* Dynamic Promotions */}
                {marketplaceSettings?.promotions
                  ?.filter((p) => p.active)
                  .map((promo) => (
                    <div
                      key={promo.id}
                      className={`relative h-48 min-w-[320px] sm:min-w-[420px] rounded-[2.5rem] overflow-hidden group shadow-xl hover:shadow-2xl flex-shrink-0 cursor-pointer snap-start transition-all ${activePromotionId === promo.id ? "ring-4 ring-brand-primary" : "opacity-90 hover:opacity-100"}`}
                      onClick={() => setActivePromotionId(promo.id)}
                    >
                      <img
                        src={
                          promo.bannerUrl ||
                          marketplaceSettings?.bannerUrl ||
                          "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1000&auto=format&fit=crop"
                        }
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s]"
                        alt={promo.title}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/50 to-transparent" />
                      <div className="absolute inset-0 p-8 flex flex-col justify-center text-left">
                        <div className="flex items-center gap-2 mb-3.5">
                          <span className="bg-gradient-to-r from-amber-500 to-brand-primary text-white text-[9px] font-black uppercase tracking-[0.25em] px-3.5 py-1.5 rounded-full w-fit shadow-md">
                            ⚡ Imperdível
                          </span>
                          <span className="bg-white/10 backdrop-blur-md text-white text-[9.5px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl border border-white/20">
                            {promo.participatingTenantIds?.length || 0} Lojas
                          </span>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tighter leading-snug mb-1.5">
                          {promo.title}
                        </h2>
                        <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">
                          Toque para filtrar restaurantes parceiros
                        </p>
                      </div>
                      {activePromotionId === promo.id && (
                        <div className="absolute top-5 right-5 bg-brand-primary text-white p-2 rounded-full shadow-lg">
                          <CheckCircle2 size={18} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Categories Section - Highly Visual Squiclets */}
            <div className="px-6 mb-12 overflow-x-auto no-scrollbar">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-7 min-w-full pb-3"
              >
                {dynamicCategories.map((cat, index) => {
                  const isSelected = activeCategory === cat.id;
                  return (
                    <motion.button
                      key={cat.id}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex flex-col items-center gap-3.5 group shrink-0 relative focus:outline-none cursor-pointer"
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      <div
                        className={`w-20 h-20 rounded-[2.25rem] transition-all duration-300 flex items-center justify-center relative backdrop-blur-sm active:scale-95 ${
                          isSelected
                            ? "bg-brand-primary text-white border-2 border-brand-primary shadow-xl shadow-brand-primary/20 scale-105"
                            : `${cat.bg} border border-slate-100 hover:border-brand-primary/40 hover:scale-105 hover:bg-white shadow-[0_8px_30px_rgb(0,0,0,0.012)]`
                        }`}
                      >
                        {cat.img ? (
                          <img
                            src={cat.img}
                            alt={cat.label}
                            className={`w-12 h-12 object-contain transition-all duration-300 ${
                              isSelected
                                ? "scale-115 rotate-[6deg] brightness-110 filter drop-shadow-[0_4px_10px_rgba(255,255,255,0.15)]"
                                : "opacity-90 group-hover:opacity-100 group-hover:scale-110"
                            }`}
                          />
                        ) : (
                          <cat.icon
                            size={28}
                            className={`transition-all duration-300 ${isSelected ? `text-white scale-110` : `${cat.color} opacity-90 group-hover:scale-110`}`}
                            strokeWidth={2.5}
                          />
                        )}
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`text-[10px] font-black uppercase tracking-[0.16em] transition-colors duration-200 ${isSelected ? "text-slate-800" : "text-slate-500 group-hover:text-slate-700 font-bold"}`}
                        >
                          {cat.label}
                        </span>
                        {isSelected && (
                          <motion.div
                            layoutId="activeCategoryDot"
                            className="w-1.5 h-1.5 bg-brand-primary rounded-full shadow-lg"
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 30,
                            }}
                          />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            </div>

            {/* Real-time Tracking Widget */}
            <AnimatePresence>
              {activeOrders.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="px-6 mb-12"
                >
                  <div className="bg-slate-900 rounded-[2.5rem] p-6.5 shadow-2xl shadow-slate-950/20 overflow-hidden relative text-white text-left">
                    <div className="absolute top-0 right-0 w-44 h-44 bg-brand-primary/10 rounded-full blur-[40px] pointer-events-none" />
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div>
                        <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                          <span className="w-2 h-2 bg-brand-primary rounded-full animate-ping" />
                          Ao vivo pelo App
                        </p>
                        <h3 className="text-lg font-black tracking-tight leading-none">
                          {activeOrders[0].items[0]?.name || "Pedido"} em
                          andamento
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-4.5 relative z-10">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/5">
                        <Clock className="text-brand-primary" size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-0.5">
                          Status do Preparo
                        </p>
                        <p className="text-xs font-black uppercase tracking-wider text-amber-400">
                          {activeOrders[0].status === "pending"
                            ? "Aguardando Confirmação"
                            : activeOrders[0].status === "preparing"
                              ? "Na Cozinha / Preparando"
                              : "Saiu para Entrega!"}
                        </p>
                      </div>
                      <button 
                        onClick={() => setNavView("orders")}
                        className="bg-brand-primary text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-brand-primary/95 transition-all"
                      >
                        Acompanhar
                      </button>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Featured Section - Stunning Bento Grid */}
            <section ref={storeListRef} className="px-6 mb-12">
              <div className="flex items-center justify-between mb-7">
                <h2 className="text-2xl font-black tracking-tight text-slate-800 leading-none">
                  Estabelecimentos do Bairro
                </h2>
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
                  {filteredTenants.length} Lojas
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                {filteredTenants.map((tenant, index) => {
                  const status = getTenantOpenStatus(tenant.id);
                  const isOpen = status.isOpen;
                  return (
                    <motion.div
                      key={tenant.id}
                      initial={{ opacity: 0, y: 25 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleStoreClick(tenant)}
                      className={`bg-white rounded-[2.25rem] border border-slate-105 p-5 flex items-center gap-4.5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_20px_50px_rgba(255,79,24,0.08)] hover:border-brand-primary/10 transition-all duration-300 cursor-pointer group hover:-translate-y-1 text-left relative overflow-hidden ${
                        !isOpen ? "opacity-90" : ""
                      }`}
                    >
                      {/* Background accent card glow */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-[35px] opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" />
                      
                      {/* Store Logo Frame */}
                      <div className={`w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-3xl overflow-hidden shrink-0 border p-1 bg-white relative transition-all duration-300 group-hover:scale-102 aspect-square ${
                        isOpen ? "border-slate-100 group-hover:border-slate-200" : "border-slate-200/50"
                      }`}>
                        <img
                          src={
                            tenant.logoUrl ||
                            `https://picsum.photos/seed/${tenant.id}/200/200`
                          }
                          referrerPolicy="no-referrer"
                          className={`w-full h-full object-cover rounded-[1.25rem] group-hover:scale-105 transition-transform duration-500 ${
                            !isOpen ? "grayscale opacity-75 contrast-75 brightness-95" : ""
                          }`}
                        />
                        <span className={`absolute bottom-1 right-1 px-1.5 py-0.5 text-[8px] font-black tracking-wide uppercase rounded-md ${
                          isOpen ? "bg-emerald-500 text-white" : "bg-slate-400 text-white"
                        }`}>
                          {isOpen ? "Aberto" : "Fechado"}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className={`font-black tracking-tight text-lg truncate transition-colors duration-200 ${
                            isOpen ? "text-slate-800 group-hover:text-brand-primary" : "text-slate-400"
                          }`}>
                            {tenant.name}
                          </h4>
                          {!isOpen && (
                            <span className="text-[8px] font-black tracking-wider uppercase px-2 py-0.5 bg-rose-50 text-rose-650 rounded-full border border-rose-100 select-none">
                              Fechado agora
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                          <p className="text-[10px] font-extrabold text-brand-primary uppercase tracking-widest leading-none">
                            {tenant.category}
                          </p>
                          <span className={`text-[9px] font-bold ${isOpen ? "text-emerald-600 bg-emerald-50/50 border border-emerald-100/30" : "text-slate-450 bg-slate-50 border border-slate-100/50"} px-1.5 py-0.5 rounded-md`}>
                            {status.showTime}
                          </span>
                          {(() => {
                            const tenantCity = getRestaurantCity(tenant, null);
                            const isSameCity = customerCity ? (
                              normalizeString(tenantCity) === normalizeString(customerCity) ||
                              normalizeString(customerCity).includes(normalizeString(tenantCity)) ||
                              normalizeString(tenantCity).includes(normalizeString(customerCity))
                            ) : true;
                            return !isSameCity ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100 rounded-md animate-pulse">
                                <MapPin size={9} strokeWidth={2.5} />
                                {tenantCity}
                              </span>
                            ) : null;
                          })()}
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          {/* Rating Unit */}
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-xl border border-amber-100">
                            <Star size={11} fill="currentColor" />
                            <span className="text-[10px] font-black tracking-tight font-sans">4.9</span>
                          </div>
                          {/* Delivery Time Option */}
                          <div className="flex items-center gap-1 bg-slate-50 text-slate-500 px-2.5 py-1 rounded-xl border border-slate-100">
                            <Clock size={11} strokeWidth={2.5} />
                            <span className="text-[10px] font-bold font-sans">25-35 min</span>
                          </div>
                          {/* Delivery Cost */}
                          <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-2.5 py-1 rounded-xl font-sans">
                            Frete Grátis
                          </div>
                        </div>
                      </div>

                      {/* Actions and Utilities inside card */}
                      <div
                        className="flex items-center gap-2 relative z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => toggleFavorite(e, tenant.id)}
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 border ${
                            favorites.includes(tenant.id)
                              ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/25"
                              : "bg-slate-50/60 hover:bg-rose-50 hover:border-rose-100 border-slate-100 text-slate-400 hover:text-rose-500"
                          }`}
                        >
                          <Heart
                            size={16}
                            fill={favorites.includes(tenant.id) ? "currentColor" : "none"}
                          />
                        </button>
                        <button
                          onClick={() => handleStoreClick(tenant)}
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-sm border ${
                            isOpen 
                              ? "bg-slate-50/80 hover:bg-brand-primary hover:text-white hover:border-brand-primary border-slate-100/80 text-slate-400"
                              : "bg-slate-50/50 hover:bg-slate-200 border-slate-100/50 text-slate-350"
                          }`}
                        >
                          <ChevronRight size={18} strokeWidth={3} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          </>
        ) : navView === "favorites" ? (
          <section className="px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-brand-black tracking-tighter">
                Meus Favoritos
              </h2>
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                <Heart size={24} fill="currentColor" />
              </div>
            </div>

            {tenants.filter((t) => favorites.includes(t.id)).length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {[...tenants.filter((t) => favorites.includes(t.id))]
                  .sort((a, b) => {
                    const statusA = getTenantOpenStatus(a.id);
                    const statusB = getTenantOpenStatus(b.id);
                    if (statusA.isOpen && !statusB.isOpen) return -1;
                    if (!statusA.isOpen && statusB.isOpen) return 1;
                    return 0;
                  })
                  .map((tenant) => {
                    const status = getTenantOpenStatus(tenant.id);
                    const isOpen = status.isOpen;
                    return (
                      <motion.div
                        key={tenant.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleStoreClick(tenant)}
                        className={`bg-white rounded-[2rem] p-4 flex items-center gap-4 border border-slate-100 shadow-sm group cursor-pointer active:scale-95 transition-all ${
                          !isOpen ? "opacity-90" : ""
                        }`}
                      >
                        <div className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-slate-50 shrink-0 aspect-square border relative transition-all ${
                          isOpen ? "border-slate-100" : "border-slate-200/50"
                        }`}>
                          <img
                            src={
                              tenant.logoUrl ||
                              `https://picsum.photos/seed/${tenant.id}/200/200`
                            }
                            referrerPolicy="no-referrer"
                            className={`w-full h-full object-cover transition-all duration-350 ${
                              !isOpen ? "grayscale opacity-75 contrast-75 brightness-95" : ""
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className={`font-black tracking-tight text-lg truncate group-hover:text-brand-primary transition-colors ${
                              isOpen ? "text-brand-black" : "text-slate-400 font-bold"
                            }`}>
                              {tenant.name}
                            </h4>
                            {!isOpen && (
                              <span className="text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 bg-rose-50 text-rose-650 rounded-full border border-rose-100 select-none">
                                Fechado agora
                              </span>
                            )}
                          </div>
                          
                          <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{tenant.category}</span>
                            <span className={`text-[9px] font-bold ${
                              isOpen ? "text-emerald-600 bg-emerald-50/50 px-1.5 py-0.2 rounded" : "text-slate-450 bg-slate-50 px-1.5 py-0.2 rounded"
                            }`}>
                              • {status.showTime}
                            </span>
                          </p>
                          
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1.5 text-amber-500 font-sans">
                              <Star size={12} fill="currentColor" />
                              <span className="text-[10px] font-black">4.9</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400 font-sans">
                              <Clock size={12} />
                              <span className="text-[10px] font-black uppercase">
                                25-35 min
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => toggleFavorite(e, tenant.id)}
                          className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-sm shrink-0 active:scale-95 animate-none"
                        >
                          <Heart size={18} fill="currentColor" />
                        </button>
                      </motion.div>
                    );
                  })}
              </div>
            ) : (
              <div className="py-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                  <Heart size={40} className="text-slate-200" />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  Nenhum favorito ainda
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-2">
                  Toque no ❤️ dos restaurantes que você mais gosta!
                </p>
                <button
                  onClick={() => setNavView("home")}
                  className="mt-8 px-8 py-4 bg-brand-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl"
                >
                  EXPLORAR LOJAS
                </button>
              </div>
            )}
          </section>
        ) : navView === "orders" ? (
          <section className="px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-brand-black tracking-tighter">
                Meus Pedidos
              </h2>
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <ShoppingBag size={24} />
              </div>
            </div>

            {orderHistory.length > 0 ? (
              <div className="space-y-6">
                {orderHistory.map((order) => {
                  const tenant = tenants.find((t) => t.id === order.tenantId);
                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-[2rem] p-6 border border-slate-50 shadow-sm"
                    >
                      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-50">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl overflow-hidden bg-slate-50 shrink-0 aspect-square border border-slate-100">
                          <img
                            src={
                              tenant?.logoUrl ||
                              `https://picsum.photos/seed/${order.tenantId}/100/100`
                            }
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-black text-brand-black tracking-tight text-base truncate">
                              {tenant?.name || "Restaurante"}
                            </h4>
                            <span
                              className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                                order.status === "delivered"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : order.status === "cancelled"
                                    ? "bg-rose-50 text-rose-500"
                                    : "bg-indigo-50 text-indigo-600"
                              }`}
                            >
                              {order.status === "delivered"
                                ? "Entregue"
                                : order.status === "cancelled"
                                  ? "Cancelado"
                                  : order.status === "pending"
                                    ? "Pendente"
                                    : order.status === "preparing"
                                      ? "Em Preparo"
                                      : order.status === "ready"
                                        ? "Saiu pra Entrega"
                                        : "Concluído"}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                            {order.items.length}{" "}
                            {order.items.length === 1 ? "item" : "itens"} • R${" "}
                            {order.total.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => tenant && handleStoreClick(tenant)}
                          className="flex-1 py-3 bg-brand-primary/10 text-brand-primary rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all"
                        >
                          Pedir Novamente
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrderForHelp(order);
                            setShowHelpModal(true);
                          }}
                          className="px-5 py-3 bg-slate-50 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                        >
                          Ajuda
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag size={40} className="text-slate-200" />
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  Sem pedidos ainda
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-2">
                  Sua fome merece um banquete!
                </p>
                <button
                  onClick={() => setNavView("home")}
                  className="mt-8 px-8 py-4 bg-brand-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl"
                >
                  Começar a Comprar
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Profile View Content (similar to modal but embedded) */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-brand-black tracking-tighter">
                Meu Perfil
              </h2>
              <button
                onClick={() => {
                  // Logout logic
                }}
                className="text-rose-500"
              >
                Sair
              </button>
            </div>
            {/* ... rest of profile form if needed, or just reusing the modal logic ... */}
            <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100 text-center">
              <div className="w-24 h-24 bg-brand-primary rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-primary/20">
                <UserIcon size={44} className="text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-brand-black tracking-tight">
                {profile?.name || "Visitante"}
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                {profile?.phone || "Sem telefone"}
              </p>

              <div className="mt-10 grid grid-cols-1 gap-3">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="w-full py-5 bg-white border border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 shadow-sm"
                >
                  Editar Dados Cadastrais
                </button>
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="w-full py-5 bg-white border border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 shadow-sm"
                >
                  Gerenciar Endereços
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-brand-white/90 backdrop-blur-xl border-t border-slate-100 p-4 pb-8 z-50 flex justify-around items-center">
        <button
          className={`flex flex-col items-center gap-1.5 transition-all relative px-4 py-2 rounded-2xl ${navView === "home" ? "text-brand-primary bg-brand-primary/5" : "text-slate-300"}`}
          onClick={() => {
            setNavView("home");
            setActiveCategory("todos");
          }}
        >
          <Home size={22} strokeWidth={navView === "home" ? 3.5 : 2.5} />
          <span className="text-[9px] font-black uppercase tracking-tighter">
            Início
          </span>
          {navView === "home" && (
            <motion.div
              layoutId="nav-pill"
              className="absolute -top-4 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-brand-primary rounded-full shadow-[0_0_8px_rgba(20,184,166,0.5)]"
            />
          )}
        </button>
        <button
          className={`flex flex-col items-center gap-1.5 transition-all relative px-4 py-2 rounded-2xl ${navView === "orders" ? "text-brand-primary bg-brand-primary/5" : "text-slate-300"}`}
          onClick={() => setNavView("orders")}
        >
          <ShoppingBag
            size={22}
            strokeWidth={navView === "orders" ? 3.5 : 2.5}
          />
          <span className="text-[9px] font-black uppercase tracking-tighter">
            Pedidos
          </span>
          {navView === "orders" && (
            <motion.div
              layoutId="nav-pill"
              className="absolute -top-4 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-brand-primary rounded-full shadow-[0_0_8px_rgba(20,184,166,0.5)]"
            />
          )}
        </button>
        <button
          className={`flex flex-col items-center gap-1.5 transition-all relative px-4 py-2 rounded-2xl ${navView === "favorites" ? "text-brand-primary bg-brand-primary/5" : "text-slate-300"}`}
          onClick={() => setNavView("favorites")}
        >
          <Heart
            size={22}
            strokeWidth={navView === "favorites" ? 3.5 : 2.5}
            fill={navView === "favorites" ? "currentColor" : "none"}
          />
          <span className="text-[9px] font-black uppercase tracking-tighter">
            Favoritos
          </span>
          {navView === "favorites" && (
            <motion.div
              layoutId="nav-pill"
              className="absolute -top-4 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-brand-primary rounded-full shadow-[0_0_8px_rgba(20,184,166,0.5)]"
            />
          )}
        </button>
        <button
          className={`flex flex-col items-center gap-1.5 transition-all relative px-4 py-2 rounded-2xl ${navView === "profile" ? "text-brand-primary bg-brand-primary/5" : "text-slate-300"}`}
          onClick={() => setNavView("profile")}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${navView === "profile" ? "bg-brand-primary/20" : "bg-slate-100"}`}
          >
            <UserIcon size={18} strokeWidth={3} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">
            Perfil
          </span>
          {navView === "profile" && (
            <motion.div
              layoutId="nav-pill"
              className="absolute -top-4 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-brand-primary rounded-full shadow-[0_0_8px_rgba(20,184,166,0.5)]"
            />
          )}
        </button>
      </nav>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-brand-black/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-brand-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-20 duration-500">
            <div className="p-8 pb-12 border-b bg-brand-black text-white relative">
              <div className="absolute top-0 left-0 w-full h-full bg-brand-primary/5 -translate-y-1/2 blur-[100px] pointer-events-none" />
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors bg-white/5 p-2 rounded-full"
              >
                <X size={20} />
              </button>

              <div className="relative z-10">
                <div className="w-16 h-16 bg-brand-primary rounded-[1.5rem] flex items-center justify-center mb-5 shadow-2xl shadow-brand-primary/20">
                  <UserIcon
                    size={32}
                    className="text-white"
                    strokeWidth={2.5}
                  />
                </div>
                <h2 className="text-2xl font-black tracking-tighter">
                  Seu Perfil Flow
                </h2>
                <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mt-1.5">
                  Sincronize seus dados e favoritos
                </p>
              </div>
            </div>

            <div className="p-8 pt-10 space-y-8">
              {!currentUser ? (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-400 text-center mb-6 leading-relaxed">
                    Conecte sua conta para uma experiência personalizada e
                    checkout mais rápido.
                  </p>
                  <button
                    onClick={async () => {
                      const { signInWithPopup, GoogleAuthProvider } =
                        await import("firebase/auth");
                      const { auth } = await import("../firebase");
                      const provider = new GoogleAuthProvider();
                      try {
                        const result = await signInWithPopup(auth, provider);
                        setTempName(result.user.displayName || "");
                      } catch (err) {
                        console.error("Login error:", err);
                      }
                    }}
                    className="w-full py-4.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
                  >
                    <img
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      className="w-5 h-5"
                      alt="Google"
                    />
                    Login com Google
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      className="w-14 h-14 rounded-2xl shadow-lg border-2 border-white"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-brand-primary flex items-center justify-center text-white font-black text-lg">
                      {(
                        currentUser.displayName ||
                        currentUser.email ||
                        "U"
                      ).substring(0, 1)}
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                      Conectado
                    </p>
                    <p className="font-black text-brand-black text-base">
                      {currentUser.displayName || currentUser.email}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Nome de Exibição
                  </label>
                  <input
                    type="text"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all placeholder:text-slate-300"
                    placeholder="Seu nome"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    WhatsApp para Contato
                  </label>
                  <input
                    type="tel"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all placeholder:text-slate-300"
                    placeholder="(00) 00000-0000"
                    value={tempPhone}
                    onChange={(e) => setTempPhone(maskPhone(e.target.value))}
                  />
                </div>

                <button
                  onClick={() => {
                    if (!tempName || !tempPhone) {
                      alert("Atenção: Nome e Telefone são necessários.");
                      return;
                    }
                    onUpdateProfile({ name: tempName, phone: tempPhone });
                    setShowProfileModal(false);
                  }}
                  className="w-full py-5 bg-brand-primary text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-brand-primary/20 hover:bg-teal-600 transition-all active:scale-[0.97]"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Address Selection Modal (Screen 4) */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-brand-black/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-brand-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-20 duration-500">
            <div className="p-8 pb-12 border-b bg-brand-primary text-white relative">
              <button
                onClick={() => setShowAddressModal(false)}
                className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors bg-white/5 p-2 rounded-full"
              >
                <X size={20} />
              </button>

              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center mb-5 border border-white/20">
                  <MapPin size={32} className="text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-2xl font-black tracking-tighter">
                  Onde entregar?
                </h2>
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1.5">
                  Selecione seu endereço atual
                </p>
              </div>
            </div>

            <div className="p-8 pt-10 space-y-6">
              <div className="space-y-4">
                {[
                  {
                    icon: Home,
                    label: "Casa",
                    address: "Av. Paulista, 1000 - São Paulo",
                  },
                  {
                    icon: Store,
                    label: "Trabalho",
                    address: "Av. Brigadeiro Faria Lima, 2000",
                  },
                ].map((loc, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentAddress(loc.address);
                      setShowAddressModal(false);
                    }}
                    className={`w-full p-4.5 rounded-[1.5rem] border flex items-center gap-4 transition-all active:scale-[0.98] ${currentAddress === loc.address ? "bg-brand-primary/5 border-brand-primary" : "bg-slate-50 border-slate-100 hover:bg-slate-100"}`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${currentAddress === loc.address ? "bg-brand-primary text-white" : "bg-white text-slate-400"}`}
                    >
                      <loc.icon size={22} />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-xs text-slate-800 uppercase tracking-tight">
                        {loc.label}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 truncate max-w-[200px]">
                        {loc.address}
                      </p>
                    </div>
                    <div className="ml-auto">
                      {currentAddress === loc.address && (
                        <CheckCircle2
                          size={20}
                          className="text-brand-primary"
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* GPS button inside modal */}
              <button
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="w-full p-4 rounded-[1.5rem] border border-dashed border-brand-primary/40 bg-brand-primary/[0.02] flex items-center justify-center gap-3 transition-all hover:bg-brand-primary/5 active:scale-[0.98] mt-2 group"
              >
                <Navigation 
                  size={18} 
                  className={`text-brand-primary ${isLocating ? "animate-spin" : "group-hover:rotate-12 transition-transform duration-300"}`} 
                />
                <span className="font-extrabold text-xs text-brand-primary uppercase tracking-wider">
                  {isLocating ? "Consultando GPS..." : "Detectar Meu Endereço por GPS"}
                </span>
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center text-[8px] font-black uppercase text-slate-300 tracking-[0.3em] bg-white px-4">
                  Ou digite um novo
                </div>
              </div>

              <div className="space-y-5">
                {/* Toggle Mode */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-3">
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
                        placeholder="Complemento (Apto...)"
                        value={cepComplement}
                        onChange={(e) => setCepComplement(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="relative group">
                    <input
                      type="text"
                      className="w-full px-5 py-4.5 bg-slate-100 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-brand-primary focus:bg-white transition-all pr-12"
                      placeholder="Buscar por endereço e número..."
                      value={tempAddress}
                      onChange={(e) => setTempAddress(e.target.value)}
                    />
                    <Search
                      size={18}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-primary transition-colors"
                    />
                  </div>
                </div>
              )}

                <button
                  onClick={() => {
                    if (tempAddress) {
                      setCurrentAddress(tempAddress);
                      setShowAddressModal(false);
                    }
                  }}
                  className="w-full py-5 bg-brand-primary text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-brand-primary/20"
                >
                  Confirmar Endereço
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHelpModal && selectedOrderForHelp && (
        <div className="fixed inset-0 bg-brand-black/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-brand-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-20 duration-500">
            <div className="p-8 pb-12 border-b bg-rose-500 text-white relative">
              <button
                onClick={() => setShowHelpModal(false)}
                className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors bg-white/5 p-2 rounded-full"
              >
                <X size={20} />
              </button>

              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center mb-5 border border-white/20">
                  <MessageSquare
                    size={32}
                    className="text-white"
                    strokeWidth={2.5}
                  />
                </div>
                <h2 className="text-2xl font-black tracking-tighter text-white">
                  Precisa de Ajuda?
                </h2>
                <p className="text-[10px] font-black text-rose-100 uppercase tracking-widest mt-1.5">
                  Ajuda com o pedido #
                  {selectedOrderForHelp.id.slice(-6).toUpperCase()}
                </p>
              </div>
            </div>

            <div className="p-8 pt-10 space-y-6">
              <div className="text-center space-y-2">
                <p className="font-extrabold text-slate-700 text-sm">
                  Deseja realmente solicitar ajuda para este pedido?
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Você será direcionado para o WhatsApp oficial do restaurante
                  para conversar sobre o seu pedido.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="flex-1 py-4.5 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-[0.98]"
                  disabled={helpModalLoading}
                >
                  Voltar
                </button>
                <button
                  onClick={async () => {
                    setHelpModalLoading(true);
                    try {
                      const tenant = tenants.find(
                        (t) => t.id === selectedOrderForHelp.tenantId,
                      );
                      let whatsappNumber = tenant?.phone || "";

                      const settingsRef = doc(
                        db,
                        "settings",
                        selectedOrderForHelp.tenantId,
                      );
                      const settingsSnap = await getDoc(settingsRef);
                      if (settingsSnap.exists()) {
                        const data = settingsSnap.data();
                        if (data.admin?.socialMedia?.whatsapp) {
                          whatsappNumber = data.admin.socialMedia.whatsapp;
                        } else if (data.admin?.phone) {
                          whatsappNumber = data.admin.phone;
                        }
                      }

                      if (whatsappNumber) {
                        const cleanPhone = whatsappNumber.replace(/\D/g, "");
                        const phoneFormatted = cleanPhone.startsWith("55")
                          ? cleanPhone
                          : `55${cleanPhone}`;

                        const formatValue = (val: number) =>
                          `R$ ${val.toFixed(2)}`;
                        const messageText = `Olá! Preciso de ajuda com o meu pedido #${selectedOrderForHelp.id.slice(-6).toUpperCase()} realizado via aplicativo (${selectedOrderForHelp.items.length} ${selectedOrderForHelp.items.length === 1 ? "item" : "itens"} no total de ${formatValue(selectedOrderForHelp.total)}).`;
                        const encodedMessage = encodeURIComponent(messageText);

                        window.open(
                          `https://wa.me/${phoneFormatted}?text=${encodedMessage}`,
                          "_blank",
                        );
                      } else {
                        alert(
                          "Esta loja não possui número de contato/WhatsApp cadastrado.",
                        );
                      }
                    } catch (err) {
                      console.error("Erro ao buscar whatsapp do lojista:", err);
                      alert(
                        "Não foi possível obter o contato da loja. Tente novamente.",
                      );
                    } finally {
                      setHelpModalLoading(false);
                      setShowHelpModal(false);
                    }
                  }}
                  className="flex-1 py-4.5 bg-brand-primary text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:opacity-95 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  disabled={helpModalLoading}
                >
                  {helpModalLoading ? "Carregando..." : "Falar no WhatsApp"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
