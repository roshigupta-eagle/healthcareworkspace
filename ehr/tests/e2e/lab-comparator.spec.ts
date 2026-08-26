import { expect, test } from '@playwright/test';

const comparatorResponse = (url: string) =>
  url.includes('/api/patients/') && url.endsWith('/lab-comparator');

test.describe('Laboratory comparator', () => {
  test('loads server-derived comparison, filters it, and opens the source result', async ({ page }) => {
    const responsePromise = page.waitForResponse((response) =>
      comparatorResponse(response.url()) && response.request().method() === 'GET',
    );

    await page.goto('/dashboard/records/labs?patient=patient-001&selected=l1');

    const response = await responsePromise;
    expect(response.status()).toBe(200);

    const payload = await response.json();
    expect(payload.meta.source).toBe('ehr-development-adapter');
    expect(payload.meta.correlationId).toEqual(expect.any(String));
    expect(payload.data.parameters).toHaveLength(4);
    expect(payload.warnings).toHaveLength(0);

    await expect(page.getByRole('heading', { name: 'Patient tests' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Lipid Panel/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Lipid Panel.*Roshi: Returned to range/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Hemoglobin A1c.*Roshi: Decreasing/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Creatinine.*Roshi: Newly abnormal/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /eGFR.*Roshi: Newly abnormal/ })).toBeVisible();

    await page.getByRole('button', { name: /Creatinine.*Roshi: Newly abnormal/ }).click();
    await expect(page.getByRole('heading', { name: 'Creatinine' })).toBeVisible();
    await expect(page.getByText('+22.0', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Lipid Panel.*Roshi: Returned to range/ }).click();
    await expect(page.getByRole('heading', { name: /Lipid Panel/ })).toBeVisible();

    const filterBar = page.locator('[aria-label="Filter laboratory results"]');
    const unreviewedFilter = filterBar.getByRole('button', { name: /^Unreviewed/ });
    await unreviewedFilter.click();
    await expect(unreviewedFilter).toHaveAttribute('aria-pressed', 'true');

    const search = page.getByRole('textbox', { name: 'Search laboratory results' });
    await search.fill('does-not-exist');
    await expect(page.getByText('No matching results', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByRole('heading', { name: /Lipid Panel/ })).toBeVisible();

    await page.getByRole('button', { name: 'Open full report' }).click();
    await page.waitForURL('**/dashboard/records/patient-001/labs/l1');
    await expect(page.getByText(/Main result:/)).toBeVisible();
  });
  test('shows a previous final report, current reference range, and comparison outcome', async ({ page }) => {
    const parameterKey = 'http://loinc.org|2160-0|Serum|Automated';
    const previousObservation = {
      id: 'observation-creatinine-previous',
      name: 'Creatinine',
      parameterKey,
      code: '2160-0',
      codeSystem: 'http://loinc.org',
      mappingStatus: 'approved',
      value: 80,
      numericValue: 80,
      unit: 'umol/L',
      effectiveAt: '2026-07-01T14:23:00.000Z',
      issuedAt: '2026-07-01T16:00:00.000Z',
      sourceInterpretation: 'normal',
      sourceInterpretationText: 'Normal',
      status: 'final',
      eligibleForComparison: true,
      referenceRange: { low: 45, high: 90, text: '45-90 umol/L' },
      provider: 'Lab technician',
      laboratory: 'Maple Health Laboratory',
      specimen: 'Serum',
      method: 'Automated',
      reportId: 'diagnosticreport-creatinine-previous',
      sourceResourceType: 'DiagnosticReport',
    };
    const currentObservation = {
      ...previousObservation,
      id: 'observation-creatinine-current',
      value: 120,
      numericValue: 120,
      effectiveAt: '2026-08-19T14:23:00.000Z',
      issuedAt: '2026-08-19T16:00:00.000Z',
      sourceInterpretation: 'high',
      sourceInterpretationText: 'High',
      reportId: 'diagnosticreport-creatinine-current',
      sourceResourceType: 'DiagnosticReport',
    };

    await page.route('**/api/patients/patient-001/lab-comparator', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            patientId: 'patient-001',
            parameters: [{
              parameterKey,
              name: 'Creatinine',
              code: '2160-0',
              codeSystem: 'http://loinc.org',
              mappingStatus: 'approved',
              observations: [previousObservation, currentObservation],
              evaluation: {
                status: 'newly-abnormal',
                comparable: true,
                current: currentObservation,
                previous: previousObservation,
                absoluteDelta: 40,
                percentageDelta: 50,
                rangeTransition: 'newly-abnormal',
                ruleId: 'LAB-COMP-DISPLAY-001',
                ruleVersion: '1.0.0',
                explanation: [
                  'Current result is 120 umol/L.',
                  'Previous comparable result was 80 umol/L.',
                  'The current value crossed outside the reference interval supplied with the current result.',
                ],
              },
            }],
          },
          warnings: [],
          meta: {
            projectionRevision: 'playwright-fixture-v1',
            generatedAt: '2026-08-20T12:00:00.000Z',
            source: 'playwright-fixture',
            correlationId: 'playwright-correlation-id',
          },
        }),
      });
    });

    await page.goto('/dashboard/records/labs?patient=patient-001');

    await expect(page.getByRole('heading', { name: 'Creatinine' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Creatinine.*Roshi: Newly abnormal/ })).toBeVisible();
    const resultTable = page.getByRole('table', { name: 'Laboratory analytes for Creatinine' });
    await expect(resultTable.getByText('120 umol/L', { exact: true })).toBeVisible();
    await expect(resultTable.getByText('45-90 umol/L', { exact: true })).toBeVisible();
    await expect(page.getByText('+40.0', { exact: true })).toBeVisible();
    await expect(page.getByText('Increasing', { exact: true })).toBeVisible();
  });

  test('does not synthesize laboratory results for an empty patient', async ({ page }) => {
    const responsePromise = page.waitForResponse((response) =>
      comparatorResponse(response.url()) && response.request().method() === 'GET',
    );

    await page.goto('/dashboard/records/labs?patient=patient-003');

    const response = await responsePromise;
    expect(response.status()).toBe(200);

    const payload = await response.json();
    expect(payload.meta.source).toBe('ehr-development-adapter');
    expect(payload.data.parameters).toHaveLength(0);
    expect(payload.warnings).toHaveLength(0);

    await expect(page.getByRole('heading', { name: 'No laboratory results' })).toBeVisible();
    await expect(page.getByText(/No laboratory results are currently available/)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Lipid Panel/ })).toHaveCount(0);
  });
});
