import type { Page } from '@playwright/test';
import { devAccountFor } from '../../../src/lib/devAccounts';

export type SignInRole = 'admin' | 'doctor' | 'patient' | 'nurse' | 'pharmacist' | 'labtech' | 'receptionist' | 'billing' | 'pca';

const ROLE_BY_NAME: Record<SignInRole, string> = {
  admin: 'ADMIN',
  doctor: 'DOCTOR',
  patient: 'PATIENT',
  nurse: 'NURSE',
  pharmacist: 'PHARMACIST',
  labtech: 'LAB_TECH',
  receptionist: 'RECEPTIONIST',
  billing: 'BILLING',
  pca: 'PCA',
};

/** Signs in through the real login form with the seeded development account for the role. */
export async function signInAs(page: Page, role: SignInRole) {
  const account = devAccountFor(ROLE_BY_NAME[role]);
  await page.goto('/login');
  await page.locator('#email').fill(account.email);
  await page.locator('#password').fill(account.password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}
