'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  LaboratoryAttentionItem,
  LaboratoryDashboardSnapshot,
  LaboratoryFilter,
  LaboratoryOrderSummary,
  LaboratoryPatientState,
  LaboratoryPatientSummary,
  LaboratoryResult,
  LaboratorySort,
  LaboratorySpecimenSummary,
  LaboratoryTab,
} from '@/lib/laboratoryDashboard';
import './laboratory-command-center.css';

type ViewMode = 'cards' | 'list';
type Suggestion = { id: string; group: 'Patients' | 'Results' | 'Orders' | 'Specimens'; label: string; detail: string; href: string; icon: IconName };
type IconName = 'users' | 'review' | 'alert' | 'clock' | 'specimen' | 'flask' | 'refresh' | 'plus' | 'search' | 'chevron' | 'more' | 'close' | 'check' | 'orders' | 'grid' | 'list' | 'external' | 'patient' | 'source';

type Props = { initialData: LaboratoryDashboardSnapshot; preview: string };

const TABS: Array<{ value: LaboratoryTab; label: string; icon: IconName }> = [
  { value: 'patients', label: 'Patients', icon: 'users' },
  { value: 'results', label: 'Results', icon: 'flask' },
  { value: 'orders', label: 'Orders', icon: 'orders' },
  { value: 'specimens', label: 'Specimens', icon: 'specimen' },
];

const FILTERS: Array<{ value: LaboratoryFilter; label: string }> = [
  { value: 'all', label: 'All patients' },
  { value: 'needs-review', label: 'Needs review' },
  { value: 'abnormal', label: 'Abnormal' },
  { value: 'critical', label: 'Critical' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'specimen-issue', label: 'Specimen issues' },
];

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    users: <><path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" /><circle cx="9.5" cy="7" r="3" /><path d="M17 11a3 3 0 1 0 0-6M21 20v-1a4 4 0 0 0-3-3.8" /></>,
    review: <><path d="M6 3h12v18H6z" /><path d="M9 7h6M9 11h6M9 15h3" /><path d="m15 18 1.5 1.5L20 16" /></>,
    alert: <><path d="M12 3 21 19H3L12 3z" /><path d="M12 9v4M12 16h.01" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    specimen: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" /><path d="M7 15h10" /></>,
    flask: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" /><path d="M7 15h10" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14-5L3 9M3 4v5h5M4 13a8 8 0 0 0 14 5l3-3M21 20v-5h-5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    orders: <><path d="M6 3h12v18H6z" /><path d="M9 7h6M9 11h6M9 15h4" /></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    list: <><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></>,
    external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M17 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5" /></>,
    patient: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    source: <><path d="M5 3h10l4 4v14H5z" /><path d="M14 3v5h5M8 13h8M8 17h5" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function withPreview(href: string, preview: string) {
  return preview ? `${href}${href.includes('?') ? '&' : '?'}${preview}` : href;
}

function apiUrl(filters: { q: string; filter: LaboratoryFilter; sort: LaboratorySort }, preview: string) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.filter !== 'all') params.set('filter', filters.filter);
  if (filters.sort !== 'most-urgent') params.set('sort', filters.sort);
  params.set('pageSize', '30');
  new URLSearchParams(preview).forEach((value, key) => params.set(key, value));
  return `/api/laboratory/dashboard?${params.toString()}`;
}

