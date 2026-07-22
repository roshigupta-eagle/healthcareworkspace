"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PatientBanner } from '@/design-system/clinical/PatientBanner';
import LineChart from './LineChart';

type Props = {
  patient: any;
  initialSelectedLabId?: string | null;
};

export default function LabResultsIntelligenceClient({ patient, initialSelectedLabId }: Props) {
  const defaultTests = useMemo(() => ([
    { id: 'lipid-panel', name: 'Lipid Panel', date: 'Jun 01, 2026', status: 'Normal', summary: 'LDL improving' },
    { id: 'hba1c', name: 'Hemoglobin A1c', date: 'Jun 10, 2026', status: 'Watch', summary: '7.2% above target' },
    { id: 'cbc', name: 'CBC', date: 'May 28, 2026', status: 'Normal', summary: 'Stable' },
    { id: 'troponin', name: 'Troponin I', date: 'Apr 12, 2026', status: 'Urgent', summary: 'Critical flag' },
    { id: 'kidney', name: 'Kidney Function', date: 'Mar 04, 2026', status: 'Review', summary: 'eGFR trend' },
  ]), []);

  const blendedTests = useMemo(() => {
    // Prefer real patient lab list when available, fall back to defaults
    const real = (patient?.labResults || []).map((l: any) => ({ id: l.id, name: l.name.replace(/ - .*$/,''), date: l.date, status: 'Normal', summary: `${l.name.split('-').pop()?.trim() || ''} ${l.result}` }));
    if (real.length === 0) return defaultTests;
    // merge defaults with real by name
    const map = new Map<string, any>();
    defaultTests.forEach((d) => map.set(d.name, d));
    real.forEach((r) => map.set(r.name, r));
    return Array.from(map.values());
  }, [patient, defaultTests]);

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (initialSelectedLabId) return initialSelectedLabId;
    // prefer Lipid Panel if present
    const lipid = blendedTests.find((t: any) => /lipid/i.test(t.name));
    return lipid ? lipid.id : (blendedTests[0] && blendedTests[0].id) || null;
  });

  useEffect(() => {
    if (initialSelectedLabId) setSelectedId(initialSelectedLabId);
  }, [initialSelectedLabId]);

  const selectedTest = blendedTests.find((t: any) => t.id === selectedId) || blendedTests[0];

  // Sample LDL trend data (matches spec)
  const ldlDates = ['Sep 2025', 'Nov 2025', 'Jan 2026', 'Mar 2026', 'Jun 2026'];
  const ldlValues = [3.8, 3.4, 3.0, 2.1, 2.6];

  return (
    <div className="min-h-screen py-8" style={{ background: 'linear-gradient(180deg,#F6F9FB 0%, #F3FAFB 100%)' }}>
      <div className="max-w-[1500px] mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <a href={`/dashboard/records/${patient?.id}`} className="text-teal-700 hover:underline">← Back to Patient</a>
            <h1 className="text-2xl font-extrabold text-teal-700">Lab Results Intelligence</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold">AI review ready</div>
            <div className="text-sm text-neutral-500">Updated just now</div>
          </div>
        </div>

        <div className="bg-white border border-[#D8E5EF] shadow-sm rounded-2xl p-6">
          <PatientBanner
            mrn={patient?.mrn}
            firstName={patient?.name?.split(' ')[0]}
            lastName={patient?.name?.split(' ').slice(1).join(' ')}
            dateOfBirth={patient?.dob}
            age={patient?.age}
            sex={patient?.gender}
            allergies={patient?.allergies || []}
            identifiers={[{ label: 'MRN', value: patient?.mrn }]}
            verificationStatus={patient?.verificationStatus || 'verified'}
          />

          {/* AI notice */}
          <div className="mt-4 p-4 rounded-lg bg-[#EAF4FF] border border-[#DDEBF9] text-[#1E63C6]">
            <div className="font-semibold">AI lab review is clinical decision support only.</div>
            <div className="text-sm text-[#1E63C6] mt-1">It highlights trends and urgency; clinician review is required.</div>
          </div>

          {/* Three column layout */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left column */}
            <aside className="lg:col-span-3 bg-transparent">
              <div className="sticky top-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">All Patient Tests</h3>
                </div>
                <div className="mb-3">
                  <input aria-label="Search tests" placeholder="Search tests, dates, results..." className="w-full px-3 py-2 rounded-md border border-neutral-200 bg-white text-sm" />
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {['All','Abnormal','Urgent','Improving','Worsening','Normal'].map((c) => (
                    <button key={c} className={`px-3 py-1 text-sm rounded-full ${c==='All' ? 'bg-teal-100 text-teal-700' : 'bg-gray-50 text-gray-600'}`}>{c}</button>
                  ))}
                </div>

                <div className="space-y-2">
                  {blendedTests.map((t: any) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={`w-full text-left flex items-center justify-between p-3 rounded-md border ${selectedId===t.id ? 'bg-[#E8FFF6] border-teal-200' : 'bg-white border-neutral-100'}`}
                      aria-pressed={selectedId===t.id}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${t.status==='Urgent' ? 'bg-red-400' : t.status==='Watch' ? 'bg-amber-400' : 'bg-teal-400'}`} />
                        <div>
                          <div className="font-medium text-gray-900">{t.name}</div>
                          <div className="text-xs text-gray-500">{t.date}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">{t.summary}</div>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Center column */}
            <main className="lg:col-span-6">
              <div className="bg-white rounded-lg p-4 border border-neutral-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{selectedTest?.name} Results</h2>
                    <div className="text-sm text-gray-500">Collected Jun 01, 2026 • Blood • Reviewed by Dr. Patel</div>
                  </div>
                  <div className="text-sm px-2 py-1 rounded-full bg-emerald-50 text-emerald-800">Normal</div>
                </div>

                {/* Top stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg p-3 bg-gray-50 border">
                    <div className="text-xs text-gray-500">Current LDL</div>
                    <div className="text-2xl font-bold text-gray-900">2.6 mmol/L</div>
                    <div className="text-xs text-green-700 mt-1">Normal</div>
                  </div>
                  <div className="rounded-lg p-3 bg-gray-50 border">
                    <div className="text-xs text-gray-500">Lowest LDL</div>
                    <div className="text-2xl font-bold text-gray-900">2.1 mmol/L</div>
                    <div className="text-xs text-gray-500 mt-1">Mar 2026</div>
                  </div>
                  <div className="rounded-lg p-3 bg-gray-50 border">
                    <div className="text-xs text-gray-500">Highest LDL</div>
                    <div className="text-2xl font-bold text-gray-900">3.8 mmol/L</div>
                    <div className="text-xs text-gray-500 mt-1">Sep 2025</div>
                  </div>
                </div>

                {/* Interactive trend graph */}
                <div className="rounded-lg p-4 bg-white border mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">Interactive trend graph</div>
                      <div className="text-xs text-gray-500">Hover over any point to see the date, value, range, and AI status.</div>
                    </div>
                  </div>

                  <TrendChart dates={ldlDates} values={ldlValues} normalMax={3.0} />
                </div>

                {/* Result Grid */}
                <div className="rounded-lg p-3 bg-white border">
                  <div className="text-sm font-semibold mb-3">Result Grid</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b pb-2">
                          <th className="pb-2">Test</th>
                          <th className="pb-2">Result</th>
                          <th className="pb-2">Range</th>
                          <th className="pb-2">AI Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="py-2">Total Cholesterol</td>
                          <td className="py-2">4.4 mmol/L</td>
                          <td className="py-2">&lt; 5.2</td>
                          <td className="py-2"><span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs">Good</span></td>
                        </tr>
                        <tr>
                          <td className="py-2">LDL</td>
                          <td className="py-2">2.6 mmol/L</td>
                          <td className="py-2">&lt; 3.0</td>
                          <td className="py-2"><span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs">Improving</span></td>
                        </tr>
                        <tr>
                          <td className="py-2">HDL</td>
                          <td className="py-2">1.4 mmol/L</td>
                          <td className="py-2">&gt; 1.0</td>
                          <td className="py-2"><span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs">Good</span></td>
                        </tr>
                        <tr>
                          <td className="py-2">Triglycerides</td>
                          <td className="py-2">1.3 mmol/L</td>
                          <td className="py-2">&lt; 1.7</td>
                          <td className="py-2"><span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-xs">Normal</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </main>

            {/* Right column */}
            <aside className="lg:col-span-3">
              <div className="space-y-3 sticky top-6">
                <div className="bg-white rounded-lg p-4 border">
                  <div className="text-sm font-semibold mb-2">AI Lab Intelligence</div>
                  <div className="text-xs text-gray-500 mb-3">Clinician review required</div>

                  <div className="rounded-lg p-3 bg-[#E8FFF6] mb-3 border">
                    <div className="text-xs font-semibold">Overall status</div>
                    <div className="mt-1 text-sm text-gray-900">No urgent lipid concern detected. LDL is improving compared with Sep 2025.</div>
                  </div>

                  <div className="rounded-lg p-3 bg-white mb-3 border">
                    <div className="text-xs font-semibold">Trend</div>
                    <div className="mt-1 text-sm">Getting better — LDL dropped from 3.8 to 2.6 mmol/L.</div>
                  </div>

                  <div className="rounded-lg p-3 bg-white mb-3 border">
                    <div className="text-xs font-semibold">Urgency</div>
                    <div className="mt-1 text-sm">Not urgent — routine follow-up unless symptoms change.</div>
                  </div>

                  <div className="rounded-lg p-3 bg-white mb-3 border">
                    <div className="text-xs font-semibold">Watch item</div>
                    <div className="mt-1 text-sm">A1C 7.2% may need diabetes follow-up.</div>
                  </div>

                  <div className="rounded-lg p-3 bg-white mb-3 border">
                    <div className="text-xs font-semibold">Possible influence</div>
                    <div className="mt-1 text-sm">Atorvastatin and lifestyle changes may explain improvement.</div>
                  </div>

                  <div className="rounded-lg p-3 bg-white border">
                    <div className="text-xs font-semibold">Suggested next steps</div>
                    <ul className="list-disc list-inside text-sm mt-1">
                      <li>Share patient-friendly explanation</li>
                      <li>Compare with medications</li>
                      <li>Schedule routine follow-up</li>
                    </ul>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 w-[min(1100px,92%)]">
          <div className="bg-white rounded-full p-3 shadow-md border flex items-center justify-between px-6">
            <div className="text-sm text-gray-600">Last reviewed: just now • AI support is not a diagnosis</div>
            <div className="flex items-center gap-3">
              <button className="px-3 py-2 rounded-md border bg-white text-sm">Export PDF</button>
              <button className="px-3 py-2 rounded-md border bg-white text-sm">Message Patient</button>
              <button className="px-4 py-2 rounded-md bg-teal-600 text-white text-sm">Add Follow-up</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrendChart({ dates, values, normalMax }: { dates: string[]; values: number[]; normalMax?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const width = 600;
  const height = 200;

  const max = Math.max(...values, normalMax ?? 0);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return { x, y, v, label: dates[i] };
  });

  const path = `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`;

  return (
    <div ref={containerRef} className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        {/* normal range area */}
        {typeof normalMax === 'number' && (
          <rect x={0} y={(height - ((normalMax - min) / range) * height)} width={width} height={height} fill="#EAF4FF" fillOpacity={0.4} />
        )}
        {/* grid lines */}
        {[0.25, 0.5, 0.75].map((g, i) => (
          <line key={i} x1={0} x2={width} y1={height * g} y2={height * g} stroke="#F2F6FA" strokeWidth={1} />
        ))}

        {/* line */}
        <path d={path} fill="none" stroke="#10B8C8" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

        {/* points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={8} fill="#fff" stroke="#10B8C8" strokeWidth={2} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} tabIndex={0} aria-label={`${p.label} ${p.v}`} />
          </g>
        ))}

        {/* x labels */}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={height + 14} fontSize={12} textAnchor="middle" fill="#6B7280">{p.label.split(' ')[0]}</text>
        ))}
      </svg>

      {hover !== null && (
        <div className="absolute" style={{ left: `${(points[hover].x / width) * 100}%`, transform: 'translate(-50%,-120%)' }}>
          <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-md shadow-lg">
            <div className="font-semibold">{points[hover].label}</div>
            <div className="mt-1">LDL: {points[hover].v} mmol/L</div>
            <div className="text-xs text-slate-300 mt-1">Status: Normal</div>
            <div className="text-xs text-slate-300">Range: &lt; 3.0</div>
          </div>
        </div>
      )}

    </div>
  );
}
