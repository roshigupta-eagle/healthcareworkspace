import { test, expect } from '@playwright/test';
import { signInAs } from './support/signIn';

const ORDERS_URL = '/dashboard/orders';

async function openOrders(page: Parameters<typeof test>[0]['page']) {
  await signInAs(page, 'doctor');
  await page.goto(ORDERS_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('orders-page')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible();
  await expect(page.getByTestId('orders-sort')).toBeVisible();
}

test.describe('Orders command center', () => {
  test('renders the worklist, filters it, sorts it, and opens order details', async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await openOrders(page);
    await expect(page.getByRole('region', { name: 'Order worklist' })).toBeVisible();
    await expect(page.getByTestId('order-row-order-legacy-ecg')).toBeVisible();
    await expect(page.getByTestId('orders-sort')).toHaveValue('recent');

    await page.getByTestId('orders-sort').selectOption('patient');
    await expect(page.getByTestId('orders-sort')).toHaveValue('patient');
    const patientNames = await page.locator('tbody tr').evaluateAll((rows) => rows.map((row) => row.querySelector('td strong')?.textContent?.trim() || ''));
    expect(patientNames).toEqual([...patientNames].sort((left, right) => left.localeCompare(right)));

    await page.getByRole('tab', { name: 'Cardiology / Diagnostics' }).click();
    await expect(page.getByTestId('order-row-order-legacy-ecg')).toBeVisible();
    await page.getByTestId('orders-search').fill('Michael Thompson');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.getByText('1 order in view', { exact: true })).toBeVisible();

    await page.getByTestId('open-order-order-legacy-ecg').click();
    const detailDrawer = page.locator('.orders-drawer:not(.orders-create-drawer)');
    await expect(detailDrawer).toBeVisible();
    await expect(detailDrawer.getByRole('heading', { name: 'ECG', exact: true })).toBeVisible();
    await expect(detailDrawer).toContainText('Michael Thompson');
    await detailDrawer.getByRole('button', { name: 'Close order details' }).click();
    await expect(detailDrawer).toBeHidden();

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('blocks empty orders and confirms before discarding entered patient data', async ({ page }) => {
    await openOrders(page);
    await page.getByTestId('new-order-button').click();
    const drawer = page.getByRole('dialog', { name: 'New Order' });
    const patient = drawer.getByTestId('new-order-patient');
    let postCount = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/api/orders')) postCount += 1;
    });

    await drawer.getByTestId('new-order-submit').click();
    expect(postCount).toBe(0);
    await expect(patient).toBeFocused();

    await patient.selectOption('patient-003');
    await drawer.getByRole('button', { name: 'Cancel', exact: true }).click();
    const confirmation = page.getByRole('alertdialog', { name: 'Discard unsaved order?' });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: 'Keep editing' }).click();
    await expect(drawer).toBeVisible();
    await expect(patient).toHaveValue('patient-003');

    await page.keyboard.press('Escape');
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: 'Discard' }).click();
    await expect(drawer).toBeHidden();
    await expect(page.getByTestId('new-order-button')).toBeFocused();

    await page.getByTestId('new-order-button').click();
    const reopenedDrawer = page.getByRole('dialog', { name: 'New Order' });
    await expect(reopenedDrawer.getByRole('button', { name: 'Close new order' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(reopenedDrawer.getByTestId('new-order-submit')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(reopenedDrawer.getByRole('button', { name: 'Close new order' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(reopenedDrawer).toBeHidden();
    await expect(page.getByTestId('new-order-button')).toBeFocused();
  });

  test('requires an imaging body site and submits only validated imaging data', async ({ page }) => {
    await openOrders(page);
    await page.getByTestId('new-order-button').click();
    const drawer = page.getByRole('dialog', { name: 'New Order' });
    await drawer.getByTestId('new-order-category-Imaging').click();
    await drawer.getByTestId('new-order-patient').selectOption('patient-003');
    await drawer.getByTestId('new-order-test').selectOption({ label: 'Chest X-Ray' });
    await drawer.getByTestId('new-order-indication').fill('Persistent cough evaluation');

    let submitted: Record<string, unknown> | null = null;
    await drawer.getByTestId('new-order-submit').click();
    expect(submitted).toBeNull();
    await expect(drawer.getByPlaceholder('e.g. Chest')).toBeFocused();

    await drawer.getByPlaceholder('e.g. Chest').fill('Chest');
    await page.route('**/api/orders**', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      submitted = JSON.parse(route.request().postData() || '{}') as Record<string, unknown>;
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Test request intentionally blocked.' }) });
    });
    await drawer.getByTestId('new-order-submit').click();

    await expect(drawer.getByRole('alert')).toContainText('Test request intentionally blocked.');
    expect(submitted).toMatchObject({
      patientId: 'patient-003',
      category: 'Imaging',
      orderName: 'Chest X-Ray',
      bodySite: 'Chest',
      clinicalIndication: 'Persistent cough evaluation',
    });
  });

  test('keeps the mobile worklist and drawer inside the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openOrders(page);
    await expect(page.locator('.orders-mobile-list')).toBeVisible();
    await page.getByTestId('new-order-button').click();
    const drawer = page.locator('.orders-create-drawer');
    await expect(drawer).toBeVisible();
    await drawer.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));

    const geometry = await page.evaluate(() => {
      const element = document.querySelector('.orders-create-drawer');
      const box = element?.getBoundingClientRect();
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        left: box?.left,
        right: box?.right,
        bodyOverflow: document.body.style.overflow,
      };
    });
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(390);
    expect(geometry.bodyOverflow).toBe('hidden');
  });
});
