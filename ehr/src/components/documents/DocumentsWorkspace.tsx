"use client";

import { useMemo, useState } from 'react';
import type { PatientDocument } from '@/lib/documentStore';

type Props = {
  patientId: string;
  patientName: string;
  initialItems: PatientDocument[];
  initialFilterOptions: { types: string[]; sources: string[]; statuses: string[] };
  initialSelectedDocumentId?: string;
  initialShowUpload?: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  final: 'Final',
  signed: 'Signed',
  draft: 'Draft',
  'needs-review': 'Needs Review',
  'awaiting-signature': 'Awaiting Signature',
  imported: 'Imported',
  corrected: 'Corrected',
  superseded: 'Superseded',
  'entered-in-error': 'Entered in Error',
  processing: 'Processing',
  failed: 'Failed',
};

function formatDate(value?: string) {
  if (!value) return 'Not documented';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusClass(status: string) {
  if (status === 'needs-review' || status === 'awaiting-signature') return 'border-amber-100 bg-amber-50 text-amber-800';
  if (status === 'failed' || status === 'entered-in-error') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'signed' || status === 'final') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

export default function DocumentsWorkspace({ patientId, patientName, initialItems, initialFilterOptions, initialSelectedDocumentId, initialShowUpload }: Props) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('all');
  const [showUpload, setShowUpload] = useState(Boolean(initialShowUpload));
  const [selected, setSelected] = useState<PatientDocument | null>(() => initialItems.find((document) => document.id === initialSelectedDocumentId) || null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((document) => {
      const haystack = [document.title, document.type, document.author, document.organization, document.encounterDisplay].filter(Boolean).join(' ').toLowerCase();
      return (!normalized || haystack.includes(normalized))
        && (type === 'all' || document.type === type)
        && (source === 'all' || document.source === source)
        && (status === 'all' || document.status === status);
    });
  }, [items, query, source, status, type]);

  const needsReview = items.filter((document) => document.status === 'needs-review' || document.status === 'awaiting-signature').length;

  async function reviewDocument(document: PatientDocument) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(document.id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'review' }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'Unable to review document.');
      setItems((current) => current.map((item) => item.id === document.id ? body.item : item));
      setSelected(body.item);
      setMessage('Document reviewed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to review document.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadDocument(form: HTMLFormElement) {
    setSaving(true);
    setError(null);
    const formData = new FormData(form);
    try {
      const response = await fetch(`/api/patients/${encodeURIComponent(patientId)}/documents`, { method: 'POST', body: formData });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'Unable to upload document.');
      setItems((current) => [body.item, ...current]);
      setSelected(body.item);
      setShowUpload(false);
      setMessage('Document uploaded.');
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload document.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mt-6 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="mt-1 text-sm text-slate-500">Clinical documents for {patientName}.</p>
        </div>
        <button type="button" onClick={() => setShowUpload(true)} className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          + Upload Document
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Document summary">
        <Summary label="Total Documents" value={items.length} />
        <Summary label="Showing" value={filtered.length} />
        <Summary label="Needs Review" value={needsReview} />
        <Summary label="Sources" value={new Set(items.map((item) => item.source)).size} />
      </section>

      {(message || error) && (
        <div role={error ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search Documents
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Documents..." className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-200" />
          </label>
          <FilterSelect label="Type" value={type} onChange={setType} options={initialFilterOptions.types} />
          <FilterSelect label="Source" value={source} onChange={setSource} options={initialFilterOptions.sources} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={initialFilterOptions.statuses} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Document List</h2>
        </div>
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">No Documents match these filters.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((document) => (
              <article key={document.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50">
                <button type="button" onClick={() => setSelected(document)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-900">{document.title}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClass(document.status)}`}>{STATUS_LABELS[document.status] || document.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{document.type} · {formatDate(document.clinicalDate || document.createdAt)} · {document.author || document.organization || 'Author not documented'}</p>
                </button>
                <div className="flex items-center gap-2">
                  {document.storageKey && <a href={`/api/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(document.id)}/content`} target="_blank" rel="noreferrer" className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Open</a>}
                  {(document.status === 'needs-review' || document.status === 'awaiting-signature') && <button type="button" disabled={saving} onClick={() => reviewDocument(document)} className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50">Review</button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-end justify-end bg-slate-900/30 p-4" role="presentation" onClick={() => setSelected(null)}>
          <aside role="dialog" aria-modal="true" aria-label="Document Details" onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selected.title}</h2>
                <p className="mt-1 text-xs text-slate-500">{selected.type} · {formatDate(selected.clinicalDate || selected.createdAt)}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close Document Details" className="rounded-md px-2 py-1 text-xl text-slate-400 hover:bg-slate-100">×</button>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              <Detail label="Status" value={STATUS_LABELS[selected.status] || selected.status} />
              <Detail label="Source" value={selected.source} />
              <Detail label="Author" value={selected.author} />
              <Detail label="Organization" value={selected.organization} />
              <Detail label="Encounter" value={selected.encounterDisplay} />
              <Detail label="Reviewed By" value={selected.reviewedBy} />
            </dl>
            {selected.content && <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Document Content</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.content}</p></div>}
          </aside>
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4" role="presentation" onClick={() => setShowUpload(false)}>
          <form onSubmit={(event) => { event.preventDefault(); void uploadDocument(event.currentTarget); }} onClick={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Upload Document</h2>
            <div className="mt-4 grid gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title<input name="title" required className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal" /></label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Document Type<input name="type" required placeholder="e.g. Discharge Summary" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal" /></label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clinical Date<input name="clinicalDate" type="date" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal" /></label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">File<input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg" className="mt-1.5 block w-full text-sm font-normal normal-case tracking-normal" /></label>
            </div>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowUpload(false)} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Cancel</button><button type="submit" disabled={saving} className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Uploading…' : 'Upload Document'}</button></div>
          </form>
        </div>
      )}
    </main>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3"><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-xl font-bold text-slate-900">{value}</div></div>;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-200"><option value="all">All {label}s</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd></div>;
}
