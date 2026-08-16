'use client';

import { useMemo, useState } from 'react';
import { OverviewCard, FooterLink } from './OverviewCard';
import { ActivityIcon } from './icons';
import LineChart from '@/components/LineChart';

type VitalPoint = { date: string; value: number; unit: string };
type MetricKey = 'weight' | 'bmi' | 'bloodPressure' | 'heartRate' | 'oxygenSaturation' | 'temperature';

const METRIC_LABELS: Record<MetricKey, string> = {
  weight: 'Weight',
  bmi: 'BMI',
  bloodPressure: 'Blood Pressure',
  heartRate: 'Heart Rate',
  oxygenSaturation: 'Oxygen Saturation',
  temperature: 'Temperature',
};

const RANGE_OPTIONS: { key: string; label: string; days: number }[] = [
  { key: '30d', label: '30 days', days: 30 },
  { key: '3m', label: '3 months', days: 90 },
  { key: '6m', label: '6 months', days: 182 },
  { key: '1y', label: '1 year', days: 365 },
  { key: 'all', label: 'All data', days: Infinity },
];

export function VitalsTrendCard({ patient }: { patient: any }) {
  const vitals = patient.vitals || {};
  const availableMetrics = (Object.keys(METRIC_LABELS) as MetricKey[]).filter((k) => (vitals[k] || []).length > 0);
  const [metric, setMetric] = useState<MetricKey>(availableMetrics.includes('weight') ? 'weight' : availableMetrics[0] || 'weight');
  const [range, setRange] = useState(RANGE_OPTIONS[2].key);

  const points: VitalPoint[] = vitals[metric] || [];
  const rangeDef = RANGE_OPTIONS.find((r) => r.key === range) || RANGE_OPTIONS[2];

  const filtered = useMemo(() => {
    if (!points.length) return [];
    if (rangeDef.days === Infinity) return points;
    const cutoff = Date.now() - rangeDef.days * 24 * 60 * 60 * 1000;
    return points.filter((p) => new Date(p.date).getTime() >= cutoff);
  }, [points, rangeDef]);

  const values = filtered.map((p) => p.value);
  const latest = filtered[filtered.length - 1];
  const first = filtered[0];
  const delta = latest && first ? latest.value - first.value : 0;
  const trendDirection = delta === 0 ? '→' : delta < 0 ? '↓' : '↑';

  const summaryText =
    latest && first
      ? `${METRIC_LABELS[metric]} ${
          delta === 0 ? 'stayed steady at' : delta < 0 ? 'decreased from' : 'increased from'
        } ${first.value} ${first.unit}${delta === 0 ? '' : ` to ${latest.value} ${latest.unit}`} during the selected ${rangeDef.label} period.`
      : 'Not enough measurements are available for the selected period.';

  return (
    <OverviewCard
      id="vitals-trend"
      title="Vitals Trend"
      icon={<ActivityIcon className="w-5 h-5" />}
      footer={<FooterLink href={`/dashboard/records/${patient.id}/weight-trend`} label="View Full Trends" />}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="sr-only" htmlFor="vitals-metric">Select vitals metric</label>
        <select
          id="vitals-metric"
          value={metric}
          onChange={(e) => setMetric(e.target.value as MetricKey)}
          className="text-xs font-medium border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          {(Object.keys(METRIC_LABELS) as MetricKey[]).map((k) => (
            <option key={k} value={k} disabled={!(vitals[k] || []).length}>
              {METRIC_LABELS[k]}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="vitals-range">Select time range</label>
        <select
          id="vitals-range"
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="text-xs font-medium border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          {RANGE_OPTIONS.map((r) => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>
      </div>

      {latest ? (
        <>
          <div className="text-2xl font-bold text-gray-900">
            {latest.value} <span className="text-sm font-medium text-gray-500">{latest.unit}</span>
          </div>
          <div className={`text-sm font-medium mt-0.5 ${delta < 0 ? 'text-teal-700' : delta > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
            {trendDirection} {Math.abs(delta).toFixed(1)} {latest.unit} over {rangeDef.label}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Last measured {new Date(latest.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </div>

          <div className="mt-3">
            <LineChart data={values} width={300} height={64} color="#0d9488" showArea className="w-full h-16" />
          </div>
          <p className="mt-2 text-xs text-gray-500">{summaryText}</p>
        </>
      ) : (
        <p role="status" className="text-sm text-gray-500 py-2">
          No vitals measurements are available for this metric.
        </p>
      )}
    </OverviewCard>
  );
}
