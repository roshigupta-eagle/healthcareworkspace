'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Patient } from '@/app/dashboard/records/mockPatients';
import type { AIClinicalSummaryVersion, AIEvidenceReference } from '@/types/aiSummary';

type Severity = 'critical' | 'high' | 'moderate' | 'low' | 'info';
type TrendPoint = { date: string; value: number };
type TrendMetric = { id: string; title: string; unit?: string; latest: string; latestDate?: string; reference?: string; interpretation?: string; points: TrendPoint[]; href: string };
type AttentionItem = { id: string; title: string; detail: string; value?: string; date?: string; severity: Severity; href?: string; evidence: AIEvidenceReference[] };
type SummaryEvent = { id: string; kind: string; title: string; subtitle?: string; date?: string; status?: string; href: string };
type Snapshot = { labs: number | null; vitals: string; medications: number | null; careGaps: number | null };
type Props = { patient: Patient; summary: AIClinicalSummaryVersion | null; evidence: AIEvidenceReference[]; needsAttention: AttentionItem[]; metrics: TrendMetric[]; events: SummaryEvent[]; snapshot: Snapshot; summaryError?: string; };

const severityMeta: Record<Severity, { label: string; badge: string; rail: string; icon: string }> = {
  critical: { label: 'Critical', badge: 'border-red-200 bg-red-50 text-red-800', rail: 'border-l-red-500', icon: 'alert' },
  high: { label: 'High', badge: 'border-rose-200 bg-rose-50 text-rose-800', rail: 'border-l-rose-400', icon: 'alert' },
  moderate: { label: 'Review', badge: 'border-amber-200 bg-amber-50 text-amber-900', rail: 'border-l-amber-400', icon: 'flag' },
  low: { label: 'Informational', badge: 'border-sky-200 bg-sky-50 text-sky-800', rail: 'border-l-sky-400', icon: 'info' },
  info: { label: 'Informational', badge: 'border-sky-200 bg-sky-50 text-sky-800', rail: 'border-l-sky-400', icon: 'info' },
};

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    ai: <><path d="M12 3l1.3 4.7L18 9l-4.7 1.3L12 15l-1.3-4.7L6 9l4.7-1.3L12 3z" /><path d="M19 15l.6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6L19 15z" /></>,
    alert: <><path d="M12 3l9 16H3L12 3z" /><path d="M12 9v4M12 16h.01" /></>,
    flag: <><path d="M5 21V4" /><path d="M5 5c4-3 6 3 10 0 1-.8 2-.7 3 0v9c-3-2-5 2-9 0" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    lab: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3" /><path d="M7 15h10" /></>,
    activity: <><path d="M3 12h4l2-7 4 14 2-7h6" /></>,
    pill: <><path d="M7 21a5 5 0 010-10l6-6a5 5 0 017 7l-6 6a5 5 0 01-7 3z" /><path d="M8 12l7 7" /></>,
    gap: <><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h5" /><path d="M8 17h.01" /></>,
    note: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
    folder: <><path d="M3 6a2 2 0 012-2h5l2 2h7a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></>,
    history: <><path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></>,
    message: <><path d="M4 5h16v11H8l-4 4z" /><path d="M8 9h8M8 13h5" /></>,
    arrow: <><path d="M5 12h13M13 6l6 6-6 6" /></>,
    close: <><path d="M6 6l12 12M18 6L6 18" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.info}</svg>;
}

function formatDate(value?: string) {
  if (!value) return 'Date not documented';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date not documented' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function isFuture(value: string | undefined, now: number) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time > now;
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('button, a[href], textarea, input, select')).filter((item) => !item.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = bodyOverflow; previous?.focus(); };
  }, [onClose]);
  return <div className="fixed inset-0 z-[var(--z-overlay)] flex bg-slate-950/30" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="clinical-summary-drawer-title" className="clinical-summary-drawer ml-auto flex h-full w-full max-w-[680px] flex-col bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5"><h2 id="clinical-summary-drawer-title" className="text-xl font-black text-slate-950">{title}</h2><button ref={closeRef} type="button" onClick={onClose} aria-label="Close drawer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"><Icon name="close" /></button></div><div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div></div></div>;
}

