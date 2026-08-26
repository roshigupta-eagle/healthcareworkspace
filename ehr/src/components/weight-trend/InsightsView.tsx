"use client";

import React, { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  computeFluctuation,
  computeRange,
  computeMostActiveDay,
  computeWeekdayAverages,
  computeMonthlyAverages,
  computeTrend,
  weekdayLabel,
} from '@/lib/weightInsights';
import { canonicalMeasurements, detectOutlierIds, formatWeight, inferGoalDirection } from '@/lib/weightMath';
import MeasurementDetailDrawer from './MeasurementDetailDrawer';
import WeekdayMeasurementsDrawer from './WeekdayMeasurementsDrawer';
import ComparePeriodsDrawer from './ComparePeriodsDrawer';
import type { WeightTrendGoal, WeightTrendMeasurement, WeightTrendPatient } from './weightTrendTypes';

function formatDateShort(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }); } catch { return iso as string; }
}
export default function InsightsView({
  measurements,
  range,
  unitOverride,
  patientId,
  goal,
  patientData,
  onRefresh,
  onAddMeasurement,
}: {
  measurements: WeightTrendMeasurement[] | null;
  range: string;
  unitOverride?: 'kg' | 'lb';
  patientId: string;
  goal?: WeightTrendGoal | null;
  patientData?: WeightTrendPatient;
  onRefresh: () => Promise<void> | void;
  onAddMeasurement?: () => void;
}) {
  const pathname = usePathname() || '';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selectedWeekday, setSelectedWeekday] = useState<{ label: string; index: number } | null>(null);
  const [selectedMeasurement, setSelectedMeasurement] = useState<WeightTrendMeasurement | null>(null);

  const filtered = useMemo(() => canonicalMeasurements(measurements || []), [measurements]);

  // Analytics are calculated in the canonical unit so labels stay truthful for mixed-source records.
  const unit = unitOverride || 'kg';
  const measurementCount = filtered.length;

  const fluctuation = useMemo(() => computeFluctuation(filtered), [filtered]);
  const fullRange = useMemo(() => computeRange(filtered), [filtered]);
  const mostActiveDay = useMemo(() => computeMostActiveDay(filtered), [filtered]);
  const weekdayAverages = useMemo(() => computeWeekdayAverages(filtered), [filtered]);
  const monthlyAverages = useMemo(() => computeMonthlyAverages(filtered), [filtered]);
  const trend = useMemo(() => computeTrend(filtered), [filtered]);
  const outlierIds = useMemo(() => detectOutlierIds(filtered), [filtered]);
  const goalDirection = useMemo(() => inferGoalDirection(goal), [goal]);

  const maxWeekdayAvg = Math.max(...weekdayAverages.map((d) => d.average || 0), 0.0001);
  const maxMonthAvg = Math.max(...monthlyAverages.map((m) => m.average || 0), 0.0001);
  const firstFlaggedMeasurement = useMemo(() => filtered.find((m) => outlierIds.has(String(m.id))), [filtered, outlierIds]);

  function goalTypeLabel() {
    switch (goalDirection) {
      case 'reduction': return 'Weight Reduction Goal';
      case 'gain': return 'Weight Gain Goal';
      case 'maintenance': return 'Maintenance Goal';
      case 'range': return 'Target Range Goal';
      default: return 'Documented Goal';
    }
  }

  if (!measurements) {
    // loading skeletons
    return (
      <div id="weight-panel-insights" role="tabpanel" aria-labelledby="weight-tab-insights" className="weight-trend-view">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-72 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-72 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
        <div className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (measurementCount === 0) {
    return (
      <div id="weight-panel-insights" role="tabpanel" aria-labelledby="weight-tab-insights" className="weight-trend-view weight-trend-surface bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-900">No weight insights for this period</h3>
        <p className="text-sm text-slate-600 mt-2">No valid weight measurements are available in the selected date range.</p>
        <div className="mt-4 flex gap-2">
          <Link href={`${pathname}?tab=insights&range=All`} className="px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">View All Time</Link>
          <button
            onClick={() => onAddMeasurement?.()}
            className="px-3.5 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800"
          >
            + Add Measurement
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="weight-panel-insights" role="tabpanel" aria-labelledby="weight-tab-insights" className="weight-trend-view">
      <h2 className="sr-only">Weight Insights</h2>
      {/* Insights Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="weight-trend-surface bg-cyan-50/70 p-5 border-cyan-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-700">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M3 12h3l2-7 4 14 2-7h7" /></svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-800 uppercase tracking-wide">
                Fluctuation
                <button type="button" title="Describes how widely recorded weights vary around the average during the selected period." className="inline-flex h-5 w-5 items-center justify-center rounded-full text-cyan-600 hover:bg-cyan-100 focus-visible:ring-2 focus-visible:ring-cyan-500" aria-label="About fluctuation">i</button>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{fluctuation != null ? formatWeight(fluctuation, 'kg', unit, 2) : 'Not enough data'}</div>
              <div className="text-xs text-slate-500 mt-1">{filtered.length >= 2 ? `Standard deviation across ${filtered.length} measurements` : 'At least 2 measurements needed.'}</div>
            </div>
          </div>
        </div>

        <div className="weight-trend-surface bg-blue-50/70 p-5 border-blue-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" /></svg>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Full Range</div>
              <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{fullRange ? formatWeight(fullRange.difference, 'kg', unit, 2) : 'Not enough data'}</div>
              <div className="text-xs text-slate-500 mt-1">{fullRange ? `${formatWeight(fullRange.lowestKg, 'kg', unit, 2)} → ${formatWeight(fullRange.highestKg, 'kg', unit, 2)} · selected period` : 'Highest minus lowest recorded'}</div>
            </div>
          </div>
        </div>

        <div className="weight-trend-surface bg-violet-50/70 p-5 border-violet-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-violet-800 uppercase tracking-wide">Most Active Day</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{mostActiveDay ? (mostActiveDay.days.length > 1 ? mostActiveDay.days.map((d) => weekdayLabel(d)).join(' & ') : weekdayLabel(mostActiveDay.days[0])) : '—'}</div>
              <div className="text-xs text-slate-500 mt-1">{mostActiveDay ? `${mostActiveDay.count} measurements · most commonly recorded day` : 'No measurements yet'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Data quality */}
      {firstFlaggedMeasurement && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <svg className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <div className="flex-1">
            <div className="font-semibold text-amber-900 text-sm">Measurement worth reviewing</div>
            <p className="text-xs text-amber-800 mt-0.5">One recorded measurement differs substantially from surrounding measurements.</p>
          </div>
          <button onClick={() => setSelectedMeasurement(firstFlaggedMeasurement)} className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-amber-900 hover:bg-amber-100 flex-shrink-0">Review Measurement</button>
        </div>
      )}

      {/* Analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="weight-trend-surface bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[15px] font-semibold text-slate-900">Average by Day of Week</div>
              <div className="text-xs text-slate-400">Average recorded weight by weekday</div>
            </div>
            <div className="text-xs text-slate-500">Unit: {unit}</div>
          </div>

          <div className="mt-4 space-y-2.5">
            {weekdayAverages.map((d) => (
              <button
                key={d.weekday}
                type="button"
                disabled={d.count === 0}
                onClick={() => setSelectedWeekday({ label: d.weekday, index: d.weekdayIndex })}
                title={d.count ? `${d.weekday}\nAverage: ${formatWeight(d.average!, 'kg', unit, 2)}\nMeasurements: ${d.count}\nSelected period: ${range}` : `No measurements on ${d.weekday}`}
                className="weight-trend-control w-full flex items-center gap-3 group disabled:cursor-default"
              >
                <div className="w-10 text-xs font-medium text-slate-600 text-left">{d.weekday}</div>
                <div className="flex-1 bg-slate-50 rounded-full h-6 flex items-center overflow-hidden">
                  {d.average != null && (
                    <div className="bg-teal-500 group-hover:bg-teal-600 h-4 rounded-full ml-1 transition-colors" style={{ width: `${Math.max(4, (d.average / maxWeekdayAvg) * 100)}%` }} aria-hidden />
                  )}
                </div>
                <div className="w-24 text-right text-xs font-semibold text-slate-700 tabular-nums">{d.average != null ? formatWeight(d.average, 'kg', unit, 2) : '—'}</div>
              </button>
            ))}
          </div>

          <div className="mt-3 text-xs text-slate-500">
            {mostActiveDay ? `Most measurements on ${mostActiveDay.days.length > 1 ? mostActiveDay.days.map((d) => weekdayLabel(d)).join(', ') : weekdayLabel(mostActiveDay.days[0])} (${mostActiveDay.count})` : 'No weekday averages available'}
          </div>
        </div>

        <div className="weight-trend-surface bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[15px] font-semibold text-slate-900">Monthly Averages</div>
              <div className="text-xs text-slate-400">Average weight by calendar month</div>
            </div>
            <div className="text-xs text-slate-500">Unit: {unit}</div>
          </div>

          {monthlyAverages.length === 0 && (
            <div className="mt-8 text-sm text-slate-500 text-center">Not enough monthly data</div>
          )}

          {monthlyAverages.length === 1 && (
            <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/40 p-5 text-center">
              <div className="w-9 h-9 mx-auto rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
              </div>
              <div className="text-xs font-semibold text-teal-800 uppercase tracking-wide">{monthlyAverages[0].month}</div>
              <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{formatWeight(monthlyAverages[0].average, 'kg', unit, 2)}</div>
              <div className="text-xs text-slate-500 mt-1">Average Weight · Based on {monthlyAverages[0].count} measurements</div>
              <p className="text-xs text-slate-400 mt-3 italic">More months are needed for a longitudinal monthly comparison.</p>
            </div>
          )}

          {monthlyAverages.length >= 2 && (
            <div className="mt-4 space-y-2.5">
              {monthlyAverages.map((m, idx) => {
                const prevMonth = idx > 0 ? monthlyAverages[idx - 1] : null;
                const change = prevMonth ? +(m.average - prevMonth.average).toFixed(2) : null;
                return (
                  <div
                    key={m.monthKey}
                    title={`${m.month}\nAverage: ${formatWeight(m.average, 'kg', unit, 2)}\nMeasurements: ${m.count}${change != null ? `\nChange from ${prevMonth!.month}: ${formatWeight(change, 'kg', unit, 2)}` : ''}`}
                    className="flex items-center gap-3"
                  >
                    <div className="w-20 text-xs font-medium text-slate-600">{m.month}</div>
                    <div className="flex-1 bg-slate-50 rounded-full h-6 flex items-center overflow-hidden">
                      <div className="bg-teal-500 h-4 rounded-full ml-1" style={{ width: `${Math.max(4, (m.average / maxMonthAvg) * 100)}%` }} aria-hidden />
                    </div>
                    <div className="w-24 text-right text-xs font-semibold text-slate-700 tabular-nums">{formatWeight(m.average, 'kg', unit, 2)}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button onClick={() => setCompareOpen(true)} className="weight-trend-control inline-flex items-center px-3 text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-800 rounded-lg hover:bg-blue-100">Compare Periods</button>
          </div>
        </div>
      </div>

      {/* Clinical Insights */}
      <div className="weight-trend-surface bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-slate-900">Clinical Insights</div>
            <div className="text-xs text-slate-500">Based on {measurementCount} measurements in the selected period</div>
          </div>
          <button onClick={() => setDrawerOpen(true)} className="text-sm font-medium text-teal-700 hover:underline">View All Insights →</button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-100">
            <div className="text-xs font-semibold text-teal-800 uppercase tracking-wide">Trend Direction</div>
            <div className="font-bold text-slate-900 mt-1">
              {trend.direction === 'insufficient-data' ? 'Insufficient Data' : trend.direction === 'increasing' ? 'Increasing' : trend.direction === 'decreasing' ? 'Decreasing' : 'Stable'}
            </div>
            {trend.weeklyRate != null && <div className="text-xs text-slate-500 mt-0.5">{formatWeight(trend.weeklyRate, 'kg', unit, 2)}/week · selected period</div>}
          </div>
          <div className="p-4 bg-violet-50/60 rounded-xl border border-violet-100">
            <div className="text-xs font-semibold text-violet-800 uppercase tracking-wide">Measurement Pattern</div>
            <div className="font-bold text-slate-900 mt-1">{mostActiveDay ? weekdayLabel(mostActiveDay.days[0]) : '—'}</div>
            {mostActiveDay && <div className="text-xs text-slate-500 mt-0.5">{mostActiveDay.count} of {measurementCount} measurements · most commonly recorded day</div>}
          </div>
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Goal Context</div>
            {goal ? (
              <>
                <div className="font-bold text-slate-900 mt-1">{goalTypeLabel()}</div>
                <div className="text-xs text-slate-500 mt-0.5">Target: {goal.targetWeight != null ? formatWeight(Number(goal.targetWeight), 'kg', unit) : 'Documented target range'}{goal.targetDate ? ` · ${formatDateShort(goal.targetDate)}` : ''}</div>
              </>
            ) : (
              <>
                <div className="font-bold text-slate-900 mt-1">No active weight goal</div>
                <div className="text-xs text-slate-500 mt-0.5">No target or maintenance range documented.</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* All Insights drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setDrawerOpen(false)} />
          <div className="weight-trend-drawer ml-auto h-full bg-white p-6 overflow-auto shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-900">All Weight Insights</h4>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div><div className="text-xs text-slate-500">Trend</div><div className="font-medium">{trend.direction === 'insufficient-data' ? 'Insufficient Data' : trend.direction}{trend.weeklyRate != null ? ` · ${formatWeight(trend.weeklyRate, 'kg', unit, 2)}/week` : ''}</div></div>
              <div><div className="text-xs text-slate-500">Average</div><div className="font-medium">{filtered.length ? formatWeight(filtered.reduce((sum, measurement) => sum + measurement.weightKg, 0) / filtered.length, 'kg', unit, 2) : '—'}</div></div>
              <div><div className="text-xs text-slate-500">Fluctuation</div><div className="font-medium">{fluctuation != null ? formatWeight(fluctuation, 'kg', unit, 2) : 'Not enough data'}</div></div>
              <div><div className="text-xs text-slate-500">Full Range</div><div className="font-medium">{fullRange ? `${formatWeight(fullRange.lowestKg, 'kg', unit, 2)} → ${formatWeight(fullRange.highestKg, 'kg', unit, 2)}` : 'Not enough data'}</div></div>
              <div><div className="text-xs text-slate-500">Measurements</div><div className="font-medium">{measurementCount}</div></div>
              <div><div className="text-xs text-slate-500">Weekday Pattern</div><div className="font-medium">{mostActiveDay ? `${weekdayLabel(mostActiveDay.days[0])} (${mostActiveDay.count})` : '—'}</div></div>
              <div><div className="text-xs text-slate-500">Monthly Pattern</div><div className="font-medium">{monthlyAverages.length ? `${monthlyAverages.length} month(s) documented` : 'Not enough monthly data'}</div></div>
              <div><div className="text-xs text-slate-500">Goal Context</div><div className="font-medium">{goal ? `${goalTypeLabel()} · ${goal.targetWeight != null ? `Target ${formatWeight(Number(goal.targetWeight), 'kg', unit)}` : 'Documented range'}` : 'No active weight goal'}</div></div>
              {patientData?.lastVisit && (
                <div><div className="text-xs text-slate-500">Since Last Visit</div><div className="font-medium">Last visit {formatDateShort(patientData.lastVisit)}</div></div>
              )}
              {firstFlaggedMeasurement && (
                <div><div className="text-xs text-slate-500">Data Quality</div><div className="font-medium text-amber-700">1 measurement flagged for review</div></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weekday drill-down */}
      {selectedWeekday && (
        <WeekdayMeasurementsDrawer
          weekday={selectedWeekday.label}
          unit={unit}
          measurements={filtered.filter((m) => new Date(m.occurredAt).getDay() === selectedWeekday.index)}
          onClose={() => setSelectedWeekday(null)}
          onSelectMeasurement={(m) => { setSelectedWeekday(null); setSelectedMeasurement(m); }}
        />
      )}

      {/* Compare periods */}
      {compareOpen && (
        <ComparePeriodsDrawer patientId={patientId} goal={goal} displayUnit={unit} onClose={() => setCompareOpen(false)} />
      )}

      {/* Measurement detail (correction / entered-in-error) */}
      {selectedMeasurement && (
        <MeasurementDetailDrawer
          patientId={patientId}
          measurement={selectedMeasurement}
          needsReview={outlierIds.has(String(selectedMeasurement.id))}
          onClose={() => setSelectedMeasurement(null)}
          onUpdated={async () => { await onRefresh(); setSelectedMeasurement(null); }}
        />
      )}
    </div>
  );
}
