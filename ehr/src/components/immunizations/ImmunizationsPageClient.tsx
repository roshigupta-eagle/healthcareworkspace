"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ImmunizationRecord, ImmunizationStatus } from '@/lib/immunizationStore';

type FilterKey = 'all' | 'completed' | 'planned' | 'review-due';

const STATUS_META: Record<ImmunizationStatus, { label: string; className: string; dot: string }> = {
  completed: { label: 'Completed', className: 'border-emerald-200 bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  planned: { label: 'Planned', className: 'border-blue-200 bg-blue-50 text-blue-800', dot: 'bg-blue-500' },
  'not-done': { label: 'Not given', className: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  'entered-in-error': { label: 'Entered in error', className: 'border-rose-200 bg-rose-50 text-rose-800', dot: 'bg-rose-500' },
  unknown: { label: 'Unknown', className: 'border-slate-200 bg-slate-50 text-slate-700', dot: 'bg-slate-400' },
};

function Icon({ name, size = 20 }: { name: 'shield' | 'syringe' | 'calendar' | 'alert' | 'history' | 'download' | 'close' | 'search'; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    shield: <><path d="M12 3 5 6v5c0 4.5 2.9 8.2 7 10 4.1-1.8 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
    syringe: <><path d="m14 6 4 4" /><path d="m16 4 4 4" /><path d="m3 21 8.5-8.5" /><path d="m6 18 3 3" /><path d="m7 14 3 3" /><path d="m11 9 4 4" /><path d="m9 11 5-5 4 4-5 5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    alert: <><path d="M10.3 3.8 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5M12 7v5l3 2" /></>,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5M4 21h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  };

  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

function formatDate(value?: string) {
  if (!value) return 'Not documented';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function isReviewDue(item: ImmunizationRecord, now = Date.now()) {
  return Boolean(item.nextReview && Date.parse(item.nextReview) <= now && item.status !== 'entered-in-error');
}

function sourceLabel(source: ImmunizationRecord['source']) {
  if (source === 'patient-history') return 'Patient history';
  if (source === 'imported') return 'Imported';
  return 'Clinic record';
}

async function loadImmunizations(patientId: string) {
  const response = await fetch(`/api/patients/${encodeURIComponent(patientId)}/immunizations`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load the immunization record.');
  const json = await response.json() as { items?: ImmunizationRecord[] };
  return Array.isArray(json.items) ? json.items : [];
}

function StatusBadge({ status }: { status: ImmunizationStatus }) {
  const meta = STATUS_META[status] || STATUS_META.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
    </span>
  );
}

function StatCard({ icon, value, label, tone }: { icon: 'shield' | 'calendar' | 'alert' | 'history'; value: string | number; label: string; tone: 'teal' | 'blue' | 'amber' | 'violet' }) {
  const tones = {
    teal: 'border-teal-100 bg-teal-50/70 text-teal-800',
    blue: 'border-blue-100 bg-blue-50/70 text-blue-800',
    amber: 'border-amber-100 bg-amber-50/70 text-amber-800',
    violet: 'border-violet-100 bg-violet-50/70 text-violet-800',
  };
  const iconTones = { teal: 'bg-teal-100 text-teal-700', blue: 'bg-blue-100 text-blue-700', amber: 'bg-amber-100 text-amber-700', violet: 'bg-violet-100 text-violet-700' };
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconTones[tone]}`}><Icon name={icon} size={20} /></div>
        <span className="text-3xl font-bold tabular-nums tracking-tight">{value}</span>
      </div>
      <div className="mt-4 text-sm font-bold">{label}</div>
    </div>
  );
}

export default function ImmunizationsPageClient({ patientId, initialItems }: { patientId: string; initialItems: ImmunizationRecord[] }) {
  const [items, setItems] = useState<ImmunizationRecord[]>(initialItems);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selected, setSelected] = useState<ImmunizationRecord | null>(null);

  async function fetchItems() {
    setLoading(true);
    setError(null);
    try {
      setItems(await loadImmunizations(patientId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load the immunization record.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void loadImmunizations(patientId).then((nextItems) => {
      if (active) setItems(nextItems);
    }).catch((requestError) => {
      if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load the immunization record.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [patientId]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelected(null);
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, []);

  const summary = useMemo(() => {
    const valid = items.filter((item) => item.status !== 'entered-in-error');
    const completed = valid.filter((item) => item.status === 'completed');
    const due = valid.filter((item) => isReviewDue(item));
    const latest = completed.slice().sort((left, right) => Date.parse(right.date || '') - Date.parse(left.date || ''))[0];
    return { valid, completed, due, latest };
  }, [items]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !normalizedQuery || [item.name, item.manufacturer, item.provider, item.notes, sourceLabel(item.source)].some((value) => value?.toLowerCase().includes(normalizedQuery));
      const matchesFilter = filter === 'all' || (filter === 'review-due' ? isReviewDue(item) : item.status === filter);
      return matchesQuery && matchesFilter;
    });
  }, [filter, items, query]);

  function exportCsv() {
    const header = ['Vaccine', 'Administration date', 'Status', 'Next review', 'Source', 'Provider'];
    const rows = items.map((item) => [item.name, item.date || '', STATUS_META[item.status]?.label || 'Unknown', item.nextReview || '', sourceLabel(item.source), item.provider || '']);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `immunizations-${patientId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="pb-10 pt-7 sm:pt-9" aria-labelledby="immunizations-title">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 2xl:p-9">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-start">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-teal-800">
              <Icon name="shield" size={14} />
              Preventive care record
            </div>
            <h1 id="immunizations-title" className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Immunization history</h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">Review documented vaccines, follow-up dates, and source details in one clinical record.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/dashboard/records/${patientId}/immunizations/new`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
              <Icon name="syringe" size={18} />
              Add immunization
            </Link>
            <button type="button" onClick={exportCsv} disabled={items.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
              <Icon name="download" size={17} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="shield" value={summary.completed.length} label="Documented administrations" tone="teal" />
          <StatCard icon="calendar" value={summary.valid.filter((item) => item.status === 'completed' && !isReviewDue(item)).length} label="No review currently due" tone="blue" />
          <StatCard icon="alert" value={summary.due.length} label="Reviews due" tone="amber" />
          <StatCard icon="history" value={summary.latest ? formatDate(summary.latest.date) : '—'} label="Latest documented dose" tone="violet" />
        </div>
      </section>

      {error && (
        <div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center" role="alert">
          <div className="flex items-start gap-3"><Icon name="alert" size={18} /><span>{error} Showing the last available view.</span></div>
          <button type="button" onClick={() => void fetchItems()} className="self-start font-bold underline underline-offset-2 sm:self-auto">Try again</button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="min-w-0 rounded-3xl border border-slate-200/80 bg-white shadow-sm" aria-labelledby="history-heading">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 id="history-heading" className="text-xl font-bold text-slate-950">Documented immunizations</h2>
                <p className="mt-1 text-sm text-slate-500">{filtered.length} of {items.length} record{items.length === 1 ? '' : 's'} shown</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(['all', 'completed', 'planned', 'review-due'] as FilterKey[]).map((key) => {
                  const labels: Record<FilterKey, string> = { all: 'All records', completed: 'Completed', planned: 'Planned', 'review-due': 'Review due' };
                  return <button key={key} type="button" onClick={() => setFilter(key)} className={`min-h-9 rounded-lg px-3 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 ${filter === key ? 'bg-teal-700 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{labels[key]}</button>;
                })}
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 md:flex-row">
              <label className="relative block min-w-0 flex-1 md:max-w-md">
                <span className="sr-only">Search immunizations</span>
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="search" size={17} /></span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vaccine, provider, or source" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100" />
              </label>
              <button type="button" onClick={() => void fetchItems()} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500">Refresh record</button>
            </div>
          </div>

          {loading && items.length === 0 ? (
            <div className="space-y-3 p-6" aria-busy="true" aria-label="Loading immunization history">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-14 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-100"><Icon name="syringe" size={30} /></div>
              <h3 className="mt-5 text-lg font-bold text-slate-950">{items.length === 0 ? 'No immunizations recorded' : 'No records match this view'}</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{items.length === 0 ? 'This record reflects documented immunizations only. Add a verified administration or planned dose to begin the history.' : 'Try a different search term or clear the active filter.'}</p>
              {items.length === 0 ? <Link href={`/dashboard/records/${patientId}/immunizations/new`} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"><Icon name="syringe" size={17} />Add immunization</Link> : <button type="button" onClick={() => { setQuery(''); setFilter('all'); }} className="mt-6 text-sm font-bold text-teal-700 underline underline-offset-2">Clear filters</button>}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <caption className="sr-only">Documented immunization history</caption>
                  <thead className="bg-slate-50/80 text-[11px] uppercase tracking-[0.1em] text-slate-500">
                    <tr>
                      <th scope="col" className="px-6 py-4 font-bold">Vaccine</th>
                      <th scope="col" className="px-4 py-4 font-bold">Administered</th>
                      <th scope="col" className="px-4 py-4 font-bold">Status</th>
                      <th scope="col" className="px-4 py-4 font-bold">Next review</th>
                      <th scope="col" className="px-4 py-4 font-bold">Source</th>
                      <th scope="col" className="px-6 py-4 text-right font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((item) => (
                      <tr key={item.id} tabIndex={0} onClick={() => setSelected(item)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(item); } }} className="cursor-pointer transition-colors hover:bg-teal-50/40 focus:bg-teal-50/50 focus:outline-none">
                        <th scope="row" className="px-6 py-5 align-top font-semibold text-slate-900"><div>{item.name}</div><div className="mt-1 text-xs font-normal text-slate-500">{item.manufacturer || 'Manufacturer not documented'}</div></th>
                        <td className="px-4 py-5 align-top text-sm text-slate-700">{formatDate(item.date)}</td>
                        <td className="px-4 py-5 align-top"><StatusBadge status={item.status} /></td>
                        <td className="px-4 py-5 align-top text-sm text-slate-700">{item.nextReview ? <span className={isReviewDue(item) ? 'font-bold text-amber-800' : ''}>{formatDate(item.nextReview)}</span> : 'Not documented'}</td>
                        <td className="px-4 py-5 align-top text-sm text-slate-600">{sourceLabel(item.source)}<div className="mt-1 text-xs text-slate-400">{item.provider || 'Provider not documented'}</div></td>
                        <td className="px-6 py-5 text-right align-top"><button type="button" onClick={(event) => { event.stopPropagation(); setSelected(item); }} className="min-h-9 rounded-lg px-3 text-sm font-bold text-teal-700 hover:bg-teal-50 focus-visible:ring-2 focus-visible:ring-teal-500">View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-slate-100 md:hidden">
                {filtered.map((item) => (
                  <button key={item.id} type="button" onClick={() => setSelected(item)} className="block w-full p-5 text-left transition-colors hover:bg-teal-50/40 focus:bg-teal-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500">
                    <div className="flex items-start justify-between gap-3"><span className="font-bold text-slate-900">{item.name}</span><StatusBadge status={item.status} /></div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Administered</div><div className="mt-1 text-slate-700">{formatDate(item.date)}</div></div><div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Next review</div><div className={`mt-1 ${isReviewDue(item) ? 'font-bold text-amber-800' : 'text-slate-700'}`}>{formatDate(item.nextReview)}</div></div></div>
                    <div className="mt-3 text-xs text-slate-500">{sourceLabel(item.source)}{item.provider ? ` · ${item.provider}` : ''}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm" aria-labelledby="coverage-heading">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Icon name="shield" size={20} /></div><div><h2 id="coverage-heading" className="font-bold text-slate-950">Record status</h2><p className="text-xs text-slate-500">Based on documented entries</p></div></div>
            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-4"><div className="text-sm font-bold text-slate-900">{summary.due.length > 0 ? `${summary.due.length} review${summary.due.length === 1 ? '' : 's'} due` : summary.valid.length > 0 ? 'No review dates due' : 'No records to review'}</div><p className="mt-1 text-sm leading-6 text-slate-600">A missing entry does not confirm that a vaccine was not received. Verify outside records before making a clinical decision.</p></div>
            {summary.due.length > 0 && <button type="button" onClick={() => setFilter('review-due')} className="mt-4 min-h-10 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-900 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500">Review due records</button>}
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm" aria-labelledby="documentation-heading">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Icon name="history" size={20} /></div><h2 id="documentation-heading" className="font-bold text-slate-950">Documentation notes</h2></div>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-slate-600"><li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-teal-500" />Statuses describe the record state, not clinical immunity.</li><li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-teal-500" />Imported and patient-history entries remain identifiable by source.</li><li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-teal-500" />Entered-in-error records remain visible for audit context.</li></ul>
          </section>
        </aside>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[var(--z-overlay)] flex justify-end bg-slate-950/30" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="immunization-detail-title" className="h-full w-full max-w-[620px] overflow-y-auto bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700">Immunization details</p><h2 id="immunization-detail-title" className="mt-2 text-2xl font-bold text-slate-950">{selected.name}</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="Close details" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-teal-500"><Icon name="close" size={20} /></button></div>
            <div className="mt-6"><StatusBadge status={selected.status} /></div>
            <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Administration date</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{formatDate(selected.date)}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Next review</dt><dd className={`mt-1 text-sm font-semibold ${isReviewDue(selected) ? 'text-amber-800' : 'text-slate-900'}`}>{formatDate(selected.nextReview)}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Source</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{sourceLabel(selected.source)}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Provider</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{selected.provider || 'Not documented'}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Manufacturer</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{selected.manufacturer || 'Not documented'}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Lot number</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{selected.lotNumber || 'Not documented'}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Administration site</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{selected.site || 'Not documented'}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Route</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{selected.route || 'Not documented'}</dd></div></dl>
            {selected.notes && <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Clinical note</h3><p className="mt-2 text-sm leading-6 text-slate-700">{selected.notes}</p></div>}
            {selected.recordedBy && <p className="mt-7 text-xs text-slate-500">Recorded by {selected.recordedBy}{selected.history[0]?.date ? ` on ${formatDate(selected.history[0].date)}` : ''}.</p>}
            <div className="mt-8 border-t border-slate-100 pt-5"><button type="button" onClick={() => setSelected(null)} className="min-h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500">Close details</button></div>
          </section>
        </div>
      )}
    </main>
  );
}