function formatDate(value?: string, includeTime = false) {
  if (!value) return 'Not supplied';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not supplied';
  return new Intl.DateTimeFormat('en-CA', includeTime ? { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PT';
}

function statusMeta(state: LaboratoryPatientState) {
  if (state === 'critical') return { label: 'Critical result', className: 'is-critical', icon: 'alert' as IconName };
  if (state === 'specimen-issue') return { label: 'Specimen issue', className: 'is-specimen', icon: 'specimen' as IconName };
  if (state === 'needs-review') return { label: 'Needs review', className: 'is-review', icon: 'review' as IconName };
  if (state === 'abnormal') return { label: 'Abnormal result', className: 'is-abnormal', icon: 'alert' as IconName };
  if (state === 'follow-up') return { label: 'Follow-up due', className: 'is-follow-up', icon: 'clock' as IconName };
  return { label: 'No active result flags', className: 'is-normal', icon: 'check' as IconName };
}

function interpretationClass(result: LaboratoryResult) {
  return result.interpretationState === 'critical' ? 'is-critical' : result.interpretationState === 'abnormal' ? 'is-abnormal' : result.interpretationState === 'normal' ? 'is-normal' : 'is-neutral';
}

function codingLabel(result: LaboratoryResult) {
  if (!result.code || !result.codeSystem) return 'Source coding not supplied';
  if (result.codeSystem === 'http://loinc.org') return `LOINC ${result.code}`;
  return `${result.codeSystem} · ${result.code}`;
}

function MetricCard({ icon, label, value, detail, tone, active, onClick }: { icon: IconName; label: string; value: number; detail: string; tone: string; active: boolean; onClick: () => void }) {
  return <button type="button" className={`lab-metric is-${tone}${active ? ' is-selected' : ''}`} onClick={onClick} aria-pressed={active}><span className="lab-metric-icon"><Icon name={icon} size={18} /></span><span className="lab-metric-copy"><small>{label}</small><strong>{value}</strong><em>{detail}</em></span><Icon name="chevron" size={15} /></button>;
}

function StatusBadge({ state, label }: { state: LaboratoryPatientState; label?: string }) {
  const meta = statusMeta(state);
  return <span className={`lab-status-badge ${meta.className}`}><Icon name={meta.icon} size={13} />{label || meta.label}</span>;
}

function PatientCard({ patient, preview, onPreview, onFilter }: { patient: LaboratoryPatientSummary; preview: string; onPreview: (patient: LaboratoryPatientSummary) => void; onFilter: (filter: LaboratoryFilter) => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const latest = patient.latestResult;
  return <article className={`lab-patient-card is-${patient.state}`}>
    <header><div className="lab-patient-identity"><span className="lab-avatar" aria-hidden="true">{initials(patient.patient.name)}</span><div><Link href={withPreview(patient.patient.href, preview)}>{patient.patient.name}</Link><p>MRN {patient.patient.mrn} · {patient.patient.age ?? 'Age not supplied'} yrs{patient.patient.gender ? ` · ${patient.patient.gender}` : ''}</p></div></div><StatusBadge state={patient.state} label={patient.stateLabel} /></header>
    <dl className="lab-patient-context"><div><dt>Primary clinician</dt><dd>{patient.patient.primaryClinician || 'Not documented'}</dd></div><div><dt>Latest lab</dt><dd>{latest?.name || 'No current result'}</dd><small>{latest ? formatDate(latest.date) : 'No result date supplied'}</small></div></dl>
    <div className="lab-patient-result">{latest ? <><span className="lab-result-value">{latest.value}{latest.unit ? <small>{latest.unit}</small> : null}</span><span className={`lab-interpretation ${interpretationClass(latest)}`}>{latest.interpretation}</span><span>{latest.reportStatus} · {latest.reviewState === 'reviewed' ? 'Locally reviewed' : 'Locally unreviewed'}</span></> : <span className="lab-muted-copy">No current laboratory result is available.</span>}</div>
    <div className="lab-patient-metrics"><button type="button" onClick={() => onFilter('needs-review')}><strong>{patient.needsReview}</strong><span>Needs review</span></button><button type="button" onClick={() => onFilter('abnormal')}><strong>{patient.abnormal}</strong><span>Abnormal</span></button><button type="button" onClick={() => onFilter('critical')}><strong>{patient.critical}</strong><span>Critical</span></button><button type="button" onClick={() => onFilter('follow-up')}><strong>{patient.followUpDue}</strong><span>Follow-up</span></button></div>
    <footer><Link href={withPreview(patient.openLabHref, preview)} className="lab-primary-button">Open laboratory <Icon name="chevron" size={15} /></Link><button type="button" className="lab-secondary-button" onClick={() => onPreview(patient)}>Quick preview</button><div className="lab-more-wrap"><button type="button" className="lab-icon-button" aria-label={`More actions for ${patient.patient.name}`} aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)} title="More actions"><Icon name="more" size={17} /></button>{moreOpen && <div className="lab-more-menu" role="menu"><Link role="menuitem" href={withPreview(patient.patient.href, preview)}>View patient</Link><Link role="menuitem" href={withPreview(patient.openLabHref, preview)}>View results</Link><Link role="menuitem" href={withPreview(`/dashboard/orders?patientId=${encodeURIComponent(patient.patient.id)}`, preview)}>View orders</Link></div>}</div></footer>
    <span className="lab-patient-updated">Updated {formatDate(patient.updatedAt || latest?.reviewedAt || latest?.date)}</span>
  </article>;
}

function PatientsList({ patients, preview, onPreview, onFilter }: { patients: LaboratoryPatientSummary[]; preview: string; onPreview: (patient: LaboratoryPatientSummary) => void; onFilter: (filter: LaboratoryFilter) => void }) {
  return <div className="lab-table-wrap"><table className="lab-table"><thead><tr><th>Patient</th><th>Latest lab</th><th>Clinical status</th><th>Review</th><th>Abnormal</th><th>Critical</th><th>Follow-up</th><th>Action</th></tr></thead><tbody>{patients.map((patient) => <tr key={patient.patient.id}><td><div className="lab-table-patient"><span className="lab-avatar" aria-hidden="true">{initials(patient.patient.name)}</span><span><Link href={withPreview(patient.patient.href, preview)}>{patient.patient.name}</Link><small>MRN {patient.patient.mrn} · {patient.patient.age ?? 'Age not supplied'} yrs</small></span></div></td><td>{patient.latestResult ? <Link href={withPreview(patient.latestResult.href, preview)} className="lab-source-link"><strong>{patient.latestResult.name}</strong><small>{patient.latestResult.value}{patient.latestResult.unit ? ` ${patient.latestResult.unit}` : ''} · {formatDate(patient.latestResult.date)}</small></Link> : <span className="lab-muted-copy">No current result</span>}</td><td><StatusBadge state={patient.state} label={patient.stateLabel} /></td><td><button type="button" className="lab-count-link" onClick={() => onFilter('needs-review')}>{patient.needsReview}</button></td><td><button type="button" className="lab-count-link is-abnormal" onClick={() => onFilter('abnormal')}>{patient.abnormal}</button></td><td><button type="button" className="lab-count-link is-critical" onClick={() => onFilter('critical')}>{patient.critical}</button></td><td><button type="button" className="lab-count-link is-follow-up" onClick={() => onFilter('follow-up')}>{patient.followUpDue}</button></td><td><button type="button" className="lab-secondary-button" onClick={() => onPreview(patient)}>Preview</button><Link href={withPreview(patient.openLabHref, preview)} className="lab-text-link">Open laboratory <Icon name="chevron" size={13} /></Link></td></tr>)}</tbody></table></div>;
}

function ResultsTable({ results, preview, reviewingId, onReview }: { results: LaboratoryResult[]; preview: string; reviewingId: string | null; onReview: (result: LaboratoryResult) => void }) {
  return <div className="lab-table-wrap"><table className="lab-table lab-results-table"><thead><tr><th>Patient</th><th>Test / panel</th><th>Result</th><th>Interpretation</th><th>Report</th><th>Review</th><th>Resulted</th><th>Action</th></tr></thead><tbody>{results.map((result) => <tr key={`${result.patient.id}-${result.id}`}><td><Link href={withPreview(result.patient.href, preview)} className="lab-patient-link">{result.patient.name}<small>MRN {result.patient.mrn}</small></Link></td><td><Link href={withPreview(result.href, preview)} className="lab-source-link"><strong>{result.name}</strong><small>{codingLabel(result)}</small></Link></td><td><strong>{result.value}{result.unit ? ` ${result.unit}` : ''}</strong><small>{result.referenceRange || 'Reference range not supplied'}</small></td><td><span className={`lab-interpretation ${interpretationClass(result)}`}>{result.interpretation}</span></td><td>{result.reportStatus}</td><td><span className={`lab-review-state is-${result.reviewState}`}>{result.reviewState === 'reviewed' ? 'Locally reviewed' : 'Locally unreviewed'}</span></td><td>{formatDate(result.date)}</td><td>{result.reviewState === 'unreviewed' ? <button type="button" className="lab-primary-button is-small" disabled={reviewingId === result.id} onClick={() => onReview(result)}>{reviewingId === result.id ? 'Recording...' : 'Record review'}</button> : <Link href={withPreview(result.href, preview)} className="lab-text-link">Open result <Icon name="chevron" size={13} /></Link>}</td></tr>)}</tbody></table></div>;
}

function OrdersTable({ orders, preview }: { orders: LaboratoryOrderSummary[]; preview: string }) {
  return <div className="lab-table-wrap"><table className="lab-table"><thead><tr><th>Patient</th><th>Laboratory order</th><th>Priority</th><th>Collection</th><th>Result</th><th>Next action</th><th>Action</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><Link href={withPreview(order.patient.href, preview)} className="lab-patient-link">{order.patient.name}<small>MRN {order.patient.mrn}</small></Link></td><td><Link href={withPreview(order.href, preview)} className="lab-source-link"><strong>{order.orderName}</strong><small>{order.orderCode || 'Order code not supplied'} · {order.destination}</small></Link></td><td>{order.priority}</td><td><span className="lab-order-status">{order.workflowStatus}</span><small>{order.specimenType || 'Specimen not documented'}</small></td><td>{order.resultStatus} · {order.reviewStatus}</td><td>{order.nextStep}</td><td><Link href={withPreview(order.href, preview)} className="lab-text-link">Open order <Icon name="chevron" size={13} /></Link></td></tr>)}</tbody></table></div>;
}

