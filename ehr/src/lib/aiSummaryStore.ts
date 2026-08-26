import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { getPatientById, type Patient } from '@/app/dashboard/records/mockPatients';
import { extractDraftFromGatewayResponse } from '@/lib/aiNoteDraft';
import { resolveDataPath } from '@/lib/dataPath';
import type { AIClinicalFinding, AIClinicalSummaryVersion, AIEvidenceReference } from '@/types/aiSummary';

const SUMMARIES_FILE = resolveDataPath('ai-summaries.json');
const AUDIT_FILE = resolveDataPath('ai-audit.json');
const AI_SAFETY_DISCLAIMER = 'This content supports clinical review and may contain incomplete or incorrect information. Verify important findings against source records before making clinical decisions.';

type JsonRecord = Record<string, unknown>;
type SummaryPayload = Partial<AIClinicalSummaryVersion> & { generatedBy: string; summaryText: string };
type ReviewInput = { id?: string; name?: string; disposition?: string; note?: string };
type RawFinding = { statement?: unknown; category?: unknown; severity?: unknown; confidence?: unknown; evidenceIds?: unknown };
type RawSummary = { summaryText?: unknown; findings?: unknown; clinicalBrief?: unknown; recommendedReview?: unknown; evidenceIds?: unknown };

function isRecord(value: unknown): value is JsonRecord { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }
function stringValue(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.flatMap((item) => typeof item === 'string' && item.trim() ? [item.trim()] : []) : []; }

async function ensureData() {
  await fs.mkdir(path.dirname(SUMMARIES_FILE), { recursive: true });
  try { await fs.access(SUMMARIES_FILE); } catch { await fs.writeFile(SUMMARIES_FILE, '{}', 'utf8'); }
  try { await fs.access(AUDIT_FILE); } catch { await fs.writeFile(AUDIT_FILE, '[]', 'utf8'); }
}

async function readAll(): Promise<Record<string, AIClinicalSummaryVersion[]>> {
  await ensureData();
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(SUMMARIES_FILE, 'utf8') || '{}');
    return isRecord(parsed) ? parsed as Record<string, AIClinicalSummaryVersion[]> : {};
  } catch { return {}; }
}

async function writeAll(data: Record<string, AIClinicalSummaryVersion[]>) {
  await ensureData();
  const temporaryFile = `${SUMMARIES_FILE}.${process.pid}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(temporaryFile, SUMMARIES_FILE);
}

async function appendAudit(event: JsonRecord) {
  await ensureData();
  let entries: JsonRecord[] = [];
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(AUDIT_FILE, 'utf8') || '[]');
    if (Array.isArray(parsed)) entries = parsed.filter(isRecord);
  } catch { entries = []; }
  const temporaryFile = `${AUDIT_FILE}.${process.pid}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify([event, ...entries].slice(0, 200), null, 2), 'utf8');
  await fs.rename(temporaryFile, AUDIT_FILE);
}

export async function listAuditEvents(patientId?: string, versionId?: string): Promise<JsonRecord[]> {
  await ensureData();
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(AUDIT_FILE, 'utf8') || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecord).filter((entry) => (!patientId || entry.patientId === patientId) && (!versionId || entry.versionId === versionId));
  } catch { return []; }
}

export async function getLatestSummary(patientId: string): Promise<AIClinicalSummaryVersion | null> { return (await readAll())[patientId]?.[0] || null; }
export async function listVersions(patientId: string): Promise<AIClinicalSummaryVersion[]> { return (await readAll())[patientId] || []; }

export async function createSummaryVersion(patientId: string, payload: SummaryPayload) {
  const all = await readAll();
  const list = all[patientId] || [];
  const version: AIClinicalSummaryVersion = {
    versionId: `v-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`,
    versionNumber: (list[0]?.versionNumber || 0) + 1,
    generatedAt: new Date().toISOString(),
    generatedBy: payload.generatedBy,
    model: payload.model || 'configured-ai-gateway',
    dataCutoff: payload.dataCutoff || new Date().toISOString(),
    patientId,
    findings: payload.findings || [],
    summaryText: payload.summaryText.trim(),
    patientFriendlySummary: payload.patientFriendlySummary,
    clinicalBrief: payload.clinicalBrief,
    recommendedReview: payload.recommendedReview,
    evidenceStats: payload.evidenceStats,
    provenance: payload.provenance,
  };
  all[patientId] = [version, ...list];
  await writeAll(all);
  await appendAudit({ event: 'ai.summary.generated', patientId, versionId: version.versionId, ts: version.generatedAt, by: payload.generatedBy, version: version.versionNumber });
  return version;
}

