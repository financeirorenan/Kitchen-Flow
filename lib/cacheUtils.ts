// Utility functions for caching data in localStorage/IndexedDB with TTL
export function setLocalCache(key: string, value: any): void {
  try {
    const payload = {
      timestamp: Date.now(),
      data: value,
    };
    localStorage.setItem(`kf_cache_${key}`, JSON.stringify(payload));
  } catch (err) {
    console.warn("Error saving cache for key:", key, err);
  }
}

export function getLocalCache<T = any>(key: string, maxAgeMs = 1000 * 60 * 60 * 24): T | null {
  try {
    const raw = localStorage.getItem(`kf_cache_${key}`);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload || !payload.timestamp) return null;
    if (Date.now() - payload.timestamp > maxAgeMs) {
      return payload.data as T; // Return stale cache as fallback if expired
    }
    return payload.data as T;
  } catch {
    return null;
  }
}
