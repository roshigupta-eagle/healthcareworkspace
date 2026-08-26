/**
 * Pure analytics helpers for Weight Trend → Insights. Framework-free and
 * testable. All math is unit-normalized to kilograms via weightMath.toKg
 * before aggregation so mixed kg/lb records never corrupt an average.
 *
 * These are descriptive statistics only — they never render a clinical
 * judgment ("improving"/"healthy"/etc). That interpretation layer belongs to
 * the UI, and only when a documented goal explicitly supports it.
 */
import { isIncludedInAnalytics, toKg } from './weightMath';

export interface InsightMeasurement {
  id: string;
  value: number;
  unit?: string;
  occurredAt: string;
  source?: string;
  enteredInError?: boolean;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function weekdayLabel(i: number): string {
  return WEEKDAY_LABELS[i] || '—';
}

function usable(items: InsightMeasurement[]): InsightMeasurement[] {
  return (items || []).filter(isIncludedInAnalytics);
}

function kgValues(items: InsightMeasurement[]): number[] {
  return items.map((m) => toKg(m.value, m.unit));
}

function stdDev(values: number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / values.length;
  return Math.sqrt(variance);
}

export function computeFluctuation(items: InsightMeasurement[]): number | null {
  const u = usable(items);
  if (u.length < 2) return null;
  return +stdDev(kgValues(u)).toFixed(2);
}

export interface RangeResult {
  lowestKg: number;
  highestKg: number;
  lowest: InsightMeasurement;
  highest: InsightMeasurement;
  difference: number;
}

export function computeRange(items: InsightMeasurement[]): RangeResult | null {
  const u = usable(items);
  if (u.length === 0) return null;
  let lowest = u[0];
  let highest = u[0];
  let lowestKg = toKg(u[0].value, u[0].unit);
  let highestKg = lowestKg;
  for (const m of u) {
    const kg = toKg(m.value, m.unit);
    if (kg < lowestKg) { lowestKg = kg; lowest = m; }
    if (kg > highestKg) { highestKg = kg; highest = m; }
  }
  return { lowestKg, highestKg, lowest, highest, difference: +(highestKg - lowestKg).toFixed(2) };
}

export interface MostActiveDayResult {
  days: number[];
  count: number;
}

export function computeMostActiveDay(items: InsightMeasurement[]): MostActiveDayResult | null {
  const u = usable(items);
  if (u.length === 0) return null;
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  u.forEach((m) => {
    try { counts[new Date(m.occurredAt).getDay()] += 1; } catch { /* ignore */ }
  });
  const max = Math.max(...Object.values(counts));
  if (max === 0) return null;
  const days = Object.entries(counts).filter(([, c]) => c === max).map(([k]) => Number(k));
  return { days, count: max };
}

export interface WeekdayAverage {
  weekday: string;
  weekdayIndex: number;
  average: number | null;
  count: number;
}

export function computeWeekdayAverages(items: InsightMeasurement[]): WeekdayAverage[] {
  const u = usable(items);
  const buckets: Record<number, { sum: number; count: number }> = { 0: { sum: 0, count: 0 }, 1: { sum: 0, count: 0 }, 2: { sum: 0, count: 0 }, 3: { sum: 0, count: 0 }, 4: { sum: 0, count: 0 }, 5: { sum: 0, count: 0 }, 6: { sum: 0, count: 0 } };
  u.forEach((m) => {
    try {
      const d = new Date(m.occurredAt).getDay();
      buckets[d].sum += toKg(m.value, m.unit);
      buckets[d].count += 1;
    } catch { /* ignore */ }
  });
  return [0, 1, 2, 3, 4, 5, 6].map((i) => ({
    weekday: weekdayLabel(i),
    weekdayIndex: i,
    average: buckets[i].count ? +(buckets[i].sum / buckets[i].count).toFixed(2) : null,
    count: buckets[i].count,
  }));
}

export interface MonthlyAverage {
  monthKey: string;
  month: string;
  monthDate: Date;
  average: number;
  count: number;
}

export function computeMonthlyAverages(items: InsightMeasurement[]): MonthlyAverage[] {
  const u = usable(items);
  const buckets: Record<string, { sum: number; count: number; monthDate: Date }> = {};
  u.forEach((m) => {
    try {
      const d = new Date(m.occurredAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets[key]) buckets[key] = { sum: 0, count: 0, monthDate: new Date(d.getFullYear(), d.getMonth(), 1) };
      buckets[key].sum += toKg(m.value, m.unit);
      buckets[key].count += 1;
    } catch { /* ignore */ }
  });
  return Object.entries(buckets)
    .sort((a, b) => a[1].monthDate.getTime() - b[1].monthDate.getTime())
    .map(([key, b]) => ({
      monthKey: key,
      month: b.monthDate.toLocaleString(undefined, { month: 'short', year: 'numeric' }),
      monthDate: b.monthDate,
      average: +(b.sum / b.count).toFixed(2),
      count: b.count,
    }));
}

export type TrendDirection = 'increasing' | 'decreasing' | 'stable' | 'variable' | 'insufficient-data';

export interface TrendResult {
  direction: TrendDirection;
  weeklyRate: number | null;
}

export function computeTrend(items: InsightMeasurement[]): TrendResult {
  const u = usable(items).slice().sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
  if (u.length < 2) return { direction: 'insufficient-data', weeklyRate: null };
  const first = u[0];
  const last = u[u.length - 1];
  const days = (Date.parse(last.occurredAt) - Date.parse(first.occurredAt)) / (1000 * 60 * 60 * 24) || 1;
  const weeklyRate = +(((toKg(last.value, last.unit) - toKg(first.value, first.unit)) / days) * 7).toFixed(2);
  const direction: TrendDirection = Math.abs(weeklyRate) < 0.05 ? 'stable' : weeklyRate > 0 ? 'increasing' : 'decreasing';
  return { direction, weeklyRate };
}

export interface PeriodSummary {
  average: number | null;
  count: number;
  fluctuation: number | null;
  range: RangeResult | null;
  weekdaysWithData: number;
}

export function summarizePeriod(items: InsightMeasurement[]): PeriodSummary {
  const u = usable(items);
  const kg = kgValues(u);
  const average = kg.length ? +(kg.reduce((a, b) => a + b, 0) / kg.length).toFixed(2) : null;
  const weekdays = computeWeekdayAverages(u);
  return {
    average,
    count: u.length,
    fluctuation: computeFluctuation(u),
    range: computeRange(u),
    weekdaysWithData: weekdays.filter((w) => w.count > 0).length,
  };
}

export interface PeriodComparison {
  current: PeriodSummary;
  previous: PeriodSummary;
}

/** Compares two already-sliced periods. Never labels the delta good/bad — that is a UI-layer decision gated by documented goal context. */
export function computeComparison(currentItems: InsightMeasurement[], previousItems: InsightMeasurement[]): PeriodComparison {
  return { current: summarizePeriod(currentItems), previous: summarizePeriod(previousItems) };
}

/** Splits a full measurement history into "current window" and "immediately preceding window of equal length" relative to `now`. */
export function splitComparisonWindows(items: InsightMeasurement[], days: number, now: Date = new Date()): { currentItems: InsightMeasurement[]; previousItems: InsightMeasurement[] } {
  const msPerDay = 24 * 60 * 60 * 1000;
  const currentStart = now.getTime() - days * msPerDay;
  const previousStart = currentStart - days * msPerDay;
  const currentItems = items.filter((m) => { const t = Date.parse(m.occurredAt); return t >= currentStart && t <= now.getTime(); });
  const previousItems = items.filter((m) => { const t = Date.parse(m.occurredAt); return t >= previousStart && t < currentStart; });
  return { currentItems, previousItems };
}
