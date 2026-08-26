import React from 'react';
import Link from 'next/link';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import AISummaryActions from '@/components/ai-summary/AISummaryActions';
import ClinicalSummaryWorkspace from '@/components/ai-summary/ClinicalSummaryWorkspace.client';
import { buildSummaryEvidence } from '@/lib/aiSummaryStore';
import type { Patient } from '@/app/dashboard/records/mockPatients';
import type { AIClinicalSummaryVersion, AIEvidenceReference } from '@/types/aiSummary';

type Severity = 'critical' | 'high' | 'moderate' | 'low' | 'info';
type TrendPoint = { date: string; value: number };
type TrendMetric = { id: string; title: string; unit?: string; latest: string; latestDate?: string; reference?: string; interpretation?: string; points: TrendPoint[]; href: string };
type AttentionItem = { id: string; title: string; detail: string; value?: string; date?: string; severity: Severity; href?: string; evidence: AIEvidenceReference[] };
type SummaryEvent = { id: string; kind: string; title: string; subtitle?: string; date?: string; status?: string; href: string };

type Props = { patient: Patient; latestSummary: AIClinicalSummaryVersion | null; summaryError?: string; fromDoctorView?: boolean; doctorViewHref?: string };

function parseNumber(value: string) {
  const parsed = Number.parseFloat(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function severityFor(value: string | undefined, priority?: string): Severity {
  const normalized = `${value || ''} ${priority || ''}`.toLowerCase();
  if (/(critical|panic|hh|ll)/.test(normalized)) return 'critical';
  if (/(high|abnormal|overdue)/.test(normalized)) return 'high';
  if (/(medium|due soon|low)/.test(normalized)) return 'moderate';
  return 'info';
}

function dateTime(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function isOpenStatus(value?: string) {
  return !['completed', 'complete', 'resolved', 'closed', 'cancelled', 'canceled', 'entered-in-error'].includes((value || '').toLowerCase().replace(/[_\s]+/g, '-'));
}

function buildNeedsAttention(patient: Patient, evidence: AIEvidenceReference[]): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const lab of patient.labResults || []) {
    const interpretation = lab.interpretation || '';
    const abnormal = /(critical|panic|high|low|abnormal|hh|ll)/i.test(interpretation) || Boolean(lab.dataQuality);
    const needsReview = abnormal && (!lab.reviewed || Boolean(lab.dataQuality));
    if (!needsReview) continue;
    const source = evidence.find((item) => item.id === lab.id);
    items.push({ id: `lab:${lab.id}`, title: lab.name, value: `${lab.result}${lab.unit ? ` ${lab.unit}` : ''}`, detail: `${interpretation || 'Data-quality review required'}${lab.referenceRange || lab.normalRange ? ` · Reference ${lab.referenceRange || lab.normalRange}` : ''}`, date: lab.date, severity: severityFor(interpretation), href: `${patientBase(patient.id)}/labs?selected=${encodeURIComponent(lab.id)}`, evidence: source ? [source] : [] });
  }
  for (const gap of patient.careGaps || []) {
    if (!isOpenStatus(gap.status)) continue;
    const source = evidence.find((item) => item.id === gap.id);
    items.push({ id: `care-gap:${gap.id}`, title: gap.item, detail: `${gap.status || 'Open care gap'}${gap.clinician ? ` · ${gap.clinician}` : ''}`, date: gap.dueDate, severity: severityFor(gap.status, gap.priority), href: `${patientBase(patient.id)}/care-gaps`, evidence: source ? [source] : [] });
  }
  const severityRank: Record<Severity, number> = { critical: 5, high: 4, moderate: 3, low: 2, info: 1 };
  return items.sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || dateTime(b.date) - dateTime(a.date));
}

