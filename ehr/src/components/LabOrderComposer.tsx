'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { PatientBanner } from '@/design-system/clinical/PatientBanner';

type LabTest = {
  id: string;
  name: string;
  code: string;
  tat: string;
  panel?: boolean;
  trend?: number[];
  description?: string;
};

const LAB_CATALOG: LabTest[] = [
  { id: 'cmp', name: 'Comprehensive Metabolic Panel (CMP)', code: 'CMP', tat: '24h', panel: true, trend: [2.6, 2.8, 2.7], description: 'Glucose, BMP components' },
  { id: 'cbc', name: 'Complete Blood Count (CBC)', code: 'CBC', tat: '6h', panel: true, trend: [13, 13.5, 12.8], description: 'Hemoglobin, WBC, Platelets' },
  { id: 'trop', name: 'Troponin I', code: 'TNI', tat: '1h', trend: [0.01, 0.02, 0.03], description: 'Cardiac injury marker' },
  { id: 'lipid', name: 'Lipid Panel', code: 'LIPID', tat: '24h', trend: [2.6, 3.0, 2.8], description: 'Cholesterol profile' },
  { id: 'hba1c', name: 'Hemoglobin A1c', code: 'A1C', tat: '24h', trend: [6.1, 6.3, 6.0], description: 'Glycated hemoglobin' },
  { id: 'd_dimer', name: 'D-dimer', code: 'DDI', tat: '4h', trend: [0.3, 0.2, 0.25], description: 'Clot breakdown marker' },
];