export async function markSummaryReviewed(patientId: string, versionId: string, reviewer: ReviewInput) {
  const all = await readAll();
  const version = (all[patientId] || []).find((item) => item.versionId === versionId);
  if (!version) throw new Error('version not found');
  const reviewedBy = reviewer.id || reviewer.name || 'unknown';
  version.review = { reviewedBy, reviewedAt: new Date().toISOString(), disposition: reviewer.disposition || 'Reviewed', note: reviewer.note || '' };
  await writeAll(all);
  await appendAudit({ event: 'ai.summary.reviewed', patientId, versionId, ts: version.review.reviewedAt, by: reviewedBy, disposition: version.review.disposition, version: version.versionNumber });
  return version;
}

export async function updatePatientFriendlySummary(patientId: string, versionId: string, text: string, generatedBy: string) {
  const all = await readAll();
  const version = (all[patientId] || []).find((item) => item.versionId === versionId);
  if (!version) throw new Error('version not found');
  version.patientFriendlySummary = text.trim();
  await writeAll(all);
  await appendAudit({ event: 'ai.summary.patient-friendly-generated', patientId, versionId, ts: new Date().toISOString(), by: generatedBy, version: version.versionNumber });
  return version;
}

function patientPath(patientId: string) { return `/dashboard/records/${encodeURIComponent(patientId)}`; }
function sourceHref(patientId: string, resourceType: string, id: string) {
  const base = patientPath(patientId);
  const encodedId = encodeURIComponent(id);
  if (resourceType === 'Observation') return `${base}/labs?selected=${encodedId}`;
  if (resourceType === 'MedicationStatement') return `${base}/medications`;
  if (resourceType === 'Condition') return `${base}/conditions`;
  if (resourceType === 'ClinicalNote') return `${base}/doctor-notes?noteId=${encodedId}`;
  if (resourceType === 'DocumentReference') return `${base}/documents?documentId=${encodedId}`;
  if (resourceType === 'Appointment') return `${base}/appointments/${encodedId}`;
  if (resourceType === 'CareGap') return `${base}/care-gaps`;
  return base;
}

export function buildSummaryEvidence(patient: Patient): AIEvidenceReference[] {
  const sources: AIEvidenceReference[] = [];
  for (const lab of patient.labResults || []) sources.push({ id: lab.id, resourceType: 'Observation', date: lab.date, title: lab.name, source: lab.laboratory || lab.provider, href: sourceHref(patient.id, 'Observation', lab.id) });
  for (const item of patient.vitals?.weight || []) sources.push({ id: `weight-${item.date}`, resourceType: 'Observation', date: item.date, title: 'Weight', source: 'Patient vitals', href: `${patientPath(patient.id)}/trends?metric=weight` });
  for (const item of patient.vitals?.bloodPressure || []) sources.push({ id: `bp-${item.date}`, resourceType: 'Observation', date: item.date, title: 'Blood pressure', source: 'Patient vitals', href: `${patientPath(patient.id)}/trends?metric=blood-pressure` });
  for (const medication of patient.medications || []) { const id = `medication-${medication.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`; sources.push({ id, resourceType: 'MedicationStatement', title: medication.name, source: medication.prescriber, href: sourceHref(patient.id, 'MedicationStatement', id) }); }
  for (const condition of patient.conditions || []) { const id = `condition-${condition.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`; sources.push({ id, resourceType: 'Condition', title: condition, source: 'Patient problem list', href: sourceHref(patient.id, 'Condition', id) }); }
  for (const note of patient.notes || []) sources.push({ id: note.id, resourceType: 'ClinicalNote', date: note.date, title: note.snippet || note.status || 'Clinical note', source: note.author, href: sourceHref(patient.id, 'ClinicalNote', note.id) });
  for (const document of patient.documents || []) sources.push({ id: document.id, resourceType: 'DocumentReference', date: document.date, title: document.name, source: document.author, href: sourceHref(patient.id, 'DocumentReference', document.id) });
  for (const appointment of patient.upcoming || []) sources.push({ id: appointment.id, resourceType: 'Appointment', date: appointment.date, title: appointment.type, source: appointment.doctor, href: sourceHref(patient.id, 'Appointment', appointment.id) });
  for (const gap of patient.careGaps || []) sources.push({ id: gap.id, resourceType: 'CareGap', date: gap.dueDate, title: gap.item, source: gap.clinician, href: sourceHref(patient.id, 'CareGap', gap.id) });
  return sources;
}

