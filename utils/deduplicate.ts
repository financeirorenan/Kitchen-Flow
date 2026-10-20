import { Order, FinancialRecord } from '../types';
import { safeParseDate } from './dateUtils';

const ORDER_STATUS_PRIORITY: Record<string, number> = {
  pending: 1,
  accepted: 2,
  preparing: 3,
  ready: 4,
  delivering: 5,
  delivered: 6,
  finished: 7,
  cancelled: 8,
};

/**
 * Deduplicates orders strictly by ID, docId, clientOrderId, and fingerprint signature.
 * When duplicates exist, keeps the instance with the most advanced operational status or most recent update.
 * Prevents double counting in reports, cash closings, and financial analytics.
 */
export function deduplicateOrders(ordersList: Order[]): Order[] {
  if (!Array.isArray(ordersList)) return [];

  const result: Order[] = [];
  const keyToIndex = new Map<string, number>();

  const shouldReplace = (existing: Order, incoming: Order): boolean => {
    const existingUpdatedMs = safeParseDate(existing.updatedAt)?.getTime() || 0;
    const incomingUpdatedMs = safeParseDate(incoming.updatedAt)?.getTime() || 0;

    // Se um dos dois está cancelado e o outro foi explicitamente atualizado depois (ex: restaurado), respeita o mais recente
    if ((existing.status === 'cancelled' || incoming.status === 'cancelled') && existing.status !== incoming.status) {
      if (existingUpdatedMs > 0 && incomingUpdatedMs > 0 && existingUpdatedMs !== incomingUpdatedMs) {
        return incomingUpdatedMs > existingUpdatedMs;
      }
      return incoming.status === 'cancelled';
    }

    const pOld = ORDER_STATUS_PRIORITY[existing.status] ?? 0;
    const pNew = ORDER_STATUS_PRIORITY[incoming.status] ?? 0;
    if (pNew !== pOld) return pNew > pOld;
    if (Boolean(incoming.isSettled) && !existing.isSettled) return true;
    if (incomingUpdatedMs > existingUpdatedMs) return true;
    return false;
  };

  for (const o of ordersList) {
    if (!o) continue;

    const primaryId = String(o.id || o.docId || '').trim();
    const docId = o.docId ? String(o.docId).trim() : '';
    const clientOrderId = (o as any).clientOrderId ? String((o as any).clientOrderId).trim() : '';

    let signature = '';
    const parsedDate = safeParseDate(o.createdAt);
    const timeMs = parsedDate ? parsedDate.getTime() : 0;
    if (timeMs > 0 && o.items && o.items.length > 0) {
      const itemsFingerprint = o.items.map(i => `${i.productId || i.name}_${i.quantity}`).sort().join('|');
      const timeBucket = Math.floor(timeMs / 4000);
      const totalAmount = typeof o.total === 'number' ? o.total.toFixed(2) : '0.00';
      signature = `sig:${o.tenantId || ''}_${o.type || ''}_${o.tableNumber ?? ''}_${totalAmount}_${itemsFingerprint}_${timeBucket}`;
    }

    const candidateKeys: string[] = [];
    if (primaryId) candidateKeys.push(`id:${primaryId}`);
    if (docId) candidateKeys.push(`id:${docId}`);
    if (clientOrderId) candidateKeys.push(`cid:${clientOrderId}`);
    if (signature) candidateKeys.push(signature);

    let matchedIdx: number | undefined;
    for (const k of candidateKeys) {
      if (keyToIndex.has(k)) {
        matchedIdx = keyToIndex.get(k);
        break;
      }
    }

    if (matchedIdx !== undefined) {
      const existing = result[matchedIdx];
      const replaceWithIncoming = shouldReplace(existing, o);
      const winner = replaceWithIncoming ? { ...o } : { ...existing };
      const loser = replaceWithIncoming ? existing : o;

      // Blindagem de Pagamento: se o loser possuir dados de pagamento quitado (isSettled, paymentStatus: 'paid', payments, ou método não-dinheiro)
      // e o winner não possuir pagamento quitado (e não estiver cancelado), preservar estritamente os dados de pagamento!
      if (winner.status !== 'cancelled') {
        const loserHasSettledPayment = Boolean(loser.isSettled || loser.paymentStatus === 'paid' || (loser.payments && loser.payments.length > 0));
        const winnerHasSettledPayment = Boolean(winner.isSettled || winner.paymentStatus === 'paid' || (winner.payments && winner.payments.length > 0));

        if (loserHasSettledPayment && !winnerHasSettledPayment) {
          winner.isSettled = true;
          winner.paymentStatus = 'paid';
          winner.paymentMethod = loser.paymentMethod || winner.paymentMethod;
          winner.payments = loser.payments || winner.payments;
          winner.paidAt = loser.paidAt || winner.paidAt;
          winner.completedAt = loser.completedAt || winner.completedAt;
        } else if (loser.payments && loser.payments.length > (winner.payments?.length || 0)) {
          winner.payments = loser.payments;
          if (loser.paymentMethod) winner.paymentMethod = loser.paymentMethod;
          if (loser.changeFor !== undefined) winner.changeFor = loser.changeFor;
        }
      }

      result[matchedIdx] = winner;
      for (const k of candidateKeys) {
        keyToIndex.set(k, matchedIdx);
      }
      continue;
    }

    const newIdx = result.length;
    result.push(o);
    for (const k of candidateKeys) {
      keyToIndex.set(k, newIdx);
    }
  }

  return result;
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

    const parsedDate = safeParseDate(r.date);
    const timeMs = parsedDate ? parsedDate.getTime() : 0;
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

/**
 * Retorna o número numérico sequencial diário do pedido (ex: 1, 2, 3...).
 * Nunca retorna hashes alfanuméricos ou senhas.
 */
export function getOrderNumericId(order?: Partial<Order> | null): number {
  if (!order) return 1;
  if (typeof order.dailyNumber === 'number' && order.dailyNumber > 0) {
    return order.dailyNumber;
  }
  const rawNum = (order as any)?.dailyNumber;
  if (rawNum && !isNaN(Number(rawNum)) && Number(rawNum) > 0) {
    return Number(rawNum);
  }
  if (order.id) {
    const digits = String(order.id).replace(/\D/g, '');
    if (digits.length > 0) {
      const parsed = parseInt(digits.slice(-4), 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }
  return 1;
}

/**
 * Formata o número de pedido estritamente como número diário sequencial (ex: #1, #2, #3...).
 * Elimina completamente senhas e códigos aleatórios.
 */
export function formatOrderNumber(order?: Partial<Order> | null): string {
  const num = getOrderNumericId(order);
  return `#${num}`;
}

