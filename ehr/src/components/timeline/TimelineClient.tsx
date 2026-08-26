"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { TimelineEvent } from '@/lib/timeline/types';

function formatDateShort(ms?: number | null) {
  if (!ms) return '—';
  const d = new Date(ms);
  return d.toLocaleString();
}

export default function TimelineClient({ patientId }: { patientId: string }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TimelineEvent | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(1000);

  const now = Date.now();
  const defaultStart = now - 90 * 24 * 3600 * 1000;
  const defaultEnd = now + 24 * 3600 * 1000;
  const [start, setStart] = useState<number>(defaultStart);
  const [end, setEnd] = useState<number>(defaultEnd);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(() => {
      setWidth(containerRef.current?.clientWidth ?? 1000);
    });
    obs.observe(containerRef.current);
    setWidth(containerRef.current.clientWidth || 1000);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let mounted = true;
    async function fetchEvents() {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set('start', new Date(start).toISOString());
        qs.set('end', new Date(end).toISOString());
        qs.set('_count', '1000');
        const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/timeline?${qs.toString()}`);
        if (!res.ok) throw new Error('Failed to load timeline');
        const body = await res.json();
        if (!mounted) return;
        setEvents(body.events || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchEvents();
    return () => { mounted = false; };
  }, [patientId, start, end]);

  const lanes: { key: string; label: string }[] = [
    { key: 'encounter', label: 'Encounters' },
    { key: 'condition', label: 'Conditions' },
    { key: 'lab', label: 'Labs' },
    { key: 'medication', label: 'Medications' },
    { key: 'other', label: 'Other' },
  ];

  const minTime = useMemo(() => (events.length ? Math.min(...events.map(e => e.point ?? e.start ?? e.lastUpdated ?? Number.POSITIVE_INFINITY)) : start), [events, start]);
  const maxTime = useMemo(() => (events.length ? Math.max(...events.map(e => e.point ?? e.end ?? e.start ?? e.lastUpdated ?? Number.NEGATIVE_INFINITY)) : end), [events, end]);

  function scaleTime(t?: number | null) {
    const left = 0;
    const right = Math.max(1, width - 60);
    if (!t) return left;
    if (maxTime === minTime) return Math.round((left + right) / 2);
    return Math.round(((t - minTime) / (maxTime - minTime)) * (right - left) + left);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 bg-white border rounded" onClick={() => { const span = 7*24*3600*1000; setStart(now - span); setEnd(now + 24*3600*1000); }}>7d</button>
          <button className="px-3 py-1 bg-white border rounded" onClick={() => { const span = 30*24*3600*1000; setStart(now - span); setEnd(now + 24*3600*1000); }}>30d</button>
          <button className="px-3 py-1 bg-white border rounded" onClick={() => { const span = 90*24*3600*1000; setStart(now - span); setEnd(now + 24*3600*1000); }}>90d</button>
          <button className="px-3 py-1 bg-white border rounded" onClick={() => { const span = 365*24*3600*1000; setStart(now - span); setEnd(now + 24*3600*1000); }}>1y</button>
        </div>

        <div className="text-sm text-slate-500">Showing {new Date(start).toLocaleDateString()} → {new Date(end).toLocaleDateString()}</div>
      </div>

      <div ref={containerRef} className="w-full bg-white rounded-lg border p-4">
        <div className="text-xs text-slate-500 mb-2">Timeline</div>
        <div className="w-full overflow-auto">
          <div className="relative" style={{ minWidth: '800px' }}>
            {/* time axis */}
            <div className="absolute left-0 right-0 top-0 h-6">
              <svg width={width} height={24} className="w-full">
                {/* ticks */}
                {[0,1,2,3,4,5,6,7,8,9].map(i => {
                  const t = minTime + (i/9) * (maxTime - minTime);
                  const x = scaleTime(t);
                  return (<g key={i}><line x1={x} x2={x} y1={0} y2={12} stroke="#E6E7EB" /><text x={x+2} y={20} fontSize={10} fill="#6B7280">{new Date(t).toLocaleDateString()}</text></g>);
                })}
              </svg>
            </div>

            <div style={{ paddingTop: 28 }}>
              {lanes.map((lane, idx) => (
                <div key={lane.key} className="mb-4">
                  <div className="text-sm font-semibold mb-1">{lane.label}</div>
                  <div className="relative bg-slate-50 rounded h-20 border border-slate-100">
                    {(events.filter(e => e.lane === lane.key) || []).map(ev => {
                      const left = scaleTime(ev.point ?? ev.start ?? ev.lastUpdated ?? null);
                      const leftEnd = ev.end ? scaleTime(ev.end) : left + 8;
                      const isBlock = !!(ev.start && ev.end && ev.end > ev.start);
                      const style: React.CSSProperties = isBlock ? { left, width: Math.max(6, leftEnd - left), position: 'absolute', top: 12, height: 40, borderRadius: 6, background: ev.critical ? '#FEE2E2' : '#DBEAFE', border: '1px solid #c7d2fe', padding: '4px', cursor: 'pointer' } : { position: 'absolute', left: left - 6, top: 28, width: 12, height: 12, borderRadius: 6, background: ev.critical ? '#FCA5A5' : '#60A5FA', border: '2px solid white', cursor: 'pointer' };
                      return (
                        <div key={ev.id} style={style} title={`${ev.title} · ${ev.subtitle || ''} · ${ev.value ?? ''}`} onClick={() => setSelected(ev)}>
                          {isBlock ? <div className="text-xs font-semibold text-slate-900 truncate">{ev.title}</div> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* detail drawer */}
      {selected && (
        <div className="fixed right-6 top-20 w-[420px] bg-white border rounded-lg shadow-lg z-40">
          <div className="p-4 border-b flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold">{selected.title}</div>
              <div className="text-xs text-slate-500">{selected.subtitle} · {formatDateShort(selected.point ?? selected.start ?? selected.lastUpdated)}</div>
            </div>
            <div>
              <button className="text-sm text-slate-500" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>

          <div className="p-4">
            <div className="text-sm text-slate-700 mb-2">Value: <span className="font-medium">{typeof selected.value === 'object' ? (selected.value as any).value + ' ' + ((selected.value as any).unit || selected.unit || '') : String(selected.value ?? '—')}</span></div>
            <div className="text-sm text-slate-600 mb-2">Provenance: <span className="font-medium">{selected.provenance?.system}</span></div>
            <div className="text-sm text-slate-600 mb-2">Reference range: <span className="font-medium">{selected.referenceRange ? `${selected.referenceRange.low ?? '-'} - ${selected.referenceRange.high ?? '-'}` : '—'}</span></div>

            <details className="mt-3">
              <summary className="text-sm font-medium">Raw payload</summary>
              <pre className="mt-2 text-xs max-h-60 overflow-auto bg-slate-100 p-2 rounded">{JSON.stringify(selected.fhir?.snapshot ?? selected.fhir?.raw ?? selected, null, 2)}</pre>
            </details>

            <div className="mt-4 flex gap-2">
              <button className="px-3 py-1 bg-sky-600 text-white rounded" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(selected.fhir?.raw ?? selected)); }}>Copy JSON</button>
              <button className="px-3 py-1 border rounded" onClick={() => { /* open source record */ }}>Open Source</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
