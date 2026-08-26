import { expect, test } from '@playwright/test';

const logUrl = '/dashboard/records/patient-001/weight-trend?tab=log';

test.describe('Weight Trend Log', () => {
  test('tells the history story and opens review workflows', async ({ page }) => {
    await page.goto(logUrl);

    await expect(page.getByRole('heading', { name: 'Weight Trend' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Entry Log' })).toBeVisible();
    await expect(page.getByText('Latest Measurement', { exact: true })).toBeVisible();
    await expect(page.getByText('Total Entries', { exact: true })).toBeVisible();
    await expect(page.getByText('Lowest Recorded', { exact: true })).toBeVisible();
    await expect(page.getByText('Highest Recorded', { exact: true })).toBeVisible();
    await expect(page.getByText('Measurement worth reviewing', { exact: true })).toBeVisible();
    await expect(page.getByText('Most records from Clinic', { exact: false })).toBeVisible();

    await expect(page.getByText(/Showing 1.*10 of \d+ measurements/)).toBeVisible();
    await page.getByLabel('Next page').click();
    await expect(page.getByText(/Showing 11.*20 of \d+ measurements/)).toBeVisible();

    await page.getByLabel('Previous page').click();
    await page.getByRole('button', { name: 'Review Changes' }).click();
    const changesDialog = page.getByRole('dialog', { name: 'Weight History Changes' });
    await expect(changesDialog).toBeVisible();
    await expect(changesDialog.getByText('Data Quality Review', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(changesDialog).toHaveCount(0);

    const flaggedRow = page.locator('tbody tr').filter({ hasText: 'Review' }).first();
    await flaggedRow.click();
    const detailsDialog = page.getByRole('dialog', { name: 'Measurement Details' });
    await expect(detailsDialog).toBeVisible();
    await expect(detailsDialog.getByText('Possible Data Issue', { exact: true })).toBeVisible();
    await expect(detailsDialog.getByText('FHIR Resource ID', { exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(detailsDialog).toHaveCount(0);

    const enteredInErrorRow = page.locator('tbody tr').filter({ hasText: 'Entered in Error' }).first();
    await enteredInErrorRow.locator('td').last().getByRole('button').last().click();
    await expect(enteredInErrorRow.getByRole('menuitem', { name: 'Mark Entered in Error' })).toHaveCount(0);
  });

  test('uses measurement cards on a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(logUrl);

    await expect(page.locator('.weight-trend-surface article').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /More actions for/ }).first()).toBeVisible();
    await expect(page.getByRole('table')).toBeHidden();

    await page.locator('.weight-trend-surface article').first().getByRole('button', { name: 'View details' }).click();
    await expect(page.getByRole('dialog', { name: 'Measurement Details' })).toBeVisible();
  });
});
