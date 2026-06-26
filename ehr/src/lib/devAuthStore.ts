type DevUser = { id: string; email: string; passwordHash: string; name: string; role: string };
const store: Map<string, DevUser> = new Map();

export function addDevUser(u: DevUser) {
  store.set(u.id, u);
}

export function findDevUserByEmail(email: string): DevUser | undefined {
  if (!email) return undefined;
  const needle = email.trim().toLowerCase();
  return Array.from(store.values()).find((u) => (u.email || '').toLowerCase() === needle);
}

export function findDevUserById(id: string): DevUser | undefined {
  return store.get(id);
}

export function clearDevUsers() {
  store.clear();
}

export type { DevUser };
