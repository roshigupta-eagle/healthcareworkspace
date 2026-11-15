import { hashSync } from "bcryptjs";
import { DEV_ACCOUNTS } from "@/lib/devAccounts";

type DevUser = { id: string; email: string; passwordHash: string; name: string; role: string; patientId?: string };
const store: Map<string, DevUser> = new Map();

export function addDevUser(u: DevUser) {
  store.set(u.id, u);
}

export function findDevUserByEmail(email: string): DevUser | undefined {
  if (!email) return undefined;
  const needle = email.trim().toLowerCase();
  return Array.from(store.values()).find((u) => (u.email || "").toLowerCase() === needle);
}

export function findDevUserById(id: string): DevUser | undefined {
  return store.get(id);
}

export function clearDevUsers() {
  store.clear();
}

// Seed the development accounts when running locally so the developer can
// sign in as every role without running an external script.
if (process.env.NODE_ENV !== "production" && store.size === 0) {
  for (const u of DEV_ACCOUNTS) {
    addDevUser({ id: u.id, email: u.email, passwordHash: hashSync(u.password, 10), name: u.name, role: u.role, patientId: u.patientId });
  }
}

export type { DevUser };