function gatewayConfig() {
  const configuredEndpoint = process.env.ROSHI_AI_SUMMARY_URL?.trim() || process.env.ROSHI_AI_DRAFT_URL?.trim();
  const hfToken = process.env.HF_TOKEN?.trim() || process.env.HUGGINGFACE_API_KEY?.trim();
  const hfEndpoint = process.env.HUGGINGFACE_INFERENCE_URL?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const isHuggingFace = !configuredEndpoint && Boolean(hfEndpoint || hfToken);
  const isOpenAi = !configuredEndpoint && !isHuggingFace && Boolean(openAiKey);
  const endpoint = configuredEndpoint || (isHuggingFace ? (hfEndpoint || 'https://router.huggingface.co/v1/chat/completions') : isOpenAi ? (process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1/chat/completions') : '');
  const token = isHuggingFace ? hfToken : isOpenAi ? openAiKey : process.env.ROSHI_AI_SUMMARY_API_KEY?.trim() || process.env.ROSHI_AI_DRAFT_API_KEY?.trim();
  if (!endpoint) throw new Error('AI clinical summary generation is not configured on the server.');
  if (isHuggingFace && endpoint.includes('router.huggingface.co') && !token) throw new Error('Hugging Face is configured but its server token is missing.');
  return { endpoint, token, isHuggingFace, isOpenAi, model: isHuggingFace ? process.env.HUGGINGFACE_MODEL?.trim() || 'meta-llama/Llama-3.1-8B-Instruct' : isOpenAi ? process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini' : undefined };
}

async function callSummaryGateway(system: string, input: JsonRecord) {
  const config = gatewayConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.ROSHI_AI_SUMMARY_TIMEOUT_MS || 60000));
  try {
    const headers: Record<string, string> = { accept: 'application/json', 'content-type': 'application/json' };
    if (config.token) headers.authorization = `Bearer ${config.token}`;
    const body = config.isHuggingFace || config.isOpenAi ? { model: config.model, messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(input) }], temperature: 0.2, max_tokens: 1600 } : { system, input };
    const response = await fetch(config.endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal, cache: 'no-store' });
    if (!response.ok) { const detail = (await response.text().catch(() => '')).slice(0, 500); throw new Error(`AI summary gateway returned HTTP ${response.status}.${detail ? ` ${detail}` : ''}`); }
    const payload: unknown = await response.json();
    const text = extractDraftFromGatewayResponse(payload);
    if (!text) throw new Error('AI summary gateway returned no text.');
    const model = isRecord(payload) && typeof payload.model === 'string' ? payload.model : config.model || 'configured-ai-gateway';
    return { text, model };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('AI clinical summary generation timed out.');
    throw error;
  } finally { clearTimeout(timeout); }
}

function parseGatewayJson(text: string): RawSummary {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI summary gateway returned non-JSON content.');
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned.slice(start, end + 1)); } catch { throw new Error('AI summary gateway returned invalid JSON.'); }
  if (!isRecord(parsed)) throw new Error('AI summary gateway returned an invalid summary object.');
  return parsed as RawSummary;
}

