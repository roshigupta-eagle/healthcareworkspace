import fs from 'fs/promises';
import path from 'path';
import { AIClinicalSummary, AIClinicalSummaryVersion, AIClinicalFinding, AIEvidenceReference } from '@/types/aiSummary';
import { getPatientById } from '@/app/dashboard/records/mockPatients';

const DATA_DIR = path.join(process.cwd(), 'ehr', 'data');
const SUMMARIES_FILE = path.join(DATA_DIR, 'ai-summaries.json');
const AUDIT_FILE = path.join(DATA_DIR, 'ai-audit.json');

async function ensureData() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(SUMMARIES_FILE); } catch { await fs.writeFile(SUMMARIES_FILE, JSON.stringify({}, null, 2)); }
  try { await fs.access(AUDIT_FILE); } catch { await fs.writeFile(AUDIT_FILE, JSON.stringify([], null, 2)); }
}

async function readAll(): Promise<Record<string, AIClinicalSummaryVersion[]>> {
  await ensureData();
  const raw = await fs.readFile(SUMMARIES_FILE, 'utf8');
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

async function writeAll(data: Record<string, AIClinicalSummaryVersion[]>) {
  await fs.writeFile(SUMMARIES_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function appendAudit(event: any) {
  await ensureData();
  const raw = await fs.readFile(AUDIT_FILE, 'utf8');
  let arr: any[] = [];
  try { arr = JSON.parse(raw || '[]'); } catch { arr = []; }
  arr.unshift(event);
  await fs.writeFile(AUDIT_FILE, JSON.stringify(arr.slice(0, 200), null, 2), 'utf8');
}

export async function getLatestSummary(patientId: string): Promise<AIClinicalSummaryVersion | null> {
  const all = await readAll();
  const list = all[patientId] || [];
  if (!list || list.length === 0) return null;
  // assume newest is first
  return list[0];
}

export async function listVersions(patientId: string) {
  const all = await readAll();
  return all[patientId] || [];
}

function makeId() { return `v-${Date.now()}`; }

export async function createSummaryVersion(patientId: string, payload: Partial<AIClinicalSummaryVersion> & { generatedBy: string; summaryText: string; findings?: AIClinicalFinding[]; model?: string; dataCutoff?: string }) {
  const all = await readAll();
  const list = all[patientId] || [];
  const versionNumber = (list[0]?.versionNumber || 0) + 1;
  const v: AIClinicalSummaryVersion = {
    versionId: makeId(),
    versionNumber,
    generatedAt: new Date().toISOString(),
    generatedBy: payload.generatedBy,
    model: payload.model || 'local-sim-1.0',
    dataCutoff: payload.dataCutoff || new Date().toISOString(),
    patientId,
    findings: payload.findings || [],
    summaryText: payload.summaryText,
    patientFriendlySummary: payload.patientFriendlySummary || undefined,
    provenance: payload.provenance || undefined,
  };
  list.unshift(v);
  all[patientId] = list;
  await writeAll(all);
  await appendAudit({ event: 'ai.summary.created', patientId, versionId: v.versionId, ts: new Date().toISOString(), by: payload.generatedBy });
  return v;
}

export async function markSummaryReviewed(patientId: string, versionId: string, reviewer: any) {
  const all = await readAll();
  const list = all[patientId] || [];
  const v = list.find((x) => x.versionId === versionId);
  if (!v) throw new Error('version not found');
  v.review = { reviewedBy: reviewer?.id || reviewer?.name || 'unknown', reviewedAt: new Date().toISOString(), disposition: reviewer?.disposition || 'Reviewed', note: reviewer?.note || '' };
  await writeAll(all);
  await appendAudit({ event: 'ai.summary.reviewed', patientId, versionId, ts: new Date().toISOString(), by: v.review.reviewedBy, disposition: v.review.disposition });
  return v;
}

export async function mapSummaryToFhir(patientId: string, versionId?: string) {
  const v = versionId ? (await listVersions(patientId)).find(x=>x.versionId===versionId) : await getLatestSummary(patientId);
  if (!v) throw new Error('summary not found');
  // Build a document Bundle containing Patient + Composition + DocumentReference + Provenance and any referenced Observations
  const patient = getPatientById(patientId) || { id: patientId, name: 'Unknown' };

  const patientResource: any = {
    resourceType: 'Patient',
    id: patient.id,
    name: [{ text: patient.name }],
    birthDate: patient.dob,
    identifier: patient.mrn ? [{ system: 'urn:mrn', value: patient.mrn }] : [],
  };

  // Convert findings into composition sections
  const composition: any = {
    resourceType: 'Composition',
    id: `composition-${v.versionId}`,
    status: 'final',
    type: { text: 'AI Clinical Summary' },
    title: `AI Clinical Summary v${v.versionNumber}`,
    date: v.generatedAt,
    author: [{ display: v.generatedBy }],
    subject: { reference: `Patient/${patient.id}` },
    section: (v.findings || []).map((f: any) => ({
      title: f.category || 'Finding',
      text: { status: 'generated', div: `<div>${(f.statement || '').replace(/</g, '&lt;')}</div>` },
      entry: (f.evidence || []).map((e: any) => ({ reference: e.fhirReference || `${e.resourceType}/${e.id}` })),
    })),
    extension: [
      { url: 'http://roshi.example.org/fhir/StructureDefinition/ai-model', valueString: v.model },
      { url: 'http://roshi.example.org/fhir/StructureDefinition/data-cutoff', valueDateTime: v.dataCutoff },
    ],
  };

  // DocumentReference containing the human-readable summary text
  const docRef: any = {
    resourceType: 'DocumentReference',
    id: `docref-${v.versionId}`,
    status: 'current',
    type: { text: 'AI Clinical Summary' },
    subject: { reference: `Patient/${patient.id}` },
    date: v.generatedAt,
    author: [{ display: v.generatedBy }],
    content: [
      {
        attachment: {
          contentType: 'text/html',
          data: Buffer.from(v.summaryText || '').toString('base64'),
        },
        title: `AI Clinical Summary v${v.versionNumber}`,
      },
    ],
  };

  // Provenance for the generated document
  const provenance: any = {
    resourceType: 'Provenance',
    id: `prov-${v.versionId}`,
    target: [{ reference: `DocumentReference/${docRef.id}` }, { reference: `Composition/${composition.id}` }],
    recorded: v.generatedAt,
    agent: [{ who: { display: v.generatedBy } }],
    reason: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason', code: 'AI' }], text: 'AI generated summary' }],
  };

  // Collect observation-like supporting resources from evidence where possible
  const observationResources: any[] = [];
  (v.findings || []).forEach((f: any, fi: number) => {
    (f.evidence || []).forEach((e: any, ei: number) => {
      if (e.resourceType === 'Observation') {
        const obs: any = {
          resourceType: 'Observation',
          id: e.id || `obs-${v.versionId}-${fi}-${ei}`,
          status: 'final',
          code: { text: e.title || e.type || 'Evidence observation' },
          subject: { reference: `Patient/${patient.id}`, display: patient.name },
          effectiveDateTime: e.date || v.generatedAt,
          note: e.note ? [{ text: e.note }] : undefined,
        };
        if (typeof e.value === 'number') obs.valueQuantity = { value: e.value, unit: e.unit || undefined };
        observationResources.push(obs);
      }
    });
  });

  const bundle: any = {
    resourceType: 'Bundle',
    type: 'document',
    timestamp: new Date().toISOString(),
    entry: [
      { resource: patientResource },
      { resource: composition },
      { resource: docRef },
      { resource: provenance },
      ...observationResources.map((r) => ({ resource: r })),
    ],
  };

  return bundle;
}

// Simple local generator that synthesizes a summary from patient mock data
export async function generateSummaryFromPatient(patientId: string, generatedBy = 'local-sim') {
  const patient = getPatientById(patientId);
  if (!patient) throw new Error('patient not found');
  const findings: AIClinicalFinding[] = [];
  // Example: lab trend
  if ((patient.labResults || []).length > 0) {
    const lab = patient.labResults[0];
    findings.push({ id: `f-lab-${lab.id}`, statement: `${lab.name} — latest ${lab.result} ${lab.unit || ''}.`, category: 'Laboratory', confidence: 'High', severity: 'info', evidence: [{ id: lab.id, resourceType: 'Observation', date: lab.date, title: lab.name, fhirReference: `Observation/${lab.id}` }] });
  }
  if ((patient.vitals?.bloodPressure || []).length > 0) {
    const bp = patient.vitals!.bloodPressure.slice(-1)[0];
    findings.push({ id: `f-bp-${Date.now()}`, statement: `Recent blood pressure: ${bp.value} ${bp.unit}.`, category: 'VitalSigns', confidence: 'Moderate', severity: 'info', evidence: [{ id: `bp-${Date.now()}`, resourceType: 'Observation', date: bp.date, title: 'Blood pressure', fhirReference: `Observation/bp-${Date.now()}` }] });
  }
  if ((patient.medications || []).length > 0) {
    findings.push({ id: `f-med-${Date.now()}`, statement: `Active medications: ${(patient.medications||[]).map((m:any)=>m.name).join(', ')}.`, category: 'Medications', confidence: 'Moderate', severity: 'info', evidence: [] });
  }

  const summaryText = `${patient.name} — ${patient.age} yo ${patient.gender || ''}. Key findings: ${findings.slice(0,3).map(f=>f.statement).join(' ')}.`;

  const v = await createSummaryVersion(patientId, { generatedBy, summaryText, findings, model: 'Clinical local-sim 1.0', dataCutoff: new Date().toISOString() });
  return v;
}

export async function appendAuditEvent(event: any) { await appendAudit(event); }

