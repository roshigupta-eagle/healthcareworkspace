"use client";

import React, { useMemo, useRef, useState } from 'react';

type VitalsPoint = { date: string; value: number };

interface PatientLite {
  id: string;
  name: string;
  mrn?: string;
  age?: number;
  height?: string;
  vitals?: { weight?: VitalsPoint[] };
}

function formatDateShort(d?: string) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return d; }
}

function buildSmoothPathSimple(points: { x: number; y: number }[]) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y} ${cx} ${p1.y} ${p1.x} ${p1.y}`;
  }
  return d;
}

export default function WeightTrendClient({ patient }: { patient: PatientLite }) {
  // local editable copy of weights for quick demo interactions
  const initial: VitalsPoint[] = (patient?.vitals?.weight ?? []).map((w) => ({ date: w.date, value: Number(w.value) }));
  const [weights, setWeights] = useState<VitalsPoint[]>(initial.length ? initial : [
    { date: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0,10), value: 79.2 },
    { date: new Date(Date.now() - 300 * 24 * 3600 * 1000).toISOString().slice(0,10), value: 78.7 },
    { date: new Date(Date.now() - 200 * 24 * 3600 * 1000).toISOString().slice(0,10), value: 76.1 },
    { date: new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString().slice(0,10), value: 72.3 },
    { date: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().slice(0,10), value: 69.4 },
    { date: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().slice(0,10), value: 68.8 },
    { date: new Date().toISOString().slice(0,10), value: 68.0 },
  ]);

  const [range, setRange] = useState<'1M'|'3M'|'6M'|'1Y'|'2Y'|'ALL'>('2Y');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [openShare, setOpenShare] = useState(false);
  const [openExport, setOpenExport] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const chartRef = useRef<SVGSVGElement | null>(null);

  const sorted = useMemo(() => [...weights].sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()), [weights]);

  const now = Date.now();
  function inRangePoint(p: VitalsPoint) {
    const d = new Date(p.date).getTime();
    if (range === 'ALL') return true;
    const days = range === '1M' ? 31 : range === '3M' ? 92 : range === '6M' ? 184 : range === '1Y' ? 365 : 365*2;
    return d >= now - days * 24 * 3600 * 1000;
  }

  const viewPoints = useMemo(() => sorted.filter(inRangePoint), [sorted, range]);

  const values = viewPoints.map(v=>v.value);
  const min = Math.min(...values, 0) - 1;
  const max = Math.max(...values, 1) + 1;

  // svg coordinates
  const vw = 900; const vh = 320; const padX = 48; const padY = 36;
  const coords = viewPoints.map((p, i) => {
    const x = padX + (i * (vw - padX*2)) / Math.max(1, viewPoints.length - 1);
    const y = padY + (1 - (p.value - min) / Math.max(0.0001, max - min)) * (vh - padY*2);
    return { x, y, ...p };
  });

  const pathD = buildSmoothPathSimple(coords);

  function handleChartMove(e: React.MouseEvent) {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const scale = vw / rect.width;
    const x = (e.clientX - rect.left) * scale;
    let best = 0; let bestDist = Infinity;
    coords.forEach((c,i)=>{ const dx = Math.abs(c.x - x); if (dx<bestDist) { bestDist = dx; best = i; } });
    setHoverIdx(best);
  }

  function handleChartLeave(){ setHoverIdx(null); }

  async function addMeasurement(val:number, date?:string){
    const d = date ?? new Date().toISOString().slice(0,10);
    // optimistic
    const newEntry = { date: d, value: val };
    setWeights(w=>[...w, newEntry]);
    setOpenNew(false);
    try {
      const res = await fetch('/api/vitals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patientId: patient?.id, date: d, value: val }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
    } catch (err) {
      console.error('Failed to persist measurement', err);
    }
  }

  function exportCsv(){
    const rows = [['date','weight']].concat(sorted.map(s=>[s.date,String(s.value)]));
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${patient?.id ?? 'patient'}-weight.csv`; a.click(); URL.revokeObjectURL(url);
    setOpenExport(false);
  }

  const latest = sorted[sorted.length-1];
  const first = sorted[0];
  const totalChange = latest && first ? Math.round((latest.value - first.value)*10)/10 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Weight Trend</h1>
          <p className="text-sm text-slate-500">Comprehensive weight analytics and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-slate-500 mr-2">{formatDateShort(sorted[0]?.date)} — {formatDateShort(sorted[sorted.length-1]?.date)}</div>
          <button onClick={()=>setOpenShare(true)} className="px-3 py-2 bg-white border rounded text-sm">Share Report</button>
          <div className="relative">
            <button onClick={()=>setOpenExport(true)} className="px-3 py-2 bg-white border rounded text-sm">Export ▾</button>
          </div>
          <button onClick={()=>setOpenNew(true)} className="px-3 py-2 bg-sky-600 text-white rounded text-sm">Add Measurement</button>
        </div>
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="col-span-1 md:col-span-2 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-slate-500">Current Weight</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{latest?.value ?? '—'} kg</div>
          <div className="text-xs text-slate-400">{formatDateShort(latest?.date)}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-slate-500">Total Change</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{totalChange > 0 ? `+${totalChange}` : `${totalChange}`} kg</div>
          <div className="text-xs text-slate-400">{first ? `${Math.round((totalChange/first.value)*1000)/10}%` : ''}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-slate-500">Weekly Change</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{(latest && (()=>{
            const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
            const near = sorted.slice().reverse().find(s=>new Date(s.date).getTime() <= weekAgo.getTime()) ?? sorted[0];
            return Math.round((latest.value - (near?.value ?? latest.value))*10)/10;
          })()) ?? '—'} kg</div>
          <div className="text-xs text-slate-400">Last 7 days</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-slate-500">BMI</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{(()=>{
            const h = patient?.height ? Number(String(patient.height).match(/([0-9]+)/)?.[1]) : null;
            if (!h || !latest) return '—';
            const bmi = Math.round((latest.value / ((h/100)**2))*10)/10; return bmi;
          })()}</div>
          <div className="text-xs text-slate-400">{patient?.height ?? 'Height unknown'}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-slate-500">Goal Progress</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="text-2xl font-semibold tabular-nums">{Math.max(0, Math.round(((first?.value ?? 0) - (latest?.value ?? 0)) / Math.max(1, (first?.value ?? 1) - ((latest?.value ?? 0)-5)) * 100))}%</div>
            <div className="text-xs text-slate-400">{Math.abs(Math.round(((latest?.value ?? 0) - ((latest?.value ?? 0)-5))*10)/10)} kg to go</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="text-xs text-slate-500">Trend Status</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-600">{ totalChange < 0 ? 'Improving' : 'Stable' }</div>
          <div className="text-xs text-slate-400">Consistency: {values.length} measurements</div>
        </div>
      </div>

      {/* main */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Weight Trend Over Time</h3>
                <div className="text-xs text-slate-500">Showing measurements — interactive</div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {['1M','3M','6M','1Y','2Y','ALL'].map(r=> (
                  <button key={r} onClick={()=>setRange(r as any)} className={`px-3 py-1 rounded ${range===r? 'bg-sky-50 text-sky-700' : 'bg-white border'}`}>{r}</button>
                ))}
              </div>
            </div>

            <div className="relative">
              <svg ref={chartRef} viewBox={`0 0 ${vw} ${vh}`} width="100%" height={vh} onMouseMove={handleChartMove} onMouseLeave={handleChartLeave} className="rounded-md overflow-visible" role="img" aria-label="Weight trend chart">
                <defs>
                  <linearGradient id="wt-grad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.18" />
                    <stop offset="60%" stopColor="#bfdbfe" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0" />
                  </linearGradient>
                </defs>

                <rect x={0} y={0} rx={12} width={vw} height={vh} fill="#FAFBFF" />

                {/* grid lines */}
                {[0,1,2,3].map(i=>{
                  const y = padY + (i*(vh-padY*2))/3; return <line key={i} x1={padX} x2={vw-padX} y1={y} y2={y} stroke="#eef2ff" strokeWidth={1}/>;
                })}

                {/* area */}
                {coords.length>1 && (
                  <path d={`${pathD} L ${coords[coords.length-1].x} ${vh-padY} L ${coords[0].x} ${vh-padY} Z`} fill="url(#wt-grad)" />
                )}

                {/* trend line */}
                <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

                {/* points */}
                {coords.map((c,i)=> (
                  <g key={i}>
                    <circle cx={c.x} cy={c.y} r={hoverIdx===i?6:3.5} fill="#fff" stroke="#3b82f6" strokeWidth={2} />
                    <circle cx={c.x} cy={c.y} r={hoverIdx===i?3.5:2} fill="#3b82f6" />
                  </g>
                ))}
              </svg>

              {/* tooltip */}
              {hoverIdx !== null && coords[hoverIdx] && (
                <div className="pointer-events-none absolute" style={{ left: `${Math.min(92, Math.max(4, (coords[hoverIdx].x / vw) * 100))}%`, transform: 'translateX(-50%)', top: '10px' }}>
                  <div className="bg-white border rounded-lg shadow p-3 text-sm w-48">
                    <div className="text-xs text-slate-400">{formatDateShort(coords[hoverIdx].date)}</div>
                    <div className="mt-1 font-semibold text-lg">{coords[hoverIdx].value} kg</div>
                  </div>
                </div>
              )}
            </div>

            {/* chart footer metrics */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-3 bg-white rounded-md border border-gray-100 text-sm">
                <div className="text-xs text-slate-500">Starting Weight</div>
                <div className="font-semibold tabular-nums">{first?.value ?? '—'} kg</div>
                <div className="text-xs text-gray-400">{formatDateShort(first?.date)}</div>
              </div>

              <div className="p-3 bg-white rounded-md border border-gray-100 text-sm">
                <div className="text-xs text-slate-500">Lowest Weight</div>
                <div className="font-semibold tabular-nums">{Math.min(...values).toFixed(1)} kg</div>
                <div className="text-xs text-gray-400">{formatDateShort(viewPoints[values.indexOf(Math.min(...values))]?.date)}</div>
              </div>

              <div className="p-3 bg-white rounded-md border border-gray-100 text-sm">
                <div className="text-xs text-slate-500">Highest Weight</div>
                <div className="font-semibold tabular-nums">{Math.max(...values).toFixed(1)} kg</div>
                <div className="text-xs text-gray-400">{formatDateShort(viewPoints[values.indexOf(Math.max(...values))]?.date)}</div>
              </div>

              <div className="p-3 bg-white rounded-md border border-gray-100 text-sm">
                <div className="text-xs text-slate-500">Average Weight</div>
                <div className="font-semibold tabular-nums">{(values.reduce((a,b)=>a+b,0)/Math.max(1,values.length)).toFixed(1)} kg</div>
                <div className="text-xs text-gray-400">Selected period</div>
              </div>

              <div className="p-3 bg-white rounded-md border border-gray-100 text-sm">
                <div className="text-xs text-slate-500">Data Points</div>
                <div className="font-semibold tabular-nums">{values.length}</div>
                <div className="text-xs text-gray-400">Over {Math.round((values.length*30)/30)} days</div>
              </div>
            </div>
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">Weight Insights</h4>
              <button onClick={()=>{}} className="text-xs text-sky-600">View All Insights</button>
            </div>
            <ul className="mt-3 space-y-3 text-sm text-slate-700">
              <li className="flex items-start justify-between">
                <div>
                  <div className="font-medium">Great Progress!</div>
                  <div className="text-xs text-gray-500">You've lost {Math.abs(totalChange)} kg since {formatDateShort(first?.date)}</div>
                </div>
                <div className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Positive</div>
              </li>

              <li className="flex items-start justify-between">
                <div>
                  <div className="font-medium">Trending Down</div>
                  <div className="text-xs text-gray-500">Your weight has been consistently decreasing</div>
                </div>
                <div className="text-xs bg-sky-50 text-sky-700 px-2 py-1 rounded-full">Improving</div>
              </li>

              <li className="flex items-start justify-between">
                <div>
                  <div className="font-medium">Steady Progress</div>
                  <div className="text-xs text-gray-500">Average weekly loss of 0.18 kg</div>
                </div>
                <div className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">On Track</div>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h5 className="text-sm font-semibold text-slate-900">Weight Distribution</h5>
            <div className="mt-3 flex items-center gap-4">
              <svg viewBox="0 0 36 36" className="w-28 h-28" aria-hidden>
                <circle cx="18" cy="18" r="15" fill="#f8fafc" />
                <circle cx="18" cy="18" r="12" fill="#fff" />
              </svg>
              <div className="text-sm text-slate-700">
                <div><span className="inline-block w-3 h-3 bg-emerald-500 mr-2 align-middle" />Within range — 78% (410 days)</div>
                <div className="mt-2 text-xs text-gray-400">Based on BMI normal range.</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold">Recent Weights</h5>
              <button className="text-sm text-sky-600">View All</button>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {sorted.slice().reverse().slice(0,4).map((h,i)=> (
                <li key={i} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{formatDateShort(h.date)}</div>
                    <div className="text-xs text-gray-500">Source: Clinic</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{h.value} kg</div>
                    <div className="text-xs text-green-600">{i===0? '▲ 0.2 kg' : ''}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* share/export/new measurement modals */}
      {openShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setOpenShare(false)} />
          <div className="relative bg-white rounded-lg p-6 z-10 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-medium">Share Report</div>
              <button onClick={()=>setOpenShare(false)}>✕</button>
            </div>
            <div className="text-sm text-slate-700">Link to share (placeholder)</div>
            <div className="mt-4 flex gap-2"><button className="px-3 py-2 bg-sky-600 text-white rounded" onClick={()=>{navigator.clipboard?.writeText(window.location.href)}}>Copy Link</button><button className="px-3 py-2 border rounded" onClick={()=>setOpenShare(false)}>Close</button></div>
          </div>
        </div>
      )}

      {openExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setOpenExport(false)} />
          <div className="relative bg-white rounded-lg p-6 z-10 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-medium">Export</div>
              <button onClick={()=>setOpenExport(false)}>✕</button>
            </div>
            <div className="text-sm text-slate-700">Choose export format</div>
            <div className="mt-4 flex gap-2"><button className="px-3 py-2 bg-white border rounded" onClick={exportCsv}>Export CSV</button><button className="px-3 py-2 border rounded" onClick={()=>setOpenExport(false)}>Cancel</button></div>
          </div>
        </div>
      )}

      {openNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setOpenNew(false)} />
          <div className="relative bg-white rounded-lg p-6 z-10 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-medium">Add Measurement</div>
              <button onClick={()=>setOpenNew(false)}>✕</button>
            </div>
            <NewMeasurementForm onSave={(v,d)=>addMeasurement(v,d)} onCancel={()=>setOpenNew(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function NewMeasurementForm({ onSave, onCancel }: { onSave: (val:number, date?:string)=>void; onCancel: ()=>void }){
  const [val, setVal] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  return (
    <div>
      <label className="block text-sm text-slate-600">Weight (kg)</label>
      <input className="w-full border rounded px-2 py-2 mt-1" value={val} onChange={(e)=>setVal(e.target.value)} />
      <label className="block text-sm text-slate-600 mt-2">Date</label>
      <input type="date" className="w-full border rounded px-2 py-2 mt-1" value={date} onChange={(e)=>setDate(e.target.value)} />
      <div className="mt-3 flex items-center gap-2"><button className="px-3 py-2 bg-sky-600 text-white rounded" onClick={()=>{ const n=parseFloat(val); if(!isNaN(n)) onSave(n,date); }}>Save</button><button className="px-3 py-2 border rounded" onClick={onCancel}>Cancel</button></div>
    </div>
  );
}

