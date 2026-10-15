import { test, expect } from '@playwright/test';

test('Laboratory Command Center basic navigation', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard/laboratory?asUser=dev');
  await expect(page.getByRole('heading', { name: /Laboratory/i })).toBeVisible();
  await expect(page.getByText(/Patients with lab activity/i)).toBeVisible();

  // Try to open the first patient laboratory workspace
  const openLink = page.getByRole('link', { name: 'Open Laboratory' }).first();
  await expect(openLink).toBeVisible();
  await openLink.click();
  await expect(page).toHaveURL(/\/dashboard\/records\/.+\/labs/);
});