function buildMetrics(patient: Patient) {
  const metrics: TrendMetric[] = [];
  const patientBaseHref = patientBase(patient.id);
  const labsByName = new Map<string, NonNullable<Patient['labResults']>[number][]>();
  for (const lab of patient.labResults || []) {
    const key = (lab.name || lab.code || 'Laboratory result').toLowerCase();
    labsByName.set(key, [...(labsByName.get(key) || []), lab]);
  }
  for (const [key, labs] of labsByName) {
    const numericLabs = labs.filter((lab) => parseNumber(lab.result) !== null).sort((a, b) => dateTime(a.date) - dateTime(b.date));
    const latest = labs.slice().sort((a, b) => dateTime(b.date) - dateTime(a.date))[0];
    if (!latest || !numericLabs.length) continue;
    metrics.push({ id: `lab-${key}`, title: latest.name, latest: latest.result, unit: latest.unit, latestDate: latest.date, reference: latest.referenceRange || latest.normalRange, interpretation: latest.interpretation, points: numericLabs.map((lab) => ({ date: lab.date, value: parseNumber(lab.result) as number })), href: `${patientBaseHref}/labs?selected=${encodeURIComponent(latest.id)}` });
  }
  const weight = (patient.vitals?.weight || []).slice().sort((a, b) => dateTime(a.date) - dateTime(b.date));
  if (weight.length) { const latest = weight[weight.length - 1]; metrics.push({ id: 'weight', title: 'Weight', latest: String(latest.value), unit: latest.unit, latestDate: latest.date, points: weight.map((item) => ({ date: item.date, value: item.value })), href: `${patientBaseHref}/weight-trend` }); }
  const bloodPressure = (patient.vitals?.bloodPressure || []).slice().sort((a, b) => dateTime(a.date) - dateTime(b.date));
  if (bloodPressure.length) { const latest = bloodPressure[bloodPressure.length - 1]; metrics.push({ id: 'blood-pressure', title: 'Blood pressure', latest: String(latest.value), unit: latest.unit, latestDate: latest.date, points: bloodPressure.map((item) => ({ date: item.date, value: item.value })), href: `${patientBaseHref}/trends?metric=blood-pressure` }); }
  const heartRate = (patient.vitals?.heartRate || []).slice().sort((a, b) => dateTime(a.date) - dateTime(b.date));
  if (heartRate.length) { const latest = heartRate[heartRate.length - 1]; metrics.push({ id: 'heart-rate', title: 'Heart rate', latest: String(latest.value), unit: latest.unit, latestDate: latest.date, points: heartRate.map((item) => ({ date: item.date, value: item.value })), href: `${patientBaseHref}/trends?metric=heart-rate` }); }
  return metrics.slice(0, 4);
}

function buildEvents(patient: Patient): SummaryEvent[] {
  const base = patientBase(patient.id);
  const events: SummaryEvent[] = [];
  for (const lab of patient.labResults || []) events.push({ id: `lab:${lab.id}`, kind: 'Lab', title: lab.name, subtitle: `${lab.result}${lab.unit ? ` ${lab.unit}` : ''}${lab.interpretation ? ` · ${lab.interpretation}` : ''}`, date: lab.date, status: lab.status, href: `${base}/labs?selected=${encodeURIComponent(lab.id)}` });
  for (const note of patient.notes || []) events.push({ id: `note:${note.id}`, kind: 'Note', title: note.snippet || note.status || 'Clinical note', subtitle: note.author, date: note.date, status: note.status, href: `${base}/doctor-notes?noteId=${encodeURIComponent(note.id)}` });
  for (const document of patient.documents || []) events.push({ id: `document:${document.id}`, kind: 'Document', title: document.name, subtitle: document.type || document.status, date: document.date, status: document.status, href: `${base}/documents?documentId=${encodeURIComponent(document.id)}` });
  for (const appointment of patient.upcoming || []) { const future = dateTime(appointment.date) > Date.now(); events.push({ id: `appointment:${appointment.id}`, kind: 'Appointment', title: appointment.type, subtitle: `${appointment.doctor}${appointment.location ? ` · ${appointment.location}` : ''}`, date: appointment.date, status: future ? 'Upcoming' : appointment.status, href: `${base}/appointments/${encodeURIComponent(appointment.id)}` }); }
  for (const gap of patient.careGaps || []) events.push({ id: `care-gap:${gap.id}`, kind: 'Care gap', title: gap.item, subtitle: gap.clinician, date: gap.dueDate, status: gap.status, href: `${base}/care-gaps` });
  return events.filter((event) => event.date).sort((a, b) => dateTime(b.date) - dateTime(a.date));
}