export default function LabOrderComposer({ patient }: { patient?: any }) {
  const [tab, setTab] = useState<'catalog' | 'favorites' | 'recent' | 'sets'>('catalog');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<LabTest[]>([]);
  const [priority, setPriority] = useState<'Routine' | 'Urgent' | 'STAT'>('Routine');
  const [reason, setReason] = useState('');
  const [fasting, setFasting] = useState(false);
  const [location, setLocation] = useState('Main Lab');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    // load recent selections for this patient
    try {
      const raw = localStorage.getItem(`recentLabOrders:${patient?.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        // no-op for now
      }
    } catch (e) {
      // ignore
    }
  }, [patient]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LAB_CATALOG;
    return LAB_CATALOG.filter((t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
  }, [query]);

  function addTest(t: LabTest) {
    if (selected.some((s) => s.id === t.id)) {
      alert('Test already selected');
      return;
    }

    // duplicate detection: check recent orders for same test within 24h
    try {
      const recent = JSON.parse(localStorage.getItem(`sentLabOrders:${patient?.id}`) || '[]');
      const found = recent.find((r: any) => r.tests && r.tests.find((x: any) => x.id === t.id) && (Date.now() - r.ts) < 24 * 60 * 60 * 1000);
      if (found) {
        const ok = confirm(`A ${t.name} was ordered within the last 24 hours. Add anyway?`);
        if (!ok) return;
      }
    } catch (e) {
      // ignore
    }

    setSelected((s) => [...s, t]);
  }

  function removeTest(id: string) {
    setSelected((s) => s.filter((t) => t.id !== id));
  }

  function sendOrder() {
    if (selected.length === 0) {
      alert('Add at least one test to send');
      return;
    }
    const order = { patientId: patient?.id || null, tests: selected, priority, reason, fasting, location, ts: Date.now() };
    try {
      const key = `sentLabOrders:${patient?.id || 'global'}`;
      const prev = JSON.parse(localStorage.getItem(key) || '[]');
      localStorage.setItem(key, JSON.stringify([order, ...prev].slice(0, 50)));
      setSent(true);
      setSelected([]);
      setReason('');
      setFasting(false);
      setTimeout(() => setSent(false), 3000);
    } catch (e) {
      alert('Failed to send order (local storage error)');
    }
  }

  function sparkline(points?: number[]) {
    if (!points || points.length === 0) return null;
    const w = 80; const h = 24; const max = Math.max(...points); const min = Math.min(...points);
    const range = Math.max(1, max - min);
    const step = w / (points.length - 1);
    const path = points.map((p, i) => `${i * step},${h - ((p - min) / range) * h}`).join(' ');
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="inline-block align-middle">
        <polyline fill="none" stroke="#06b6d4" strokeWidth={1.5} points={path} />
      </svg>
    );
  }

  return (
    <div>
      {patient ? (
        <div className="sticky top-4 z-20">
          <PatientBanner mrn={patient.mrn} firstName={(patient.name||'').split(' ')[0]} lastName={(patient.name||'').split(' ').slice(1).join(' ')} dateOfBirth={patient.dob || ''} age={patient.age || 0} sex={(patient.gender||'Unknown') as any} allergies={patient.allergies || []} identifiers={[{ label: 'MRN', value: patient.mrn }]} verificationStatus="verified" />
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Catalog */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-800">Lab Catalog</h3>
                <div className="text-xs text-gray-500">Search by name or code</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:block">
                  <div className="inline-flex rounded-md bg-white shadow-sm">
                    <button onClick={() => setTab('catalog')} className={`px-3 py-1 text-sm ${tab === 'catalog' ? 'bg-teal-600 text-white' : 'text-gray-700'}`}>Catalog</button>
                    <button onClick={() => setTab('favorites')} className={`px-3 py-1 text-sm ${tab === 'favorites' ? 'bg-teal-600 text-white' : 'text-gray-700'}`}>Favorites</button>
                    <button onClick={() => setTab('recent')} className={`px-3 py-1 text-sm ${tab === 'recent' ? 'bg-teal-600 text-white' : 'text-gray-700'}`}>Recent</button>
                    <button onClick={() => setTab('sets')} className={`px-3 py-1 text-sm ${tab === 'sets' ? 'bg-teal-600 text-white' : 'text-gray-700'}`}>Order Sets</button>
                  </div>
                </div>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tests, e.g. Troponin" className="px-3 py-2 border border-gray-200 rounded-md text-sm w-80" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {filtered.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-md bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium text-gray-900">{t.name}</div>
                      <div className="text-xs text-gray-500">{t.code} • TAT: {t.tat} • {t.description}</div>
                    </div>
                    <div className="ml-4">{sparkline(t.trend)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500 mr-4">{t.panel ? 'Panel' : 'Single'}</div>
                    <button onClick={() => addTest(t)} className="px-3 py-1 rounded-md bg-teal-700 text-white text-sm">Add</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Summary */}
        <aside className="lg:col-span-5">
          <div className="bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-50 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Order Summary</h3>

            <div className="text-sm text-gray-600">{selected.length} test(s) selected</div>
            <div className="mt-2 space-y-2">
              {selected.length === 0 ? (
                <div className="text-sm text-gray-500">No tests selected</div>
              ) : (
                selected.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                    <div>
                      <div className="font-medium text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.code}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-500">TAT {s.tat}</div>
                      <button onClick={() => removeTest(s.id)} className="text-xs text-red-600">Remove</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs text-gray-500">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm">
                <option>Routine</option>
                <option>Urgent</option>
                <option>STAT</option>
              </select>
            </div>

            <div className="pt-2">
              <label className="block text-xs text-gray-500">Reason / Diagnosis (ICD-10)</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. R07.9" className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
            </div>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={fasting} onChange={(e) => setFasting(e.target.checked)} />
                <span className="text-sm text-gray-600">Fasting required</span>
              </label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="ml-auto px-3 py-2 border border-gray-200 rounded-md text-sm" />
            </div>

            <div className="pt-2">
              <button onClick={sendOrder} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 text-white px-4 py-2 text-sm font-semibold">Send to Lab</button>
            </div>

            {sent && <div className="text-sm text-green-700">Order sent — saved to local history.</div>}

            <div className="text-xs text-gray-400">Review the selected tests and submit. Orders attach to the current encounter when present.</div>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            <h4 className="font-semibold text-gray-700">Tips</h4>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Use Order Sets to add grouped tests quickly.</li>
              <li>Duplicate-order warnings appear for recent identical orders.</li>
              <li>Estimated turnaround times (TAT) help prioritize STAT orders.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
