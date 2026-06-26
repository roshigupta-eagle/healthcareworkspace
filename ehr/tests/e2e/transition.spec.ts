import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.setTimeout(30_000);

test('Login to Register transition', async ({ page }) => {
  const base = 'http://localhost:3001';

  // ensure screenshot directory exists
  const outDir = path.join(process.cwd(), 'tests', 'e2e', 'screenshots');
  fs.mkdirSync(outDir, { recursive: true });

  await page.goto(`${base}/login`);
  await expect(page.locator('text=Sign in to Healthcare EHR')).toBeVisible();
  await page.screenshot({ path: path.join(outDir, 'login.png'), fullPage: true });

  // Click the animated register link and wait for navigation
  await page.click('text=Register here');
  await page.waitForURL('**/register', { timeout: 5000 });
  await expect(page.locator('text=Create an Account')).toBeVisible();
  await page.screenshot({ path: path.join(outDir, 'register.png'), fullPage: true });
});
