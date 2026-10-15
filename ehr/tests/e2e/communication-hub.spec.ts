import { expect, test, type Page, type Route } from '@playwright/test';

const COMMUNICATION_URL = '/communication?asUser=dev&conversationId=conv-pharmacy';

async function preventCommunicationWrites(
  page: Page,
  onDraft?: (route: Route) => Promise<void>,
  onNewConversation?: (route: Route) => Promise<void>,
) {
  await page.route('**/api/communication/v1/**', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }

    const pathname = new URL(request.url()).pathname;
    if (pathname === '/api/communication/v1/drafts' && onDraft) {
      await onDraft(route);
      return;
    }

    if (pathname === '/api/communication/v1/conversations' && onNewConversation) {
      await onNewConversation(route);
      return;
    }

    if (/^\/api\/communication\/v1\/messages\/[^/]+\/read$/.test(pathname)) {
      await route.fulfill({ status: 204 });
      return;
    }

    await route.abort();
  });
}

test.describe('Communication Hub', () => {
  test('uses the canonical dev preview, truthfully labels Video, and clears a stale thread on Email', async ({ page }) => {
    await preventCommunicationWrites(page);
    await page.goto(COMMUNICATION_URL, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Communication Hub', exact: true })).toBeVisible();
    await expect(page.locator('.communication-hub-session')).toContainText('Dr. Maya Chen');
    await expect(page.locator('[aria-label="Provider status"]')).toContainText('Video provider not configured');

    const activeConversation = page.locator('[aria-label="Active conversation"]');
    await expect(activeConversation).toContainText('Metformin dose clarification');

    await page.getByRole('tab', { name: 'Video', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Video', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(activeConversation.getByText('Video provider not configured', { exact: true })).toBeVisible();
    await expect(activeConversation).toContainText('Video visits cannot be started in this environment.');

    await page.getByRole('tab', { name: 'Email', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Email', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(activeConversation).not.toContainText('Metformin dose clarification');

    await page.getByRole('tab', { name: 'Voicemail', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Voicemail', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(activeConversation).toContainText('Follow-up appointment');
  });

  test('renders authorized call history and device readiness without asserting an active media session', async ({ page, request }) => {
    await preventCommunicationWrites(page);
    await page.goto('/communication?asUser=dev&channel=call&folder=calls', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Call control and history', exact: true })).toBeVisible();
    await expect(page.getByText('This workspace is not an emergency service.', { exact: true })).toBeVisible();
    await expect(page.getByText('Media provider', { exact: true })).toBeVisible();
    await expect(page.getByText('Not configured', { exact: true }).first()).toBeVisible();
    await expect(page.locator('.telehealth-calls-metrics')).toContainText(/active call-control sessions? asserted/);

    const firstCall = page.locator('.telehealth-calls-row').first();
    await expect(firstCall).toBeVisible();
    await firstCall.click();
    await expect(page.getByRole('heading', { name: 'Lifecycle history', exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: 'Search call history', exact: true }).fill('no-matching-call-record');
    await expect(page.getByText('No call records match this view.', { exact: true })).toBeVisible();
    await expect(page.getByText('No call selected', { exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: 'Search call history', exact: true }).fill('');
    await expect(firstCall).toBeVisible();

    const deviceCheck = page.getByRole('link', { name: 'Run device check', exact: true }).first();
    await expect(deviceCheck).toHaveAttribute('href', /\/telehealth\/calls\/[^/]+\/device-check\?asUser=dev/);
    await deviceCheck.click();
    await expect(page.getByRole('heading', { name: 'Device check', exact: true })).toBeVisible();
    await expect(page.getByText('Media sessions are not configured in this environment.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check microphone and camera', exact: true })).toBeVisible();
    await expect(page.getByText('Speaker', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Network', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Browser compatibility', { exact: true })).toBeVisible();
    await expect(page.getByText('Microphone input level', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Preview camera for 10 seconds', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play speaker test tone', exact: true })).toBeVisible();

    const missingCall = await request.get('/api/communication/v1/calls/not-a-real-call?asUser=dev');
    expect(missingCall.status()).toBe(404);

    await page.goto('/telehealth/calls/not-a-real-call/device-check?asUser=dev', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('This page could not be found.', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Device check', exact: true })).toHaveCount(0);
  });

  test('preserves the preview actor for a draft and reports saved only after a successful response', async ({ page }) => {
    let draftRequestUrl = '';
    let beginDraftRequest: (() => void) | undefined;
    let releaseDraftResponse: (() => void) | undefined;
    const draftRequestStarted = new Promise<void>((resolve) => {
      beginDraftRequest = resolve;
    });
    const draftResponseReleased = new Promise<void>((resolve) => {
      releaseDraftResponse = resolve;
    });

    await preventCommunicationWrites(page, async (route) => {
      draftRequestUrl = route.request().url();
      beginDraftRequest?.();
      await draftResponseReleased;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'mock-draft' } }),
      });
    });

    await page.goto(COMMUNICATION_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Communication Hub', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'New communication', exact: true }).click();
    await page.getByRole('textbox', { name: 'Message body' }).fill('Please confirm the follow-up plan.');
    await draftRequestStarted;

    const draftStatus = page.locator('.communication-hub-draft-status');
    await expect(draftStatus).toHaveText(/Saving draft/);
    await expect(draftStatus).not.toHaveText(/Draft saved/);
    expect(new URL(draftRequestUrl).searchParams.get('asUser')).toBe('dev');

    if (!releaseDraftResponse) throw new Error('The mocked draft response was not ready to release.');
    releaseDraftResponse();

    await expect(draftStatus).toHaveText(/Draft saved/);
  });

  test('makes a preview draft-save failure visible instead of claiming success', async ({ page }) => {
    await preventCommunicationWrites(page, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/problem+json',
        body: JSON.stringify({ code: 'DRAFT_STORE_UNAVAILABLE', detail: 'Draft storage is temporarily unavailable.' }),
      });
    });

    await page.goto(COMMUNICATION_URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New communication', exact: true }).click();
    await page.getByRole('textbox', { name: 'Message body' }).fill('This draft must show a recoverable failure.');

    await expect(page.locator('.communication-hub-draft-status')).toHaveText(/Draft could not be saved/);
    await expect(page.locator('.communication-hub-alert.is-error')).toContainText('Draft storage is temporarily unavailable.');
  });

  test('keeps local edits recoverable when another session changes a draft', async ({ page }) => {
    let saveAttempts = 0;
    await preventCommunicationWrites(page, async (route) => {
      saveAttempts += 1;
      if (saveAttempts === 1) {
        await route.fulfill({
          status: 409,
          contentType: 'application/problem+json',
          body: JSON.stringify({ code: 'DRAFT_VERSION_CONFLICT', detail: 'The draft changed elsewhere.' }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'saved-local-copy', revision: 1 } }) });
    });

    await page.goto(COMMUNICATION_URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New communication', exact: true }).click();
    await page.getByRole('textbox', { name: 'Message body' }).fill('Keep these local edits after a draft conflict.');

    await expect(page.getByText('This draft changed in another session.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save local copy', exact: true }).click();
    await expect(page.getByText('This draft changed in another session.', { exact: true })).toBeHidden();
    await expect(page.locator('.communication-hub-draft-status')).toHaveText(/Draft saved/);
    expect(saveAttempts).toBeGreaterThanOrEqual(2);
  });

  test('locks a composer while Save and close is persisting its final draft', async ({ page }) => {
    let releaseDraftResponse: (() => void) | undefined;
    let beginDraftRequest: (() => void) | undefined;
    const beganSaving = new Promise<void>((resolve) => {
      beginDraftRequest = resolve;
    });
    const draftResponseReleased = new Promise<void>((resolve) => {
      releaseDraftResponse = resolve;
    });

    await preventCommunicationWrites(page, async (route) => {
      beginDraftRequest?.();
      await draftResponseReleased;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'saved-draft', revision: 1 } }) });
    });

    await page.goto(COMMUNICATION_URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New communication', exact: true }).click();
    await page.getByRole('textbox', { name: 'Message body' }).fill('Do not allow an edit to race the final draft save.');
    await page.getByRole('button', { name: 'Save and close', exact: true }).click();
    await beganSaving;

    await expect(page.getByRole('textbox', { name: 'Message body' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save and close', exact: true })).toBeDisabled();
    if (!releaseDraftResponse) throw new Error('The mocked draft response was not ready to release.');
    releaseDraftResponse();
    await expect(page.locator('.communication-hub-alert.is-success')).toContainText('Draft saved locally.');
  });

  test('reuses the idempotency key when a message response is lost or fails', async ({ page }) => {
    const idempotencyKeys: string[] = [];
    await preventCommunicationWrites(
      page,
      async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'mock-draft' } }) });
      },
      async (route) => {
        idempotencyKeys.push(route.request().headers()['idempotency-key'] || '');
        if (idempotencyKeys.length === 1) {
          await route.fulfill({ status: 503, contentType: 'application/problem+json', body: JSON.stringify({ detail: 'The response could not be confirmed.' }) });
          return;
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { id: 'conv-pharmacy' } }) });
      },
    );

    await page.goto(COMMUNICATION_URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New communication', exact: true }).click();
    await page.getByRole('textbox', { name: 'Subject' }).fill('Retry-safe communication');
    await page.getByRole('textbox', { name: 'Message body' }).fill('The retry must retain its idempotency key.');
    await page.getByRole('button', { name: 'Review and send', exact: true }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Send securely', exact: true }).click();
    await expect(page.locator('.communication-hub-alert.is-error')).toContainText('The response could not be confirmed.');
    await dialog.getByRole('button', { name: 'Send securely', exact: true }).click();

    await expect.poll(() => idempotencyKeys.length).toBe(2);
    expect(idempotencyKeys[0]).toBeTruthy();
    expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
  });

  test('opens an internal-note composer from the action center', async ({ page }) => {
    await preventCommunicationWrites(page);
    await page.goto(COMMUNICATION_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[aria-label="Active conversation"]')).toContainText('Metformin dose clarification');

    await page.getByRole('button', { name: 'Add internal note', exact: true }).click();
    await expect(page.getByText('Not visible to the patient', { exact: true })).toBeVisible();
  });

  test('rejects browser-supplied or forged attachment metadata without creating a communication', async ({ request }) => {
    const basePayload = {
      recipientId: 'org-maple-pharmacy',
      patientId: 'patient-001',
      subject: 'Attachment validation regression',
      bodyText: 'This request is intentionally invalid and must not persist.',
      channel: 'secure_message',
    };

    const legacy = await request.post('/api/communication/v1/conversations?asUser=dev', {
      headers: { 'Idempotency-Key': 'e2e-legacy-attachment' },
      data: { ...basePayload, idempotencyKey: 'e2e-legacy-attachment', attachments: [{ filename: 'forged.pdf' }] },
    });
    expect(legacy.status()).toBe(400);
    await expect(legacy.json()).resolves.toMatchObject({ code: 'VALIDATION_FAILED' });

    const forged = await request.post('/api/communication/v1/conversations?asUser=dev', {
      headers: { 'Idempotency-Key': 'e2e-forged-attachment' },
      data: { ...basePayload, idempotencyKey: 'e2e-forged-attachment', attachmentIds: ['forged-by-browser'] },
    });
    expect(forged.status()).toBe(422);
    await expect(forged.json()).resolves.toMatchObject({ code: 'ATTACHMENT_NOT_FOUND' });

    const forgedReply = await request.post('/api/communication/v1/conversations/conv-pharmacy?asUser=dev', {
      headers: { 'Idempotency-Key': 'e2e-forged-reply-attachment' },
      data: { recipientId: 'org-maple-pharmacy', bodyText: 'This reply is intentionally invalid.', idempotencyKey: 'e2e-forged-reply-attachment', attachmentIds: ['forged-by-browser'] },
    });
    expect(forgedReply.status()).toBe(422);
    await expect(forgedReply.json()).resolves.toMatchObject({ code: 'ATTACHMENT_NOT_FOUND' });
  });

  test('denies a conversation detail request outside the selected patient context', async ({ request }) => {
    const response = await request.get('/api/communication/v1/conversations/conv-pharmacy?asUser=dev&patientId=patient-002');

    expect(response.status()).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ code: 'CONVERSATION_NOT_FOUND' });
  });

  test('rejects mismatched patient scope before draft, attachment, or voicemail changes', async ({ request }) => {
    const draft = await request.post('/api/communication/v1/drafts?asUser=dev&patientId=patient-001', {
      data: {
        id: 'e2e-patient-scope-draft',
        revision: 0,
        patientId: 'patient-002',
        channel: 'secure_message',
        subject: 'Scope mismatch draft',
        bodyText: 'This draft must not be saved outside the selected patient context.',
      },
    });
    expect(draft.status()).toBe(422);
    await expect(draft.json()).resolves.toMatchObject({ code: 'PATIENT_CONTEXT_MISMATCH' });

    const attachment = await request.post('/api/communication/v1/attachments/presign?asUser=dev&patientId=patient-001', {
      data: {
        filename: 'scope-mismatch.pdf',
        contentType: 'application/pdf',
        sizeBytes: 128,
        patientId: 'patient-002',
      },
    });
    expect(attachment.status()).toBe(422);
    await expect(attachment.json()).resolves.toMatchObject({ code: 'PATIENT_CONTEXT_MISMATCH' });

    const voicemail = await request.patch('/api/communication/v1/voicemails/vm-patient-1?asUser=dev&patientId=patient-002', {
      headers: { 'Idempotency-Key': 'e2e-patient-scope-voicemail' },
      data: { action: 'review' },
    });
    expect(voicemail.status()).toBe(422);
    await expect(voicemail.json()).resolves.toMatchObject({ code: 'PATIENT_CONTEXT_MISMATCH' });
  });
});
