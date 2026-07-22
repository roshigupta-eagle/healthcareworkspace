"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Patient {
  id: string;
  name: string;
  weight?: string;
  medications?: Array<{ name: string; dose?: string; freq?: string }>;
  conditions?: string[];
  contact?: { phone?: string };
  photoUrl?: string;
}

interface Props {
  patient: Patient;
}

function parseKg(s?: string) {
  if (!s) return 75;
  const m = String(s).match(/([0-9]+(\.[0-9]+)?)/);
  return m ? Number(m[1]) : 75;
}

function kgToLbs(kg: number) {
  return Math.round((kg * 2.2046226218) * 10) / 10;
}

export default function WeightTrendClient({ patient }: Props) {
  const baseKg = parseKg(patient.weight);

  const history = useMemo(() => {
    // generate 12 monthly demo points (older → newer)
    const arr: { date: string; weight: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      // gentle seasonal/random variation
      const seasonal = Math.sin(i / 2) * 0.6;
      const noise = (Math.random() - 0.5) * 1.2;
      const value = Math.round((baseKg + seasonal + noise) * 10) / 10;
      arr.push({ date: d.toISOString().slice(0, 10), weight: value });
    }
    return arr;
  }, [baseKg]);

  const values = history.map((p) => p.weight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const current = values[values.length - 1];
  const goal = Math.round((current - 5) * 10) / 10; // example goal

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const [pathLength, setPathLength] = useState(0);

  useEffect(() => {
    if (pathRef.current) {
      const len = pathRef.current.getTotalLength();
      setPathLength(len);
      pathRef.current.style.strokeDasharray = String(len);
      pathRef.current.style.strokeDashoffset = String(len);
      // animate draw
      requestAnimationFrame(() => {
        if (pathRef.current) pathRef.current.style.transition = 'stroke-dashoffset 800ms ease-out';
        if (pathRef.current) pathRef.current.style.strokeDashoffset = '0';
      });
    }
  }, [history]);

  // build path
  const viewWidth = 900;
  const viewHeight = 280;
  const padX = 40;
  const padY = 28;
  const n = history.length;

  const coords = history.map((p, i) => {
    const x = padX + (i * (viewWidth - padX * 2)) / Math.max(1, n - 1);
    const y = padY + (1 - (p.weight - min) / Math.max(0.0001, (max - min))) * (viewHeight - padY * 2);
    return { x, y, ...p };
  });

  // Catmull-Rom -> Bezier smoothing for nicer curved lines
  function buildSmoothPath(points: { x: number; y: number }[]) {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    const tension = 0.5; // lower = smoother
    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i === 0 ? points[0] : points[i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i + 2 < points.length ? points[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) * tension / 6;
      const cp1y = p1.y + (p2.y - p0.y) * tension / 6;
      const cp2x = p2.x - (p3.x - p1.x) * tension / 6;
      const cp2y = p2.y - (p3.y - p1.y) * tension / 6;

      d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
    }

    return d;
  }

  const pathD = buildSmoothPath(coords);

  function handleMouseMove(evt: React.MouseEvent) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    // find closest index
    let nearest = 0;
    let bestDist = Infinity;
    coords.forEach((c, i) => {
      const dx = Math.abs(c.x - x * (viewWidth / rect.width));
      if (dx < bestDist) {
        bestDist = dx;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  function handleMouseLeave() { setHoverIndex(null); }

  // simple AI summary
  const aiSummary = (() => {
    const recent = values.slice(-6);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const delta = Math.round((last - first) * 10) / 10;
    if (Math.abs(delta) <= 1.5) return `📊 Weight has been stable over the last ${recent.length} months, fluctuating within a small range.`;
    if (delta > 1.5) return `⚠️ Gradual weight gain of ${delta} kg detected over ${recent.length} months. Consider reviewing medications and diet.`;
    return `✅ Weight decreased by ${Math.abs(delta)} kg over the last ${recent.length} months.`;
  })();

  return (
    <div className="space-y-6">
      {/* Top summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-gray-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={patient.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.name)}&background=E6FFFA&color=0F766E`} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
          <div className="min-w-0">
            <div className="text-lg font-semibold text-slate-900 truncate">{patient.name}</div>
            <div className="text-sm text-slate-500">{patient.contact?.phone || ''}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-sm font-medium">Current Weight: <span className="font-semibold ml-2">{current} kg</span></div>
          <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-200 text-sm text-neutral-700 hover:shadow-sm transition">🖨️ Print Report</button>
          <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-200 text-sm text-neutral-700 hover:shadow-sm transition">📤 Export</button>
        </div>
      </div>

      {/* AI banner */}
      <div className="rounded-lg p-3 text-sm text-slate-800 bg-gradient-to-r from-emerald-50 to-white border border-emerald-100">
        {aiSummary}
      </div>

      {/* Graph + metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white rounded-xl p-4 shadow-sm ring-1 ring-gray-50">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Weight Trend</h3>
              <div className="text-xs text-slate-500">Monthly — Last 12 months</div>
            </div>
            <div className="text-xs text-slate-500">Goal: {goal} kg</div>
          </div>

          <div className="relative">
            <svg ref={svgRef} viewBox={`0 0 ${viewWidth} ${viewHeight}`} width="100%" height="320" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="rounded-md overflow-visible" role="img" aria-label="Weight trend chart">
              <defs>
                <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.14" />
                  <stop offset="60%" stopColor="#14B8A6" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
                </linearGradient>
                <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="6" stdDeviation="12" floodOpacity="0.06" />
                </filter>
              </defs>

              {/* background rounded panel */}
              <rect x={0} y={0} rx={12} ry={12} width={viewWidth} height={viewHeight} fill="#F8FAFC" />

              {/* faint horizontal grid lines */}
              {[0, 1, 2, 3].map((i) => {
                const y = padY + (i * (viewHeight - padY * 2)) / 3;
                return <line key={i} x1={padX} x2={viewWidth - padX} y1={y} y2={y} stroke="#E6EEF3" strokeWidth={1} />;
              })}

              {/* area fill */}
              {coords.length > 1 && (
                <path d={`${pathD} L ${coords[coords.length - 1].x} ${viewHeight - padY} L ${coords[0].x} ${viewHeight - padY} Z`} fill="url(#grad)" filter="url(#softShadow)" />
              )}

              {/* goal horizontal dashed line */}
              <line x1={padX} x2={viewWidth - padX} y1={padY + (1 - (goal - min) / Math.max(0.0001, (max - min))) * (viewHeight - padY * 2)} y2={padY + (1 - (goal - min) / Math.max(0.0001, (max - min))) * (viewHeight - padY * 2)} stroke="#10B981" strokeDasharray="6 6" strokeWidth={1.25} opacity={0.9} />

              {/* smooth path */}
              <path ref={pathRef} d={pathD} fill="none" stroke="#14B8A6" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

              {/* point markers */}
              {coords.map((c, i) => (
                <g key={i}>
                  <circle cx={c.x} cy={c.y} r={hoverIndex === i ? 5.5 : 3.5} fill="#fff" stroke="#14B8A6" strokeWidth={2} />
                  <circle cx={c.x} cy={c.y} r={hoverIndex === i ? 3 : 2} fill="#14B8A6" />
                </g>
              ))}

              {/* crosshair */}
              {hoverIndex !== null && coords[hoverIndex] && (
                <line x1={coords[hoverIndex].x} x2={coords[hoverIndex].x} y1={padY} y2={viewHeight - padY} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 4" opacity={0.9} />
              )}
            </svg>

            {/* tooltip */}
            {hoverIndex !== null && coords[hoverIndex] && (
              <div style={{ left: `${Math.min(96, Math.max(4, (coords[hoverIndex].x / viewWidth) * 100))}%` }} className="pointer-events-none absolute transform -translate-x-1/2 -translate-y-full mt-2 bg-white border border-gray-100 rounded-lg shadow-md p-3 text-sm text-slate-900 w-44">
                <div className="text-xs text-slate-400">{new Date(coords[hoverIndex].date).toLocaleDateString()}</div>
                <div className="mt-1 font-semibold text-lg tabular-nums">{coords[hoverIndex].weight} kg</div>
                {hoverIndex > 0 && <div className="text-xs text-slate-500 mt-1">Δ {(Math.round((coords[hoverIndex].weight - coords[hoverIndex - 1].weight) * 10) / 10)} kg from previous</div>}
              </div>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-gray-50">
          <div className="grid grid-cols-1 gap-3">
            <div className="p-3 bg-white rounded-md border border-gray-100">
              <div className="text-xs text-slate-500">Current Weight</div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">{current} kg</div>
              <div className="text-xs text-slate-400">As of latest visit</div>
            </div>

            <div className="p-3 bg-white rounded-md border border-gray-100">
              <div className="text-xs text-slate-500">Goal Weight</div>
              <div className="text-2xl font-bold text-emerald-600 tabular-nums">{goal} kg</div>
              <div className="text-xs text-slate-400">Clinician target</div>
            </div>

            <div className="p-3 bg-white rounded-md border border-gray-100">
              <div className="text-xs text-slate-500">Lowest (12mo)</div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">{min} kg</div>
            </div>

            <div className="p-3 bg-white rounded-md border border-gray-100">
              <div className="text-xs text-slate-500">Highest (12mo)</div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">{max} kg</div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Influences */}
      <div className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-gray-50">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Clinical Influences</h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">💊</div>
            <div>
              <div className="font-medium text-slate-900">Medications</div>
              <div className="text-sm text-slate-500">{(patient.medications && patient.medications.length > 0) ? patient.medications.map(m => `${m.name} ${m.dose || ''} • ${m.freq || ''}`).join('; ') : 'No current medications listed.'}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">🧬</div>
            <div>
              <div className="font-medium text-slate-900">Conditions</div>
              <div className="text-sm text-slate-500">{(patient.conditions && patient.conditions.length > 0) ? patient.conditions.join(', ') : 'No active conditions listed.'}</div>
            </div>
          </div>

          {/* sudden change detection */}
          {Math.abs(values[values.length - 1] - values[Math.max(0, values.length - 3)]) >= 3 && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-100">
              <div className="font-semibold text-rose-700">Rapid change detected</div>
              <div className="text-sm text-rose-700">Significant weight change in recent visits — consider follow-up.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
