"use client";

import React, { useMemo, useState } from 'react';
import type { TrendSeries, TrendDateRange, TrendObservationPoint } from '@/types/trends';
import { mapTrendsToFHIR } from '@/lib/fhir/mappers';

type MinimalLab = { id: string; name: string; date: string; result: string; unit?: string };
type MinimalPatient = { id: string; name?: string; labResults?: MinimalLab[]; weight?: string };

type Props = {
  patient: MinimalPatient;
  initialSeries?: TrendSeries[];
};

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const PRESET_RANGES: { id: string; label: string; spanDays?: number }[] = [
  { id: '30d', label: '30 days', spanDays: 30 },
  { id: '3m', label: '3 months', spanDays: 90 },
  { id: '6m', label: '6 months', spanDays: 180 },
  { id: '1y', label: '1 year', spanDays: 365 },
  { id: 'all', label: 'All' },
];

export default function HealthTrendAppClient({ patient, initialSeries = [] }: Props) {
  const [series, setSeries] = useState<TrendSeries[]>(() => (initialSeries && initialSeries.length ? initialSeries : synthesizeSeries(patient)));
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [range, setRange] = useState<TrendDateRange>({ preset: '1y' });
  const [selectedPoint, setSelectedPoint] = useState<TrendObservationPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFhir, setShowFhir] = useState(false);


  const visibleIds = useMemo(() => {
    if (Object.keys(toggles).length) return toggles;
    const v: Record<string, boolean> = {};
    series.forEach((s) => { v[s.metric.id] = true; });
    return v;
  }, [series, toggles]);

  const filteredSeries = useMemo(() => {
    if (!range || range.preset === 'all') return series;
    const end = range.end ? new Date(range.end) : new Date();
    const start = range.start ? new Date(range.start) : new Date(+end - (range.preset === '1y' ? 365 : 90) * 24 * 3600 * 1000);
    return series.map((s) => ({ ...s, points: s.points.filter((p) => new Date(p.timestamp) >= start && new Date(p.timestamp) <= end) }));
  }, [series, range]);

  function toggleSeries(metricId: string) {
    setToggles((cur) => ({ ...cur, [metricId]: !cur[metricId] }));
  }

  function onPreset(presetId: string) {
    if (presetId === 'all') { setRange({ preset: 'all' }); return; }
    const end = new Date();
    const spanDays = PRESET_RANGES.find((r) => r.id === presetId)?.spanDays || 365;
    const start = new Date(+end - spanDays * 24 * 3600 * 1000);
    setRange({ preset: presetId as TrendDateRange['preset'], start: start.toISOString(), end: end.toISOString() });
  }

  function onExportFHIR() {
    const bundle = mapTrendsToFHIR(patient, filteredSeries.map(s => ({ metric: s.metric, points: s.points })));
    const data = JSON.stringify(bundle, null, 2);
    const blob = new Blob([data], { type: 'application/fhir+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient-${patient.id}-trends.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onCopyValue() {
    if (selectedPoint) {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(`${selectedPoint.value} ${selectedPoint.unit || ''} (${formatDate(selectedPoint.timestamp)})`);
      }
    }
  }

  return (
    <div className="bg-[#F6F9FB] p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold">Health Trends</h2>
          <div className="text-sm text-gray-500">A longitudinal view of vitals and labs</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setLoading(true); setTimeout(()=>{ setLoading(false); }, 700); }} className="px-3 py-2 bg-white border rounded">Refresh Data</button>
          <button onClick={() => { setShowFhir(true); }} className="px-3 py-2 bg-white border rounded">FHIR JSON</button>
          <button onClick={() => { onExportFHIR(); }} className="px-3 py-2 bg-white border rounded">Export FHIR</button>
          <button onClick={() => window.print()} className="px-3 py-2 bg-white border rounded">Print</button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          {PRESET_RANGES.map((r) => (
            <button key={r.id} onClick={() => onPreset(r.id)} className={`px-3 py-1 rounded ${range.preset === r.id ? 'bg-teal-600 text-white' : 'bg-white border'}`}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 border border-[#DDE7F0]">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600">Legend</div>
              <div className="flex items-center gap-2">
                {filteredSeries.map((s) => (
                  <button key={s.metric.id} onClick={() => toggleSeries(s.metric.id)} className="inline-flex items-center gap-2 text-sm" aria-pressed={!!visibleIds[s.metric.id]}>
                    <span className={`w-3 h-3 rounded-full`} style={{ background: colorFor(s.metric.id) }} aria-hidden />
                    <span className={`${visibleIds[s.metric.id] ? 'font-medium' : 'text-gray-400'}`}>{s.metric.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="text-sm text-gray-500">Showing {filteredSeries.reduce((acc, s) => acc + s.points.length, 0)} measurements</div>
          </div>

          <div className="w-full h-96 relative" role="img" aria-label="Interactive trend chart">
            {/* simple svg chart */}
            <svg viewBox="0 0 800 320" className="w-full h-full">
              <rect x="0" y="0" width="800" height="320" fill="#fff" />
              {/* grid lines */}
              {[0,1,2,3,4,5].map(i => <line key={i} x1={60} x2={760} y1={60+i*40} y2={60+i*40} stroke="#EDF2F7" />)}

              {/* series */}
              {filteredSeries.map((s) => {
                if (!visibleIds[s.metric.id]) return null;
                const pts = s.points.slice().sort((a,b)=> new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                if (pts.length === 0) return null;
                const xs = pts.map((p, i) => (60 + (700 * i) / Math.max(1, pts.length - 1)));
                const vals = pts.map(p => p.value ?? 0);
                const min = Math.min(...vals);
                const max = Math.max(...vals);
                const ys = vals.map(v => 260 - ((v - min) / Math.max(1e-6, max - min)) * 180);
                const path = pts.map((p,i)=>`${i===0?'M':'L'} ${xs[i]} ${ys[i]}`).join(' ');
                return (
                  <g key={s.metric.id}>
                    <path d={path} fill="none" stroke={colorFor(s.metric.id)} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    {pts.map((p, i) => (
                      <circle key={p.id} cx={xs[i]} cy={ys[i]} r={4} fill={colorFor(s.metric.id)} tabIndex={0}
                        onMouseEnter={() => setSelectedPoint(p)} onFocus={() => setSelectedPoint(p)} onClick={() => setSelectedPoint(p)} />
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <aside className="bg-white rounded-2xl p-4 border border-[#DDE7F0]">
          <div className="text-sm text-gray-600">Selected Data Point</div>
          {selectedPoint ? (
            <div className="mt-3">
              <div className="font-semibold">{selectedPoint.metricId}</div>
              <div className="text-2xl font-bold">{selectedPoint.value} {selectedPoint.unit}</div>
              <div className="text-sm text-gray-500">{formatDate(selectedPoint.timestamp)}</div>
              <div className="mt-3 space-y-2">
                <button onClick={() => window.open(`/patients/${patient.id}/encounters/${selectedPoint.encounterId || ''}`, '_blank')} className="w-full px-3 py-2 border rounded">Open Source Record</button>
                <button onClick={() => { setShowFhir(true); }} className="w-full px-3 py-2 border rounded">View FHIR JSON</button>
                <button onClick={onCopyValue} className="w-full px-3 py-2 border rounded">Copy Value</button>
                <button onClick={() => setSelectedPoint(null)} className="w-full px-3 py-2 border rounded">Close</button>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-gray-500">No data point selected. Click a point on the chart to view details.</div>
          )}

          <div className="mt-6">
            <h4 className="text-sm font-semibold">Summary Cards</h4>
            <div className="mt-3 space-y-3">
              {series.slice(0,4).map((s) => (
                <div key={s.metric.id} className="p-2 border rounded flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{s.metric.name}</div>
                    <div className="text-xs text-gray-500">Latest: {s.points[ s.points.length-1 ] ? `${s.points[s.points.length-1].value} ${s.points[s.points.length-1].unit || s.metric.unit || ''}` : '—'}</div>
                  </div>
                  <button onClick={() => toggleSeries(s.metric.id)} className="text-sm text-teal-600">Focus</button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* FHIR drawer/modal */}
      {showFhir && (
        <div role="dialog" aria-modal className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">FHIR JSON — Observations</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { const data = JSON.stringify(mapTrendsToFHIR(patient, series), null, 2); if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(data); }} className="px-3 py-1 border rounded">Copy</button>
                <button onClick={() => setShowFhir(false)} className="px-3 py-1 border rounded">Close</button>
              </div>
            </div>
            <pre className="mt-3 max-h-[60vh] overflow-auto text-xs bg-[#0f172a] text-white p-3 rounded">{JSON.stringify(mapTrendsToFHIR(patient, series), null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function colorFor(id: string) {
  const palette = ['#06b6d4','#6B46C1','#F59E0B','#10B981','#EF4444','#7C3AED'];
  let h = 0;
  for (let i=0;i<id.length;i++) h = (h * 31 + id.charCodeAt(i)) % palette.length;
  return palette[h];
}

function synthesizeSeries(patient: MinimalPatient): TrendSeries[] {
  // Synthesize BP, LDL, Weight series from mock data if available
  const now = new Date();
  const makePoints = (base: number, variance: number, count = 8) => {
    return Array.from({ length: count }).map((_, i) => {
      const t = new Date(+now - (count - 1 - i) * 30 * 24 * 3600 * 1000);
      return {
        id: `p-${i}`,
        metricId: 'synthetic',
        timestamp: t.toISOString(),
        value: Math.round((base + (Math.random() - 0.5) * variance) * 10) / 10,
        unit: 'mmol/L',
      } as TrendObservationPoint;
    });
  };

  const foundLdl = patient.labResults && (patient.labResults.find((l: MinimalLab) => /ldl/i.test(l.name)));
  const ldl = foundLdl ? [{ id: 'ldl-0', metricId: 'ldl', timestamp: patient.labResults![0].date, value: parseFloat(patient.labResults![0].result), unit: patient.labResults![0].unit }] : makePoints(3.2, 0.6, 7).map((p,i)=>({ ...p, id: `ldl-${i}`, metricId: 'ldl', unit: 'mmol/L' }));

  const weightBase = patient.weight ? parseFloat(String(patient.weight).split(' ')[0]) : 70;
  const weight = makePoints(weightBase, 3, 7).map((p,i)=>({ ...p, id: `w-${i}`, metricId: 'weight', unit: 'kg' }));

  const sbp = makePoints(130, 12, 7).map((p,i)=>({ ...p, id: `sbp-${i}`, metricId: 'sbp', unit: 'mmHg' }));
  const dbp = makePoints(78, 8, 7).map((p,i)=>({ ...p, id: `dbp-${i}`, metricId: 'dbp', unit: 'mmHg' }));

  return [
    { metric: { id: 'sbp', name: 'Systolic BP', unit: 'mmHg' }, points: sbp },
    { metric: { id: 'dbp', name: 'Diastolic BP', unit: 'mmHg' }, points: dbp },
    { metric: { id: 'ldl', name: 'LDL', unit: 'mmol/L' }, points: ldl },
    { metric: { id: 'weight', name: 'Weight', unit: 'kg' }, points: weight },
  ];
}