function buildFindings(raw: unknown, sources: AIEvidenceReference[]): AIClinicalFinding[] {
  if (!Array.isArray(raw)) return [];
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  return raw.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const finding = item as RawFinding;
    const statement = stringValue(finding.statement);
    if (!statement) return [];
    const evidence = stringArray(finding.evidenceIds).flatMap((id) => { const source = sourceMap.get(id); return source ? [{ ...source, status: 'used' as const }] : []; });
    if (evidence.length === 0) return [];
    return [{ id: `finding-${index + 1}-${randomUUID().slice(0, 6)}`, statement, category: stringValue(finding.category), severity: stringValue(finding.severity) || 'info', confidence: (stringValue(finding.confidence) || 'Limited') as AIClinicalFinding['confidence'], evidence }];
  });
}

function markSourceUsage(sources: AIEvidenceReference[], findings: AIClinicalFinding[], evidenceIds: string[]) {
  const used = new Set([...findings.flatMap((finding) => finding.evidence.map((source) => source.id)), ...evidenceIds]);
  return sources.map((source) => used.has(source.id) ? { ...source, status: 'used' as const } : { ...source, status: 'excluded' as const, reason: 'Not cited by the generated summary.' });
}

const SUMMARY_SYSTEM = ['You are Roshi clinical intelligence assistance.', 'Return only a JSON object with summaryText, findings, clinicalBrief, recommendedReview, and evidenceIds.', 'Summarize and organize only the supplied authorized patient record facts.', 'Never invent diagnoses, causes, values, interpretations, medication changes, appointments, dates, providers, treatment, or follow-up intervals.', 'Do not give treatment recommendations. recommendedReview and itemsToReview may only point a clinician to supplied source records.', 'Every finding must include evidenceIds for supplied source records that directly support it.', 'Use cautious factual language. If there is not enough evidence, say so rather than inferring stability or normality.'].join(' ');

export async function generateSummaryFromPatient(patientId: string, generatedBy = 'unknown-clinician') {
  const patient = getPatientById(patientId);
  if (!patient) throw new Error('patient not found');
  const sources = buildSummaryEvidence(patient);
  const gateway = await callSummaryGateway(SUMMARY_SYSTEM, {
    patient: { id: patient.id, name: patient.name, dob: patient.dob, age: patient.age, sex: patient.gender, conditions: patient.conditions || [], medications: patient.medications || [], allergies: patient.allergies || [] },
    records: { labs: patient.labResults || [], vitals: patient.vitals || {}, notes: patient.notes || [], documents: (patient.documents || []).map((document) => ({ id: document.id, name: document.name, date: document.date, type: document.type, status: document.status, author: document.author })), appointments: patient.upcoming || [], careGaps: patient.careGaps || [] },
    evidence: sources.map((source) => ({ id: source.id, resourceType: source.resourceType, date: source.date, title: source.title, source: source.source, status: source.status, reason: source.reason, fhirReference: source.fhirReference })),
  });
  const raw = parseGatewayJson(gateway.text);
  const findings = buildFindings(raw.findings, sources);
  const usedSources = markSourceUsage(sources, findings, stringArray(raw.evidenceIds));
  const summaryText = stringValue(raw.summaryText);
  if (!summaryText) throw new Error('AI summary did not include summaryText.');
  const brief = isRecord(raw.clinicalBrief) ? raw.clinicalBrief : {};
  return createSummaryVersion(patientId, {
    generatedBy,
    summaryText,
    findings,
    model: gateway.model,
    dataCutoff: patient.dataUpdatedAt || new Date().toISOString(),
    clinicalBrief: { whatMatters: stringArray(brief.whatMatters), whatChanged: stringArray(brief.whatChanged), itemsToReview: stringArray(brief.itemsToReview) },
    recommendedReview: stringArray(raw.recommendedReview),
    evidenceStats: { analyzed: usedSources.length, used: usedSources.filter((source) => source.status === 'used').length, excluded: usedSources.filter((source) => source.status === 'excluded').length, updatedAt: new Date().toISOString() },
    provenance: { evidence: usedSources, safetyDisclaimer: AI_SAFETY_DISCLAIMER },
  });
}

