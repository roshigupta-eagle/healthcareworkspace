import React from 'react';
import Link from 'next/link';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import type { Patient } from '@/app/dashboard/records/mockPatients';
import type { AIClinicalSummaryVersion, AIEvidenceReference } from '@/types/aiSummary';

type HistoryEvent = Record<string, unknown>;
type Mode = 'audit' | 'history' | 'provenance';

function dateLabel(value: unknown) {
  if (typeof value !== 'string') return 'Date not documented';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date not documented' : date.toLocaleString();
}

function evidenceFrom(version: AIClinicalSummaryVersion | null) {
  const provenance = version?.provenance;
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) return [];
  const records = (provenance as { evidence?: unknown }).evidence;
  if (!Array.isArray(records)) return [];
  return records.filter((item): item is AIEvidenceReference => Boolean(item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string'));
}

export default function SummaryHistoryPage({ patient, versions, events, mode, selectedVersionId }: { patient: Patient; versions: AIClinicalSummaryVersion[]; events: HistoryEvent[]; mode: Mode; selectedVersionId?: string }) {
  const selected = versions.find((version) => version.versionId === selectedVersionId) || versions[0] || null;
  const title = mode === 'audit' ? 'AI Summary History' : mode === 'history' ? 'Summary Versions' : 'Summary Provenance';
  const backHref = `/dashboard/records/${encodeURIComponent(patient.id)}/ai-clinical-summary${selected?.versionId ? `?version=${encodeURIComponent(selected.versionId)}` : ''}`;
  return <div className="clinical-summary-page"><div className="clinical-summary-container"><div className="mb-5"><Link href={backHref} className="clinical-summary-back-link">← Back to AI Clinical Summary</Link></div><PatientProfileHeader patient={patient} showActions={false} /><main className="clinical-summary-panel mt-6" aria-labelledby="summary-history-title"><div className="clinical-summary-section-kicker text-violet-700">Traceability</div><h1 id="summary-history-title" className="clinical-summary-section-title">{title}</h1><p className="mt-2 text-sm text-slate-600">Technical details are reduced to the clinical workflow events and source records needed for review.</p>{mode === 'history' && <div className="mt-6 space-y-3">{versions.length === 0 ? <p className="clinical-summary-empty">No summary versions are available.</p> : versions.map((version) => <Link key={version.versionId} href={`/dashboard/records/${encodeURIComponent(patient.id)}/ai-clinical-summary?version=${encodeURIComponent(version.versionId)}`} className="block rounded-xl border border-slate-200 p-4 hover:border-teal-300 hover:bg-teal-50/40"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-black text-slate-950">Version {version.versionNumber}</div><div className="mt-1 text-xs text-slate-500">Generated {dateLabel(version.generatedAt)} by {version.generatedBy}</div></div><span className={`clinical-summary-badge ${version.review ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{version.review ? 'Reviewed' : 'Not reviewed'}</span></div><p className="mt-3 line-clamp-2 text-sm text-slate-700">{version.summaryText}</p></Link>)}</div>}{mode === 'audit' && <div className="mt-6 space-y-3">{events.length === 0 ? <p className="clinical-summary-empty">No audit events are available for this patient.</p> : events.map((event, index) => <div key={`${String(event.event)}-${String(event.ts)}-${index}`} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><strong className="text-sm text-slate-950">{String(event.event || 'Summary event').replace(/^ai\.summary\./, '').replace(/-/g, ' ')}</strong><span className="text-xs text-slate-500">{dateLabel(event.ts)}</span></div><div className="mt-2 text-xs text-slate-600">Actor: {String(event.by || 'Not documented')} · Version {String(event.version || 'not documented')}</div></div>)}</div>}{mode === 'provenance' && <div className="mt-6">{!selected ? <p className="clinical-summary-empty">No summary version is available.</p> : <><div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4"><div className="text-sm font-black text-violet-950">Version {selected.versionNumber}</div><div className="mt-1 text-xs text-violet-800">Generated {dateLabel(selected.generatedAt)} · Data through {dateLabel(selected.dataCutoff)}</div><div className="mt-3 text-sm text-violet-950">Evidence coverage: {selected.evidenceStats ? `${selected.evidenceStats.used} used directly of ${selected.evidenceStats.analyzed} analyzed` : 'Not documented'}</div></div><div className="mt-4 space-y-3">{evidenceFrom(selected).map((source) => <div key={`${source.resourceType}-${source.id}`} className="rounded-xl border border-slate-200 p-4"><div className="clinical-summary-evidence-type">{source.resourceType}</div><div className="mt-1 text-sm font-black text-slate-950">{source.status === 'restricted' ? 'Restricted evidence' : source.title || source.id}</div><div className="mt-1 text-xs text-slate-500">{source.status || 'status not documented'} · {dateLabel(source.date)}</div>{source.href && source.status !== 'restricted' && <Link href={source.href} className="clinical-summary-text-link mt-3">Open source <span aria-hidden="true">→</span></Link>}</div>)}</div></>}</div>}</main></div></div>;
}