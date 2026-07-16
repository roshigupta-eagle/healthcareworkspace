'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PatientBanner } from '@/design-system/clinical/PatientBanner';
import { useRouter } from 'next/navigation';
import CalBookingClient from '@/app/dashboard/appointments/CalBookingClient';

export default function EncounterEditor({ patient }: { patient: any }) {
  const router = useRouter();
  const names = (patient.name || '').split(' ');
  const firstName = names[0] || '';
  const lastName = names.slice(1).join(' ') || '';

  // Layout control
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Encounter setup
  const [encounterType, setEncounterType] = useState('Office visit');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('Routine');
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    const tzoffset = now.getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset).toISOString().slice(0,16);
  });
  const [assignedDoctor, setAssignedDoctor] = useState(patient.lastAttendingDoctor || '');
  const [assignedNurse, setAssignedNurse] = useState('');

  // Chief complaint
  const [chief, setChief] = useState('');

  // Symptoms
  const [symptoms, setSymptoms] = useState<any[]>([]);
  function addSymptom() {
    setSymptoms(s => [...s, { id: Date.now(), name: '', severity: 'Mild', start: '', duration: '', frequency: '', location: '', improving: 'Unknown', patientNotes: '', doctorNotes: '' }]);
  }
  function updateSymptom(id: number, field: string, value: any) {
    setSymptoms(s => s.map(x => x.id === id ? { ...x, [field]: value } : x));
  }
  function removeSymptom(id: number) {
    setSymptoms(s => s.filter(x => x.id !== id));
  }

  // Vitals
  const [vitals, setVitals] = useState<any>({ bp: '', hr: '', spo2: '', temp: '', weight: patient.weight || '', height: patient.height || '', pain: '', glucose: '' });
  function updateVital(key: string, value: string) { setVitals((s: any) => ({ ...s, [key]: value })); }

  function isAbnormalVital(key: string, value: string) {
    try {
      if (!value) return false;
      if (key === 'bp') {
        const parts = value.split('/').map(p => parseInt(p, 10));
        if (parts.length === 2) {
          const [sys, dia] = parts;
          if (isNaN(sys) || isNaN(dia)) return false;
          return sys >= 140 || dia >= 90;
        }
        return false;
      }
      if (key === 'temp') {
        const t = parseFloat(value.replace(/[^0-9.]/g, ''));
        return !isNaN(t) && t >= 38;
      }
      if (key === 'hr') {
        const h = parseInt(value.replace(/[^0-9]/g, ''), 10);
        return !isNaN(h) && h > 100;
      }
      if (key === 'spo2') {
        const s = parseInt(value.replace(/[^0-9]/g, ''), 10);
        return !isNaN(s) && s < 94;
      }
      if (key === 'glucose') {
        const g = parseFloat(value.replace(/[^0-9.]/g, ''));
        return !isNaN(g) && g > 200;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Exam
  const [exam, setExam] = useState<any>({ general: '', heartLungs: '', abdomen: '', skin: '', neuro: '', mental: '' });
  function setExamField(k: string, v: string) { setExam((s: any) => ({ ...s, [k]: v })); }

  // Assessment / Diagnoses
  const [assessments, setAssessments] = useState<any[]>([]);
  const [newDiagnosis, setNewDiagnosis] = useState('');
  function addAssessment() { if (!newDiagnosis) return alert('Enter a diagnosis'); setAssessments(s => [...s, { id: Date.now(), name: newDiagnosis, confidence: 'Medium', notes: '' }]); setNewDiagnosis(''); }
  function removeAssessment(id: number) { setAssessments(s => s.filter(a => a.id !== id)); }

  // Orders
  const [orders, setOrders] = useState<any[]>([]);
  const [orderForm, setOrderForm] = useState<any>({ name: '', reason: '', priority: 'Routine', due: '', instructions: '' });
  const TESTS = ['Blood test', 'Urine test', 'X-ray', 'MRI/CT', 'ECG', 'Ultrasound', 'Specialist referral', 'Follow-up lab work'];
  function addOrder() { if (!orderForm.name) return alert('Select a test'); setOrders(s => [...s, { ...orderForm, id: Date.now() }]); setOrderForm({ name: '', reason: '', priority: 'Routine', due: '', instructions: '' }); }
  function removeOrder(id: number) { setOrders(s => s.filter(o => o.id !== id)); }

  // Care plan
  const [carePlan, setCarePlan] = useState<any>({ instructions: '', meds: '', lifestyle: '' });
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskText, setTaskText] = useState('');
  function addTask() { if (!taskText) return; setTasks(s => [...s, { id: Date.now(), text: taskText, done: false }]); setTaskText(''); }
  function toggleTask(id: number) { setTasks(s => s.map(t => t.id === id ? { ...t, done: !t.done } : t)); }
  function removeTask(id: number) { setTasks(s => s.filter(t => t.id !== id)); }

  // Follow-up
  const [followUp, setFollowUp] = useState<any>({ date: '', reason: '', reminder: false });

  // Autosave / draft
  const draftKey = `encounterDraft:${patient.id}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        setEncounterType(d.encounterType || 'Office visit');
        setReason(d.reason || '');
        setPriority(d.priority || 'Routine');
        setDateTime(d.dateTime || dateTime);
        setAssignedDoctor(d.assignedDoctor || assignedDoctor);
        setAssignedNurse(d.assignedNurse || assignedNurse);
        setChief(d.chief || '');
        setSymptoms(d.symptoms || []);
        setVitals(d.vitals || vitals);
        setExam(d.exam || exam);
        setAssessments(d.assessments || []);
        setOrders(d.orders || []);
        setCarePlan(d.carePlan || carePlan);
        setTasks(d.tasks || []);
        setFollowUp(d.followUp || followUp);
      }
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveDraftLocal() {
    const payload = { encounterType, reason, priority, dateTime, assignedDoctor, assignedNurse, chief, symptoms, vitals, exam, assessments, orders, carePlan, tasks, followUp, updatedAt: new Date().toISOString() };
    try { localStorage.setItem(draftKey, JSON.stringify(payload)); return true } catch (e) { return false }
  }

  const [autosaveStatus, setAutosaveStatus] = useState<'idle'|'saving'|'saved'|'failed'|'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const initialLoad = useRef(true);
  const autosaveTimer = useRef<any>(null);

  // Debounced autosave when relevant fields change
  useEffect(() => {
    if (initialLoad.current) { initialLoad.current = false; return; }
    setAutosaveStatus('unsaved');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      setAutosaveStatus('saving');
      const ok = saveDraftLocal();
      if (ok) { setAutosaveStatus('saved'); setLastSavedAt(new Date().toLocaleTimeString()); }
      else setAutosaveStatus('failed');
    }, 1200);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [encounterType, reason, priority, dateTime, assignedDoctor, assignedNurse, chief, symptoms, vitals, exam, assessments, orders, carePlan, tasks, followUp]);

  function manualSaveDraft() {
    setAutosaveStatus('saving');
    const ok = saveDraftLocal();
    if (ok) { setAutosaveStatus('saved'); setLastSavedAt(new Date().toLocaleTimeString()); alert('Draft saved (local)'); }
    else { setAutosaveStatus('failed'); alert('Failed to save draft'); }
  }

  function finalizeEncounterAndSave() {
    const record = { id: `enc-${Date.now()}`, patientId: patient.id, createdAt: new Date().toISOString(), encounterType, reason, priority, dateTime, assignedDoctor, assignedNurse, chief, symptoms, vitals, exam, assessments, orders, carePlan, tasks, followUp };
    try {
      const key = `encounters:${patient.id}`;
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      arr.unshift(record);
      localStorage.setItem(key, JSON.stringify(arr));
      localStorage.removeItem(draftKey);
      return { success: true };
    } catch (e) { return { success: false } }
  }

  // UI helpers
  const SECTIONS = [
    { id: 'setup', title: 'Setup' },
    { id: 'chief', title: 'Chief complaint' },
    { id: 'symptoms', title: 'Symptoms' },
    { id: 'vitals', title: 'Vitals' },
    { id: 'history', title: 'Medical history' },
    { id: 'exam', title: 'Examination' },
    { id: 'assessment', title: 'Assessment' },
    { id: 'orders', title: 'Orders' },
    { id: 'plan', title: 'Plan' },
    { id: 'followup', title: 'Follow-up' },
  ];

  const [currentStep, setCurrentStep] = useState(0);

  const scrollToSection = useCallback((id: string, index: number) => {
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
    setCurrentStep(index);
  }, []);

  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showSchedulingDrawer, setShowSchedulingDrawer] = useState(false);

  function determineMissingFields() {
    const missing: string[] = [];
    if (!chief) missing.push('No chief complaint entered');
    if (symptoms.length === 0) missing.push('No symptoms added');
    if (assessments.length === 0) missing.push('No diagnosis added');
    return missing;
  }

  function handleCompleteClick() {
    const missing = determineMissingFields();
    setShowReviewModal(true);
  }

  function confirmComplete() {
    const ok = finalizeEncounterAndSave();
    if (ok.success) {
      alert('Encounter completed and saved (demo)');
      router.push(`/dashboard/records/${patient.id}`);
    } else {
      alert('Failed to complete encounter');
    }
  }

  function isSymptomRedFlag(name: string, severity: string) {
    const s = (name || '').toLowerCase();
    if (severity === 'Severe') return true;
    const flags = ['chest pain', 'shortness of breath', 'hemoptysis', 'unconscious', 'severe bleeding', 'syncope', 'stroke', 'seizure'];
    return flags.some(f => s.includes(f));
  }

  return (
    <div ref={containerRef} className="overflow-x-hidden pb-36">
      {/* Top area */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <a href="/dashboard/records" className="text-sm text-teal-600 hover:underline">← Back to Records</a>
          <h1 className="text-2xl font-semibold text-gray-900">New Encounter</h1>
          <div className="ml-3 inline-flex items-center px-2 py-1 rounded bg-yellow-50 text-yellow-800 text-sm">Draft</div>
        </div>
        <div className="text-sm text-gray-600">Autosave: {autosaveStatus === 'saving' ? 'Saving...' : autosaveStatus === 'saved' ? `Saved at ${lastSavedAt}` : autosaveStatus === 'failed' ? 'Save failed' : 'Unsaved changes'}</div>
      </div>

      {/* Patient banner (single consolidated banner, NOT sticky to prevent overlap) */}
      <div className="mb-4">
        <PatientBanner
          mrn={patient.mrn}
          firstName={firstName}
          lastName={lastName}
          dateOfBirth={patient.dob || ''}
          age={patient.age || 0}
          sex={(patient.gender || 'Unknown') as any}
          allergies={patient.allergies || []}
          identifiers={[{ label: 'MRN', value: patient.mrn }]}
          verificationStatus="verified"
          className="rounded-lg bg-white shadow-sm"
        />
      </div>

      {/* Stepper / mini nav */}
      <div className="mb-4">
        <nav aria-label="Encounter steps" className="flex items-center gap-2 overflow-x-auto">
          {SECTIONS.map((s, i) => (
            <button key={s.id} onClick={() => scrollToSection(s.id, i)} className={`flex items-center gap-2 px-3 py-1 rounded ${currentStep===i ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-700'}`} aria-current={currentStep===i ? 'step' : undefined}>
              <span className="text-xs font-semibold">{i+1}</span>
              <span className="text-sm">{s.title}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <main className="lg:col-span-8">
          {/* Each section is a card with consistent spacing */}

          <section id="section-setup" className="bg-white rounded-lg p-4 shadow-sm mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Encounter setup</h3>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Encounter type</label>
                <select value={encounterType} onChange={(e) => setEncounterType(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm">
                  <option>Office visit</option>
                  <option>Virtual visit</option>
                  <option>Follow-up</option>
                  <option>Emergency</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm">
                  <option>Routine</option>
                  <option>Urgent</option>
                  <option>Critical</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Date & time</label>
                <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Assigned doctor</label>
                <input value={assignedDoctor} onChange={(e) => setAssignedDoctor(e.target.value)} placeholder="Dr. ..." className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-600">Reason for visit</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Routine follow-up" className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Assigned nurse / assistant</label>
                <input value={assignedNurse} onChange={(e) => setAssignedNurse(e.target.value)} placeholder="Nurse ..." className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
              </div>
            </div>
          </section>

          <section id="section-chief" className="bg-white rounded-lg p-4 shadow-sm mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Chief complaint</h3>
            <div className="mt-2">
              <input value={chief} onChange={(e) => setChief(e.target.value)} placeholder="What is the patient's main concern today?" className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
            </div>
          </section>

          <section id="section-symptoms" className="bg-white rounded-lg p-4 shadow-sm mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Symptoms</h3>
            <div className="mt-2 space-y-3">
              {symptoms.length === 0 && <div className="text-sm text-gray-500 p-3">No symptoms added yet. Add the patient's reported symptoms for this encounter. <button onClick={addSymptom} className="ml-2 text-teal-600">+ Add Symptom</button></div>}
              {symptoms.map((s: any) => (
                <div key={s.id} className="border rounded p-3 bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input value={s.name} onChange={(e) => updateSymptom(s.id, 'name', e.target.value)} placeholder="Symptom name" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
                        <select value={s.severity} onChange={(e) => updateSymptom(s.id, 'severity', e.target.value)} className="rounded-md border border-gray-200 px-2 py-1 text-sm">
                          <option>Mild</option>
                          <option>Moderate</option>
                          <option>Severe</option>
                        </select>
                        <input value={s.start} onChange={(e) => updateSymptom(s.id, 'start', e.target.value)} placeholder="Start date" type="date" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input value={s.duration} onChange={(e) => updateSymptom(s.id, 'duration', e.target.value)} placeholder="Duration" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
                        <input value={s.frequency} onChange={(e) => updateSymptom(s.id, 'frequency', e.target.value)} placeholder="Frequency" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
                        <input value={s.location} onChange={(e) => updateSymptom(s.id, 'location', e.target.value)} placeholder="Body location" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select value={s.improving} onChange={(e) => updateSymptom(s.id, 'improving', e.target.value)} className="rounded-md border border-gray-200 px-2 py-1 text-sm">
                          <option>Unknown</option>
                          <option>Getting better</option>
                          <option>Getting worse</option>
                        </select>
                        <input value={s.patientNotes} onChange={(e) => updateSymptom(s.id, 'patientNotes', e.target.value)} placeholder="Patient notes" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
                      </div>

                      <div className="mt-2">
                        <textarea value={s.doctorNotes} onChange={(e) => updateSymptom(s.id, 'doctorNotes', e.target.value)} placeholder="Doctor notes" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
                      </div>
                    </div>

                    <div className="w-36 text-right">
                      {isSymptomRedFlag(s.name, s.severity) ? (
                        <div className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold">Red flag</div>
                      ) : (
                        <div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-50 text-gray-700 text-xs">No flag</div>
                      )}

                      <div className="mt-4">
                        <button onClick={() => removeSymptom(s.id)} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50">Remove</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div>
                <button onClick={addSymptom} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">+ Add symptom</button>
              </div>
            </div>
          </section>

          <section id="section-vitals" className="bg-white rounded-lg p-4 shadow-sm mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Vitals</h3>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-600">Temperature</label>
                <input value={vitals.temp} onChange={(e) => updateVital('temp', e.target.value)} placeholder="36.8 °C" className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${isAbnormalVital('temp', vitals.temp) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Blood pressure</label>
                <input value={vitals.bp} onChange={(e) => updateVital('bp', e.target.value)} placeholder="120/80" className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${isAbnormalVital('bp', vitals.bp) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
              </div>
              <div>
                <label className="text-xs text-gray-600">Heart rate</label>
                <input value={vitals.hr} onChange={(e) => updateVital('hr', e.target.value)} placeholder="72" className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${isAbnormalVital('hr', vitals.hr) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
              </div>
              <div>
                <label className="text-xs text-gray-600">SpO₂</label>
                <input value={vitals.spo2} onChange={(e) => updateVital('spo2', e.target.value)} placeholder="98%" className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${isAbnormalVital('spo2', vitals.spo2) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
              </div>

              <div>
                <label className="text-xs text-gray-600">Weight</label>
                <input value={vitals.weight} onChange={(e) => updateVital('weight', e.target.value)} placeholder="kg" className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Height</label>
                <input value={vitals.height} onChange={(e) => updateVital('height', e.target.value)} placeholder="cm" className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Pain level</label>
                <input value={vitals.pain} onChange={(e) => updateVital('pain', e.target.value)} placeholder="0-10" className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Blood sugar</label>
                <input value={vitals.glucose} onChange={(e) => updateVital('glucose', e.target.value)} placeholder="mg/dL" className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${isAbnormalVital('glucose', vitals.glucose) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
              </div>
            </div>
          </section>

          <section id="section-history" className="bg-white rounded-lg p-4 shadow-sm mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Medical history review</h3>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-xs text-gray-500">Allergies</div>
                <div className="mt-1 text-sm text-gray-700">{(patient.allergies && patient.allergies.length > 0) ? patient.allergies.join(', ') : 'No known allergies'}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-xs text-gray-500">Current conditions</div>
                <div className="mt-1 text-sm text-gray-700">{(patient.conditions && patient.conditions.length > 0) ? patient.conditions.join(', ') : '—'}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-xs text-gray-500">Medications</div>
                <div className="mt-1 text-sm text-gray-700">{(patient.medications && patient.medications.length > 0) ? patient.medications.map((m:any) => m.name).join(', ') : '—'}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-xs text-gray-500">Recent tests</div>
                <div className="mt-1 text-sm text-gray-700">{(patient.recentTests && patient.recentTests.length > 0) ? patient.recentTests.join(', ') : '—'}</div>
              </div>
            </div>
          </section>

          <section id="section-exam" className="bg-white rounded-lg p-4 shadow-sm mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Doctor examination notes</h3>
            <div className="mt-2 grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">General appearance</label>
                <textarea value={exam.general} onChange={(e) => setExamField('general', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={2} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Heart & lungs</label>
                <textarea value={exam.heartLungs} onChange={(e) => setExamField('heartLungs', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={2} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Abdomen</label>
                <textarea value={exam.abdomen} onChange={(e) => setExamField('abdomen', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={2} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Skin</label>
                <textarea value={exam.skin} onChange={(e) => setExamField('skin', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={2} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Neurological</label>
                <textarea value={exam.neuro} onChange={(e) => setExamField('neuro', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={2} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Mental health</label>
                <textarea value={exam.mental} onChange={(e) => setExamField('mental', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={2} />
              </div>
            </div>
          </section>

          <section id="section-assessment" className="bg-white rounded-lg p-4 shadow-sm mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Assessment / Diagnosis</h3>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input value={newDiagnosis} onChange={(e) => setNewDiagnosis(e.target.value)} placeholder="Add suspected or confirmed diagnosis" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
              <select className="rounded-md border border-gray-200 px-2 py-1 text-sm" defaultValue="Medium" onChange={(e) => { /* no-op */ }}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
              <div>
                <button onClick={addAssessment} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 text-white px-3 py-1 text-sm hover:bg-indigo-500">Add diagnosis</button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {assessments.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div>
                    <div className="font-medium text-gray-900">{a.name}</div>
                    <div className="text-xs text-gray-500">Confidence: {a.confidence}</div>
                  </div>
                  <div>
                    <button onClick={() => removeAssessment(a.id)} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="section-orders" className="bg-white rounded-lg p-4 shadow-sm mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Orders & Tests</h3>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select value={orderForm.name} onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })} className="rounded-md border border-gray-200 px-2 py-1 text-sm">
                <option value="">Select test</option>
                {TESTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={orderForm.reason} onChange={(e) => setOrderForm({ ...orderForm, reason: e.target.value })} placeholder="Reason" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
              <select value={orderForm.priority} onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })} className="rounded-md border border-gray-200 px-2 py-1 text-sm">
                <option>Routine</option>
                <option>Urgent</option>
                <option>STAT</option>
              </select>
              <input type="date" value={orderForm.due} onChange={(e) => setOrderForm({ ...orderForm, due: e.target.value })} className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
              <input value={orderForm.instructions} onChange={(e) => setOrderForm({ ...orderForm, instructions: e.target.value })} placeholder="Patient instructions" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
              <div>
                <button onClick={addOrder} className="inline-flex items-center gap-2 rounded-md bg-sky-600 text-white px-3 py-1 text-sm hover:bg-sky-500">Add order</button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {orders.map(o => (
                <div key={o.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div>
                    <div className="font-medium text-gray-900">{o.name}</div>
                    <div className="text-xs text-gray-500">{o.reason} • {o.priority} • Due: {o.due || '—'}</div>
                    <div className="text-xs text-gray-700 mt-1">{o.instructions}</div>
                  </div>
                  <div>
                    <button onClick={() => removeOrder(o.id)} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="section-plan" className="bg-white rounded-lg p-4 shadow-sm mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Treatment & Care Plan</h3>
            <div className="mt-2 grid grid-cols-1 gap-2">
              <textarea value={carePlan.instructions} onChange={(e) => setCarePlan((s:any) => ({ ...s, instructions: e.target.value }))} placeholder="Doctor instructions" className="rounded-md border border-gray-200 px-3 py-2 text-sm" rows={3} />
              <textarea value={carePlan.meds} onChange={(e) => setCarePlan((s:any) => ({ ...s, meds: e.target.value }))} placeholder="Medication instructions" className="rounded-md border border-gray-200 px-3 py-2 text-sm" rows={2} />
              <textarea value={carePlan.lifestyle} onChange={(e) => setCarePlan((s:any) => ({ ...s, lifestyle: e.target.value }))} placeholder="Lifestyle / nutrition advice" className="rounded-md border border-gray-200 px-3 py-2 text-sm" rows={2} />

              <div className="pt-2">
                <div className="flex items-center gap-2">
                  <input value={taskText} onChange={(e) => setTaskText(e.target.value)} placeholder="Add follow-up task (e.g. call lab)" className="rounded-md border border-gray-200 px-2 py-1 text-sm flex-1" />
                  <button onClick={addTask} className="rounded-md bg-white border border-gray-200 px-3 py-1 text-sm">Add task</button>
                </div>

                <div className="mt-2 space-y-2">
                  {tasks.map(t => (
                    <div key={t.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} />
                        <div className={`text-sm ${t.done ? 'line-through text-gray-500' : ''}`}>{t.text}</div>
                      </div>
                      <div>
                        <button onClick={() => removeTask(t.id)} className="text-xs text-gray-500 hover:underline">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="section-followup" className="bg-white rounded-lg p-4 shadow-sm mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Follow-up</h3>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input type="date" value={followUp.date} onChange={(e) => setFollowUp((s:any) => ({ ...s, date: e.target.value }))} className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
              <input value={followUp.reason} onChange={(e) => setFollowUp((s:any) => ({ ...s, reason: e.target.value }))} placeholder="Reason for follow-up" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={followUp.reminder} onChange={(e) => setFollowUp((s:any) => ({ ...s, reminder: e.target.checked }))} /> Set reminder</label>
            </div>
          </section>

        </main>

        {/* Right snapshot sidebar */}
        <aside className="lg:col-span-4">
          <div className="bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-50 sticky top-24">
            <h4 className="text-sm font-semibold text-gray-800">Patient snapshot</h4>
            <div className="text-sm text-gray-700 mt-2">
              <div><strong>Allergies:</strong> {(patient.allergies || []).join(', ') || 'None'}</div>
              <div className="mt-1"><strong>Conditions:</strong> {(patient.conditions || []).join(', ') || '—'}</div>
              <div className="mt-1"><strong>Medications:</strong> {(patient.medications || []).map((m:any) => m.name).join(', ') || '—'}</div>
              <div className="mt-1"><strong>Recent tests:</strong> {(patient.recentTests || []).slice(0,3).join(', ') || '—'}</div>
              <div className="mt-1"><strong>Family history:</strong> {(patient.familyHistory || []).join(', ') || '—'}</div>
            </div>

            <div className="mt-3">
              <h5 className="text-xs font-semibold text-gray-500">Risk & safety</h5>
              <div className="mt-1 text-sm text-gray-700">{(patient.conditions || []).length > 0 || (patient.age||0) >= 65 ? 'High risk — consider monitoring vitals closely' : 'Low risk'}</div>
            </div>

            <div className="mt-3">
              <h5 className="text-xs font-semibold text-gray-500">Recent encounters</h5>
              <div className="mt-1 text-sm text-gray-700">{(patient.recentEncounters || []).slice(0,5).map((e:any) => (<div key={e} className="text-sm">{e}</div>)) || '—'}</div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify({ patient: patient.id })); alert('Patient snapshot copied'); }} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Copy snapshot</button>
              <button onClick={() => router.push(`/dashboard/records/${patient.id}`)} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">View full chart</button>
            </div>

            <div className="mt-3">
              <button onClick={() => setShowSchedulingDrawer(true)} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 text-white px-3 py-2 text-sm hover:bg-teal-600">Schedule follow-up</button>
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky action bar */}
      <div className="fixed left-6 right-6 bottom-6 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between bg-white p-3 rounded-xl shadow-md border border-gray-100">
          <div className="text-sm text-gray-600">Autosave: {autosaveStatus === 'saving' ? 'Saving...' : autosaveStatus === 'saved' ? `Saved at ${lastSavedAt}` : autosaveStatus === 'failed' ? 'Save failed — Retry' : 'Unsaved changes'}</div>
          <div className="flex gap-3">
            <button onClick={() => { router.push(`/dashboard/records/${patient.id}`); }} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={manualSaveDraft} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Save Draft</button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Print summary</button>
            <button disabled className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm text-gray-400">Send summary</button>
            <button onClick={handleCompleteClick} className="inline-flex items-center gap-2 rounded-md bg-teal-700 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-600">Complete Encounter</button>
          </div>
        </div>
      </div>

      {/* Review modal */}
      {showReviewModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowReviewModal(false)} />
          <div className="relative bg-white rounded-lg p-6 shadow-lg w-full max-w-2xl">
            <h3 className="text-lg font-semibold">Review Encounter Before Completing</h3>
            <div className="mt-4 text-sm text-gray-700">
              <div className="font-medium">Missing:</div>
              <ul className="list-disc ml-5 mt-2 text-sm text-gray-700">
                {determineMissingFields().length === 0 ? <li>None — ready to complete</li> : determineMissingFields().map(m => <li key={m}>{m}</li>)}
              </ul>

              <div className="mt-4 font-medium">Summary:</div>
              <div className="mt-2 text-sm">Symptoms: {symptoms.length} • Vitals recorded: {Object.values(vitals).some(v=>v) ? 'Yes' : 'No'} • Diagnoses: {assessments.length}</div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={() => setShowReviewModal(false)} className="px-4 py-2 rounded bg-white border">Go back</button>
              <button onClick={() => { setShowReviewModal(false); confirmComplete(); }} className="px-4 py-2 rounded bg-teal-700 text-white">Complete Encounter</button>
            </div>
          </div>
        </div>
      )}

      {/* Scheduling drawer */}
      {showSchedulingDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSchedulingDrawer(false)} />
          <div className="relative ml-auto w-full sm:w-3/4 md:w-1/2 lg:w-2/5 h-full bg-white shadow-xl overflow-auto">
            <div className="p-4 flex items-center justify-between border-b">
              <div className="text-lg font-semibold">Schedule Follow-up</div>
              <button onClick={() => setShowSchedulingDrawer(false)} className="text-gray-500">Close</button>
            </div>
            <div className="p-4">
              {/* Load booking client (client component) */}
              <CalBookingClient />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
