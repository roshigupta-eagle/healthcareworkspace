/**
 * Pure helpers for the Weight Trend page. Kept framework-free and testable.
 *
 * These are statistical/data-normalization utilities only — NOT clinical
 * diagnostic thresholds. Outlier flags are relative to the patient's own
 * recent measurements, not an absolute "healthy weight" rule.
 */

export type WeightUnit = 'kg' | 'lb' | string;

const LB_PER_KG = 2.2046226218;

/** Normalizes any recorded weight to kilograms for consistent math/charting. Never mutates the original record. */
export function toKg(value: number, unit?: WeightUnit): number {
  if (!Number.isFinite(value)) return value;
  const u = (unit || 'kg').toLowerCase();
  if (u === 'lb' || u === 'lbs' || u === 'pound' || u === 'pounds') return value / LB_PER_KG;
  if (u === 'kg' || u === 'kgs' || u === 'kilogram' || u === 'kilograms') return value;
  return NaN;
}

export function fromKg(valueKg: number, unit: 'kg' | 'lb' = 'kg'): number {
  if (!Number.isFinite(valueKg)) return NaN;
  return unit === 'lb' ? valueKg * LB_PER_KG : valueKg;
}

export function convertWeight(value: number, fromUnit: WeightUnit | undefined, toUnit: 'kg' | 'lb' = 'kg'): number {
  return fromKg(toKg(value, fromUnit), toUnit);
}

export function formatWeight(value: number, fromUnit: WeightUnit | undefined, displayUnit: 'kg' | 'lb' = 'kg', decimals = 1): string {
  const converted = convertWeight(value, fromUnit, displayUnit);
  return Number.isFinite(converted) ? `${Number(converted.toFixed(decimals))} ${displayUnit}` : 'Unit unavailable';
}

export function formatSignedWeight(valueKg: number, displayUnit: 'kg' | 'lb' = 'kg', decimals = 1): string {
  const converted = fromKg(valueKg, displayUnit);
  if (!Number.isFinite(converted)) return 'Unit unavailable';
  const rounded = Number(converted.toFixed(decimals));
  return `${rounded > 0 ? '+' : ''}${rounded} ${displayUnit}`;
}

export interface GoalLike {
  goalType?: 'weight-reduction' | 'weight-gain' | 'maintain' | 'target-range' | 'target-weight' | 'percentage-loss' | string;
  targetWeight?: number;
  targetWeightMin?: number;
  targetWeightMax?: number;
  baselineWeight?: number;
  status?: string;
  targetDate?: string;
  owner?: string;
}

export type GoalDirection = 'reduction' | 'gain' | 'maintenance' | 'range' | 'unknown';

/**
 * Infers the documented goal's direction from its explicit type, falling back to the
 * baseline/target relationship when no type was recorded. Never assumes "lower is better".
 */
export function inferGoalDirection(goal: GoalLike | null | undefined): GoalDirection {
  if (!goal) return 'unknown';
  const type = (goal.goalType || '').toLowerCase();
  if (type === 'maintain' || type === 'maintenance') return 'maintenance';
  if (type === 'target-range' && (goal.targetWeightMin != null || goal.targetWeightMax != null)) return 'range';
  if (type === 'weight-reduction' || type === 'percentage-loss') return 'reduction';
  if (type === 'weight-gain') return 'gain';
  // A numeric target without an explicit goal type is intentionally neutral.
  // The record does not establish whether loss, gain, or maintenance is desired.
  return 'unknown';
}

export interface GoalProgress {
  direction: GoalDirection;
  /** 0-100, clamped. Null when progress cannot be meaningfully computed (e.g. maintenance). */
  percent: number | null;
  /** Human-readable, direction-aware summary. Never implies clinical success/failure. */
  label: string;
}

export interface GoalValidation {
  valid: boolean;
  errors: string[];
}

