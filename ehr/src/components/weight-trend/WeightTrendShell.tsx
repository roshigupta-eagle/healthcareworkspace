"use client";

import React, { useEffect, useMemo, useState } from 'react';
import WeightTrendTabs from './WeightTrendTabs';
import WeightTrendChart from './WeightTrendChart';
import InsightsView from './InsightsView';
import AchievementsView from './AchievementsView';
import LogView from './LogView';
import AddMeasurementDrawer from './AddMeasurementDrawer';
import ManageGoalDrawer from './ManageGoalDrawer';
import MeasurementDetailDrawer from './MeasurementDetailDrawer';
import WhatChangedDrawer from './WhatChangedDrawer';
import ClinicalThreadDrawer from './ClinicalThreadDrawer';
import ShareReportModal from './ShareReportModal';
import ViewAllMeasurementsModal from './ViewAllMeasurementsModal';
import EventDetailPopover from './EventDetailPopover';
import { toKg, computeGoalProgress, detectOutlierIds } from '@/lib/weightMath';
import { computeAchievements } from '@/lib/weightAchievements';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Props = { patientId: string; patientData: any; initialRange?: string };

function formatDateShort(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }); } catch { return iso; }
}

const DEFAULT_CHART_OPTIONS = {
  showGoal: true,
  showBaseline: true,
  showEvents: true,
  showSources: false,
  connectPoints: true,
  showLabels: false,
};