export async function generatePatientFriendlySummary(patientId: string, versionId: string, generatedBy = 'unknown-clinician') {
  const version = (await listVersions(patientId)).find((item) => item.versionId === versionId);
  const patient = getPatientById(patientId);
  if (!version || !patient) throw new Error('summary or patient not found');
  const gateway = await callSummaryGateway(['You are Roshi patient communication assistance.', 'Return only a clear patient-friendly draft, with no markdown headings or metadata.', 'Preserve every fact and uncertainty in the supplied clinician-reviewed summary.', 'Do not add diagnoses, causes, treatments, medication changes, or instructions that are not in the supplied summary.', 'Use plain language and tell the patient to discuss questions with their care team.'].join(' '), { patient: { name: patient.preferredName || patient.name }, reviewedSummary: version.summaryText, evidence: version.findings.map((finding) => ({ statement: finding.statement, evidence: finding.evidence.map((source) => source.title || source.id) })) });
  return updatePatientFriendlySummary(patientId, versionId, gateway.text, generatedBy);
}

function escapeHtml(value: string) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

export async function mapSummaryToFhir(patientId: string, versionId?: string) {
  const version = versionId ? (await listVersions(patientId)).find((item) => item.versionId === versionId) : await getLatestSummary(patientId);
  if (!version) throw new Error('summary not found');
  const patient = getPatientById(patientId);
  if (!patient) throw new Error('patient not found');
  const patientResource = { resourceType: 'Patient', id: patient.id, name: [{ text: patient.name }], birthDate: patient.dob, gender: patient.gender?.toLowerCase(), identifier: patient.mrn ? [{ system: 'urn:roshi:mrn', value: patient.mrn }] : undefined };
  const composition = { resourceType: 'Composition', id: `composition-${version.versionId}`, status: 'final', type: { text: 'AI Clinical Summary' }, title: `AI Clinical Summary v${version.versionNumber}`, date: version.generatedAt, author: [{ display: version.generatedBy }], subject: { reference: `Patient/${patient.id}` }, section: version.findings.map((finding) => ({ title: finding.category || 'Finding', text: { status: 'generated', div: `<div>${escapeHtml(finding.statement)}</div>` }, entry: finding.evidence.map((source) => ({ reference: source.fhirReference || `${source.resourceType}/${source.id}` })) })), extension: [{ url: 'http://roshi.example.org/fhir/StructureDefinition/ai-model', valueString: version.model }, { url: 'http://roshi.example.org/fhir/StructureDefinition/data-cutoff', valueDateTime: version.dataCutoff }, ...(version.review ? [{ url: 'http://roshi.example.org/fhir/StructureDefinition/review-status', valueString: 'reviewed' }] : [])] };
  const documentReference = { resourceType: 'DocumentReference', id: `docref-${version.versionId}`, status: 'current', type: { text: 'AI Clinical Summary' }, subject: { reference: `Patient/${patient.id}` }, date: version.generatedAt, author: [{ display: version.generatedBy }], content: [{ attachment: { contentType: 'text/plain', data: Buffer.from(`${version.summaryText}\n\n${AI_SAFETY_DISCLAIMER}`, 'utf8').toString('base64') }, title: `AI Clinical Summary v${version.versionNumber}` }] };
  const provenance = { resourceType: 'Provenance', id: `provenance-${version.versionId}`, target: [{ reference: `DocumentReference/${documentReference.id}` }, { reference: `Composition/${composition.id}` }], recorded: version.generatedAt, agent: [{ who: { display: version.generatedBy } }], reason: [{ text: 'AI generated clinical summary' }] };
  const observationResources = version.findings.flatMap((finding) => finding.evidence.filter((source) => source.resourceType === 'Observation').map((source) => ({ resourceType: 'Observation', id: source.id, status: 'final', code: { text: source.title || 'Clinical observation' }, subject: { reference: `Patient/${patient.id}` }, effectiveDateTime: source.date })));
  return { resourceType: 'Bundle', type: 'document', timestamp: new Date().toISOString(), entry: [{ resource: patientResource }, { resource: composition }, { resource: documentReference }, { resource: provenance }, ...observationResources.map((resource) => ({ resource }))] };
}

export async function appendAuditEvent(event: JsonRecord) { await appendAudit(event); }