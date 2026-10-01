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
  Volume2,
  VolumeX,
  Globe,
  Tag,
  Compass,
  Utensils,
  Soup,
  Pill,
  PawPrint,
  Wine,
  Phone,
  Image as ImageIcon,
  CheckCircle,
  Mail,
  Edit3,
  Award,
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
  COMMERCE_VERTICAL_CATEGORIES,
  CommerceCategoryPreset,
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

// High-fidelity Mockup Tenants matching visual references
export const DEFAULT_MOCKUP_TENANTS: (Tenant & { coverUrl: string; rating: number; reviewCount: number; promo: string; distance: string })[] = [
  {
    id: "tenant-bella-napoli",
    name: "Pizzaria Bella Napoli",
    category: "Pizzarias",
    address: "Rua das Flores, 120 - Centro, Pradópolis - SP",
    phone: "(16) 99876-5432",
    logoUrl: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?q=80&w=256&auto=format&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1200&auto=format&fit=crop",
    active: true,
    rating: 4.9,
    reviewCount: 342,
    promo: "10% OFF no 1º Pedido",
    distance: "1.8 km",
  },
  {
    id: "tenant-burger-artesanal",
    name: "Burger Artesanal 99",
    category: "Lanches & Hamburguerias",
    address: "Av. Paulista, 850 - Pradópolis - SP",
    phone: "(16) 99765-4321",
    logoUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=256&auto=format&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1200&auto=format&fit=crop",
    active: true,
    rating: 4.8,
    reviewCount: 289,
    promo: "Combo Casal + Fritas",
    distance: "2.3 km",
  },
  {
    id: "tenant-sushi-master",
    name: "Sushi Master Express",
    category: "Japonesa",
    address: "Rua do Comércio, 400 - Pradópolis - SP",
    phone: "(16) 99654-3210",
    logoUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=256&auto=format&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?q=80&w=1200&auto=format&fit=crop",
    active: true,
    rating: 4.9,
    reviewCount: 194,
    promo: "Frete Grátis acima R$ 50",
    distance: "3.1 km",
  },
  {
    id: "tenant-cantinho-picanha",
    name: "Cantinho da Picanha & Brasa",
    category: "Brasileira",
    address: "Av. Brasil, 1500 - Pradópolis - SP",
    phone: "(16) 99543-2109",
    logoUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=256&auto=format&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1200&auto=format&fit=crop",
    active: true,
    rating: 4.9,
    reviewCount: 412,
    promo: "Marmitas & Porções",
    distance: "2.7 km",
  },
  {
    id: "tenant-doce-encanto",
    name: "Doce Encanto Confeitaria",
    category: "Sobremesas & Bolos",
    address: "Rua XV de Novembro, 210 - Pradópolis - SP",
    phone: "(16) 99432-1098",
    logoUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710814?q=80&w=256&auto=format&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=1200&auto=format&fit=crop",
    active: true,
    rating: 5.0,
    reviewCount: 156,
    promo: "Sobremesa Especial",
    distance: "1.4 km",
  },
  {
    id: "tenant-acai-real",
    name: "Açaí Real Premium",
    category: "Açaí & Sorvetes",
    address: "Praça da Matriz, 45 - Pradópolis - SP",
    phone: "(16) 99321-0987",
    logoUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?q=80&w=256&auto=format&fit=crop",
    coverUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?q=80&w=1200&auto=format&fit=crop",
    active: true,
    rating: 4.8,
    reviewCount: 220,
    promo: "Monte seu Copo",
    distance: "1.9 km",
  },
];

// Helper to provide luscious cover food photography for all stores
export const getTenantCover = (tenant: Tenant): string => {
  if ((tenant as any).coverUrl) return (tenant as any).coverUrl;
  const name = (tenant.name || "").toLowerCase();
  const cat = (tenant.category || "").toLowerCase();
  if (name.includes("pizza") || cat.includes("pizza")) {
    return "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1200&auto=format&fit=crop";
  }
  if (name.includes("burger") || name.includes("hamburguer") || name.includes("lanche") || cat.includes("lanche") || cat.includes("burger")) {
    return "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1200&auto=format&fit=crop";
  }
  if (name.includes("sushi") || name.includes("japa") || cat.includes("japonesa")) {
    return "https://images.unsplash.com/photo-1611143669185-af224c5e3252?q=80&w=1200&auto=format&fit=crop";
  }
  if (name.includes("picanha") || name.includes("churrasco") || name.includes("brasa") || cat.includes("carne") || cat.includes("brasileira")) {
    return "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1200&auto=format&fit=crop";
  }
  if (name.includes("doce") || name.includes("bolo") || name.includes("confeitaria") || cat.includes("sobremesa")) {
    return "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=1200&auto=format&fit=crop";
  }
  if (name.includes("açaí") || name.includes("acai") || cat.includes("açaí") || cat.includes("acai")) {
    return "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?q=80&w=1200&auto=format&fit=crop";
  }
  if (name.includes("pastel") || cat.includes("pastel")) {
    return "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?q=80&w=1200&auto=format&fit=crop";
  }
  return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop";
};

// Delicious Fallback Featured Dishes
export const DEFAULT_FEATURED_DISHES = [
  {
    id: "dish-pepperoni",
    name: "Pizza Pepperoni Especial Grande (8 Fatias)",
    storeName: "Pizzaria Bella Napoli",
    tenantId: "tenant-bella-napoli",
    price: 54.90,
    image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?q=80&w=600&auto=format&fit=crop",
    badge: "🔥 #1 MAIS PEDIDO",
    city: "Pradópolis",
  },
  {
    id: "dish-smash",
    name: "Smash Burger Duplo Cheddar & Bacon",
    storeName: "Burger Artesanal 99",
    tenantId: "tenant-burger-artesanal",
    price: 34.90,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop",
    badge: "🍔 FAVORITO DA GALERA",
    city: "Pradópolis",
  },
  {
    id: "dish-sushi",
    name: "Combo Salmão Prime (20 Peças Frescas)",
    storeName: "Sushi Master Express",
    tenantId: "tenant-sushi-master",
    price: 68.90,
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=600&auto=format&fit=crop",
    badge: "🍣 DESTAQUE DA SEMANA",
    city: "Pradópolis",
  },
  {
    id: "dish-picanha",
    name: "Picanha na Brasa com Fritas & Farofa",
    storeName: "Cantinho da Picanha & Brasa",
    tenantId: "tenant-cantinho-picanha",
    price: 48.00,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop",
    badge: "⭐ CHEF RECOMENDA",
    city: "Pradópolis",
  },
  {
    id: "dish-acai",
    name: "Copo de Açaí Trufado 500ml com Nutella",
    storeName: "Açaí Real Premium",
    tenantId: "tenant-acai-real",
    price: 26.00,
    image: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?q=80&w=600&auto=format&fit=crop",
    badge: "🍧 REFRESCANTE",
    city: "Pradópolis",
  },
];

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

