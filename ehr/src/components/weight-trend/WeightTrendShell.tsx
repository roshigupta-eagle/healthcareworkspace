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
import { computeGoalProgress, detectOutlierIds, formatSignedWeight, formatWeight, summarizeWeightMeasurements } from '@/lib/weightMath';
import type { AchievementsModel } from '@/lib/weightAchievements';
import type { WeightTrendEvent, WeightTrendGoal, WeightTrendMeasurement, WeightTrendPatient } from './weightTrendTypes';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Props = { patientId: string; patientData: WeightTrendPatient; initialRange?: string };

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
  showDataQualityFlags: true,
};

const VALID_RANGES = new Set(['1M', '3M', '6M', '1Y', '2Y', 'All']);

export default function WeightTrendShell({ patientId, patientData, initialRange }: Props) {
  const searchParamsLocal = useSearchParams();
  const pathname = usePathname() || '';
  const router = useRouter();
  const requestedTab = (searchParamsLocal?.get('tab') || 'overview').toLowerCase();
  const activeTab = ['overview', 'insights', 'achievements', 'log'].includes(requestedTab) ? requestedTab : requestedTab === 'acheivments' ? 'achievements' : 'overview';
  const [measurements, setMeasurements] = useState<WeightTrendMeasurement[] | null>(null);
  const [goal, setGoal] = useState<WeightTrendGoal | null>(null);
  const [clinicalEvents, setClinicalEvents] = useState<WeightTrendEvent[]>([]);
  const [eventsFailed, setEventsFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const requestedRangeValue = searchParamsLocal?.get('range') || initialRange || '1Y';
  const requestedRange = VALID_RANGES.has(requestedRangeValue) ? requestedRangeValue : '1Y';
  const requestedUnit = searchParamsLocal?.get('unit') === 'lb' ? 'lb' : 'kg';
  const range = requestedRange;
  const displayUnit = requestedUnit;
  const [showAdd, setShowAdd] = useState(false);
  const [showManageGoal, setShowManageGoal] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<WeightTrendMeasurement | null>(null);
  const [showWhatChanged, setShowWhatChanged] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showViewAll, setShowViewAll] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<WeightTrendEvent | null>(null);
  const [chartOptions, setChartOptions] = useState(DEFAULT_CHART_OPTIONS);
  const [chartOptionsOpen, setChartOptionsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [showMoreStats, setShowMoreStats] = useState(false);
  // Achievements must reflect the patient's ENTIRE tracking history, never the
  // Overview date-range selector, so they are fetched independently (all-time).
  const [allTimeMeasurements, setAllTimeMeasurements] = useState<WeightTrendMeasurement[] | null>(null);
  const [achievementsModel, setAchievementsModel] = useState<AchievementsModel | null>(null);
  const [allTimeClinicalEvents, setAllTimeClinicalEvents] = useState<WeightTrendEvent[]>([]);

  function updateViewParams(next: { range?: string; unit?: 'kg' | 'lb' }) {
    const params = new URLSearchParams(searchParamsLocal?.toString() || '');
    if (next.range) params.set('range', next.range);
    if (next.unit) params.set('unit', next.unit);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => { void fetchData(); }, [patientId, range]);
  useEffect(() => { void fetchAllTimeMeasurements(); }, [patientId]);

  async function fetchAllTimeMeasurements() {
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/weight-trend`);
      if (!res.ok) throw new Error('request failed');
      const json = await res.json();
      setAllTimeMeasurements(Array.isArray(json.items) ? json.items as WeightTrendMeasurement[] : []);
      setAchievementsModel(json.achievements || null);
      setAllTimeClinicalEvents(Array.isArray(json.clinicalEvents) ? json.clinicalEvents : []);
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
      setMeasurements(Array.isArray(json.items) ? json.items as WeightTrendMeasurement[] : []);
      setGoal((json.goal || null) as WeightTrendGoal | null);
      setAchievementsModel(json.achievements || null);
      try {
        setClinicalEvents(Array.isArray(json.clinicalEvents) ? json.clinicalEvents as WeightTrendEvent[] : []);
        setEventsFailed(false);
      } catch {
        setClinicalEvents([]);
        setEventsFailed(true);
      }
    } catch {
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
    const summary = summarizeWeightMeasurements(measurements || []);
    return summary.items.length > 0 ? { ...summary, periodCount: summary.items.length } : null;
  }, [measurements]);

  const outlierIds = useMemo(() => detectOutlierIds((measurements || []).filter((m) => !m.enteredInError)), [measurements]);

  const goalProgress = useMemo(() => computeGoalProgress(goal, stats?.last?.weightKg ?? null), [goal, stats]);

  const lastClinicalVisit = useMemo(() => {
    const completedAppointments = (patientData.upcoming || []).filter((appointment) => appointment.status?.toLowerCase() === 'completed' && Date.parse(appointment.date) <= Date.now()).map((appointment) => appointment.date);
    const historicalVisits = (patientData.history || []).filter((visit) => visit.status?.toLowerCase() !== 'cancelled' && Date.parse(visit.date) <= Date.now()).map((visit) => visit.date);
    const dates = [...completedAppointments, ...historicalVisits].filter((date) => Number.isFinite(Date.parse(date))).sort((a, b) => Date.parse(a) - Date.parse(b));
    return dates[dates.length - 1] || patientData.lastVisit;
  }, [patientData]);

  const previousVisitMeasurement = useMemo(() => {
    if (!stats || !lastClinicalVisit) return null;
    const lastVisitT = Date.parse(lastClinicalVisit);
    if (Number.isNaN(lastVisitT)) return null;
    // closest documented measurement at/before the last visit date
    const allTimeItems = summarizeWeightMeasurements(allTimeMeasurements || []).items;
    const candidates = allTimeItems.filter((m) => Date.parse(m.occurredAt) <= lastVisitT);
    return candidates.length ? candidates[candidates.length - 1] : stats.first;
  }, [stats, allTimeMeasurements, lastClinicalVisit]);

  const measurementsSinceLastVisit = useMemo(() => {
    if (!lastClinicalVisit) return 0;
    const cutoff = Date.parse(lastClinicalVisit);
    return summarizeWeightMeasurements(allTimeMeasurements || []).items.filter((measurement) => Date.parse(measurement.occurredAt) > cutoff).length;
  }, [allTimeMeasurements, lastClinicalVisit]);

  const reviewCountSinceLastVisit = useMemo(() => {
    if (!lastClinicalVisit) return 0;
    const cutoff = Date.parse(lastClinicalVisit);
    return (allTimeMeasurements || []).filter((measurement) => Date.parse(measurement.occurredAt) > cutoff && measurement.dataQuality?.state === 'review').length;
  }, [allTimeMeasurements, lastClinicalVisit]);

  const eventsSinceLastVisit = useMemo(() => {
    const cutoff = lastClinicalVisit ? Date.parse(lastClinicalVisit) : 0;
    return (allTimeClinicalEvents || []).filter((e) => Date.parse(e.date) >= cutoff);
  }, [allTimeClinicalEvents, lastClinicalVisit]);

  function directionLabel() {
    if (!stats) return 'Insufficient Data';
    const delta = stats.last.weightKg - stats.first.weightKg;
    if (Math.abs(delta) < 0.1) return 'Stable';
    return delta < 0 ? 'Gradually decreasing' : 'Gradually increasing';
  }

  const workspaceHeader = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[length:var(--wt-title-size)] font-extrabold text-slate-900 tracking-tight">Weight Trend</h1>
          <div className="text-sm text-slate-500 mt-1 font-normal">Longitudinal weight, BMI, goals and relevant clinical events.</div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button onClick={() => setShowAdd(true)} className="px-4 py-2.5 bg-teal-700 text-white rounded-xl shadow-sm text-xs sm:text-sm font-bold hover:bg-teal-800 transition-colors flex items-center gap-1.5">+ Add Measurement</button>
          <button onClick={() => setShowManageGoal(true)} className="px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">Manage Goal</button>
          <button onClick={() => setShowShare(true)} disabled={!stats} title={!stats ? 'A report requires at least one valid measurement.' : undefined} className="px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50">Share Report</button>
          <div className="relative">
            <button onClick={() => setExportOpen((value) => !value)} aria-haspopup="menu" aria-expanded={exportOpen} className="px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">Export</button>
            {exportOpen && (
              <div role="menu" className="absolute right-0 mt-1 w-48 rounded-xl bg-white border border-slate-200 shadow-xl py-1 z-30">
                <button role="menuitem" onClick={() => { setExportOpen(false); setShowViewAll(true); }} className="w-full text-left px-3.5 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 font-medium">CSV Measurements</button>
                <button role="menuitem" onClick={() => { setExportOpen(false); window.print(); }} className="w-full text-left px-3.5 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 font-medium">Print</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <WeightTrendTabs achievementsCompleted={achievementsModel?.summary.completed} achievementsTotal={achievementsModel?.summary.total} />
      <div className="weight-trend-context-bar flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm" aria-label="Weight Trend analysis context">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Analysis period</span>
          <div className="flex max-w-full overflow-x-auto rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Analysis period">
            {['1M', '3M', '6M', '1Y', '2Y', 'All'].map((period) => (
              <button key={period} type="button" onClick={() => updateViewParams({ range: period })} aria-pressed={range === period} className={`min-h-8 whitespace-nowrap rounded-md px-2.5 text-xs font-bold transition-colors ${range === period ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{period}</button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500" htmlFor="weight-display-unit-global">
          Display unit
          <select id="weight-display-unit-global" value={displayUnit} onChange={(event) => updateViewParams({ unit: event.target.value as 'kg' | 'lb' })} className="weight-trend-control h-9 min-h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700">
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </label>
      </div>
    </>
  );


  if (loading || (!measurements && !loadError) || (activeTab === 'log' && allTimeMeasurements === null)) {
    return (
      <div className="weight-trend-workspace" aria-busy="true" aria-live="polite">
        {workspaceHeader}
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

  if (loadError && activeTab !== 'log') {
    return (
      <div className="weight-trend-workspace text-center">
        {workspaceHeader}
        <h2 className="text-xl font-semibold text-slate-900">We couldn&apos;t load weight history.</h2>
        <p className="text-sm text-slate-500 mt-2">Please try again, or return once the connection is restored.</p>
        <button onClick={fetchData} className="mt-5 px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800">Try Again</button>
      </div>
    );
  }

  if (!stats && activeTab === 'overview') {
    return (
      <div className="weight-trend-workspace">
        {workspaceHeader}
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

  if (stats?.items.length === 1 && activeTab === 'overview') {
    const only = stats.items[0];
    return (
      <div className="weight-trend-workspace">
        {workspaceHeader}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-2xl font-semibold">Weight Trend</h2>
          <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/40 p-5 text-center">
            <div className="text-3xl font-black text-slate-900">{formatWeight(Number(only.value), only.unit, displayUnit)}</div>
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

  if (!stats) {
    return (
      <div className="weight-trend-workspace">
        {workspaceHeader}
        {activeTab === 'insights' ? <InsightsView measurements={measurements} range={range} unitOverride={displayUnit} patientId={patientId} goal={goal} patientData={patientData} onRefresh={fetchData} onAddMeasurement={() => setShowAdd(true)} /> : activeTab === 'achievements' ? <AchievementsView model={achievementsModel} onSetGoal={() => setShowManageGoal(true)} /> : <LogView measurements={allTimeMeasurements} displayUnit={displayUnit} analysisRange={range} patientId={patientId} onRefresh={fetchData} />}
        {showAdd && <AddMeasurementDrawer patientId={patientId} existingMeasurements={measurements || []} onClose={() => setShowAdd(false)} onSaved={async () => { await fetchData(); setShowAdd(false); }} />}
        {showManageGoal && <ManageGoalDrawer patientId={patientId} existingGoal={goal} onClose={() => setShowManageGoal(false)} onSaved={async () => { await fetchData(); setShowManageGoal(false); }} />}
        {showViewAll && <ViewAllMeasurementsModal patientId={patientId} measurements={allTimeMeasurements || measurements || []} displayUnit={displayUnit} analysisRange={range} onClose={() => setShowViewAll(false)} onSelectMeasurement={() => setShowViewAll(false)} />}
      </div>
    );
  }

  // Render page with data
  const current = stats.last;

  return (
    <div className="weight-trend-workspace">
      {workspaceHeader}

      {/* Main tab content */}
      {activeTab === 'insights' ? (
        <InsightsView
          measurements={measurements}
          range={range}
          unitOverride={displayUnit}
          patientId={patientId}
          goal={goal}
          patientData={patientData}
          onRefresh={fetchData}
          onAddMeasurement={() => setShowAdd(true)}
        />
      ) : activeTab === 'achievements' ? (
        <AchievementsView model={achievementsModel} onSetGoal={() => setShowManageGoal(true)} />
      ) : activeTab === 'log' ? (
        <LogView measurements={allTimeMeasurements} displayUnit={displayUnit} analysisRange={range} patientId={patientId} onRefresh={fetchData} />
      ) : (
        /* Overview content */
        <div id="weight-panel-overview" role="tabpanel" aria-labelledby="weight-tab-overview" className="weight-trend-view">
          <h2 className="sr-only">Clinical Weight Snapshot</h2>
          {/* Clinical Weight Snapshot — Current Weight is the dominant card */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="weight-trend-surface md:col-span-2 bg-teal-50/70 p-6 border-teal-100">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center ring-1 ring-teal-600/10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 2c1.657 0 3 1.343 3 3 0 3-3 6-3 6s-3-3-3-6c0-1.657 1.343-3 3-3z" fill="#0d9488" />
                    <path d="M5 20c0-3.866 3.582-7 8-7s8 3.134 8 7v1H5v-1z" fill="#0d9488" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Current Weight</div>
                  <div className="text-[38px] leading-none font-black text-slate-900 mt-1.5 tabular-nums">{formatWeight(Number(current.value), current.unit, displayUnit)}</div>
                  <div className="text-sm text-slate-600 mt-2">{formatDateShort(current.occurredAt)} · <span className="capitalize">{(current.source || 'clinic').replace('-', ' ')}</span></div>
                  {(() => {
                    const idx = stats.items.findIndex((x) => x.id === current.id);
                    if (idx > 0) {
                      const prev = stats.items[idx - 1];
                      const d = +(current.weightKg - prev.weightKg).toFixed(2);
                      return (
                        <div className="text-sm text-slate-700 mt-2">
                          Previous: <span className="font-medium">{formatWeight(Number(prev.value), prev.unit, displayUnit)}</span>{' '}
                          <span className="text-slate-500">({d === 0 ? 'no change' : formatSignedWeight(d, displayUnit)})</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>

            <div className="weight-trend-surface bg-sky-50/70 p-5 border-sky-100">
              <div className="text-xs font-semibold text-sky-800 uppercase tracking-wide">Since Baseline</div>
              <div className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">{formatSignedWeight(stats.totalChangeKg, displayUnit)}</div>
              <div className="text-xs text-slate-500 mt-1">{stats.totalChangePct}% · Baseline {formatWeight(Number(stats.first.value), stats.first.unit, displayUnit)} · {formatDateShort(stats.first.occurredAt)}</div>
            </div>

            <div className="weight-trend-surface bg-cyan-50/70 p-5 border-cyan-100">
              <div className="text-xs font-semibold text-cyan-800 uppercase tracking-wide">Since Last Visit</div>
              {previousVisitMeasurement ? (() => {
                const d = +(current.weightKg - previousVisitMeasurement.weightKg).toFixed(2);
                return <div className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">{d === 0 ? 'No change' : formatSignedWeight(d, displayUnit)}</div>;
              })() : <div className="text-xl font-bold text-slate-400 mt-1.5">—</div>}
              <div className="text-xs text-slate-500 mt-1">{lastClinicalVisit ? `Last clinical visit: ${formatDateShort(lastClinicalVisit)}` : 'No qualifying clinical visit'}</div>
              {previousVisitMeasurement?.id === stats.first.id && <div className="text-[11px] text-slate-400 mt-1">No measurement was recorded at that visit; using the first valid record after it.</div>}
            </div>

            <div className="weight-trend-surface bg-violet-50/70 p-5 border-violet-100">
              <div className="text-xs font-semibold text-violet-800 uppercase tracking-wide">BMI</div>
              <div className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">{(() => {
                const heightRaw = patientData.height || '';
                const m = parseFloat(String(heightRaw).replace('cm', '').trim()) / 100;
                if (m && current.weightKg) return (current.weightKg / (m * m)).toFixed(1) + ' kg/m²';
                return '—';
              })()}</div>
              <div className="text-xs text-slate-500 mt-1" title="Uses the latest valid weight and the patient's latest documented height.">Based on latest documented height &amp; weight</div>
            </div>
          </div>

          {/* Main region: chart + right rail */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.4fr)] gap-6">
            <div className="weight-trend-surface bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Weight Trend Over Time</h2>
                  <div className="text-xs text-slate-500">Documented measurements with goals and relevant clinical events.</div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button onClick={() => setShowWhatChanged(true)} className="weight-trend-control ml-1.5 inline-flex items-center px-3 text-xs font-semibold border border-cyan-200 bg-cyan-50 text-cyan-800 rounded-md hover:bg-cyan-100">What Changed?</button>
                  <div className="relative">
                    <button onClick={() => setChartOptionsOpen((v) => !v)} aria-haspopup="menu" aria-expanded={chartOptionsOpen} className="weight-trend-control inline-flex items-center px-3 text-xs font-semibold border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">Chart Options</button>
                    {chartOptionsOpen && (
                      <div role="menu" className="absolute right-0 mt-1 w-56 rounded-lg bg-white border border-slate-200 shadow-lg py-2 px-3 z-30 space-y-1.5">
                        {([
                          ['showGoal', 'Show Goal'],
                          ['showBaseline', 'Show Baseline'],
                          ['showEvents', 'Show Clinical Events'],
                          ['showLabels', 'Show Labels'],
                          ['showSources', 'Show Source'],
                          ['showDataQualityFlags', 'Show Data Quality Flags'],
                          ['connectPoints', 'Connect Points'],
                        ] as const).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={chartOptions[key]}
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
                  displayUnit={displayUnit}
                  clinicalEvents={clinicalEvents}
                  outlierIds={chartOptions.showDataQualityFlags ? outlierIds : undefined}
                  chartOptions={chartOptions}
                  onPointClick={(m) => setSelectedMeasurement(m)}
                  onEventClick={(e) => setSelectedEvent(e)}
                />
                <p className="sr-only" role="note">
                  {stats.periodCount} valid weight measurements are available in the selected period. Values range from {formatWeight(stats.lowest.value, stats.lowest.unit, displayUnit)} to {formatWeight(stats.highest.value, stats.highest.unit, displayUnit)}. The latest measurement is {formatWeight(current.value, current.unit, displayUnit)} on {formatDateShort(current.occurredAt)}.
                </p>
                {eventsFailed && <p className="mt-2 text-xs text-amber-700">Clinical event markers unavailable.</p>}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                <div>Trend: <span className="font-medium text-slate-800">{directionLabel()}</span></div>
                <div>Goal: <span className="font-medium">{goal ? goal.targetWeight != null ? `${formatWeight(Number(goal.targetWeight), 'kg', displayUnit)}${goal.targetDate ? ` by ${formatDateShort(goal.targetDate)}` : ''}` : 'Documented range' : 'No active goal'}</span></div>
                <button onClick={() => setShowViewAll(true)} className="text-teal-700 font-medium hover:underline">View Data Table</button>
              </div>

              {/* Compact statistics row */}
              <div className="mt-6 border-t border-slate-100 pt-4">
                <div className="flex flex-col md:flex-row gap-3 text-sm text-slate-700">
                  <div className="flex-1 p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-500">Starting</div><div className="font-semibold">{formatWeight(Number(stats.first.value), stats.first.unit, displayUnit)}</div><div className="text-xs text-slate-400">{formatDateShort(stats.first.occurredAt)}</div></div>
                  <div className="flex-1 p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-500">Lowest</div><div className="font-semibold">{formatWeight(Number(stats.lowest.value), stats.lowest.unit, displayUnit)}</div><div className="text-xs text-slate-400">{formatDateShort(stats.lowest.occurredAt)}</div></div>
                  <div className="flex-1 p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-500">Highest</div><div className="font-semibold">{formatWeight(Number(stats.highest.value), stats.highest.unit, displayUnit)}</div><div className="text-xs text-slate-400">{formatDateShort(stats.highest.occurredAt)}</div></div>
                  <div className="flex-1 p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-500">Average</div><div className="font-semibold">{formatWeight(Number(stats.average), 'kg', displayUnit)}</div><div className="text-xs text-slate-400">Selected range</div></div>
                  <div className="flex-1 p-3 bg-slate-50 rounded-xl"><div className="text-xs text-slate-500">Measurements</div><div className="font-semibold">{stats.periodCount}</div><div className="text-xs text-slate-400">{stats.items.filter((measurement) => measurement.source === 'clinic').length} clinic</div></div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <button onClick={() => setShowMoreStats((v) => !v)} className="text-xs font-semibold text-teal-700 hover:underline">{showMoreStats ? '− Hide' : '+ More Statistics'}</button>
                  {outlierIds.size > 0 && <span className="text-xs font-medium text-amber-700">{outlierIds.size} measurement{outlierIds.size === 1 ? '' : 's'} flagged for review</span>}
                </div>
                {showMoreStats && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-xl text-sm text-slate-700 flex items-center gap-6">
                    <div><div className="text-xs text-slate-500">Median</div><div className="font-semibold">{formatWeight(Number(stats.median), 'kg', displayUnit)}</div></div>
                  </div>
                )}
              </div>
            </div>

            <aside className="weight-trend-surface bg-white p-6">
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
                {renderSourceDistribution(stats.items)}
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Goal &amp; Plan</h4>
                <div className="mt-2 text-sm text-slate-700">
                  {goal ? (
                    <div className="space-y-1.5">
                      <div className="font-semibold text-slate-900">{goal.targetWeight != null ? `Target: ${formatWeight(Number(goal.targetWeight), 'kg', displayUnit)}` : 'Documented target range'}</div>
                      <div className="text-xs text-slate-500 capitalize">Goal type: {goalProgress.direction === 'reduction' ? 'Weight reduction' : goalProgress.direction === 'gain' ? 'Weight gain' : goalProgress.direction === 'maintenance' ? 'Maintenance' : goalProgress.direction === 'range' ? 'Target range' : 'Direction not documented'}</div>
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
                  {stats.items.slice().reverse().slice(0, 5).map((m) => {
                    const idx = stats.items.findIndex((x) => x.id === m.id);
                    const prev = idx > 0 ? stats.items[idx - 1] : null;
                    const d = prev ? +(m.weightKg - prev.weightKg).toFixed(2) : null;
                    const flagged = outlierIds.has(m.id);
                    return (
                      <div key={m.id} role="button" tabIndex={0} onClick={() => setSelectedMeasurement(m)} onKeyDown={(e) => { if (e.key === 'Enter') setSelectedMeasurement(m); }} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <div>
                          <div className="font-medium text-slate-800 flex items-center gap-1.5">
                            {formatWeight(Number(m.value), m.unit, displayUnit)}
                            {flagged && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">Review</span>}
                          </div>
                          <div className="text-xs text-slate-500 capitalize">{formatDateShort(m.occurredAt)} · {(m.source || 'clinic').replace('-', ' ')}</div>
                        </div>
                        <div className="text-sm text-slate-500">{d == null ? '—' : d === 0 ? 'no change' : formatSignedWeight(d, displayUnit)}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-right"><button onClick={() => setShowViewAll(true)} className="text-sm text-teal-700 font-medium hover:underline">View All Measurements →</button></div>
              </div>
            </aside>
          </div>

        </div>) }

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
          needsReview={outlierIds.has(selectedMeasurement.id)}
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
          displayUnit={displayUnit}
          lastClinicalVisit={lastClinicalVisit}
          measurementsSinceLastVisit={measurementsSinceLastVisit}
          reviewCountSinceLastVisit={reviewCountSinceLastVisit}
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
          displayUnit={displayUnit}
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
          displayUnit={displayUnit}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* View all measurements / data table */}
      {showViewAll && (
        <ViewAllMeasurementsModal
          patientId={patientId}
          measurements={allTimeMeasurements || measurements || []}
          displayUnit={displayUnit}
          analysisRange={range}
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

function renderSourceDistribution(items: WeightTrendMeasurement[]) {
  const counts = items.reduce<Record<string, number>>((acc, item) => { const source = item.source || 'clinic'; acc[source] = (acc[source] || 0) + 1; return acc; }, {});
  const total = items.length || 1;
  const sources = ['clinic','patient-reported','device','imported'];
  const colors: Record<string, string> = { clinic: '#0F766E', 'patient-reported': '#0891B2', device: '#7C3AED', imported: '#64748B' };
  const labels: Record<string, string> = { clinic: 'Clinic', 'patient-reported': 'Patient Reported', device: 'Connected Device', imported: 'Imported' };
  return (
    <div className="mt-2 space-y-2">
      {sources.map((s)=> {
        const count = counts[s] || 0;
        return (
          <div key={s} className="text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[s] }} /> <span className="text-slate-600">{labels[s]}</span></div>
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
