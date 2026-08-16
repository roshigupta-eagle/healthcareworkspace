import { hashSync } from "bcryptjs";

type DevUser = { id: string; email: string; passwordHash: string; name: string; role: string };
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

// Seed a few convenient dev accounts when running locally so the
// developer can sign in without needing to run an external script.
if (process.env.NODE_ENV !== "production" && store.size === 0) {
  const seeded = [
    { id: "dev-admin", email: "admin@example.com", password: "password123", name: "Admin User", role: "ADMIN" },
    { id: "dev-doctor", email: "doctor@example.com", password: "password123", name: "Doctor User", role: "DOCTOR" },
    { id: "dev-patient", email: "patient@example.com", password: "password123", name: "Patient User", role: "PATIENT" },
  ];
  for (const u of seeded) {
    const passwordHash = hashSync(u.password, 10);
    addDevUser({ id: u.id, email: u.email, passwordHash, name: u.name, role: u.role });
  }
}

export type { DevUser };
