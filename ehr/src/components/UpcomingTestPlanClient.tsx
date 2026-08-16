"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BackToPatientButton from '@/components/BackToPatientButton';

type Props = {
  patient: any;
  initialTestId?: string | null;
  test?: any;
};

function SmallBadge({ children, tone = 'teal' }: { children: React.ReactNode; tone?: string }) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
  const tones: Record<string, string> = {
    teal: 'bg-emerald-50 text-emerald-800',
    blue: 'bg-sky-50 text-sky-800',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-rose-50 text-rose-700',
    gray: 'bg-gray-50 text-gray-700',
  };
  return <span className={`${base} ${tones[tone] ?? tones.gray}`}>{children}</span>;
}

function ProgressRing({ size = 80, stroke = 8, percent = 0 }: { size?: number; stroke?: number; percent?: number }) {
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        <linearGradient id="rg" x1="0%" x2="100%">
          <stop offset="0%" stopColor="#10B8A6" />
          <stop offset="100%" stopColor="#008B7A" />
        </linearGradient>
      </defs>
      <circle cx={center} cy={center} r={radius} stroke="#EEF6F5" strokeWidth={stroke} fill="none" />
      <circle cx={center} cy={center} r={radius} stroke="url(#rg)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={offset} transform={`rotate(-90 ${center} ${center})`} fill="none" />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize={14} className="text-gray-900" fill="#0f766e">{Math.round(percent)}%</text>
    </svg>
  );
}

