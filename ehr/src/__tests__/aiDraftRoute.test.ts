import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getPatientById: vi.fn(),
  listDocuments: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/app/dashboard/records/mockPatients', () => ({ getPatientById: mocks.getPatientById }));
vi.mock('@/lib/documentStore', () => ({ listDocuments: mocks.listDocuments }));

import { POST } from '../app/api/patients/[patientId]/notes/ai-draft/route';

const patient = {
  id: 'patient-001',
  name: 'Sarah Jenkins',
  preferredName: 'Sarah',
  dob: '1985-10-12',
  conditions: ['Hypertension'],
  medications: [{ name: 'Metformin', dose: '500 mg', freq: 'twice daily' }],
  upcoming: [],
  documents: [],
  labResults: [
    {
      id: 'cbc-current',
      name: 'CBC - Hemoglobin',
      date: '2026-08-19',
      result: '152',
      unit: 'g/L',
      normalRange: '120-160 g/L',
      interpretation: 'Within range',
      status: 'Final',
      provider: 'Dr. Chen',
      laboratory: 'Maple Health Laboratory',
      specimen: 'Blood',
      method: 'Automated',
      code: '718-7',
      codeSystem: 'http://loinc.org',
    },
    {
      id: 'unselected-result',
      name: 'Platelet count',
      date: '2026-08-19',
      result: '250',
      unit: 'x10^9/L',
      normalRange: '150-400 x10^9/L',
      interpretation: 'Within range',
      status: 'Final',
    },
  ],
};

const validDraft = 'The selected laboratory result was reviewed and is documented here for clinician review before it is shared or added to the clinical note. Confirm the wording, supporting facts, and intended audience before saving the draft in the patient record.';
const metaDraft = 'The communication should address the selected result and explain the requested clinical topic.';

function makeRequest(overrides: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/patients/patient-001/notes/ai-draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      instruction: 'your CBC results are abnormal',
      documentType: 'patient-message',
      format: 'short-paragraph',
      tone: 'patient-friendly',
      detail: 'concise',
      audience: 'Patient',
      structure: 'Paragraph',
      contextSelections: [],
      ...overrides,
    }),
  });
}

async function post(overrides: Record<string, unknown> = {}) {
  return POST(makeRequest(overrides), { params: Promise.resolve({ patientId: 'patient-001' }) });
}

function gatewayResponse(draft: string, status = 200) {
  return new Response(JSON.stringify({ draft }), { status, headers: { 'content-type': 'application/json' } });
}

