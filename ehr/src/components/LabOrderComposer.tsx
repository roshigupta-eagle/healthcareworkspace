'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { PatientBanner } from '@/design-system/clinical/PatientBanner';

type LabTest = {
  id: string;
  name: string;
  code: string;
  tat?: string;
  panel?: boolean;
  description?: string;
};

const LAB_CATALOG: LabTest[] = [
  { id: 'cmp', name: 'Comprehensive Metabolic Panel (CMP)', code: 'CMP', tat: '24h', panel: true, description: 'Glucose, electrolytes, kidney & liver markers' },
  { id: 'cbc', name: 'Complete Blood Count (CBC)', code: 'CBC', tat: '6h', panel: true, description: 'Hemoglobin, WBC, Platelets' },
  { id: 'trop', name: 'Troponin I', code: 'TNI', tat: '1h', description: 'Cardiac injury marker' },
  { id: 'lipid', name: 'Lipid Panel', code: 'LIPID', tat: '24h', panel: true, description: 'Cholesterol and heart risk markers' },
  { id: 'hba1c', name: 'Hemoglobin A1c', code: 'A1C', tat: '24h', description: 'Diabetes control marker' },
  { id: 'd_dimer', name: 'D-dimer', code: 'DDI', tat: '4h', description: 'Clot breakdown marker' },
  { id: 'tsh', name: 'TSH (Thyroid Stimulating Hormone)', code: 'TSH', tat: '48h', description: 'Thyroid function' },
  { id: 'vitd', name: 'Vitamin D (25-OH)', code: 'VITD', tat: '48h', description: 'Vitamin D level' },
];

const COMMON_PANELS = ['cbc', 'lipid', 'hba1c', 'cmp'];

// Map panels to components (informational only)
const PANEL_COMPONENTS: Record<string, string[]> = {
  cmp: ['glucose', 'bun', 'creatinine', 'na', 'k', 'cl', 'ast', 'alt', 'alkphos', 'bilirubin'],
  cbc: ['hemoglobin', 'hematocrit', 'wbc', 'platelets'],
};

