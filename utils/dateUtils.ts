/**
 * Helper robusto para converter qualquer formato de data do Firestore (Timestamp, serialized JSON, ISO string, milliseconds, seconds object) em um Date válido do JavaScript.
 */
export function safeParseDate(val: any): Date | null {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  // Firestore Timestamp instance (.toDate())
  if (typeof val.toDate === 'function') {
    try {
      const d = val.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      // fallback
    }
  }
  // Serialized Firestore timestamp object ({ seconds: 1234567, nanoseconds: 123 } or { _seconds: 1234567, _nanoseconds: 123 })
  if (typeof val === 'object') {
    if (typeof val.seconds === 'number') {
      const d = new Date(val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1000000));
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val._seconds === 'number') {
      const d = new Date(val._seconds * 1000 + Math.floor((val._nanoseconds || 0) / 1000000));
      return isNaN(d.getTime()) ? null : d;
    }
  }
  // Number as timestamp (milliseconds or seconds)
  if (typeof val === 'number') {
    if (val < 1e11) {
      // likely unix seconds
      const d = new Date(val * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  // String format
  if (typeof val === 'string') {
    // Try standard ISO/Date parsing
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed;
    // Check if string contains JSON representation of timestamp
    if (val.startsWith('{') && val.includes('seconds')) {
      try {
        const json = JSON.parse(val);
        return safeParseDate(json);
      } catch {
        // ignore
      }
    }
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      return safeParseDate(num);
    }
  }

  const fallback = new Date(val);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Retorna sempre um Date válido (nunca null; se inválido, retorna fallbackDate ou epoch zero)
 */
export function toSafeDate(val: any, fallbackDate: Date = new Date(0)): Date {
  return safeParseDate(val) || fallbackDate;
}