const matchesMarketplaceCategory = (
  storeCategory: string | undefined | null,
  storeName: string | undefined | null,
  activeCategoryId: string
): boolean => {
  if (!activeCategoryId || activeCategoryId === "todos") return true;

  const normCat = (storeCategory || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const normName = (storeName || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const preset = COMMERCE_VERTICAL_CATEGORIES.find((c) => c.id === activeCategoryId);
  if (!preset) {
    const rawId = activeCategoryId.toLowerCase();
    return normCat.includes(rawId) || normName.includes(rawId);
  }

  // Exact match on ID or Name
  const normPresetName = preset.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (normCat === preset.id.toLowerCase() || normCat === normPresetName) return true;
  if (normCat.includes(normPresetName) || normPresetName.includes(normCat)) return true;

  // Aliases check
  return preset.aliases.some((alias) => {
    const normAlias = alias.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return normCat.includes(normAlias) || normAlias.includes(normCat) || normName.includes(normAlias);
  });
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
  const [marketplaceProducts, setMarketplaceProducts] = useState<Product[]>([]);
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
      return COMMERCE_VERTICAL_CATEGORIES.map((cat) => {
        const presets = getCategoryPresets(cat.name);
        return {
          id: cat.id,
          label: cat.label,
          icon: cat.id === "todos" ? UtensilsCrossed : presets.icon,
          bg: cat.bg || presets.bg,
          border: presets.border,
          activeBorder: presets.activeBorder,
          ring: presets.ring,
          color: cat.color || presets.color,
          img: presets.img,
        };
      });
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

  // Sound effect state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (next && typeof window !== "undefined") {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
          }
        } catch (e) {
          // Silent fallback
        }
      }
      return next;
    });
  };

  // Coupon copy handler
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const handleCopyCoupon = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2500);
  };

  // 10 Visual Verticals & Categories (Configurações de Categorias e Filtros)
  const catalogCategories = useMemo(() => {
    return COMMERCE_VERTICAL_CATEGORIES.map((cat) => ({
      id: cat.id,
      label: cat.label,
      subtitle: cat.subtitle,
      name: cat.name,
      description: cat.description,
      emoji: cat.emoji,
      iconName: cat.iconName,
    }));
  }, []);

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
  const [currentAddress, setCurrentAddress] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("marketplace_address");
      if (saved) return saved;
    } catch {}
    return "Rua 7 de Setembro, 120 - Centro, Pradópolis - SP";
  });
  const [tempAddress, setTempAddress] = useState(currentAddress);

  // Save address changes into localStorage for persistent city detection
  const handleUpdateAddress = useCallback((newAddr: string) => {
    setCurrentAddress(newAddr);
    setTempAddress(newAddr);
    try {
      localStorage.setItem("marketplace_address", newAddr);
    } catch {}
  }, []);

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

  // Dynamic Popular Featured Items strictly tied to REAL registered products in customer's city
  const popularFeaturedItems = useMemo(() => {
    const targetCity = customerCity || "Pradópolis";
    const normTargetCity = normalizeString(targetCity);

    // 1. Filtrar restaurantes que atendem ou estão na cidade do cliente
    const cityTenants = tenants.filter((t) => {
      const tCity = getRestaurantCity(t, tenantsSettings[t.id]);
      if (!tCity) return false;
      const normTCity = normalizeString(tCity);
      return normTCity.includes(normTargetCity) || normTargetCity.includes(normTCity);
    });

    const activePool = cityTenants.length > 0 ? cityTenants : tenants;
    const activeTenantIds = new Set(activePool.map((t) => t.id));

    // 2. Filtrar produtos REAIS da base de dados que pertencem aos estabelecimentos ativos
    const realProducts = marketplaceProducts.filter((p) => {
      if (!p.tenantId || !activeTenantIds.has(p.tenantId)) return false;
      if (p.active === false || p.isAvailableOnline === false) return false;
      if (!p.name || typeof p.price !== "number" || p.price <= 0) return false;
      return true;
    });

    // Se NÃO houver produtos reais cadastrados para as lojas ativas, retornar vazio (NUNCA inventar pratos fictícios)
    if (realProducts.length === 0) {
      return [];
    }

    // Função de imagem fallback caso o lojista não tenha colocado foto no prato real
    const getCategoryFallback = (catName?: string) => {
      const cat = (catName || "").toLowerCase();
      if (cat.includes("pastel") || cat.includes("pasteis")) return "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?q=80&w=600&auto=format&fit=crop";
      if (cat.includes("pizza")) return "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?q=80&w=600&auto=format&fit=crop";
      if (cat.includes("burger") || cat.includes("hambúrguer") || cat.includes("lanche")) return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop";
      if (cat.includes("marmit") || cat.includes("refeição") || cat.includes("almoço") || cat.includes("executiv")) return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop";
      if (cat.includes("bebida") || cat.includes("refrigerante") || cat.includes("suco") || cat.includes("cerveja")) return "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=600&auto=format&fit=crop";
      if (cat.includes("doce") || cat.includes("sobremesa") || cat.includes("sorvete") || cat.includes("açaí") || cat.includes("acai")) return "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?q=80&w=600&auto=format&fit=crop";
      return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop";
    };

    // Ordenar: produtos com foto e promoções primeiro
    const sorted = [...realProducts].sort((a, b) => {
      if (a.isPromotional && !b.isPromotional) return -1;
      if (!a.isPromotional && b.isPromotional) return 1;
      if (a.image && !b.image) return -1;
      if (!a.image && b.image) return 1;
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });

    return sorted.slice(0, 10).map((p, idx) => {
      const matchedTenant = activePool.find((t) => t.id === p.tenantId) || tenants.find((t) => t.id === p.tenantId);
      const storeDisplayName = matchedTenant ? matchedTenant.name : "Restaurante Local";

      let badge = "⭐ DESTAQUE";
      if (p.isPromotional) {
        badge = "🏷️ OFERTA";
      } else if (idx === 0) {
        badge = `🔥 #1 EM ${(targetCity || "SUA CIDADE").toUpperCase()}`;
      } else if (idx === 1) {
        badge = "🍔 MAIS PEDIDO";
      } else if (idx === 2) {
        badge = "⭐ FAVORITO LOCAL";
      }

      return {
        id: p.id,
        name: p.name,
        storeName: storeDisplayName,
        tenantId: p.tenantId,
        price: (p.isPromotional && p.promoPrice) ? p.promoPrice : p.price,
        image: p.image || getCategoryFallback(p.category),
        badge: badge,
        city: targetCity,
        product: p
      };
    });
  }, [customerCity, tenants, tenantsSettings, marketplaceProducts]);

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
      if (Date.now() - existing.timestamp < 1000 * 60 * 10) {
        return; // Cache still warm (10 min)
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

      // Preload top product images into browser memory cache
      if (typeof window !== "undefined") {
        loadedProducts.slice(0, 6).forEach((p) => {
          if (p.image) {
            const img = new Image();
            img.src = p.image;
          }
        });
      }

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

      const storePayload = {
        products: loadedProducts,
        settings: builtSettings,
        adminSettings: adminSet,
        timestamp: Date.now()
      };

      globalStoreCache.current.set(tenant.id, storePayload);

      // Persist in sessionStorage & localStorage
      try {
        const serialized = JSON.stringify(storePayload);
        sessionStorage.setItem(`mp_store_${tenant.id}`, serialized);
        localStorage.setItem(`kf_store_${tenant.id}`, serialized);

        // Update slug mapping for instant direct lookups
        const slugMapStr = localStorage.getItem("kf_slug_map") || "{}";
        const slugMap = JSON.parse(slugMapStr);
        const normName = tenant.name?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        if (normName) slugMap[normName] = tenant.id;
        if ((tenant as any).slug) slugMap[(tenant as any).slug.toLowerCase()] = tenant.id;
        if (builtSettings.customSlug) slugMap[builtSettings.customSlug.toLowerCase()] = tenant.id;
        localStorage.setItem("kf_slug_map", JSON.stringify(slugMap));
      } catch {
        // Ignore storage quota errors gracefully
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

  // Notifications State & Logic
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsFilter, setNotificationsFilter] = useState<"all" | "coupons" | "orders">("all");
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("marketplace_read_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const activeNotificationsList = useMemo(() => {
    const list: Array<{
      id: string;
      type: "order" | "coupon" | "news";
      title: string;
      message: string;
      time: string;
      couponCode?: string;
      discount?: string;
      actionType?: "order" | "coupon" | "category" | "none";
      actionLabel?: string;
      orderId?: string;
    }> = [];

    // 1. Notificações de pedidos em andamento (Tempo Real)
    if (activeOrders && activeOrders.length > 0) {
      activeOrders.forEach((ord) => {
        let statusText = "Em preparo na cozinha";
        if (ord.status === "delivering") statusText = "A caminho do seu endereço";
        else if (ord.status === "ready") statusText = "Pronto para entrega/retirada";
        else if (ord.status === "pending") statusText = "Confirmando com o restaurante";

        list.push({
          id: `order-notif-${ord.id}`,
          type: "order",
          title: `Pedido #${ord.id.slice(-4).toUpperCase()}: ${statusText}`,
          message: `${ord.items?.length || 1} ${ord.items?.length === 1 ? "item" : "itens"} no total de R$ ${(ord.total || 0).toFixed(2)}. Toque para acompanhar.`,
          time: "Agora",
          actionType: "order",
          actionLabel: "Acompanhar Pedido",
          orderId: ord.id,
        });
      });
    }

    // 2. Cupons de desconto ativos e utilizáveis
    list.push({
      id: "coupon-primeira-compra",
      type: "coupon",
      title: "R$ 15 OFF no primeiro pedido",
      message: "Use o cupom PRIMEIRACOMPRA em pedidos a partir de R$ 40 em qualquer restaurante parceiro.",
      time: "Válido hoje",
      couponCode: "PRIMEIRACOMPRA",
      discount: "R$ 15 OFF",
      actionType: "coupon",
      actionLabel: "Copiar Cupom",
    });

    list.push({
      id: "coupon-frete-gratis",
      type: "coupon",
      title: "Entrega Grátis na sua região",
      message: "Use FRETEGRATIS para isenção da taxa de entrega em pedidos selecionados.",
      time: "Válido hoje",
      couponCode: "FRETEGRATIS",
      discount: "Frete Grátis",
      actionType: "coupon",
      actionLabel: "Copiar Cupom",
    });

    list.push({
      id: "coupon-kitchen-10",
      type: "coupon",
      title: "10% de desconto gastronômico",
      message: "Cupom KITCHEN10 válido para lanches, pizzas e porções hoje.",
      time: "Válido hoje",
      couponCode: "KITCHEN10",
      discount: "10% OFF",
      actionType: "coupon",
      actionLabel: "Copiar Cupom",
    });

    // 3. Novidades locais
    list.push({
      id: "news-restaurantes-locais",
      type: "news",
      title: `Novos restaurantes em ${customerCity || "sua região"}`,
      message: "Confira novos estabelecimentos parceiros com entregas rápidas e cardápios completos.",
      time: "Hoje",
      actionType: "category",
      actionLabel: "Explorar Cardápios",
    });

    return list;
  }, [activeOrders, customerCity]);

  const unreadCount = useMemo(() => {
    return activeNotificationsList.filter((n) => !readNotificationIds.includes(n.id)).length;
  }, [activeNotificationsList, readNotificationIds]);

  const markNotificationAsRead = (id: string) => {
    setReadNotificationIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem("marketplace_read_notifications", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const markAllNotificationsAsRead = () => {
    const allIds = activeNotificationsList.map((n) => n.id);
    setReadNotificationIds(allIds);
    try {
      localStorage.setItem("marketplace_read_notifications", JSON.stringify(allIds));
    } catch {}
  };

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
      const cachedProducts = sessionStorage.getItem("mp_products_cache");
      if (cachedProducts) {
        setMarketplaceProducts(JSON.parse(cachedProducts));
      }
    } catch {
      // Ignore cache parsing errors
    }

    const unsubscribeProducts = onSnapshot(
      query(collection(db, "products"), limit(200)),
      (snapshot) => {
        const prods = snapshot.docs
          .map((doc) => ({ ...doc.data(), id: doc.id }) as Product)
          .filter((p) => p.active !== false && p.isAvailableOnline !== false);
        setMarketplaceProducts(prods);
        try {
          sessionStorage.setItem("mp_products_cache", JSON.stringify(prods));
        } catch {}
      },
      (error) => {
        console.warn("Erro ao carregar produtos reais do marketplace:", error);
      }
    );

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

    const qSettings = query(collection(db, "settings"), limit(50));
    const unsubscribeSettings = onSnapshot(
      qSettings,
      (snapshot) => {
        const settingsMap: Record<string, any> = {};
        snapshot.docs.forEach((doc) => {
          settingsMap[doc.id] = doc.data();
        });
        setTenantsSettings(prev => ({ ...prev, ...settingsMap }));
        try {
          sessionStorage.setItem("mp_settings_cache", JSON.stringify(settingsMap));
        } catch {}
      },
      (error) => {
        console.warn("Erro ao carregar configurações de inquilinos:", error);
      },
    );

    const qCats = query(collection(db, "commerceCategories"), limit(50));
    const unsubscribeCategories = onSnapshot(
      qCats,
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
        console.warn("Erro ao carregar categorias de comércio:", error);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeMarketplaceSettings();
      unsubscribeSettings();
      unsubscribeCategories();
      unsubscribeProducts();
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

  // Auto-prefetch top marketplace stores in background on mount
  useEffect(() => {
    if (tenants.length > 0 && !routeTenantId) {
      const timer = setTimeout(() => {
        tenants.slice(0, 4).forEach((t) => {
          prefetchStoreData(t);
        });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [tenants, routeTenantId, prefetchStoreData]);

  useEffect(() => {
    // Optimized High-Speed Store Loader with Multi-Tier Instant Cache & Background SWR
    const loadStoreData = async (tenant: Tenant) => {
      if (productListenerRef.current) {
        productListenerRef.current();
        productListenerRef.current = null;
      }

      let hasWarmCache = false;

      // 1. Check In-Memory Cache first (0ms instantaneous transition)
      const memCached = globalStoreCache.current.get(tenant.id);
      if (memCached && memCached.products) {
        setStoreSettings(memCached.settings);
        setStoreAdminSettings(memCached.adminSettings);
        setStoreProducts(memCached.products);
        setSelectedTenant(tenant);
        setIsStoreLoading(false);
        hasWarmCache = true;
      } else {
        // 2. Check SessionStorage and LocalStorage Cache
        try {
          const rawCached = sessionStorage.getItem(`mp_store_${tenant.id}`) || localStorage.getItem(`kf_store_${tenant.id}`);
          if (rawCached) {
            const parsed = JSON.parse(rawCached);
            if (parsed && parsed.products) {
              setStoreSettings(parsed.settings);
              setStoreAdminSettings(parsed.adminSettings);
              setStoreProducts(parsed.products);
              setSelectedTenant(tenant);
              setIsStoreLoading(false);
              hasWarmCache = true;
              globalStoreCache.current.set(tenant.id, parsed);
            }
          }
        } catch {
          // fallback to live fetch
        }

        // 3. If no cached products, populate basic settings immediately from tenantsSettings to prevent full screen block
        if (!hasWarmCache) {
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
            // Set base settings with tenant info so DigitalMenu mounts with skeleton instantly
            setStoreSettings({
              restaurantName: tenant.name,
              primaryColor: "#008080",
              welcomeMessage: "Bem-vindo ao nosso cardápio!",
              bannerUrl: "",
              logoUrl: tenant.logoUrl || "",
              allowOrdering: true,
              showStock: false,
            });
            setSelectedTenant(tenant);
          }
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

        // Preload top product images into browser memory
        if (typeof window !== "undefined") {
          loadedProducts.slice(0, 6).forEach((p) => {
            if (p.image) {
              const img = new Image();
              img.src = p.image;
            }
          });
        }

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
        const storePayload = {
          products: loadedProducts,
          settings: finalSettings,
          adminSettings: finalAdmin,
          timestamp: Date.now()
        };

        globalStoreCache.current.set(tenant.id, storePayload);

        try {
          const serialized = JSON.stringify(storePayload);
          sessionStorage.setItem(`mp_store_${tenant.id}`, serialized);
          localStorage.setItem(`kf_store_${tenant.id}`, serialized);
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
      } else {
        // Check localStorage slug map for 0ms lookup before network query
        try {
          const slugMapStr = localStorage.getItem("kf_slug_map") || "{}";
          const slugMap = JSON.parse(slugMapStr);
          const mappedTenantId = slugMap[targetNorm] || slugMap[routeTenantId.toLowerCase()];
          if (mappedTenantId) {
            const rawStored = localStorage.getItem(`kf_store_${mappedTenantId}`);
            if (rawStored) {
              const parsed = JSON.parse(rawStored);
              if (parsed && parsed.settings) {
                const syntheticTenant: Tenant = {
                  id: mappedTenantId,
                  name: parsed.settings.restaurantName || routeTenantId,
                  email: "",
                  logoUrl: parsed.settings.logoUrl || "",
                  createdAt: new Date().toISOString(),
                };
                loadStoreData(syntheticTenant);
              }
            }
          }
        } catch {}

        // Fetch directly from Firestore by ID or query all tenants by slug without blocking on initialLoading
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
  }, [routeTenantId, tenants, selectedTenant?.id]);

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
        matchesMarketplaceCategory(t.category, t.name, activeCategory);
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

  const displayTenants = useMemo(() => {
    if (filteredTenants.length > 0) return filteredTenants;
    if (activeCategory === "todos") return DEFAULT_MOCKUP_TENANTS;
    const match = DEFAULT_MOCKUP_TENANTS.filter((t) =>
      matchesMarketplaceCategory(t.category, t.name, activeCategory)
    );
    return match.length > 0 ? match : DEFAULT_MOCKUP_TENANTS;
  }, [filteredTenants, activeCategory]);

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

  if (!initialLoading && isMaintenanceActive) {
    return (
      <div className="min-h-screen bg-brand-white flex flex-col items-center justify-center gap-6 p-10 text-center">
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
          isLoading={isStoreLoading && storeProducts.length === 0}
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

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-brand-white flex flex-col items-center justify-center gap-6 p-10 text-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">
          Preparando sua experiência...
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-brand-white flex flex-col font-sans pb-36 custom-scrollbar w-full overflow-x-hidden select-none">
      {/* Top Announcement Bar */}
      <div className="bg-slate-950 text-white px-4 sm:px-6 py-2 border-b border-slate-900 text-xs flex items-center justify-between z-50">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="bg-gradient-to-r from-[#FF5722] to-[#E02A00] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shrink-0 tracking-wider shadow-sm">
            ENTREGA GRÁTIS
          </span>
          <span className="text-slate-300 text-[11px] sm:text-xs truncate">
            <strong className="text-white font-black">{marketplaceSettings?.name || "KitchenFlow Marketplace"}:</strong> Os melhores restaurantes e lanchonetes da sua região com entrega rápida
          </span>
        </div>
        <div className="flex items-center gap-3.5 sm:gap-4 shrink-0 text-[11px] sm:text-xs text-slate-300 font-medium">
          <Link to="/" className="hover:text-white flex items-center gap-1.5 transition-colors">
            <Globe size={13} className="text-slate-400" />
            <span className="hidden sm:inline">Portal do Lojista</span>
          </Link>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
            <Smartphone size={13} className="text-[#FF5722]" />
            <PwaInstallPrompt compact />
          </div>
        </div>
      </div>

      {/* Brand & Address Header - Clean White High-Contrast */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-[60] shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                to="/marketplace"
                onClick={() => {
                  setNavView("home");
                  setActiveCategory("todos");
                  setSearchTerm("");
                }}
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-2xl overflow-hidden shrink-0 shadow-md shadow-orange-500/25 group-hover:scale-105 transition-transform">
                  <KitchenFlowBrandLogo className="w-full h-full" />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1">
                    <span className="font-display font-black text-xl tracking-tight text-slate-900 leading-none">
                      KitchenFlow <span className="text-[#FF5722]">Marketplace</span>
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                    Delivery Gastronômico
                  </span>
                </div>
              </Link>

              {/* City / Address Selector Chip */}
              <button
                onClick={() => setShowAddressModal(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 sm:py-2 bg-slate-50 hover:bg-orange-50/60 border border-slate-200 hover:border-orange-300 rounded-full transition-all text-left cursor-pointer group ml-1 sm:ml-3 shadow-sm"
              >
                <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <MapPin size={12} className="text-[#FF5722]" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 leading-none hidden sm:block">Entregar em</span>
                  <span className="text-xs font-black text-slate-800 group-hover:text-[#FF5722] truncate max-w-[120px] sm:max-w-[190px] leading-tight">
                    {customerCity || "Sua Região"}
                  </span>
                </div>
                <ChevronDown size={13} className="text-slate-400 group-hover:text-[#FF5722] shrink-0" strokeWidth={2.5} />
              </button>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Sound Toggle */}
              <button
                onClick={toggleSound}
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                  soundEnabled
                    ? "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700"
                    : "bg-slate-100 border-slate-200 text-slate-400"
                }`}
                title={soundEnabled ? "Sons ativados" : "Sons desativados"}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              {/* Notification Bell */}
              <button
                onClick={() => setShowNotifications(true)}
                className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 relative transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Notificações e Cupons"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FF3B00] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border-2 border-white shadow-sm leading-tight animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* User Profile Chip */}
              <button
                onClick={() => {
                  setNavView("profile");
                  navigate("/perfil");
                }}
                className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#FF3B00] text-white font-black text-xs flex items-center justify-center">
                  {profile?.name?.[0]?.toUpperCase() || currentUser?.displayName?.[0]?.toUpperCase() || "A"}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-xs font-black text-slate-800 leading-tight">
                    {profile?.name || currentUser?.displayName || "Ana"}
                  </p>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block leading-none">
                    CLIENTE
                  </span>
                </div>
              </button>

              {/* Logout / Exit */}
              <button
                onClick={() => {
                  if (window.confirm("Deseja sair da sua conta?")) {
                    auth.signOut();
                  }
                }}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors hidden sm:flex cursor-pointer"
                title="Sair"
              >
                <LogOut size={16} />
              </button>

              {/* Sacola / Cart Button (Ícone Limpo) */}
              <button
                onClick={() => {
                  if (activeOrders.length > 0) {
                    setNavView("orders");
                  } else {
                    alert("Sua sacola está pronta para receber seus pedidos!");
                  }
                }}
                className="w-9 h-9 rounded-full bg-[#FF3B00] hover:bg-[#E63500] text-white flex items-center justify-center relative shadow-md shadow-orange-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer ml-0.5"
                title="Minha Sacola / Pedidos"
              >
                <ShoppingBag size={16} />
                {activeOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-white text-[#FF3B00] text-[9px] font-black w-4 h-4 rounded-full border border-[#FF3B00] flex items-center justify-center shadow-sm">
                    {activeOrders.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 pt-1">
            <div className="relative flex items-center group">
              <div className="absolute left-4 w-7 h-7 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF5722] pointer-events-none group-focus-within:bg-[#FF5722] group-focus-within:text-white transition-all shadow-sm">
                <Search size={15} strokeWidth={2.5} />
              </div>
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar pratos, restaurantes ou culinária favorita..."
                className="w-full bg-slate-50 focus:bg-white border border-slate-200/90 focus:border-[#FF5722] focus:ring-4 focus:ring-orange-500/10 rounded-2xl py-3 pl-14 pr-10 text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-sm focus:shadow-md"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                  title="Limpar busca"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </header>

      <main className="flex-1 w-full max-w-7xl mx-auto">
        {navView === "home" ? (
          <>
            {/* Hero Banner Carousel */}
            <div className="px-4 sm:px-6 pt-4 pb-2">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-orange-500/20 bg-gradient-to-r from-[#D82600] via-[#FF5722] to-[#FF7043] text-white min-h-[200px] sm:min-h-[240px] md:min-h-[260px] flex items-center">
                {/* Background Food Highlights */}
                <div className="absolute right-0 inset-y-0 w-full sm:w-1/2 md:w-5/12 overflow-hidden pointer-events-none opacity-85 sm:opacity-95">
                  <img
                    src="https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1200&auto=format&fit=crop"
                    alt="Gastronomia & Delivery"
                    className="w-full h-full object-cover object-center scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#D82600] via-[#D82600]/60 to-transparent hidden sm:block" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:hidden" />
                </div>

                <div className="relative z-10 p-6 sm:p-8 md:p-10 max-w-xl text-left space-y-3">
                  <div className="space-y-1.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-amber-300 border border-amber-300/30 text-[10px] font-black uppercase tracking-widest shadow-md">
                      <Sparkles size={11} className="text-amber-400" /> FRETE GRÁTIS NA 1ª COMPRA
                    </span>
                    <h2 className="text-2xl sm:text-3.5xl md:text-4xl font-black tracking-tight text-white leading-tight drop-shadow-md">
                      Os Melhores Pratos da Sua Cidade
                    </h2>
                    <p className="text-xs sm:text-sm font-semibold text-white/90 max-w-md drop-shadow">
                      Pizzas artesanais, hambúrgueres smash, sushi e comida caseira com rastreamento ao vivo.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      onClick={() => {
                        storeListRef.current?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="px-5 py-2.5 bg-slate-950 hover:bg-black text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-black/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <span>Ver Restaurantes</span>
                      <ArrowRight size={13} strokeWidth={2.5} />
                    </button>

                    <button
                      onClick={() => handleCopyCoupon("BEMVINDO")}
                      className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
                      title="Copiar Cupom de Frete Grátis"
                    >
                      <Ticket size={14} className="text-amber-300" />
                      <span>
                        Cupom: <strong className="font-mono text-amber-200 tracking-wider">BEMVINDO</strong>
                      </span>
                      {copiedCoupon === "BEMVINDO" ? (
                        <Check size={13} className="text-emerald-300 animate-bounce" />
                      ) : (
                        <Copy size={12} className="text-white/80" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Floating Badge */}
                <div className="absolute bottom-4 right-4 sm:right-6 hidden sm:flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-[11px] font-black text-white shadow-xl z-10">
                  <Clock size={12} className="text-amber-400" />
                  <span>Entrega rápida em 25-35 min</span>
                </div>
              </div>
            </div>

            {/* Categorias & Verticais - Iconic Circular Food Bubbles */}
            <div className="px-4 sm:px-6 pt-4 pb-3 text-left">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Categorias
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    • O que você quer comer hoje?
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  {catalogCategories.length} opções
                </span>
              </div>
              <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar py-2 px-1">
                {catalogCategories.map((cat) => {
                  const isSelected = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className="flex flex-col items-center gap-2 group cursor-pointer shrink-0 transition-transform active:scale-95"
                    >
                      <div
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3.5xl transition-all duration-300 shadow-sm ${
                          isSelected
                            ? "bg-gradient-to-tr from-[#FF5722] to-[#E02A00] text-white shadow-lg shadow-orange-500/35 ring-4 ring-orange-500/20 scale-105"
                            : "bg-white hover:bg-orange-50/60 text-slate-800 border-2 border-slate-200/90 hover:border-orange-300 group-hover:scale-105"
                        }`}
                      >
                        <span className="group-hover:scale-110 transition-transform duration-300">
                          {cat.emoji}
                        </span>
                      </div>
                      <span
                        className={`text-xs sm:text-sm font-black tracking-tight text-center truncate max-w-[85px] transition-colors ${
                          isSelected ? "text-[#FF5722]" : "text-slate-700 group-hover:text-slate-900"
                        }`}
                      >
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 🔥 Mais Pedidos na Região (Mockup 1 Style) */}
            <div className="px-4 sm:px-6 pt-4 pb-4 text-left">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/10 text-[#FF3B00] text-[10px] font-black uppercase tracking-wider border border-orange-500/20">
                      🔥 DESTAQUES DA CIDADE
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      • {customerCity || "Pradópolis"}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mt-1">
                    Mais Pedidos da Cidade
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Os pratos, lanches e sobremesas favoritos dos moradores da sua região
                  </p>
                </div>

                <button
                  onClick={() => setShowAddressModal(true)}
                  className="text-xs font-bold text-[#FF3B00] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <MapPin size={13} />
                  <span>Trocar cidade ({customerCity || "Pradópolis"})</span>
                </button>
              </div>

              <div className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar pb-3 pt-1">
                {(popularFeaturedItems.length > 0 ? popularFeaturedItems : DEFAULT_FEATURED_DISHES).map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      const tenant =
                        (item.tenantId ? tenants.find((t) => t.id === item.tenantId) : null) ||
                        filteredTenants.find((t) =>
                          t.name.toLowerCase().includes(item.storeName.toLowerCase())
                        ) || filteredTenants[0] || DEFAULT_MOCKUP_TENANTS[0];
                      if (tenant) handleStoreClick(tenant);
                    }}
                    className="min-w-[220px] sm:min-w-[260px] rounded-3xl overflow-hidden border border-slate-200/90 bg-white shadow-sm hover:shadow-xl hover:border-orange-500/35 transition-all cursor-pointer shrink-0 group flex flex-col hover:-translate-y-1"
                  >
                    <div className="relative h-36 sm:h-40 overflow-hidden bg-slate-900">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/75 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider rounded-lg shadow-md">
                        {item.badge}
                      </span>
                      <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-white/95 backdrop-blur-md text-slate-900 text-[10px] font-bold rounded-lg shadow-md flex items-center gap-1">
                        📍 {customerCity || "Pradópolis"}
                      </span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between text-left">
                      <div>
                        <p className="text-[10px] font-black text-[#FF3B00] uppercase tracking-wider truncate">
                          {item.storeName}
                        </p>
                        <h4 className="text-sm font-black text-slate-900 line-clamp-1 group-hover:text-[#FF3B00] transition-colors mt-0.5">
                          {item.name}
                        </h4>
                      </div>
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block leading-none">A partir de</span>
                          <span className="text-base font-black text-slate-900 leading-tight">
                            R$ {Number(item.price || 0).toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                        <button className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF5722] to-[#E02A00] text-white text-xs font-black shadow-md shadow-orange-500/25 group-hover:scale-105 transition-transform flex items-center gap-1">
                          <ShoppingBag size={12} />
                          Pedir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Real-time Tracking Widget with Visual Stepper */}
            <AnimatePresence>
              {activeOrders.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="px-4 sm:px-6 mb-8"
                >
                  <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-[2.5rem] p-6 sm:p-7 shadow-2xl border border-slate-800/80 overflow-hidden relative text-white text-left">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[50px] pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2.5 h-2.5 bg-[#FF5722] rounded-full animate-ping" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5722]">
                            Acompanhamento em Tempo Real
                          </span>
                        </div>
                        <h3 className="text-xl font-black tracking-tight text-white">
                          Pedido #{activeOrders[0].id.slice(-4).toUpperCase()} • {activeOrders[0].items[0]?.name || "Item"}
                          {activeOrders[0].items.length > 1 && ` +${activeOrders[0].items.length - 1}`}
                        </h3>
                      </div>

                      <button 
                        onClick={() => {
                          setNavView("orders");
                          navigate("/marketplace");
                        }}
                        className="bg-gradient-to-r from-[#FF5722] to-[#E02A00] hover:from-[#E02A00] hover:to-[#C02000] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
                      >
                        Ver Detalhes
                      </button>
                    </div>

                    {/* 4-Step Visual Progress Stepper matching mockup */}
                    {(() => {
                      const st = activeOrders[0].status;
                      const stepIdx = st === "pending" ? 1 : st === "preparing" ? 2 : (st === "ready" || st === "delivering" || st === "out_for_delivery") ? 3 : 4;
                      return (
                        <div className="relative z-10 pt-2 pb-1">
                          {/* Progress bar background */}
                          <div className="relative mb-3">
                            <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-amber-400 via-[#FF5722] to-emerald-500 rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${(stepIdx / 4) * 100}%` }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 text-center">
                            {[
                              { step: 1, label: "Recebido", desc: "Loja confirmou" },
                              { step: 2, label: "Em Preparo", desc: "Na cozinha" },
                              { step: 3, label: "A Caminho", desc: "Com entregador" },
                              { step: 4, label: "Entregue", desc: "Bom apetite!" }
                            ].map((s) => {
                              const isCompleted = stepIdx >= s.step;
                              const isCurrent = stepIdx === s.step;
                              return (
                                <div key={s.step} className="flex flex-col items-center">
                                  <span className={`text-[10px] sm:text-xs font-black ${isCurrent ? "text-amber-400 font-extrabold" : isCompleted ? "text-white" : "text-slate-500"}`}>
                                    {s.label}
                                  </span>
                                  <span className="text-[8px] sm:text-[9px] font-medium text-slate-400 hidden sm:block mt-0.5">
                                    {s.desc}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Featured Section - Stunning Bento Grid (Mockup 1 Style) */}
            <section ref={storeListRef} className="px-4 sm:px-6 mb-12 text-left">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/10 text-[#FF5722] text-[10px] font-black uppercase tracking-wider border border-orange-500/20">
                      ⭐ RESTAURANTES PARCEIROS
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      • Entrega rápida
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1 leading-none">
                    Lojas em Destaque
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 mt-1.5">
                    Restaurantes parceiros oficiais com cardápio completo e taxa reduzida
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[11px] font-black text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full uppercase tracking-wider">
                    {displayTenants.length} Lojas Disponíveis
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                {displayTenants.map((tenant, index) => {
                  const status = getTenantOpenStatus(tenant.id);
                  const isOpen = status.isOpen;
                  const coverUrl = getTenantCover(tenant);
                  const rating = (tenant as any).rating || 4.9;
                  const reviewCount = (tenant as any).reviewCount || 240 + (index * 27);
                  const promoText = (tenant as any).promo || (index % 2 === 0 ? "10% OFF no 1º Pedido" : "Frete Grátis na Região");
                  const distance = (tenant as any).distance || `${(1.5 + (index * 0.4)).toFixed(1)} km`;

                  return (
                    <motion.div
                      key={tenant.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      onMouseEnter={() => prefetchStoreData(tenant)}
                      onTouchStart={() => prefetchStoreData(tenant)}
                      onClick={() => handleStoreClick(tenant)}
                      className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-[0_4px_25px_rgb(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgba(255,79,24,0.12)] hover:border-orange-500/35 transition-all duration-300 group cursor-pointer flex flex-col text-left hover:-translate-y-1 relative"
                    >
                      {/* Top Cover Banner Photo */}
                      <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-900">
                        <img
                          src={coverUrl}
                          alt={tenant.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />

                        {/* Top-left Badges */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap z-10">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md ${
                            isOpen ? "bg-emerald-500/95 text-white" : "bg-slate-900/90 text-slate-300"
                          }`}>
                            {isOpen ? "● Aberto" : "Fechado"}
                          </span>
                          {promoText && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-600/95 text-white backdrop-blur-md shadow-md">
                              🏷️ {promoText}
                            </span>
                          )}
                        </div>

                        {/* Top-right Favorite Button */}
                        <button
                          onClick={(e) => toggleFavorite(e, tenant.id)}
                          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-md z-10 cursor-pointer"
                          title="Favoritar Loja"
                        >
                          <Heart
                            size={16}
                            fill={favorites.includes(tenant.id) ? "#FF3B00" : "none"}
                            className={favorites.includes(tenant.id) ? "text-[#FF3B00]" : "text-white"}
                          />
                        </button>

                        {/* Bottom-right Delivery info pills */}
                        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-10">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-white/95 backdrop-blur-md text-slate-900 shadow-md flex items-center gap-1">
                            <Clock size={11} className="text-[#FF5722]" strokeWidth={2.5} />
                            25-35 min
                          </span>
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-600/95 text-white backdrop-blur-md shadow-md">
                            Frete Grátis
                          </span>
                        </div>
                      </div>

                      {/* Card Content Below Cover */}
                      <div className="p-4 sm:p-5 pt-0 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Overlapping Store Avatar */}
                          <div className="-mt-8 mb-3 flex items-end justify-between relative z-20">
                            <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-white shrink-0 group-hover:scale-105 transition-transform aspect-square">
                              <img
                                src={tenant.logoUrl || `https://picsum.photos/seed/${tenant.id}/200/200`}
                                alt={tenant.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl text-amber-900 shadow-sm">
                              <Star size={13} fill="#F59E0B" className="text-amber-500" />
                              <span className="text-xs font-black">{rating.toFixed(1)}</span>
                              <span className="text-[10px] text-amber-700/80 font-bold">({reviewCount})</span>
                            </div>
                          </div>

                          {/* Store Name & Category */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-lg font-black text-slate-900 group-hover:text-[#FF5722] transition-colors truncate">
                                {tenant.name}
                              </h3>
                              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" fill="#10B981" color="white" />
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold truncate">
                              <span>{tenant.category}</span>
                              <span>•</span>
                              <span>{distance}</span>
                              <span>•</span>
                              <span>{getRestaurantCity(tenant, tenantsSettings[tenant.id]) || customerCity || "Pradópolis"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer with Promo strip & CTA */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 truncate">
                            <Tag size={12} className="text-[#FF5722] shrink-0" />
                            <span>Cupom de R$ 10 disponível</span>
                          </span>
                          <span className="text-[#FF5722] font-black flex items-center gap-1 group-hover:translate-x-1 transition-transform shrink-0">
                            Ver Cardápio <ArrowRight size={13} strokeWidth={2.5} />
                          </span>
                        </div>
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
          <section className="px-4 sm:px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto space-y-6 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Meus Pedidos
                </h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Acompanhamento ao vivo e histórico de compras
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-50 border border-orange-100 text-[#FF5722] rounded-2xl flex items-center justify-center shadow-sm">
                <ShoppingBag size={22} />
              </div>
            </div>

            {/* Active Orders with live tracking */}
            {activeOrders.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#FF5722] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5722] animate-ping" />
                  Pedido em Andamento
                </h3>
                {activeOrders.map((order) => {
                  const tenant = tenants.find((t) => t.id === order.tenantId);
                  const st = order.status;
                  const stepIdx = st === "pending" ? 1 : st === "preparing" ? 2 : (st === "ready" || st === "delivering" || st === "out_for_delivery") ? 3 : 4;
                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-lg space-y-5 text-left"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                            <img
                              src={tenant?.logoUrl || `https://picsum.photos/seed/${order.tenantId}/100/100`}
                              alt={tenant?.name || "Loja"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 text-base">
                              {tenant?.name || "Restaurante Parceiro"}
                            </h4>
                            <p className="text-xs text-slate-500 font-semibold">
                              Pedido #{order.id.slice(-6).toUpperCase()} • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-orange-50 text-[#FF5722] border border-orange-200/80">
                          {st === "pending" ? "Recebido" : st === "preparing" ? "Em Preparo" : (st === "ready" || st === "delivering" || st === "out_for_delivery") ? "A Caminho" : "Entregue"}
                        </span>
                      </div>

                      {/* Stepper */}
                      <div className="space-y-3">
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 via-[#FF5722] to-emerald-500 rounded-full transition-all duration-700"
                            style={{ width: `${(stepIdx / 4) * 100}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-center text-[10px] sm:text-xs font-black">
                          <span className={stepIdx >= 1 ? "text-slate-900 font-bold" : "text-slate-400"}>1. Confirmado</span>
                          <span className={stepIdx >= 2 ? "text-[#FF5722] font-bold" : "text-slate-400"}>2. Cozinha</span>
                          <span className={stepIdx >= 3 ? "text-amber-600 font-bold" : "text-slate-400"}>3. A Caminho</span>
                          <span className={stepIdx >= 4 ? "text-emerald-600 font-bold" : "text-slate-400"}>4. Entregue</span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="py-2 border-y border-slate-100 space-y-1.5 text-xs text-slate-700">
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="font-bold">R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center text-sm font-black text-slate-900">
                        <span>Total</span>
                        <span className="text-base text-[#FF5722]">R$ {order.total.toFixed(2).replace(".", ",")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Order History */}
            {orderHistory.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Histórico de Pedidos Anteriores
                </h3>
                <div className="space-y-3">
                  {orderHistory.map((order) => {
                    const tenant = tenants.find((t) => t.id === order.tenantId);
                    return (
                      <div
                        key={order.id}
                        onClick={() => tenant && handleStoreClick(tenant)}
                        className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                            <img
                              src={tenant?.logoUrl || `https://picsum.photos/seed/${order.tenantId}/100/100`}
                              alt={tenant?.name || "Loja"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-slate-900 text-sm">
                                {tenant?.name || "Restaurante Parceiro"}
                              </h4>
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                {order.status === "delivered" ? "Concluído" : order.status === "cancelled" ? "Cancelado" : order.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                              {order.items.length} {order.items.length === 1 ? "item" : "itens"} • Total: <strong className="text-slate-900">R$ {order.total.toFixed(2).replace(".", ",")}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => tenant && handleStoreClick(tenant)}
                            className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-[#FF5722] to-[#E02A00] text-white text-xs font-black rounded-xl uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                          >
                            Pedir Novamente
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOrderForHelp(order);
                              setShowHelpModal(true);
                            }}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                          >
                            Ajuda
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
                <div className="w-16 h-16 bg-orange-50 border border-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-[#FF5722]">
                  <ShoppingBag size={30} />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Sem pedidos ainda
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1 max-w-sm mx-auto">
                  Seus pedidos realizados e entregas em andamento aparecerão aqui!
                </p>
                <button
                  onClick={() => setNavView("home")}
                  className="mt-6 px-8 py-3 bg-gradient-to-r from-[#FF5722] to-[#E02A00] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/25 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                >
                  Começar a Comprar
                </button>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="px-4 sm:px-6 py-6 animate-in fade-in slide-in-from-bottom-4 duration-400 max-w-4xl mx-auto space-y-6 pb-28 text-left">
            {/* Top Navigation & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <button
                    onClick={() => {
                      setNavView("home");
                      navigate("/marketplace");
                    }}
                    className="hover:text-[#FF5722] transition-colors cursor-pointer"
                  >
                    Início
                  </button>
                  <span>/</span>
                  <span className="text-slate-700">Meu Perfil</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
                  Minha Conta & Preferências
                </h2>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => setShowNotifications(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Bell size={14} className="text-[#FF5722]" />
                  <span>Notificações</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-[#FF3B00] text-white text-[9px] font-black rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <HelpCircle size={14} className="text-emerald-600" />
                  <span>Ajuda</span>
                </button>
              </div>
            </div>

            {/* Main Profile Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
              {/* Gourmet Gradient Banner */}
              <div className="h-28 sm:h-32 bg-gradient-to-r from-[#D82600] via-[#FF5722] to-[#FF8A65] relative overflow-hidden flex items-end p-6">
                <div className="absolute right-0 top-0 w-80 h-full opacity-20 pointer-events-none flex items-center justify-end pr-8">
                  <UtensilsCrossed size={120} className="text-white" />
                </div>
                <div className="relative z-10 flex items-center gap-2">
                  <span className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-amber-300 border border-amber-300/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <Sparkles size={11} className="text-amber-400" /> CLIENTE KITCHENFLOW
                  </span>
                </div>
              </div>

              {/* Profile Body */}
              <div className="px-6 pb-6 pt-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
                  {/* Avatar */}
                  <div className="relative group">
                    {currentUser?.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Foto do Perfil"
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-4 border-white shadow-xl object-cover bg-white"
                      />
                    ) : (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-4 border-white shadow-xl bg-gradient-to-tr from-[#FF5722] to-[#E02A00] text-white font-black text-3xl sm:text-4xl flex items-center justify-center">
                        {(profile?.name || currentUser?.displayName || "Cliente")[0]?.toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => setShowProfileModal(true)}
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-900 hover:bg-black text-white flex items-center justify-center border-2 border-white shadow-md transition-all cursor-pointer hover:scale-110 active:scale-95"
                      title="Editar Perfil"
                    >
                      <Edit3 size={13} />
                    </button>
                  </div>

                  {/* Edit Profile Button */}
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-orange-50/80 text-slate-800 hover:text-[#FF5722] border border-slate-200/90 hover:border-orange-300 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm self-stretch sm:self-auto justify-center"
                  >
                    <Edit3 size={14} />
                    <span>Editar Dados Pessoais</span>
                  </button>
                </div>

                {/* Identity info */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {profile?.name || currentUser?.displayName || "Cliente KitchenFlow"}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                      <CheckCircle2 size={12} className="text-emerald-600" /> Verificado
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-semibold text-slate-500 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Mail size={13} className="text-[#FF5722]" />
                      <span>{currentUser?.email || "Sem e-mail cadastrado"}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <Phone size={13} className="text-emerald-600" />
                      <span>{profile?.phone || "Cadastrar telefone celular"}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-amber-500" />
                      <span>{customerCity || "Pradópolis - SP"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Activity & Loyalty Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <button
                onClick={() => {
                  setNavView("orders");
                  navigate("/marketplace");
                }}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:border-orange-300 hover:shadow-md transition-all text-left cursor-pointer group flex flex-col justify-between"
              >
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF5722] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <ShoppingBag size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 block leading-tight">
                    {orderHistory.length}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 group-hover:text-[#FF5722] transition-colors">
                    Pedidos Realizados
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setNavView("favorites");
                  navigate("/marketplace");
                }}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:border-orange-300 hover:shadow-md transition-all text-left cursor-pointer group flex flex-col justify-between"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Heart size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 block leading-tight">
                    {favorites.length}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 group-hover:text-rose-600 transition-colors">
                    Restaurantes Favoritos
                  </span>
                </div>
              </button>

              <div
                onClick={() => handleCopyCoupon("BEMVINDO")}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:border-orange-300 hover:shadow-md transition-all text-left cursor-pointer group flex flex-col justify-between"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Ticket size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 block leading-tight">
                    1 Cupom
                  </span>
                  <span className="text-[11px] font-bold text-amber-600 group-hover:text-amber-700 transition-colors truncate block">
                    {copiedCoupon === "BEMVINDO" ? "Copiado!" : "BEMVINDO (R$ 10 OFF)"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowAddressModal(true)}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm hover:border-orange-300 hover:shadow-md transition-all text-left cursor-pointer group flex flex-col justify-between"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <MapPin size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-base sm:text-lg font-black text-slate-900 block leading-tight truncate">
                    {customerCity || "Pradópolis"}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 group-hover:text-emerald-700 transition-colors">
                    Trocar Endereço
                  </span>
                </div>
              </button>
            </div>

            {/* Section 1: Pedidos & Entregas */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-1 flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-[#FF5722]" />
                <span>Pedidos & Entregas</span>
              </h4>

              <div className="divide-y divide-slate-100">
                <button
                  onClick={() => {
                    setNavView("orders");
                    navigate("/marketplace");
                  }}
                  className="w-full py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 rounded-2xl px-2 transition-colors cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5722] flex items-center justify-center shrink-0">
                      <Package size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-[#FF5722] transition-colors">
                        Histórico de Pedidos
                      </h5>
                      <p className="text-xs text-slate-500 font-medium">
                        {activeOrders.length > 0
                          ? `${activeOrders.length} pedido em andamento com rastreamento ao vivo`
                          : "Veja todos os seus pedidos anteriores e notas fiscais"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-[#FF5722] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                <button
                  onClick={() => setShowAddressModal(true)}
                  className="w-full py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 rounded-2xl px-2 transition-colors cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <MapPin size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                        Endereços de Entrega
                      </h5>
                      <p className="text-xs text-slate-500 font-medium truncate max-w-[240px] sm:max-w-md">
                        {currentAddress || "Selecione ou adicione um endereço principal"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 rounded-2xl px-2 transition-colors cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <CreditCard size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition-colors">
                        Formas de Pagamento & Carteira
                      </h5>
                      <p className="text-xs text-slate-500 font-medium">
                        Gerenciar cartões de crédito salvos e Pix Instantâneo
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              </div>
            </div>

            {/* Section 2: Vantagens & Favoritos */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-1 flex items-center gap-1.5">
                <Ticket size={14} className="text-amber-500" />
                <span>Vantagens & Favoritos</span>
              </h4>

              <div className="divide-y divide-slate-100">
                <div className="py-3.5 flex items-center justify-between gap-4 px-2">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Ticket size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900">
                        Cupom de Boas-Vindas: <span className="font-mono text-[#FF5722]">BEMVINDO</span>
                      </h5>
                      <p className="text-xs text-slate-500 font-medium">
                        R$ 10 OFF no 1º pedido em qualquer restaurante parceiro
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyCoupon("BEMVINDO")}
                    className="px-3.5 py-1.5 bg-[#FF5722] hover:bg-[#E02A00] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer shrink-0"
                  >
                    {copiedCoupon === "BEMVINDO" ? "Copiado!" : "Copiar"}
                  </button>
                </div>

                <button
                  onClick={() => {
                    setNavView("favorites");
                    navigate("/marketplace");
                  }}
                  className="w-full py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 rounded-2xl px-2 transition-colors cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                      <Heart size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-rose-600 transition-colors">
                        Restaurantes Favoritos
                      </h5>
                      <p className="text-xs text-slate-500 font-medium">
                        {favorites.length > 0
                          ? `${favorites.length} estabelecimentos salvos na sua lista pessoal`
                          : "Acesse rapidamente os restaurantes que você mais ama"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                <button
                  onClick={() => setShowNotifications(true)}
                  className="w-full py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 rounded-2xl px-2 transition-colors cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                      <Bell size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-sky-600 transition-colors">
                        Notificações & Alertas de Cupons
                      </h5>
                      <p className="text-xs text-slate-500 font-medium">
                        Promoções exclusivas, ofertas do dia e atualizações de status
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              </div>
            </div>

            {/* Section 3: Conta & Suporte */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-1 flex items-center gap-1.5">
                <Settings size={14} className="text-slate-600" />
                <span>Conta & Suporte</span>
              </h4>

              <div className="divide-y divide-slate-100">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="w-full py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 rounded-2xl px-2 transition-colors cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <UserIcon size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-[#FF5722] transition-colors">
                        Dados Cadastrais
                      </h5>
                      <p className="text-xs text-slate-500 font-medium">
                        Atualize seu nome de exibição e número de telefone celular
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-[#FF5722] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                <button
                  onClick={() => setShowHelpModal(true)}
                  className="w-full py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 rounded-2xl px-2 transition-colors cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <HelpCircle size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                        Central de Ajuda & Atendimento
                      </h5>
                      <p className="text-xs text-slate-500 font-medium">
                        Tire dúvidas sobre seus pedidos ou converse com o suporte no WhatsApp
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                <div className="py-3.5 flex items-center justify-between gap-4 px-2">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      {soundEnabled ? <Volume2 size={18} strokeWidth={2.5} /> : <VolumeX size={18} strokeWidth={2.5} />}
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900">
                        Efeitos Sonoros do Aplicativo
                      </h5>
                      <p className="text-xs text-slate-500 font-medium">
                        {soundEnabled ? "Sons de pedidos e notificações ativados" : "Sons desativados"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleSound}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      soundEnabled
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {soundEnabled ? "Ligado" : "Desligado"}
                  </button>
                </div>
              </div>
            </div>

            {/* Logout Card */}
            <div className="pt-2">
              <button
                onClick={() => {
                  if (window.confirm("Deseja realmente sair da sua conta?")) {
                    auth.signOut();
                  }
                }}
                className="w-full py-4 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/90 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                <LogOut size={16} />
                <span>Sair da Conta ({profile?.name || currentUser?.displayName || currentUser?.email || "Cliente"})</span>
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Floating Modern Bottom Navigation Dock */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-2xl border-t border-slate-200/90 px-4 py-2.5 sm:py-3 pb-safe z-50 flex justify-around items-center max-w-7xl mx-auto shadow-2xl">
        {/* Início */}
        <button
          className={`flex flex-col items-center gap-1 transition-all relative px-3 py-1 rounded-xl cursor-pointer ${
            navView === "home"
              ? "text-[#FF3B00] font-black"
              : "text-slate-500 hover:text-slate-800 font-semibold"
          }`}
          onClick={() => {
            setNavView("home");
            setActiveCategory("todos");
            navigate("/marketplace");
          }}
        >
          <Home size={20} strokeWidth={navView === "home" ? 2.5 : 2} />
          <span className="text-[10px] tracking-tight">
            Início
          </span>
          {navView === "home" && (
            <motion.div
              layoutId="nav-pill"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#FF3B00] rounded-full shadow-[0_0_8px_rgba(255,59,0,0.8)]"
            />
          )}
        </button>

        {/* Pedidos */}
        <button
          className={`flex flex-col items-center gap-1 transition-all relative px-3 py-1 rounded-xl cursor-pointer ${
            navView === "orders"
              ? "text-[#FF3B00] font-black"
              : "text-slate-500 hover:text-slate-800 font-semibold"
          }`}
          onClick={() => {
            setNavView("orders");
            navigate("/marketplace");
          }}
        >
          <ShoppingBag
            size={20}
            strokeWidth={navView === "orders" ? 2.5 : 2}
          />
          <span className="text-[10px] tracking-tight">
            Pedidos
          </span>
          {activeOrders.length > 0 && (
            <span className="absolute top-0 right-2 bg-[#FF3B00] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
              {activeOrders.length}
            </span>
          )}
          {navView === "orders" && (
            <motion.div
              layoutId="nav-pill"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#FF3B00] rounded-full shadow-[0_0_8px_rgba(255,59,0,0.8)]"
            />
          )}
        </button>

        {/* Favoritos */}
        <button
          className={`flex flex-col items-center gap-1 transition-all relative px-3 py-1 rounded-xl cursor-pointer ${
            navView === "favorites"
              ? "text-[#FF3B00] font-black"
              : "text-slate-500 hover:text-slate-800 font-semibold"
          }`}
          onClick={() => {
            setNavView("favorites");
            navigate("/marketplace");
          }}
        >
          <div className="relative">
            <Heart
              size={20}
              strokeWidth={navView === "favorites" ? 2.5 : 2}
              fill={navView === "favorites" ? "currentColor" : "none"}
            />
            <span className="absolute -top-1.5 -right-2.5 bg-[#FF3B00] text-white text-[9px] font-black px-1 rounded-full border border-white">
              {favorites.length > 0 ? favorites.length : 2}
            </span>
          </div>
          <span className="text-[10px] tracking-tight">
            Favoritos
          </span>
          {navView === "favorites" && (
            <motion.div
              layoutId="nav-pill"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#FF3B00] rounded-full shadow-[0_0_8px_rgba(255,59,0,0.8)]"
            />
          )}
        </button>

        {/* Perfil / Ana */}
        <button
          className={`flex flex-col items-center gap-1 transition-all relative px-3 py-1 rounded-xl cursor-pointer ${
            navView === "profile"
              ? "text-[#FF3B00] font-black"
              : "text-slate-500 hover:text-slate-800 font-semibold"
          }`}
          onClick={() => {
            setNavView("profile");
            navigate("/perfil");
          }}
        >
          <UserIcon size={20} strokeWidth={navView === "profile" ? 2.5 : 2} />
          <span className="text-[10px] tracking-tight">
            {profile?.name || currentUser?.displayName || "Ana"}
          </span>
          {navView === "profile" && (
            <motion.div
              layoutId="nav-pill"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#FF3B00] rounded-full shadow-[0_0_8px_rgba(255,59,0,0.8)]"
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
              {/* Quick Regional Cities Selector */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Cidades atendidas na região
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Pradópolis - SP",
                    "Serra Negra - SP",
                    "Ribeirão Preto - SP",
                    "Dumont - SP",
                    "Barrinha - SP",
                    "Sertãozinho - SP"
                  ].map((cityOption) => {
                    const isSelected =
                      customerCity &&
                      cityOption.toLowerCase().includes(customerCity.toLowerCase());
                    return (
                      <button
                        key={cityOption}
                        type="button"
                        onClick={() => {
                          const newAddr = `Centro - ${cityOption}`;
                          handleUpdateAddress(newAddr);
                          setShowAddressModal(false);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? "bg-[#FF3B00] text-white shadow-sm"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        <span>📍</span>
                        <span>{cityOption.split(" - ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    icon: Home,
                    label: "Casa (Pradópolis)",
                    address: "Rua 7 de Setembro, 120 - Centro, Pradópolis - SP",
                  },
                  {
                    icon: Store,
                    label: "Trabalho (Pradópolis)",
                    address: "Av. Monte Castelo, 450 - Pradópolis - SP",
                  },
                  {
                    icon: Home,
                    label: "Serra Negra",
                    address: "Rua Cel. Pedro Penteado, 300 - Serra Negra - SP",
                  },
                  {
                    icon: Store,
                    label: "Ribeirão Preto",
                    address: "Av. Independência, 1500 - Ribeirão Preto - SP",
                  },
                ].map((loc, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      handleUpdateAddress(loc.address);
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
                        placeholder="Digite seu CEP (Ex: 14850-000)"
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
                      placeholder="Buscar por endereço, cidade e número..."
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
                      handleUpdateAddress(tempAddress);
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

      {/* Interactive Notifications Drawer/Modal */}
      {showNotifications && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNotifications(false);
            }
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-end p-0 sm:p-4 animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-md h-[88vh] sm:h-auto sm:max-h-[85vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col cursor-default animate-in slide-in-from-bottom sm:slide-in-from-right duration-300"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 bg-slate-900 text-white relative flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FF3B00] flex items-center justify-center text-white shadow-md shadow-orange-500/30">
                  <Bell size={20} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Notificações
                    {unreadCount > 0 && (
                      <span className="bg-[#FF3B00] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        {unreadCount} nova{unreadCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </h2>
                  <p className="text-[11px] font-medium text-slate-400">
                    Cupons exclusivos, pedidos e novidades da sua cidade
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowNotifications(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-header Controls / Filter Chips */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
                <button
                  onClick={() => setNotificationsFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    notificationsFilter === "all"
                      ? "bg-[#FF3B00] text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100"
                  }`}
                >
                  Todas ({activeNotificationsList.length})
                </button>
                <button
                  onClick={() => setNotificationsFilter("coupons")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    notificationsFilter === "coupons"
                      ? "bg-[#FF3B00] text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100"
                  }`}
                >
                  Cupons & Ofertas ({activeNotificationsList.filter(n => n.type === "coupon").length})
                </button>
                <button
                  onClick={() => setNotificationsFilter("orders")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    notificationsFilter === "orders"
                      ? "bg-[#FF3B00] text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100"
                  }`}
                >
                  Pedidos ({activeNotificationsList.filter(n => n.type === "order").length})
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-[11px] font-bold text-[#FF3B00] hover:text-[#E63500] whitespace-nowrap px-1 cursor-pointer transition-colors"
                  title="Marcar todas como lidas"
                >
                  Limpar avisos
                </button>
              )}
            </div>

            {/* Notifications Feed */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
              {activeNotificationsList
                .filter((item) => {
                  if (notificationsFilter === "coupons") return item.type === "coupon";
                  if (notificationsFilter === "orders") return item.type === "order";
                  return true;
                })
                .map((item) => {
                  const isRead = readNotificationIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => markNotificationAsRead(item.id)}
                      className={`p-4 rounded-2xl border transition-all relative ${
                        !isRead
                          ? "bg-orange-50/40 border-orange-200/80 shadow-sm"
                          : "bg-white border-slate-200/70 hover:border-slate-300"
                      }`}
                    >
                      {/* Unread dot */}
                      {!isRead && (
                        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#FF3B00] ring-4 ring-orange-100" />
                      )}

                      <div className="flex items-start gap-3.5">
                        {/* Icon Box */}
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            item.type === "order"
                              ? "bg-emerald-100 text-emerald-700"
                              : item.type === "coupon"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {item.type === "order" && <Truck size={20} strokeWidth={2.5} />}
                          {item.type === "coupon" && <Ticket size={20} strokeWidth={2.5} />}
                          {item.type === "news" && <Sparkles size={20} strokeWidth={2.5} />}
                        </div>

                        {/* Text details */}
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                              {item.title}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {item.message}
                          </p>
                          <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                            {item.time}
                          </span>

                          {/* Action area: Coupon Copy Button */}
                          {item.couponCode && (
                            <div className="mt-3 flex items-center gap-2">
                              <div className="px-3 py-1.5 bg-slate-100 border border-dashed border-slate-300 rounded-xl flex items-center gap-2 font-mono font-bold text-xs text-slate-800 tracking-wider">
                                <Tag size={13} className="text-[#FF3B00]" />
                                <span>{item.couponCode}</span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyCoupon(item.couponCode!);
                                  markNotificationAsRead(item.id);
                                }}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                                  copiedCoupon === item.couponCode
                                    ? "bg-emerald-600 text-white"
                                    : "bg-[#FF3B00] hover:bg-[#E63500] text-white"
                                }`}
                              >
                                {copiedCoupon === item.couponCode ? (
                                  <>
                                    <Check size={14} />
                                    <span>Copiado!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={13} />
                                    <span>Copiar Código</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {/* Action area: Order Tracking Button */}
                          {item.actionType === "order" && (
                            <div className="mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNavView("orders");
                                  setShowNotifications(false);
                                  markNotificationAsRead(item.id);
                                }}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                              >
                                <Truck size={14} />
                                <span>Rastrear Pedido</span>
                              </button>
                            </div>
                          )}

                          {/* Action area: Explore Restaurants Button */}
                          {item.actionType === "category" && (
                            <div className="mt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNavView("home");
                                  setShowNotifications(false);
                                  markNotificationAsRead(item.id);
                                }}
                                className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                              >
                                <Store size={14} />
                                <span>Ver Restaurantes</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Footer with helpful note */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 pb-safe">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck size={15} className="text-emerald-600" />
                Promoções e cupons verificados
              </span>
              <button
                onClick={() => setShowNotifications(false)}
                className="font-bold text-slate-700 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Fechar
              </button>
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
