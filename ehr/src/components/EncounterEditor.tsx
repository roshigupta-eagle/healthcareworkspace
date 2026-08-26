'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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

  const [autosaveStatus, setAutosaveStatus] = useState<'idle'|'saving'|'saved'|'failed'|'unsaved'>('unsaved');
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

  // Sections and stepper
  const SECTIONS = [
    { id: 'setup', title: 'Setup' },
    { id: 'chief', title: 'Complaint' },
    { id: 'symptoms', title: 'Symptoms' },
    { id: 'vitals', title: 'Vitals' },
    { id: 'history', title: 'History' },
    { id: 'exam', title: 'Exam' },
    { id: 'assessment', title: 'Assessment' },
    { id: 'orders', title: 'Orders' },
    { id: 'plan', title: 'Plan' },
    { id: 'complete', title: 'Complete' },
  ];

  const [currentStep, setCurrentStep] = useState(0);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    setup: true, chief: true, symptoms: true, vitals: true, history: false, exam: false, assessment: false, orders: false, plan: false, followup: false,
  });
  const toggleSection = (id: string) => setOpenSections(s => ({ ...s, [id]: !s[id] }));

  function isSectionComplete(id: string) {
    switch (id) {
      case 'setup': return !!(reason || assignedDoctor);
      case 'chief': return !!chief && chief.trim().length > 0;
      case 'symptoms': return symptoms.length > 0;
      case 'vitals': return Object.values(vitals).some((v:any) => !!v);
      case 'history': return (patient.conditions && patient.conditions.length > 0) || (patient.medications && patient.medications.length > 0) || (patient.allergies && patient.allergies.length > 0);
      case 'exam': return Object.values(exam).some((v:any) => !!v);
      case 'assessment': return assessments.length > 0;
      case 'orders': return orders.length > 0;
      case 'plan': return !!(carePlan.instructions || carePlan.meds || tasks.length > 0);
      case 'plan': return !!(carePlan.instructions || carePlan.meds || tasks.length > 0);
      case 'followup': return !!(followUp.date || followUp.reason || followUp.reminder);
      case 'complete': return assessments.length > 0;
      default: return false;
    }
  }

  const scrollToSection = useCallback((id: string, index: number) => {
    if (id === 'complete') { setCurrentStep(SECTIONS.length - 1); handleCompleteClick(); return; }
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
      // show a brief completion overlay + confetti then navigate
      setShowCompleteOverlay(true);
      triggerConfetti();
      setTimeout(() => {
        setShowCompleteOverlay(false);
        router.push(`/dashboard/records/${patient.id}`);
      }, 1100);
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

  /* Serene UI additions: confetti, suggestions, AI orb */
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCompleteOverlay, setShowCompleteOverlay] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiTyping, setAiTyping] = useState(false);

  const computedSuggestions = useMemo(() => {
    const list: any[] = [];
    if (isAbnormalVital('bp', vitals.bp)) list.push({ id: 'htn', title: 'Hypertension assessment', action: 'addAssessment', payload: { name: 'Hypertension' } });
    if (isAbnormalVital('glucose', vitals.glucose)) list.push({ id: 'bmp', title: 'Consider BMP & glucose review', action: 'addOrder', payload: { name: 'BMP', reason: 'Evaluate glucose', priority: 'Routine' } });
    if (symptoms.some(s => isSymptomRedFlag(s.name, s.severity))) list.push({ id: 'redflag', title: 'Red flag: escalate to urgent', action: 'markUrgent' });
    return list;
  }, [vitals, symptoms]);

  const progressInfo = useMemo(() => {
    const relevant = SECTIONS.filter(s => s.id !== 'complete');
    const completed = relevant.reduce((acc, s) => acc + (isSectionComplete(s.id) ? 1 : 0), 0);
    const percent = Math.round((completed / relevant.length) * 100);
    return { completed, percent };
  }, [symptoms, vitals, exam, assessments, orders, carePlan, tasks, followUp, reason, assignedDoctor, assignedNurse]);

  function applySuggestion(sugg: any) {
    if (!sugg) return;
    if (sugg.action === 'addAssessment') {
      setAssessments(s => [{ id: Date.now(), name: sugg.payload.name, confidence: 'Low', notes: 'Auto-suggested' }, ...s]);
    } else if (sugg.action === 'addOrder') {
      setOrders(s => [...s, { ...sugg.payload, id: Date.now() }]);
    } else if (sugg.action === 'markUrgent') {
      setPriority('Urgent');
      setOrders(s => [...s, { id: Date.now(), name: 'Urgent review', reason: 'Red flag symptom', priority: 'STAT' }]);
    }
    triggerConfetti();
  }

  function triggerConfetti() {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1200);
  }

  function askAIforSuggestions() {
    setAiResponse(''); setAiTyping(true); setShowAI(true);
    const fake = 'Recommendation: consider BMP and fasting glucose; consider hypertension assessment and BP cuff recheck in 30 mins.';
    let i = 0;
    const id = setInterval(() => {
      setAiResponse(prev => prev + fake[i]);
      i++;
      if (i >= fake.length) { clearInterval(id); setAiTyping(false); }
    }, 18);
  }

  return (
    <div ref={containerRef} className="encounter-editor overflow-x-hidden pb-36 bg-gray-50 relative">
      {/* Top area */}
      <div className="mb-6 flex items-center justify-between gap-4 relative">
        <div className="flex flex-col">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">New Encounter</h1>
            <div className="ml-3 inline-flex items-center px-2 py-1 rounded bg-yellow-50 text-yellow-800 text-sm">Draft</div>
          </div>

          {computedSuggestions.length > 0 && (
            <div className="suggestion-chips">
              {computedSuggestions.map(c => (
                <button key={c.id} onClick={() => applySuggestion(c)} className="suggestion-chip">{c.title}</button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div style={{ position: 'relative' }}>
            <button onClick={askAIforSuggestions} className="ai-orb" aria-label="AI suggestions">🤖</button>
            {showAI && (
              <div className="ai-tooltip" role="status">
                <div className="text-sm text-gray-700">{aiResponse || (aiTyping ? 'Thinking…' : '')}</div>
                <div className="mt-2 text-xs text-gray-500">AI suggestions (demo)</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Patient banner (single consolidated banner, NOT sticky to prevent overlap) */}
      <div className="mb-6">
        <PatientBanner
          mrn={patient.mrn}
          firstName={firstName}
          lastName={lastName}
          dateOfBirth={patient.dob || ''}
          age={patient.age || 0}
          sex={(patient.gender || 'Unknown') as any}
          allergies={patient.allergies || []}
          verificationStatus="verified"
          className="rounded-lg bg-white shadow-sm"
        />
      </div>

      {/* Stepper / mini nav */}
      <div className="mb-6">
        <nav aria-label="Encounter steps" className="serene-stepper">
          {SECTIONS.map((s, i) => (
            <button key={s.id} onClick={() => scrollToSection(s.id, i)} aria-current={currentStep===i ? 'step' : undefined} className="serene-step">
              <span className="step-circle">{isSectionComplete(s.id) ? '✓' : i+1}</span>
              <span className="text-sm">{s.title}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <main className="lg:col-span-8">

          {/* Encounter setup (collapsible) */}
          <div className="mb-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-700">Encounter setup</h3>
                  {isSectionComplete('setup') && <span className="text-xs text-emerald-700">Completed</span>}
                </div>
                <div>
                  <button onClick={() => toggleSection('setup')} className="text-sm text-gray-500">{openSections.setup ? 'Collapse' : 'Expand'}</button>
                </div>
              </div>

              {openSections.setup && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Encounter Type</label>
                    <select value={encounterType} onChange={(e) => setEncounterType(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm serene-input">
                      <option>Office Visit</option>
                      <option>Virtual Visit</option>
                      <option>Follow-Up</option>
                      <option>Emergency</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Priority</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm serene-input">
                      <option>Routine</option>
                      <option>Urgent</option>
                      <option>Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Date &amp; Time</label>
                    <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm serene-input" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Assigned Doctor</label>
                    <input value={assignedDoctor} onChange={(e) => setAssignedDoctor(e.target.value)} placeholder="Dr. ..." className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm serene-input" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-600">Reason for Visit</label>
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Routine Follow-Up" className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm serene-input" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Assigned Nurse / Assistant</label>
                    <input value={assignedNurse} onChange={(e) => setAssignedNurse(e.target.value)} placeholder="Nurse ..." className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm serene-input" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chief complaint */}
          <div className="mb-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-700">Chief complaint</h3>
                  {isSectionComplete('chief') && <span className="text-xs text-emerald-700">Completed</span>}
                </div>
                <div>
                  <button onClick={() => toggleSection('chief')} className="text-sm text-gray-500">{openSections.chief ? 'Collapse' : 'Expand'}</button>
                </div>
              </div>

              {openSections.chief && (
                <div className="mt-4">
                  <input value={chief} onChange={(e) => setChief(e.target.value)} placeholder="What is the patient's main concern today?" className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm serene-input" />
                </div>
              )}
            </div>
          </div>

          {/* Symptoms */}
          <div className="mb-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-700">Symptoms</h3>
                  {isSectionComplete('symptoms') && <span className="text-xs text-emerald-700">Completed</span>}
                </div>
                <div>
                  <button onClick={() => toggleSection('symptoms')} className="text-sm text-gray-500">{openSections.symptoms ? 'Collapse' : 'Expand'}</button>
                </div>
              </div>

              {openSections.symptoms && (
                <div className="mt-4 space-y-3">
                  {symptoms.length === 0 && <div className="text-sm text-gray-500 p-3">No symptoms added yet. Add the patient's reported symptoms for this encounter. <button onClick={addSymptom} className="ml-2 text-teal-600">+ Add Symptom</button></div>}
                  {symptoms.map((s: any) => (
                    <div key={s.id} className="border rounded p-3 bg-gray-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input value={s.name} onChange={(e) => updateSymptom(s.id, 'name', e.target.value)} placeholder="Symptom Name" className="rounded-md border border-gray-200 px-2 text-sm serene-input" />
                            <select value={s.severity} onChange={(e) => updateSymptom(s.id, 'severity', e.target.value)} className="rounded-md border border-gray-200 px-2 py-1 text-sm">
                              <option>Mild</option>
                              <option>Moderate</option>
                              <option>Severe</option>
                            </select>
                            <input value={s.start} onChange={(e) => updateSymptom(s.id, 'start', e.target.value)} placeholder="Start Date" type="date" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
                          </div>

                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input value={s.duration} onChange={(e) => updateSymptom(s.id, 'duration', e.target.value)} placeholder="Duration" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
                            <input value={s.frequency} onChange={(e) => updateSymptom(s.id, 'frequency', e.target.value)} placeholder="Frequency" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
                            <input value={s.location} onChange={(e) => updateSymptom(s.id, 'location', e.target.value)} placeholder="Body Location" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
                          </div>

                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select value={s.improving} onChange={(e) => updateSymptom(s.id, 'improving', e.target.value)} className="rounded-md border border-gray-200 px-2 py-1 text-sm">
                              <option>Unknown</option>
                              <option>Getting Better</option>
                              <option>Getting Worse</option>
                            </select>
                            <input value={s.patientNotes} onChange={(e) => updateSymptom(s.id, 'patientNotes', e.target.value)} placeholder="Patient Notes" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
                          </div>

                          <div className="mt-2">
                            <textarea value={s.doctorNotes} onChange={(e) => updateSymptom(s.id, 'doctorNotes', e.target.value)} placeholder="Doctor Notes" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
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
              )}
            </div>
          </div>

          {/* Vitals */}
          <div className="mb-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-700">Vitals</h3>
                  {isSectionComplete('vitals') && <span className="text-xs text-emerald-700">Completed</span>}
                </div>
                <div>
                  <button onClick={() => toggleSection('vitals')} className="text-sm text-gray-500">{openSections.vitals ? 'Collapse' : 'Expand'}</button>
                </div>
              </div>

              {openSections.vitals && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Temperature</label>
                    <input value={vitals.temp} onChange={(e) => updateVital('temp', e.target.value)} placeholder="36.8 °C" className={`mt-1 block w-full rounded-md serene-input border px-3 text-sm ${isAbnormalVital('temp', vitals.temp) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Blood pressure</label>
                    <input value={vitals.bp} onChange={(e) => updateVital('bp', e.target.value)} placeholder="120/80" className={`mt-1 block w-full rounded-md serene-input border px-3 text-sm ${isAbnormalVital('bp', vitals.bp) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Heart rate</label>
                    <input value={vitals.hr} onChange={(e) => updateVital('hr', e.target.value)} placeholder="72" className={`mt-1 block w-full rounded-md serene-input border px-3 text-sm ${isAbnormalVital('hr', vitals.hr) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">SpO₂</label>
                    <input value={vitals.spo2} onChange={(e) => updateVital('spo2', e.target.value)} placeholder="98%" className={`mt-1 block w-full rounded-md serene-input border px-3 text-sm ${isAbnormalVital('spo2', vitals.spo2) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
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
              )}
            </div>
          </div>

          {/* Medical history */}
          <div className="mb-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-700">Medical history review</h3>
                  {isSectionComplete('history') && <span className="text-xs text-emerald-700">Completed</span>}
                </div>
                <div>
                  <button onClick={() => toggleSection('history')} className="text-sm text-gray-500">{openSections.history ? 'Collapse' : 'Expand'}</button>
                </div>
              </div>

              {openSections.history && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              )}
            </div>
          </div>

          {/* Examination */}
          <div className="mb-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-700">Doctor examination notes</h3>
                  {isSectionComplete('exam') && <span className="text-xs text-emerald-700">Completed</span>}
                </div>
                <div>
                  <button onClick={() => toggleSection('exam')} className="text-sm text-gray-500">{openSections.exam ? 'Collapse' : 'Expand'}</button>
                </div>
              </div>

              {openSections.exam && (
                <div className="mt-4 grid grid-cols-1 gap-3">
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
              )}
            </div>
          </div>

          {/* Assessment / Diagnosis */}
          <div className="mb-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-700">Assessment / Diagnosis</h3>
                  {isSectionComplete('assessment') && <span className="text-xs text-emerald-700">Completed</span>}
                </div>
                <div>
                  <button onClick={() => toggleSection('assessment')} className="text-sm text-gray-500">{openSections.assessment ? 'Collapse' : 'Expand'}</button>
                </div>
              </div>

              {openSections.assessment && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input value={newDiagnosis} onChange={(e) => setNewDiagnosis(e.target.value)} placeholder="Add suspected or confirmed diagnosis" className="rounded-md border border-gray-200 px-2 text-sm serene-input" />
                  <select className="rounded-md border border-gray-200 px-2 py-1 text-sm" defaultValue="Medium" onChange={(e) => { /* no-op */ }}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                  <div>
                    <button onClick={addAssessment} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 text-white px-3 py-1 text-sm hover:bg-indigo-500">Add diagnosis</button>
                  </div>

                  <div className="mt-3 sm:col-span-3 space-y-2">
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
                </div>
              )}
            </div>
          </div>

          {/* Orders & Tests */}
          <div className="mb-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-700">Orders & Tests</h3>
                  {isSectionComplete('orders') && <span className="text-xs text-emerald-700">Completed</span>}
                </div>
                <div>
                  <button onClick={() => toggleSection('orders')} className="text-sm text-gray-500">{openSections.orders ? 'Collapse' : 'Expand'}</button>
                </div>
              </div>

              {openSections.orders && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
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

                  <div className="mt-3 sm:col-span-3 space-y-2">
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
                </div>
              )}
            </div>
          </div>

          {/* Plan & Care */}
          <div className="mb-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-700">Treatment & Care Plan</h3>
                  {isSectionComplete('plan') && <span className="text-xs text-emerald-700">Completed</span>}
                </div>
                <div>
                  <button onClick={() => toggleSection('plan')} className="text-sm text-gray-500">{openSections.plan ? 'Collapse' : 'Expand'}</button>
                </div>
              </div>

              {openSections.plan && (
                <div className="mt-4 grid grid-cols-1 gap-2">
                  <textarea value={carePlan.instructions} onChange={(e) => setCarePlan((s:any) => ({ ...s, instructions: e.target.value }))} placeholder="Doctor Instructions" className="rounded-md border border-gray-200 px-3 py-2 text-sm" rows={3} />
                  <textarea value={carePlan.meds} onChange={(e) => setCarePlan((s:any) => ({ ...s, meds: e.target.value }))} placeholder="Medication Instructions" className="rounded-md border border-gray-200 px-3 py-2 text-sm" rows={2} />
                  <textarea value={carePlan.lifestyle} onChange={(e) => setCarePlan((s:any) => ({ ...s, lifestyle: e.target.value }))} placeholder="Lifestyle / Nutrition Advice" className="rounded-md border border-gray-200 px-3 py-2 text-sm" rows={2} />

                  <div className="pt-2">
                    <div className="flex items-center gap-2">
                      <input value={taskText} onChange={(e) => setTaskText(e.target.value)} placeholder="Add follow-up task (e.g. call lab)..." className="rounded-md border border-gray-200 px-2 py-1 text-sm flex-1" />
                      <button onClick={addTask} className="rounded-md bg-white border border-gray-200 px-3 py-1 text-sm">Add Task</button>
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
              )}
            </div>
          </div>

          {/* Follow-up */}
          <div className="mb-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-700">Follow-Up</h3>
                  {isSectionComplete('followup') && <span className="text-xs text-emerald-700">Completed</span>}
                </div>
                <div>
                  <button onClick={() => toggleSection('followup')} className="text-sm text-gray-500">{openSections.followup ? 'Collapse' : 'Expand'}</button>
                </div>
              </div>

              {openSections.followup && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input type="date" value={followUp.date} onChange={(e) => setFollowUp((s:any) => ({ ...s, date: e.target.value }))} className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
                  <input value={followUp.reason} onChange={(e) => setFollowUp((s:any) => ({ ...s, reason: e.target.value }))} placeholder="Reason for Follow-Up" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={followUp.reminder} onChange={(e) => setFollowUp((s:any) => ({ ...s, reminder: e.target.checked }))} /> Set Reminder</label>
                </div>
              )}
            </div>
          </div>

        </main>

        {/* Right snapshot sidebar (sticky only on large screens) */}
        <aside className="lg:col-span-4">
          <div className="bg-white rounded-lg p-6 shadow-sm ring-1 ring-gray-50 relative lg:sticky lg:top-24">
            <h4 className="text-sm font-semibold text-gray-800">Patient snapshot</h4>

            <div className="mt-3 mb-4">
              <h5 className="text-xs font-semibold text-gray-500">Today's Progress</h5>
              <div className="mt-2 text-sm text-gray-700">{progressInfo.completed} of {SECTIONS.filter(s => s.id !== 'complete').length} sections complete</div>
              <div className="mt-2 progress-track"><div className="progress-fill" style={{ width: `${progressInfo.percent}%` }} /></div>
              <div className="text-xs text-gray-500 mt-1">{progressInfo.percent}%</div>
            </div>
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
        <div className="max-w-7xl mx-auto flex items-center justify-between backdrop-blur-md bg-white/80 p-3 rounded-xl shadow-md border border-gray-100">
          <div className="text-sm text-gray-600">
            <span className="inline-flex items-center gap-3">
              <span className="px-2 py-1 rounded bg-gray-100 text-xs">Draft</span>
              <span>{autosaveStatus === "saving" ? "Saving..." : (lastSavedAt ? "Saved at " + lastSavedAt : "Unsaved changes") }</span>
            </span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { router.push(`/dashboard/records/${patient.id}`); }} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={manualSaveDraft} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Save Draft</button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Print summary</button>
            <button onClick={handleCompleteClick} className="inline-flex items-center gap-2 rounded-md bg-teal-700 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-600">Complete Encounter</button>
          </div>
        </div>
      </div>

      {showConfetti && (
        <div className="confetti-container" aria-hidden>
          {Array.from({ length: 18 }).map((_, i) => {
            const left = Math.round(Math.random() * 100);
            const top = Math.round(Math.random() * 20);
            const colors = ['#34D399', '#06B6D4', '#60A5FA', '#F59E0B', '#F97316', '#FB7185'];
            const bg = colors[i % colors.length];
            return <span key={i} className="confetti-particle" style={{ left: `${left}%`, top: `${top}%`, backgroundColor: bg }} />;
          })}
        </div>
      )}

      {showCompleteOverlay && (
        <div className="complete-overlay" role="status" aria-live="polite">
          <div className="complete-modal">
            <div className="checkmark">✓</div>
            <div className="text-lg font-semibold">Encounter completed</div>
            <div className="text-sm text-gray-600">Saved to patient chart</div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {showReviewModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex">
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



