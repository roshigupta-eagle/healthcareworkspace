import { test, expect } from '@playwright/test';
import { signInAs } from './support/signIn';

test('Dashboard opens the My Day workspace and ignores retired organ-system mode state', async ({ page }) => {
  await signInAs(page, 'doctor');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('dashboard-page')).toBeVisible();

  await page.goto('http://localhost:3000/dashboard?mode=patient-focus&patientId=patient-003&organ=lungs', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId('dashboard-page')).toBeVisible();
});
