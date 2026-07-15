'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PatientBanner } from '@/design-system/clinical/PatientBanner';
import { useRouter } from 'next/navigation';

export default function EncounterEditor({ patient }: { patient: any }) {
  const router = useRouter();
  const names = (patient.name || '').split(' ');
  const firstName = names[0] || '';
  const lastName = names.slice(1).join(' ') || '';

  // Encounter setup
  const [encounterType, setEncounterType] = useState('Office visit');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('Routine');
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    // Produce local value for <input type="datetime-local">
    const tzoffset = now.getTimezoneOffset() * 60000; //offset in ms
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
        return !isNaN(g) && g > 200; // rough
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

  function saveDraft() {
    const payload = { encounterType, reason, priority, dateTime, assignedDoctor, assignedNurse, chief, symptoms, vitals, exam, assessments, orders, carePlan, tasks, followUp, updatedAt: new Date().toISOString() };
    try { localStorage.setItem(draftKey, JSON.stringify(payload)); alert('Draft saved (local)'); } catch (e) { alert('Failed to save draft'); }
  }

  function completeEncounter() {
    const record = { id: `enc-${Date.now()}`, patientId: patient.id, createdAt: new Date().toISOString(), encounterType, reason, priority, dateTime, assignedDoctor, assignedNurse, chief, symptoms, vitals, exam, assessments, orders, carePlan, tasks, followUp };
    try {
      const key = `encounters:${patient.id}`;
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      arr.unshift(record);
      localStorage.setItem(key, JSON.stringify(arr));
      // remove draft
      localStorage.removeItem(draftKey);
      alert('Encounter completed and saved (demo)');
      router.push(`/dashboard/records/${patient.id}`);
    } catch (e) { alert('Failed to complete encounter'); }
  }

  function printSummary() { window.print(); }
  function sendSummaryToPatient() { alert('Summary sent to patient (demo)'); }

  function isSymptomRedFlag(name: string, severity: string) {
    const s = (name || '').toLowerCase();
    if (severity === 'Severe') return true;
    const flags = ['chest pain', 'shortness of breath', 'hemoptysis', 'unconscious', 'severe bleeding', 'syncope', 'stroke', 'seizure'];
    return flags.some(f => s.includes(f));
  }

  return (
    <div>
      <div className="sticky top-6 z-30">
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
          className="rounded-t-lg"
        />

        <div className="bg-white rounded-b-lg p-4 shadow-sm ring-1 ring-gray-100 flex items-center justify-between gap-4 mt-3">
          <div>
            <div className="text-lg font-semibold text-gray-900">{patient.name}</div>
            <div className="text-sm text-gray-600">{patient.age} yrs • {patient.gender} • MRN: {patient.mrn} • DOB: {patient.dob || '—'}</div>
            <div className="mt-2 text-sm text-gray-600">Allergies: {(patient.allergies || []).join(', ') || 'None'} • Conditions: {(patient.conditions || []).slice(0,3).join(', ') || 'None'}</div>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold ${((patient.conditions || []).length > 0 || (patient.age||0) >= 65) ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{((patient.conditions || []).length > 0 || (patient.age||0) >= 65) ? 'High risk' : 'Low risk'}</div>
            <div className="mt-2 text-sm text-gray-500">Last visit: <span className="font-medium text-gray-900">{patient.lastVisit || '—'}</span></div>
            <div className="mt-1 text-sm text-gray-500">Emergency contact: <span className="font-medium text-gray-900">{patient.emergencyContact?.name || '—'}</span></div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <main className="lg:col-span-8">
          <div className="bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-50 space-y-4">
            {/* Encounter setup */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Encounter setup</h3>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Encounter type</label>
                  <select value={encounterType} onChange={(e) => setEncounterType(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm">
                    <option>Office visit</option>
                    <option>Virtual visit</option>
                    <option>Follow-up</option>
                    <option>Emergency</option>
                    <option>Lab review</option>
                    <option>Procedure visit</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Visit priority</label>
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
            </div>

            {/* Chief complaint */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Chief complaint</h3>
              <div className="mt-2">
                <input value={chief} onChange={(e) => setChief(e.target.value)} placeholder="What is the patient's main concern today?" className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
              </div>
            </div>

            {/* Symptoms */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Symptoms</h3>
              <div className="mt-2 space-y-3">
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
            </div>

            {/* Vitals */}
            <div>
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
            </div>

            {/* Medical history review */}
            <div>
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
                  <div className="text-xs text-gray-500">Past surgeries</div>
                  <div className="mt-1 text-sm text-gray-700">{(patient.surgeries && patient.surgeries.length > 0) ? patient.surgeries.join(', ') : '—'}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500">Recent tests</div>
                  <div className="mt-1 text-sm text-gray-700">{(patient.recentTests && patient.recentTests.length > 0) ? patient.recentTests.join(', ') : '—'}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs text-gray-500">Recent encounters</div>
                  <div className="mt-1 text-sm text-gray-700">{(patient.recentEncounters && patient.recentEncounters.length > 0) ? patient.recentEncounters.slice(0,3).join('; ') : '—'}</div>
                </div>
              </div>
            </div>

            {/* Examination notes */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Doctor examination notes</h3>
              <div className="mt-2 grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs text-gray-600">General appearance</label>
                  <textarea value={exam.general} onChange={(e) => setExamField('general', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={2} />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Heart & lungs</label>
                  <textarea value={exam.heartLungs} onChange={(e) => setExamField('heartLungs', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={2} />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Abdomen</label>
                  <textarea value={exam.abdomen} onChange={(e) => setExamField('abdomen', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={2} />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Skin</label>
                  <textarea value={exam.skin} onChange={(e) => setExamField('skin', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={2} />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Neurological</label>
                  <textarea value={exam.neuro} onChange={(e) => setExamField('neuro', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={2} />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Mental health</label>
                  <textarea value={exam.mental} onChange={(e) => setExamField('mental', e.target.value)} className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm" rows={2} />
                </div>
              </div>
            </div>

            {/* Assessment / Diagnoses */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Assessment / Diagnosis</h3>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input value={newDiagnosis} onChange={(e) => setNewDiagnosis(e.target.value)} placeholder="Add suspected or confirmed diagnosis" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
                <select className="rounded-md border border-gray-200 px-2 py-1 text-sm" defaultValue="Medium" onChange={(e) => { /* no-op for now */ }}>
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
            </div>

            {/* Orders and tests */}
            <div>
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
            </div>

            {/* Care plan */}
            <div>
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
            </div>

            {/* Follow-up */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Follow-up</h3>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input type="date" value={followUp.date} onChange={(e) => setFollowUp((s:any) => ({ ...s, date: e.target.value }))} className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
                <input value={followUp.reason} onChange={(e) => setFollowUp((s:any) => ({ ...s, reason: e.target.value }))} placeholder="Reason for follow-up" className="rounded-md border border-gray-200 px-2 py-1 text-sm" />
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={followUp.reminder} onChange={(e) => setFollowUp((s:any) => ({ ...s, reminder: e.target.checked }))} /> Set reminder</label>
              </div>
            </div>

          </div>
        </main>

        <aside className="lg:col-span-4">
          <div className="bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-50 space-y-4 sticky top-28">
            <h4 className="text-sm font-semibold text-gray-800">Patient snapshot</h4>
            <div className="text-sm text-gray-700">
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

            <div className="mt-4">
              <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify({ patient: patient.id })) ; alert('Patient snapshot copied'); }} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Copy snapshot</button>
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky action bar */}
      <div className="fixed left-6 right-6 bottom-6 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between bg-white p-3 rounded-xl shadow-md border border-gray-100">
          <div className="text-sm text-gray-600">Autosave: local (draft)</div>
          <div className="flex gap-3">
            <button onClick={() => { saveDraft(); }} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Save Draft</button>
            <button onClick={() => { completeEncounter(); }} className="inline-flex items-center gap-2 rounded-md bg-teal-700 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-600">Complete Encounter</button>
            <button onClick={() => { router.push(`/dashboard/records/${patient.id}`); }} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={printSummary} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Print summary</button>
            <button onClick={sendSummaryToPatient} className="inline-flex items-center gap-2 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Send summary to patient</button>
          </div>
        </div>
      </div>
    </div>
  );
}