export default function LabOrderComposer({ patient }: { patient?: any }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);
  const [quickView, setQuickView] = useState<'Common'|'Favorites'|'Recent'|'Patient'|'Panels'|'All'>('Common');
  const [detailsTest, setDetailsTest] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All'|'Blood'|'Urine'|'Diabetes'|'Cardiology'|'Infection'|'Hormones'|'Vitamins'|'Kidney'|'Liver'>('All');
  const [selected, setSelected] = useState<any[]>([]);
  const [priority, setPriority] = useState<'Routine'|'Urgent'|'STAT'|'Future'>('Routine');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0,10));
  const [collectBy, setCollectBy] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [morning, setMorning] = useState(false);
  const [collectionType, setCollectionType] = useState<'Blood'|'Urine'|'Swab'|'Stool'|'Other'>('Blood');
  const [location, setLocation] = useState('Main Lab');
  const [fasting, setFasting] = useState(false);
  const [reason, setReason] = useState('');
  const [instructions, setInstructions] = useState('');

  // Autosave
  const [autosaveStatus, setAutosaveStatus] = useState<'idle'|'saving'|'saved'|'failed'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const autosaveTimer = useRef<any>(null);

  const [showPreview, setShowPreview] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [sent, setSent] = useState(false);

  const draftKey = `labDraft:${patient?.id || 'global'}`;
  const sentKey = `sentLabOrders:${patient?.id || 'global'}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        setSelected(d.selected || []);
        setPriority(d.priority || 'Routine');
        setOrderDate(d.orderDate || orderDate);
        setCollectBy(d.collectBy || '');
        setRepeat(!!d.repeat);
        setMorning(!!d.morning);
        setCollectionType(d.collectionType || 'Blood');
        setLocation(d.location || 'Main Lab');
        setFasting(!!d.fasting);
        setReason(d.reason || '');
        setInstructions(d.instructions || '');
      }
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setAutosaveStatus('saving');
    autosaveTimer.current = setTimeout(() => {
      try {
        const payload = { selected, priority, orderDate, collectBy, repeat, morning, collectionType, location, fasting, reason, instructions, updatedAt: new Date().toISOString() };
        localStorage.setItem(draftKey, JSON.stringify(payload));
        setAutosaveStatus('saved');
        setLastSavedAt(new Date().toLocaleTimeString());
      } catch (e) {
        setAutosaveStatus('failed');
      }
    }, 900);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [selected, priority, orderDate, collectBy, repeat, morning, collectionType, location, fasting, reason, instructions, draftKey]);

  // Keyboard: focus search when `/` pressed and not typing in inputs
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && (document.activeElement instanceof HTMLElement) && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = LAB_CATALOG.slice();
    if (q) list = list.filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
    // apply quickView filters
    if (quickView === 'Common') list = list.filter(l => COMMON_PANELS.includes(l.id));
    if (quickView === 'Panels') list = list.filter(l => l.panel);
    if (quickView === 'Patient') {
      const recentNames = (patient?.recentTests || []).map((r:string) => r.toLowerCase());
      list = list.filter(l => recentNames.some(rn => l.name.toLowerCase().includes(rn) || l.code.toLowerCase().includes(rn)));
    }
    // simple filter placeholder
    return list;
  }, [query, filter]);

  function highlightMatch(text: string) {
    const q = query.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);
    return (<>{before}<mark className="bg-yellow-100 text-yellow-800 px-0.5">{match}</mark>{after}</>);
  }

  function addTest(t: LabTest) {
    if (selected.some(s => s.id === t.id)) {
      // already selected
      setDetailsTest(t);
      return;
    }

    try {
      const recent = JSON.parse(localStorage.getItem(sentKey) || '[]');
      const found = recent.find((r: any) => r.tests && r.tests.find((x: any) => x.id === t.id) && (Date.now() - r.ts) < 24*60*60*1000);
      if (found) {
        if (!confirm(`${t.name} was ordered recently. Add anyway?`)) return;
      }
    } catch (e) {}

    const fastingRecommended = (t.code === 'LIPID');
    setSelected(s => [...s, { ...t, specimen: t.panel ? 'Blood' : 'Blood', fastingRecommended, note: '' }]);
  }

  function addPanel(panelId: string) {
    const item = LAB_CATALOG.find(t => t.id === panelId);
    if (item) addTest(item);
  }

  async function addTest(t: LabTest) {
    // check duplicates from server for this patient
    try {
      const pid = patient?.id;
      if (pid) {
        const res = await fetch(`/api/orders/labs?patientId=${encodeURIComponent(pid)}`);
        if (res.ok) {
          const body = await res.json();
          const recent = body.items || [];
          const found = recent.find((r:any) => r.tests && r.tests.find((x:any) => x.id === t.id) && (Date.now() - (r.ts||0)) < 24*60*60*1000);
          if (found) {
            if (!confirm(`${t.name} was ordered recently. Add anyway?`)) return;
          }
        }
      }
    } catch (e) {
      // ignore
    }
    if (selected.some(s => s.id === t.id)) {
      setDetailsTest(t);
      return;
    }
    const fastingRecommended = (t.code === 'LIPID');
    setSelected(s => [...s, { ...t, specimen: t.panel ? 'Blood' : 'Blood', fastingRecommended, note: '' }]);
  }

  function removeTest(id: string) {
    setSelected(s => s.filter(t => t.id !== id));
  }

  function generateInstructions() {
    if (selected.length === 0) return setInstructions('Please select tests to generate instructions.');
    const names = selected.map(s => s.name).join(', ');
    const needFast = selected.some(s => s.fastingRecommended) || fasting;
    const base = `Tests ordered: ${names}.`;
    const fast = needFast ? ' Please fast 8–12 hours prior to blood draw.' : '';
    const where = ` Go to ${location} for collection.`;
    setInstructions(base + fast + where);
  }

  function previewRequisition() {
    setShowPreview(true);
  }

  function confirmSubmit() {
    setShowReview(true);
  }

  async function submitOrderFinal() {
    if (selected.length === 0) { alert('Add at least one test before submitting'); return; }
    const order = { patientId: patient?.id || null, tests: selected, priority, reason, fasting, collectionType, location, orderDate, collectBy, repeat, morning, instructions, ts: Date.now() };
    try {
      setSubmitting(true);
      setAutosaveStatus('saving');
      const token = getOrCreateIdempotency();
      const res = await fetch('/api/orders/labs', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': token }, body: JSON.stringify(order) });
      if (!res.ok) throw new Error('failed');
      const body = await res.json();
      // success
      localStorage.removeItem(draftKey);
      setSelected([]);
      setReason('');
      setFasting(false);
      setInstructions('');
      setShowReview(false);
      setSent(true);
      setAutosaveStatus('saved');
      setLastSavedAt(new Date().toLocaleTimeString());
      // show order id
      alert(`Order submitted: ${body.orderId}`);
      setTimeout(() => setSent(false), 2500);
      setSubmitting(false);
    } catch (e) {
      setSubmitting(false);
      setAutosaveStatus('failed');
      alert('Failed to submit order');
    }
  }

  const recentSent = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(sentKey) || '[]'); } catch { return []; }
  }, [sentKey, sent]);

  const safetyWarnings = useMemo(() => {
    const w: string[] = [];
    if (selected.length === 0) w.push('No tests selected');
    if (!reason) w.push('No clinical reason provided');
    try {
      const recent = JSON.parse(localStorage.getItem(sentKey) || '[]');
      selected.forEach(s => {
        const found = recent.find((r: any) => r.tests && r.tests.find((t: any) => t.id === s.id) && (Date.now() - r.ts) < 7*24*60*60*1000);
        if (found) w.push(`${s.name} was ordered recently`);
      });
    } catch (e) {}
    return Array.from(new Set(w));
  }, [selected, reason, sentKey]);

  function focusForIssue(issue: string) {
    if (issue.includes('reason')) {
      reasonRef.current?.focus();
      reasonRef.current?.scrollIntoView({ block: 'center' });
    }
    if (issue.includes('Select') || issue.includes('tests')) {
      inputRef.current?.focus();
    }
  }

  // grouped selected by specimen
  const groupedSelected = useMemo(() => {
    const map: Record<string, any[]> = {};
    selected.forEach((s:any) => {
      const k = s.specimen || 'Other';
      map[k] = map[k] || [];
      map[k].push(s);
    });
    return map;
  }, [selected]);

  function getOrCreateIdempotency() {
    if (idempotencyKey) return idempotencyKey;
    const key = `idem-${Date.now().toString(36)}-${Math.floor(Math.random()*100000).toString(36)}`;
    setIdempotencyKey(key);
    return key;
  }

  const patientRisk = useMemo(() => {
    try {
      if (!patient) return 'Routine';
      const ageHigh = (patient.age || 0) >= 65;
      const conds = (patient.conditions || []).join(' ').toLowerCase();
      const hasRisk = ageHigh || /diabetes|hypertension|cardio|heart|renal|kidney/.test(conds);
      return hasRisk ? 'High' : 'Routine';
    } catch (e) { return 'Routine'; }
  }, [patient]);

  const relevantRecent = useMemo(() => {
    try {
      const recent = patient?.recentTests || [];
      if (!selected || selected.length === 0) return (recent || []).slice(0,3);
      const sels = selected.map(s => (s.code || s.name || '').toLowerCase());
      return (recent || []).filter((r:any) => sels.some(s => (r || '').toLowerCase().includes(s))).slice(0,3);
    } catch (e) { return (patient?.recentTests || []).slice(0,3); }
  }, [patient?.recentTests, selected]);

  const canSubmit = useMemo(() => {
    return selected.length > 0 && reason.trim().length > 0;
  }, [selected, reason]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Top header */}
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={patient ? `/dashboard/records/${patient.id}` : '/dashboard/records'} className="text-sm text-teal-700 hover:underline">← Back to Patient</Link>
            <h1 className="text-2xl font-semibold text-gray-900">Order Lab</h1>
            <span className="sr-only">for patient</span>
            {patient && <div className="ml-2 text-sm text-gray-600">{patient.name}</div>}
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">Draft</div>
            <div className="text-sm text-gray-500" aria-live="polite">{autosaveStatus === 'saving' ? 'Saving…' : (lastSavedAt ? `Saved at ${lastSavedAt}` : 'Saved')}</div>
          </div>
        </div>

        {/* Patient banner (premium) */}
        {patient && (
          <div className="mb-6">
            <div className="bg-white rounded-2xl p-3 shadow-sm border-l-4 border-teal-200">
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
                className="rounded-lg bg-white"
              />
            </div>
          </div>
        )}

        {/* Clinical reminder / readiness */}
        <div className="mb-6">
          {safetyWarnings.length > 0 ? (
            <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚠️</div>
                <div>
                  <div className="font-semibold">Before submitting</div>
                  <div className="mt-1 text-sm">Please review these items before submitting the lab order.</div>
                  <ul className="mt-2 list-disc ml-5">
                    {safetyWarnings.map((w,i) => (
                      <li key={i}>
                        <button onClick={() => focusForIssue(w)} className="text-amber-800 underline text-left">{w}</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-gradient-to-r from-teal-50 to-white border border-teal-100 p-4 text-sm text-teal-800">
              <div className="flex items-center gap-3">
                <div className="text-2xl">✅</div>
                <div>
                  <div className="font-semibold">Ready for review</div>
                  <div className="mt-1 text-sm text-gray-600">Lab order appears ready for clinician review. Preview before submitting.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress stepper */}
        <div className="mb-6">
          <nav aria-label="Lab order steps" className="flex items-center gap-3 overflow-x-auto py-1">
            {['Search','Select Tests','Details','Safety','Review','Submit'].map((label, idx) => {
              const completed = (idx === 0 && (query.trim().length>0 || selected.length>0)) ||
                                (idx === 1 && selected.length>0) ||
                                (idx === 2 && reason.trim().length>0 && collectionType) ||
                                (idx === 3 && safetyWarnings.length===0) ||
                                (idx >= 4 && safetyWarnings.length===0 && selected.length>0 && reason.trim().length>0);
              return (
                <button key={label} className={`flex items-center gap-2 px-3 py-1 rounded-full ${completed ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}`} aria-current={completed ? 'step' : undefined}>
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full text-xs bg-white text-gray-700">{completed ? '✓' : idx+1}</span>
                  <span className="text-sm font-medium">{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <main className="lg:col-span-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <label htmlFor="lab-search" className="sr-only">Search lab tests</label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      <input id="lab-search" ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search test, panel, synonym, code or clinical keyword..." className="w-full max-w-3xl text-sm pl-11 pr-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
                    </div>
                    <div className="mt-3 text-xs text-gray-500 flex items-center gap-2 flex-wrap">Popular: <span className="ml-2 inline-flex gap-2">{['CBC','A1C','Lipid','CMP','Troponin'].map(s => (<button key={s} onClick={() => setQuery(s)} className="px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-700">{s}</button>))}</span></div>
                    {/* Quick views */}
                    <div className="mt-3 flex items-center gap-2">
                      {['Common','Favorites','Recent','Patient','Panels','All'].map((v) => (
                        <button key={v} onClick={() => setQuickView(v as any)} className={`px-3 py-1 text-xs rounded ${quickView===v ? 'bg-teal-700 text-white' : 'bg-white text-gray-700 border border-gray-100'}`}>{v}</button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 lg:flex-none">
                    <div className="filter-chips flex gap-2 flex-wrap max-w-full">
                      {['All','Blood','Urine','Diabetes','Cardiology','Infection','Hormones','Vitamins','Kidney','Liver'].map((f) => (
                        <button key={f} onClick={() => setFilter(f as any)} aria-pressed={filter===f} className={`px-3 py-1 rounded-full text-xs ${filter===f ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-700'} focus:outline-none focus:ring-2 focus:ring-teal-200`}>{f}</button>
                      ))}
                    </div>
                  </div>
                </div>

              {/* Common panels */}
                  <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700">Common panels</h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {COMMON_PANELS.map((id) => {
                    const t = LAB_CATALOG.find(x => x.id === id);
                    if (!t) return null;
                    return (
                      <div key={t.id} className="p-4 rounded-lg bg-white border border-gray-100 flex items-center gap-4 hover:shadow-sm transition">
                        <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 font-semibold">{t.code}</div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{t.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{t.description}</div>
                          <div className="text-xs text-gray-400 mt-2">Blood • TAT: {t.tat || '—'}</div>
                        </div>
                        <div>
                          <button onClick={() => addPanel(t.id)} className="ml-4 px-3 py-1 rounded-md bg-teal-600 text-white text-sm hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200">Add</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Catalog results */}
                  <div className="mt-6 space-y-3">
                {filtered.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-md bg-white border border-gray-100 hover:shadow-sm transition">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-semibold">{t.code}</div>
                      <div>
                        <div className="font-medium text-gray-900 cursor-pointer" role="button" tabIndex={0} onClick={() => setDetailsTest(t)} onKeyDown={(e)=>{ if(e.key==='Enter') setDetailsTest(t); }}>{highlightMatch(t.name) as any}</div>
                        <div className="text-xs text-gray-500">{t.description}</div>
                        <div className="text-xs text-gray-400 mt-1">{t.code} • {t.tat ? `TAT: ${t.tat}` : 'TAT: —'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {t.panel && <div className="text-xs text-gray-500 px-2 py-1 rounded-md border">Panel</div>}
                      <button onClick={() => addTest(t)} className="px-3 py-1 rounded-md bg-teal-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-200">Add</button>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Selected tests + details */}
            <div className="mt-6 bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Selected Tests</h3>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-500">{selected.length} selected</div>
                  {selected.length > 0 && (
                    <button onClick={() => setSelected([])} className="text-sm text-amber-700 bg-amber-50 px-3 py-1 rounded">Clear all</button>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {selected.length === 0 ? (
                  <div className="text-sm text-gray-500">No lab tests selected yet. Search or choose a common panel to begin.</div>
                ) : (
                  Object.entries(groupedSelected).map(([specimen, items]) => (
                    <div key={specimen} className="bg-gray-50 p-3 rounded-md">
                      <div className="text-sm font-medium text-gray-700 mb-2">Specimen: {specimen}</div>
                      <div className="space-y-2">
                        {items.map((s:any) => (
                          <div key={s.id} className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm">
                            <div>
                              <div className="font-medium text-gray-900">{s.name}</div>
                              <div className="text-xs text-gray-500">{s.code}</div>
                              <div className="mt-1 flex items-center gap-2">
                                {s.fastingRecommended && <span className="text-xs text-amber-700">Fasting recommended</span>}
                                <span className="text-xs text-emerald-700">Status: {recentSent.some(r => r.tests.find((t:any)=>t.id===s.id)) ? 'Recent order' : 'No duplicate'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button onClick={() => setDetailsTest(s)} className="text-sm text-teal-700 hover:underline">Details</button>
                              <button onClick={() => removeTest(s.id)} className="text-sm text-red-600 hover:underline">Remove</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500">Reason for order</label>
                  <textarea ref={reasonRef} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Clinical rationale" className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={3} />
                </div>

                <div>
                  <label className="block text-xs text-gray-500">Specimen</label>
                  <select value={collectionType} onChange={(e) => setCollectionType(e.target.value as any)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm">
                    <option>Blood</option>
                    <option>Urine</option>
                    <option>Swab</option>
                    <option>Stool</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500">Collection location</label>
                  <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="text-xs text-gray-500">Priority</label>
                  <div className="mt-1 inline-flex rounded-md bg-gray-100 p-1">
                    {['Routine','Urgent','STAT','Future'].map((p) => (
                      <button key={p} onClick={() => setPriority(p as any)} aria-pressed={priority===p} className={`px-3 py-1 text-sm rounded-md ${priority===p ? 'bg-teal-700 text-white' : 'text-gray-700'}`}>{p}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500">Order date</label>
                  <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
                </div>

                <div>
                  <label className="text-xs text-gray-500">Collect by</label>
                  <input type="date" value={collectBy} onChange={(e) => setCollectBy(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
                </div>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} /> Repeat order</label>
                  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={morning} onChange={(e) => setMorning(e.target.checked)} /> Morning collection preferred</label>
                </div>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={fasting} onChange={(e) => setFasting(e.target.checked)} /> Fasting required</label>
                  <div className="ml-auto text-xs text-gray-400">TATs shown in catalog help prioritize STAT</div>
                </div>

              </div>

              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700">Patient instructions</h4>
                <div className="mt-2">
                  <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Patient-friendly instructions" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={3} />
                  <div className="mt-2 flex gap-2">
                    <button onClick={generateInstructions} className="px-3 py-1 rounded-md bg-white border border-gray-200 text-sm">Generate simple patient instructions</button>
                    <button onClick={() => setInstructions('')} className="px-3 py-1 rounded-md bg-white border border-gray-200 text-sm">Clear</button>
                  </div>
                </div>
              </div>

            </div>

          </main>

          {/* Right Sidebar */}
          <aside className="lg:col-span-4">
            <div className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-gray-50 lg:sticky lg:top-28">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Patient snapshot</h3>
                  <div className="text-xs text-gray-500">{patient?.name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">Verified</div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${patientRisk==='High' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>{patientRisk} risk</div>
                </div>
              </div>

              <div className="mt-3 text-sm text-gray-700 space-y-2">
                <div><strong>Allergies:</strong> {(patient?.allergies || []).length ? (patient.allergies.join(', ')) : 'No known allergies'}</div>
                <div><strong>Conditions:</strong> {(patient?.conditions || []).length ? patient.conditions.join(', ') : '—'}</div>
                <div><strong>Medications:</strong> {(patient?.medications || []).length ? patient.medications.map((m:any) => m.name).join(', ') : '—'}</div>
              </div>

              <div className="mt-4">
                <h4 className="text-xs font-semibold text-gray-500">Recent lab results</h4>
                <div className="mt-2 text-sm text-gray-700">
                  {(relevantRecent || []).length === 0 ? (
                    <div className="text-sm text-gray-500">No recent lab results</div>
                  ) : (
                    (relevantRecent || []).map((r:any) => (
                      <div key={r} className="flex items-center justify-between py-1">
                        <div className="text-sm">{r}</div>
                        <div className="text-xs text-gray-500">{new Date().toLocaleDateString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-xs font-semibold text-gray-500">Clinical safety</h4>
                <div className="mt-2 text-sm text-gray-700">
                  {selected.length === 0 ? <div className="text-sm text-gray-500">Select tests to see safety checks</div> : (
                    <div className="space-y-2">
                      {selected.map((s:any) => (
                        <div key={s.id} className="py-1 flex justify-between items-center">
                          <div className="text-sm">{s.name}</div>
                          <div className="text-xs text-gray-500">{s.fastingRecommended ? 'Fasting' : '—'}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 text-xs text-gray-500">Duplicate warnings and recent results shown here. Review before submitting.</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify({ patient: patient?.id })); alert('Snapshot copied'); }} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Copy snapshot</button>
                <button onClick={() => window.open(`/dashboard/records/${patient?.id}`, '_self')} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">View full chart</button>
              </div>

            </div>

            <div className="mt-4 text-sm text-gray-500">
              <h4 className="font-semibold text-gray-700">Recent orders (local)</h4>
              {recentSent.length === 0 ? <div className="text-sm text-gray-500">No recent orders</div> : recentSent.slice(0,5).map((o:any, i:number) => (
                <div key={i} className="mt-2 bg-gray-50 p-2 rounded">
                  <div className="text-xs text-gray-700">{new Date(o.ts).toLocaleString()}</div>
                  <div className="text-sm text-gray-900">{o.tests.map((t:any)=>t.code).join(', ')}</div>
                </div>
              ))}
            </div>

          </aside>

        </div>

        {/* Bottom sticky action bar */}
        <div className="fixed left-6 right-6 bottom-6 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between backdrop-blur-md bg-white/90 p-3 rounded-xl shadow-md border border-gray-100">
            <div className="text-sm text-gray-600">
              <span className="inline-flex items-center gap-3">
                <span className="px-2 py-1 rounded bg-gray-100 text-xs">Draft</span>
                <span aria-live="polite">{autosaveStatus === "saving" ? "Saving…" : (lastSavedAt ? "Saved at " + lastSavedAt : "Saved") }</span>
              </span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { window.history.back(); }} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => { try { const payload = { selected, priority, orderDate, collectBy, repeat, morning, collectionType, location, fasting, reason, instructions, updatedAt: new Date().toISOString() }; localStorage.setItem(draftKey, JSON.stringify(payload)); setAutosaveStatus('saved'); setLastSavedAt(new Date().toLocaleTimeString()); alert('Draft saved'); } catch (e) { alert('Failed to save draft'); } }} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Save Draft</button>
              <button onClick={previewRequisition} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Preview Requisition</button>
              <button onClick={confirmSubmit} disabled={!canSubmit || submitting} className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold ${canSubmit && !submitting ? 'bg-teal-700 text-white hover:bg-teal-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Submit Lab Order</button>
            </div>
          </div>
          {!canSubmit && (
            <div className="max-w-7xl mx-auto mt-2 text-xs text-amber-700 bg-amber-50 rounded-b-lg p-2 px-4">Select tests and add a clinical reason before submitting.</div>
          )}
        </div>

        {/* Preview modal */}
        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowPreview(false)} />
            <div className="relative bg-white rounded-lg p-6 shadow-lg w-full max-w-2xl">
              <h3 className="text-lg font-semibold">Requisition Preview</h3>
              <div className="mt-4 text-sm text-gray-700">
                <div><strong>Patient:</strong> {patient?.name}</div>
                <div className="mt-2"><strong>Tests:</strong> {selected.map(s=>s.name).join(', ') || '—'}</div>
                <div className="mt-2"><strong>Instructions:</strong> {instructions || '—'}</div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button onClick={() => setShowPreview(false)} className="px-3 py-2 rounded bg-white border">Close</button>
                <button onClick={() => { window.print(); }} className="px-3 py-2 rounded bg-teal-700 text-white">Print</button>
              </div>
            </div>
          </div>
        )}

        {/* Review modal */}
        {showReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowReview(false)} />
            <div className="relative bg-white rounded-lg p-6 shadow-lg w-full max-w-2xl">
              <h3 className="text-lg font-semibold">Review Lab Order Before Submitting</h3>
              <div className="mt-4 text-sm text-gray-700">
                <div><strong>Patient:</strong> {patient?.name}</div>
                <div className="mt-2"><strong>Tests:</strong> {selected.map(s=>s.name).join(', ') || '—'}</div>
                <div className="mt-2"><strong>Priority:</strong> {priority}</div>
                <div className="mt-2"><strong>Reason:</strong> {reason || '—'}</div>
                <div className="mt-2"><strong>Collection:</strong> {collectionType} • {location}</div>
                <div className="mt-2"><strong>Instructions:</strong> {instructions || '—'}</div>
                <div className="mt-4 text-sm text-red-600">
                  {selected.length === 0 && <div>- No tests selected</div>}
                  {!reason && <div>- No clinical reason provided</div>}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button onClick={() => setShowReview(false)} className="px-3 py-2 rounded bg-white border">Go back</button>
                <button onClick={submitOrderFinal} disabled={submitting} className={`px-3 py-2 rounded ${submitting ? 'bg-gray-300 text-gray-600' : 'bg-teal-700 text-white'}`}>{submitting ? 'Submitting…' : 'Confirm & Submit'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Details modal */}
        {detailsTest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDetailsTest(null)} />
            <div className="relative bg-white rounded-lg p-6 shadow-lg w-full max-w-md">
              <h3 className="text-lg font-semibold">{detailsTest.name}</h3>
              <div className="mt-2 text-sm text-gray-700">{detailsTest.description}</div>
              <div className="mt-3 text-xs text-gray-500">Code: {detailsTest.code} • TAT: {detailsTest.tat || '—'}</div>
              {detailsTest.panel && PANEL_COMPONENTS[detailsTest.id] && (
                <div className="mt-3">
                  <div className="text-sm font-medium">Components</div>
                  <ul className="mt-1 list-disc ml-5 text-sm text-gray-700">{PANEL_COMPONENTS[detailsTest.id].map(c => <li key={c}>{c}</li>)}</ul>
                </div>
              )}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button onClick={() => setDetailsTest(null)} className="px-3 py-2 rounded bg-white border">Close</button>
                {selected.some(s=>s.id===detailsTest.id) ? (
                  <button onClick={() => { removeTest(detailsTest.id); setDetailsTest(null); }} className="px-3 py-2 rounded bg-red-600 text-white">Remove</button>
                ) : (
                  <button onClick={() => { void addTest(detailsTest); setDetailsTest(null); }} className="px-3 py-2 rounded bg-teal-700 text-white">Add</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sent toast */}
        {sent && (
          <div className="fixed right-6 bottom-24 z-50">
            <div className="bg-white p-3 rounded shadow border border-gray-100">Order sent — saved to local history.</div>
          </div>
        )}

      </div>
    </div>
  );
}

