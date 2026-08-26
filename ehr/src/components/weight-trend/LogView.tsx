"use client";

import React, { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  normalizeMeasurementStatus,
  availableActions,
  computeChangeFromPrevious,
  computeLogSummary,
  computeRowFlags,
  isValidForAnalytics,
  type LogMeasurement,
} from '@/lib/weightLog';
import { formatSignedWeight, formatWeight, toKg } from '@/lib/weightMath';
import MeasurementDetailDrawer from './MeasurementDetailDrawer';
import MarkEnteredInErrorDialog from './MarkEnteredInErrorDialog';
import ReviewChangesDrawer from './ReviewChangesDrawer';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  final: { label: '✓ Final', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  corrected: { label: 'Corrected', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  preliminary: { label: 'Preliminary', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  'entered-in-error': { label: 'Entered in Error', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const SOURCE_META: Record<string, { label: string; sub: string; dot: string }> = {
  clinic: { label: 'Clinic', sub: 'Manual entry', dot: 'bg-blue-400' },
  'patient-reported': { label: 'Patient Reported', sub: 'Portal entry', dot: 'bg-cyan-400' },
  device: { label: 'Connected Device', sub: 'Device reading', dot: 'bg-violet-400' },
  imported: { label: 'Imported', sub: 'External system', dot: 'bg-slate-400' },
};

const RANGE_DAYS: Record<string, number | null> = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730, All: null };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function dominantSource(items: LogMeasurement[]): string {
  const counts = new Map<string, number>();
  for (const measurement of items) {
    const source = measurement.source || 'clinic';
    counts.set(source, (counts.get(source) || 0) + 1);
  }
  const top = Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0];
  if (!top) return 'No source recorded';
  return `${SOURCE_META[top[0]]?.label || top[0]} (${top[1]})`;
}

export default function LogView({ measurements, displayUnit = 'kg', analysisRange = 'All', patientId, onRefresh }: { measurements: LogMeasurement[] | null; displayUnit?: 'kg' | 'lb'; analysisRange?: string; patientId: string; onRefresh: () => Promise<void> | void }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const searchParams = useSearchParams();
  const achievementId = searchParams?.get('achievement') || '';
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hasNoteOnly, setHasNoteOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortField, setSortField] = useState<'date' | 'weight' | 'change'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<'view' | 'correcting'>('view');
  const [markErrorTarget, setMarkErrorTarget] = useState<LogMeasurement | null>(null);
  const [reviewChangesOpen, setReviewChangesOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const scopedMeasurements = useMemo(() => {
    const days = RANGE_DAYS[analysisRange] ?? null;
    if (days == null) return measurements || [];
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return (measurements || []).filter((measurement) => Date.parse(measurement.occurredAt) >= cutoff);
  }, [measurements, analysisRange, now]);

  const summary = useMemo(() => computeLogSummary(scopedMeasurements), [scopedMeasurements]);

  const validAsc = useMemo(
    () => scopedMeasurements.filter(isValidForAnalytics).slice().sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt)),
    [scopedMeasurements],
  );
  const changeById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeChangeFromPrevious>>();
    validAsc.forEach((m, i) => map.set(m.id, computeChangeFromPrevious(validAsc, i)));
    return map;
  }, [validAsc]);

  const activeFilterCount = (sourceFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (hasNoteOnly ? 1 : 0);
  const isScoped = analysisRange !== 'All' || activeFilterCount > 0 || search.trim().length > 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = scopedMeasurements.slice();
    if (achievementId) {
      const qualifyingIds = validAsc.map((measurement) => measurement.id);
      const targetIds = achievementId === 'first'
        ? qualifyingIds.slice(0, 1)
        : achievementId === 'consistent'
          ? qualifyingIds.slice(0, 7)
          : achievementId === 'dedicated'
            ? qualifyingIds.slice(0, 25)
            : qualifyingIds;
      list = list.filter((measurement) => targetIds.includes(measurement.id));
    }
    if (q) {
      list = list.filter(
        (m) =>
          (m.note || '').toLowerCase().includes(q) ||
          formatDate(m.occurredAt).toLowerCase().includes(q) ||
          String(m.value).includes(q) ||
          (m.source || 'clinic').toLowerCase().includes(q) ||
          (m.method || '').toLowerCase().includes(q) ||
          (m.recorder?.name || '').toLowerCase().includes(q),
      );
    }
    if (sourceFilter !== 'all') list = list.filter((m) => (m.source || 'clinic') === sourceFilter);
    if (statusFilter !== 'all') list = list.filter((m) => normalizeMeasurementStatus(m) === statusFilter);
    if (hasNoteOnly) list = list.filter((m) => !!m.note);
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = Date.parse(a.occurredAt) - Date.parse(b.occurredAt);
      else if (sortField === 'weight') cmp = toKg(a.value, a.unit) - toKg(b.value, b.unit);
      else if (sortField === 'change') cmp = (changeById.get(a.id)?.deltaKg ?? 0) - (changeById.get(b.id)?.deltaKg ?? 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [scopedMeasurements, search, sourceFilter, statusFilter, hasNoteOnly, sortField, sortDir, changeById, achievementId, validAsc]);

  const total = filtered.length;
  const start = (page - 1) * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);
  const selectedMeasurement = selectedId ? (measurements || []).find((m) => m.id === selectedId) || null : null;

  function toggleSort(field: 'date' | 'weight' | 'change') {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  }

  function clearFilters() {
    setSourceFilter('all');
    setStatusFilter('all');
    setHasNoteOnly(false);
    setPage(1);
  }

  function openDetails(m: LogMeasurement, mode: 'view' | 'correcting' = 'view') {
    setSelectedId(m.id);
    setDetailMode(mode);
    setOpenMenuId(null);
  }

  if (!measurements) {
    return (
      <div id="weight-panel-log" role="tabpanel" aria-labelledby="weight-tab-log" className="weight-trend-view" aria-busy="true" aria-live="polite">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-[420px] bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (measurements.length === 0) {
    return (
      <div id="weight-panel-log" role="tabpanel" aria-labelledby="weight-tab-log" className="weight-trend-view weight-trend-surface bg-white p-6 text-center py-10">
        <h3 className="text-lg font-semibold text-slate-900">No weight measurements recorded</h3>
        <p className="text-sm text-slate-500 mt-2">Weight measurements will appear here after they are documented.</p>
      </div>
    );
  }

  return (
    <div id="weight-panel-log" role="tabpanel" aria-labelledby="weight-tab-log" className="weight-trend-view">
      {/* Clinical Log Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="weight-trend-surface md:col-span-2 bg-teal-50/70 p-5 border-teal-100">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M12 2c1.5 3 4 4.5 4 8a4 4 0 11-8 0c0-1.5.5-2.5 1.2-3.6.3.9 1 1.6 1.8 1.6-.4-2 .2-4 1-6z" /></svg>
            </div>
            <div>
              <div className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Latest Measurement</div>
              {summary.latest ? (
                <>
                  <div className="text-[30px] leading-none font-black text-slate-900 mt-1.5 tabular-nums">{formatWeight(summary.latest.value, summary.latest.unit, displayUnit)}</div>
                  <div className="text-sm text-slate-600 mt-2">{formatDate(summary.latest.occurredAt)} · <span className="capitalize">{(summary.latest.source || 'clinic').replace('-', ' ')}</span></div>
                  <span className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${STATUS_BADGE[normalizeMeasurementStatus(summary.latest)].className}`}>{STATUS_BADGE[normalizeMeasurementStatus(summary.latest)].label}</span>
                </>
              ) : <div className="text-sm text-slate-500 mt-2">No valid measurements yet</div>}
            </div>
          </div>
        </div>

        <div className="weight-trend-surface bg-blue-50/70 p-5 border-blue-100">
          <div className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Total Entries</div>
          <div className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">{summary.totalEntries}</div>
          <div className="text-xs text-slate-500 mt-1">{summary.validEntries} valid for analytics</div>
        </div>

        <div className="weight-trend-surface bg-cyan-50/70 p-5 border-cyan-100">
          <div className="text-xs font-semibold text-cyan-800 uppercase tracking-wide">Lowest Recorded</div>
          <div className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">{summary.lowest ? formatWeight(summary.lowest.value, summary.lowest.unit, displayUnit) : '—'}</div>
          <div className="text-xs text-slate-500 mt-1">{summary.lowest ? formatDate(summary.lowest.occurredAt) : ''}</div>
        </div>

        <div className="weight-trend-surface bg-violet-50/70 p-5 border-violet-100">
          <div className="text-xs font-semibold text-violet-800 uppercase tracking-wide">Highest Recorded</div>
          <div className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">{summary.highest ? formatWeight(summary.highest.value, summary.highest.unit, displayUnit) : '—'}</div>
          <div className="text-xs text-slate-500 mt-1">{summary.highest ? formatDate(summary.highest.occurredAt) : ''}</div>
        </div>
      </div>

      {/* Data quality banner */}
      {summary.reviewIds.size > 0 && (() => {
        const flagged = (measurements || []).find((m) => summary.reviewIds.has(m.id));
        if (!flagged) return null;
        return (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div className="flex-1">
              <div className="font-semibold text-amber-900 text-sm">Measurement worth reviewing</div>
              <div className="mt-1 text-xs text-amber-800">{flagged.dataQuality?.reason || 'The data-quality service requested a review.'}</div>
              <p className="text-xs text-amber-800 mt-0.5">{flagged.value} {flagged.unit || 'kg'} · {formatDate(flagged.occurredAt)} — This measurement differs substantially from surrounding documented measurements.</p>
            </div>
            <button onClick={() => openDetails(flagged)} className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-amber-900 hover:bg-amber-100 flex-shrink-0">Review Measurement</button>
          </div>
        );
      })()}

      {/* Entry Log header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Entry Log</h3>
          <div className="text-xs text-slate-500 mt-0.5">
            A complete history of documented weight measurements. {summary.totalEntries} measurements
            {summary.statusCounts.final > 0 ? ` · ${summary.statusCounts.final} final` : ''}
            {summary.statusCounts.enteredInError > 0 ? ` · ${summary.statusCounts.enteredInError} entered in error` : ''}
            {summary.statusCounts.corrected > 0 ? ` · ${summary.statusCounts.corrected} corrected` : ''}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{summary.validEntries} valid for analytics</span>
            <span aria-hidden="true">?</span>
            <span>Most records from {dominantSource(measurements)}</span>
            {summary.reviewIds.size > 0 && <><span aria-hidden="true">?</span><span className="font-semibold text-amber-700">{summary.reviewIds.size} review item{summary.reviewIds.size === 1 ? '' : 's'}</span></>}
          </div>
          {achievementId && <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-800">Achievement qualifying records: {filtered.length}<button type="button" onClick={() => { const params = new URLSearchParams(searchParams?.toString() || ''); params.delete('achievement'); router.replace(`${pathname}?${params.toString()}`, { scroll: false }); }} className="font-bold underline">Clear</button></div>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            placeholder="Search date, weight, note, source..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="weight-trend-control border border-slate-200 rounded-lg px-3 py-2 text-sm w-full sm:w-[320px] focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <div className="relative">
            <button onClick={() => setFilterOpen((v) => !v)} aria-haspopup="menu" aria-expanded={filterOpen} className="weight-trend-control px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
            {filterOpen && (
              <div role="menu" className="absolute right-0 mt-1 w-64 rounded-lg bg-white border border-slate-200 shadow-lg p-3 z-30 space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Source</label>
                  <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs">
                    <option value="all">All Sources</option>
                    {Object.entries(SOURCE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs">
                    <option value="all">All Statuses</option>
                    {Object.entries(STATUS_BADGE).map(([k, v]) => <option key={k} value={k}>{v.label.replace('✓ ', '')}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={hasNoteOnly} onChange={(e) => { setHasNoteOnly(e.target.checked); setPage(1); }} className="rounded border-slate-300 text-teal-600" />
                  Has note only
                </label>
                <div className="flex justify-end">
                  <button onClick={clearFilters} className="text-xs font-semibold text-teal-700 hover:underline">Clear Filters</button>
                </div>
              </div>
            )}
          </div>
          <span className="inline-flex min-h-10 items-center rounded-lg border border-teal-100 bg-teal-50 px-3 text-xs font-bold text-teal-800" title="This window is shared with Overview and Insights">Window: {analysisRange === 'All' ? 'All Time' : analysisRange}</span>
          <button onClick={() => setReviewChangesOpen(true)} className="weight-trend-control px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Review Changes</button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap -mt-2">
          {sourceFilter !== 'all' && <button onClick={() => setSourceFilter('all')} className="px-2 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-700 hover:bg-slate-200">{SOURCE_META[sourceFilter]?.label} ×</button>}
          {statusFilter !== 'all' && <button onClick={() => setStatusFilter('all')} className="px-2 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-700 hover:bg-slate-200">{STATUS_BADGE[statusFilter]?.label.replace('✓ ', '')} ×</button>}
          {hasNoteOnly && <button onClick={() => setHasNoteOnly(false)} className="px-2 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-700 hover:bg-slate-200">Has Note ×</button>}
          <button onClick={clearFilters} className="text-xs font-semibold text-teal-700 hover:underline">Clear All</button>
        </div>
      )}

      {isScoped && (
        <div className="text-xs text-slate-500 -mt-2">Showing {total} measurement{total === 1 ? '' : 's'} in selected {analysisRange === 'All' ? 'view' : `${analysisRange} period`}</div>
      )}

      {/* Table */}
      {total === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <h4 className="font-semibold text-slate-900">{search.trim() ? 'No measurements match your search' : 'No measurements match these filters'}</h4>
          <p className="text-sm text-slate-500 mt-1">{search.trim() ? 'Try another search or clear the current query.' : ''}</p>
          <button onClick={() => { setSearch(''); clearFilters(); }} className="mt-3 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {search.trim() ? 'Clear Search' : 'Clear Filters'}
          </button>
        </div>
      ) : (
        <div className="weight-trend-surface overflow-hidden bg-white">
          <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="text-left text-[12px] font-semibold text-slate-500 border-b border-slate-100">
                <th className="px-5 py-4">
                  <button onClick={() => toggleSort('date')} className="inline-flex items-center gap-1 hover:text-slate-700">DATE & TIME {sortField === 'date' && (sortDir === 'asc' ? '↑' : '↓')}</button>
                </th>
                <th className="px-5 py-4">
                  <button onClick={() => toggleSort('weight')} className="inline-flex items-center gap-1 hover:text-slate-700">WEIGHT {sortField === 'weight' && (sortDir === 'asc' ? '↑' : '↓')}</button>
                </th>
                <th className="px-5 py-4">
                  <button onClick={() => toggleSort('change')} className="inline-flex items-center gap-1 hover:text-slate-700">CHANGE {sortField === 'change' && (sortDir === 'asc' ? '↑' : '↓')}</button>
                </th>
                <th className="px-5 py-4">NOTE</th>
                <th className="px-5 py-4">STATUS</th>
                <th className="px-5 py-4">SOURCE</th>
                <th className="px-5 py-4">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((m) => {
                const status = normalizeMeasurementStatus(m);
                const badge = STATUS_BADGE[status];
                const change = changeById.get(m.id);
                const flags = computeRowFlags(m, summary);
                const src = SOURCE_META[m.source || 'clinic'] || SOURCE_META.clinic;
                const actions = availableActions(m);
                const isSelected = selectedId === m.id;
                const isError = status === 'entered-in-error';
                return (
                  <tr
                    key={m.id}
                    tabIndex={0}
                    aria-label={`View measurement ${m.value} ${m.unit || 'kg'} from ${formatDate(m.occurredAt)}`}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-teal-50/60 border-l-[3px] border-l-teal-600' : isError ? 'bg-slate-50/40 hover:bg-slate-50' : 'hover:bg-slate-50/70'}`}
                    onClick={() => openDetails(m)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetails(m); } }}
                  >
                    <td className="px-5 py-4 align-top">
                      <div className={`font-medium ${isError ? 'text-slate-500' : 'text-slate-800'}`}>{formatDate(m.occurredAt)}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{formatTime(m.occurredAt)}</div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className={`font-semibold ${isError ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{m.value} {m.unit || 'kg'}</div>
                      {(flags.includes('review') || flags.includes('latest') || flags.includes('highest') || flags.includes('lowest')) && (
                        <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-100 capitalize">
                          {flags.includes('review') ? 'Review' : flags.includes('latest') ? 'Latest' : flags.includes('highest') ? 'Highest' : 'Lowest'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 align-top text-[13px]">
                      {isError ? (
                        <span className="text-slate-400">—</span>
                      ) : change && change.deltaKg != null ? (
                        <span className="text-slate-600">
                          <span className="font-semibold text-slate-800">{formatSignedWeight(change.deltaKg, displayUnit)}</span>{' '}
                          <span className="text-[11px] text-slate-400">vs previous</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">No previous entry</span>
                      )}
                    </td>
                    <td className="px-5 py-4 align-top text-[13px] text-slate-500 max-w-[160px] truncate">{m.note || '—'}</td>
                    <td className="px-5 py-4 align-top">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.className}`}>{badge.label}</span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${src.dot}`} />
                        <div>
                          <div className="text-[13px] text-slate-700">{src.label}</div>
                          <div className="text-[11px] text-slate-400">{src.sub}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 relative">
                        <button onClick={() => openDetails(m)} className="px-2.5 py-1 border border-slate-200 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50">View</button>
                        <button onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)} aria-haspopup="menu" aria-expanded={openMenuId === m.id} className="px-2 py-1 border border-slate-200 rounded-md text-xs font-medium text-slate-500 hover:bg-slate-50">•••</button>
                        {openMenuId === m.id && (
                          <div role="menu" className="absolute right-0 top-8 w-44 rounded-lg bg-white border border-slate-200 shadow-lg py-1 z-30">
                            {actions.includes('correct') && (
                              <button role="menuitem" onClick={() => openDetails(m, 'correcting')} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Correct Measurement</button>
                            )}
                            {actions.includes('history') && (
                              <button role="menuitem" onClick={() => openDetails(m)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">View History</button>
                            )}
                            {actions.includes('view-encounter') && (
                              <button role="menuitem" onClick={() => openDetails(m)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">View Encounter</button>
                            )}
                            {actions.includes('mark-entered-in-error') && (
                              <button role="menuitem" onClick={() => { setMarkErrorTarget(m); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50">Mark Entered in Error</button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <div className="space-y-3 p-3 md:hidden">
            {pageRows.map((m) => {
              const status = normalizeMeasurementStatus(m);
              const badge = STATUS_BADGE[status];
              const change = changeById.get(m.id);
              const flags = computeRowFlags(m, summary);
              const src = SOURCE_META[m.source || 'clinic'] || SOURCE_META.clinic;
              const actions = availableActions(m);
              const isSelected = selectedId === m.id;
              const isError = status === 'entered-in-error';
              return (
                <article key={m.id} className={`relative overflow-hidden rounded-xl border ${isSelected ? 'border-teal-300 bg-teal-50/60' : isError ? 'border-slate-200 bg-slate-50/60' : 'border-slate-200 bg-white'}`}>
                  <button type="button" onClick={() => openDetails(m)} className="block w-full p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-inset">
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">{formatDate(m.occurredAt)}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{formatTime(m.occurredAt)}</span>
                      </span>
                      <span className={`text-lg font-bold tabular-nums ${isError ? 'text-slate-400 line-through' : 'text-slate-950'}`}>{formatWeight(m.value, m.unit, displayUnit)}</span>
                    </span>
                    <span className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-slate-600">{isError ? 'No analytic change' : change?.deltaKg != null ? `${formatSignedWeight(change.deltaKg, displayUnit)} vs previous` : 'No previous entry'}</span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${badge.className}`}>{badge.label}</span>
                    </span>
                    <span className="mt-2 block text-xs text-slate-500">{src.label} - {src.sub}{m.note ? ` - ${m.note}` : ''}</span>
                    {flags.length > 0 && <span className="mt-2 inline-flex rounded-md border border-teal-100 bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-700">{flags.includes('review') ? 'Review' : flags.includes('latest') ? 'Latest' : flags.includes('highest') ? 'Highest' : 'Lowest'}</span>}
                  </button>
                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-2">
                    <button type="button" onClick={() => openDetails(m)} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">View details</button>
                    <button type="button" aria-label={`More actions for ${m.value} ${m.unit || 'kg'}`} aria-haspopup="menu" aria-expanded={openMenuId === m.id} onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:bg-slate-50">...</button>
                    {openMenuId === m.id && <div role="menu" className="absolute right-3 bottom-12 z-20 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      {actions.includes('correct') && <button role="menuitem" onClick={() => openDetails(m, 'correcting')} className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50">Correct Measurement</button>}
                      {actions.includes('history') && <button role="menuitem" onClick={() => openDetails(m)} className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50">View History</button>}
                      {actions.includes('view-encounter') && <button role="menuitem" onClick={() => openDetails(m)} className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50">View Encounter</button>}
                      {actions.includes('mark-entered-in-error') && <button role="menuitem" onClick={() => { setMarkErrorTarget(m); setOpenMenuId(null); }} className="w-full px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50">Mark Entered in Error</button>}
                    </div>}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer / pagination */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <div>Showing {start + 1}–{Math.min(start + rowsPerPage, total)} of {total} measurements</div>
          <div className="flex items-center gap-3">
            <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm">
              <option value={10}>10 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
            </select>
            <div className="flex items-center gap-1.5">
              <button aria-label="First page" disabled={page === 1} onClick={() => setPage(1)} className="px-2.5 py-1.5 border border-slate-200 rounded-md disabled:opacity-40">«</button>
              <button aria-label="Previous page" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2.5 py-1.5 border border-slate-200 rounded-md disabled:opacity-40">‹</button>
              <div className="px-2 font-semibold text-slate-800">{page}</div>
              <button aria-label="Next page" disabled={start + rowsPerPage >= total} onClick={() => setPage((p) => p + 1)} className="px-2.5 py-1.5 border border-slate-200 rounded-md disabled:opacity-40">›</button>
              <button aria-label="Last page" disabled={start + rowsPerPage >= total} onClick={() => setPage(Math.ceil(total / rowsPerPage))} className="px-2.5 py-1.5 border border-slate-200 rounded-md disabled:opacity-40">»</button>
            </div>
          </div>
        </div>
      )}

      {selectedMeasurement && (
        <MeasurementDetailDrawer
          patientId={patientId}
          measurement={selectedMeasurement}
          needsReview={summary.reviewIds.has(selectedMeasurement.id)}
          initialMode={detailMode}
          onClose={() => setSelectedId(null)}
          onUpdated={async () => { await onRefresh(); setSelectedId(null); }}
        />
      )}

      {markErrorTarget && (
        <MarkEnteredInErrorDialog
          patientId={patientId}
          measurement={markErrorTarget}
          onClose={() => setMarkErrorTarget(null)}
          onConfirmed={async () => { await onRefresh(); setMarkErrorTarget(null); }}
        />
      )}

      {reviewChangesOpen && (
        <ReviewChangesDrawer
          measurements={measurements}
          displayUnit={displayUnit}
          onClose={() => setReviewChangesOpen(false)}
          onSelectMeasurement={(m) => { setReviewChangesOpen(false); openDetails(m as LogMeasurement); }}
        />
      )}
    </div>
  );
}
