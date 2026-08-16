import { NextResponse } from 'next/server';
import { resolveSession } from '@/lib/serverAuth';
import fs from 'fs';
import path from 'path';
import { getPatientById } from '../../../../dashboard/records/mockPatients';
import type { AiClinicalSummary, AiSummarySourceReference, AiSummaryFinding, AiSummaryMetric, AiRecommendation, AiSummaryConfidence } from '../../../../lib/aiSummaryTypes';

const DATA_DIR = path.join(process.cwd(), 'ehr', 'data', 'ai-summaries');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readSummaries(patientId: string): AiClinicalSummary[] {
  ensureDataDir();
  const fp = path.join(DATA_DIR, `${patientId}.json`);
  if (!fs.existsSync(fp)) return [];
  try {
    const raw = fs.readFileSync(fp, 'utf8');
    return JSON.parse(raw) as AiClinicalSummary[];
  } catch (e) {
    return [];
  }
}

function writeSummaries(patientId: string, entries: AiClinicalSummary[]) {
  ensureDataDir();
  const fp = path.join(DATA_DIR, `${patientId}.json`);
  fs.writeFileSync(fp, JSON.stringify(entries, null, 2), 'utf8');
}

function computeConfidenceFactors(patient: any): AiSummaryConfidence {
  const sourceCount = (patient.labResults?.length ?? 0) + (patient.notes?.length ?? 0) + (patient.vitals?.weight?.length ?? 0) + (patient.vitals?.bloodPressure?.length ?? 0);
  const completeness = Math.min(1, sourceCount / 6);
  const score = Math.round(50 + completeness * 50);
  const label = score >= 80 ? 'High' : score >= 60 ? 'Moderate' : score >= 40 ? 'Low' : 'Insufficient';
  const factors = [
    { name: 'Source count', weight: 0.5, score: Math.min(1, sourceCount / 10), description: 'Number of available clinical records' },
    { name: 'Recency', weight: 0.3, score: patient.dataUpdatedAt ? 1 : 0.4, description: 'Whether patient data includes recent entries' },
    { name: 'Validated sources', weight: 0.2, score: (patient.labResults?.filter((l:any)=>l.reviewed).length ?? 0) > 0 ? 1 : 0.2, description: 'Lab results already reviewed by clinicians' },
  ];

  return { score, label: label as any, factors };
}

export async function GET(_req: Request, { params }: { params: { patientId: string } }) {
  const { patientId } = params;
  const session = await resolveSession(_req);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const summaries = readSummaries(patientId);
  if (summaries.length === 0) {
    return NextResponse.json({ error: 'no summary' }, { status: 404 });
  }
  const latest = summaries[summaries.length - 1];
  return NextResponse.json({ summary: latest });
}

export async function POST(req: Request, { params }: { params: { patientId: string } }) {
  const { patientId } = params;
  const session = await resolveSession(req);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });

  // Simple generation: create a conservative, source-backed summary
  const now = new Date().toISOString();
  const id = `summary-${Date.now()}`;
  const versionId = id;

  const sources: AiSummarySourceReference[] = [];
  (patient.labResults ?? []).forEach((l:any)=> sources.push({ id: l.id, resourceType: 'Observation', date: l.date }));
  (patient.notes ?? []).forEach((n:any)=> sources.push({ id: n.id, resourceType: 'Note', date: n.date }));

  const findings: AiSummaryFinding[] = [];
  findings.push({ id: 'f1', text: `Available clinical data includes ${sources.length} source records (labs, notes, vitals). Summary statements reference these sources.`, confidence: 70, sources: sources.slice(0,3) });

  const metrics: AiSummaryMetric[] = [];
  // pick blood pressure (systolic value) if exists
  const bp = patient.vitals?.bloodPressure?.slice(-1)[0];
  if (bp) {
    metrics.push({ id: 'm-bp', title: 'Blood Pressure (systolic)', value: `${bp.value}`, unit: bp.unit, trend: (patient.vitals?.bloodPressure ?? []).map((p:any)=>({ date: p.date, value: p.value })), source: sources.find(s=>s.resourceType==='Observation') ?? null });
  }
  const weight = patient.vitals?.weight?.slice(-1)[0];
  if (weight) {
    metrics.push({ id: 'm-weight', title: 'Weight', value: `${weight.value}`, unit: weight.unit, trend: (patient.vitals?.weight ?? []).map((p:any)=>({ date: p.date, value: p.value })), source: null });
  }
  if (patient.labResults && patient.labResults.length > 0) {
    const lab = patient.labResults[0];
    metrics.push({ id: 'm-lab-1', title: lab.name, value: lab.result, unit: lab.unit, trend: [], source: { id: lab.id, resourceType: 'Observation', date: lab.date } });
  }

  // Generate conservative recommendations (always suggest review when data exists)
  const recommendations: AiRecommendation[] = [];
  if (sources.length > 0) {
    recommendations.push({ id: 'r1', text: 'Review recent laboratory and blood pressure measurements and confirm plan with patient.', priority: 'High', status: 'Suggested', sources: sources.slice(0,2) });
  }

  const confidence = computeConfidenceFactors(patient) as AiSummaryConfidence;

  const summary: AiClinicalSummary = {
    id,
    versionId,
    patientId,
    generatedAt: now,
    generatedBy: 'local-prototype',
    dataCutoff: patient.dataUpdatedAt ?? now,
    findings,
    metrics,
    recommendations,
    sources,
    confidence,
    reviewed: false,
    review: null,
  };

  const existing = readSummaries(patientId);
  existing.push(summary);
  writeSummaries(patientId, existing);

  // append an audit
  try {
    const auditDir = path.join(process.cwd(), 'ehr', 'data', 'ai-summaries-audit');
    if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true });
    const auditFp = path.join(auditDir, `${patientId}.log`);
    fs.appendFileSync(auditFp, `${new Date().toISOString()} | GENERATED | ${id}\n`, 'utf8');
  } catch (e) {
    // ignore
  }

  return NextResponse.json({ summary }, { status: 201 });
}
 

