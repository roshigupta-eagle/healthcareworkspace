import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { logAuditEvent } from '@/lib/audit';
import { buildSummaryEvidence, listVersions, mapSummaryToFhir } from '@/lib/aiSummaryStore';
import { resolveSession } from '@/lib/serverAuth';

const EXPORT_ROLES = new Set(['ADMIN', 'DOCTOR', 'NURSE', 'CLINICIAN', 'PRACTITIONER']);
const SAFETY_DISCLAIMER = 'This content supports clinical review and may contain incomplete or incorrect information. Verify important findings against source records before making clinical decisions.';
type ExportFormat = 'pdf' | 'json' | 'fhir';

function isFormat(value: unknown): value is ExportFormat { return value === 'pdf' || value === 'json' || value === 'fhir'; }
function boolValue(value: unknown, fallback: boolean) { return typeof value === 'boolean' ? value : fallback; }

function trendData(patient: ReturnType<typeof getPatientById>) {
  if (!patient) return [];
  return [
    ...(patient.vitals?.weight || []).map((item) => ({ metric: 'Weight', date: item.date, value: item.value, unit: item.unit })),
    ...(patient.vitals?.bloodPressure || []).map((item) => ({ metric: 'Blood pressure', date: item.date, value: item.value, unit: item.unit })),
    ...(patient.labResults || []).flatMap((item) => { const value = Number.parseFloat(item.result); return Number.isFinite(value) ? [{ metric: item.name, date: item.date, value, unit: item.unit }] : []; }),
  ];
}

function safeExportData(patient: NonNullable<ReturnType<typeof getPatientById>>, version: NonNullable<Awaited<ReturnType<typeof listVersions>>[number]>, includeEvidence: boolean, includeTrends: boolean, includePatientFriendlySummary: boolean) {
  const sources = buildSummaryEvidence(patient).map((source) => ({ ...source, href: undefined }));
  const evidence = includeEvidence ? sources.filter((source) => source.status !== 'restricted') : undefined;
  return {
    schema: 'roshi.ai-clinical-summary.v1',
    patient: { id: patient.id, name: patient.name, dateOfBirth: patient.dob, mrn: patient.mrn },
    summary: { versionId: version.versionId, versionNumber: version.versionNumber, generatedAt: version.generatedAt, generatedBy: version.generatedBy, dataCutoff: version.dataCutoff, review: version.review, summaryText: version.summaryText, findings: version.findings, clinicalBrief: version.clinicalBrief, itemsToReview: version.recommendedReview },
    evidence,
    evidenceStats: version.evidenceStats,
    trends: includeTrends ? trendData(patient) : undefined,
    patientFriendlySummary: includePatientFriendlySummary ? version.patientFriendlySummary : undefined,
    safetyDisclaimer: SAFETY_DISCLAIMER,
  };
}

function wrapText(text: string, maxCharacters = 92) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + (current ? ' ' : '') + word).length > maxCharacters && current) { lines.push(current); current = word; } else current += `${current ? ' ' : ''}${word}`;
  }
  if (current) lines.push(current);
  return lines;
}

async function createPdf(data: ReturnType<typeof safeExportData>) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage();
  let y = page.getHeight() - 52;
  const draw = (text: string, options: { font?: typeof regular; size?: number; color?: ReturnType<typeof rgb> } = {}) => {
    const size = options.size || 10;
    for (const line of wrapText(text, size <= 10 ? 100 : 80)) {
      if (y < 52) { page = document.addPage(); y = page.getHeight() - 52; }
      page.drawText(line, { x: 48, y, size, font: options.font || regular, color: options.color || rgb(0.08, 0.12, 0.2) });
      y -= size + 5;
    }
  };
  draw('AI Clinical Summary', { font: bold, size: 18, color: rgb(0.02, 0.35, 0.34) });
  y -= 6;
  draw(`${data.patient.name} · MRN ${data.patient.mrn}`, { font: bold, size: 11 });
  draw(`Version ${data.summary.versionNumber} · Generated ${new Date(data.summary.generatedAt).toLocaleString()} · Data through ${data.summary.dataCutoff || 'not documented'}`);
  y -= 8;
  draw('Clinical brief', { font: bold, size: 13 });
  draw(data.summary.summaryText);
  for (const finding of data.summary.findings || []) { y -= 4; draw(`${finding.category || 'Finding'}: ${finding.statement}`); }
  if (data.evidence) { y -= 8; draw('Evidence references', { font: bold, size: 13 }); for (const source of data.evidence) draw(`${source.resourceType} · ${source.title || source.id} · ${source.date || 'Date not documented'} · ${source.status || 'included'}`); }
  if (data.trends) { y -= 8; draw('Clinical trends', { font: bold, size: 13 }); for (const trend of data.trends) draw(`${trend.metric}: ${trend.value} ${trend.unit || ''} · ${trend.date}`); }
  if (data.patientFriendlySummary) { y -= 8; draw('Patient-friendly summary', { font: bold, size: 13 }); draw(data.patientFriendlySummary); }
  y -= 10; draw('AI safety notice', { font: bold, size: 11, color: rgb(0.06, 0.28, 0.55) }); draw(data.safetyDisclaimer, { color: rgb(0.06, 0.28, 0.55) });
  return document.save();
}

