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

const PHARMACIES = [
  { id: 'ph1', name: 'Main Street Pharmacy', addr: '123 Main St' },
  { id: 'ph2', name: 'City Care Pharmacy', addr: '456 Market Ave' },
  { id: 'ph3', name: 'Neighborhood Rx', addr: '789 Oak Rd' },
];

export default function PrescriptionComposerSerene({ patient }: { patient?: any }) {
  const [query, setQuery] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [selected, setSelected] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [selectedPharmacy, setSelectedPharmacy] = useState<string | null>(null);

  const [autosaveStatus, setAutosaveStatus] = useState<'idle'|'saving'|'saved'|'failed'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const autosaveTimer = useRef<any>(null);

  const draftKey = `prescDraft:${patient?.id || 'global'}`;
  const sentKey = `sentPrescriptions:${patient?.id || 'global'}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        setSelected(d.selected || []);
        setNotes(d.notes || '');
        setSelectedPharmacy(d.selectedPharmacy || null);
      }
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setAutosaveStatus('saving');
    autosaveTimer.current = setTimeout(() => {
      try {
        const payload = { selected, notes, selectedPharmacy, updatedAt: new Date().toISOString() };
        localStorage.setItem(draftKey, JSON.stringify(payload));
        setAutosaveStatus('saved');
        setLastSavedAt(new Date().toLocaleTimeString());
      } catch (e) {
        setAutosaveStatus('failed');
      }
    }, 900);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [selected, notes, selectedPharmacy, draftKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MED_CATALOG;
    return MED_CATALOG.filter(m => m.name.toLowerCase().includes(q) || (m.strength || '').toLowerCase().includes(q));
  }, [query]);

  function addMed(m: Med) {
    if (selected.some(s => s.id === m.id)) return;
    setSelected(s => [...s, { ...m, sig: `1 ${m.form} PO once daily`, quantity: 30 }]);
    setActiveStep(1);
  }

  function removeMed(id: string) {
    setSelected(s => s.filter(x => x.id !== id));
  }

  function finalize() {
    // simple local submit
    if (selected.length === 0) { alert('Add at least one medication'); return; }
    const order = { patientId: patient?.id || null, meds: selected, notes, pharmacy: selectedPharmacy, ts: Date.now() };
    try {
      const prev = JSON.parse(localStorage.getItem(sentKey) || '[]');
      localStorage.setItem(sentKey, JSON.stringify([order, ...prev].slice(0,50)));
      localStorage.removeItem(draftKey);
      setSelected([]);
      setNotes('');
      setSelectedPharmacy(null);
      setActiveStep(0);
      setTimeout(() => { alert('Prescription saved to local history (dev)'); }, 200);
    } catch (e) {
      alert('Failed to save prescription locally');
    }
  }

  const safetyState = useMemo(() => {
    // naive safety checks: allergy match or duplicate
    const warnings: string[] = [];
    try {
      const allergies = patient?.allergies || [];
      selected.forEach(s => {
        if (allergies.includes(s.name)) warnings.push(`Allergy match: ${s.name}`);
      });
      if (selected.length > 1) warnings.push('Multiple medications: review interactions');
    } catch (e) {}
    if (warnings.length === 0) return { level: 'safe', messages: ['All safety checks cleared.'] };
    return { level: 'warning', messages: warnings };
  }, [selected, patient]);

  return (
    <div style={{ background: '#FAFBFC' }} className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-6">
        {/* Stepper */}
        <div className="mb-6">
          <div className="flex items-center gap-6">
            {['Search','Details','Safety','Review'].map((label, i) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold ${i < activeStep ? 'bg-[#14B8A6] text-white' : i === activeStep ? 'bg-white text-[#0F172A] ring-4 ring-[#14B8A6]/20' : 'bg-gray-100 text-gray-600'}`}>
                  {i < activeStep ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                  ) : i+1}
                </div>
                <div className={`text-sm font-medium ${i === activeStep ? 'text-[#0F172A]' : 'text-gray-500'}`}>{label}</div>
                {i < 3 && <div className={`w-16 h-0.5 ${i < activeStep ? 'bg-[#14B8A6]' : 'bg-gray-200'} rounded`}></div>}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <main className="lg:col-span-8">
            {/* Search Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1016.65 16.65z"/></svg>
                </div>
                <input
                  className="h-14 w-full pl-14 pr-4 rounded-lg border border-slate-200 text-base placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#14B8A6]/20 transition"
                  placeholder="Search by Brand Name, Generic, or Condition..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {/* Results */}
              {query.trim() && (
                <div className="mt-4 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
                  {filtered.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-4 hover:bg-[#E6FFFA] transition-transform transform hover:-translate-y-0.5">
                      <div>
                        <div className="font-medium text-gray-900">{m.name} <span className="text-sm text-gray-500">{m.strength}</span></div>
                        <div className="text-xs text-gray-500">{m.form}</div>
                      </div>
                      <div>
                        <button onClick={() => addMed(m)} className="px-3 py-1 rounded-md bg-[#14B8A6] hover:bg-[#2DD4BF] text-white text-sm transition transform hover:-translate-y-0.5">Add</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Details Card */}
            <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A]">Prescription Details</h3>
                  <p className="mt-2 text-sm text-gray-600">Add SIG, quantity and refills. Live preview is below.</p>

                  <div className="mt-4 space-y-3">
                    {selected.length === 0 ? (
                      <div className="text-sm text-gray-500">No medications selected yet.</div>
                    ) : (
                      selected.map((s:any) => (
                        <div key={s.id} className="bg-[#FAFBFC] border border-gray-100 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-medium text-gray-900">{s.name} <span className="text-sm text-gray-500">{s.strength}</span></div>
                              <div className="mt-2">
                                <input value={s.sig || ''} onChange={(e)=>setSelected(sel => sel.map(x => x.id===s.id ? { ...x, sig: e.target.value } : x))} placeholder="SIG (e.g., 1 tablet PO twice daily)" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-[#14B8A6]/20" />
                                <div className="mt-2 flex gap-2">
                                  <input type="number" value={s.quantity || 30} onChange={(e)=>setSelected(sel => sel.map(x => x.id===s.id ? { ...x, quantity: Number(e.target.value) } : x))} className="w-28 rounded-md border border-gray-200 px-3 py-2 text-sm" />
                                  <input type="number" value={s.refills || 0} onChange={(e)=>setSelected(sel => sel.map(x => x.id===s.id ? { ...x, refills: Number(e.target.value) } : x))} className="w-28 rounded-md border border-gray-200 px-3 py-2 text-sm" />
                                  <button onClick={() => removeMed(s.id)} className="ml-auto text-sm text-red-600">Remove</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700">Live Preview</h4>
                  <div className="mt-3 p-4 rounded-lg bg-[#E0F2FE] border border-sky-100 text-sm">
                    {selected.length === 0 ? (
                      <div className="text-gray-500">Your plain-language instruction will appear here as you compose the prescription.</div>
                    ) : (
                      selected.map((s:any, i:number) => (
                        <div key={s.id} className="mb-2">
                          <div className="font-semibold text-gray-900 text-base">{s.name} {s.strength}</div>
                          <div className="text-sm text-gray-700">{s.sig || `Take as directed`} • Qty: {s.quantity || 30} • Refills: {s.refills || 0}</div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-6">
                    <label className="text-sm text-gray-500">Notes to pharmacy</label>
                    <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={3} />
                  </div>
                </div>
              </div>
            </div>

            {/* Review Card */}
            <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A]">Final Review</h3>
                  <p className="mt-2 text-sm text-gray-600">Confirm details before signing and sending.</p>
                </div>
                <div className="text-sm text-gray-500">{autosaveStatus === 'saving' ? 'Saving…' : (lastSavedAt ? `Saved at ${lastSavedAt}` : 'Saved')}</div>
              </div>

              <div className="mt-4 p-4 rounded-lg border-2 border-[#A7F3EB] bg-gradient-to-br from-white to-[#E6FFFA]">
                <div className="text-sm text-gray-700">
                  <div className="font-medium text-gray-900">Summary</div>
                  <div className="mt-2">
                    {selected.length === 0 ? <div className="text-gray-500">No medications selected.</div> : selected.map((s:any) => (
                      <div key={s.id} className="py-2">
                        <div className="text-base font-semibold">{s.name} {s.strength}</div>
                        <div className="text-sm text-gray-600">{s.sig || '—'} • Qty: {s.quantity || 30} • Refills: {s.refills || 0}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button onClick={() => setActiveStep(2)} className="px-4 py-2 rounded-md bg-white border border-gray-200 text-sm hover:shadow-md">Back</button>
                  <button onClick={() => { setActiveStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-4 py-2 rounded-md bg-[#14B8A6] text-white font-semibold hover:bg-[#2DD4BF] transition transform hover:-translate-y-0.5">Proceed to Send</button>
                </div>
              </div>
            </div>
          </main>

          <aside className="lg:col-span-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm lg:sticky lg:top-28">
              <h4 className="text-sm font-semibold text-gray-800">Patient Snapshot</h4>
              {patient && (
                <div className="mt-3">
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

              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-700">Pharmacies</h5>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  {PHARMACIES.map(ph => (
                    <div key={ph.id} onClick={() => setSelectedPharmacy(ph.id)} className={`p-3 rounded-lg border ${selectedPharmacy === ph.id ? 'border-[#14B8A6] bg-[#E6FFFA]' : 'border-gray-100 bg-white'} cursor-pointer hover:shadow-md transition`}> 
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{ph.name}</div>
                          <div className="text-xs text-gray-500">{ph.addr}</div>
                        </div>
                        {selectedPharmacy === ph.id && (
                          <div className="text-[#14B8A6]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <h5 className="text-sm font-medium text-gray-700">Safety</h5>
                <div className={`mt-3 rounded-lg p-3 ${safetyState.level === 'safe' ? 'bg-emerald-50 border-l-4 border-emerald-200' : 'bg-amber-50 border-l-4 border-amber-200'}`}>
                  {safetyState.messages.map((m:any,i:number) => <div key={i} className="text-sm text-gray-700">{m}</div>)}
                </div>
              </div>

              <div className="mt-6">
                <h5 className="text-sm font-medium text-gray-700">Recent (local)</h5>
                <div className="mt-2 text-sm text-gray-600">
                  {(typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem(sentKey) || '[]') || []) : []).slice(0,3).map((r:any, i:number) => (
                      <div key={i} className="mt-2 bg-gray-50 p-2 rounded">{r.meds.map((m:any)=>m.name).join(', ')}</div>
                    ))}
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button onClick={() => { setActiveStep(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex-1 px-3 py-2 rounded-md bg-white border border-gray-200">Cancel</button>
                <button onClick={() => { setActiveStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex-1 px-3 py-2 rounded-md bg-[#14B8A6] text-white">Review & Send</button>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer actions when on final step */}
        {activeStep === 3 && (
          <div className="fixed left-6 right-6 bottom-6 z-40">
            <div className="max-w-7xl mx-auto flex items-center justify-between bg-white p-3 rounded-xl shadow-md border border-gray-100">
              <div className="text-sm text-gray-600">Ready to sign and send</div>
              <div className="flex gap-3">
                <button onClick={() => { setActiveStep(2); }} className="px-4 py-2 rounded-md bg-white border border-gray-200">Back</button>
                <button onClick={() => finalize()} className="px-4 py-2 rounded-md bg-[#14B8A6] text-white font-semibold">Sign & Send</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