export function validateGoal(goal: GoalLike, now = new Date()): GoalValidation {
  const errors: string[] = [];
  const type = (goal.goalType || '').toLowerCase();
  const supportedTypes = ['weight-reduction', 'weight-gain', 'maintain', 'target-range', 'target-weight', 'percentage-loss', 'other'];
  if (!supportedTypes.includes(type)) errors.push('A supported goal type is required.');
  const numericFields: Array<[string, number | undefined]> = [['baseline weight', goal.baselineWeight], ['target weight', goal.targetWeight], ['minimum target weight', goal.targetWeightMin], ['maximum target weight', goal.targetWeightMax]];
  for (const [label, value] of numericFields) if (value != null && (!Number.isFinite(value) || value <= 0 || value > 500)) errors.push(`${label} must be between 0 and 500 kg.`);
  if (type === 'target-range' && (goal.targetWeightMin == null || goal.targetWeightMax == null)) errors.push('Both bounds are required for a target range.');
  if (goal.targetWeightMin != null && goal.targetWeightMax != null && goal.targetWeightMin > goal.targetWeightMax) errors.push('The minimum target must not exceed the maximum target.');
  if (['weight-reduction', 'weight-gain', 'target-weight'].includes(type) && goal.targetWeight == null) errors.push('A target weight is required for this goal type.');
  if (['weight-reduction', 'weight-gain', 'percentage-loss'].includes(type) && goal.baselineWeight == null) errors.push('A baseline weight is required for this goal type.');
  if (type === 'maintain' && goal.baselineWeight == null) errors.push('A baseline weight is required for a maintenance goal.');
  if (goal.targetDate) {
    const targetDate = new Date(goal.targetDate);
    if (Number.isNaN(targetDate.getTime())) errors.push('The target date is invalid.');
    else if (targetDate.getTime() < now.getTime()) errors.push('The target date must not be in the past.');
  }
  return { valid: errors.length === 0, errors };
}

/** Computes goal progress respecting the documented goal type — never a single universal formula. */
export function computeGoalProgress(goal: GoalLike | null | undefined, currentWeightKg: number | null | undefined): GoalProgress {
  const direction = inferGoalDirection(goal);
  if (!goal || currentWeightKg == null || !Number.isFinite(currentWeightKg)) {
    return { direction, percent: null, label: 'Insufficient data to compute progress' };
  }

  if (direction === 'range' && (goal.targetWeightMin != null || goal.targetWeightMax != null)) {
    const min = goal.targetWeightMin ?? goal.targetWeightMax!;
    const max = goal.targetWeightMax ?? goal.targetWeightMin!;
    const inRange = currentWeightKg >= Math.min(min, max) && currentWeightKg <= Math.max(min, max);
    return { direction, percent: inRange ? 100 : null, label: inRange ? 'Within documented target range' : 'Outside documented target range' };
  }

  if (direction === 'maintenance' && goal.baselineWeight != null) {
    const tolerance = Math.max(1, Math.abs(goal.baselineWeight) * 0.03);
    const withinTolerance = Math.abs(currentWeightKg - goal.baselineWeight) <= tolerance;
    return { direction, percent: null, label: withinTolerance ? 'Maintaining documented weight' : 'Outside documented maintenance tolerance' };
  }

  if ((direction === 'reduction' || direction === 'gain') && goal.baselineWeight != null && goal.targetWeight != null) {
    const totalDistance = goal.targetWeight - goal.baselineWeight; // negative for reduction, positive for gain
    if (Math.abs(totalDistance) < 0.01) return { direction, percent: null, label: 'Baseline and target are equal' };
    const traveled = currentWeightKg - goal.baselineWeight;
    const percent = Math.max(0, Math.min(100, Math.round((traveled / totalDistance) * 100)));
    return { direction, percent, label: `${percent}% of the way to the documented target` };
  }

  return { direction, percent: null, label: 'Insufficient data to compute progress' };
}