export default function WeightTrendShell({ patientId, patientData, initialRange }: Props) {
  const searchParamsLocal = useSearchParams();
  const activeTab = (searchParamsLocal?.get('tab') || 'overview').toLowerCase();
  const [measurements, setMeasurements] = useState<any[] | null>(null);
  const [goal, setGoal] = useState<any | null>(null);
  const [clinicalEvents, setClinicalEvents] = useState<any[]>([]);
  const [eventsFailed, setEventsFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [range, setRange] = useState(initialRange || '1Y');
  const [showAdd, setShowAdd] = useState(false);
  const [showManageGoal, setShowManageGoal] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<any | null>(null);
  const [showWhatChanged, setShowWhatChanged] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showViewAll, setShowViewAll] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [chartOptions, setChartOptions] = useState(DEFAULT_CHART_OPTIONS);
  const [chartOptionsOpen, setChartOptionsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [showMoreStats, setShowMoreStats] = useState(false);
  // Achievements must reflect the patient's ENTIRE tracking history, never the
  // Overview date-range selector, so they are fetched independently (all-time).
  const [allTimeMeasurements, setAllTimeMeasurements] = useState<any[] | null>(null);

  useEffect(() => { fetchData(); }, [patientId, range]);
  useEffect(() => { fetchAllTimeMeasurements(); }, [patientId]);

  async function fetchAllTimeMeasurements() {
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/weight-trend`);
      if (!res.ok) throw new Error('request failed');
      const json = await res.json();
      setAllTimeMeasurements(Array.isArray(json.items) ? json.items : []);
    } catch {
      setAllTimeMeasurements([]);
    }
  }

  async function fetchData() {
    setLoading(true);
    setLoadError(false);
    try {
      let url = `/api/patients/${encodeURIComponent(patientId)}/weight-trend`;
      if (range && range !== 'All') {
        const now = Date.now();
        const days = {
          '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730
        }[range] || 365;
        const from = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
        url += `?from=${encodeURIComponent(from)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('request failed');
      const json = await res.json();
      setMeasurements(Array.isArray(json.items) ? json.items : []);
      setGoal(json.goal || null);
      try {
        setClinicalEvents(Array.isArray(json.clinicalEvents) ? json.clinicalEvents : []);
        setEventsFailed(false);
      } catch {
        setClinicalEvents([]);
        setEventsFailed(true);
      }
    } catch (e) {
      setMeasurements(null);
      setGoal(null);
      setClinicalEvents([]);
      setLoadError(true);
    }
    setLoading(false);
    // Achievements are all-time and independent of the selected range — refresh alongside.
    fetchAllTimeMeasurements();
  }

  const stats = useMemo(() => {
    const items = (measurements || [])
      .filter((m) => !m.enteredInError)
      .map((m) => ({ ...m, weightKg: toKg(Number(m.value), m.unit) }))
      .sort((a,b)=> Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
    if (!items || items.length === 0) return null;
    const first = items[0];
    const last = items[items.length - 1];
    const totalChangeKg = +(last.weightKg - first.weightKg).toFixed(2);
    const totalChangePct = +(first.weightKg ? ((totalChangeKg / first.weightKg) * 100) : 0).toFixed(2);
    const periodCount = items.length;
    const average = +(items.reduce((s:any,i:any)=>s + (Number(i.weightKg)||0),0) / items.length).toFixed(2);
    const lowest = items.reduce((min:any,i:any)=> i.weightKg < min.weightKg ? i : min, items[0]);
    const highest = items.reduce((max:any,i:any)=> i.weightKg > max.weightKg ? i : max, items[0]);
    const median = (() => {
      const vals = items.map(i=>i.weightKg).sort((a,b)=>a-b);
      const mid = Math.floor(vals.length/2);
      return +((vals.length % 2 === 0 ? ((vals[mid-1]+vals[mid])/2) : vals[mid])).toFixed(2);
    })();
    return { first, last, totalChangeKg, totalChangePct, periodCount, average, lowest, highest, median, items };
  }, [measurements]);

  const outlierIds = useMemo(() => detectOutlierIds((measurements || []).filter((m) => !m.enteredInError)), [measurements]);

  const goalProgress = useMemo(() => computeGoalProgress(goal, stats?.last?.weightKg ?? null), [goal, stats]);

  const previousVisitMeasurement = useMemo(() => {
    if (!stats || !patientData?.lastVisit) return null;
    const lastVisitT = Date.parse(patientData.lastVisit);
    if (Number.isNaN(lastVisitT)) return null;
    // closest documented measurement at/before the last visit date
    const candidates = stats.items.filter((m: any) => Date.parse(m.occurredAt) <= lastVisitT);
    return candidates.length ? candidates[candidates.length - 1] : stats.first;
  }, [stats, patientData]);

  const eventsSinceLastVisit = useMemo(() => {
    const cutoff = patientData?.lastVisit ? Date.parse(patientData.lastVisit) : 0;
    return (clinicalEvents || []).filter((e) => Date.parse(e.date) >= cutoff);
  }, [clinicalEvents, patientData]);

  function directionLabel() {
    if (!stats) return 'Insufficient Data';
    const delta = stats.last.weightKg - stats.first.weightKg;
    if (Math.abs(delta) < 0.1) return 'Stable';
    return delta < 0 ? 'Gradually decreasing' : 'Gradually increasing';
  }


  // Authoritative, pure computation over ALL-TIME data — not the Overview date-range selector.
  const achievementsModel = useMemo(() => {
    if (!allTimeMeasurements) return null;
    return computeAchievements(allTimeMeasurements, goal);
  }, [allTimeMeasurements, goal]);

  if (loading || (!measurements && !loadError)) {
    return (
      <div className="max-w-7xl mx-auto" aria-busy="true" aria-live="polite">
        <div className="animate-pulse space-y-5">
          <div className="h-8 bg-slate-100 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 h-32 bg-slate-100 rounded-2xl" />
            <div className="h-32 bg-slate-100 rounded-2xl" />
            <div className="h-32 bg-slate-100 rounded-2xl" />
            <div className="h-32 bg-slate-100 rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-slate-100 rounded-2xl" />
            <div className="h-96 bg-slate-100 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <h2 className="text-xl font-semibold text-slate-900">We couldn&apos;t load weight history.</h2>
        <p className="text-sm text-slate-500 mt-2">Please try again, or return once the connection is restored.</p>
        <button onClick={fetchData} className="mt-5 px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800">Try Again</button>
      </div>
    );
  }

  if ((measurements || []).length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-2xl font-semibold">Weight Trend</h2>
          <p className="text-sm text-gray-600 mt-2">No weight measurements yet. Weight measurements will appear here once recorded.</p>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={()=>setShowAdd(true)} className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800">+ Add Measurement</button>
            <Link href={`/dashboard/records/${patientId}/vitals`} className="text-sm text-teal-600 hover:underline">View Vitals</Link>
          </div>
        </div>

        {showAdd && (
          <AddMeasurementDrawer
            patientId={patientId}
            existingMeasurements={measurements || []}
            onClose={() => setShowAdd(false)}
            onSaved={async () => { await fetchData(); setShowAdd(false); }}
          />
        )}
      </div>
    );
  }

  if ((measurements || []).filter((m) => !m.enteredInError).length === 1) {
    const only = measurements!.find((m) => !m.enteredInError);
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-2xl font-semibold">Weight Trend</h2>
          <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/40 p-5 text-center">
            <div className="text-3xl font-black text-slate-900">{only.value} {only.unit || 'kg'}</div>
            <div className="text-xs text-slate-500 mt-1">{formatDateShort(only.occurredAt)}</div>
          </div>
          <p className="text-sm text-gray-600 mt-4">More measurements are needed to display a longitudinal trend.</p>
          <button onClick={()=>setShowAdd(true)} className="mt-4 px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800">+ Add Measurement</button>
        </div>
        {showAdd && (
          <AddMeasurementDrawer
            patientId={patientId}
            existingMeasurements={measurements || []}
            onClose={() => setShowAdd(false)}
            onSaved={async () => { await fetchData(); setShowAdd(false); }}
          />
        )}
      </div>
    );
  }

  if (!stats) return null;

  // Render page with data
  const current = stats.last;
  const baseline = stats.first;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-[28px] font-bold text-slate-900">Weight Trend</h1>
          <div className="text-sm text-slate-500 mt-1">Longitudinal weight, BMI, goals and relevant clinical events.</div>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={()=>setShowAdd(true)} className="px-4 py-2.5 bg-teal-700 text-white rounded-lg shadow-sm text-sm font-semibold hover:bg-teal-800">+ Add Measurement</button>
          <button onClick={()=>setShowManageGoal(true)} className="px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Manage Goal</button>
          <button onClick={()=>setShowShare(true)} className="px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Share Report</button>
          <div className="relative">
            <button onClick={()=>setExportOpen((v)=>!v)} aria-haspopup="menu" aria-expanded={exportOpen} className="px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Export</button>
            {exportOpen && (
              <div role="menu" className="absolute right-0 mt-1 w-48 rounded-lg bg-white border border-slate-200 shadow-lg py-1 z-30">
                <button role="menuitem" onClick={() => { setExportOpen(false); setShowViewAll(true); }} className="w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50">CSV Measurements</button>
                <button role="menuitem" onClick={() => { setExportOpen(false); window.print(); }} className="w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50">Print</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs: Overview / Insights / Achievements / Log */}
      <WeightTrendTabs achievementsCompleted={achievementsModel?.summary.completed} achievementsTotal={achievementsModel?.summary.total} />

      {/* Main tab content */}
      {activeTab === 'insights' ? (
        <InsightsView
          measurements={measurements}
          range={range}
          unitOverride={undefined}
          patientId={patientId}
          goal={goal}
          patientData={patientData}
          onRefresh={fetchData}
        />
      ) : activeTab === 'achievements' ? (
        <AchievementsView model={achievementsModel} onSetGoal={() => setShowManageGoal(true)} />
      ) : activeTab === 'log' ? (
        <LogView measurements={allTimeMeasurements || []} patientId={patientId} onRefresh={fetchData} />
      ) : (
        /* Overview content */
        <>
          {/* Clinical Weight Snapshot — Current Weight is the dominant card */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="md:col-span-2 bg-teal-50/70 rounded-2xl p-6 border border-teal-100">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center ring-1 ring-teal-600/10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 2c1.657 0 3 1.343 3 3 0 3-3 6-3 6s-3-3-3-6c0-1.657 1.343-3 3-3z" fill="#0d9488" />
                    <path d="M5 20c0-3.866 3.582-7 8-7s8 3.134 8 7v1H5v-1z" fill="#0d9488" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Current Weight</div>
                  <div className="text-[38px] leading-none font-black text-slate-900 mt-1.5 tabular-nums">{current.value}<span className="text-lg font-semibold text-slate-500"> {current.unit}</span></div>
                  <div className="text-sm text-slate-600 mt-2">{formatDateShort(current.occurredAt)} · <span className="capitalize">{current.source?.replace('-', ' ')}</span></div>
                  {(() => {
                    const idx = stats.items.findIndex((x: any) => x.id === current.id);
                    if (idx > 0) {
                      const prev = stats.items[idx - 1];
                      const d = +(current.weightKg - prev.weightKg).toFixed(2);
                      return (
                        <div className="text-sm text-slate-700 mt-2">
                          Previous: <span className="font-medium">{prev.value} {prev.unit}</span>{' '}
                          <span className="text-slate-500">({d === 0 ? 'no change' : d > 0 ? `+${d} kg` : `${d} kg`})</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>

            <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-100">
              <div className="text-xs font-semibold text-sky-800 uppercase tracking-wide">Since Baseline</div>
              <div className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">{stats.totalChangeKg > 0 ? `+${stats.totalChangeKg} kg` : `${stats.totalChangeKg} kg`}</div>
              <div className="text-xs text-slate-500 mt-1">{stats.totalChangePct}% · Baseline {stats.first.value} {stats.first.unit} · {formatDateShort(stats.first.occurredAt)}</div>
            </div>

            <div className="bg-cyan-50/70 p-4 rounded-2xl border border-cyan-100">
              <div className="text-xs font-semibold text-cyan-800 uppercase tracking-wide">Since Last Visit</div>
              {previousVisitMeasurement ? (() => {
                const d = +(current.weightKg - previousVisitMeasurement.weightKg).toFixed(2);
                return <div className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">{d === 0 ? 'No change' : d > 0 ? `+${d} kg` : `${d} kg`}</div>;
              })() : <div className="text-xl font-bold text-slate-400 mt-1.5">—</div>}
              <div className="text-xs text-slate-500 mt-1">{patientData.lastVisit ? formatDateShort(patientData.lastVisit) : 'No visit data'}</div>
            </div>

            <div className="bg-violet-50/70 p-4 rounded-2xl border border-violet-100">
              <div className="text-xs font-semibold text-violet-800 uppercase tracking-wide">BMI</div>
              <div className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">{(() => {
                const heightRaw = patientData.height || '';
                const m = parseFloat(String(heightRaw).replace('cm', '').trim()) / 100;
                if (m && current.weightKg) return (current.weightKg / (m * m)).toFixed(1) + ' kg/m²';
                return '—';
              })()}</div>
              <div className="text-xs text-slate-500 mt-1">Based on latest documented height &amp; weight</div>
            </div>
          </div>

          {/* Main region: chart + right rail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-800">Weight Trend Over Time</div>
                  <div className="text-xs text-slate-500">Documented measurements with goals and relevant clinical events.</div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['1M','3M','6M','1Y','2Y','All'].map((r)=> (
                    <button key={r} onClick={()=>setRange(r)} className={`px-2.5 py-1 text-xs font-semibold rounded-md ${range===r? 'bg-teal-100 text-teal-800': 'text-slate-500 hover:bg-slate-50'}`}>{r}</button>
                  ))}
                  <button onClick={() => setShowWhatChanged(true)} className="ml-1.5 px-2.5 py-1 text-xs font-semibold border border-cyan-200 bg-cyan-50 text-cyan-800 rounded-md hover:bg-cyan-100">What Changed?</button>
                  <div className="relative">
                    <button onClick={() => setChartOptionsOpen((v) => !v)} aria-haspopup="menu" aria-expanded={chartOptionsOpen} className="px-2.5 py-1 text-xs font-semibold border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">Chart Options</button>
                    {chartOptionsOpen && (
                      <div role="menu" className="absolute right-0 mt-1 w-56 rounded-lg bg-white border border-slate-200 shadow-lg py-2 px-3 z-30 space-y-1.5">
                        {([
                          ['showGoal', 'Show Goal'],
                          ['showBaseline', 'Show Baseline'],
                          ['showEvents', 'Show Clinical Events'],
                          ['showLabels', 'Show Labels'],
                          ['connectPoints', 'Connect Points'],
                        ] as const).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(chartOptions as any)[key]}
                              onChange={(e) => setChartOptions((prev) => ({ ...prev, [key]: e.target.checked }))}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <WeightTrendChart
                  measurements={stats.items}
                  goal={goal}
                  clinicalEvents={clinicalEvents}
                  outlierIds={outlierIds}
                  chartOptions={chartOptions}
                  onPointClick={(m) => setSelectedMeasurement(m)}
                  onEventClick={(e) => setSelectedEvent(e)}
                />
                <p className="sr-only" role="note">
                  {stats.periodCount} weight measurements are available in the selected period. Values range from {stats.lowest.value} {stats.lowest.unit} to {stats.highest.value} {stats.highest.unit}. The latest measurement is {current.value} {current.unit} on {formatDateShort(current.occurredAt)}.
                </p>
                {eventsFailed && <p className="mt-2 text-xs text-amber-700">Clinical event markers unavailable.</p>}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                <div>Trend: <span className="font-medium text-slate-800">{directionLabel()}</span></div>
                <div>Goal: <span className="font-medium">{goal ? `${goal.targetWeight} kg by ${formatDateShort(goal.targetDate)}` : 'No active goal'}</span></div>
                <button onClick={() => setShowViewAll(true)} className="text-teal-700 font-medium hover:underline">View Data Table</button>
              </div>

              {/* Compact statistics row */}
              <div className="mt-6 border-t border-slate-100 pt-4">
                <div className="flex flex-col md:flex-row gap-3 text-sm text-slate-700">
                  <div className="flex-1 p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-500">Starting</div><div className="font-semibold">{stats.first.value} {stats.first.unit}</div><div className="text-xs text-slate-400">{formatDateShort(stats.first.occurredAt)}</div></div>
                  <div className="flex-1 p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-500">Lowest</div><div className="font-semibold">{stats.lowest.value} {stats.lowest.unit}</div><div className="text-xs text-slate-400">{formatDateShort(stats.lowest.occurredAt)}</div></div>
                  <div className="flex-1 p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-500">Highest</div><div className="font-semibold">{stats.highest.value} {stats.highest.unit}</div><div className="text-xs text-slate-400">{formatDateShort(stats.highest.occurredAt)}</div></div>
                  <div className="flex-1 p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-500">Average</div><div className="font-semibold">{stats.average} kg</div><div className="text-xs text-slate-400">Selected range</div></div>
                  <div className="flex-1 p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-500">Measurements</div><div className="font-semibold">{stats.periodCount}</div><div className="text-xs text-slate-400">{(measurements||[]).filter(m=>m.source==='clinic').length} clinic</div></div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <button onClick={() => setShowMoreStats((v) => !v)} className="text-xs font-semibold text-teal-700 hover:underline">{showMoreStats ? '− Hide' : '+ More Statistics'}</button>
                  {outlierIds.size > 0 && <span className="text-xs font-medium text-amber-700">{outlierIds.size} measurement{outlierIds.size === 1 ? '' : 's'} flagged for review</span>}
                </div>
                {showMoreStats && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-xl text-sm text-slate-700 flex items-center gap-6">
                    <div><div className="text-xs text-slate-500">Median</div><div className="font-semibold">{stats.median} kg</div></div>
                  </div>
                )}
              </div>
            </div>

            <aside className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Weight Insights</h3>
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex-shrink-0 rounded-full bg-teal-100 flex items-center justify-center text-teal-700">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  </div>
                  <div><div className="text-xs text-slate-500">Direction</div><div className="font-medium">{directionLabel()}</div></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex-shrink-0 rounded-full bg-sky-100 flex items-center justify-center text-sky-700">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
                  </div>
                  <div><div className="text-xs text-slate-500">Data recency</div><div className="font-medium">{formatDateShort(stats.last.occurredAt)}</div></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex-shrink-0 rounded-full bg-violet-100 flex items-center justify-center text-violet-700">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3 8 4-16 3 8h4" /></svg>
                  </div>
                  <div><div className="text-xs text-slate-500">Measurements</div><div className="font-medium">{stats.periodCount}</div></div>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Measurement Sources</h4>
                {renderSourceDistribution(measurements || [])}
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Goal &amp; Plan</h4>
                <div className="mt-2 text-sm text-slate-700">
                  {goal ? (
                    <div className="space-y-1.5">
                      <div className="font-semibold text-slate-900">Target: {goal.targetWeight} kg</div>
                      <div className="text-xs text-slate-500 capitalize">Goal type: {goalProgress.direction === 'reduction' ? 'Weight reduction' : goalProgress.direction === 'gain' ? 'Weight gain' : goalProgress.direction === 'maintenance' ? 'Maintenance' : goalProgress.direction === 'range' ? 'Target range' : 'Documented goal'}</div>
                      <div className="text-xs text-slate-500 capitalize">Status: {goal.status || 'active'}{goal.targetDate ? ` · Target date: ${formatDateShort(goal.targetDate)}` : ''}</div>
                      {goal.owner && <div className="text-xs text-slate-500 capitalize">Owner: {goal.owner.replace('-', ' ')}</div>}
                      {goalProgress.percent != null ? (
                        <div className="mt-2">
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${goalProgress.percent}%` }} /></div>
                          <div className="text-xs text-slate-500 mt-1">{goalProgress.label}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 mt-1">{goalProgress.label}</div>
                      )}
                      <button onClick={()=>setShowManageGoal(true)} className="mt-2 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">Manage Goal</button>
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium text-slate-900">No active weight goal</div>
                      <p className="text-xs text-slate-500 mt-1">No target weight or maintenance range is currently documented.</p>
                      <button onClick={()=>setShowManageGoal(true)} className="mt-2 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-xs font-semibold hover:bg-violet-100">Set Goal</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Recent Measurements</h4>
                <div className="mt-2 space-y-1">
                  {stats.items.slice().reverse().slice(0, 5).map((m: any) => {
                    const idx = stats.items.findIndex((x: any) => x.id === m.id);
                    const prev = idx > 0 ? stats.items[idx - 1] : null;
                    const d = prev ? +(m.weightKg - prev.weightKg).toFixed(2) : null;
                    const flagged = outlierIds.has(m.id);
                    return (
                      <div key={m.id} role="button" tabIndex={0} onClick={() => setSelectedMeasurement(m)} onKeyDown={(e) => { if (e.key === 'Enter') setSelectedMeasurement(m); }} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <div>
                          <div className="font-medium text-slate-800 flex items-center gap-1.5">
                            {m.value} {m.unit}
                            {flagged && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">Review</span>}
                          </div>
                          <div className="text-xs text-slate-500 capitalize">{formatDateShort(m.occurredAt)} · {m.source?.replace('-', ' ')}</div>
                        </div>
                        <div className="text-sm text-slate-500">{d == null ? '—' : d === 0 ? 'no change' : d > 0 ? `+${d} kg` : `${d} kg`}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-right"><button onClick={() => setShowViewAll(true)} className="text-sm text-teal-700 font-medium hover:underline">View All Measurements →</button></div>
              </div>
            </aside>
          </div>

        </>) }

      {/* Add measurement drawer */}
      {showAdd && (
        <AddMeasurementDrawer
          patientId={patientId}
          existingMeasurements={measurements || []}
          onClose={() => setShowAdd(false)}
          onSaved={async () => { await fetchData(); setShowAdd(false); }}
        />
      )}

      {/* Manage goal drawer */}
      {showManageGoal && (
        <ManageGoalDrawer
          patientId={patientId}
          existingGoal={goal}
          currentWeight={stats?.last?.weightKg}
          onClose={() => setShowManageGoal(false)}
          onSaved={async () => { await fetchData(); setShowManageGoal(false); }}
        />
      )}

      {/* Measurement detail drawer */}
      {selectedMeasurement && (
        <MeasurementDetailDrawer
          patientId={patientId}
          measurement={selectedMeasurement}
          isOutlier={outlierIds.has(selectedMeasurement.id)}
          onClose={() => setSelectedMeasurement(null)}
          onUpdated={async () => { await fetchData(); setSelectedMeasurement(null); }}
        />
      )}

      {/* What changed since last visit */}
      {showWhatChanged && stats && (
        <WhatChangedDrawer
          patient={patientData}
          currentMeasurement={stats.last}
          previousVisitMeasurement={previousVisitMeasurement}
          clinicalEvents={eventsSinceLastVisit}
          onClose={() => setShowWhatChanged(false)}
          onOpenThread={() => setShowThread(true)}
        />
      )}

      {/* Longitudinal clinical thread */}
      {showThread && (
        <ClinicalThreadDrawer
          patient={patientData}
          clinicalEvents={clinicalEvents}
          measurements={stats?.items || []}
          onClose={() => setShowThread(false)}
        />
      )}

      {/* Share report */}
      {showShare && stats && (
        <ShareReportModal
          patient={patientData}
          currentWeight={stats.last}
          stats={stats}
          goal={goal}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* View all measurements / data table */}
      {showViewAll && (
        <ViewAllMeasurementsModal
          patientId={patientId}
          measurements={measurements || []}
          onClose={() => setShowViewAll(false)}
          onSelectMeasurement={(m) => { setShowViewAll(false); setSelectedMeasurement(m); }}
        />
      )}

      {/* Single clinical event detail */}
      {selectedEvent && (
        <EventDetailPopover
          event={selectedEvent}
          patientId={patientId}
          onClose={() => setSelectedEvent(null)}
          onManageGoal={() => { setSelectedEvent(null); setShowManageGoal(true); }}
        />
      )}
    </div>
  );
}

function renderSourceDistribution(items: any[]) {
  const counts = items.reduce((acc:any,i:any)=>{ acc[i.source] = (acc[i.source]||0)+1; return acc; }, {});
  const total = items.length || 1;
  const sources = ['clinic','patient-reported','device','imported'];
  const colors: Record<string, string> = { clinic: '#06B6D4', 'patient-reported': '#60A5FA', device: '#C084FC', imported: '#94A3B8' };
  return (
    <div className="mt-2 space-y-2">
      {sources.map((s)=> {
        const count = counts[s] || 0;
        return (
          <div key={s} className="text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[s] }} /> <span className="capitalize text-slate-600">{s.replace('-',' ')}</span></div>
              <span className="font-medium text-slate-800">{count}</span>
            </div>
            <div className="mt-1 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-1 rounded-full" style={{ width: `${(count / total) * 100}%`, background: colors[s] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
