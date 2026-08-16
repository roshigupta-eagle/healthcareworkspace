"use client";

import React, { useMemo, useState } from 'react';
import BackToPatientButton from '@/components/BackToPatientButton';
import Link from 'next/link';

type Props = {
  patient: any;
  conditionName: string;
  patientId: string;
};

export default function ConditionDetailClient({ patient, conditionName, patientId }: Props) {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const key = (conditionName || '').toLowerCase();
  const isHypertension = key.includes('hypert');
  const isDiabetes = key.includes('diabet');

  const bpReadings = useMemo(() => {
    if (!isHypertension) return [];
    return [
      { date: '2025-01-15', systolic: 138, diastolic: 88 },
      { date: '2025-02-20', systolic: 130, diastolic: 82 },
      { date: '2025-04-10', systolic: 128, diastolic: 78 },
      { date: '2025-05-15', systolic: 132, diastolic: 80 },
      { date: '2026-06-05', systolic: 128, diastolic: 76 },
    ];
  }, [isHypertension]);

  const a1cReadings = useMemo(() => {
    if (!isDiabetes) return [];
    return [
      { date: '2025-01-15', value: 7.6 },
      { date: '2025-07-01', value: 7.4 },
      { date: '2026-04-10', value: 7.2 },
    ];
  }, [isDiabetes]);

  const latestBP = bpReadings[bpReadings.length - 1];

  const tabs = ['overview', 'history', 'related', 'careplan', 'monitoring', 'notes'];

  return (
    <div className="mt-6">
      {/* Top header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BackToPatientButton patientId={patientId} />
          <div>
            <div className="text-2xl font-bold text-[#0f1724]">Condition Detail</div>
            <div className="text-sm text-gray-500">{conditionName}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div>Updated just now</div>
          <button aria-label="Refresh" className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">🔄</button>
          <button aria-label="More" className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">⋯</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Hero card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center text-white text-xl font-bold">C</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{conditionName}</div>
                    <div className="mt-1 text-sm text-gray-500">{isHypertension ? 'Chronic' : isDiabetes ? 'Chronic' : 'Condition'}</div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <div className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm">ICD-10: {isHypertension ? 'I10' : isDiabetes ? 'E11.9' : '—'}</div>
                      <div className={`px-3 py-1 rounded-full text-sm ${isHypertension ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>{isHypertension ? 'Active' : isDiabetes ? 'Active' : 'Status'}</div>
                    </div>
                    <div className="text-sm text-gray-500 mt-2">Diagnosed On: {isHypertension ? 'May 15, 2022' : isDiabetes ? 'Aug 01, 2021' : '—'}</div>
                    <div className="text-sm text-gray-500">Managing Provider: {patient.lastAttendingDoctor || '—'}</div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-700">{isHypertension ? 'Hypertension is a chronic condition in which the force of the blood against the artery walls is too high.' : isDiabetes ? 'Type 2 Diabetes is a chronic metabolic condition characterized by insulin resistance and hyperglycemia.' : 'Condition overview.'}</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg p-2 shadow-sm ring-1 ring-gray-100">
            <div role="tablist" aria-label="Condition sections" className="flex gap-2 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={activeTab === t}
                  onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 rounded-md text-sm ${activeTab === t ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-100' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Main workspace - Overview tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 shadow-sm ring-1 ring-gray-100">
                  <h4 className="text-lg font-semibold text-gray-900">Condition Overview</h4>
                  <p className="mt-3 text-sm text-gray-700">{isHypertension ? 'Hypertension is a chronic condition in which the force of the blood against the artery walls is too high.' : isDiabetes ? 'Type 2 Diabetes requires regular monitoring of glycemic control and related complications.' : 'Overview content.'}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
                    <div>
                      <div className="text-xs text-gray-500">Duration</div>
                      <div className="font-medium text-gray-900">{isHypertension ? '4 years' : isDiabetes ? '5 years' : '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Control Status</div>
                      <div className="font-medium text-gray-900">{isHypertension ? 'Controlled' : isDiabetes ? 'Suboptimal' : '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Severity</div>
                      <div className="font-medium text-gray-900">{isHypertension ? 'Moderate' : isDiabetes ? 'Moderate' : '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Last Reviewed</div>
                      <div className="font-medium text-gray-900">Jun 05, 2026</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm ring-1 ring-gray-100">
                  <h4 className="text-lg font-semibold text-gray-900">Recent {isHypertension ? 'Blood Pressure' : isDiabetes ? 'A1C' : 'Measurements'}</h4>
                  <div className="mt-4">
                    {isHypertension && bpReadings.length > 0 ? (
                      <div>
                        <svg viewBox="0 0 100 40" className="w-full h-32" preserveAspectRatio="none">
                          <polyline fill="none" stroke="#0f766e" strokeWidth="2" points={bpReadings.map((p, i) => `${(i/(bpReadings.length-1))*100},${40 - ((p.systolic - 110) / 40) * 30}`).join(' ')} />
                        </svg>
                        <div className="mt-2 text-sm">
                          <div className="font-medium text-gray-900">Latest: {latestBP ? `${latestBP.systolic}/${latestBP.diastolic} mmHg` : '—'}</div>
                          <div className="text-xs text-gray-500">Status: Good</div>
                        </div>
                      </div>
                    ) : isDiabetes && a1cReadings.length > 0 ? (
                      <div>
                        <div className="text-sm font-medium">Latest A1C: {a1cReadings[a1cReadings.length - 1].value}%</div>
                        <div className="text-xs text-gray-500 mt-1">Goal: &lt; 7.0%</div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No recent measurements</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-lg p-6 shadow-sm ring-1 ring-gray-100">
                    <h4 className="text-lg font-semibold text-gray-900">Risk Factors</h4>
                    <ul className="mt-3 space-y-2 text-sm text-gray-700">
                      <li>• Family history of hypertension</li>
                      <li>• Sedentary lifestyle</li>
                      <li>• Overweight</li>
                      <li>• High sodium intake</li>
                      <li>• Stress</li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-lg p-6 shadow-sm ring-1 ring-gray-100">
                    <h4 className="text-lg font-semibold text-gray-900">Associated Symptoms</h4>
                    <div className="mt-3 text-sm text-gray-700">{patient.currentConcerns && patient.currentConcerns.length > 0 ? patient.currentConcerns.join(', ') : 'None reported'}</div>
                  </div>

                  <div className="bg-white rounded-lg p-6 shadow-sm ring-1 ring-gray-100">
                    <h4 className="text-lg font-semibold text-gray-900">Condition Timeline</h4>
                    <div className="mt-4 space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-24 text-xs text-gray-400">May 15, 2022</div>
                        <div className="flex-1 bg-gray-50 p-3 rounded-md">
                          <div className="font-medium">Diagnosed</div>
                          <div className="text-xs text-gray-500">Initial diagnosis based on elevated BP readings.</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-24 text-xs text-gray-400">Jun 01, 2022</div>
                        <div className="flex-1 bg-gray-50 p-3 rounded-md">
                          <div className="font-medium">Treatment Started</div>
                          <div className="text-xs text-gray-500">Started on Lisinopril 10 mg once daily.</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-24 text-xs text-gray-400">Jun 05, 2026</div>
                        <div className="flex-1 bg-gray-50 p-3 rounded-md">
                          <div className="font-medium">Reviewed</div>
                          <div className="text-xs text-gray-500">BP controlled. Continue current management.</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-6 shadow-sm ring-1 ring-gray-100">
                    <h4 className="text-lg font-semibold text-gray-900">Recent Notes</h4>
                    <div className="mt-3 space-y-3 text-sm text-gray-700">
                      {(patient.notes || []).slice(0, 3).map((n: any) => (
                        <div key={n.id} className="border-b border-gray-100 pb-2">
                          <div className="font-medium text-gray-900">{n.author} <span className="text-xs text-gray-500">• {n.date}</span></div>
                          <div className="text-xs text-gray-500 mt-1">{n.snippet}</div>
                        </div>
                      ))}
                      {(patient.notes || []).length === 0 && <div className="text-sm text-gray-500">No recent notes</div>}
                      <div className="mt-3"><Link href={`/dashboard/records/${patientId}/doctor-notes`} className="text-teal-600 text-sm">View All Notes →</Link></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-100">
                    <h5 className="text-md font-semibold text-gray-900">Related Information</h5>
                    <div className="mt-3 text-sm text-gray-700 space-y-2">
                      <Link href={`/dashboard/records/${patientId}/medications`} className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-md"> <div>Medications</div> <div className="text-sm text-gray-500">{(patient.medications || []).length}</div> </Link>
                      <Link href={`/dashboard/records/${patientId}/labs`} className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-md"> <div>Related Labs</div> <div className="text-sm text-gray-500">{(patient.labResults || []).length}</div> </Link>
                      <Link href={`/dashboard/records/${patientId}`} className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-md"> <div>Recent Visits</div> <div className="text-sm text-gray-500">{(patient.history || []).length}</div> </Link>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-100">
                    <h5 className="text-md font-semibold text-gray-900">Care Plan Summary</h5>
                    <div className="mt-3 text-sm text-gray-700 space-y-2">
                      <div className="flex items-center justify-between"><div>Medication Adherence</div><div className="text-sm text-green-700">On Track</div></div>
                      <div className="flex items-center justify-between"><div>Lifestyle Modification</div><div className="text-sm text-green-700">On Track</div></div>
                      <div className="flex items-center justify-between"><div>Follow-up</div><div className="text-sm text-teal-700">Due in 6 weeks</div></div>
                      <div className="mt-3"><Link href="#" className="text-teal-600 text-sm">View Care Plan →</Link></div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-teal-50 rounded-lg p-4 shadow-sm ring-1 ring-gray-100">
                    <h5 className="text-md font-semibold text-gray-900">AI Condition Summary</h5>
                    <div className="mt-3 text-sm text-gray-700">BP is well-controlled with current treatment. Continue monitoring and lifestyle management. Consider reviewing renal function and electrolytes periodically.</div>
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-2 bg-purple-600 text-white rounded-md">Generate Full Summary</button>
                      <button className="px-3 py-2 border border-gray-200 rounded-md">Create Follow-up Task</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-100">
                <h4 className="text-lg font-semibold text-gray-900">Document Center</h4>
                <div className="mt-3 space-y-2">
                  {(patient.documents || []).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between">
                      <div className="text-sm text-gray-800">{d.name}</div>
                      <div className="text-sm text-teal-600"><a href={d.url} className="hover:underline">Download</a></div>
                    </div>
                  ))}
                  {(patient.documents || []).length === 0 && <div className="text-sm text-gray-500">No documents linked to this condition.</div>}
                </div>
              </div>
            </div>
          )}

          {/* other tabs could render alternate content */}
        </div>

        {/* Right sidebar */}
        <aside className="lg:col-span-4 space-y-6">
        </aside>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-3 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-500">Last updated just now</div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-md">Add Note</button>
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-md">Message Patient</button>
            <button className="px-4 py-2 bg-teal-600 text-white rounded-md">Create Follow-up Task</button>
          </div>
        </div>
      </div>
    </div>
  );
}