describe('AI draft route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    mocks.auth.mockResolvedValue({ user: { id: 'doctor-1', role: 'DOCTOR', name: 'Dr. Chen' } });
    mocks.getPatientById.mockReturnValue(patient);
    mocks.listDocuments.mockResolvedValue([]);
    delete process.env.ROSHI_AI_DRAFT_URL;
    delete process.env.HUGGINGFACE_INFERENCE_URL;
    delete process.env.HUGGINGFACE_MODEL;
    delete process.env.HF_TOKEN;
    delete process.env.HUGGINGFACE_API_KEY;
  });

  it('fails closed when no configured AI gateway exists', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await post();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain('AI assistance is not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the server-side OpenAI-compatible fallback when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: validDraft } }], model: 'test-model' }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('OPENAI_API_KEY', 'server-test-key');
    vi.stubEnv('OPENAI_MODEL', 'test-model');

    const response = await post();
    const body = await response.json();
    const [endpoint, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(String(requestInit.body));

    expect(response.status).toBe(200);
    expect(endpoint).toBe('https://api.openai.com/v1/chat/completions');
    expect((requestInit.headers as Record<string, string>).authorization).toBe('Bearer server-test-key');
    expect(requestBody.model).toBe('test-model');
    expect(requestBody.messages[0].role).toBe('system');
    expect(body.draft).toBe(validDraft);
    expect(body.model).toBe('test-model');
  });

  it('uses the configured Hugging Face Inference Router for open-weight drafting', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: validDraft } }], model: 'google/gemma-2-2b-it' }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('HUGGINGFACE_INFERENCE_URL', 'https://router.huggingface.co/v1/chat/completions');
    vi.stubEnv('HUGGINGFACE_MODEL', 'google/gemma-2-2b-it');
    vi.stubEnv('HF_TOKEN', 'hf-server-test-token');

    const response = await post({ contextSelections: [{ type: 'result', id: 'cbc-current' }] });
    const body = await response.json();
    const [endpoint, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(String(requestInit.body));

    expect(response.status).toBe(200);
    expect(endpoint).toBe('https://router.huggingface.co/v1/chat/completions');
    expect((requestInit.headers as Record<string, string>).authorization).toBe('Bearer hf-server-test-token');
    expect(requestBody.model).toBe('google/gemma-2-2b-it');
    expect(requestBody.messages[0].role).toBe('system');
    expect(requestBody.messages[1].role).toBe('user');
    expect(JSON.stringify(requestBody.messages[1])).toContain('cbc-current');
    expect(body.draft).toBe(validDraft);
  });

  it('sends structured settings and only selected authorized context to the gateway', async () => {
    const fetchMock = vi.fn().mockResolvedValue(gatewayResponse(validDraft));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('ROSHI_AI_DRAFT_URL', 'https://ai.example.test/draft');

    const response = await post({ contextSelections: [{ type: 'result', id: 'cbc-current' }] });
    const body = await response.json();
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const gatewayBody = JSON.parse(String(requestInit.body));

    expect(response.status).toBe(200);
    expect(body.draft).toBe(validDraft);
    expect(body.generatedText).toBeUndefined();
    expect(gatewayBody.request).toMatchObject({
      instruction: 'your CBC results are abnormal',
      documentType: 'patient-message',
      format: 'short-paragraph',
      tone: 'patient-friendly',
      detail: 'concise',
      audience: 'Patient',
      structure: 'Paragraph',
      mode: 'generate',
      contextSelections: [{ type: 'result', id: 'cbc-current' }],
    });
    expect(gatewayBody.context.results).toHaveLength(1);
    expect(gatewayBody.context.results[0]).toMatchObject({ id: 'cbc-current', display: 'CBC - Hemoglobin', value: '152', unit: 'g/L', interpretation: 'Within range', referenceRange: '120-160 g/L', source: 'Maple Health Laboratory' });
    expect(JSON.stringify(gatewayBody.context)).not.toContain('unselected-result');
    expect(body.sources).toContainEqual(expect.objectContaining({ type: 'Result', id: 'cbc-current', href: '/dashboard/records/patient-001/labs/cbc-current' }));
  });

  it('attempts at most one bounded correction for meta-output', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(gatewayResponse(metaDraft))
      .mockResolvedValueOnce(gatewayResponse(validDraft));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('ROSHI_AI_DRAFT_URL', 'https://ai.example.test/draft');

    const response = await post();
    const body = await response.json();
    const correctionInit = fetchMock.mock.calls[1][1] as RequestInit;
    const correctionBody = JSON.parse(String(correctionInit.body));

    expect(response.status).toBe(200);
    expect(body.draft).toBe(validDraft);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(correctionBody.request.mode).toBe('regenerate');
    expect(correctionBody.candidateDraft).toBe(metaDraft);
  });

  it('returns an error when the bounded correction still fails validation', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(gatewayResponse(metaDraft))
      .mockResolvedValueOnce(gatewayResponse(metaDraft));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('ROSHI_AI_DRAFT_URL', 'https://ai.example.test/draft');

    const response = await post();
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toContain('did not meet');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('denies a result ID that is not present on the requested patient', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('ROSHI_AI_DRAFT_URL', 'https://ai.example.test/draft');

    const response = await post({ contextSelections: [{ type: 'result', id: 'cbc-from-another-patient' }] });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'selected result is unavailable' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('denies non-clinician sessions before chart context reaches the gateway', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'patient-user', role: 'PATIENT' } });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('ROSHI_AI_DRAFT_URL', 'https://ai.example.test/draft');

    const response = await post({ contextSelections: [{ type: 'result', id: 'cbc-current' }] });

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the previous draft and regeneration mode without changing selected sources', async () => {
    const fetchMock = vi.fn().mockResolvedValue(gatewayResponse(validDraft));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('ROSHI_AI_DRAFT_URL', 'https://ai.example.test/draft');

    const response = await post({ mode: 'regenerate', previousDraft: 'The previous draft used the selected CBC result.', contextSelections: [{ type: 'result', id: 'cbc-current' }] });
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const gatewayBody = JSON.parse(String(requestInit.body));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(gatewayBody.request.mode).toBe('regenerate');
    expect(gatewayBody.request.previousDraft).toBe('The previous draft used the selected CBC result.');
    expect(body.sources).toContainEqual(expect.objectContaining({ id: 'cbc-current' }));
  });
});
