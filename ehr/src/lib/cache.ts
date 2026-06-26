/**
 * Simple in-memory cache for server-side dev use.
 * Not suitable for multi-instance production — use Redis or similar there.
 */
type CacheEntry = { value: any; expiresAt: number };

const STORE: Record<string, CacheEntry> = {};

export function getCache(key: string) {
  const e = STORE[key];
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    delete STORE[key];
    return null;
  }
  return e.value;
}

export function setCache(key: string, value: any, ttl = 3000) {
  STORE[key] = { value, expiresAt: Date.now() + ttl };
  return value;
}

export function delCache(key: string) {
  delete STORE[key];
}

export function clearCache() {
  Object.keys(STORE).forEach((k) => delete STORE[k]);
}

export default { getCache, setCache, delCache, clearCache };