function SpecimensTable({ specimens, preview }: { specimens: LaboratorySpecimenSummary[]; preview: string }) {
  return <div className="lab-table-wrap"><table className="lab-table"><thead><tr><th>Patient</th><th>Order</th><th>Specimen</th><th>Collection state</th><th>Location</th><th>Next action</th><th>Action</th></tr></thead><tbody>{specimens.map((specimen) => <tr key={specimen.id}><td><Link href={withPreview(specimen.patient.href, preview)} className="lab-patient-link">{specimen.patient.name}<small>MRN {specimen.patient.mrn}</small></Link></td><td>{specimen.orderName}</td><td>{specimen.specimenType}</td><td><span className="lab-order-status">{specimen.collectionStatus}</span></td><td>{specimen.collectionLocation || 'Not documented'}</td><td>{specimen.nextStep}</td><td><Link href={withPreview(specimen.href, preview)} className="lab-text-link">Open order <Icon name="chevron" size={13} /></Link></td></tr>)}</tbody></table></div>;
}

function EmptyState({ title, detail, icon = 'check' }: { title: string; detail: string; icon?: IconName }) {
  return <div className="lab-empty"><span><Icon name={icon} size={21} /></span><strong>{title}</strong><p>{detail}</p></div>;
}

function LaboratoryPatientDrawer({ patient, preview, reviewingId, onReview, onClose }: { patient: LaboratoryPatientSummary; preview: string; reviewingId: string | null; onReview: (result: LaboratoryResult) => void; onClose: () => void }) {
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('button, a[href]')).filter((element) => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, [onClose]);
  return <div className="lab-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside ref={drawerRef} className="lab-drawer" role="dialog" aria-modal="true" aria-labelledby="lab-preview-title"><header><div><span className="lab-panel-eyebrow">Laboratory patient preview</span><h2 id="lab-preview-title">{patient.patient.name}</h2><p>MRN {patient.patient.mrn} · DOB {formatDate(patient.patient.birthDate)}{patient.patient.gender ? ` · ${patient.patient.gender}` : ''}</p></div><button ref={closeRef} type="button" className="lab-icon-button" onClick={onClose} aria-label="Close laboratory patient preview"><Icon name="close" size={18} /></button></header><div className="lab-drawer-body"><div className="lab-drawer-patient"><span className="lab-avatar">{initials(patient.patient.name)}</span><div><StatusBadge state={patient.state} label={patient.stateLabel} /><p>Primary clinician · <strong>{patient.patient.primaryClinician || 'Not documented'}</strong></p><p>Organization · <strong>{patient.patient.organization || 'Not documented'}</strong></p></div></div><div className="lab-drawer-actions"><Link href={withPreview(patient.openLabHref, preview)} className="lab-primary-button">Open laboratory <Icon name="chevron" size={15} /></Link><Link href={withPreview(patient.patient.href, preview)} className="lab-secondary-button">Open patient</Link></div><section><h3>Laboratory status</h3><div className="lab-drawer-metrics"><div><strong>{patient.needsReview}</strong><span>Needs review</span></div><div><strong>{patient.abnormal}</strong><span>Abnormal</span></div><div><strong>{patient.critical}</strong><span>Critical</span></div><div><strong>{patient.followUpDue}</strong><span>Follow-up</span></div></div></section><section><h3>Recent results</h3><div className="lab-drawer-results">{patient.recentResults.length ? patient.recentResults.map((result) => <article key={result.id}><div><Link href={withPreview(result.href, preview)}>{result.name}</Link><small>{formatDate(result.date)} · {result.reportStatus}</small><small>{codingLabel(result)}</small></div><div><strong>{result.value}{result.unit ? ` ${result.unit}` : ''}</strong><span className={`lab-interpretation ${interpretationClass(result)}`}>{result.interpretation}</span><small>{result.reviewState === 'reviewed' ? `Reviewed${result.reviewedBy ? ` by ${result.reviewedBy}` : ''}` : 'Locally unreviewed'}</small>{result.reviewState === 'unreviewed' && <button type="button" className="lab-text-link" disabled={reviewingId === result.id} onClick={() => onReview(result)}>{reviewingId === result.id ? 'Recording...' : 'Record review'}</button>}</div></article>) : <p className="lab-muted-copy">No current results are available for this patient.</p>}</div></section><section><h3>Clinical context</h3><dl className="lab-drawer-facts"><div><dt>Latest laboratory</dt><dd>{patient.latestResult?.name || 'Not supplied'}</dd></div><div><dt>Specimen issue messages</dt><dd>{patient.specimenIssues || 'None recorded'}</dd></div><div><dt>Lab-linked follow-up</dt><dd>{patient.followUpDue || 'None open'}</dd></div><div><dt>Last updated</dt><dd>{formatDate(patient.updatedAt)}</dd></div></dl></section></div></aside></div>;
}