export interface MeasurementLike {
  id: string;
  value: number;
  unit?: string;
  occurredAt: string;
  status?: string;
  enteredInError?: boolean;
  replacedByMeasurementId?: string;
}

export function isValidWeightMeasurement(measurement: MeasurementLike): boolean {
  return !measurement.enteredInError
    && measurement.status?.toLowerCase() !== 'entered-in-error'
    && Number.isFinite(measurement.value)
    && Number.isFinite(toKg(measurement.value, measurement.unit))
    && Number.isFinite(Date.parse(measurement.occurredAt));
}

export function isIncludedInAnalytics(measurement: MeasurementLike): boolean {
  const status = measurement.status?.toLowerCase();
  return isValidWeightMeasurement(measurement) && !measurement.replacedByMeasurementId && (!status || status === 'final' || status === 'corrected');
}

export function canonicalMeasurements<T extends MeasurementLike>(measurements: T[]): Array<T & { weightKg: number }> {
  return (measurements || [])
    .filter(isIncludedInAnalytics)
    .map((measurement) => ({ ...measurement, weightKg: toKg(measurement.value, measurement.unit) }))
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
}

export interface WeightSummary<T extends MeasurementLike> {
  items: Array<T & { weightKg: number }>;
  first: (T & { weightKg: number }) | null;
  last: (T & { weightKg: number }) | null;
  totalChangeKg: number;
  totalChangePct: number;
  average: number | null;
  lowest: (T & { weightKg: number }) | null;
  highest: (T & { weightKg: number }) | null;
  median: number | null;
}

export function summarizeWeightMeasurements<T extends MeasurementLike>(measurements: T[]): WeightSummary<T> {
  const items = canonicalMeasurements(measurements);
  const first = items[0] || null;
  const last = items[items.length - 1] || null;
  const values = items.map((item) => item.weightKg);
  const sortedValues = values.slice().sort((a, b) => a - b);
  const median = sortedValues.length ? Number((sortedValues.length % 2 ? sortedValues[Math.floor(sortedValues.length / 2)] : (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2).toFixed(2)) : null;
  const lowest = items.reduce<(T & { weightKg: number }) | null>((current, item) => !current || item.weightKg < current.weightKg ? item : current, null);
  const highest = items.reduce<(T & { weightKg: number }) | null>((current, item) => !current || item.weightKg > current.weightKg ? item : current, null);
  const totalChangeKg = first && last ? Number((last.weightKg - first.weightKg).toFixed(2)) : 0;
  return {
    items,
    first,
    last,
    totalChangeKg,
    totalChangePct: first && first.weightKg ? Number(((totalChangeKg / first.weightKg) * 100).toFixed(2)) : 0,
    average: values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null,
    lowest,
    highest,
    median,
  };
}

/**
 * Flags measurements that deviate sharply from their chronological neighbors. This is a
 * statistical data-quality signal ONLY — not a clinical threshold — and must never cause
 * a measurement to be hidden or removed.
 */
export function detectOutlierIds(measurements: MeasurementLike[]): Set<string> {
  const sorted = canonicalMeasurements(measurements);
  const kgValues = sorted.map((m) => toKg(m.value, m.unit));
  const flagged = new Set<string>();
  if (kgValues.length < 3) return flagged;

  const median = [...kgValues].sort((a, b) => a - b)[Math.floor(kgValues.length / 2)];
  sorted.forEach((m, i) => {
    const v = kgValues[i];
    const neighborValues = [kgValues[i - 1], kgValues[i + 1]].filter((n): n is number => n != null);
    const referenceValues = neighborValues.length > 0 ? neighborValues : [median];
    const avgNeighbor = referenceValues.reduce((s, n) => s + n, 0) / referenceValues.length;
    const deviation = Math.abs(v - avgNeighbor);
    const threshold = Math.max(8, avgNeighbor * 0.2);
    if (deviation > threshold) flagged.add(m.id);
  });
  return flagged;
}