function Sparkline({ points, label }: { points: TrendPoint[]; label: string }) {
  if (points.length < 2) return <div className="clinical-summary-insufficient">Insufficient longitudinal data for trend.</div>;
  const values = points.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum || 1;
  const coordinates = points.map((point, index) => `${(index / (points.length - 1)) * 100},${36 - ((point.value - minimum) / spread) * 28}`).join(' ');
  return <svg role="img" aria-label={`${label} trend`} viewBox="0 0 100 40" preserveAspectRatio="none" className="h-12 w-28 text-cyan-600"><path d="M0 36H100" stroke="currentColor" strokeOpacity=".16" /><polyline points={coordinates} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SnapshotCard({ label, value, detail, href, icon, tone }: { label: string; value: string; detail: string; href: string; icon: string; tone: string }) {
  return <Link href={href} className="clinical-summary-snapshot-card group"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}><Icon name={icon} /></span><span className="mt-3 block text-[11px] font-extrabold uppercase tracking-[.1em] text-slate-500">{label}</span><span className="mt-1 block text-lg font-black text-slate-950">{value}</span><span className="mt-0.5 block text-xs text-slate-500">{detail}</span><span className="mt-3 flex items-center gap-1 text-xs font-bold text-teal-700">Open <Icon name="arrow" size={13} /></span></Link>;
}

