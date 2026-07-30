import { Order, FinancialRecord } from '../types';

/**
 * Deduplicates orders strictly by ID, docId, and fingerprint signature.
 * Prevents double counting in reports, cash closings, and financial analytics.
 */
export function deduplicateOrders(ordersList: Order[]): Order[] {
  if (!Array.isArray(ordersList)) return [];

  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();

  return ordersList.filter((o) => {
    if (!o) return false;

    // 1. Primary ID check
    const primaryId = String(o.id || o.docId || '').trim();
    if (primaryId && seenIds.has(primaryId)) {
      return false;
    }

    // 2. Secondary fingerprint check
    const timeMs = o.createdAt instanceof Date 
      ? o.createdAt.getTime() 
      : (new Date(o.createdAt).getTime() || 0);
    
    // Round time to 5-second bucket to catch rapid duplicate posts/syncs
    const timeBucket = Math.floor(timeMs / 5000);
    const totalAmount = typeof o.total === 'number' ? o.total.toFixed(2) : '0.00';
    const signature = `${o.tenantId || ''}_${o.type || ''}_${o.tableNumber ?? ''}_${o.dailyNumber ?? ''}_${totalAmount}_${timeBucket}`;

    if (signature && seenSignatures.has(signature)) {
      console.warn(`[Deduplication] Filtered out duplicate order: ${primaryId} (signature: ${signature})`);
      return false;
    }

    if (primaryId) seenIds.add(primaryId);
    if (o.docId) seenIds.add(String(o.docId));
    seenSignatures.add(signature);
    return true;
  });
}

/**
 * Deduplicates financial records strictly by ID, docId, and signature.
 */
export function deduplicateFinancialRecords(recordsList: FinancialRecord[]): FinancialRecord[] {
  if (!Array.isArray(recordsList)) return [];

  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();

  return recordsList.filter((r) => {
    if (!r) return false;

    const recWithDoc = r as FinancialRecord & { docId?: string };
    const primaryId = String(recWithDoc.id || recWithDoc.docId || '').trim();
    if (primaryId && seenIds.has(primaryId)) {
      return false;
    }

    const timeMs = r.date instanceof Date 
      ? r.date.getTime() 
      : (new Date(r.date).getTime() || 0);
    const timeBucket = Math.floor(timeMs / 5000);
    const amount = typeof r.amount === 'number' ? r.amount.toFixed(2) : '0.00';
    const signature = `${r.tenantId || ''}_${r.type || ''}_${r.category || ''}_${r.paymentMethod || ''}_${amount}_${r.orderId || ''}_${timeBucket}`;

    if (signature && seenSignatures.has(signature)) {
      console.warn(`[Deduplication] Filtered out duplicate financial record: ${primaryId} (signature: ${signature})`);
      return false;
    }

    if (primaryId) seenIds.add(primaryId);
    if (recWithDoc.docId) seenIds.add(String(recWithDoc.docId));
    seenSignatures.add(signature);
    return true;
  });
}
