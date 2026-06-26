import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.setTimeout(30000);

test('Register via UI and capture API responses', async ({ page }) => {
  const base = 'http://localhost:3001';
  const outDir = path.join(process.cwd(), 'tests', 'e2e', 'screenshots');
  fs.mkdirSync(outDir, { recursive: true });

  const email = `ui-register+${Date.now()}@example.com`;
  const password = 'password123';

  await page.goto(`${base}/register`);
  await expect(page.locator('text=Create an Account')).toBeVisible();

  // Monitor API responses
  const registerRespPromise = page.waitForResponse((r) => r.url().includes('/api/register') && r.request().method() === 'POST');
  const authRespPromise = page.waitForResponse((r) => r.url().includes('/api/auth') && r.request().method() === 'POST', { timeout: 10000 }).catch(() => null);

  await page.fill('#name', 'UI Test');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  // choose PATIENT radio (default)

  await page.click('button:has-text("Register")');

  const registerResp = await registerRespPromise;
  const registerText = await registerResp.text();
  console.log('REGISTER STATUS', registerResp.status(), 'BODY', registerText.slice(0, 1000));

  const authResp = await authRespPromise;
  if (authResp) {
    const authText = await authResp.text();
    console.log('AUTH STATUS', authResp.status(), 'BODY', authText.slice(0, 1000));
  } else {
    console.log('No auth POST observed (may have skipped auto sign-in)');
  }

  await page.screenshot({ path: path.join(outDir, 'register-ui-after-submit.png'), fullPage: true });
});
