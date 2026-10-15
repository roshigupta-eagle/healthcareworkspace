import { test, expect } from '@playwright/test';

test('Dashboard opens the My Day workspace and ignores retired organ-system mode state', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard?noauth=1&asUser=dev', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('dashboard-page')).toBeVisible();

  await page.goto('http://localhost:3000/dashboard?noauth=1&asUser=dev&mode=patient-focus&patientId=patient-003&organ=lungs', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/dashboard\?noauth=1&asUser=dev$/);
  await expect(page.getByTestId('dashboard-page')).toBeVisible();
});
