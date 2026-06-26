import { test, expect } from '@playwright/test';

const DEV_EMAIL = 'pw-cardio@example.com';
const DEV_PASSWORD = 'password123';

test.describe('Cardiology UI', () => {
  test.beforeAll(async ({ request }) => {
    // Create a dev user via the public register API — safe in development
    await request.post('/api/register', {
      data: {
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
        name: 'Playwright Cardio',
        role: 'DOCTOR',
      },
    });
  });

  test('renders header and KPI cards (bypass auth for e2e test)', async ({ page }) => {
    // Use query param to bypass middleware auth in dev
    await page.goto('/cardiology?playwright=1');
    await page.waitForLoadState('networkidle');
    // Debug: capture server/client-rendered HTML for investigation
    const html = await page.content();
    console.log('--- PAGE HTML START ---');
    console.log(html.slice(0, 20000));
    console.log('--- PAGE HTML END ---');

    await expect(page.locator('text=HealthOS Cardiology')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Patients Today')).toBeVisible({ timeout: 10000 });
  });
});