export default function UpcomingTestPlanClient({ patient, initialTestId, test }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(initialTestId ?? (test && test.id) ?? (patient?.tests?.[0] && patient.tests[0].id) ?? null);

  const selectedTest = useMemo(() => {
    return (patient?.tests || []).find((t: any) => String(t.id) === String(selectedId)) || test || null;
  }, [patient, selectedId, test]);

  const [localTest, setLocalTest] = useState<any>(() => selectedTest ? JSON.parse(JSON.stringify(selectedTest)) : null);
  const [pastResults, setPastResults] = useState<any[]>(() => (patient?.labResults || []).slice(0, 5));
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [readiness, setReadiness] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [followUpAdded, setFollowUpAdded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    setLocalTest(selectedTest ? JSON.parse(JSON.stringify(selectedTest)) : null);
  }, [selectedTest]);

  // Compute readiness from checklist items
  useEffect(() => {
    const checks = {
      patientVerified: true,
      reasonDocumented: !!(localTest && localTest.reason),
      fastingConfirmed: !!(localTest && localTest.fastingConfirmed),
      medsReviewed: !!(patient?.medications && patient.medications.length > 0),
      pastResultsFound: (pastResults && pastResults.length > 0),
      instructionsReady: true,
    };
    const total = Object.keys(checks).length;
    const passed = Object.values(checks).filter(Boolean).length;
    setReadiness(Math.round((passed / total) * 100));
  }, [localTest, pastResults, patient]);

  function analyze() {
    // Lightweight AI-like analysis for demo
    const last = pastResults[0];
    const trend = last ? `Last ${last.name}: ${last.result}${last.unit ? ' ' + last.unit : ''} on ${last.date}` : 'No related past results found.';
    const overall = localTest && localTest.name ? `${localTest.name} appears routine.` : 'No test selected.';
    const missing = localTest && !localTest.fastingConfirmed ? 'Confirm fasting instructions with patient.' : 'All preparation steps appear set.';
    setAiAnalysis({ overall, trend, missing, urgency: localTest?.priority === 'Urgent' ? 'Urgent' : 'Not urgent', preparation: readiness });
  }

  useEffect(() => { analyze(); }, [localTest, pastResults, readiness]);

  // Simulate completion of the test and auto-update: adds a past result and reruns AI
  function simulateCompleteTest() {
    if (!localTest) return;
    const completedResult = {
      id: `sim-${Date.now().toString(36).slice(2,8)}`,
      name: localTest.name,
      date: new Date().toLocaleDateString(),
      result: (Math.random() * (localTest.expectedRangeMax ? localTest.expectedRangeMax : 5)).toFixed(1),
      unit: localTest.units || '',
      normalRange: localTest.normalRange || '',
    };
    setPastResults((p) => [completedResult, ...p]);
    setLocalTest((t: any) => ({ ...t, status: 'Completed' }));
    setLastUpdated(Date.now());
  }

  function copyInstructions() {
    const text = `Please arrive on ${localTest?.date || 'the scheduled date'}. ${localTest?.instructions || ''}`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function sendToPatient() {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      // pretend sent
    }, 1000);
  }

  function printInstructions() {
    window.print();
  }

  function addFollowUp() {
    setFollowUpAdded(true);
    setTimeout(() => setFollowUpAdded(false), 2000);
  }

  return (
    <div className="min-h-screen py-8" style={{ background: 'linear-gradient(180deg,#F7FBFC 0%, #F2FAF8 100%)' }}>
      <div className="max-w-[1500px] mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-[#DDE7F0] pb-4">
            <div className="flex items-center gap-4">
              <BackToPatientButton patientId={patient?.id} />
              <h1 className="text-3xl font-extrabold text-[#121A2D]">Upcoming Test Plan</h1>
            </div>

          <div className="flex items-center gap-4">
            <SmallBadge tone="blue">Scheduled</SmallBadge>
            <div className="text-sm text-neutral-500">Updated {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'just now'}</div>
          </div>
        </div>

        {/* Page shell */}
        <div className="bg-white rounded-[28px] border border-[#DDE7F0] shadow-lg p-8 min-h-[72vh]">
          {/* Hero */}
          <div className="flex items-start justify-between gap-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-sky-50 to-emerald-50 shadow-sm">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M3 7h18M5 7v10a4 4 0 004 4h6a4 4 0 004-4V7" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 3h8v4H8z" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="text-xl font-semibold text-[#121A2D]">{localTest?.name || 'Upcoming Test'}</div>
                <div className="mt-1 text-sm text-gray-600">{localTest?.subtitle || 'Cholesterol and heart risk markers'}</div>
                <div className="mt-3 text-sm text-gray-500">Ordered by <span className="font-medium text-gray-900">{localTest?.orderingDoctor || 'Dr. Aris Thorne'}</span></div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <SmallBadge tone="teal">{localTest?.status || 'Scheduled'}</SmallBadge>
              <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700 w-[220px] text-right">
                <div className="text-xs text-neutral-500">Collection date</div>
                <div className="font-semibold text-gray-900">{localTest?.date || 'Jun 01, 2026'}</div>
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="bg-white rounded-lg p-4 border border-[#E8EEF5] mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-500">Collection date</div>
                <div className="font-semibold text-gray-900">{localTest?.date || 'Jun 01, 2026'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Ordering doctor</div>
                <div className="font-semibold text-gray-900">{localTest?.orderingDoctor || 'Dr. Aris Thorne'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Specimen</div>
                <div className="font-semibold text-gray-900">{localTest?.specimen || 'Blood'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Fasting</div>
                <div className="font-semibold text-gray-900">{localTest?.fastingRequired ? 'Yes — 8–12 hours' : 'No'}</div>
              </div>
            </div>
          </div>

          {/* Main 3-column workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left (cols 1-5) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Test Order Details */}
              <div className="bg-white rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#121A2D]">Test Order Details</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                  <div>
                    <div className="text-xs text-gray-500">Test category</div>
                    <div className="font-semibold">Cardiology / Metabolic</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Ordered date</div>
                    <div className="font-semibold">{localTest?.orderedDate || 'May 30, 2026'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Priority</div>
                    <div><SmallBadge tone={localTest?.priority === 'Routine' ? 'gray' : 'amber'}>{localTest?.priority || 'Routine'}</SmallBadge></div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Status</div>
                    <div><SmallBadge tone="teal">{localTest?.status || 'Scheduled'}</SmallBadge></div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Turnaround time</div>
                    <div className="font-semibold">24 hours</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Collection location</div>
                    <div className="font-semibold">{localTest?.location || 'Main Lab'}</div>
                  </div>
                </div>
              </div>

              {/* Why This Test Was Ordered */}
              <div className="bg-white rounded-lg p-6 border">
                <h3 className="text-lg font-semibold text-[#121A2D]">Why This Test Was Ordered</h3>
                <div className="mt-3 rounded-md bg-sky-50 p-4 text-sm text-sky-800">This Lipid Panel was ordered to monitor cholesterol levels and cardiovascular risk because the patient has hypertension and is taking Atorvastatin.</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm">Hypertension</button>
                  <button className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm">Atorvastatin 20 mg</button>
                </div>
              </div>

              {/* Related Past Results */}
              <div className="bg-white rounded-lg p-6 border">
                <h3 className="text-lg font-semibold text-[#121A2D]">Related Past Results</h3>
                <div className="mt-3 text-sm text-gray-700">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="text-sm">Sep 2025</div>
                    <div className="text-sm font-semibold">LDL 3.8 mmol/L</div>
                    <div className="text-sm"><SmallBadge tone="amber">High</SmallBadge></div>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div className="text-sm">Jan 2026</div>
                    <div className="text-sm font-semibold">LDL 3.0 mmol/L</div>
                    <div className="text-sm"><SmallBadge tone="amber">Borderline</SmallBadge></div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="text-sm">Jun 2026</div>
                    <div className="text-sm font-semibold">LDL 2.6 mmol/L</div>
                    <div className="text-sm"><SmallBadge tone="teal">Normal</SmallBadge></div>
                  </div>
                </div>
                <div className="mt-4 text-right">
                  <button onClick={() => router.push(`/dashboard/records/${patient?.id}/labs?patient=${patient?.id}&selected=${pastResults?.[0]?.id || ''}`)} className="text-teal-600 hover:underline text-sm">View full lab history →</button>
                </div>
              </div>
            </div>

            {/* Middle (cols 6-8) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Status Timeline */}
              <div className="bg-white rounded-lg p-6 border">
                <h3 className="text-lg font-semibold text-[#121A2D]">Status Timeline</h3>
                <div className="mt-4">
                  {[
                    { title: 'Ordered', date: localTest?.orderedDate || 'May 30, 2026', status: 'Completed' },
                    { title: 'Scheduled', date: localTest?.date || 'Jun 01, 2026', status: 'Current' },
                    { title: 'Collection Pending', date: '', status: 'Upcoming' },
                    { title: 'Sent to Lab', date: '', status: 'Upcoming' },
                    { title: 'Results Pending', date: '', status: 'Upcoming' },
                    { title: 'Results Reviewed', date: '', status: 'Upcoming' },
                    { title: 'Patient Notified', date: '', status: 'Upcoming' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-4 py-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${s.status === 'Completed' ? 'bg-emerald-500' : s.status === 'Current' ? 'ring-2 ring-teal-200 bg-white' : 'bg-gray-200'}`} />
                        {i < 6 && <div className={`w-px h-6 ${s.status === 'Completed' || s.status === 'Current' ? 'bg-teal-200' : 'bg-gray-100'}`} />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{s.title}</div>
                        <div className="text-xs text-gray-500">{s.date || s.status}</div>
                      </div>
                      {s.status === 'Current' && <div className="text-sm"><SmallBadge tone="teal">Current</SmallBadge></div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Fasting Requirements */}
              <div className="bg-white rounded-lg p-6 border">
                <h3 className="text-lg font-semibold text-[#121A2D]">Fasting Requirements</h3>
                <div className="mt-3 rounded-md bg-amber-50 p-4 text-sm text-amber-800">
                  <div className="font-semibold">Fasting required</div>
                  <div className="mt-1">Do not eat for 8–12 hours before the test. Water is allowed.</div>
                  <div className="mt-2 text-xs text-amber-700">If unsure, contact the clinic before fasting.</div>
                </div>
              </div>

              {/* Patient Instructions */}
              <div className="bg-white rounded-lg p-6 border">
                <h3 className="text-lg font-semibold text-[#121A2D]">Patient Instructions</h3>
                <div className="mt-3 text-sm text-gray-700">Please arrive at Main Lab on {localTest?.date || 'the scheduled date'}. Bring your ID or health card. If fasting is required, do not eat for 8–12 hours before the test. Water is usually allowed.</div>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-start gap-2"><span className="text-emerald-600">✓</span> Arrive at Main Lab</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-600">✓</span> Bring ID or health card</li>
                  <li className="flex items-start gap-2"><span className="text-amber-600">⚠</span> Fast for 8–12 hours if instructed</li>
                </ul>
                <div className="mt-4 flex gap-3">
                  <button onClick={copyInstructions} className="px-3 py-2 rounded-md border bg-white">{copied ? 'Copied' : 'Copy Instructions'}</button>
                  <button onClick={sendToPatient} className="px-3 py-2 rounded-md bg-teal-600 text-white">{sending ? 'Sending...' : 'Send to Patient'}</button>
                  <button onClick={printInstructions} className="px-3 py-2 rounded-md border bg-white">Print</button>
                </div>
              </div>
            </div>

            {/* Right (cols 9-12) */}
            <div className="lg:col-span-3 space-y-4">
              {/* AI Preparation Checklist */}
              <div className="bg-white rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#121A2D]">AI Preparation Checklist</h3>
                  <div className="text-xs text-gray-500">Clinical review required</div>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    { k: 'Patient identity verified', v: true },
                    { k: 'Test reason documented', v: !!localTest?.reason },
                    { k: 'Fasting instructions checked', v: !!localTest?.fastingConfirmed },
                    { k: 'Medication context reviewed', v: !!(patient?.medications && patient.medications.length > 0) },
                    { k: 'Related past result found', v: pastResults.length > 0 },
                    { k: 'Patient instructions ready', v: true },
                    { k: 'Urgency check', v: localTest?.priority !== 'Urgent' },
                  ].map((it, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${it.v ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        <div className="text-sm text-gray-800">{it.k}</div>
                      </div>
                      <div className="text-sm">{it.v ? <SmallBadge tone="teal">Complete</SmallBadge> : <SmallBadge tone="amber">Needs review</SmallBadge>}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Readiness */}
              <div className="bg-white rounded-lg p-6 border flex flex-col items-center text-center">
                <h3 className="text-lg font-semibold text-[#121A2D] mb-3">Test Readiness</h3>
                <ProgressRing percent={readiness} />
                <div className="mt-3 text-sm text-gray-700">{readiness >= 90 ? 'Mostly ready' : 'One preparation item needs review'}</div>
              </div>

              {/* AI Summary */}
              <div className="bg-sky-50 rounded-lg p-4 border">
                <div className="text-sm font-semibold">AI Summary</div>
                <div className="mt-2 text-sm text-gray-800">{aiAnalysis?.overall}</div>
                <div className="mt-2 text-xs text-gray-600">{aiAnalysis?.trend}</div>
                <div className="mt-3 flex gap-2">
                  <SmallBadge tone="blue">Urgency: {aiAnalysis?.urgency}</SmallBadge>
                  <SmallBadge tone="teal">Preparation: {aiAnalysis?.preparation}%</SmallBadge>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg p-6 border">
                <h3 className="text-sm font-semibold text-[#121A2D]">Quick Actions</h3>
                <div className="mt-3 grid gap-3">
                  <button onClick={() => router.push(`/dashboard/records/${patient?.id}/messages`)} className="w-full px-3 py-2 rounded-md bg-white border">Message Patient</button>
                  <button onClick={addFollowUp} className="w-full px-3 py-2 rounded-md bg-teal-600 text-white">Add Follow-up Task</button>
                  <button onClick={copyInstructions} className="w-full px-3 py-2 rounded-md border bg-white">Copy Instructions</button>
                  <button onClick={printInstructions} className="w-full px-3 py-2 rounded-md border bg-white">Print Instructions</button>
                  <button onClick={() => router.push(`/dashboard/records/${patient?.id}/labs`)} className="w-full px-3 py-2 rounded-md border bg-white">View Full Lab History</button>
                  <button onClick={() => router.push(`/dashboard/records/${patient?.id}/schedule?test=${selectedId}`)} className="w-full px-3 py-2 rounded-md border bg-white">Reschedule Test</button>
                  <button onClick={simulateCompleteTest} className="w-full px-3 py-2 rounded-md border bg-white">Simulate test completion</button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="fixed left-1/2 -translate-x-1/2 bottom-6 w-[min(1100px,92%)]">
            <div className="bg-white rounded-full p-3 shadow-md border flex items-center justify-between px-6">
              <div className="text-sm text-gray-600">Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'just now'} • AI support is not a diagnosis</div>
              <div className="flex items-center gap-3">
                <BackToPatientButton patientId={patient?.id} className="px-3 py-2 text-sm" />
                <button onClick={copyInstructions} className="px-3 py-2 rounded-md border bg-white text-sm">Copy Instructions</button>
                <button onClick={() => router.push(`/dashboard/records/${patient?.id}/messages`)} className="px-3 py-2 rounded-md border bg-white text-sm">Message Patient</button>
                <button onClick={addFollowUp} className="px-4 py-2 rounded-md bg-teal-600 text-white text-sm">{followUpAdded ? 'Added' : 'Add Follow-up Task'}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
