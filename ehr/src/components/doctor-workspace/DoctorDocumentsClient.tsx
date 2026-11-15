"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import WorkspaceDrawer from './WorkspaceDrawer';
import type { DoctorDocumentWorkItem, DoctorWorkSnapshot } from '@/lib/doctorWorkStore';

type DocumentTab = 'needs-review' | 'recent' | 'all' | 'external';
type UploadForm = { patientId: string; title: string; type: string; clinicalDate: string; source: string; file: File | null };

const statusLabel: Record<DoctorDocumentWorkItem['reviewStatus'], string> = {
  'needs-review': 'Needs Review',
  reviewed: 'Reviewed',
  restricted: 'Restricted',
  'entered-in-error': 'Entered in Error',
};

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    document: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h5" /></>,
    refresh: <><path d="M20 11a8 8 0 00-14-5L3 9M3 4v5h5M4 13a8 8 0 0014 5l3-3M21 20v-5h-5" /></>,
    review: <><circle cx="12" cy="12" r="9" /><path d="M8 12l2.5 2.5L16 9" /></>,
    alert: <><path d="M12 3l9 16H3L12 3z" /><path d="M12 9v4M12 16h.01" /></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></>,
    arrow: <><path d="M5 12h13M13 6l6 6-6 6" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.document}</svg>;
}

function formatDate(value?: string) {
  if (!value) return 'Not documented';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not documented' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Stat({ label, value, detail, tone, icon }: { label: string; value: number; detail: string; tone: string; icon: string }) {
  return <div className={`doctor-document-stat ${tone}`}><span><Icon name={icon} /></span><small>{label}</small><strong>{value}</strong><em>{detail}</em></div>;
}