async function handleExport(request: Request, patientId: string) {
  const session = await resolveSession(request);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = String(session.user.role || '').toUpperCase();
  if (role && !EXPORT_ROLES.has(role) && role !== 'DEV') return NextResponse.json({ error: 'Export is restricted to authorized clinical staff.' }, { status: 403 });
  const patient = getPatientById(patientId);
  if (!patient) return NextResponse.json({ error: 'patient not found' }, { status: 404 });
  let body: { versionId?: unknown; format?: unknown; includeEvidence?: unknown; includeTrends?: unknown; includePatientFriendlySummary?: unknown } = {};
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: 'Invalid export request.' }, { status: 400 }); }
  if (!isFormat(body.format)) return NextResponse.json({ error: 'A supported export format is required.' }, { status: 400 });
  const versions = await listVersions(patientId);
  const versionId = typeof body.versionId === 'string' && body.versionId ? body.versionId : versions[0]?.versionId;
  const version = versions.find((item) => item.versionId === versionId);
  if (!version) return NextResponse.json({ error: 'summary version not found' }, { status: 404 });
  const includeEvidence = boolValue(body.includeEvidence, true);
  const includeTrends = boolValue(body.includeTrends, true);
  const includePatientFriendlySummary = boolValue(body.includePatientFriendlySummary, false);
  if (includePatientFriendlySummary && !version.patientFriendlySummary) return NextResponse.json({ error: 'Generate a patient-friendly summary before including it in an export.' }, { status: 400 });
  const data = safeExportData(patient, version, includeEvidence, includeTrends, includePatientFriendlySummary);
  await logAuditEvent({ agentId: session.user.id || 'unknown', entityType: 'AIClinicalSummary', entityId: version.versionId, action: 'E', outcome: 'success', description: `Exported AI summary as ${body.format}`, detail: { patientId, version: version.versionNumber, format: body.format, includeEvidence, includeTrends, includePatientFriendlySummary } });
  if (body.format === 'fhir') {
    const bundle = await mapSummaryToFhir(patientId, version.versionId);
    return new NextResponse(JSON.stringify(bundle, null, 2), { headers: { 'Content-Type': 'application/fhir+json; charset=utf-8', 'Content-Disposition': `attachment; filename="ai-summary-${patientId}-v${version.versionNumber}.json"`, 'Cache-Control': 'private, no-store' } });
  }
  if (body.format === 'json') return new NextResponse(JSON.stringify(data, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="ai-summary-${patientId}-v${version.versionNumber}.json"`, 'Cache-Control': 'private, no-store' } });
  const pdf = await createPdf(data);
  return new NextResponse(pdf as BodyInit, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="ai-summary-${patientId}-v${version.versionNumber}.pdf"`, 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  try { return await handleExport(request, patientId); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Export failed.' }, { status: 500 }); }
}

export async function GET(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'json';
  const syntheticRequest = new Request(request.url, { method: 'POST', headers: new Headers(request.headers), body: JSON.stringify({ format, versionId: url.searchParams.get('versionId') || undefined, includeEvidence: true, includeTrends: true }) });
  try { return await handleExport(syntheticRequest, patientId); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Export failed.' }, { status: 500 }); }
}