export default function LaboratoryCommandCenterClient({ initialData, preview }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = TABS.some((tab) => tab.value === searchParams.get('tab')) ? searchParams.get('tab') as LaboratoryTab : 'patients';
  const initialFilter = FILTERS.some((filter) => filter.value === searchParams.get('filter')) ? searchParams.get('filter') as LaboratoryFilter : 'all';
  const [tab, setTab] = useState<LaboratoryTab>(initialTab);
  const [filter, setFilter] = useState<LaboratoryFilter>(initialFilter);
  const [sort, setSort] = useState<LaboratorySort>('most-urgent');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [view, setView] = useState<ViewMode>('cards');
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<LaboratoryPatientSummary | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const stored = window.localStorage.getItem('roshi-laboratory-view');
    if (stored !== 'cards' && stored !== 'list') return;
    const timer = window.setTimeout(() => setView(stored), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { window.localStorage.setItem('roshi-laboratory-view', view); }, [view]);
  useEffect(() => {
    const controller = new AbortController();
    const loadingTimer = window.setTimeout(() => setLoading(true), 100);
    fetch(apiUrl({ q: deferredQuery, filter, sort }, preview), { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Laboratory activity could not be loaded.');
        return response.json() as Promise<LaboratoryDashboardSnapshot>;
      })
      .then((snapshot) => { setData(snapshot); setError(null); })
      .catch((caught: unknown) => {
        if ((caught as { name?: string }).name !== 'AbortError') setError('We could not load laboratory activity.');
      })
      .finally(() => { window.clearTimeout(loadingTimer); setLoading(false); });
    return () => { window.clearTimeout(loadingTimer); controller.abort(); };
  }, [deferredQuery, filter, preview, refreshKey, sort]);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [] as Suggestion[];
    const result: Suggestion[] = [];
    data.patients.slice(0, 3).forEach((patient) => result.push({ id: `patient:${patient.patient.id}`, group: 'Patients', label: patient.patient.name, detail: `MRN ${patient.patient.mrn} · ${patient.stateLabel}`, href: patient.patient.href, icon: 'patient' }));
    data.results.slice(0, 3).forEach((item) => result.push({ id: `result:${item.patient.id}:${item.id}`, group: 'Results', label: item.name, detail: `${item.patient.name} · ${item.value}${item.unit ? ` ${item.unit}` : ''} · ${item.interpretation}`, href: item.href, icon: 'flask' }));
    data.orders.slice(0, 2).forEach((item) => result.push({ id: `order:${item.id}`, group: 'Orders', label: item.orderName, detail: `${item.patient.name} · ${item.workflowStatus}`, href: item.href, icon: 'orders' }));
    data.specimens.slice(0, 2).forEach((item) => result.push({ id: `specimen:${item.id}`, group: 'Specimens', label: item.specimenType, detail: `${item.patient.name} · ${item.collectionStatus}`, href: item.href, icon: 'specimen' }));
    return result;
  }, [data.orders, data.patients, data.results, data.specimens, query]);

  const groupedSuggestions = useMemo(() => ['Patients', 'Results', 'Orders', 'Specimens'].map((group) => ({ group: group as Suggestion['group'], items: suggestions.filter((suggestion) => suggestion.group === group) })).filter((group) => group.items.length), [suggestions]);
  const activeFilter = FILTERS.find((item) => item.value === filter)?.label || 'All patients';
  const attentionTitle = data.metrics.critical > 0 ? 'Critical laboratory attention' : 'Needs attention';

  function setClinicalFilter(next: LaboratoryFilter) {
    setFilter(next);
    setTab('patients');
    setSuggestionIndex(0);
  }

  function refresh() {
    setNotice(null);
    setRefreshKey((value) => value + 1);
  }

  function openSuggestion(suggestion: Suggestion) {
    setSearchOpen(false);
    router.push(withPreview(suggestion.href, preview));
  }

  async function reviewResult(result: LaboratoryResult) {
    setReviewingId(result.id);
    setError(null);
    try {
      const response = await fetch(withPreview(`/api/patients/${encodeURIComponent(result.patient.id)}/labs/${encodeURIComponent(result.id)}/review`, preview), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}), cache: 'no-store' });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Review could not be recorded.');
      setSelectedPatient((current) => current && current.patient.id === result.patient.id ? { ...current, needsReview: Math.max(0, current.needsReview - 1), recentResults: current.recentResults.map((item) => item.id === result.id ? { ...item, reviewState: 'reviewed' } : item) } : current);
      setNotice(`${result.name} review recorded. Result interpretation and report status are unchanged.`);
      setRefreshKey((value) => value + 1);
    } catch {
      setError('We could not record the laboratory review. Try again.');
    } finally {
      setReviewingId(null);
    }
  }

  const metricCards: Array<{ label: string; value: number; detail: string; tone: string; icon: IconName; filter: LaboratoryFilter }> = [
    { label: 'Patients with lab activity', value: data.metrics.patientsWithActivity, detail: `${data.metrics.patientsWithActivity} authorized patient${data.metrics.patientsWithActivity === 1 ? '' : 's'}`, tone: 'teal', icon: 'users', filter: 'all' },
    { label: 'Needs review', value: data.metrics.needsReview, detail: data.metrics.needsReview ? 'Locally unreviewed results' : 'No items currently require review', tone: 'review', icon: 'review', filter: 'needs-review' },
    { label: 'Abnormal', value: data.metrics.abnormal, detail: data.metrics.abnormal ? 'Source-supplied non-critical flags' : 'No abnormal source flags', tone: 'abnormal', icon: 'alert', filter: 'abnormal' },
    { label: 'Critical', value: data.metrics.critical, detail: data.metrics.critical ? 'Immediate review required' : 'No unreviewed critical results', tone: 'critical', icon: data.metrics.critical ? 'alert' : 'check', filter: 'critical' },
    { label: 'Follow-up due', value: data.metrics.followUpDue, detail: data.metrics.followUpDue ? 'Lab-linked follow-up actions open' : 'No lab-linked follow-up due', tone: 'follow-up', icon: 'clock', filter: 'follow-up' },
    { label: 'Specimen issues', value: data.metrics.specimenIssues, detail: data.metrics.specimenIssues ? 'Actionable specimen-related messages' : 'No specimen issues detected', tone: 'specimen', icon: 'specimen', filter: 'specimen-issue' },
  ];

  return <main className="laboratory-command-center" aria-labelledby="laboratory-title">
    <header className="lab-header"><div><span className="lab-eyebrow">Clinical Laboratory</span><h1 id="laboratory-title">Laboratory</h1><p>Review laboratory activity, results, orders, specimens and follow-up actions requiring attention.</p><span className="lab-sync-state"><i />Data refreshed {formatDate(data.generatedAt, true)}</span></div><div className="lab-header-actions"><Link href={withPreview('/dashboard/orders?new=1', preview)} className="lab-primary-button"><Icon name="plus" size={16} />New Lab Order</Link><button type="button" className="lab-secondary-button" onClick={refresh} disabled={loading} aria-label="Refresh laboratory data"><Icon name="refresh" size={15} />{loading ? 'Refreshing...' : 'Refresh'}</button><div className="lab-more-wrap"><button type="button" className="lab-secondary-button" aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)}><Icon name="more" size={16} />More</button>{moreOpen && <div className="lab-more-menu" role="menu"><Link role="menuitem" href={withPreview('/dashboard/orders', preview)}>Open laboratory orders</Link><Link role="menuitem" href={withPreview('/dashboard/records', preview)}>Open patient records</Link></div>}</div></div></header>
    {error && <div className="lab-alert is-error" role="alert"><Icon name="alert" size={16} /><span>{error}</span><button type="button" onClick={refresh}>Retry</button><button type="button" aria-label="Dismiss error" onClick={() => setError(null)}><Icon name="close" size={15} /></button></div>}
    {notice && <div className="lab-alert is-success" role="status"><Icon name="check" size={16} />{notice}</div>}
    <section className="lab-search-section" aria-label="Search laboratory records"><div className="lab-search"><Icon name="search" size={18} /><input value={query} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); setSuggestionIndex(0); }} onFocus={() => setSearchOpen(Boolean(query))} onKeyDown={(event) => { if (event.key === 'ArrowDown' && suggestions.length) { event.preventDefault(); setSearchOpen(true); setSuggestionIndex((value) => Math.min(value + 1, suggestions.length - 1)); } else if (event.key === 'ArrowUp' && suggestions.length) { event.preventDefault(); setSuggestionIndex((value) => Math.max(value - 1, 0)); } else if (event.key === 'Enter' && searchOpen && suggestions[suggestionIndex]) { event.preventDefault(); openSuggestion(suggestions[suggestionIndex]); } else if (event.key === 'Escape') { setSearchOpen(false); setSuggestionIndex(0); } }} placeholder="Search patients, MRN, tests, orders, accession numbers..." aria-label="Search laboratory records" /><kbd>Ctrl K</kbd></div>{searchOpen && query && <div className="lab-suggestions" role="listbox" aria-label="Laboratory search results">{groupedSuggestions.length ? groupedSuggestions.map(({ group, items }) => <section key={group}><h2>{group}</h2>{items.map((suggestion) => { const index = suggestions.findIndex((item) => item.id === suggestion.id); return <button key={suggestion.id} type="button" role="option" aria-selected={index === suggestionIndex} className={index === suggestionIndex ? 'is-active' : ''} onMouseEnter={() => setSuggestionIndex(index)} onClick={() => openSuggestion(suggestion)}><span><Icon name={suggestion.icon} size={16} /></span><div><strong>{suggestion.label}</strong><small>{suggestion.detail}</small></div><Icon name="chevron" size={14} /></button>; })}</section>) : <div className="lab-suggestion-empty"><strong>No results found</strong><span>Try a patient name, MRN, test, order, or accession number.</span></div>}</div>}</section>
    <nav className="lab-primary-nav" aria-label="Laboratory sections" role="tablist">{TABS.map((item) => <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} onClick={() => setTab(item.value)}><Icon name={item.icon} size={16} />{item.label}{item.value === 'patients' ? <span>{data.metrics.patientsWithActivity}</span> : item.value === 'results' ? <span>{data.results.length}</span> : item.value === 'orders' ? <span>{data.orders.length}</span> : <span>{data.specimens.length}</span>}</button>)}</nav>
    <section className="lab-metric-grid" aria-label="Laboratory command center metrics">{metricCards.map((metric) => <MetricCard key={metric.label} {...metric} active={filter === metric.filter} onClick={() => setClinicalFilter(metric.filter)} />)}</section>
    <section className={`lab-attention ${data.metrics.critical > 0 ? 'has-critical' : ''}`} aria-labelledby="lab-attention-title"><header><div><span className="lab-panel-eyebrow">Priority review</span><h2 id="lab-attention-title">{attentionTitle}</h2><p>Top items requiring clinical attention across Laboratory.</p></div><button type="button" className="lab-text-button" onClick={() => setClinicalFilter(data.metrics.critical > 0 ? 'critical' : 'needs-review')}>{data.metrics.critical > 0 ? 'View critical results' : 'Review worklist'} <Icon name="chevron" size={14} /></button></header>{data.attention.length ? <div className="lab-attention-list">{data.attention.slice(0, 4).map((item) => <AttentionRow key={item.id} item={item} preview={preview} />)}</div> : <EmptyState title="All clear" detail="No patients currently require laboratory attention." />}</section>
    <section className="lab-workspace" aria-labelledby="lab-workspace-title"><header className="lab-workspace-header"><div><span className="lab-panel-eyebrow">Clinical worklist</span><h2 id="lab-workspace-title">{tab === 'patients' ? 'Patient laboratory activity' : tab === 'results' ? 'Results worklist' : tab === 'orders' ? 'Laboratory orders' : 'Specimen collection workflow'}</h2><p>{tab === 'patients' ? `${data.patientTotal} matching authorized patient${data.patientTotal === 1 ? '' : 's'} · ${activeFilter}` : `${tab === 'results' ? data.results.length : tab === 'orders' ? data.orders.length : data.specimens.length} items in the current authorized scope`}</p></div><div className="lab-view-switcher" role="tablist" aria-label="Laboratory patient view">{tab === 'patients' && <><button type="button" role="tab" aria-selected={view === 'cards'} onClick={() => setView('cards')}><Icon name="grid" size={15} />Cards</button><button type="button" role="tab" aria-selected={view === 'list'} onClick={() => setView('list')}><Icon name="list" size={15} />List</button></>}</div></header><div className="lab-toolbar"><div className="lab-filter-chips" aria-label="Laboratory patient filters">{FILTERS.map((item) => <button key={item.value} type="button" className={`${filter === item.value ? 'is-active' : ''}${item.value === 'critical' ? ' is-critical' : item.value === 'abnormal' ? ' is-abnormal' : ''}`} onClick={() => setClinicalFilter(item.value)}>{item.label}</button>)}</div><label className="lab-sort"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value as LaboratorySort)}><option value="most-urgent">Most urgent</option><option value="newest">Newest result</option><option value="updated">Last updated</option><option value="name">Patient name A-Z</option></select></label></div>{loading ? <LaboratorySkeleton /> : tab === 'patients' ? data.patients.length ? view === 'cards' ? <div className="lab-patient-grid">{data.patients.map((patient) => <PatientCard key={patient.patient.id} patient={patient} preview={preview} onPreview={setSelectedPatient} onFilter={setClinicalFilter} />)}</div> : <PatientsList patients={data.patients} preview={preview} onPreview={setSelectedPatient} onFilter={setClinicalFilter} /> : <EmptyState title={filter === 'critical' ? 'No critical results' : filter === 'specimen-issue' ? 'No specimen issues' : 'No matching laboratory records'} detail={filter === 'critical' ? 'There are currently no critical laboratory results requiring attention.' : filter === 'specimen-issue' ? 'No actionable specimen-related messages are recorded in the current scope.' : 'Try another patient, test, or filter.'} icon={filter === 'critical' ? 'check' : 'flask'} /> : tab === 'results' ? data.results.length ? <ResultsTable results={data.results} preview={preview} reviewingId={reviewingId} onReview={(result) => void reviewResult(result)} /> : <EmptyState title="No results in this view" detail="No authorized laboratory results match the current filters." icon="flask" /> : tab === 'orders' ? data.orders.length ? <OrdersTable orders={data.orders} preview={preview} /> : <EmptyState title="No laboratory orders in this view" detail="No authorized laboratory orders match the current filters." icon="orders" /> : data.specimens.length ? <SpecimensTable specimens={data.specimens} preview={preview} /> : <EmptyState title="No specimen collection records in this view" detail="Specimen collection is shown only when it is documented on an authorized laboratory order." icon="specimen" />}</section>
    <section className="lab-lower-grid" aria-label="Laboratory operations summary"><article className="lab-lower-panel"><header><div><span className="lab-panel-eyebrow">Cross-patient record</span><h2>Recent laboratory activity</h2></div><Icon name="flask" size={17} /></header><div className="lab-activity-list">{data.recentActivity.length ? data.recentActivity.map((item) => <Link key={item.id} href={withPreview(item.href, preview)} className={`lab-activity-row is-${item.tone}`}><span><Icon name={item.tone === 'critical' || item.tone === 'abnormal' ? 'alert' : item.tone === 'follow-up' ? 'clock' : 'check'} size={14} /></span><div><strong>{item.patient.name}</strong><small>{item.title} · {item.detail}</small></div><time>{formatDate(item.at)}</time><Icon name="chevron" size={13} /></Link>) : <p className="lab-muted-copy">No recent laboratory activity is available.</p>}</div></article><article className="lab-lower-panel"><header><div><span className="lab-panel-eyebrow">Source availability</span><h2>System integration status</h2></div><Icon name="source" size={17} /></header><div className="lab-source-list">{Object.values(data.sources).map((source) => <div key={source.label}><i className={`is-${source.state}`} /><span><strong>{source.label}</strong><small>{source.detail}</small></span><b>{source.state === 'ready' ? 'Ready' : source.state === 'partial' ? 'Partial' : source.state === 'unavailable' ? 'Unavailable' : 'Not reported'}</b></div>)}</div></article></section>
    <footer className="lab-footer"><span>FHIR baseline: Roshi project configuration R4 · Local review state is displayed separately from source result status and interpretation.</span><span>Data scope: authorized patient laboratory records</span></footer>
    {selectedPatient && <LaboratoryPatientDrawer patient={selectedPatient} preview={preview} reviewingId={reviewingId} onReview={(result) => void reviewResult(result)} onClose={() => setSelectedPatient(null)} />}
  </main>;
}

function AttentionRow({ item, preview }: { item: LaboratoryAttentionItem; preview: string }) {
  const icon: IconName = item.type === 'critical' ? 'alert' : item.type === 'specimen-issue' ? 'specimen' : item.type === 'follow-up' ? 'clock' : 'review';
  return <Link href={withPreview(item.href, preview)} className={`lab-attention-row is-${item.type}`}><span><Icon name={icon} size={17} /></span><div><strong>{item.title}</strong><small>{item.patient ? `${item.patient.name} · MRN ${item.patient.mrn} · ` : ''}{item.detail}</small></div><time>{formatDate(item.at)}</time><Icon name="chevron" size={15} /></Link>;
}

function LaboratorySkeleton() {
  return <div className="lab-loading" aria-label="Loading laboratory activity"><span /><span /><span /></div>;
}