export default function DoctorDocumentsClient({ initialData }: { initialData: DoctorWorkSnapshot }) {
  const searchParams = useSearchParams();
  const [items, setItems] = useState(initialData.documents.items);
  const [counts, setCounts] = useState(initialData.documents.counts);
  const [tab, setTab] = useState<DocumentTab>((searchParams.get('tab') as DocumentTab) || 'needs-review');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');
  const [sort, setSort] = useState('newest');
  const [selected, setSelected] = useState<DoctorDocumentWorkItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(searchParams.get('upload') === '1');
  const [upload, setUpload] = useState<UploadForm>({ patientId: '', title: '', type: '', clinicalDate: '', source: 'clinician-uploaded', file: null });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadedAt] = useState(() => Date.now());

  const types = Array.from(new Set(items.map((item) => item.type))).sort();
  const sources = Array.from(new Set(items.map((item) => item.source))).sort();
  const statuses = Array.from(new Set(items.map((item) => item.status))).sort();
  const filtered = items.filter((item) => {
    const normalized = query.trim().toLowerCase();
    const haystack = [item.patient.name, item.patient.mrn, item.title, item.type, item.source, item.author, item.organization].filter(Boolean).join(' ').toLowerCase();
    if (normalized && !haystack.includes(normalized)) return false;
    if (tab === 'needs-review' && item.reviewStatus !== 'needs-review') return false;
    if (tab === 'recent' && (!item.addedAt || Date.parse(item.addedAt) < loadedAt - 30 * 86400000)) return false;
    if (tab === 'external' && !['external', 'imported', 'scanned'].includes(item.source.toLowerCase())) return false;
    if (type !== 'all' && item.type !== type) return false;
    if (status !== 'all' && item.status !== status) return false;
    if (source !== 'all' && item.source !== source) return false;
    return true;
  }).sort((left, right) => sort === 'oldest' ? (Date.parse(left.clinicalDate || '') || 0) - (Date.parse(right.clinicalDate || '') || 0) : sort === 'patient' ? left.patient.name.localeCompare(right.patient.name) : sort === 'attention' ? Number(right.reviewStatus === 'needs-review') - Number(left.reviewStatus === 'needs-review') || (Date.parse(right.clinicalDate || '') || 0) - (Date.parse(left.clinicalDate || '') || 0) : (Date.parse(right.clinicalDate || '') || 0) - (Date.parse(left.clinicalDate || '') || 0));

  async function refresh() {
    setBusy('refresh');
    setError(null);
    try {
      const response = await fetch('/api/doctor/documents?tab=all', { cache: 'no-store' });
      const payload = await response.json() as { data?: DoctorDocumentWorkItem[]; counts?: typeof counts; error?: string };
      if (!response.ok || !payload.data || !payload.counts) throw new Error(payload.error || 'We could not load documents.');
      setItems(payload.data);
      setCounts(payload.counts);
      setNotice('Documents refreshed.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not load documents.');
    } finally {
      setBusy(null);
    }
  }

  async function reviewDocument(document: DoctorDocumentWorkItem) {
    setBusy(document.id);
    setError(null);
    try {
      const response = await fetch(`/api/patients/${encodeURIComponent(document.patient.id)}/documents/${encodeURIComponent(document.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'review' }) });
      const payload = await response.json() as { item?: { status: DoctorDocumentWorkItem['status']; reviewedBy?: string; reviewedAt?: string }; error?: string };
      if (!response.ok || !payload.item) throw new Error(payload.error || 'Document could not be reviewed.');
      setItems((current) => current.map((item) => item.id === document.id ? { ...item, status: payload.item!.status, reviewStatus: 'reviewed', reviewedBy: payload.item!.reviewedBy, reviewedAt: payload.item!.reviewedAt } : item));
      setSelected(null);
      setNotice('Document reviewed.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Document could not be reviewed.');
    } finally {
      setBusy(null);
    }
  }

  async function uploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!upload.patientId || !upload.title.trim() || !upload.type.trim()) return;
    setBusy('upload');
    setError(null);
    try {
      const body = new FormData();
      body.set('patientId', upload.patientId);
      body.set('title', upload.title.trim());
      body.set('type', upload.type.trim());
      body.set('clinicalDate', upload.clinicalDate);
      body.set('source', upload.source);
      if (upload.file) body.set('file', upload.file);
      const response = await fetch('/api/doctor/documents', { method: 'POST', body });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Document could not be uploaded.');
      setUploadOpen(false);
      setUpload({ patientId: '', title: '', type: '', clinicalDate: '', source: 'clinician-uploaded', file: null });
      setNotice('Document uploaded.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Document could not be uploaded.');
    } finally {
      setBusy(null);
    }
  }

  return <main className="doctor-workspace-page" aria-labelledby="documents-title">
    <header className="doctor-workspace-page-header"><div><div className="doctor-work-eyebrow">Record worklist</div><h1 id="documents-title">Documents</h1><p>Review and access clinical documents across your authorized patients.</p><div className="doctor-work-context">{counts.needsReview} need review · {counts.restricted} restricted</div></div><div className="doctor-work-header-actions"><button type="button" className="doctor-work-primary-button" onClick={() => setUploadOpen(true)}><Icon name="upload" size={15} />Upload Document</button><button type="button" className="doctor-work-secondary-button" onClick={() => void refresh()} disabled={busy === 'refresh'}><Icon name="refresh" size={15} />{busy === 'refresh' ? 'Refreshing' : 'Refresh'}</button></div></header>
    {error && <div role="alert" className="doctor-work-alert doctor-work-alert-error">{error}</div>}
    {notice && <div role="status" className="doctor-work-alert doctor-work-alert-success">{notice}</div>}
    <section className="doctor-document-stats" aria-label="Document summary"><Stat label="Needs Review" value={counts.needsReview} detail="requires action" tone="doctor-document-stat-amber" icon="alert" /><Stat label="Recently Added" value={counts.recentlyAdded} detail="last 30 days" tone="doctor-document-stat-blue" icon="document" /><Stat label="Unread / New" value={counts.unread} detail="not yet opened" tone="doctor-document-stat-violet" icon="document" /><Stat label="Restricted / Attention" value={counts.restricted} detail="access controlled" tone="doctor-document-stat-slate" icon="review" /></section>
    <section className="doctor-work-surface"><div className="doctor-document-tabs" role="tablist" aria-label="Document views">{([['needs-review', 'Needs Review'], ['recent', 'Recent'], ['all', 'All Documents'], ['external', 'External']] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}>{label}{value === 'needs-review' && counts.needsReview > 0 && <span className="doctor-work-tab-count">{counts.needsReview}</span>}</button>)}</div><div className="doctor-document-toolbar"><label className="doctor-work-search">Search patient, title, type, source...<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient, title, type, source..." /></label><label>Type<select value={type} onChange={(event) => setType(event.target.value)}><option value="all">All types</option>{types.map((option) => <option key={option}>{option}</option>)}</select></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{statuses.map((option) => <option key={option}>{option}</option>)}</select></label><label>Source<select value={source} onChange={(event) => setSource(event.target.value)}><option value="all">All sources</option>{sources.map((option) => <option key={option}>{option}</option>)}</select></label><label>Sort<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="attention">Needs Review First</option><option value="patient">Patient</option></select></label></div></section>
    <section className="doctor-work-surface doctor-document-list" aria-labelledby="document-worklist-title"><div className="doctor-work-list-header"><div><div className="doctor-work-eyebrow">Authorized document worklist</div><h2 id="document-worklist-title">{tab === 'needs-review' ? 'Documents Needing Review' : tab === 'recent' ? 'Recently Added' : tab === 'external' ? 'External Documents' : 'All Documents'}</h2></div><span className="doctor-work-result-count">{filtered.length} shown</span></div>{filtered.length === 0 ? <div className="doctor-work-empty"><span><Icon name="document" /></span><div><strong>No documents match the current filters.</strong><p>Patient Documents remains the detailed source workspace.</p></div></div> : <div className="doctor-document-rows"><div className="doctor-document-table-head"><span>Patient</span><span>Document</span><span>Type</span><span>Clinical Date</span><span>Source</span><span>Review</span><span> </span></div>{filtered.map((document) => <article key={`${document.patient.id}-${document.id}`} className="doctor-document-row"><div><strong>{document.patient.name}</strong><small>MRN {document.patient.mrn}</small></div><button type="button" className="doctor-document-title" onClick={() => setSelected(document)}>{document.title}</button><span>{document.type}</span><span>{formatDate(document.clinicalDate)}</span><span>{document.source || 'Not documented'}</span><span className={`doctor-document-status doctor-document-status-${document.reviewStatus}`}>{statusLabel[document.reviewStatus]}</span><div className="doctor-document-actions"><button type="button" className="doctor-work-secondary-button" onClick={() => setSelected(document)}>Open</button>{document.reviewStatus === 'needs-review' && <button type="button" className="doctor-work-primary-button" onClick={() => void reviewDocument(document)} disabled={busy === document.id}>{busy === document.id ? 'Saving...' : 'Review'}</button>}</div></article>)}</div>}</section>
    <WorkspaceDrawer title="Document Quick View" open={Boolean(selected)} onClose={() => setSelected(null)}>{selected && <div className="doctor-document-detail"><div className="doctor-document-detail-hero"><div className="doctor-work-eyebrow">{selected.type}</div><h3>{selected.title}</h3><p>{selected.patient.name} · MRN {selected.patient.mrn}</p><span className={`doctor-document-status doctor-document-status-${selected.reviewStatus}`}>{statusLabel[selected.reviewStatus]}</span></div><dl className="doctor-work-detail-grid"><div><dt>Clinical date</dt><dd>{formatDate(selected.clinicalDate)}</dd></div><div><dt>Source</dt><dd>{selected.source}</dd></div><div><dt>Author</dt><dd>{selected.author || 'Not documented'}</dd></div><div><dt>Organization</dt><dd>{selected.organization || 'Not documented'}</dd></div><div><dt>Version</dt><dd>{selected.version}</dd></div><div><dt>Reviewed by</dt><dd>{selected.reviewedBy || 'Not reviewed'}</dd></div></dl><div className="doctor-work-detail-actions"><Link href={selected.href} className="doctor-work-primary-button">Open Full Document</Link><Link href={selected.patient.href} className="doctor-work-secondary-button">Open Patient</Link>{selected.reviewStatus === 'needs-review' && <button type="button" onClick={() => void reviewDocument(selected)} disabled={busy === selected.id} className="doctor-work-secondary-button">{busy === selected.id ? 'Saving...' : 'Mark Reviewed'}</button>}<Link href={`/dashboard/tasks?new=1&patientId=${encodeURIComponent(selected.patient.id)}`} className="doctor-work-secondary-button">Create Task</Link></div><div className="doctor-work-detail-block"><h4>Access and provenance</h4><p>Document contents are loaded only through the patient-specific authorized Documents workspace. This quick view does not expose document body content.</p></div></div>}</WorkspaceDrawer>
    <WorkspaceDrawer title="Upload Document" open={uploadOpen} onClose={() => setUploadOpen(false)}><form className="doctor-work-form" onSubmit={(event) => void uploadDocument(event)}><p className="doctor-work-form-intro">Associate the document with a patient before uploading. New files enter Needs Review until a clinician reviews them.</p><label>Patient<select required value={upload.patientId} onChange={(event) => setUpload((current) => ({ ...current, patientId: event.target.value }))}><option value="">Select patient</option>{initialData.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.mrn}</option>)}</select></label><label>Document title<input required value={upload.title} onChange={(event) => setUpload((current) => ({ ...current, title: event.target.value }))} placeholder="Document title" /></label><label>Document type<input required value={upload.type} onChange={(event) => setUpload((current) => ({ ...current, type: event.target.value }))} placeholder="e.g. Discharge Summary" /></label><label>Clinical date<input type="date" value={upload.clinicalDate} onChange={(event) => setUpload((current) => ({ ...current, clinicalDate: event.target.value }))} /></label><label>Source<select value={upload.source} onChange={(event) => setUpload((current) => ({ ...current, source: event.target.value }))}><option value="clinician-uploaded">Clinician uploaded</option><option value="external">External</option><option value="imported">Imported</option><option value="scanned">Scanned</option></select></label><label>File<input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => setUpload((current) => ({ ...current, file: event.target.files?.[0] || null }))} /></label><div className="doctor-work-form-actions"><button type="button" className="doctor-work-secondary-button" onClick={() => setUploadOpen(false)}>Cancel</button><button type="submit" className="doctor-work-primary-button" disabled={busy === 'upload'}>{busy === 'upload' ? 'Uploading...' : 'Upload Document'}</button></div></form></WorkspaceDrawer>
  </main>;
}
