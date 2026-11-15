import { describe, expect, it } from 'vitest';
import { DEV_ACCOUNTS } from '@/lib/devAccounts';
import { findDevUserByEmail } from '@/lib/devAuthStore';
import { homePathForRole } from '@/lib/roleHome';
import { compare } from 'bcryptjs';

describe('development accounts', () => {
  it('has unique ids, emails, roles and passwords the login form accepts', () => {
    for (const key of ['id', 'email', 'role', 'password'] as const) {
      expect(new Set(DEV_ACCOUNTS.map((account) => account[key])).size, key).toBe(DEV_ACCOUNTS.length);
    }
    for (const account of DEV_ACCOUNTS) expect(account.password.length, account.email).toBeGreaterThanOrEqual(8);
  });

  it('seeds every account with a matching password hash', async () => {
    for (const account of DEV_ACCOUNTS) {
      const seeded = findDevUserByEmail(account.email);
      expect(seeded?.role, account.email).toBe(account.role);
      expect(await compare(account.password, seeded!.passwordHash), account.email).toBe(true);
    }
  });

  it('gives each signed-in role a home page other than an unknown fallback only when one exists', () => {
    expect(homePathForRole('ADMIN')).toBe('/admin');
    for (const account of DEV_ACCOUNTS.filter((entry) => ['ADMIN', 'DOCTOR', 'PATIENT', 'NURSE', 'PHARMACIST', 'LAB_TECH'].includes(entry.role))) {
      expect(homePathForRole(account.role), account.role).not.toBe('/');
    }
  });
});
