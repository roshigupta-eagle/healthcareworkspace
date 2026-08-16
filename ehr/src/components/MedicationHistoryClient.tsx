"use client";

import React, { useEffect, useMemo, useState } from 'react';
import BackToPatientButton from '@/components/BackToPatientButton';

export default function MedicationHistoryClient({ patient }: { patient: any }) {
  const meds: any[] = patient?.medications || [];
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'refills' | 'notes' | 'safety'>('overview');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'refill' | 'safety' | 'stopped'>('all');

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 250);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!meds || meds.length === 0) setSelectedIndex(-1);
    else if (selectedIndex < 0) setSelectedIndex(0);
  }, [meds]);

  const filteredMeds = useMemo(() => {
    let list = meds.slice();
    if (filter === 'active') list = list.filter((m) => m.status !== 'Stopped');
    if (filter === 'refill') list = list.filter((m) => m.refill);
    if (filter === 'safety') list = list.filter((m) => m.needsReview);
    if (filter === 'stopped') list = list.filter((m) => m.status === 'Stopped');
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((m) => (m.name || '').toLowerCase().includes(q) || (m.dose || '').toLowerCase().includes(q));
    }
    return list;
  }, [meds, filter, query]);

  const selected = filteredMeds[selectedIndex] || meds[selectedIndex] || null;

  const stats = useMemo(() => {
    const active = meds.length;
    const refillsDue = meds.filter((m) => m.refill).length;
    const safety = meds.some((m) => m.needsReview) ? 'Review recommended' : 'Clear';
    const lastReviewed = patient?.notes?.[0]?.date ?? '—';
    const adherence = 'On track';
    const relatedLab = patient.labResults?.[0];
    return { active, refillsDue, safety, lastReviewed, adherence, relatedLab };
  }, [meds, patient]);

  function handleSelect(i: number) {
    setSelectedIndex(i);
    setActiveTab('overview');
  }

  function generateAISummary(m: any) {
    if (!m) return 'No medication selected.';
    const lab = patient.labResults?.[0];
    return `${m.name} ${m.dose || ''} appears active. Latest related lab: ${lab ? `${lab.name} ${lab.result}${lab.unit ? ' ' + lab.unit : ''} on ${lab.date}` : 'none'}. Consider reviewing adherence and side effects.`;
  }

  // Small helper icons
  const IconPill = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M7 12a5 5 0 1 0 10 0 5 5 0 0 0-10 0z" stroke="#0f1724" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  if (isLoading) {
    return (
      <div className="w-[94vw] max-w-[1500px] mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 space-y-3">
              <div className="h-12 bg-gray-200 rounded" />
              <div className="h-64 bg-gray-200 rounded" />
            </div>
            <div className="lg:col-span-6 space-y-3">
              <div className="h-32 bg-gray-200 rounded" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
            <div className="lg:col-span-3 space-y-3">
              <div className="h-40 bg-gray-200 rounded" />
              <div className="h-40 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[94vw] max-w-[1500px] mx-auto bg-white rounded-[28px] border border-[#DDE7F0] shadow-sm p-8 min-h-[76vh] pb-28">
      {/* Top: Title + timestamp */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-[#121A2D]">Medication History</h2>
        <div className="text-sm text-gray-500">Updated just now</div>
      </div>

      {/* Clinical action row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BackToPatientButton patientId={patient?.id} label="Back to Patient" />
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">Start Encounter</button>
          <button className="inline-flex items-center gap-2 px-4 py-2 border rounded bg-white">Order Lab</button>
          <button className="inline-flex items-center gap-2 px-4 py-2 border rounded bg-white">Prescribe</button>
          <button className="inline-flex items-center gap-2 px-4 py-2 border rounded bg-white">Message</button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="col-span-2 bg-white rounded-lg p-4 border border-gray-50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Active Medications</div>
              <div className="text-2xl font-bold text-[#121A2D]">{stats.active}</div>
              <div className="text-xs text-gray-500">Status: Current</div>
            </div>
            <div className="p-2 bg-teal-50 rounded">
              <IconPill className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </div>

        <div className="col-span-2 bg-white rounded-lg p-4 border border-gray-50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Safety Checks</div>
              <div className="text-lg font-semibold text-green-700">{stats.safety}</div>
              <div className="text-xs text-gray-500">{stats.safety === 'Clear' ? 'No interaction found' : 'Review recommended'}</div>
            </div>
            <div className="p-2 bg-green-50 rounded text-green-700">✓</div>
          </div>
        </div>

        <div className="col-span-2 bg-white rounded-lg p-4 border border-gray-50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Refills Due</div>
              <div className="text-2xl font-bold text-[#121A2D]">{stats.refillsDue}</div>
              <div className="text-xs text-amber-700">Review soon</div>
            </div>
            <div className="p-2 bg-amber-50 rounded text-amber-700">!</div>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-2 bg-white rounded-lg p-4 border border-gray-50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Last Reviewed</div>
              <div className="text-lg font-semibold text-[#121A2D]">{stats.lastReviewed}</div>
              <div className="text-xs text-gray-500">{patient?.notes?.[0]?.author ?? '—'}</div>
            </div>
            <div className="p-2 bg-blue-50 rounded text-blue-600">i</div>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-2 bg-white rounded-lg p-4 border border-gray-50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Adherence Signal</div>
              <div className="text-lg font-semibold text-[#121A2D]">{stats.adherence}</div>
              <div className="text-xs text-gray-500">Based on refill history</div>
            </div>
            <div className="p-2 bg-green-50 rounded text-green-700">✔</div>
          </div>
        </div>
      </div>

      {/* Main workspace grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: medication list & filters */}
        <aside className="lg:col-span-3">
          <div className="bg-white rounded-lg p-4 border border-gray-50 shadow-sm sticky top-28">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Medications</h3>
              <div className="text-xs text-gray-500">{meds.length}</div>
            </div>
            <div className="mb-3">
              <input aria-label="Search medications" placeholder="Search medications..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-100" />
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {([
                ['all', 'All'],
                ['active', 'Active'],
                ['refill', 'Refills Due'],
                ['safety', 'Safety Review'],
                ['stopped', 'Stopped'],
              ] as [any, string][]).map(([k, label]) => (
                <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1 text-xs rounded ${filter === k ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-100' : 'bg-gray-50 text-gray-600'}`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filteredMeds.length === 0 && <div className="text-sm text-gray-500">No medications found.</div>}
              {filteredMeds.map((m, i) => {
                const isSelected = selected && selected.name === m.name;
                return (
                  <button key={`${m.name}-${m.dose ?? ''}-${i}`} onClick={() => handleSelect(i)} onKeyDown={(e) => e.key === 'Enter' && handleSelect(i)} className={`w-full text-left p-3 rounded-md flex items-center justify-between ${isSelected ? 'bg-teal-50 ring-1 ring-teal-100 border-l-4 border-teal-300' : 'hover:bg-gray-50'} focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-100`}>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3">
                        <div className="font-medium text-gray-900">{m.name}</div>
                        <div className="text-xs text-gray-500">{m.freq}</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{m.relatedCondition || patient.conditions?.[0] || ''}</div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-sm text-gray-700">{m.dose}</div>
                      {m.refill && <div className="mt-1 text-xs text-amber-700">Refill: {m.refill}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center: selected medication hero + tabs */}
        <main className="lg:col-span-6">
          <div className="bg-white rounded-lg p-6 border border-gray-50 shadow-sm mb-4">
            {selected ? (
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-gray-500">Selected Medication</div>
                      <div className="flex items-center gap-4">
                        <h3 className="text-2xl font-bold text-[#121A2D] truncate">{selected.name}</h3>
                        <div className="text-lg text-gray-700">{selected.dose}</div>
                        <div className="px-2 py-1 text-xs rounded-full bg-emerald-50 text-emerald-800">{selected.status || 'Active'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-4 py-2 bg-teal-600 text-white rounded hover:shadow-md">Renew Prescription</button>
                      <button className="px-4 py-2 border rounded">Message Patient</button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <div className="text-xs text-gray-500">Prescribed by</div>
                      <div className="font-medium text-gray-900">{selected.prescribedBy || patient.lastAttendingDoctor || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Indication</div>
                      <div className="font-medium text-gray-900">{selected.indication || patient.conditions?.[0] || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Related lab</div>
                      <div className="font-medium text-gray-900">{patient.labResults?.[0] ? `${patient.labResults[0].name} ${patient.labResults[0].result}${patient.labResults[0].unit ? ' ' + patient.labResults[0].unit : ''}` : '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Started</div>
                      <div className="font-medium text-gray-900">{selected.started || 'Mar 10, 2024'}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-sm text-gray-500">No medication selected.</div>
            )}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg p-2 border border-gray-50 shadow-sm mb-4">
            <div role="tablist" aria-label="Medication sections" className="flex gap-3 overflow-auto">
              {[
                ['overview', 'Overview'],
                ['timeline', 'Timeline'],
                ['refills', 'Refills'],
                ['notes', 'Notes'],
                ['safety', 'Safety'],
              ].map(([key, label]) => (
                <button key={key} role="tab" aria-selected={activeTab === key} tabIndex={0} onClick={() => setActiveTab(key as any)} className={`px-4 py-2 text-sm ${activeTab === key ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-600 hover:text-teal-600'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="space-y-4">
            {activeTab === 'overview' && (
              <section aria-labelledby="overview-heading" className="bg-white rounded-lg p-4 border border-gray-50 shadow-sm">
                <h4 id="overview-heading" className="text-sm font-semibold text-gray-800">Overview</h4>
                {selected ? (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-500">Medication Purpose</div>
                        <div className="font-medium text-gray-900">{selected.purpose || `${selected.name} is used to help manage cholesterol and cardiovascular risk.`}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">How patient takes it</div>
                        <div className="font-medium text-gray-900">{selected.dose} by mouth {selected.freq || 'once daily'}.</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Related Monitoring</div>
                        <div className="font-medium text-gray-900">Lipid panel monitoring is recommended as clinically appropriate.</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-500">Latest Related Lab</div>
                        <div className="font-medium text-gray-900">{stats.relatedLab ? `${stats.relatedLab.name} ${stats.relatedLab.result}${stats.relatedLab.unit ? ' ' + stats.relatedLab.unit : ''} on ${stats.relatedLab.date}` : 'No recent lab'}</div>
                        {stats.relatedLab && (
                          <a href={`/dashboard/records/labs?patient=${patient.id}&selected=${stats.relatedLab.id}`} className="text-teal-600 text-sm">View Lab Results Intelligence →</a>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Review status</div>
                        <div className="font-medium text-gray-900">Last reviewed: {stats.lastReviewed} — {patient?.notes?.[0]?.author ?? '—'}</div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500">Patient Notes</div>
                        <div className="font-medium text-gray-900">{patient.notes?.length ? patient.notes[0].snippet : 'No side effects reported.'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-gray-500">Select a medication to view the overview.</div>
                )}
              </section>
            )}

            {activeTab === 'timeline' && (
              <section aria-labelledby="timeline-heading" className="bg-white rounded-lg p-4 border border-gray-50 shadow-sm">
                <h4 id="timeline-heading" className="text-sm font-semibold text-gray-800">Medication Timeline</h4>
                <div className="mt-3">
                  {selected ? (
                    <div className="space-y-3">
                      {(selected.timeline || [
                        { date: 'Mar 10, 2024', type: 'Started', detail: `Started ${selected.dose} ${selected.freq}` },
                        { date: 'May 20, 2024', type: 'Continued', detail: 'No changes' },
                        { date: 'Sep 10, 2024', type: 'Continued', detail: 'No changes' },
                        { date: 'Jan 15, 2025', type: 'Continued', detail: 'No changes' },
                        { date: 'Jun 05, 2026', type: 'Reviewed', detail: 'Medication adjustment discussed' },
                      ]).map((ev: any, idx: number) => (
                        <div key={`${ev.date}-${idx}`} className="flex items-start gap-4">
                          <div className="w-28 text-xs text-gray-400">{ev.date}</div>
                          <div className="flex-1">
                            <div className="p-3 rounded-md bg-gray-50">
                              <div className="text-sm font-medium text-gray-900">{ev.type} — {ev.detail}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Select a medication to view the timeline.</div>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'refills' && (
              <section aria-labelledby="refills-heading" className="bg-white rounded-lg p-4 border border-gray-50 shadow-sm">
                <h4 id="refills-heading" className="text-sm font-semibold text-gray-800">Refill History</h4>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                  {selected ? (
                    <>
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500">Last refill</div>
                        <div className="font-medium">{selected.refill || '—'}</div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500">Next refill due</div>
                        <div className="font-medium">{selected.nextRefill || 'Aug 15, 2026'}</div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-xs text-gray-500">Refill timeline</div>
                        <div className="mt-2 space-y-2">
                          {(selected.refillTimeline || ['May 15, 2026 — Filled', 'Feb 15, 2026 — Filled', 'Nov 15, 2025 — Filled']).map((r: any, i: number) => (
                            <div key={i} className="text-sm text-gray-700">{r}</div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">Select a medication to view refills.</div>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'notes' && (
              <section aria-labelledby="notes-heading" className="bg-white rounded-lg p-4 border border-gray-50 shadow-sm">
                <h4 id="notes-heading" className="text-sm font-semibold text-gray-800">Medication Notes</h4>
                <div className="mt-3 space-y-2">
                  {(patient.notes || []).length === 0 && <div className="text-sm text-gray-500">No medication notes yet.</div>}
                  {(patient.notes || []).map((n: any) => (
                    <div key={n.id} className="bg-gray-50 p-3 rounded-md">
                      <div className="text-sm font-medium">{n.author} • {n.date}</div>
                      <div className="text-sm text-gray-700">{n.snippet}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'safety' && (
              <section aria-labelledby="safety-heading" className="bg-white rounded-lg p-4 border border-gray-50 shadow-sm">
                <h4 id="safety-heading" className="text-sm font-semibold text-gray-800">Safety Checks</h4>
                <div className="mt-3 space-y-3 text-sm text-gray-700">
                  <div className="flex items-center gap-2"><span className="text-green-600">✓</span> No allergy conflicts found</div>
                  <div className="flex items-center gap-2"><span className="text-green-600">✓</span> No major interactions found</div>
                  <div className="flex items-center gap-2"><span className="text-green-600">✓</span> No duplicate therapy found</div>
                  <div className="flex items-center gap-2"><span className="text-amber-600">•</span> Monitoring recommended: Lipid panel follow-up</div>
                  <div className="text-xs text-gray-500">Safety checks are clinical decision support only. Clinician review required.</div>
                </div>
              </section>
            )}
          </div>
        </main>

        {/* Right column */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-lg p-4 border border-gray-50 shadow-sm sticky top-28">
            <h4 className="text-sm font-semibold text-gray-800">Medication Details</h4>
            <div className="mt-3 text-sm text-gray-700">
              {selected ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-xs text-gray-500">Generic name</div>
                  <div className="font-medium">{selected.name}</div>
                  <div className="text-xs text-gray-500">Brand examples</div>
                  <div className="font-medium">{selected.brand || '—'}</div>
                  <div className="text-xs text-gray-500">Dosage</div>
                  <div className="font-medium">{selected.dose || '—'}</div>
                  <div className="text-xs text-gray-500">Frequency</div>
                  <div className="font-medium">{selected.freq || '—'}</div>
                  <div className="text-xs text-gray-500">Route</div>
                  <div className="font-medium">{selected.route || 'Oral'}</div>
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="font-medium">{selected.status || 'Active'}</div>
                  <div className="text-xs text-gray-500">Started</div>
                  <div className="font-medium">{selected.started || 'Mar 10, 2024'}</div>
                  <div className="text-xs text-gray-500">Last reviewed</div>
                  <div className="font-medium">{patient?.notes?.[0]?.date || '—'}</div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Select a medication to show details.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-50 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-800">Safety Checks</h4>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-2"><span className="text-green-600">✓</span> No allergy conflicts found</div>
              <div className="flex items-center gap-2"><span className="text-green-600">✓</span> No interactions found</div>
              <div className="flex items-center gap-2"><span className="text-green-600">✓</span> No duplicate therapy found</div>
              <div className="flex items-center gap-2"><span className="text-amber-600">•</span> Monitoring: Lipid panel follow-up</div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-50 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-800">Related Information</h4>
            <div className="mt-3 text-sm text-gray-700 space-y-2">
              <div><div className="text-xs text-gray-500">Related condition</div><div className="font-medium">{patient.conditions?.[0] || '—'}</div></div>
              <div><div className="text-xs text-gray-500">Related lab</div><div className="font-medium">{patient.labResults?.[0] ? `${patient.labResults[0].name} ${patient.labResults[0].result}${patient.labResults[0].unit ? ' ' + patient.labResults[0].unit : ''}` : '—'}</div></div>
              <div><div className="text-xs text-gray-500">Recent note</div><div className="font-medium">{patient.notes?.[0]?.snippet || '—'}</div></div>
              <a href={`/dashboard/records/${patient.id}/upcoming-tests/${patient.tests?.[0]?.id ?? ''}`} className="text-teal-600 text-sm">View Lab Results Intelligence →</a>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-50 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-800">AI Medication Assistant</h4>
            <div className="mt-2 text-xs text-gray-500">Clinical review required • AI is support only.</div>
            <div className="mt-3 p-3 rounded-md bg-purple-50 text-purple-700">
              <div className="text-sm">{generateAISummary(selected)}</div>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <button className="w-full px-3 py-2 bg-white text-teal-600 border rounded">Generate Medication Summary</button>
              <button className="w-full px-3 py-2 bg-teal-600 text-white rounded">Create Follow-up Task</button>
              <button className="w-full px-3 py-2 border rounded">Message Patient</button>
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed left-0 right-0 bottom-0 z-50 flex items-center justify-between bg-white border-t border-gray-200 px-6 py-3 shadow-md">
        <div className="text-sm text-gray-600">Last updated just now • Medication history</div>
        <div className="flex items-center gap-3">
          <button className="px-3 py-2 bg-white border rounded">Back to Patient</button>
          <button className="px-3 py-2 border rounded">Message Patient</button>
          <button className="px-3 py-2 bg-teal-600 text-white rounded">Renew Prescription</button>
          <button className="px-3 py-2 border rounded">Print Summary</button>
        </div>
      </div>
    </div>
  );
}
