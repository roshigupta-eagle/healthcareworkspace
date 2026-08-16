"use client";
import React, { useEffect, useState } from 'react';
import { AiClinicalSummary } from '../lib/aiSummaryTypes';

type Props = { patientId: string; patientName?: string };

export default function AiClinicalSummaryClient({ patientId, patientName }: Props) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<AiClinicalSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/ai-summary`);
      if (res.ok) {
        const body = await res.json();
        setSummary(body.summary ?? null);
      } else {
        setSummary(null);
      }
    } catch (e:any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
    // audit page open
    void fetch(`/api/patients/${patientId}/ai-summary`, { method: 'GET' }).catch(() => null);
  }, [patientId]);

  async function handleGenerate(force = false) {
    setGenerating(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/ai-summary`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ force }) });
      if (!res.ok) throw new Error('Generation failed');
      const body = await res.json();
      setSummary(body.summary);
    } catch (e:any) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <div className="p-6">Loading AI summary…</div>;
  if (error) return <div className="p-6 text-rose-600">Error: {error}</div>;

  return (
    <main className="min-h-screen p-6 bg-[#F7F9FC]">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">AI Clinical Summary</h1>
            <p className="text-sm text-slate-600">Comprehensive overview of patient health status and trends</p>
            <div className="text-xs text-slate-500 mt-1">Patient: {patientName}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs text-slate-600">
              <div>Generated: {summary ? new Date(summary.generatedAt).toLocaleString() : '—'}</div>
              <div className="mt-1">Status: {summary?.reviewed ? 'Reviewed' : 'Draft'}</div>
            </div>
            <div>
              <button onClick={() => handleGenerate()} disabled={generating} className="inline-flex items-center rounded px-3 py-2 bg-teal-700 text-white">{generating ? 'Generating…' : 'Generate Summary'}</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 mb-6">
          {/* Metric placeholders */}
          <div className="col-span-1 rounded-xl border border-[#E4EAF2] bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Blood Pressure</div>
            <div className="mt-2 text-lg font-semibold">{summary?.metrics.find(m=>m.id==='m-bp')?.value ?? '—'}</div>
            <div className="text-xs text-slate-400 mt-1">{summary?.metrics.find(m=>m.id==='m-bp')?.unit ?? ''}</div>
          </div>
          <div className="col-span-1 rounded-xl border border-[#E4EAF2] bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">LDL Cholesterol</div>
            <div className="mt-2 text-lg font-semibold">{summary?.metrics.find(m=>m.id?.includes('lab'))?.value ?? '—'}</div>
            <div className="text-xs text-slate-400 mt-1">{summary?.metrics.find(m=>m.id?.includes('lab'))?.unit ?? ''}</div>
          </div>
          <div className="col-span-1 rounded-xl border border-[#E4EAF2] bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">A1C</div>
            <div className="mt-2 text-lg font-semibold">—</div>
            <div className="text-xs text-slate-400 mt-1">%</div>
          </div>
          <div className="col-span-1 rounded-xl border border-[#E4EAF2] bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Weight</div>
            <div className="mt-2 text-lg font-semibold">{summary?.metrics.find(m=>m.id==='m-weight')?.value ?? '—'}</div>
            <div className="text-xs text-slate-400 mt-1">{summary?.metrics.find(m=>m.id==='m-weight')?.unit ?? ''}</div>
          </div>
          <div className="col-span-1 rounded-xl border border-[#E4EAF2] bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Medications</div>
            <div className="mt-2 text-lg font-semibold">{summary ? summary.recommendations.length : '—'}</div>
            <div className="text-xs text-slate-400 mt-1">recommendations</div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <section className="col-span-4 rounded-2xl border border-[#E4EAF2] bg-white p-4 shadow-sm">
            <h2 className="font-semibold">Health Timeline</h2>
            <p className="text-xs text-slate-500">Latest 6 Events</p>
            <div className="mt-3 text-sm text-slate-700">{summary?.sources.map(s=> (<div key={s.id} className="py-2 border-b border-slate-100">{s.resourceType} • {s.id} • {s.date}</div>))}</div>
            <div className="mt-3">
              <a href={`/dashboard/records/${patientId}/timeline`} className="text-sm text-teal-700">View Full Timeline →</a>
            </div>
          </section>

          <section className="col-span-5 rounded-2xl border border-[#E4EAF2] bg-white p-4 shadow-sm">
            <h2 className="font-semibold">AI Clinical Summary</h2>
            <p className="text-sm text-slate-600 mt-2">{summary?.findings[0]?.text}</p>
            <div className="mt-4">
              <h3 className="text-sm font-semibold">Key findings</h3>
              <ul className="mt-2 space-y-2">
                {summary?.findings.map(f=> (
                  <li key={f.id} className="rounded p-2 border border-slate-100">{f.text} <button className="ml-2 text-xs text-teal-700" onClick={()=>{ alert('Open sources drawer (prototype)')}}>Sources ({f.sources.length})</button></li>
                ))}
              </ul>
            </div>
            <div className="mt-4 text-xs text-slate-500">AI Summary generated by a prototype service. Clinician review required.</div>
          </section>

          <aside className="col-span-3 space-y-4">
            <div className="rounded-2xl border border-[#E4EAF2] bg-white p-4 shadow-sm">
              <h3 className="font-semibold">Health Recommendations</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {summary?.recommendations.map(r=> (<li key={r.id} className="flex items-center justify-between"><span>{r.text}</span><button className="text-xs text-teal-700">Open</button></li>))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[#E4EAF2] bg-white p-4 shadow-sm">
              <h3 className="font-semibold">Summary Actions</h3>
              <div className="mt-3 grid gap-2">
                <button onClick={()=>{ window.print(); }} className="w-full inline-flex items-center justify-center rounded px-3 py-2 bg-white border">Print Summary</button>
                <button onClick={()=>{ navigator.clipboard.writeText(location.href); alert('Link copied to clipboard'); }} className="w-full inline-flex items-center justify-center rounded px-3 py-2 bg-white border">Copy Secure Link</button>
                <a href={`/dashboard/records/${patientId}/messages/new?context=ai-summary`} className="w-full inline-flex items-center justify-center rounded px-3 py-2 bg-white border">Message Patient</a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
