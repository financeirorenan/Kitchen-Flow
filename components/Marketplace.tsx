import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { PwaInstallPrompt } from "./PwaInstallPrompt";
import { useClickOutside } from "../hooks/useClickOutside";
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
  CreditCard,
  LogOut,
  Settings,
  HelpCircle,
  Copy,
  Beer,
  Flame,
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Zap,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "../firebase";
import { normalizePaymentMethod, getPaymentMethodLabel } from "../utils/paymentUtils";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
  getDocs,
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

const KitchenFlowBrandLogo = ({ className = "w-9 h-9" }: { className?: string }) => (
  <svg viewBox="0 0 512 512" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="kfBrandGradMp" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF5722" />
        <stop offset="100%" stopColor="#E02A00" />
      </linearGradient>
    </defs>
    {/* Smooth rounded background matching favicon */}
    <rect width="512" height="512" rx="112" fill="url(#kfBrandGradMp)" />
    
    {/* Crisp, solid white letter K */}
    <path d="M 132,112 H 200 V 212 L 328,112 H 396 L 254,242 L 396,400 H 328 L 200,268 V 400 H 132 Z" fill="#FFFFFF" />
  </svg>
);

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
    Beer,
    Flame,
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
      img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none'><path d='M18 32l4 22c0 2 2 4 4 4h12c2 0 4-2 4-4l4-22H18z' fill='%23F43F5E'/><path d='M22 32l3 22M28 32l1 22M34 32l-1 22M40 32l-3 22' stroke='%23BE123C' stroke-width='2'/><path d='M14 32c0-5 4-8 9-8c2-4 7-6 11-4c3-3 8-3 11 1c4 1 6 5 5 9c3 1 4 5 2 8H12c-2-3-1-5 2-6z' fill='%23FB7185'/><path d='M16 32c3 3 7 3 10 0c3 3 7 3 10 0c3 3 7 3 10 0' stroke='%23FFF1F2' stroke-width='3' stroke-linecap='round'/><circle cx='32' cy='14' r='6' fill='%23E11D48'/><path d='M32 8c2-4 6-5 9-3' stroke='%23059669' stroke-width='2.5' stroke-linecap='round'/><circle cx='24' cy='24' r='1.5' fill='%23FEF08A'/><circle cx='38' cy='22' r='1.5' fill='%23FEF08A'/><circle cx='30' cy='26' r='1.5' fill='%23FEF08A'/></svg>", // Cupcake / Doces
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
      img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none'><rect x='20' y='12' width='24' height='42' rx='5' fill='%23EF4444'/><ellipse cx='32' cy='12' rx='11' ry='3' fill='%23E2E8F0'/><ellipse cx='32' cy='12' rx='9' ry='2' fill='%2394A3B8'/><rect x='30' y='8' width='4' height='5' rx='1' fill='%2364748B'/><path d='M20 28c4 3 10 3 14-1s6-3 10 0v10c-4-3-10-3-14 1s-6 3-10 0V28z' fill='%23FFFFFF' opacity='0.85'/><circle cx='25' cy='22' r='1.2' fill='%23FFFFFF' opacity='0.8'/><circle cx='38' cy='20' r='1.5' fill='%23FFFFFF' opacity='0.8'/><circle cx='24' cy='44' r='1.2' fill='%23FFFFFF' opacity='0.8'/></svg>", // Lata de Refrigerante
      icon: Beer,
    };
  }
  if (
    normalized.includes("restaurante") ||
    normalized.includes("gastronomia") ||
    normalized.includes("culinaria") ||
    normalized.includes("bistro") ||
    normalized.includes("refeicao")
  ) {
    return {
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      activeBorder: "border-emerald-500",
      ring: "ring-emerald-500/20",
      color: "text-emerald-500",
      img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none'><path d='M16 26C11 26 8 21 11 16C9 11 14 6 20 7C23 2 33 2 36 7C42 6 47 11 45 16C48 21 45 26 40 26H16Z' fill='%2310B981'/><path d='M22 26V16M28 26V12M34 26V16' stroke='%23047857' stroke-width='2.5' stroke-linecap='round'/><rect x='15' y='26' width='26' height='16' rx='3' fill='%23059669'/><rect x='12' y='42' width='32' height='4' rx='2' fill='%23047857'/><path d='M18 34h20' stroke='%23A7F3D0' stroke-width='2' stroke-linecap='round'/></svg>", // Chapéu de Cozinheiro / Restaurante
      icon: ChefHat,
    };
  }
  if (
    normalized.includes("tabacaria") ||
    normalized.includes("narguile") ||
    normalized.includes("tabaco") ||
    normalized.includes("headshop") ||
    normalized.includes("vape") ||
    normalized.includes("hookah") ||
    normalized.includes("essencia") ||
    normalized.includes("fumo") ||
    normalized.includes("cigarro")
  ) {
    return {
      bg: "bg-orange-50",
      border: "border-orange-100",
      activeBorder: "border-orange-500",
      ring: "ring-orange-500/20",
      color: "text-orange-500",
      img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none'><path d='M26 10h12l2 6H24l2-6z' fill='%23EF4444'/><path d='M18 16h28v3H18z' fill='%2394A3B8'/><rect x='30' y='19' width='4' height='18' rx='2' fill='%23CBD5E1'/><circle cx='32' cy='24' r='3.5' fill='%2364748B'/><circle cx='32' cy='32' r='3' fill='%2364748B'/><path d='M24 37c0-2 2-3 8-3s8 1 8 3l4 18c0 3-3 5-12 5s-12-2-12-5l4-18z' fill='%2338BDF8' opacity='0.85'/><path d='M22.5 48c3 2 16 2 19 0l2.5 7c0 3-3 5-12 5s-12-2-12-5l2.5-7z' fill='%230284C7'/><path d='M34 27c10 0 16 6 16 16v6' stroke='%23F97316' stroke-width='3.5' stroke-linecap='round'/><path d='M50 49l4 6' stroke='%23E11D48' stroke-width='4' stroke-linecap='round'/><circle cx='32' cy='6' r='2.5' fill='%23CBD5E1' opacity='0.8'/><circle cx='28' cy='4' r='2' fill='%23E2E8F0' opacity='0.6'/><circle cx='36' cy='3' r='1.5' fill='%2394A3B8' opacity='0.5'/></svg>", // Narguile / Hookah
      icon: Flame,
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
  const params = useParams<{ tenantId?: string; "*"?: string }>();
  const location = useLocation();
  let routeTenantId = params.tenantId;
  if (!routeTenantId) {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length > 1 && ['cardapio', 'cardapio-digital', 'c', 'm', 'menu', 'marketplace'].includes(parts[0].toLowerCase())) {
      routeTenantId = parts[1];
    }
  }
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
          label: "Sobremesas",
          icon: IceCream,
          bg: "bg-pink-50",
          border: "border-pink-100",
          activeBorder: "border-pink-500",
          ring: "ring-pink-500/20",
          color: "text-pink-500",
          img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none'><path d='M18 32l4 22c0 2 2 4 4 4h12c2 0 4-2 4-4l4-22H18z' fill='%23F43F5E'/><path d='M22 32l3 22M28 32l1 22M34 32l-1 22M40 32l-3 22' stroke='%23BE123C' stroke-width='2'/><path d='M14 32c0-5 4-8 9-8c2-4 7-6 11-4c3-3 8-3 11 1c4 1 6 5 5 9c3 1 4 5 2 8H12c-2-3-1-5 2-6z' fill='%23FB7185'/><path d='M16 32c3 3 7 3 10 0c3 3 7 3 10 0c3 3 7 3 10 0' stroke='%23FFF1F2' stroke-width='3' stroke-linecap='round'/><circle cx='32' cy='14' r='6' fill='%23E11D48'/><path d='M32 8c2-4 6-5 9-3' stroke='%23059669' stroke-width='2.5' stroke-linecap='round'/><circle cx='24' cy='24' r='1.5' fill='%23FEF08A'/><circle cx='38' cy='22' r='1.5' fill='%23FEF08A'/><circle cx='30' cy='26' r='1.5' fill='%23FEF08A'/></svg>",
        },
        {
          id: "bebidas",
          label: "Bebidas",
          icon: Beer,
          bg: "bg-cyan-50",
          border: "border-cyan-100",
          activeBorder: "border-cyan-500",
          ring: "ring-cyan-500/20",
          color: "text-cyan-500",
          img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none'><rect x='20' y='12' width='24' height='42' rx='5' fill='%23EF4444'/><ellipse cx='32' cy='12' rx='11' ry='3' fill='%23E2E8F0'/><ellipse cx='32' cy='12' rx='9' ry='2' fill='%2394A3B8'/><rect x='30' y='8' width='4' height='5' rx='1' fill='%2364748B'/><path d='M20 28c4 3 10 3 14-1s6-3 10 0v10c-4-3-10-3-14 1s-6 3-10 0V28z' fill='%23FFFFFF' opacity='0.85'/><circle cx='25' cy='22' r='1.2' fill='%23FFFFFF' opacity='0.8'/><circle cx='38' cy='20' r='1.5' fill='%23FFFFFF' opacity='0.8'/><circle cx='24' cy='44' r='1.2' fill='%23FFFFFF' opacity='0.8'/></svg>",
        },
        {
          id: "restaurantes",
          label: "Restaurantes",
          icon: ChefHat,
          bg: "bg-emerald-50",
          border: "border-emerald-100",
          activeBorder: "border-emerald-500",
          ring: "ring-emerald-500/20",
          color: "text-emerald-500",
          img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none'><path d='M16 26C11 26 8 21 11 16C9 11 14 6 20 7C23 2 33 2 36 7C42 6 47 11 45 16C48 21 45 26 40 26H16Z' fill='%2310B981'/><path d='M22 26V16M28 26V12M34 26V16' stroke='%23047857' stroke-width='2.5' stroke-linecap='round'/><rect x='15' y='26' width='26' height='16' rx='3' fill='%23059669'/><rect x='12' y='42' width='32' height='4' rx='2' fill='%23047857'/><path d='M18 34h20' stroke='%23A7F3D0' stroke-width='2' stroke-linecap='round'/></svg>",
        },
        {
          id: "tabacaria",
          label: "Tabacaria",
          icon: Flame,
          bg: "bg-orange-50",
          border: "border-orange-100",
          activeBorder: "border-orange-500",
          ring: "ring-orange-500/20",
          color: "text-orange-500",
          img: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none'><path d='M26 10h12l2 6H24l2-6z' fill='%23EF4444'/><path d='M18 16h28v3H18z' fill='%2394A3B8'/><rect x='30' y='19' width='4' height='18' rx='2' fill='%23CBD5E1'/><circle cx='32' cy='24' r='3.5' fill='%2364748B'/><circle cx='32' cy='32' r='3' fill='%2364748B'/><path d='M24 37c0-2 2-3 8-3s8 1 8 3l4 18c0 3-3 5-12 5s-12-2-12-5l4-18z' fill='%2338BDF8' opacity='0.85'/><path d='M22.5 48c3 2 16 2 19 0l2.5 7c0 3-3 5-12 5s-12-2-12-5l2.5-7z' fill='%230284C7'/><path d='M34 27c10 0 16 6 16 16v6' stroke='%23F97316' stroke-width='3.5' stroke-linecap='round'/><path d='M50 49l4 6' stroke='%23E11D48' stroke-width='4' stroke-linecap='round'/><circle cx='32' cy='6' r='2.5' fill='%23CBD5E1' opacity='0.8'/><circle cx='28' cy='4' r='2' fill='%23E2E8F0' opacity='0.6'/><circle cx='36' cy='3' r='1.5' fill='%2394A3B8' opacity='0.5'/></svg>",
        },
      ];
    }

    const mapped = commerceCategories.map((cat) => {
      const presets = getCategoryPresets(cat.name);
      const nameLower = (cat.name || "").toLowerCase();
      const isBebida = nameLower.includes("bebida") || nameLower.includes("suco") || nameLower.includes("refrigerante");
      const isRestaurante = nameLower.includes("restaurante") || nameLower.includes("gastronomia") || nameLower.includes("culinaria");
      const isTabacaria = nameLower.includes("tabacaria") || nameLower.includes("narguile") || nameLower.includes("tabaco");
      const isSobremesa = nameLower.includes("sobremesa") || nameLower.includes("doce") || nameLower.includes("bolo") || nameLower.includes("acai") || nameLower.includes("sorvete");

      let finalImg = presets.img || cat.img;
      if (!finalImg || isBebida || isRestaurante || isTabacaria || isSobremesa || finalImg.includes("3126504") || finalImg.includes("3075929") || finalImg.includes("1046784") || finalImg.includes("2454512")) {
        finalImg = presets.img || cat.img;
      }

      return {
        id: cat.name.toLowerCase(),
        label: cat.name,
        icon: cat.iconName ? resolveIcon(cat.iconName) : presets.icon,
        bg: cat.bg || presets.bg,
        border: presets.border,
        activeBorder: presets.activeBorder,
        ring: presets.ring,
        color: cat.color || presets.color,
        img: finalImg,
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

  const isDirectCardapioRoute = useMemo(() => {
    return (
      location.pathname.startsWith('/cardapio') || 
      location.pathname.startsWith('/cardapio-digital') || 
      location.pathname.startsWith('/c/') || 
      location.pathname.startsWith('/m/') || 
      location.pathname.startsWith('/menu')
    );
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/perfil") {
      setNavView("profile");
    } else if (location.pathname.startsWith("/marketplace")) {
      if (!routeTenantId) {
        setNavView("home");
      }
    }
  }, [location.pathname, routeTenantId]);

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

  // Payment Methods States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCards, setPaymentCards] = useState([
    { id: "card_1", brand: "Mastercard", last4: "4829", holder: "LUCAS SILVA", expiry: "08/30", active: true },
    { id: "card_2", brand: "Visa", last4: "9021", holder: "LUCAS SILVA", expiry: "12/28", active: false }
  ]);
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardHolder, setNewCardHolder] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCVV, setNewCardCVV] = useState("");
  const [isAddingCard, setIsAddingCard] = useState(false);

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

  // Helper para extrair cidade a partir de qualquer formato de endereço brasileiro
  const extractCityFromAddress = (address?: string | null): string => {
    if (!address || typeof address !== 'string') return '';
    const cleanAddr = address.trim();
    if (!cleanAddr) return '';

    // Se já for apenas o nome de uma cidade (ou Cidade - UF / Cidade/UF)
    // Ex: "Pradópolis - SP", "Ribeirão Preto / SP", "São Paulo, SP", "Pradópolis"
    const directMatch = cleanAddr.match(/^([A-Za-zÀ-ÿ\s.'-]+?)(?:\s*[-/,]\s*[A-Z]{2})?$/);
    if (directMatch && !/\d/.test(cleanAddr) && !/rua|avenida|av\.|alameda|travessa|rodovia|estrada|bairro|centro|praça/i.test(cleanAddr)) {
      return directMatch[1].trim();
    }

    // Remove CEP (ex: "CEP 14850-000", "14850-000", "14850000")
    const addrWithoutCep = cleanAddr.replace(/(?:cep:?\s*)?\b\d{5}-?\d{3}\b/gi, '').trim();

    // Padrão brasileiro mais comum com estado: "... - Cidade - UF" ou "..., Cidade - UF" ou "..., Cidade/UF"
    // Ex: "Rua 7 de Setembro, 120, Centro, Pradópolis - SP" -> "Pradópolis"
    // Ex: "Av. Brasil, 1500 - Sala 2 - Ribeirão Preto - SP" -> "Ribeirão Preto"
    const statePatternMatch = addrWithoutCep.match(/[,–—-]\s*([^,–—-]{2,40}?)\s*[-/–—]\s*([A-Z]{2})(?:\s*[,–—-]|$)/i);
    if (statePatternMatch && statePatternMatch[1]) {
      const candidate = statePatternMatch[1].trim();
      if (candidate && !/^\d+$/.test(candidate)) {
        return candidate;
      }
    }

    // Padrão com barra: "Cidade/UF"
    const slashMatch = addrWithoutCep.match(/[,–—-]\s*([^,–—-]{2,40}?)\s*\/\s*([A-Z]{2})/i);
    if (slashMatch && slashMatch[1]) {
      return slashMatch[1].trim();
    }

    // Dividir por hífens ou vírgulas
    const parts = addrWithoutCep.split(/[,–—-]/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      if (/^[A-Z]{2}$/i.test(lastPart) && parts.length >= 2) {
        return parts[parts.length - 2];
      }
      const lastSlash = lastPart.split('/');
      if (lastSlash.length === 2 && /^[A-Z]{2}$/i.test(lastSlash[1].trim())) {
        return lastSlash[0].trim();
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (!/\d/.test(p) && !/rua|avenida|av\.|alameda|travessa|estrada|rodovia|apto|bloco|casa|km/i.test(p) && p.length > 2) {
          return p;
        }
      }
    }

    return parts[0] || '';
  };

  const getRestaurantCity = (tenant: Tenant, adminSettings?: any): string => {
    // 1. Verificar se existe campo explícito de município / cidade no adminSettings
    if (adminSettings?.fiscal?.address?.municipio) {
      return adminSettings.fiscal.address.municipio;
    }
    if (adminSettings?.city) {
      return adminSettings.city;
    }
    if (adminSettings?.municipio) {
      return adminSettings.municipio;
    }

    // 2. Verificar se existe no objeto do tenant
    if ((tenant as any)?.city) {
      return (tenant as any).city;
    }
    if ((tenant as any)?.municipio) {
      return (tenant as any).municipio;
    }

    // 3. Extrair do endereço completo
    const address = adminSettings?.address || tenant?.address || "";
    if (address) {
      const extracted = extractCityFromAddress(address);
      if (extracted) return extracted;
    }

    return "";
  };

  const getTenantOpenStatus = (tenantId: string) => {
    const settingSnapshot = tenantsSettings[tenantId];
    const adminData = settingSnapshot?.admin || settingSnapshot || {};
    const tenantData = tenants.find((t) => t.id === tenantId);

    // 1. Prioridade máxima: Forçamento manual de fechamento ou abertura
    const isForceClosed = adminData.isStoreForceClosed ?? settingSnapshot?.isStoreForceClosed ?? (tenantData as any)?.isStoreForceClosed ?? false;
    const isForceOpen = adminData.isStoreForceOpen ?? settingSnapshot?.isStoreForceOpen ?? (tenantData as any)?.isStoreForceOpen ?? false;

    if (isForceClosed) {
      return { 
        isOpen: false, 
        showTime: "Fechado Manualmente", 
        message: "Fechado agora", 
        badge: "Fechado",
        reason: "force_closed" 
      };
    }
    if (isForceOpen) {
      return { 
        isOpen: true, 
        showTime: "Aberto agora", 
        message: "Aberto agora", 
        badge: "Aberto",
        reason: "force_open" 
      };
    }

    // 2. Obter grade de horários (businessHours)
    const hours: any[] = adminData.businessHours || settingSnapshot?.businessHours || (tenantData as any)?.businessHours || [];
    
    // Se não tiver horários cadastrados, padrão: Aberto
    if (!hours || !Array.isArray(hours) || hours.length === 0) {
      return { isOpen: true, message: "Aberto agora", showTime: "Aberto", badge: "Aberto", reason: "no_schedule" };
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

    // Função de match de dia robusta
    const matchDay = (hDay: string, targetDayIndex: number) => {
      if (!hDay) return false;
      const targetName = DAYS_MAP[targetDayIndex];
      const dayClean = hDay.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const targetClean = targetName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (dayClean === targetClean || dayClean.replace("-feira", "") === targetClean.replace("-feira", "")) {
        return true;
      }
      if (targetDayIndex >= 1 && targetDayIndex <= 5 && (dayClean.includes("segunda a sexta") || dayClean.includes("seg a sex") || dayClean.includes("seg-sex") || dayClean.includes("dias uteis"))) {
        return true;
      }
      if ((targetDayIndex === 0 || targetDayIndex === 6) && (dayClean.includes("sabado e domingo") || dayClean.includes("sab e dom") || dayClean.includes("fim de semana"))) {
        return true;
      }
      if (dayClean.includes("diario") || dayClean.includes("todos os dias")) {
        return true;
      }
      return false;
    };

    // Horário atual formatado "HH:mm"
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeStr = `${String(currentHours).padStart(2, "0")}:${String(currentMinutes).padStart(2, "0")}`;

    // A) Verificar turnos que viraram a madrugada de ontem
    const yesterdayIndex = (todayIndex + 6) % 7;
    const yesterdaySchedules = hours.filter(h => matchDay(h.day, yesterdayIndex));
    const yesterdayActiveOvernightShift = yesterdaySchedules.find(shift => {
      if (shift.isClosed) return false;
      const open = shift.open || "00:00";
      const close = shift.close || "23:59";
      if (close < open) {
        // Virou a noite de ontem para hoje (ex: 18:00 às 02:00)
        return currentTimeStr <= close;
      }
      return false;
    });

    if (yesterdayActiveOvernightShift) {
      return {
        isOpen: true,
        message: "Aberto agora",
        showTime: `Aberto até ${yesterdayActiveOvernightShift.close}`,
        badge: "Aberto",
        reason: "overnight_shift"
      };
    }

    // B) Turnos programados para hoje
    const todaySchedules = hours.filter(h => matchDay(h.day, todayIndex));

    if (!todaySchedules || todaySchedules.length === 0) {
      return { isOpen: false, showTime: `Fechado (${todayName})`, message: "Fechado hoje", badge: "Fechado", reason: "no_today_shift" };
    }

    // Se todos os turnos de hoje estão marcados explicitamente como isClosed
    if (todaySchedules.every(s => s.isClosed)) {
      return { isOpen: false, showTime: `Fechado (${todayName})`, message: "Fechado hoje", badge: "Fechado", reason: "day_closed" };
    }

    const activeShifts = todaySchedules.filter(s => !s.isClosed);
    if (activeShifts.length === 0) {
      return { isOpen: false, showTime: `Fechado (${todayName})`, message: "Fechado hoje", badge: "Fechado", reason: "day_closed" };
    }

    // Ordenar turnos ativos por horário de abertura
    activeShifts.sort((a, b) => (a.open || "").localeCompare(b.open || ""));

    // Verificar se algum turno de hoje está aberto agora
    const matchingShift = activeShifts.find(shift => {
      const openTime = shift.open || "00:00";
      const closeTime = shift.close || "23:59";
      if (closeTime < openTime) {
        // Vira a noite (ex: 18:00 às 02:00)
        return currentTimeStr >= openTime || currentTimeStr <= closeTime;
      }
      return currentTimeStr >= openTime && currentTimeStr <= closeTime;
    });

    if (matchingShift) {
      return {
        isOpen: true,
        message: "Aberto agora",
        showTime: `Aberto até ${matchingShift.close}`,
        badge: "Aberto",
        reason: "active_shift"
      };
    }

    // Se não está em nenhum turno aberto agora:
    const upcomingShift = activeShifts.find(s => (s.open || "00:00") > currentTimeStr);
    if (upcomingShift) {
      return {
        isOpen: false,
        message: "Fechado agora",
        showTime: `Abre hoje às ${upcomingShift.open}`,
        badge: "Fechado",
        reason: "upcoming_shift"
      };
    }

    // Já encerraram todos os turnos de hoje
    const firstShift = activeShifts[0];
    return {
      isOpen: false,
      message: "Fechado agora",
      showTime: `Horário: das ${firstShift.open} às ${firstShift.close}`,
      badge: "Fechado",
      reason: "closed_for_day"
    };
  };

  const customerCity = useMemo(() => {
    if (!currentAddress) return "";
    return extractCityFromAddress(currentAddress);
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

  // Modal Refs & Click-Outside Hooks for Marketplace Modals
  const profileModalRef = useRef<HTMLDivElement>(null);
  const addressModalRef = useRef<HTMLDivElement>(null);
  const paymentModalRef = useRef<HTMLDivElement>(null);
  const helpModalRef = useRef<HTMLDivElement>(null);

  useClickOutside(profileModalRef, () => setShowProfileModal(false), showProfileModal);
  useClickOutside(addressModalRef, () => setShowAddressModal(false), showAddressModal);
  useClickOutside(paymentModalRef, () => {
    setShowPaymentModal(false);
    setIsAddingCard(false);
  }, showPaymentModal);
  useClickOutside(helpModalRef, () => setShowHelpModal(false), showHelpModal);

  // Global memory cache for instant store and product switching (0ms latency)
  const globalStoreCache = useRef<Map<string, {
    products: Product[];
    settings: DigitalMenuSettings;
    adminSettings: any;
    timestamp: number;
  }>>(new Map());

  // Store Detail State
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [storeSettings, setStoreSettings] = useState<DigitalMenuSettings | null>(null);
  const [storeAdminSettings, setStoreAdminSettings] = useState<any | null>(null);
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [isStoreLoading, setIsStoreLoading] = useState(false);
  
  // Instant Initial State using local cache (SWR pattern)
  const [initialLoading, setInitialLoading] = useState(() => {
    try {
      const cached = sessionStorage.getItem("mp_tenants_cache");
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });

  // Prefetch store data silently in background on hover/touch
  const prefetchStoreData = useCallback(async (tenant: Tenant) => {
    if (!tenant?.id) return;
    if (globalStoreCache.current.has(tenant.id)) {
      const existing = globalStoreCache.current.get(tenant.id)!;
      if (Date.now() - existing.timestamp < 1000 * 60 * 5) {
        return; // Cache still warm (5 min)
      }
    }

    try {
      const settingsRef = doc(db, "settings", tenant.id);
      const productsQ = query(
        collection(db, "products"),
        where("tenantId", "==", tenant.id),
        limit(300),
      );

      const [settingsSnap, productsSnap] = await Promise.all([
        getDoc(settingsRef),
        getDocs(productsQ)
      ]);

      const loadedProducts = productsSnap.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id }) as Product
      );

      let builtSettings: DigitalMenuSettings;
      let adminSet: any = null;

      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        builtSettings = {
          restaurantName: tenant.name,
          primaryColor: "#008080",
          welcomeMessage: "Bem-vindo ao nosso cardápio!",
          bannerUrl: "",
          logoUrl: tenant.logoUrl || "",
          allowOrdering: true,
          showStock: false,
          ...(data.digitalMenu || {}),
        };
        if (data.admin) adminSet = data.admin;
      } else {
        builtSettings = {
          restaurantName: tenant.name,
          primaryColor: "#008080",
          welcomeMessage: "Bem-vindo ao nosso cardápio!",
          bannerUrl: "",
          logoUrl: tenant.logoUrl || "",
          allowOrdering: true,
          showStock: false,
        };
      }

      globalStoreCache.current.set(tenant.id, {
        products: loadedProducts,
        settings: builtSettings,
        adminSettings: adminSet,
        timestamp: Date.now()
      });

      // Also persist small snapshot in sessionStorage
      try {
        sessionStorage.setItem(`mp_store_${tenant.id}`, JSON.stringify({
          products: loadedProducts,
          settings: builtSettings,
          adminSettings: adminSet,
          timestamp: Date.now()
        }));
      } catch {
        // Ignore quota limits in sessionStorage
      }
    } catch (e) {
      console.warn("Background prefetch error:", e);
    }
  }, []);

  // Use ref for Firestore product listener to prevent leaks and isolation issues
  const productListenerRef = React.useRef<(() => void) | null>(null);

  // Tracking states
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [trackingCourier, setTrackingCourier] = useState<Courier | null>(null);
  const [marketplaceSettings, setMarketplaceSettings] =
    useState<MarketplaceSettings | null>(null);
  const storeListRef = React.useRef<HTMLDivElement>(null);

  // Set dynamic document title for KitchenFlow
  useEffect(() => {
    if (selectedTenant) {
      document.title = `${selectedTenant.name} | KitchenFlow`;
    } else {
      document.title = "KitchenFlow - Sistema de Gestão para Restaurantes";
    }
  }, [selectedTenant]);

  // Sync profile state when prop changes
  useEffect(() => {
    if (profile) {
      setTempName(profile.name);
      setTempPhone(profile.phone);
    }
  }, [profile]);

  useEffect(() => {
    // 1. Try restoring tenants and settings from sessionStorage immediately
    try {
      const cachedTenants = sessionStorage.getItem("mp_tenants_cache");
      if (cachedTenants) {
        const parsed = JSON.parse(cachedTenants);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTenants(parsed);
          setInitialLoading(false);
        }
      }
      const cachedSettings = sessionStorage.getItem("mp_settings_cache");
      if (cachedSettings) {
        setTenantsSettings(JSON.parse(cachedSettings));
      }
      const cachedCats = sessionStorage.getItem("mp_cats_cache");
      if (cachedCats) {
        setCommerceCategories(JSON.parse(cachedCats));
      }
    } catch {
      // Ignore cache parsing errors
    }

    const q = query(
      collection(db, "tenants"),
      limit(100),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rawList = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Tenant);
        const tenantList = rawList.filter((t) => t.active !== false);
        setTenants(tenantList);
        setInitialLoading(false);
        try {
          sessionStorage.setItem("mp_tenants_cache", JSON.stringify(tenantList));
        } catch {}
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
      (error) => {
        console.warn("Erro ao carregar configurações do marketplace:", error);
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
        try {
          sessionStorage.setItem("mp_settings_cache", JSON.stringify(settingsMap));
        } catch {}
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
        try {
          sessionStorage.setItem("mp_cats_cache", JSON.stringify(cats));
        } catch {}
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
    }, (error) => {
      console.warn("Erro ao monitorar pedidos ativos:", error);
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
    }, (error) => {
      console.warn("Erro ao buscar histórico de pedidos:", error);
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
      (error) => {
        console.warn("Erro ao monitorar dados do entregador:", error);
      },
    );

    return () => unsubscribe();
  }, [activeOrders]);

  useEffect(() => {
    // Optimized High-Speed Store Loader with Instant Cache & Background SWR
    const loadStoreData = async (tenant: Tenant) => {
      if (productListenerRef.current) {
        productListenerRef.current();
        productListenerRef.current = null;
      }

      // Check In-Memory Cache first (0ms instantaneous transition)
      const memCached = globalStoreCache.current.get(tenant.id);
      if (memCached && memCached.products.length > 0) {
        setStoreSettings(memCached.settings);
        setStoreAdminSettings(memCached.adminSettings);
        setStoreProducts(memCached.products);
        setSelectedTenant(tenant);
        setIsStoreLoading(false);
      } else {
        // Check SessionStorage Cache
        try {
          const sessionSaved = sessionStorage.getItem(`mp_store_${tenant.id}`);
          if (sessionSaved) {
            const parsed = JSON.parse(sessionSaved);
            if (parsed && parsed.products) {
              setStoreSettings(parsed.settings);
              setStoreAdminSettings(parsed.adminSettings);
              setStoreProducts(parsed.products);
              setSelectedTenant(tenant);
              setIsStoreLoading(false);
            }
          }
        } catch {
          // fallback to live fetch
        }

        // If no cache at all, populate basic settings immediately from tenantsSettings to prevent full screen block
        const existingSnapshot = tenantsSettings[tenant.id];
        if (existingSnapshot) {
          const quickDigitalMenu = existingSnapshot.digitalMenu || {};
          setStoreSettings({
            restaurantName: tenant.name,
            primaryColor: "#008080",
            welcomeMessage: "Bem-vindo ao nosso cardápio!",
            bannerUrl: "",
            logoUrl: tenant.logoUrl || "",
            allowOrdering: true,
            showStock: false,
            ...quickDigitalMenu,
          });
          if (existingSnapshot.admin) {
            setStoreAdminSettings(existingSnapshot.admin);
          }
          setSelectedTenant(tenant);
        } else {
          setIsStoreLoading(true);
        }
      }

      try {
        const settingsRef = doc(db, "settings", tenant.id);
        const productsQ = query(
          collection(db, "products"),
          where("tenantId", "==", tenant.id),
          limit(300),
        );

        // Fetch settings & initial products in parallel for maximum speed
        const [settingsSnap, productsSnap] = await Promise.all([
          getDoc(settingsRef),
          getDocs(productsQ)
        ]);

        const loadedProducts = productsSnap.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id }) as Product,
        );

        let finalSettings: DigitalMenuSettings;
        let finalAdmin: any = null;

        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          finalSettings = {
            restaurantName: tenant.name,
            primaryColor: "#008080",
            welcomeMessage: "Bem-vindo ao nosso cardápio!",
            bannerUrl: "",
            logoUrl: tenant.logoUrl || "",
            allowOrdering: true,
            showStock: false,
            ...(data.digitalMenu || {}),
          };
          if (data.admin) finalAdmin = data.admin;
        } else {
          finalSettings = {
            restaurantName: tenant.name,
            primaryColor: "#008080",
            welcomeMessage: "Bem-vindo ao nosso cardápio!",
            bannerUrl: "",
            logoUrl: tenant.logoUrl || "",
            allowOrdering: true,
            showStock: false,
          };
        }

        // Apply immediately
        setStoreSettings(finalSettings);
        if (finalAdmin) setStoreAdminSettings(finalAdmin);
        setStoreProducts(loadedProducts);
        setSelectedTenant(tenant);

        // Cache result for next instant load
        globalStoreCache.current.set(tenant.id, {
          products: loadedProducts,
          settings: finalSettings,
          adminSettings: finalAdmin,
          timestamp: Date.now()
        });

        try {
          sessionStorage.setItem(`mp_store_${tenant.id}`, JSON.stringify({
            products: loadedProducts,
            settings: finalSettings,
            adminSettings: finalAdmin,
            timestamp: Date.now()
          }));
        } catch {}

        // Listen for live updates in real time
        productListenerRef.current = onSnapshot(
          productsQ,
          (snapshot) => {
            const updated = snapshot.docs.map(
              (doc) => ({ ...doc.data(), id: doc.id }) as Product,
            );
            setStoreProducts(updated);
            // update cache
            const cached = globalStoreCache.current.get(tenant.id);
            if (cached) {
              cached.products = updated;
              cached.timestamp = Date.now();
            }
          },
          (error) => {
            console.error("Erro ao escutar produtos da loja:", error);
          },
        );
      } catch (err) {
        console.error("Error loading store data:", err);
      } finally {
        setIsStoreLoading(false);
      }
    };

    const normalizeSlug = (str: string) => {
      if (!str) return "";
      return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
    };

    if (routeTenantId) {
      const targetNorm = normalizeSlug(routeTenantId);

      // Early return if selectedTenant already matches routeTenantId to prevent infinite re-render loop
      if (selectedTenant) {
        const currentCustomSlug = storeSettings?.digitalMenu?.customSlug;
        const currentSlug = (selectedTenant as any).slug;
        const isCurrentMatch =
          selectedTenant.id === routeTenantId ||
          selectedTenant.id.toLowerCase() === routeTenantId.toLowerCase() ||
          normalizeSlug(selectedTenant.id) === targetNorm ||
          normalizeSlug(selectedTenant.name) === targetNorm ||
          (currentCustomSlug && normalizeSlug(currentCustomSlug) === targetNorm) ||
          (currentSlug && normalizeSlug(currentSlug) === targetNorm);

        if (isCurrentMatch) {
          return;
        }
      }

      // Try matching by exact ID, customSlug, t.slug, or normalized name in currently loaded tenants
      let tenant = tenants.find((t) => {
        const tSettings = tenantsSettings[t.id];
        const customSlug = tSettings?.digitalMenu?.customSlug;
        const tenantSlug = (t as any).slug;
        if (customSlug && normalizeSlug(customSlug) === targetNorm) return true;
        if (tenantSlug && normalizeSlug(tenantSlug) === targetNorm) return true;
        return (
          t.id === routeTenantId || 
          t.id.toLowerCase() === routeTenantId.toLowerCase() ||
          (tenantSlug && tenantSlug.toLowerCase() === routeTenantId.toLowerCase()) ||
          normalizeSlug(t.name) === targetNorm ||
          normalizeSlug(t.id) === targetNorm
        );
      });

      if (tenant) {
        if (!selectedTenant || selectedTenant.id !== tenant.id) {
          loadStoreData(tenant);
        }
      } else if (!initialLoading) {
        // If not in primary list, fetch directly from Firestore by ID or query all tenants by slug
        const fetchTenantDirectly = async () => {
          setIsStoreLoading(true);
          try {
            // First check by direct doc ID
            const tenantRef = doc(db, "tenants", routeTenantId);
            const tenantSnap = await getDoc(tenantRef);
            if (tenantSnap.exists()) {
              const tenantData = {
                ...tenantSnap.data(),
                id: tenantSnap.id,
              } as Tenant;
              loadStoreData(tenantData);
              return;
            }

            // Query active tenants to find by slug
            const allTenantsSnap = await getDocs(query(collection(db, "tenants"), limit(100)));
            const allTenants = allTenantsSnap.docs.map(d => ({ ...d.data(), id: d.id }) as Tenant);
            
            const matchedBySlug = allTenants.find(t => {
              const tSettings = tenantsSettings[t.id];
              const customSlug = tSettings?.digitalMenu?.customSlug;
              const tenantSlug = (t as any).slug;
              if (customSlug && normalizeSlug(customSlug) === targetNorm) return true;
              if (tenantSlug && normalizeSlug(tenantSlug) === targetNorm) return true;
              return (
                t.id === routeTenantId ||
                t.id.toLowerCase() === routeTenantId.toLowerCase() ||
                (tenantSlug && tenantSlug.toLowerCase() === routeTenantId.toLowerCase()) ||
                normalizeSlug(t.name) === targetNorm ||
                normalizeSlug(t.id) === targetNorm
              );
            });

            if (matchedBySlug) {
              loadStoreData(matchedBySlug);
            } else if (allTenants.length > 0) {
              // Fallback to Viva Lá Fome or first tenant
              const defaultTenant = allTenants.find(t => t.id === 'HCL1177LRQVPEKCTYRAHU7IGBQ42' || normalizeSlug(t.name).includes('viva')) || allTenants[0];
              loadStoreData(defaultTenant);
            } else {
              console.warn("Tenant not found for route:", routeTenantId);
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
    const tSettings = tenantsSettings[tenant.id];
    const customSlug = tSettings?.digitalMenu?.customSlug;
    const cleanNameSlug = tenant.name 
      ? tenant.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : '';
    const preferredSlug = customSlug || (tenant as any).slug || cleanNameSlug || tenant.id;

    const isCardapioRoute = location.pathname.startsWith('/cardapio') || location.pathname.startsWith('/cardapio-digital') || location.pathname.startsWith('/c/') || location.pathname.startsWith('/m/') || location.pathname.startsWith('/menu');
    if (isCardapioRoute) {
      navigate(`/cardapio/${preferredSlug}`);
    } else {
      navigate(`/marketplace/${preferredSlug}`);
    }
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
    const storeApplicablePromotions = (marketplaceSettings?.promotions || []).filter(p => 
      p.active && (
        !p.participatingTenantIds || 
        p.participatingTenantIds.length === 0 || 
        p.participatingTenantIds.includes(selectedTenant.id) ||
        p.participatingTenantIds.includes('all')
      )
    );

    return (
      <div className="h-full overflow-y-auto bg-white w-full">
        <DigitalMenu
          settings={{
            ...storeSettings,
            primaryColor: storeSettings.primaryColor || "#0d9488",
          }}
          products={storeProducts}
          autoStart={true}
          isOpen={getTenantOpenStatus(selectedTenant.id).isOpen}
          openStatusMessage={getTenantOpenStatus(selectedTenant.id).showTime}
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
          promotions={storeApplicablePromotions}
          onBack={
            isDirectCardapioRoute
              ? undefined
              : () => {
                  setSelectedTenant(null);
                  navigate("/marketplace");
                }
          }
          isMarketplace={!isDirectCardapioRoute}
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
              const normalizedPaymentMethod = normalizePaymentMethod(order.paymentMethod, storeAdminSettings);

              const orderWithTenant = sanitize({
                ...order,
                paymentMethod: normalizedPaymentMethod,
                status: initialStatus,
                tenantId: selectedTenant.id,
                source: "marketplace",
                marketplaceFee: marketplaceFeeAmount,
                createdAt: new Date(),
                acceptedAt: isAutoAccept ? new Date() : undefined,
              });

              // Salvar o pedido no Firestore usando o ID do pedido para consistência absoluta entre todos os painéis (KDS, Admin, etc.)
              await setDoc(
                doc(db, "orders", order.id),
                orderWithTenant,
              );
              console.log("Pedido salvo com sucesso! ID:", order.id, "Método:", normalizedPaymentMethod);

              // Registrar evento na fila de integração para Saipos e ERPs de terceiros
              try {
                const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const customerPhone = order.customerPhone || profile?.phone || "";
                await setDoc(doc(db, "integration_events", eventId), {
                  id: eventId,
                  tenantId: selectedTenant.id,
                  eventType: "ORDER_CREATED",
                  status: "PENDING",
                  createdAt: new Date().toISOString(),
                  order: {
                    id: order.id,
                    displayId: order.id.slice(-4),
                    createdAt: new Date().toISOString(),
                    type: "DELIVERY",
                    merchant: {
                      id: selectedTenant.id,
                      name: selectedTenant.name || "Restaurante"
                    },
                    customer: {
                      id: customerPhone || "cust_anon",
                      name: order.customerName || profile?.name || "Cliente Marketplace",
                      phone: customerPhone
                    },
                    deliveryAddress: {
                      formattedAddress: order.customerAddress || ""
                    },
                    items: (order.items || []).map((it: any) => ({
                      id: it.productId || it.id || "",
                      externalCode: it.externalCode || it.productId || "",
                      name: it.name,
                      quantity: it.quantity,
                      unitPrice: it.price,
                      totalPrice: (it.price || 0) * (it.quantity || 1),
                      observation: it.observation || ""
                    })),
                    payments: {
                      prepaid: normalizedPaymentMethod === "pix",
                      methods: [{ method: normalizedPaymentMethod.toUpperCase(), value: order.total }]
                    },
                    total: {
                      subTotal: (order.total || 0) - (order.deliveryFee || 0),
                      deliveryFee: order.deliveryFee || 0,
                      orderAmount: order.total
                    }
                  }
                });
                console.log("Evento de integração registrado para Saipos/ERP:", eventId);
              } catch (evtErr) {
                console.warn("Aviso ao registrar evento de integração:", evtErr);
              }

              // Persistir cliente na coleção 'customers' do tenant para CRM
              const customerPhone = order.customerPhone || profile?.phone;
              if (customerPhone) {
                try {
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
                } catch (cErr) {
                  console.warn("Erro ao registrar cliente no CRM:", cErr);
                }
              }

              // Registrar fatura de serviço do marketplace
              try {
                await addDoc(collection(db, "marketplaceInvoices"), {
                  tenantId: selectedTenant.id,
                  orderId: order.id,
                  amount: marketplaceFeeAmount,
                  status: "pending",
                  createdAt: new Date(),
                });
              } catch (iErr) {
                console.warn("Erro ao registrar fatura do marketplace:", iErr);
              }
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
      {/* Brand & Address Header - Aligned with KitchenFlow Institutional Identity */}
      {navView !== "profile" && (
        <header className="bg-slate-950 text-white sticky top-0 z-[60] border-b border-slate-800/90 shadow-lg backdrop-blur-xl bg-slate-950/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2.5">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2.5 group focus:outline-none shrink-0">
                <div className="group-hover:scale-105 transition-transform duration-300">
                  <KitchenFlowBrandLogo className="w-8 h-8 sm:w-9 sm:h-9 shadow-lg shadow-orange-500/25" />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display font-black text-lg sm:text-xl tracking-tight text-white group-hover:text-orange-400 transition-colors">
                      Kitchen<span className="text-orange-500">Flow</span>
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                      <Sparkles size={9} /> Marketplace
                    </span>
                  </div>
                  <span className="text-[9px] font-semibold text-slate-400 -mt-0.5 tracking-wider hidden md:block">
                    Gastronomia Direto da Cozinha
                  </span>
                </div>
              </Link>
            </div>

            {/* Address Selector Center Pill */}
            <div
              className="flex-1 max-w-sm sm:max-w-md mx-1 sm:mx-3 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-orange-500/40 rounded-2xl px-3 py-2 cursor-pointer transition-all flex items-center justify-between group shadow-inner"
              onClick={() => setShowAddressModal(true)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/25">
                  <MapPin size={13} strokeWidth={2.5} className="animate-pulse" />
                </div>
                <div className="text-left truncate">
                  <div className="flex items-center gap-1 text-[8px] sm:text-[9px] font-black text-orange-400 uppercase tracking-widest leading-none">
                    <span>Entregar em</span>
                    <ChevronDown size={9} strokeWidth={3} />
                  </div>
                  <p className="text-[11px] sm:text-xs font-bold text-slate-200 truncate mt-0.5">
                    {currentAddress}
                  </p>
                </div>
              </div>
              <span className="relative flex h-2 w-2 shrink-0 ml-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            {/* Quick Actions & Links */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                to="/"
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all"
              >
                <span>Site Oficial</span>
                <ArrowUpRight size={13} className="text-slate-400" />
              </Link>

              <Link
                to="/login"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 transition-all"
              >
                <Store size={13} />
                <span>Sou Lojista</span>
              </Link>

              <PwaInstallPrompt compact />

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => alert("Você não possui novas notificações no momento.")}
                className="w-9 h-9 flex items-center justify-center text-slate-300 relative bg-slate-900 hover:bg-slate-800 rounded-xl transition-all border border-slate-800 shadow-sm"
              >
                <Bell size={16} />
                <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-slate-950 shadow-md animate-pulse" />
              </motion.button>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 w-full">
        {navView === "home" ? (
          <>
            {/* Compact Hero Section with Fast Search */}
            <div className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-4 sm:px-6 pt-3.5 pb-4.5 sm:pt-4 sm:pb-5 border-b border-slate-800/80 overflow-hidden mb-4 sm:mb-5">
              {/* Background ambient glow */}
              <div className="absolute top-0 right-1/4 w-60 h-60 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/4 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="max-w-3xl mx-auto text-center relative z-10 space-y-2.5">
                <div className="flex items-center justify-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                    <Flame size={11} className="text-orange-500 animate-pulse" />
                    <span>Rede Oficial KitchenFlow</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">
                    • 0% taxa abusiva • Entrega direta
                  </span>
                </div>

                <h1 className="text-lg sm:text-2xl md:text-2.5xl font-display font-black text-white tracking-tight leading-snug">
                  Os melhores restaurantes da sua cidade{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400">
                    direto na sua mesa
                  </span>
                </h1>

                {/* Compact Search Bar with Ambient Glow */}
                <div className="pt-0.5 max-w-xl mx-auto">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-orange-500/15 blur-lg rounded-xl opacity-40 group-focus-within:opacity-100 group-focus-within:scale-102 transition-all duration-300 pointer-events-none" />
                    <Search
                      className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-orange-400 transition-transform duration-300 group-focus-within:scale-110"
                      size={17}
                      strokeWidth={2.5}
                    />
                    <input
                      type="text"
                      placeholder="Buscar pratos, lanches, pizzas ou restaurantes..."
                      className="w-full bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl py-2.5 sm:py-3 pl-10 sm:pl-11 pr-10 text-xs sm:text-sm font-bold text-white focus:ring-3 focus:ring-orange-500/25 focus:border-orange-500 transition-all outline-none placeholder:text-slate-400 shadow-md"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Filters Pill Bar */}
                <div className="flex items-center justify-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar pb-0.5">
                  <span className="text-slate-400 flex items-center gap-1 font-black uppercase tracking-wider text-[9px] shrink-0 mr-0.5">
                    <Sparkles size={10} className="text-orange-400" /> Populares:
                  </span>
                  {["Hambúrguer", "Pizza", "Japonesa", "Doces", "Marmita", "Bebidas"].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSearchTerm(tag)}
                      className="px-2.5 py-0.5 rounded-full bg-slate-800/90 hover:bg-slate-750 hover:text-orange-300 border border-slate-700/70 text-slate-300 transition-all cursor-pointer text-[10px] font-bold shrink-0 hover:border-orange-500/40"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Premium Interactive Banners & Highlights */}
            <div className="px-4 sm:px-6 mb-8 space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                  <h3 className="text-[10px] sm:text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                    Destaques & Promoções da Rede
                  </h3>
                </div>
                {activePromotionId && (
                  <button
                    onClick={() => setActivePromotionId(null)}
                    className="text-[9px] font-black text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                  >
                    Ver Tudo <X size={10} />
                  </button>
                )}
              </div>

              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
                {/* Main Banner Card */}
                <div
                  className={`relative h-36 sm:h-40 md:h-44 min-w-[280px] sm:min-w-[360px] md:min-w-[420px] rounded-2xl sm:rounded-3xl overflow-hidden group shadow-lg hover:shadow-xl flex-shrink-0 transition-all cursor-pointer snap-start border ${
                    !activePromotionId 
                      ? "border-orange-500/50 ring-2 ring-orange-500/20" 
                      : "border-slate-800/80 opacity-95 hover:opacity-100 hover:border-orange-500/40"
                  }`}
                  onClick={() => setActivePromotionId(null)}
                >
                  <img
                    src={
                      marketplaceSettings?.bannerUrl ||
                      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1000&auto=format&fit=crop"
                    }
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    alt="Restaurantes Oficiais"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-black/30" />
                  
                  <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between text-left">
                    <div className="flex items-center gap-2">
                      <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full shadow-md">
                        🔥 Oficial KitchenFlow
                      </span>
                      <span className="bg-black/50 backdrop-blur-md border border-white/20 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                        {tenants.length} Restaurantes
                      </span>
                    </div>

                    <div>
                      <h2 className="text-base sm:text-xl md:text-2.5xl font-black text-white tracking-tight leading-tight group-hover:text-orange-300 transition-colors">
                        Explore Todos os Cardápios
                      </h2>
                      <p className="text-slate-300 text-[10px] sm:text-[11px] font-semibold mt-0.5 line-clamp-1">
                        Pizzas, burgers, gastronomia japonesa e sobremesas com pedido direto
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-orange-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                      <span>Ver cardápios</span>
                      <ChevronRight size={12} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>

                {/* Dynamic Promotions or Curated Fallbacks */}
                {marketplaceSettings?.promotions && marketplaceSettings.promotions.filter((p) => p.active).length > 0 ? (
                  marketplaceSettings.promotions
                    .filter((p) => p.active)
                    .map((promo) => (
                      <div
                        key={promo.id}
                        className={`relative h-36 sm:h-40 md:h-44 min-w-[280px] sm:min-w-[360px] md:min-w-[420px] rounded-2xl sm:rounded-3xl overflow-hidden group shadow-lg hover:shadow-xl flex-shrink-0 cursor-pointer snap-start transition-all border ${
                          activePromotionId === promo.id
                            ? "border-orange-500 ring-2 ring-orange-500/30"
                            : "border-slate-800/80 opacity-95 hover:opacity-100 hover:border-orange-500/40"
                        }`}
                        onClick={() => setActivePromotionId(promo.id)}
                      >
                        <img
                          src={
                            promo.bannerUrl ||
                            marketplaceSettings?.bannerUrl ||
                            "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1000&auto=format&fit=crop"
                          }
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          alt={promo.title}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-black/30" />
                        
                        <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between text-left">
                          <div className="flex items-center gap-2">
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full shadow-md">
                              ⚡ Imperdível
                            </span>
                            <span className="bg-black/50 backdrop-blur-md border border-white/20 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                              {promo.participatingTenantIds?.length || 0} Lojas
                            </span>
                          </div>

                          <div>
                            <h2 className="text-base sm:text-xl md:text-2.5xl font-black text-white tracking-tight leading-tight group-hover:text-orange-300 transition-colors">
                              {promo.title}
                            </h2>
                            <p className="text-slate-300 text-[10px] sm:text-[11px] font-semibold mt-0.5 line-clamp-1">
                              Toque para filtrar estabelecimentos participantes
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 text-amber-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                            <span>{activePromotionId === promo.id ? "Filtro Ativo" : "Filtrar por esta oferta"}</span>
                            <ChevronRight size={12} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>

                        {activePromotionId === promo.id && (
                          <div className="absolute top-3.5 right-3.5 bg-orange-500 text-white p-1.5 rounded-full shadow-lg border border-white/30">
                            <CheckCircle2 size={16} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    ))
                ) : (
                  <>
                    {/* Curated Promo 1: Combos & Ofertas */}
                    <div
                      className="relative h-36 sm:h-40 md:h-44 min-w-[280px] sm:min-w-[360px] md:min-w-[420px] rounded-2xl sm:rounded-3xl overflow-hidden group shadow-lg hover:shadow-xl flex-shrink-0 cursor-pointer snap-start transition-all border border-slate-800/80 hover:border-orange-500/40"
                      onClick={() => setSearchTerm("Combo")}
                    >
                      <img
                        src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000&auto=format&fit=crop"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        alt="Combos Especiais"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-black/30" />
                      <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between text-left">
                        <div className="flex items-center gap-2">
                          <span className="bg-gradient-to-r from-rose-500 to-orange-500 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full shadow-md">
                            🍔 Combos do Dia
                          </span>
                          <span className="bg-black/50 backdrop-blur-md border border-white/20 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                            Desconto Especial
                          </span>
                        </div>
                        <div>
                          <h2 className="text-base sm:text-xl md:text-2.5xl font-black text-white tracking-tight leading-tight group-hover:text-orange-300 transition-colors">
                            Combos com Acompanhamentos
                          </h2>
                          <p className="text-slate-300 text-[10px] sm:text-[11px] font-semibold mt-0.5">
                            Hamburguerias e pizzarias artesanais da sua região
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-orange-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                          <span>Explorar combos</span>
                          <ChevronRight size={12} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>

                    {/* Curated Promo 2: Frete Grátis */}
                    <div
                      className="relative h-36 sm:h-40 md:h-44 min-w-[280px] sm:min-w-[360px] md:min-w-[420px] rounded-2xl sm:rounded-3xl overflow-hidden group shadow-lg hover:shadow-xl flex-shrink-0 cursor-pointer snap-start transition-all border border-slate-800/80 hover:border-emerald-500/40"
                      onClick={() => setSearchTerm("")}
                    >
                      <img
                        src="https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1000&auto=format&fit=crop"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        alt="Pizzas & Massas"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-black/30" />
                      <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between text-left">
                        <div className="flex items-center gap-2">
                          <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full shadow-md">
                            🛵 Frete Facilitado
                          </span>
                          <span className="bg-black/50 backdrop-blur-md border border-white/20 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                            Entrega Rápida
                          </span>
                        </div>
                        <div>
                          <h2 className="text-base sm:text-xl md:text-2.5xl font-black text-white tracking-tight leading-tight group-hover:text-emerald-300 transition-colors">
                            Pizzas & Fornos a Lenha
                          </h2>
                          <p className="text-slate-300 text-[10px] sm:text-[11px] font-semibold mt-0.5">
                            Receba quentinho direto na sua casa em poucos minutos
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                          <span>Ver pizzarias</span>
                          <ChevronRight size={12} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Categories Section - Highly Visual Squircles */}
            <div className="px-6 mb-10 overflow-x-auto no-scrollbar">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-4 sm:gap-6 min-w-full pb-3"
              >
                {dynamicCategories.map((cat, index) => {
                  const isSelected = activeCategory === cat.id;
                  return (
                    <motion.button
                      key={cat.id}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="flex flex-col items-center gap-2.5 group shrink-0 relative focus:outline-none cursor-pointer"
                      onClick={() => setActiveCategory(cat.id)}
                    >
                      <div
                        className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[1.75rem] transition-all duration-300 flex items-center justify-center relative backdrop-blur-sm active:scale-95 ${
                          isSelected
                            ? "bg-gradient-to-tr from-orange-500 to-amber-500 text-white border-2 border-orange-500 shadow-xl shadow-orange-500/30 scale-105"
                            : `${cat.bg} border border-slate-200/80 hover:border-orange-500/40 hover:scale-105 hover:bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)]`
                        }`}
                      >
                        {cat.img ? (
                          <img
                            src={cat.img}
                            alt={cat.label}
                            className={`w-10 h-10 sm:w-11 sm:h-11 object-contain transition-all duration-300 ${
                              isSelected
                                ? "scale-110 rotate-[4deg] brightness-110 filter drop-shadow-[0_4px_10px_rgba(255,255,255,0.2)]"
                                : "opacity-90 group-hover:opacity-100 group-hover:scale-110"
                            }`}
                          />
                        ) : (
                          <cat.icon
                            size={26}
                            className={`transition-all duration-300 ${isSelected ? `text-white scale-110` : `${cat.color} opacity-90 group-hover:scale-110`}`}
                            strokeWidth={2.5}
                          />
                        )}
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`text-[10px] sm:text-[11px] font-black uppercase tracking-[0.14em] transition-colors duration-200 ${isSelected ? "text-orange-600 font-black" : "text-slate-600 group-hover:text-slate-900 font-bold"}`}
                        >
                          {cat.label}
                        </span>
                        {isSelected && (
                          <motion.div
                            layoutId="activeCategoryDot"
                            className="w-1.5 h-1.5 bg-orange-500 rounded-full shadow-lg shadow-orange-500/50"
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
                  className="px-6 mb-10"
                >
                  <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-[2rem] p-6 shadow-2xl border border-slate-800 overflow-hidden relative text-white text-left">
                    <div className="absolute top-0 right-0 w-44 h-44 bg-orange-500/10 rounded-full blur-[40px] pointer-events-none" />
                    <div className="flex justify-between items-start mb-5 relative z-10">
                      <div>
                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                          <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                          Ao vivo pelo KitchenFlow
                        </p>
                        <h3 className="text-lg font-black tracking-tight leading-none text-white">
                          {activeOrders[0].items[0]?.name || "Pedido"} em andamento
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-12 h-12 bg-orange-500/15 rounded-2xl flex items-center justify-center border border-orange-500/30 shrink-0">
                        <Clock className="text-orange-400" size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          Status do Preparo
                        </p>
                        <p className="text-xs font-black uppercase tracking-wider text-amber-400 truncate">
                          {activeOrders[0].status === "pending"
                            ? "Aguardando Confirmação da Cozinha"
                            : activeOrders[0].status === "preparing"
                              ? "Na Cozinha / Preparando com Cuidado"
                              : "Saiu para Entrega!"}
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setNavView("orders");
                          navigate("/marketplace");
                        }}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/25 transition-all shrink-0 cursor-pointer"
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
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                    Estabelecimentos do Bairro
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    Restaurantes parceiros com entrega rápida e cardápio oficial
                  </p>
                </div>
                <span className="text-[10px] font-black text-slate-600 bg-slate-100 border border-slate-200/80 px-3 py-1.5 rounded-full uppercase tracking-wider">
                  {filteredTenants.length} Lojas
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTenants.map((tenant, index) => {
                  const status = getTenantOpenStatus(tenant.id);
                  const isOpen = status.isOpen;
                  return (
                    <motion.div
                      key={tenant.id}
                      initial={{ opacity: 0, y: 25 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      onMouseEnter={() => prefetchStoreData(tenant)}
                      onTouchStart={() => prefetchStoreData(tenant)}
                      onClick={() => handleStoreClick(tenant)}
                      className={`bg-white rounded-[2rem] border border-slate-200/90 p-5 flex items-center gap-4.5 shadow-[0_4px_25px_rgb(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgba(255,79,24,0.08)] hover:border-orange-500/30 transition-all duration-300 cursor-pointer group hover:-translate-y-0.5 text-left relative overflow-hidden ${
                        !isOpen ? "opacity-90" : ""
                      }`}
                    >
                      {/* Background accent card glow */}
                      <div className="absolute top-0 right-0 w-28 h-28 bg-orange-500/5 rounded-full blur-[35px] opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" />
                      
                      {/* Store Logo Frame */}
                      <div className={`w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 rounded-2xl overflow-hidden shrink-0 border p-1 bg-white relative transition-all duration-300 group-hover:scale-102 aspect-square ${
                        isOpen ? "border-slate-200 group-hover:border-orange-200" : "border-slate-200/50"
                      }`}>
                        <img
                          src={
                            tenant.logoUrl ||
                            `https://picsum.photos/seed/${tenant.id}/200/200`
                          }
                          alt={tenant.name}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className={`w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500 ${
                            !isOpen ? "grayscale opacity-75 contrast-75 brightness-95" : ""
                          }`}
                        />
                        <span className={`absolute bottom-1 right-1 px-1.5 py-0.5 text-[8px] font-black tracking-wide uppercase rounded-md shadow-sm ${
                          isOpen ? "bg-emerald-500 text-white" : "bg-slate-500 text-white"
                        }`}>
                          {isOpen ? "Aberto" : "Fechado"}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className={`font-black tracking-tight text-lg truncate transition-colors duration-200 ${
                            isOpen ? "text-slate-900 group-hover:text-orange-600" : "text-slate-500"
                          }`}>
                            {tenant.name}
                          </h4>
                          {!isOpen && (
                            <span className="text-[8px] font-black tracking-wider uppercase px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100 select-none">
                              Fechado agora
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                          <p className="text-[10px] font-extrabold text-orange-500 uppercase tracking-widest leading-none">
                            {tenant.category}
                          </p>
                          <span className={`text-[9px] font-bold ${isOpen ? "text-emerald-700 bg-emerald-50 border border-emerald-200/60" : "text-slate-500 bg-slate-100 border border-slate-200"} px-1.5 py-0.5 rounded-md`}>
                            {status.showTime}
                          </span>
                          {(() => {
                            const tSettings = tenantsSettings[tenant.id]?.admin || tenantsSettings[tenant.id] || {};
                            const tenantCity = getRestaurantCity(tenant, tSettings);
                            if (!tenantCity) return null;
                            return (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 rounded-md">
                                <MapPin size={9} className="text-orange-500 shrink-0" strokeWidth={2.5} />
                                <span className="truncate max-w-[120px]">{tenantCity}</span>
                              </span>
                            );
                          })()}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Rating Unit */}
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-lg border border-amber-200/80">
                            <Star size={11} fill="currentColor" />
                            <span className="text-[10px] font-black tracking-tight font-sans">4.9</span>
                          </div>
                          {/* Delivery Time Option */}
                          <div className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200">
                            <Clock size={11} strokeWidth={2.5} />
                            <span className="text-[10px] font-bold font-sans">25-35 min</span>
                          </div>
                          {/* Delivery Cost */}
                          <div className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg font-sans">
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
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border ${
                            favorites.includes(tenant.id)
                              ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/25"
                              : "bg-slate-50 hover:bg-rose-50 hover:border-rose-200 border-slate-200 text-slate-400 hover:text-rose-500"
                          }`}
                        >
                          <Heart
                            size={16}
                            fill={favorites.includes(tenant.id) ? "currentColor" : "none"}
                          />
                        </button>
                        <button
                          onClick={() => handleStoreClick(tenant)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm border ${
                            isOpen 
                              ? "bg-slate-50 hover:bg-orange-500 hover:text-white hover:border-orange-500 border-slate-200 text-slate-500"
                              : "bg-slate-50 hover:bg-slate-200 border-slate-200 text-slate-400"
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

            {/* Institutional KitchenFlow Partner & SaaS Banner */}
            <section className="px-6 mb-12">
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-[2.5rem] p-7 sm:p-10 border border-slate-800 shadow-2xl relative overflow-hidden text-left">
                {/* Glow effects */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                  <div className="max-w-2xl space-y-3.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[10px] sm:text-xs font-black uppercase tracking-widest">
                      <Store size={13} />
                      <span>Para Donos de Restaurantes, Lanchonetes & Pizzarias</span>
                    </div>

                    <h3 className="text-2xl sm:text-3.5xl font-display font-black text-white tracking-tight leading-tight">
                      Venda no KitchenFlow com <br className="hidden sm:block" />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400">
                        0% de comissão por pedido.
                      </span>
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                      Tenha seu próprio cardápio digital, PDV ultra-rápido, sistema KDS para a cozinha, controle de mesas, comandas e gestão de entregadores com GPS em tempo real.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300">
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 size={15} className="text-emerald-400" /> Sem taxa por pedido
                      </span>
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 size={15} className="text-emerald-400" /> Cardápio Próprio
                      </span>
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 size={15} className="text-emerald-400" /> Suporte no Brasil
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto shrink-0">
                    <Link
                      to="/login"
                      className="px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider text-center shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                    >
                      <span>Cadastrar Meu Restaurante</span>
                      <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                    <Link
                      to="/"
                      className="px-6 py-4 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-2xl font-bold text-xs uppercase tracking-wider text-center transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Conhecer o KitchenFlow</span>
                      <ArrowUpRight size={15} className="text-slate-400" />
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : navView === "favorites" ? (
          <section className="px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Meus Favoritos
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Restaurantes que você marcou com carinho
                </p>
              </div>
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 text-rose-500 rounded-2xl flex items-center justify-center shadow-sm">
                <Heart size={22} fill="currentColor" />
              </div>
            </div>

            {tenants.filter((t) => favorites.includes(t.id)).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                        onMouseEnter={() => prefetchStoreData(tenant)}
                        onTouchStart={() => prefetchStoreData(tenant)}
                        onClick={() => handleStoreClick(tenant)}
                        className={`bg-white rounded-[2rem] p-4.5 flex items-center gap-4 border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_35px_rgba(255,79,24,0.06)] hover:border-orange-500/30 group cursor-pointer active:scale-[0.99] transition-all text-left relative overflow-hidden ${
                          !isOpen ? "opacity-90" : ""
                        }`}
                      >
                        <div className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-50 shrink-0 aspect-square border relative transition-all ${
                          isOpen ? "border-slate-200 group-hover:border-orange-200" : "border-slate-200/50"
                        }`}>
                          <img
                            src={
                              tenant.logoUrl ||
                              `https://picsum.photos/seed/${tenant.id}/200/200`
                            }
                            alt={tenant.name}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-350 ${
                              !isOpen ? "grayscale opacity-75 contrast-75 brightness-95" : ""
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className={`font-black tracking-tight text-base truncate group-hover:text-orange-600 transition-colors ${
                              isOpen ? "text-slate-900" : "text-slate-500 font-bold"
                            }`}>
                              {tenant.name}
                            </h4>
                            {!isOpen && (
                              <span className="text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100 select-none">
                                Fechado agora
                              </span>
                            )}
                          </div>
                          
                          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>{tenant.category}</span>
                            <span className={`text-[9px] font-bold ${
                              isOpen ? "text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60" : "text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
                            }`}>
                              {status.showTime}
                            </span>
                            {(() => {
                              const tSettings = tenantsSettings[tenant.id]?.admin || tenantsSettings[tenant.id] || {};
                              const tenantCity = getRestaurantCity(tenant, tSettings);
                              if (!tenantCity) return null;
                              return (
                                <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1 border border-slate-200">
                                  <MapPin size={9} className="text-orange-500 shrink-0" /> {tenantCity}
                                </span>
                              );
                            })()}
                          </p>
                          
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 font-sans">
                              <Star size={11} fill="currentColor" />
                              <span className="text-[10px] font-black">4.9</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 font-sans">
                              <Clock size={11} />
                              <span className="text-[10px] font-bold uppercase">
                                25-35 min
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => toggleFavorite(e, tenant.id)}
                          className="w-10 h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center shadow-sm shrink-0 active:scale-95 border border-rose-200/60"
                        >
                          <Heart size={18} fill="currentColor" />
                        </button>
                      </motion.div>
                    );
                  })}
              </div>
            ) : (
              <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
                <div className="w-20 h-20 bg-orange-50 border border-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-5 text-orange-500">
                  <Heart size={36} />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Nenhum favorito ainda
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1 max-w-sm mx-auto">
                  Toque no coração dos restaurantes que você mais gosta para guardar nesta lista!
                </p>
                <button
                  onClick={() => setNavView("home")}
                  className="mt-6 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/25 cursor-pointer"
                >
                  Explorar Restaurantes
                </button>
              </div>
            )}
          </section>
        ) : navView === "orders" ? (
          <section className="px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Meus Pedidos
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Histórico e acompanhamento de compras
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-50 border border-orange-100 text-orange-500 rounded-2xl flex items-center justify-center shadow-sm">
                <ShoppingBag size={22} />
              </div>
            </div>

            {orderHistory.length > 0 ? (
              <div className="space-y-5">
                {orderHistory.map((order) => {
                  const tenant = tenants.find((t) => t.id === order.tenantId);
                  return (
                    <div
                      key={order.id}
                      onClick={() => tenant && handleStoreClick(tenant)}
                      className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_25px_rgb(0,0,0,0.02)] cursor-pointer hover:shadow-lg hover:border-orange-500/30 active:scale-[0.99] transition-all group text-left"
                    >
                      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-slate-50 shrink-0 aspect-square border border-slate-200 group-hover:scale-105 transition-transform duration-300">
                          <img
                            src={
                              tenant?.logoUrl ||
                              `https://picsum.photos/seed/${order.tenantId}/100/100`
                            }
                            alt="Logo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-black text-slate-900 tracking-tight text-base truncate group-hover:text-orange-600 transition-colors">
                              {tenant?.name || "Restaurante Parceiro"}
                            </h4>
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shrink-0 ${
                                order.status === "delivered"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                                  : order.status === "cancelled"
                                    ? "bg-rose-50 text-rose-600 border border-rose-200/70"
                                    : "bg-orange-50 text-orange-600 border border-orange-200/70"
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
                          <p className="text-[11px] font-bold text-slate-500 mt-1">
                            {order.items.length}{" "}
                            {order.items.length === 1 ? "item" : "itens"} • Total:{" "}
                            <span className="text-slate-900 font-extrabold">R$ {order.total.toFixed(2)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => tenant && handleStoreClick(tenant)}
                          className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                        >
                          Pedir Novamente
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrderForHelp(order);
                            setShowHelpModal(true);
                          }}
                          className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                        >
                          Ajuda
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
                <div className="w-20 h-20 bg-orange-50 border border-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-5 text-orange-500">
                  <ShoppingBag size={36} />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Sem pedidos ainda
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1 max-w-sm mx-auto">
                  Seus pedidos e entregas em andamento aparecerão aqui!
                </p>
                <button
                  onClick={() => setNavView("home")}
                  className="mt-6 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/25 cursor-pointer"
                >
                  Começar a Comprar
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="animate-in fade-in slide-in-from-bottom-5 duration-500 bg-slate-950 text-white flex-1 min-h-[500px]">
            {/* Top Immersive Dark Gradient Header Area */}
            <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-6 pt-8 pb-12 relative overflow-hidden">
              {/* Blur Glowing Orbs */}
              <div className="absolute top-0 right-0 w-52 h-52 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-10 left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header Top Row */}
              <div className="flex justify-between items-center mb-6 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Meu Painel KitchenFlow</span>
                <button
                  onClick={() => alert("Você não possui novas notificações no momento.")}
                  className="w-9 h-9 bg-slate-900 hover:bg-slate-800 active:scale-95 transition-all rounded-xl flex items-center justify-center border border-slate-800 relative cursor-pointer"
                >
                  <Bell size={16} className="text-slate-300" />
                  <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-slate-950 animate-pulse" />
                </button>
              </div>

              {/* Profile Main Info Card */}
              <div className="flex items-center gap-4.5 relative z-10">
                <div className="relative group">
                  <div className="absolute inset-0 bg-orange-500/30 rounded-full blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop"
                    alt="Foto do Perfil"
                    className="w-18 h-18 rounded-full border-2 border-orange-500 shadow-xl object-cover relative z-10"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black tracking-tight text-white">
                      {profile?.name || "Lucas Silva"}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {currentUser?.email || "lucas.silva@email.com"}
                  </p>
                  
                  {/* Dynamic Premium Gamified Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/15 border border-orange-500/30 text-orange-400 rounded-full text-[10px] font-black uppercase tracking-wider mt-2 shadow-sm">
                    <Sparkles size={10} className="fill-orange-400" />
                    <span>
                      {orderHistory.length > 5 ? "Cliente Black" : orderHistory.length > 2 ? "Cliente VIP" : "Cliente Premium"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Follow Order Status Bar Card */}
              <div 
                onClick={() => {
                  setNavView("orders");
                  navigate("/marketplace");
                }}
                className="mt-8 bg-slate-900/90 hover:bg-slate-850 active:scale-[0.98] transition-all border border-slate-800 backdrop-blur-md rounded-2xl p-4.5 flex items-center justify-between cursor-pointer group shadow-lg"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 bg-orange-500/15 text-orange-400 rounded-xl flex items-center justify-center border border-orange-500/25">
                    <Package size={20} strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Acompanhe seus pedidos</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Confira o status dos seus pedidos</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            {/* Overlapping White Rounded List Sheet */}
            <div className="bg-slate-900/90 border-t border-slate-800 rounded-t-[2.5rem] px-6 py-8 -mt-6 relative z-20 shadow-2xl space-y-3 text-slate-200">
              
              {/* Option: Meus Pedidos */}
              <button
                onClick={() => {
                  setNavView("orders");
                  navigate("/marketplace");
                }}
                className="flex items-center justify-between w-full p-4.5 bg-slate-950/80 hover:bg-slate-800 active:scale-[0.99] transition-all rounded-2xl group border border-slate-800 text-left cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-orange-500/15 text-orange-400 border border-orange-500/25 rounded-xl flex items-center justify-center shadow-sm">
                    <ShoppingBag size={20} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-white tracking-tight uppercase">Meus Pedidos</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Acompanhe e veja todos os seus pedidos</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Option: Endereços */}
              <button
                onClick={() => setShowAddressModal(true)}
                className="flex items-center justify-between w-full p-4.5 bg-slate-950/80 hover:bg-slate-800 active:scale-[0.99] transition-all rounded-2xl group border border-slate-800 text-left cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-xl flex items-center justify-center shadow-sm">
                    <MapPin size={20} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-white tracking-tight uppercase">Endereços</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Gerencie seus endereços de entrega</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Option: Formas de Pagamento */}
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center justify-between w-full p-4.5 bg-slate-950/80 hover:bg-slate-800 active:scale-[0.99] transition-all rounded-2xl group border border-slate-800 text-left cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-xl flex items-center justify-center shadow-sm">
                    <CreditCard size={20} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-white tracking-tight uppercase">Formas de Pagamento</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Gerencie seus cartões e pagamentos</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Option: Favoritos */}
              <button
                onClick={() => {
                  setNavView("favorites");
                  navigate("/marketplace");
                }}
                className="flex items-center justify-between w-full p-4.5 bg-slate-950/80 hover:bg-slate-800 active:scale-[0.99] transition-all rounded-2xl group border border-slate-800 text-left cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-rose-500/15 text-rose-400 border border-rose-500/25 rounded-xl flex items-center justify-center shadow-sm">
                    <Heart size={20} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-white tracking-tight uppercase">Favoritos</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Veja seus restaurantes favoritos</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Option: Configurações */}
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center justify-between w-full p-4.5 bg-slate-950/80 hover:bg-slate-800 active:scale-[0.99] transition-all rounded-2xl group border border-slate-800 text-left cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-purple-500/15 text-purple-400 border border-purple-500/25 rounded-xl flex items-center justify-center shadow-sm">
                    <Settings size={20} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-white tracking-tight uppercase">Configurações</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Preferências do app e da conta</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Option: Ajuda */}
              <button
                onClick={() => setShowHelpModal(true)}
                className="flex items-center justify-between w-full p-4.5 bg-slate-950/80 hover:bg-slate-800 active:scale-[0.99] transition-all rounded-2xl group border border-slate-800 text-left cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-sky-500/15 text-sky-400 border border-sky-500/25 rounded-xl flex items-center justify-center shadow-sm">
                    <HelpCircle size={20} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-white tracking-tight uppercase">Ajuda</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Central de ajuda e suporte</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Logout Button */}
              <div className="pt-4">
                <button
                  onClick={() => alert("Para sair da conta atual, utilize as configurações globais do aplicativo na barra lateral.")}
                  className="w-full py-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 active:scale-[0.98] transition-all text-rose-400 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut size={14} /> Sair da Conta
                </button>
              </div>

            </div>
          </section>
        )}
      </main>

      {/* Floating Modern Bottom Navigation Dock */}
      <nav className="fixed bottom-0 inset-x-0 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800 px-4 py-3 sm:py-3.5 z-50 flex justify-around items-center max-w-7xl mx-auto shadow-2xl">
        <button
          className={`flex flex-col items-center gap-1 transition-all relative px-4 py-1.5 rounded-xl cursor-pointer ${navView === "home" ? "text-orange-400 bg-orange-500/10 border border-orange-500/20" : "text-slate-400 hover:text-slate-200"}`}
          onClick={() => {
            setNavView("home");
            setActiveCategory("todos");
            navigate("/marketplace");
          }}
        >
          <Home size={20} strokeWidth={navView === "home" ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase tracking-tight">
            Início
          </span>
          {navView === "home" && (
            <motion.div
              layoutId="nav-pill"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(255,79,24,0.8)]"
            />
          )}
        </button>
        <button
          className={`flex flex-col items-center gap-1 transition-all relative px-4 py-1.5 rounded-xl cursor-pointer ${navView === "orders" ? "text-orange-400 bg-orange-500/10 border border-orange-500/20" : "text-slate-400 hover:text-slate-200"}`}
          onClick={() => {
            setNavView("orders");
            navigate("/marketplace");
          }}
        >
          <ShoppingBag
            size={20}
            strokeWidth={navView === "orders" ? 2.5 : 2}
          />
          <span className="text-[9px] font-black uppercase tracking-tight">
            Pedidos
          </span>
          {navView === "orders" && (
            <motion.div
              layoutId="nav-pill"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(255,79,24,0.8)]"
            />
          )}
        </button>
        <button
          className={`flex flex-col items-center gap-1 transition-all relative px-4 py-1.5 rounded-xl cursor-pointer ${navView === "favorites" ? "text-orange-400 bg-orange-500/10 border border-orange-500/20" : "text-slate-400 hover:text-slate-200"}`}
          onClick={() => {
            setNavView("favorites");
            navigate("/marketplace");
          }}
        >
          <Heart
            size={20}
            strokeWidth={navView === "favorites" ? 2.5 : 2}
            fill={navView === "favorites" ? "currentColor" : "none"}
          />
          <span className="text-[9px] font-black uppercase tracking-tight">
            Favoritos
          </span>
          {navView === "favorites" && (
            <motion.div
              layoutId="nav-pill"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(255,79,24,0.8)]"
            />
          )}
        </button>
        <button
          className={`flex flex-col items-center gap-1 transition-all relative px-4 py-1.5 rounded-xl cursor-pointer ${navView === "profile" ? "text-orange-400 bg-orange-500/10 border border-orange-500/20" : "text-slate-400 hover:text-slate-200"}`}
          onClick={() => {
            setNavView("profile");
            navigate("/perfil");
          }}
        >
          <UserIcon size={20} strokeWidth={navView === "profile" ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase tracking-tight">
            Perfil
          </span>
          {navView === "profile" && (
            <motion.div
              layoutId="nav-pill"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(255,79,24,0.8)]"
            />
          )}
        </button>
      </nav>

      {/* Profile Modal */}
      {showProfileModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowProfileModal(false);
          }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300 cursor-pointer"
        >
          <div 
            ref={profileModalRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-20 duration-500 cursor-default border border-slate-800/20"
          >
            <div className="p-7 pb-8 border-b bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white relative">
              <div className="absolute top-0 left-0 w-full h-full bg-orange-500/10 -translate-y-1/2 blur-[100px] pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full cursor-pointer z-30"
                title="Fechar"
              >
                <X size={18} />
              </button>

              <div className="relative z-10 text-left">
                <div className="w-14 h-14 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/25">
                  <UserIcon
                    size={28}
                    className="text-white"
                    strokeWidth={2.5}
                  />
                </div>
                <h2 className="text-xl font-black tracking-tight">
                  Seu Perfil KitchenFlow
                </h2>
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mt-1">
                  Sincronize seus dados e preferências
                </p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {!currentUser ? (
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-slate-500 text-center leading-relaxed">
                    Conecte sua conta para salvar seus favoritos, cupons e histórico com rapidez.
                  </p>
                  <button
                    onClick={async () => {
                      const { signInWithPopup, GoogleAuthProvider } =
                        await import("firebase/auth");
                      const provider = new GoogleAuthProvider();
                      try {
                        const result = await signInWithPopup(auth, provider);
                        setTempName(result.user.displayName || "");
                      } catch (err) {
                        console.error("Login error:", err);
                      }
                    }}
                    className="w-full py-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest text-slate-700 hover:bg-slate-100 transition-all active:scale-95 cursor-pointer"
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
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Avatar"
                      className="w-12 h-12 rounded-xl shadow-sm border-2 border-white"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-lg">
                      {(
                        currentUser.displayName ||
                        currentUser.email ||
                        "U"
                      ).substring(0, 1)}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                      Conectado
                    </p>
                    <p className="font-black text-slate-900 text-sm">
                      {currentUser.displayName || currentUser.email}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">
                    Nome de Exibição
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all placeholder:text-slate-400 text-slate-800"
                    placeholder="Seu nome"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">
                    WhatsApp para Contato
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all placeholder:text-slate-400 text-slate-800"
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
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98] cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Address Selection Modal */}
      {showAddressModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddressModal(false);
          }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300 cursor-pointer"
        >
          <div 
            ref={addressModalRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-20 duration-500 cursor-default border border-slate-800/20 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-7 pb-8 border-b bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white relative">
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full cursor-pointer z-30"
                title="Fechar"
              >
                <X size={18} />
              </button>

              <div className="relative z-10 text-left">
                <div className="w-14 h-14 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/25">
                  <MapPin size={28} className="text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-xl font-black tracking-tight">
                  Onde você quer receber?
                </h2>
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mt-1">
                  Selecione ou digite seu endereço de entrega
                </p>
              </div>
            </div>

            <div className="p-6 space-y-5 text-left">
              <div className="space-y-3">
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
                    className={`w-full p-4 rounded-2xl border flex items-center gap-3.5 transition-all active:scale-[0.98] cursor-pointer ${currentAddress === loc.address ? "bg-orange-500/5 border-orange-500" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${currentAddress === loc.address ? "bg-orange-500 text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200"}`}
                    >
                      <loc.icon size={18} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-black text-xs text-slate-900 uppercase tracking-tight">
                        {loc.label}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 truncate max-w-[220px]">
                        {loc.address}
                      </p>
                    </div>
                    {currentAddress === loc.address && (
                      <CheckCircle2
                        size={18}
                        className="text-orange-500 shrink-0"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* GPS button inside modal */}
              <button
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="w-full p-3.5 rounded-2xl border border-dashed border-orange-500/40 bg-orange-500/5 flex items-center justify-center gap-2.5 transition-all hover:bg-orange-500/10 active:scale-[0.98] group cursor-pointer"
              >
                <Navigation 
                  size={16} 
                  className={`text-orange-500 ${isLocating ? "animate-spin" : "group-hover:rotate-12 transition-transform duration-300"}`} 
                />
                <span className="font-black text-xs text-orange-600 uppercase tracking-wider">
                  {isLocating ? "Consultando GPS..." : "Detectar Localização por GPS"}
                </span>
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[8px] font-black uppercase text-slate-400 tracking-[0.25em] bg-white px-3">
                  Ou digite seu CEP/Endereço
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

      {/* Payment Methods Modal */}
      {showPaymentModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPaymentModal(false);
              setIsAddingCard(false);
            }
          }}
          className="fixed inset-0 bg-brand-black/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300 cursor-pointer"
        >
          <div 
            ref={paymentModalRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-brand-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-20 duration-500 cursor-default"
          >
            <div className="p-8 pb-12 border-b bg-gradient-to-r from-indigo-950 to-slate-900 text-white relative">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  setIsAddingCard(false);
                }}
                className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2.5 rounded-full cursor-pointer z-30"
                title="Fechar"
              >
                <X size={20} />
              </button>

              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center mb-5 border border-white/20">
                  <CreditCard size={32} className="text-brand-primary" strokeWidth={2.5} />
                </div>
                <h2 className="text-2xl font-black tracking-tighter text-white">
                  Formas de Pagamento
                </h2>
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1.5">
                  Gerencie seus cartões de crédito salvos
                </p>
              </div>
            </div>

            <div className="p-8 pt-6 max-h-[60vh] overflow-y-auto space-y-6 custom-scrollbar text-slate-850">
              {!isAddingCard ? (
                <>
                  {/* Cards List */}
                  <div className="space-y-3.5">
                    {paymentCards.map((card) => (
                      <div
                        key={card.id}
                        onClick={() => {
                          setPaymentCards(prev => prev.map(c => ({ ...c, active: c.id === card.id })));
                        }}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${card.active ? "bg-slate-900 text-white border-brand-primary ring-4 ring-brand-primary/10 shadow-lg" : "bg-slate-50 text-slate-800 border-slate-150 hover:bg-slate-100"}`}
                      >
                        {/* Chip design on active card */}
                        {card.active && (
                          <div className="absolute right-6 top-6 w-10 h-7 bg-amber-400/25 border border-amber-300/30 rounded-md flex items-center justify-center" />
                        )}

                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cartão de Crédito</span>
                            <p className="font-extrabold text-sm mt-0.5">{card.brand}</p>
                          </div>
                          {card.active && (
                            <span className="text-[8px] font-black uppercase tracking-wider px-2 py-1 bg-brand-primary text-white rounded-md">Ativo</span>
                          )}
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                          <p className="font-mono text-base tracking-widest font-bold">•••• •••• •••• {card.last4}</p>
                          <p className="text-xs font-bold text-slate-400">{card.expiry}</p>
                        </div>

                        <div className="mt-3.5 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          <p>{card.holder}</p>
                          {!card.active && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPaymentCards(prev => prev.filter(c => c.id !== card.id));
                              }}
                              className="text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded-md transition-all uppercase text-[8px] font-black tracking-widest mt-1"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsAddingCard(true)}
                    className="w-full py-4.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    + Adicionar Novo Cartão
                  </button>
                </>
              ) : (
                /* Add Card Form */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newCardNumber || !newCardHolder || !newCardExpiry || !newCardCVV) {
                      alert("Por favor, preencha todos os campos.");
                      return;
                    }
                    const cleanNum = newCardNumber.replace(/\s+/g, '');
                    const last4 = cleanNum.slice(-4) || "9999";
                    const brand = cleanNum.startsWith("4") ? "Visa" : cleanNum.startsWith("5") ? "Mastercard" : "Card";
                    
                    const newCardObj = {
                      id: "card_" + Date.now(),
                      brand,
                      last4,
                      holder: newCardHolder.toUpperCase(),
                      expiry: newCardExpiry,
                      active: paymentCards.length === 0
                    };

                    setPaymentCards(prev => prev.map(c => ({...c, active: false})).concat(newCardObj));
                    setNewCardNumber("");
                    setNewCardHolder("");
                    setNewCardExpiry("");
                    setNewCardCVV("");
                    setIsAddingCard(false);
                    alert("Cartão de crédito adicionado com sucesso!");
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Número do Cartão</label>
                    <input
                      type="text"
                      placeholder="4000 1234 5678 9010"
                      maxLength={19}
                      value={newCardNumber}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                        setNewCardNumber(v);
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-xl font-bold text-xs outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Nome do Titular (igual no cartão)</label>
                    <input
                      type="text"
                      placeholder="LUCAS SILVA"
                      value={newCardHolder}
                      onChange={(e) => setNewCardHolder(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-xl font-bold text-xs outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all uppercase text-slate-800"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Validade</label>
                      <input
                        type="text"
                        placeholder="MM/AA"
                        maxLength={5}
                        value={newCardExpiry}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, '');
                          if (v.length > 2) {
                            v = `${v.slice(0,2)}/${v.slice(2,4)}`;
                          }
                          setNewCardExpiry(v);
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-xl font-bold text-xs outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all text-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        maxLength={4}
                        value={newCardCVV}
                        onChange={(e) => setNewCardCVV(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-xl font-bold text-xs outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAddingCard(false)}
                      className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-4 bg-brand-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-primary/10 hover:opacity-95 transition-all cursor-pointer"
                    >
                      Salvar Cartão
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {showHelpModal && selectedOrderForHelp && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHelpModal(false);
          }}
          className="fixed inset-0 bg-brand-black/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300 cursor-pointer"
        >
          <div 
            ref={helpModalRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-brand-white w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-20 duration-500 cursor-default"
          >
            <div className="p-8 pb-12 border-b bg-rose-500 text-white relative">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2.5 rounded-full cursor-pointer z-30"
                title="Fechar"
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
