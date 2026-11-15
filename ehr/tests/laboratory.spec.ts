import { test, expect } from '@playwright/test';
import { signInAs } from './e2e/support/signIn';

test('Laboratory Command Center basic navigation', async ({ page }) => {
  await signInAs(page, 'doctor');
  await page.goto('http://localhost:3000/dashboard/laboratory');
  await expect(page.getByRole('heading', { name: /Laboratory/i })).toBeVisible();
  await expect(page.getByText(/Patients with lab activity/i)).toBeVisible();

  // Try to open the first patient laboratory workspace
  const openLink = page.getByRole('link', { name: 'Open Laboratory' }).first();
  await expect(openLink).toBeVisible();
  await openLink.click();
  await expect(page).toHaveURL(/\/dashboard\/records\/.+\/labs/);
});
