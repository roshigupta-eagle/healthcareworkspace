"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { PatientBanner } from '@/design-system/clinical/PatientBanner';

type Med = { id: string; name: string; form?: string; strength?: string };

const MED_CATALOG: Med[] = [
  { id: 'acet', name: 'Acetaminophen', form: 'tablet', strength: '500 mg' },
  { id: 'ibu', name: 'Ibuprofen', form: 'tablet', strength: '200 mg' },
  { id: 'amox', name: 'Amoxicillin', form: 'capsule', strength: '500 mg' },
  { id: 'ator', name: 'Atorvastatin', form: 'tablet', strength: '20 mg' },
  { id: 'met', name: 'Metformin', form: 'tablet', strength: '500 mg' },
  { id: 'lisin', name: 'Lisinopril', form: 'tablet', strength: '10 mg' },
];

export default function PrescriptionComposer({ patient }: { patient?: any }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(30);
  const [refills, setRefills] = useState(0);
  const [route, setRoute] = useState('Oral');
  const [frequency, setFrequency] = useState('Once daily');

  const [autosaveStatus, setAutosaveStatus] = useState<'idle'|'saving'|'saved'|'failed'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const autosaveTimer = useRef<any>(null);

  const [showPreview, setShowPreview] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [sent, setSent] = useState(false);

  const draftKey = `prescDraft:${patient?.id || 'global'}`;
  const sentKey = `sentPrescriptions:${patient?.id || 'global'}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        setSelected(d.selected || []);
        setNotes(d.notes || '');
        setQuantity(d.quantity || 30);
        setRefills(d.refills || 0);
        setRoute(d.route || 'Oral');
        setFrequency(d.frequency || 'Once daily');
      }
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setAutosaveStatus('saving');
    autosaveTimer.current = setTimeout(() => {
      try {
        const payload = { selected, notes, quantity, refills, route, frequency, updatedAt: new Date().toISOString() };
        localStorage.setItem(draftKey, JSON.stringify(payload));
        setAutosaveStatus('saved');
        setLastSavedAt(new Date().toLocaleTimeString());
      } catch (e) {
        setAutosaveStatus('failed');
      }
    }, 900);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [selected, notes, quantity, refills, route, frequency, draftKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MED_CATALOG;
    return MED_CATALOG.filter(m => m.name.toLowerCase().includes(q) || (m.strength||'').toLowerCase().includes(q));
  }, [query]);

  function addMed(m: Med) {
    if (selected.some(s => s.id === m.id)) return;
    setSelected(s => [...s, { ...m, sig: '', quantity, refills, route, frequency }]);
  }

  function removeMed(id: string) {
    setSelected(s => s.filter(x => x.id !== id));
  }

  function preview() { setShowPreview(true); }
  function confirmSend() { setShowReview(true); }

  function submitFinal() {
    if (selected.length === 0) { alert('Add at least one medication'); return; }
    const order = { patientId: patient?.id || null, meds: selected, notes, ts: Date.now() };
    try {
      const prev = JSON.parse(localStorage.getItem(sentKey) || '[]');
      localStorage.setItem(sentKey, JSON.stringify([order, ...prev].slice(0,50)));
      localStorage.removeItem(draftKey);
      setSelected([]);
      setNotes('');
      setShowReview(false);
      setSent(true);
      setTimeout(() => setSent(false), 2500);
    } catch (e) { alert('Failed to save prescription locally'); }
  }

  const recent = useMemo(() => { try { return JSON.parse(localStorage.getItem(sentKey) || '[]'); } catch { return []; } }, [sentKey, sent]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={patient ? `/dashboard/records/${patient.id}` : '/dashboard/records'} className="text-sm text-teal-700 hover:underline">← Back to Patient</Link>
            <h1 className="text-2xl font-semibold text-gray-900">Prescribe</h1>
            {patient && <div className="ml-2 text-sm text-gray-600">{patient.name}</div>}
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">Draft</div>
            <div className="text-sm text-gray-500" aria-live="polite">{autosaveStatus === 'saving' ? 'Saving…' : (lastSavedAt ? `Saved at ${lastSavedAt}` : 'Saved')}</div>
          </div>
        </div>

        {patient && (
          <div className="mb-6">
            <PatientBanner
              mrn={patient.mrn}
              firstName={(patient.name||'').split(' ')[0]}
              lastName={(patient.name||'').split(' ').slice(1).join(' ')}
              dateOfBirth={patient.dob || ''}
              age={patient.age || 0}
              sex={(patient.gender||'Unknown') as any}
              allergies={patient.allergies || []}
              identifiers={[{ label: 'MRN', value: patient.mrn }]}
              verificationStatus="verified"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <main className="lg:col-span-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <label htmlFor="med-search" className="sr-only">Search medications</label>
              <input id="med-search" value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search medications by name or strength..." className="w-full text-sm px-4 py-3 border border-gray-200 rounded-lg shadow-sm" />

              <div className="mt-4 space-y-3">
                {filtered.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-md bg-white border border-gray-100">
                    <div>
                      <div className="font-medium text-gray-900">{m.name} {m.strength ? `• ${m.strength}` : ''}</div>
                      <div className="text-xs text-gray-500">{m.form}</div>
                    </div>
                    <div>
                      <button onClick={() => addMed(m)} className="px-3 py-1 rounded-md bg-teal-700 text-white text-sm">Add</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800">Selected Medications</h3>
              <div className="mt-4 space-y-3">
                {selected.length === 0 ? (
                  <div className="text-sm text-gray-500">No medications selected yet.</div>
                ) : (
                  selected.map((s:any) => (
                    <div key={s.id} className="flex items-start justify-between bg-gray-50 p-3 rounded-md">
                      <div className="w-full">
                        <div className="font-medium text-gray-900">{s.name} {s.strength ? `• ${s.strength}` : ''}</div>
                        <div className="text-xs text-gray-500">{s.form}</div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <input value={s.sig || ''} onChange={(e)=>setSelected(sel => sel.map(x => x.id===s.id ? { ...x, sig: e.target.value } : x))} placeholder="SIG (e.g., 1 tablet PO q8h prn)" className="block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
                          <input type="number" value={s.quantity || quantity} onChange={(e)=>setSelected(sel => sel.map(x => x.id===s.id ? { ...x, quantity: Number(e.target.value) } : x))} className="block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
                        </div>
                        <div className="mt-2 text-xs text-gray-500">Refills: <input type="number" value={s.refills || refills} onChange={(e)=>setSelected(sel => sel.map(x => x.id===s.id ? { ...x, refills: Number(e.target.value) } : x))} className="inline-block w-20 ml-2 rounded-md border border-gray-200 px-2 py-1 text-sm" /></div>
                      </div>
                      <div className="ml-4 flex flex-col gap-2">
                        <button onClick={() => removeMed(s.id)} className="text-xs text-red-600">Remove</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6">
                <label className="block text-xs text-gray-500">Notes to Pharmacy</label>
                <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={3} />
              </div>
            </div>

          </main>

          <aside className="lg:col-span-4">
            <div className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-gray-50 lg:sticky lg:top-28">
              <h3 className="text-sm font-semibold text-gray-800">Patient snapshot</h3>
              <div className="text-sm text-gray-700 mt-3 space-y-2">
                <div><strong>Allergies:</strong> {(patient?.allergies || []).join(', ') || 'None'}</div>
                <div><strong>Conditions:</strong> {(patient?.conditions || []).join(', ') || '—'}</div>
                <div><strong>Medications:</strong> {(patient?.medications || []).map((m:any) => m.name).join(', ') || '—'}</div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify({ patient: patient?.id })); alert('Snapshot copied'); }} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Copy snapshot</button>
                <button onClick={() => window.open(`/dashboard/records/${patient?.id}`, '_self')} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">View full chart</button>
              </div>

              <div className="mt-4 text-sm text-gray-500">
                <h4 className="font-semibold text-gray-700">Recent prescriptions (local)</h4>
                {recent.length === 0 ? <div className="text-sm text-gray-500">No recent prescriptions</div> : recent.slice(0,5).map((o:any, i:number) => (
                  <div key={i} className="mt-2 bg-gray-50 p-2 rounded">
                    <div className="text-xs text-gray-700">{new Date(o.ts).toLocaleString()}</div>
                    <div className="text-sm text-gray-900">{o.meds.map((m:any)=>m.name).join(', ')}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <div className="fixed left-6 right-6 bottom-6 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between bg-white p-3 rounded-xl shadow-md border border-gray-100">
            <div className="text-sm text-gray-600">
              <span className="inline-flex items-center gap-3">
                <span className="px-2 py-1 rounded bg-gray-100 text-xs">Draft</span>
                <span aria-live="polite">{autosaveStatus === 'saving' ? 'Saving…' : (lastSavedAt ? 'Saved at ' + lastSavedAt : 'Saved')}</span>
              </span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { window.history.back(); }} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => { try { const payload = { selected, notes, quantity, refills, route, frequency, updatedAt: new Date().toISOString() }; localStorage.setItem(draftKey, JSON.stringify(payload)); setAutosaveStatus('saved'); setLastSavedAt(new Date().toLocaleTimeString()); alert('Draft saved'); } catch (e) { alert('Failed to save draft'); } }} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Save Draft</button>
              <button onClick={preview} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Preview</button>
              <button onClick={confirmSend} className="inline-flex items-center gap-2 rounded-md bg-teal-700 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-600">Send Prescription</button>
            </div>
          </div>
        </div>

        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowPreview(false)} />
            <div className="relative bg-white rounded-lg p-6 shadow-lg w-full max-w-2xl">
              <h3 className="text-lg font-semibold">Prescription Preview</h3>
              <div className="mt-4 text-sm text-gray-700">
                <div><strong>Patient:</strong> {patient?.name}</div>
                <div className="mt-2"><strong>Meds:</strong> {selected.map(s=>s.name).join(', ') || '—'}</div>
                <div className="mt-2"><strong>Notes:</strong> {notes || '—'}</div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button onClick={() => setShowPreview(false)} className="px-3 py-2 rounded bg-white border">Close</button>
                <button onClick={() => { window.print(); }} className="px-3 py-2 rounded bg-teal-700 text-white">Print</button>
              </div>
            </div>
          </div>
        )}

        {showReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowReview(false)} />
            <div className="relative bg-white rounded-lg p-6 shadow-lg w-full max-w-2xl">
              <h3 className="text-lg font-semibold">Review Prescription Before Sending</h3>
              <div className="mt-4 text-sm text-gray-700">
                <div><strong>Patient:</strong> {patient?.name}</div>
                <div className="mt-2"><strong>Meds:</strong> {selected.map(s=>s.name).join(', ') || '—'}</div>
                <div className="mt-2"><strong>Notes:</strong> {notes || '—'}</div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button onClick={() => setShowReview(false)} className="px-3 py-2 rounded bg-white border">Go back</button>
                <button onClick={submitFinal} className="px-3 py-2 rounded bg-teal-700 text-white">Confirm & Send</button>
              </div>
            </div>
          </div>
        )}

        {sent && (
          <div className="fixed right-6 bottom-24 z-50">
            <div className="bg-white p-3 rounded shadow border border-gray-100">Prescription sent — saved to local history.</div>
          </div>
        )}

      </div>
    </div>
  );
}
