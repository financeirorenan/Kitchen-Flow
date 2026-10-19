import { OrderItem, ProductOption } from '../types';

export interface FormattedAddon {
  name: string;
  quantity: number;
  price?: number;
  category?: string;
}

export interface ParsedKdsItemDetails {
  displayName: string;
  paidAddons: FormattedAddon[];
  removals: string[];
  allergens: string[];
  cleanObservation?: string;
  isNewBatch: boolean;
  batchNumber?: number;
  isPreviousBatch: boolean;
  isCancelled: boolean;
}

const COMMON_ALLERGEN_TERMS = [
  'alerg',
  'alérg',
  'glúten',
  'gluten',
  'lactose',
  'leite',
  'ovo',
  'ovos',
  'soja',
  'peixe',
  'crustáceo',
  'crustaceo',
  'marisco',
  'mariscos',
  'camarão',
  'camarao',
  'amendoim',
  'frutos do mar',
  'nozes',
  'castanha',
  'celíac',
  'celiac'
];

/**
 * Checks if a string or option represents an ingredient removal
 */
export function isRemovalOption(name: string, category?: string): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  const c = (category || '').trim().toLowerCase();
  
  if (
    c.includes('remoc') ||
    c.includes('remoç') ||
    c.includes('remover') ||
    c.includes('retirar') ||
    c.includes('tirar') ||
    c.includes('sem') ||
    c.includes('dispensar')
  ) {
    return true;
  }
  
  return (
    n.startsWith('sem ') ||
    n.startsWith('sem-') ||
    n.startsWith('sem:') ||
    n.startsWith('remover ') ||
    n.startsWith('retirar ') ||
    n.startsWith('tirar ') ||
    n.startsWith('dispensar ') ||
    n.startsWith('não colocar') ||
    n.startsWith('nao colocar') ||
    n.startsWith('não ') ||
    n.startsWith('nao ') ||
    n.startsWith('- ') ||
    n.startsWith('(sem') ||
    n.startsWith('0x ') ||
    n.includes('sem cebola') ||
    n.includes('sem tomate') ||
    n.includes('sem maionese') ||
    n.includes('sem picles') ||
    n.includes('sem gelo') ||
    n.includes('sem molho') ||
    n.includes('sem queijo') ||
    n.includes('sem salada') ||
    n.includes('sem milho') ||
    n.includes('sem ervilha') ||
    n.includes('sem alho') ||
    n.includes('sem coentro') ||
    n.includes('sem pimenta') ||
    n.includes('sem acucar') ||
    n.includes('sem açúcar')
  );
}

/**
 * Checks if a string or option represents an allergen alert
 */
export function isAllergenAlert(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return COMMON_ALLERGEN_TERMS.some(term => t.includes(term));
}

/**
 * Parses and formats an OrderItem for precise, high-contrast KDS kitchen presentation
 */
export function parseKdsItemDetails(
  item: OrderItem,
  orderHasMultipleBatches = false,
  maxBatchNumber = 1
): ParsedKdsItemDetails {
  const rawOptions: ProductOption[] = [
    ...(item.selectedOptions || []),
    ...(item.options || [])
  ];

  const paidAddonsMap = new Map<string, FormattedAddon>();
  const removalsSet = new Set<string>();
  const allergensSet = new Set<string>();

  // Add explicit item removals if provided
  if (item.removals && Array.isArray(item.removals)) {
    item.removals.forEach(r => {
      if (r && r.trim()) removalsSet.add(r.trim());
    });
  }

  // Add explicit item allergens if provided
  if (item.allergens && Array.isArray(item.allergens)) {
    item.allergens.forEach(a => {
      if (a && a.trim()) allergensSet.add(a.trim());
    });
  }

  // Parse raw options
  rawOptions.forEach(opt => {
    if (!opt || !opt.name) return;
    let optName = opt.name.trim();
    let qty = opt.quantity || 1;

    // Check if the name starts with a quantity prefix like "2x " or "3X "
    const qtyPrefixMatch = optName.match(/^(\d+)\s*[xX]\s*(.+)$/);
    if (qtyPrefixMatch) {
      const parsedQty = parseInt(qtyPrefixMatch[1], 10);
      if (!isNaN(parsedQty) && parsedQty > 0) {
        qty = Math.max(qty, parsedQty);
        optName = qtyPrefixMatch[2].trim();
      }
    }

    // Check allergen
    if (isAllergenAlert(optName)) {
      allergensSet.add(optName);
    }

    // Check removal
    if (isRemovalOption(optName, opt.category)) {
      removalsSet.add(optName);
    } else {
      // Paid or extra addition
      const key = optName.toLowerCase();
      const existing = paidAddonsMap.get(key);
      if (existing) {
        existing.quantity += qty;
      } else {
        paidAddonsMap.set(key, {
          name: optName,
          quantity: qty,
          price: opt.price,
          category: opt.category
        });
      }
    }
  });

  // Parse observation for removals and allergens
  const cleanObservation = item.observation ? item.observation.trim() : undefined;
  if (cleanObservation) {
    if (isAllergenAlert(cleanObservation)) {
      allergensSet.add(cleanObservation);
    }
    // Also detect if the observation contains common removals like "Sem cebola"
    const lowerObs = cleanObservation.toLowerCase();
    if (
      lowerObs.startsWith('sem ') ||
      lowerObs.startsWith('remover ') ||
      lowerObs.startsWith('retirar ') ||
      lowerObs.startsWith('tirar ') ||
      lowerObs.startsWith('não ') ||
      lowerObs.startsWith('nao ')
    ) {
      removalsSet.add(cleanObservation);
    }
  }

  // Format display name avoiding duplicate parenthetical descriptions
  let displayName = item.name || '';
  if (paidAddonsMap.size > 0 && displayName.includes('(')) {
    displayName = displayName.replace(/\s*\(([^)]+)\)/g, (match, inner) => {
      const innerLower = inner.toLowerCase();
      const hasMatchingAddon = Array.from(paidAddonsMap.values()).some(addon =>
        addon.name && innerLower.includes(addon.name.toLowerCase().trim())
      );
      return hasMatchingAddon ? '' : match;
    }).trim();
  }

  const batchNumber = item.batchNumber || (item as any).round || 1;
  const effectiveMaxBatch = maxBatchNumber > 1 ? maxBatchNumber : batchNumber;
  const isNewBatch = !item.kitchenDispatched && (item.isNew === true || (orderHasMultipleBatches && batchNumber > 1 && batchNumber >= effectiveMaxBatch && item.isNew !== false));
  const isPreviousBatch = orderHasMultipleBatches && !isNewBatch;
  const isCancelled = !!item.cancelled;

  return {
    displayName,
    paidAddons: Array.from(paidAddonsMap.values()),
    removals: Array.from(removalsSet),
    allergens: Array.from(allergensSet),
    cleanObservation,
    isNewBatch,
    batchNumber,
    isPreviousBatch,
    isCancelled
  };
}