export default function ClinicalSummaryWorkspace({ patient, summary, evidence, needsAttention, metrics, events, snapshot, summaryError }: Props) {
  const searchParams = useSearchParams();
  const [currentSummary, setCurrentSummary] = useState(summary);
  const [renderedAt] = useState(() => Date.now());
  const [period, setPeriod] = useState<'30d' | '3m' | '6m' | '1y'>('1y');
  const [activeSection, setActiveSection] = useState('overview');
  const [evidenceDrawer, setEvidenceDrawer] = useState<AIEvidenceReference[] | null>(null);
  const [friendlyOpen, setFriendlyOpen] = useState(false);
  const [friendlyEditing, setFriendlyEditing] = useState(false);
  const [friendlyDraft, setFriendlyDraft] = useState(currentSummary?.patientFriendlySummary || '');
  const [friendlyGenerating, setFriendlyGenerating] = useState(false);
  const [friendlySaving, setFriendlySaving] = useState(false);
  const [friendlyError, setFriendlyError] = useState<string | null>(null);

  const patientBase = `/dashboard/records/${encodeURIComponent(patient.id)}`;
  const previewActor = process.env.NODE_ENV !== 'production'
    ? searchParams.get('asUser') || (searchParams.get('noauth') ? 'dev' : '')
    : '';
  const patientFriendlyUrl = `${patientBase}/ai-summary/patient-friendly${previewActor ? `?asUser=${encodeURIComponent(previewActor)}` : ''}`;
  const visibleEvidence = evidence.filter((source) => source.status !== 'restricted');
  const evidenceStats = currentSummary?.evidenceStats || { analyzed: evidence.length, used: evidence.filter((source) => source.status === 'used').length, excluded: evidence.filter((source) => source.status === 'excluded').length, updatedAt: currentSummary?.generatedAt || '' };
  const usedEvidence = visibleEvidence.filter((source) => source.status === 'used');
  const tabs = ['overview', 'trends', 'labs', 'conditions', 'medications', 'notes', 'care-gaps', 'evidence'];

  function goToSection(section: string) { setActiveSection(section); document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function filteredPoints(points: TrendPoint[]) {
    const days = period === '30d' ? 30 : period === '3m' ? 90 : period === '6m' ? 180 : 365;
    const cutoff = renderedAt - days * 24 * 60 * 60 * 1000;
    return points.filter((point) => { const time = new Date(point.date).getTime(); return !Number.isFinite(time) || time >= cutoff; });
  }

  async function generateFriendly() {
    if (!currentSummary || friendlyGenerating) return;
    setFriendlyGenerating(true); setFriendlyError(null);
    try {
      const response = await fetch(patientFriendlyUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ versionId: currentSummary.versionId }) });
      const payload = await response.json() as { data?: AIClinicalSummaryVersion; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || 'Patient-friendly summary generation failed.');
      setCurrentSummary(payload.data); setFriendlyDraft(payload.data.patientFriendlySummary || ''); setFriendlyOpen(true);
    } catch (error) { setFriendlyError(error instanceof Error ? error.message : 'Patient-friendly summary generation failed.'); }
    finally { setFriendlyGenerating(false); }
  }

  async function saveFriendly() {
    if (!currentSummary || !friendlyDraft.trim() || friendlySaving) return;
    setFriendlySaving(true); setFriendlyError(null);
    try {
      const response = await fetch(patientFriendlyUrl, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ versionId: currentSummary.versionId, text: friendlyDraft.trim() }) });
      const payload = await response.json() as { data?: AIClinicalSummaryVersion; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || 'Patient-friendly summary could not be saved.');
      setCurrentSummary(payload.data); setFriendlyDraft(payload.data.patientFriendlySummary || ''); setFriendlyEditing(false);
    } catch (error) { setFriendlyError(error instanceof Error ? error.message : 'Patient-friendly summary could not be saved.'); }
    finally { setFriendlySaving(false); }
  }

  return <div className="clinical-summary-workspace">
    {summaryError && <div role="alert" className="clinical-summary-inline-error"><Icon name="alert" />{summaryError}</div>}
    {currentSummary && <section aria-labelledby="clinical-story-title" className="clinical-summary-story"><div className="clinical-summary-section-kicker text-violet-700">Current clinical story</div><h2 id="clinical-story-title" className="clinical-summary-section-title">AI Clinical Brief</h2><p className="mt-3 text-[15px] leading-7 text-slate-800">{currentSummary.summaryText}</p></section>}
    <div className="clinical-summary-tabbar" role="tablist" aria-label="Clinical summary sections">{tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeSection === tab} onClick={() => goToSection(tab)}>{tab.replace('-', ' ')}</button>)}</div>

    <div className="clinical-summary-grid">
      <div className="clinical-summary-main">
        <section id="overview" aria-labelledby="needs-attention-title" className="clinical-summary-hero">
          <div className="clinical-summary-section-kicker">Priority review</div>
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="needs-attention-title" className="clinical-summary-section-title">Needs Attention</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Clinically important items ranked by configured urgency and time sensitivity. Source records remain authoritative.</p></div><span className="clinical-summary-count-badge">{needsAttention.length} {needsAttention.length === 1 ? 'item' : 'items'}</span></div>
          <div className="mt-5 space-y-3">{needsAttention.length === 0 ? <div className="clinical-summary-empty-success"><span>✓</span><div><strong>No immediate review items identified from the available records.</strong><p>Review the source tabs for the complete patient record.</p></div></div> : needsAttention.slice(0, 5).map((item) => { const meta = severityMeta[item.severity]; return <article key={item.id} className={`clinical-summary-attention-row border-l-4 ${meta.rail}`}><div className="flex min-w-0 items-start gap-3"><span className={`clinical-summary-attention-icon ${item.severity === 'critical' || item.severity === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}><Icon name={meta.icon} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[15px] font-black text-slate-950">{item.title}</h3><span className={`clinical-summary-badge ${meta.badge}`}>{meta.label}</span></div>{item.value && <p className="mt-1 text-lg font-black text-slate-900">{item.value}</p>}<p className="mt-1 text-sm text-slate-700">{item.detail}</p><p className="mt-1 text-xs text-slate-500">{formatDate(item.date)}</p></div></div><div className="flex shrink-0 flex-wrap gap-2">{item.evidence.length > 0 && <button type="button" onClick={() => setEvidenceDrawer(item.evidence)} className="clinical-summary-secondary-button">View evidence</button>}{item.href && <Link href={item.href} className="clinical-summary-primary-button">Review</Link>}</div></article>; })}</div>
        </section>

        <section id="brief" aria-labelledby="brief-title" className="clinical-summary-panel"><div className="clinical-summary-panel-heading"><div><div className="clinical-summary-section-kicker text-violet-700">Evidence-grounded synthesis</div><h2 id="brief-title" className="clinical-summary-section-title">AI Clinical Brief</h2></div><span className="clinical-summary-ai-badge"><Icon name="ai" size={14} /> AI generated</span></div>{currentSummary ? <div className="mt-5 grid gap-5 md:grid-cols-3">{[['What matters today', currentSummary.clinicalBrief?.whatMatters || []], ['What changed', currentSummary.clinicalBrief?.whatChanged || []], ['Items to review', currentSummary.clinicalBrief?.itemsToReview?.length ? currentSummary.clinicalBrief.itemsToReview : currentSummary.recommendedReview || []]].map(([label, items]) => <div key={String(label)} className="clinical-summary-brief-column"><h3>{String(label)}</h3>{(items as string[]).length ? <ul>{(items as string[]).slice(0, 5).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>No source-backed items returned for this section.</p>}</div>)}</div> : <div className="clinical-summary-empty">AI brief not generated. Use Regenerate after confirming an AI provider is configured.</div>}<div className="mt-6 flex flex-wrap gap-2 border-t border-slate-200 pt-4">{currentSummary && !currentSummary.review ? <a href="?openReview=1" className="clinical-summary-primary-button">Mark as Reviewed</a> : <span className="clinical-summary-reviewed-chip">✓ Reviewed</span>}<Link href={`${patientBase}/tasks?new=1&title=Follow-up%20from%20AI%20Clinical%20Summary&source=ai-summary`} className="clinical-summary-secondary-button">Create Follow-Up Task</Link><button type="button" onClick={() => window.print()} className="clinical-summary-secondary-button">Print Summary</button></div></section>

        <section id="trends" aria-labelledby="trends-title" className="clinical-summary-panel"><div className="clinical-summary-panel-heading"><div><div className="clinical-summary-section-kicker text-cyan-700">Longitudinal view</div><h2 id="trends-title" className="clinical-summary-section-title">Clinical Trends</h2><p className="mt-1 text-sm text-slate-600">Important measurements from the selected period. Trends never replace clinical interpretation.</p></div><div className="clinical-summary-periods" role="group" aria-label="Trend period">{(['30d', '3m', '6m', '1y'] as const).map((option) => <button key={option} type="button" aria-pressed={period === option} onClick={() => setPeriod(option)}>{option}</button>)}</div></div>{metrics.length === 0 ? <div className="clinical-summary-empty mt-5">Not enough longitudinal data to display a trend.</div> : <div className="mt-5 space-y-3">{metrics.slice(0, 4).map((metric) => { const points = filteredPoints(metric.points); const previous = points.length > 1 ? points[points.length - 2] : undefined; const latest = points[points.length - 1]; const delta = latest && previous ? latest.value - previous.value : undefined; return <article key={metric.id} className="clinical-summary-trend-row"><div className="min-w-0 flex-1"><h3 className="text-[15px] font-black text-slate-950">{metric.title}</h3><p className="mt-1 text-xs text-slate-500">{metric.interpretation || 'Clinical interpretation not documented'}{metric.reference ? ` · Reference ${metric.reference}` : ''}</p></div><div className="text-right"><div className="text-lg font-black text-slate-950">{metric.latest} {metric.unit || ''}</div><div className="text-xs text-slate-500">{formatDate(metric.latestDate)}</div>{delta !== undefined && <div className="text-xs font-bold text-slate-700">Change {delta > 0 ? '+' : ''}{delta.toFixed(2)} {metric.unit || ''}</div>}</div><Sparkline points={points} label={metric.title} /><Link href={metric.href} className="clinical-summary-text-link">Full trend <Icon name="arrow" size={14} /></Link></article>; })}</div>}</section>

        <section id="changes" aria-labelledby="changes-title" className="clinical-summary-panel"><div className="clinical-summary-section-kicker text-blue-700">Longitudinal context</div><h2 id="changes-title" className="clinical-summary-section-title">What Changed Recently</h2>{events.length === 0 ? <div className="clinical-summary-empty mt-5">No recent clinically meaningful changes in the selected period.</div> : <div className="mt-5 divide-y divide-slate-100">{events.slice(0, 8).map((event) => <div key={event.id} className="clinical-summary-change-row"><span className="clinical-summary-change-icon"><Icon name={event.kind === 'Lab' ? 'lab' : event.kind === 'Appointment' ? 'calendar' : event.kind === 'Document' ? 'folder' : event.kind === 'Note' ? 'note' : 'activity'} size={17} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="clinical-summary-change-kind">{event.kind}</span>{(event.status || isFuture(event.date, renderedAt)) && <span className="clinical-summary-badge border-slate-200 bg-slate-50 text-slate-600">{event.status || 'Upcoming'}</span>}</div><h3 className="mt-1 text-sm font-bold text-slate-900">{event.title}</h3><p className="mt-1 text-xs text-slate-500">{event.subtitle || 'Source detail not documented'} · {formatDate(event.date)}</p></div><Link href={event.href} className="clinical-summary-secondary-button">Open</Link></div>)}</div>}</section>

        <section id="labs" className="clinical-summary-anchor-panel"><div className="clinical-summary-section-kicker text-cyan-700">Source lens</div><h2 className="clinical-summary-section-title">Labs</h2><p>Open the filtered laboratory workspace for the complete result list.</p><Link href={`${patientBase}/labs`} className="clinical-summary-text-link">Open Labs <Icon name="arrow" size={14} /></Link></section>
        <section id="conditions" className="clinical-summary-anchor-panel"><div className="clinical-summary-section-kicker text-teal-700">Source lens</div><h2 className="clinical-summary-section-title">Conditions</h2><p>{patient.conditions?.length || 0} documented condition{patient.conditions?.length === 1 ? '' : 's'} from the patient record.</p><Link href={`${patientBase}/conditions`} className="clinical-summary-text-link">Open Conditions <Icon name="arrow" size={14} /></Link></section>
        <section id="medications" className="clinical-summary-anchor-panel"><div className="clinical-summary-section-kicker text-sky-700">Source lens</div><h2 className="clinical-summary-section-title">Medications</h2><p>{patient.medications?.length || 0} medication record{patient.medications?.length === 1 ? '' : 's'} documented in the patient record.</p><Link href={`${patientBase}/medications`} className="clinical-summary-text-link">Open Medications <Icon name="arrow" size={14} /></Link></section>
        <section id="notes" className="clinical-summary-anchor-panel"><div className="clinical-summary-section-kicker text-violet-700">Source lens</div><h2 className="clinical-summary-section-title">Notes</h2><p>{patient.notes?.length || 0} clinical note{patient.notes?.length === 1 ? '' : 's'} available.</p><Link href={`${patientBase}/doctor-notes`} className="clinical-summary-text-link">Open Notes <Icon name="arrow" size={14} /></Link></section>
        <section id="care-gaps" className="clinical-summary-anchor-panel"><div className="clinical-summary-section-kicker text-amber-700">Source lens</div><h2 className="clinical-summary-section-title">Care Gaps</h2><p>{snapshot.careGaps == null ? 'Care gap data unavailable.' : `${snapshot.careGaps} open care gap${snapshot.careGaps === 1 ? '' : 's'} in the available record.`}</p><Link href={`${patientBase}/care-gaps`} className="clinical-summary-text-link">Open Care Gaps <Icon name="arrow" size={14} /></Link></section>
      </div>

      <aside className="clinical-summary-rail">
        <section aria-labelledby="snapshot-title" className="clinical-summary-panel"><div className="clinical-summary-section-kicker text-teal-700">Current record</div><h2 id="snapshot-title" className="clinical-summary-section-title">Clinical Status Snapshot</h2><div className="mt-4 grid grid-cols-2 gap-3"><SnapshotCard label="Labs" value={snapshot.labs == null ? '—' : String(snapshot.labs)} detail="require review" href={`${patientBase}/labs`} icon="lab" tone="border-cyan-100 bg-cyan-50 text-cyan-700" /><SnapshotCard label="Vitals" value={snapshot.vitals} detail="latest documented" href={`${patientBase}/trends`} icon="activity" tone="border-blue-100 bg-blue-50 text-blue-700" /><SnapshotCard label="Medications" value={snapshot.medications == null ? '—' : String(snapshot.medications)} detail="active records" href={`${patientBase}/medications`} icon="pill" tone="border-sky-100 bg-sky-50 text-sky-700" /><SnapshotCard label="Care gaps" value={snapshot.careGaps == null ? '—' : String(snapshot.careGaps)} detail="open records" href={`${patientBase}/care-gaps`} icon="gap" tone="border-amber-100 bg-amber-50 text-amber-800" /></div></section>

        <section id="evidence" aria-labelledby="evidence-title" className="clinical-summary-panel"><div className="clinical-summary-section-kicker text-blue-700">Traceability</div><h2 id="evidence-title" className="clinical-summary-section-title">AI Evidence</h2><p className="mt-2 text-sm text-slate-600">{currentSummary ? `${evidenceStats.analyzed} sources analyzed · ${evidenceStats.used} used directly · ${evidenceStats.excluded} excluded` : 'Evidence unavailable until a summary is generated.'}</p>{currentSummary && <p className="mt-2 text-xs text-slate-500">Last evidence update {formatDate(evidenceStats.updatedAt)}</p>}<button type="button" onClick={() => setEvidenceDrawer(visibleEvidence)} disabled={!visibleEvidence.length} className="clinical-summary-secondary-button mt-4 w-full justify-center"><Icon name="folder" size={15} />View Source Records</button><div className="mt-4 space-y-2">{Array.from(new Set(usedEvidence.map((source) => source.resourceType))).slice(0, 5).map((type) => <div key={type} className="clinical-summary-source-chip"><span>{type === 'Observation' ? 'Labs' : type === 'DocumentReference' ? 'Documents' : type}</span><span>{usedEvidence.filter((source) => source.resourceType === type).length}</span></div>)}</div></section>

        <section aria-labelledby="patient-summary-title" className="clinical-summary-patient-card"><div className="clinical-summary-section-kicker text-violet-700">Patient communication</div><h2 id="patient-summary-title" className="clinical-summary-section-title">Patient-Friendly Summary</h2>{currentSummary?.patientFriendlySummary ? <><span className="clinical-summary-status-draft">Draft ready · clinical review required</span><p className="mt-3 line-clamp-5 text-sm leading-6 text-slate-700">{currentSummary.patientFriendlySummary}</p></> : <p className="mt-3 text-sm leading-6 text-slate-600">No patient-friendly summary generated.</p>}<div className="mt-4 flex flex-wrap gap-2">{currentSummary && <button type="button" onClick={() => void generateFriendly()} disabled={friendlyGenerating} className="clinical-summary-primary-button">{friendlyGenerating ? 'Generating…' : currentSummary.patientFriendlySummary ? 'Regenerate' : 'Generate'}</button>}{currentSummary?.patientFriendlySummary && <><button type="button" onClick={() => { setFriendlyDraft(currentSummary.patientFriendlySummary || ''); setFriendlyEditing(true); setFriendlyOpen(true); }} className="clinical-summary-secondary-button">Edit</button><button type="button" onClick={() => { setFriendlyDraft(currentSummary.patientFriendlySummary || ''); setFriendlyOpen(true); }} className="clinical-summary-secondary-button">Preview</button><Link href={`${patientBase}/messages?summaryVersion=${encodeURIComponent(currentSummary.versionId)}`} className="clinical-summary-secondary-button"><Icon name="message" size={15} />Message Patient</Link></>}</div>{friendlyError && <p role="alert" className="mt-3 text-xs font-semibold text-rose-700">{friendlyError}</p>}</section>

        <section aria-label="AI safety notice" className="clinical-summary-safety"><div className="flex items-start gap-3"><Icon name="info" size={19} /><div><strong>AI-generated clinical summary</strong><p className="mt-1">This content supports clinical review and may contain incomplete or incorrect information. Verify important findings against source records before making clinical decisions.</p></div></div></section>
      </aside>
    </div>

    {evidenceDrawer && <Drawer title="AI Evidence" onClose={() => setEvidenceDrawer(null)}><div className="space-y-5"><p className="text-sm leading-6 text-slate-600">Each source below is mapped to the patient record. Used means the source was cited by this summary version; excluded sources were available but not cited.</p>{evidenceDrawer.length === 0 ? <div className="clinical-summary-empty">Evidence unavailable or restricted.</div> : <div className="space-y-3">{evidenceDrawer.map((source) => <article key={`${source.resourceType}-${source.id}`} className="clinical-summary-evidence-row">{source.status === 'restricted' ? <><div className="font-black text-slate-900">Restricted evidence</div><div className="mt-1 text-xs text-slate-500">This source is not available to the current user.</div></> : <><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="clinical-summary-evidence-type">{source.resourceType}</div><h3 className="mt-1 text-sm font-black text-slate-950">{source.title || source.id}</h3><p className="mt-1 text-xs text-slate-500">{formatDate(source.date)}{source.source ? ` · ${source.source}` : ''}</p></div><span className={`clinical-summary-badge ${source.status === 'used' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{source.status === 'used' ? 'Used' : 'Excluded'}</span></div>{source.reason && <p className="mt-2 text-xs text-slate-500">{source.reason}</p>}{source.href && <Link href={source.href} onClick={() => setEvidenceDrawer(null)} className="clinical-summary-text-link mt-3">Open source record <Icon name="arrow" size={14} /></Link>}</>}</article>)}</div>}</div></Drawer>}
    {friendlyOpen && <Drawer title="Patient-Friendly Summary" onClose={() => { setFriendlyOpen(false); setFriendlyEditing(false); }}><div className="space-y-5"><div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 text-sm text-violet-950"><div className="flex items-center gap-2 font-bold"><Icon name="ai" size={16} /> AI-generated draft</div><p className="mt-1 text-xs text-violet-800">Clinical review required before sending to the patient.</p></div>{friendlyEditing ? <textarea value={friendlyDraft} onChange={(event) => setFriendlyDraft(event.target.value)} rows={12} className="w-full rounded-xl border border-slate-300 p-3 text-sm leading-6 text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20" aria-label="Patient-friendly summary draft" /> : <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-800">{friendlyDraft || 'No patient-friendly summary generated.'}</p>}{friendlyError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{friendlyError}</p>}<div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">{friendlyEditing ? <button type="button" onClick={() => void saveFriendly()} disabled={friendlySaving || !friendlyDraft.trim()} className="clinical-summary-primary-button">{friendlySaving ? 'Saving…' : 'Save Draft'}</button> : <button type="button" onClick={() => setFriendlyEditing(true)} disabled={!friendlyDraft} className="clinical-summary-secondary-button">Edit</button>}{currentSummary?.patientFriendlySummary && <Link href={`${patientBase}/messages?summaryVersion=${encodeURIComponent(currentSummary.versionId)}`} onClick={() => setFriendlyOpen(false)} className="clinical-summary-primary-button"><Icon name="message" size={15} />Insert into Message</Link>}<button type="button" onClick={() => setFriendlyOpen(false)} className="clinical-summary-secondary-button">Close</button></div></div></Drawer>}
  </div>;
}