function patientBase(patientId: string) { return `/dashboard/records/${encodeURIComponent(patientId)}`; }

function evidenceForSummary(patient: Patient, summary: AIClinicalSummaryVersion | null) {
  const catalog = buildSummaryEvidence(patient);
  const persisted = summary?.provenance && typeof summary.provenance === 'object' && !Array.isArray(summary.provenance) && Array.isArray((summary.provenance as { evidence?: unknown }).evidence) ? (summary.provenance as { evidence: unknown[] }).evidence : [];
  const persistedById = new Map(persisted.filter((item): item is AIEvidenceReference => Boolean(item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string')).map((item) => [item.id, item]));
  return catalog.map((source) => ({ ...source, ...(persistedById.get(source.id) || {}) }));
}

export default function ClinicalSummaryLayout({ patient, latestSummary, summaryError, fromDoctorView = false, doctorViewHref = '/doctor' }: Props) {
  const evidence = evidenceForSummary(patient, latestSummary);
  const attention = buildNeedsAttention(patient, evidence);
  const metrics = buildMetrics(patient);
  const events = buildEvents(patient);
  const abnormalLabs = (patient.labResults || []).filter((lab) => /(critical|panic|high|low|abnormal|hh|ll)/i.test(lab.interpretation || '') && (!lab.reviewed || Boolean(lab.dataQuality))).length;
  const openCareGaps = patient.careGaps ? patient.careGaps.filter((gap) => isOpenStatus(gap.status)).length : null;
  const activeMedications = patient.medications ? patient.medications.filter((medication) => !/(inactive|stopped|discontinued)/i.test(medication.status || '')).length : null;
  const latestBloodPressure = patient.vitals?.bloodPressure?.slice().sort((a, b) => dateTime(b.date) - dateTime(a.date))[0];
  const snapshot = { labs: abnormalLabs, vitals: latestBloodPressure ? `${latestBloodPressure.value} ${latestBloodPressure.unit}` : 'No recent data', medications: activeMedications, careGaps: openCareGaps };
  const reviewText = latestSummary?.review ? `Reviewed · ${latestSummary.review.reviewedBy || 'Clinician'} · ${new Date(latestSummary.review.reviewedAt || '').toLocaleString()}` : latestSummary ? 'AI Generated · Not Reviewed' : 'Not generated';
  const pageBase = patientBase(patient.id);

  return <div className="clinical-summary-page"><div className="clinical-summary-container"><header className="clinical-summary-header"><div className="min-w-0"><Link href={fromDoctorView ? doctorViewHref : pageBase} className="clinical-summary-back-link">← {fromDoctorView ? 'Back to Doctor View' : 'Back to Patient'}</Link><div className="mt-4 flex flex-wrap items-center gap-3"><h1 className="clinical-summary-title">AI Clinical Summary</h1><span className="clinical-summary-ai-badge"><span aria-hidden="true">✦</span> AI generated</span></div><p className="mt-2 text-sm text-slate-600">AI-assisted clinical overview grounded in available patient records.</p><p className="mt-2 text-xs font-semibold text-slate-500">{reviewText}{latestSummary?.versionNumber ? ` · Version ${latestSummary.versionNumber}` : ''}{latestSummary?.dataCutoff ? ` · Data through ${new Date(latestSummary.dataCutoff).toLocaleDateString()}` : ''}</p></div><AISummaryActions patientId={patient.id} versionId={latestSummary?.versionId} patientName={patient.name} isReviewed={Boolean(latestSummary?.review)} /></header><PatientProfileHeader patient={patient} /><ClinicalSummaryWorkspace patient={patient} summary={latestSummary} evidence={evidence} needsAttention={attention} metrics={metrics} events={events} snapshot={snapshot} summaryError={summaryError} /></div></div>;
}