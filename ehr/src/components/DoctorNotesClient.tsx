"use client";

import React, { useEffect, useMemo, useState } from 'react';

type Note = {
  id: string;
  author: string;
  role?: string;
  date: string;
  type: string;
  snippet: string;
  body?: string;
  related?: { condition?: string; medication?: string; lab?: string }[];
  signed?: boolean;
  status?: string;
};

export default function DoctorNotesClient({ patient, initialShowComposer = false }: { patient: any; initialShowComposer?: boolean }) {
  // Seed a rich set of clinical notes to make the timeline feel complete even in demo/mock data
  const sampleNotes: Note[] = [
    {
      id: 'n-chen-2026-06-05',
      author: 'Dr. Chen',
      role: 'MD',
      date: '2026-06-05',
      type: 'Progress Note',
      snippet: 'Reviewed BP; medication adjustment recommended.',
      body: 'Reviewed blood pressure measurements. Consider titrating medication if home readings remain elevated. Arrange follow-up in 2 weeks.',
      related: [{ condition: 'Hypertension', medication: 'Atorvastatin', lab: 'Lipid Panel - LDL 2.6 mmol/L' }],
      signed: true,
      status: 'Signed',
    },
    {
      id: 'n-lee-2026-05-18',
      author: 'Dr. Lee',
      role: 'MD',
      date: '2026-05-18',
      type: 'Follow-up Note',
      snippet: 'Patient reported improved energy and sleep.',
      body: 'Patient reports improved energy and sleep since last visit. Reinforce lifestyle measures and continue current medications.',
      related: [],
      signed: true,
      status: 'Signed',
    },
    {
      id: 'n-patel-2026-04-22',
      author: 'Nurse Patel',
      role: 'RN',
      date: '2026-04-22',
      type: 'Phone Note',
      snippet: 'Follow-up call completed. No urgent symptoms reported.',
      body: 'Phone outreach completed. Patient reports adherence to exercise plan. No chest pain or syncope.',
      related: [],
      signed: false,
      status: 'Reviewed',
    },
    {
      id: 'n-thorne-2026-04-10',
      author: 'Dr. Aris Thorne',
      role: 'MD',
      date: '2026-04-10',
      type: 'Care Plan',
      snippet: 'Continue BP monitoring and lifestyle plan.',
      body: 'Care plan updated: daily BP logs, low-sodium diet, increase walking to 150 min/week, consider med review if uncontrolled.',
      related: [{ condition: 'Hypertension' }],
      signed: true,
      status: 'Signed',
    },
    {
      id: 'n-lee-2026-03-02',
      author: 'Dr. Lee',
      role: 'MD',
      date: '2026-03-02',
      type: 'Lab Review',
      snippet: 'LDL improving. Continue current management.',
      body: 'Lipid panel shows improving LDL; continue statin and recheck in 6 months.',
      related: [{ lab: 'Lipid Panel - LDL 2.6 mmol/L', medication: 'Atorvastatin' }],
      signed: true,
      status: 'Signed',
    },
  ];

  // Merge patient notes with sample notes (avoid duplicates) so the timeline is rich by default
  const mergedNotes = useMemo(() => {
    const existing: Note[] = (patient && patient.notes) || [];
    const ids = new Set(existing.map((n: Note) => n.id));
    const combined = [...existing, ...sampleNotes.filter((s) => !ids.has(s.id))];
    return combined.sort((a, b) => (new Date(b.date)).getTime() - (new Date(a.date)).getTime());
  }, [patient]);

  const [notes, setNotes] = useState<Note[]>(mergedNotes);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [noteType, setNoteType] = useState('All');
  const [provider, setProvider] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [onlyFollowUp, setOnlyFollowUp] = useState(false);
  const [onlyMedChanges, setOnlyMedChanges] = useState(false);
  const [onlyLabRefs, setOnlyLabRefs] = useState(false);
  const [onlyUnsigned, setOnlyUnsigned] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(mergedNotes[0]?.id ?? null);
  const [showComposer, setShowComposer] = useState<boolean>(initialShowComposer ?? false);
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 320);
    return () => clearTimeout(t);
  }, []);

  const providers = useMemo(() => {
    const p = new Set<string>();
    notes.forEach((n) => p.add(n.author));
    return Array.from(p);
  }, [notes]);

  const noteTypes = useMemo(() => {
    const t = new Set<string>();
    notes.forEach((n) => t.add(n.type));
    return ['All', ...Array.from(t)];
  }, [notes]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return notes
      .filter((n) => (noteType === 'All' ? true : n.type === noteType))
      .filter((n) => (provider === 'All' ? true : n.author === provider))
      .filter((n) => {
        if (startDate && new Date(n.date) < new Date(startDate)) return false;
        if (endDate && new Date(n.date) > new Date(endDate)) return false;
        return true;
      })
      .filter((n) => {
        if (onlyFollowUp && !(n.snippet || '').toLowerCase().includes('follow')) return false;
        if (onlyMedChanges && !((n.related || []).some((r) => !!r.medication))) return false;
        if (onlyLabRefs && !((n.related || []).some((r) => !!r.lab))) return false;
        if (onlyUnsigned && n.signed) return false;
        return true;
      })
      .filter((n) => {
        if (!s) return true;
        return ((n.snippet || '').toLowerCase().includes(s) || (n.body || '').toLowerCase().includes(s) || n.author.toLowerCase().includes(s));
      })
      .sort((a, b) => (new Date(b.date)).getTime() - (new Date(a.date)).getTime());
  }, [notes, search, noteType, provider, startDate, endDate, onlyFollowUp, onlyMedChanges, onlyLabRefs, onlyUnsigned]);

  const selected = useMemo(() => notes.find((n) => n.id === selectedId) || filtered[0] || null, [selectedId, notes, filtered]);

  function clearFilters() {
    setSearch('');
    setNoteType('All');
    setProvider('All');
    setStartDate('');
    setEndDate('');
    setOnlyFollowUp(false);
    setOnlyMedChanges(false);
    setOnlyLabRefs(false);
    setOnlyUnsigned(false);
  }

  function addNote(newNote: Note) {
    setNotes((s) => [newNote, ...s]);
    setSelectedId(newNote.id);
    setToast('Note saved');
    setTimeout(() => setToast(null), 2500);
  }

  function formatDate(d: string) {
    try {
      return new Date(d).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
    } catch {
      return d;
    }
  }

  function initials(name?: string) {
    if (!name) return 'NA';
    const parts = name.split(' ');
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  }

  function badgeForStatus(status?: string) {
    if (!status) return 'bg-gray-50 text-gray-700';
    if (status === 'Signed') return 'bg-green-50 text-green-700';
    if (status === 'Reviewed') return 'bg-blue-50 text-blue-700';
    if (status === 'Draft') return 'bg-amber-50 text-amber-800';
    return 'bg-gray-50 text-gray-700';
  }

  function generateAISummary(nlist: Note[]) {
    if (!nlist || nlist.length === 0) return 'No notes to summarize.';
    const topics: Record<string, number> = {};
    nlist.forEach((n) => {
      (n.related || []).forEach((r) => {
        if (r.condition) topics[r.condition] = (topics[r.condition] || 0) + 1;
      });
    });
    const top = Object.keys(topics).sort((a, b) => (topics[b] || 0) - (topics[a] || 0))[0] || 'general care';
    return `Recent notes focus on ${top}. Consider reviewing trends, medication adherence, and follow-up tasks.`;
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="grid" style={{ gridTemplateColumns: '280px 1fr 360px', gap: 24 }}>
          <div className="h-64 bg-gray-200 rounded" />
          <div>
            <div className="h-8 bg-gray-200 rounded mb-3" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
          <div className="h-80 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const stats = {
    total: notes.length,
    recentNote: notes[0] ? formatDate(notes[0].date) : '—',
    followUps: notes.filter((n) => (n.snippet || '').toLowerCase().includes('follow')).length,
    medChanges: notes.filter((n) => (n.related || []).some((r) => r.medication)).length,
    labRefs: notes.filter((n) => (n.related || []).some((r) => r.lab)).length,
    topTopic: (() => {
      const topics: Record<string, number> = {};
      notes.forEach((n) => (n.related || []).forEach((r) => { if (r.condition) topics[r.condition] = (topics[r.condition] || 0) + 1; }));
      return Object.keys(topics).sort((a,b) => (topics[b]||0)-(topics[a]||0))[0] || (patient.conditions?.[0] || 'General');
    })(),
  };

  return (
    <div className="w-full">
      {/* Summary strip */}
      <div className="bg-white rounded-2xl border border-[#DDE7F0] shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-[#121A2D]">Doctor Notes Timeline</h3>
            <div className="text-sm text-gray-600 mt-1">Review recent clinical notes, follow-up items, medication changes, and related patient context.</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowComposer(true)} className="px-4 py-2 bg-teal-600 text-white rounded-md shadow-sm">Add New Note</button>
            <button className="px-3 py-2 border rounded-md text-sm text-teal-600">Print</button>
            <button className="px-3 py-2 border rounded-md text-sm text-teal-600">Export PDF</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-6 gap-3">
          <div className="col-span-1 bg-[#F6F9FB] p-3 rounded-lg text-sm">
            <div className="text-xs text-gray-500">Total Notes</div>
            <div className="font-semibold text-[#121A2D]">{stats.total}</div>
          </div>
          <div className="col-span-1 bg-[#F2FFFB] p-3 rounded-lg text-sm">
            <div className="text-xs text-gray-500">Recent Note</div>
            <div className="font-semibold">{stats.recentNote}</div>
          </div>
          <div className="col-span-1 bg-[#FFF4D4] p-3 rounded-lg text-sm">
            <div className="text-xs text-gray-500">Follow-up Items</div>
            <div className="font-semibold">{stats.followUps}</div>
          </div>
          <div className="col-span-1 bg-[#E8FFF6] p-3 rounded-lg text-sm">
            <div className="text-xs text-gray-500">Medication Changes</div>
            <div className="font-semibold">{stats.medChanges}</div>
          </div>
          <div className="col-span-1 bg-[#EAF4FF] p-3 rounded-lg text-sm">
            <div className="text-xs text-gray-500">Lab References</div>
            <div className="font-semibold">{stats.labRefs}</div>
          </div>
          <div className="col-span-1 bg-[#F2EDFF] p-3 rounded-lg text-sm">
            <div className="text-xs text-gray-500">Most Common Topic</div>
            <div className="font-semibold">{stats.topTopic}</div>
          </div>
        </div>
      </div>

      {/* Workspace layout */}
      <div className="grid" style={{ gridTemplateColumns: '280px 1fr 360px', gap: 24 }}>
        {/* LEFT - Filters */}
        <aside>
          <div className="bg-white rounded-xl border border-[#DDE7F0] p-5 shadow-sm sticky top-24">
            <h4 className="text-lg font-semibold text-[#121A2D]">Filters</h4>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-gray-500">Search</label>
                <input aria-label="Search notes" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." className="w-full mt-2 px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-200" />
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2">Note Type</div>
                <div className="flex flex-wrap gap-2">
                  {noteTypes.map((t) => (
                    <button key={t} onClick={() => setNoteType(t)} className={`px-3 py-1 text-sm rounded ${noteType === t ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-100' : 'bg-gray-50 text-gray-600'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2">Provider</div>
                <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-200">
                  <option>All</option>
                  {providers.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2">Date Range</div>
                <div className="flex gap-2">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-1/2 px-2 py-2 border rounded" />
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-1/2 px-2 py-2 border rounded" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyFollowUp} onChange={(e) => setOnlyFollowUp(e.target.checked)} />Only notes with follow-up</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyMedChanges} onChange={(e) => setOnlyMedChanges(e.target.checked)} />Only medication changes</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyLabRefs} onChange={(e) => setOnlyLabRefs(e.target.checked)} />Only lab references</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyUnsigned} onChange={(e) => setOnlyUnsigned(e.target.checked)} />Only unsigned notes</label>
              </div>

              <div className="pt-2">
                <button onClick={clearFilters} className="w-full px-3 py-2 border border-teal-200 text-teal-700 rounded">Clear Filters</button>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER - Timeline and selected detail */}
        <main>
          <div className="bg-white rounded-xl border border-[#DDE7F0] p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <h4 className="text-xl font-semibold text-[#121A2D]">Notes Timeline</h4>
              <div className="text-sm text-gray-500">Showing {filtered.length} notes</div>
            </div>

            <div className="mt-6 relative">
              <div className="absolute left-10 top-0 bottom-0 w-px bg-[#E6EEF2]" aria-hidden />
              <div className="pl-16 space-y-4">
                {filtered.length === 0 ? (
                  <div className="bg-[#F6F9FB] rounded p-6 text-center text-gray-500">No notes match your filters. Try clearing filters or searching another term.</div>
                ) : (
                  filtered.map((n) => {
                    const isSelected = selected && selected.id === n.id;
                    return (
                      <div
                        key={n.id}
                        tabIndex={0}
                        role="button"
                        aria-label={`Open note from ${n.author} on ${formatDate(n.date)}`}
                        onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(n.id); }}
                        onClick={() => setSelectedId(n.id)}
                        className={`relative bg-white p-4 rounded-lg border ${isSelected ? 'border-teal-200 shadow-md bg-teal-50' : 'border-gray-100'} hover:-translate-y-0.5 hover:shadow-md transition transform focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200`}
                      >
                        <div className="absolute -left-6 top-5 w-3 h-3 rounded-full bg-white ring-4 ring-white">
                          <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-teal-600' : 'bg-teal-400'}`} />
                        </div>

                        <div className="flex items-start justify-between gap-6">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-md bg-[#EEF2FF] flex items-center justify-center text-sm font-semibold text-[#7C3AED]">{initials(n.author)}</div>
                            <div>
                              <div className="text-sm font-medium text-[#121A2D]">{n.author} <span className="text-xs text-gray-500">• {formatDate(n.date)}</span></div>
                              <div className="text-sm text-gray-700 mt-1">{n.snippet}</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(n.related || []).map((r, idx) => (
                                  <div key={`${n.id}-related-${idx}-${r.condition||r.medication||r.lab}`} className="px-2 py-0.5 text-xs rounded bg-gray-50 text-gray-700">{r.condition || r.medication || r.lab}</div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <div className="text-sm">
                              <span className="inline-block px-2 py-1 text-xs rounded bg-blue-50 text-blue-700">{n.type}</span>
                              <span className={`ml-2 inline-block px-2 py-1 text-xs rounded ${badgeForStatus(n.status)}`}>{n.status || (n.signed ? 'Signed' : 'Draft')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setSelectedId(n.id)} className="text-sm text-teal-600">View</button>
                              <button onClick={() => { navigator.clipboard?.writeText(n.body || n.snippet); setToast('Copied note text'); setTimeout(() => setToast(null), 1500); }} className="text-sm text-gray-600">Copy</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Selected note detail */}
          <div className="mt-6 bg-white rounded-xl border border-[#DDE7F0] p-6 shadow-sm">
            {selected ? (
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold text-[#121A2D]">Selected Note Detail</div>
                    <div className="text-sm text-gray-500">{selected.type} • {formatDate(selected.date)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="px-3 py-2 border rounded-md">Edit Note</button>
                    <button className="px-3 py-2 bg-teal-600 text-white rounded-md">Create Follow-up Task</button>
                    <button className="px-3 py-2 border rounded-md">Print Note</button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-md bg-[#EEF2FF] flex items-center justify-center font-semibold text-[#7C3AED]">{initials(selected.author)}</div>
                      <div>
                        <div className="text-sm font-medium text-[#121A2D]">{selected.author}</div>
                        <div className="text-xs text-gray-500">Signed by: {selected.author} • Last updated: {formatDate(selected.date)}</div>
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-gray-800 whitespace-pre-wrap">{selected.body || selected.snippet}</div>

                    <div className="mt-4">
                      <div className="text-xs text-gray-500">Related</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(selected.related || []).map((r, i) => (
                          <div key={`${selected.id}-related-${i}-${r.condition||r.medication||r.lab}`} className="px-3 py-1 rounded-full bg-gray-50 text-gray-700 text-sm">{r.condition || r.medication || r.lab}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Status</div>
                    <div className="mt-2"><span className={`px-3 py-1 text-sm rounded ${badgeForStatus(selected.status)}`}>{selected.status || (selected.signed ? 'Signed' : 'Draft')}</span></div>
                    <div className="mt-4">
                      <div className="text-xs text-gray-500">Follow-up</div>
                      <div className="mt-2 text-sm">Monitor BP trend; re-evaluate in 6 weeks.</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Select a note to view details.</div>
            )}
          </div>
        </main>

        {/* RIGHT - Summary, AI, Context, Quick Actions */}
        <aside>
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-[#DDE7F0] p-4 shadow-sm">
              <h5 className="text-sm font-semibold text-[#121A2D]">Notes Summary</h5>
              <div className="mt-3 text-sm text-gray-700 space-y-2">
                <div className="flex justify-between"><div>Total notes</div><div className="font-medium">{stats.total}</div></div>
                <div className="flex justify-between"><div>Recent note</div><div className="font-medium">{stats.recentNote}</div></div>
                <div className="flex justify-between"><div>Most common topic</div><div className="font-medium">{stats.topTopic}</div></div>
                <div className="flex justify-between"><div>Medication changes</div><div className="font-medium">{stats.medChanges}</div></div>
                <div className="flex justify-between"><div>Follow-up items</div><div className="font-medium">{stats.followUps}</div></div>
                <div className="mt-2 text-xs text-gray-500">Insight: Most recent note recommends medication review and BP monitoring.</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#DDE7F0] p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-semibold text-[#121A2D]">AI Notes Assistant</h5>
                <div className="text-xs text-gray-500">Clinical review required</div>
              </div>
              <div className="mt-3 text-sm text-gray-700">{generateAISummary(notes)}</div>
              <div className="mt-3 flex flex-col gap-2">
                <button onClick={() => setAiSummaryOpen(true)} className="w-full px-3 py-2 bg-[#F2EDFF] text-[#6046B6] rounded">Generate Notes Summary</button>
                <button onClick={() => { setToast('Follow-up task created'); setTimeout(() => setToast(null), 2000); }} className="w-full px-3 py-2 bg-teal-600 text-white rounded">Create Follow-up Task</button>
                <button className="w-full px-3 py-2 border rounded">Message Patient</button>
              </div>
              <div className="mt-2 text-xs text-gray-500">AI support is not a diagnosis. Clinician review required.</div>
            </div>

            <div className="bg-white rounded-xl border border-[#DDE7F0] p-4 shadow-sm">
              <h5 className="text-sm font-semibold text-[#121A2D]">Patient Context</h5>
              <div className="mt-3 text-sm text-gray-700 space-y-2">
                <div>
                  <div className="text-xs text-gray-500">Conditions</div>
                  <div className="mt-2 flex flex-wrap gap-2">{(patient.conditions || []).map((c: string) => <div key={c} className="px-3 py-1 rounded-full bg-[#E8FFF6] text-[#078B5D] text-sm">{c}</div>)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Medications</div>
                  <div className="mt-2 text-sm">{(patient.medications || []).map((m: any) => <div key={`${m.name}-${m.dose || m.freq || ''}`}>{m.name} — {m.dose || m.freq}</div>)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Recent lab</div>
                  <div className="mt-1 text-sm">{patient.labResults?.[0]?.name} — {patient.labResults?.[0]?.result}</div>
                </div>
                <div className="mt-2"><a href="#" className="text-teal-600 text-sm">View full patient context →</a></div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#DDE7F0] p-4 shadow-sm">
              <h5 className="text-sm font-semibold text-[#121A2D]">Quick Actions</h5>
              <div className="mt-3 grid gap-2">
                <button onClick={() => setShowComposer(true)} className="w-full px-3 py-2 bg-teal-600 text-white rounded">Add New Note</button>
                <button className="w-full px-3 py-2 border rounded">Create Follow-up Task</button>
                <button className="w-full px-3 py-2 border rounded">Message Patient</button>
                <button className="w-full px-3 py-2 border rounded">View Medication History</button>
                <button className="w-full px-3 py-2 border rounded">View Lab Results</button>
                <button className="w-full px-3 py-2 border rounded">Export PDF</button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Composer modal (polished) */}
      {showComposer && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/40">
          <div className="bg-white w-full max-w-3xl rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add New Note</h3>
              <button onClick={() => setShowComposer(false)} className="text-sm text-gray-500">Close</button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-gray-500">Note type</label>
                <select className="w-full px-3 py-2 border rounded mt-1">
                  <option>Progress Note</option>
                  <option>Care Plan</option>
                  <option>Phone Note</option>
                  <option>Medication Note</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Title</label>
                <input className="w-full px-3 py-2 border rounded mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Note body</label>
                <textarea rows={8} className="w-full px-3 py-2 border rounded mt-1" />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { const id = `n-${Date.now()}`; addNote({ id, author: 'You', date: new Date().toISOString().slice(0,10), type: 'Progress Note', snippet: 'New note saved', body: 'Full note body...', related: [], signed: false, status: 'Draft' }); setShowComposer(false); }} className="px-4 py-2 bg-teal-600 text-white rounded">Save</button>
                <button onClick={() => setShowComposer(false)} className="px-4 py-2 border rounded">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Summary modal */}
      {aiSummaryOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-2xl rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Generated Notes Summary</h3>
              <button onClick={() => setAiSummaryOpen(false)} className="text-sm text-gray-500">Close</button>
            </div>
            <div className="mt-4 text-sm text-gray-700">{generateAISummary(filtered)}</div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { navigator.clipboard?.writeText(generateAISummary(filtered)); setToast('Summary copied'); setAiSummaryOpen(false); setTimeout(() => setToast(null), 2000); }} className="px-3 py-2 bg-teal-600 text-white rounded">Copy summary</button>
              <button onClick={() => { setToast('Follow-up task created'); setAiSummaryOpen(false); setTimeout(() => setToast(null), 2000); }} className="px-3 py-2 border rounded">Create follow-up task</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed right-6 bottom-6 bg-green-50 text-green-700 px-4 py-2 rounded shadow">{toast}</div>
      )}
    </div>
  );
}
