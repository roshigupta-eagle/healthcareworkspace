"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PatientBanner } from '@/design-system/clinical/PatientBanner';

export default function MessagesClient({ patient }: { patient: any }) {
  const router = useRouter();

  const initialConversations: any[] = [
    {
      id: 'conv-med',
      title: 'Medication question',
      tags: ['Unread', 'Needs Reply'],
      status: 'open',
      unreadCount: 1,
      messages: [
        { id: 'm1', sender: 'patient', author: patient.name || 'Patient', text: 'Should I take my new medication with food? I felt a little nauseous yesterday.', time: 'Today • 2:14 PM' },
        { id: 'm2', sender: 'internal', author: 'Dr. Patel', text: 'Consider medication timing instructions and side effect warning.', time: 'Today • 2:20 PM' },
        { id: 'm3', sender: 'clinician', author: 'Dr. Patel', text: 'You can take it with food to reduce nausea. Please contact us if symptoms continue.', time: 'Draft', draft: true },
      ],
    },
    {
      id: 'conv-lab',
      title: 'Lab result question',
      tags: ['Open'],
      status: 'open',
      unreadCount: 0,
      messages: [
        { id: 'l1', sender: 'patient', author: patient.name || 'Patient', text: 'Can you explain my cholesterol results?', time: 'Yesterday' },
      ],
    },
    {
      id: 'conv-appt',
      title: 'Appointment follow-up',
      tags: ['Resolved'],
      status: 'resolved',
      unreadCount: 0,
      messages: [
        { id: 'a1', sender: 'patient', author: patient.name || 'Patient', text: 'Can I reschedule?', time: '2 weeks ago' },
      ],
    },
  ];

  const [conversations, setConversations] = useState<any[]>(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string>(initialConversations[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('All');
  const [draftText, setDraftText] = useState('');
  const [draftSavedText, setDraftSavedText] = useState('Draft saved just now');
  const [internalNoteMode, setInternalNoteMode] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // scroll to bottom when conversation changes
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [selectedConversationId]);

  useEffect(() => {
    const t = setTimeout(() => setDraftSavedText('Draft saved just now'), 800);
    return () => clearTimeout(t);
  }, [draftText]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (filterTag !== 'All' && !c.tags.includes(filterTag)) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.messages.some((m: any) => (m.text || '').toLowerCase().includes(q));
    });
  }, [conversations, searchQuery, filterTag]);

  function selectConversation(id: string) {
    setSelectedConversationId(id);
    setConversations((prev) => prev.map((c) => c.id === id ? { ...c, unreadCount: 0, tags: c.tags.filter((t: string) => t !== 'Unread') } : c));
  }

  function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) setAttachments((s) => [...s, ...files]);
    e.currentTarget.value = '';
  }

  function removeAttachment(i: number) {
    setAttachments((s) => s.filter((_, idx) => idx !== i));
  }

  function applyTemplate(text: string) {
    setDraftText((d) => (d ? d + '\n\n' + text : text));
    setShowTemplateModal(false);
    composerRef.current?.focus();
  }

  function sendMessage() {
    if (!draftText.trim() && attachments.length === 0) return;
    const newMsg = { id: `m-${Date.now()}`, sender: internalNoteMode ? 'internal' : 'clinician', author: 'You', text: draftText, time: new Date().toLocaleTimeString(), draft: false, attachments: attachments.map(a => ({ name: a.name })) };
    setConversations((prev) => prev.map((c) => c.id === selectedConversationId ? { ...c, messages: [...c.messages, newMsg], tags: c.tags.filter((t: string) => t !== 'Needs Reply'), status: 'open' } : c));
    setDraftText('');
    setAttachments([]);
    setDraftSavedText('Sent just now');
    setInternalNoteMode(false);
    setTimeout(() => setDraftSavedText('Draft saved just now'), 3000);
    setTimeout(() => {
      if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }, 50);
  }

  function markResolved() {
    setConversations((prev) => prev.map((c) => c.id === selectedConversationId ? { ...c, status: 'resolved', tags: ['Resolved'] } : c));
  }

  function createTask(task: any) {
    setTasks((t) => [{ ...task, id: `task-${Date.now()}`, createdAt: new Date().toISOString() }, ...t]);
    setShowTaskModal(false);
  }

  const currentConversation = conversations.find((c) => c.id === selectedConversationId) || conversations[0];

  return (
    <div className="bg-gradient-to-br from-white to-neutral-50 rounded-3xl p-6">
      <div className="bg-white rounded-2xl p-5 flex items-center justify-between mb-6 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(`/dashboard/records/${patient.id}`)} aria-label="Close messages" className="p-2 rounded-full hover:bg-neutral-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-neutral-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.28 4.28a1 1 0 011.42 0L10 8.586l4.3-4.3a1 1 0 111.42 1.42L11.414 10l4.3 4.3a1 1 0 01-1.42 1.42L10 11.414l-4.3 4.3a1 1 0 01-1.42-1.42L8.586 10 4.28 5.7a1 1 0 010-1.42z" clipRule="evenodd"/></svg>
          </button>
          <div>
            <div className="text-xl font-bold text-neutral-900">Messages</div>
            <div className="text-sm text-neutral-500">Secure conversation — {patient.name}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">{draftSavedText}</div>
          <button className="px-3 py-2 bg-neutral-100 rounded-md text-sm">Open in full view</button>
        </div>
      </div>

      <div className="p-4 mb-6 bg-neutral-50 rounded-xl">
        <PatientBanner
          mrn={patient.mrn}
          firstName={patient.name?.split(' ')[0]}
          lastName={patient.name?.split(' ').slice(1).join(' ')}
          dateOfBirth={patient.dob}
          age={patient.age}
          sex={patient.gender}
          allergies={patient.allergies || []}
          identifiers={patient.identifiers || [{ label: 'MRN', value: patient.mrn }]}
          verificationStatus={patient.verificationStatus || 'verified'}
        />
      </div>

      <div className="flex gap-6">
        {/* Left */}
        <div className="w-80 bg-white rounded-2xl shadow-sm p-4 flex flex-col">
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search messages..." className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm placeholder-neutral-400" />

          <div className="mt-3 flex flex-wrap gap-2">
            {['All','Unread','Needs Reply','Urgent','Labs','Meds'].map((t) => (
              <button key={t} onClick={() => setFilterTag(t)} className={`text-xs px-3 py-1 rounded-full ${filterTag===t? 'bg-teal-600 text-white' : 'bg-neutral-50 text-neutral-700'}`}>{t}</button>
            ))}
          </div>

          <div className="mt-4 overflow-auto" style={{ maxHeight: '64vh' }}>
            {filteredConversations.map((c) => (
              <div key={c.id} onClick={() => selectConversation(c.id)} role="button" tabIndex={0} className={`p-3 rounded-lg mb-3 cursor-pointer flex items-start gap-3 ${selectedConversationId === c.id ? 'bg-teal-50 border-l-4 border-teal-400 shadow-sm' : 'hover:bg-neutral-50'}`}>
                <div className="w-9 h-9 bg-neutral-100 rounded-full flex items-center justify-center text-sm font-semibold text-neutral-700">{c.title.split(' ').map((w:any)=>w[0]).slice(0,2).join('')}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{c.title}</div>
                    <div className="text-xs text-neutral-500">{c.unreadCount ? <span className="inline-flex items-center justify-center w-6 h-6 bg-teal-600 text-white text-xs rounded-full">{c.unreadCount}</span> : ''}</div>
                  </div>
                  <div className="text-xs text-neutral-600 mt-1 truncate">{c.messages[c.messages.length-1]?.text}</div>
                  <div className="mt-2 flex gap-2">
                    {c.tags.map((tag: string) => (
                      <span key={tag} className="text-xs bg-neutral-100 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-lg font-semibold">{currentConversation?.title}</div>
              <div className="flex gap-2">
                {currentConversation?.tags?.map((tag: string) => (
                  <span key={tag} className="text-xs px-2 py-1 rounded-full bg-neutral-50 text-neutral-700">{tag}</span>
                ))}
              </div>
            </div>
            <div>
              <button onClick={markResolved} className="px-3 py-2 bg-neutral-100 rounded-md text-sm">Mark Resolved</button>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-auto space-y-4" ref={threadRef}>
            {currentConversation?.messages?.map((m: any) => (
              <div key={m.id} className={`flex ${m.sender === 'clinician' ? 'justify-end' : 'justify-start'}`}>
                {m.sender === 'internal' && (
                  <div className="max-w-2xl w-full">
                    <div className="bg-yellow-50 border-l-4 border-yellow-300 p-3 rounded"> 
                      <div className="text-xs font-semibold text-yellow-800">Internal note — not visible to patient</div>
                      <div className="mt-2 text-sm text-neutral-800">{m.text}</div>
                    </div>
                  </div>
                )}

                {m.sender === 'patient' && (
                  <div className="max-w-2xl w-full">
                    <div className="bg-white border p-3 rounded-lg shadow-sm">
                      <div className="text-xs text-neutral-600">{m.author} • {m.time}</div>
                      <div className="mt-1 text-sm text-neutral-800">{m.text}</div>
                    </div>
                  </div>
                )}

                {m.sender === 'clinician' && (
                  <div className="max-w-2xl w-full flex justify-end">
                    <div className="bg-teal-600 text-white p-3 rounded-lg shadow-md">
                      <div className="text-xs text-teal-100">{m.author} • {m.time}{m.draft ? ' • draft' : ''}</div>
                      <div className="mt-1 text-sm">{m.text}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t">
            <div className="text-xs text-neutral-600 mb-2">Write a clear, patient-friendly reply...</div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 text-sm bg-neutral-50 rounded">B</button>
                <label className="px-2 py-1 text-sm bg-neutral-50 rounded cursor-pointer"><input onChange={handleAttach} type="file" multiple className="hidden" />📎 Attach</label>
                <button onClick={() => setShowTemplateModal(true)} className="px-2 py-1 text-sm bg-neutral-50 rounded">Template</button>
                <button onClick={() => setInternalNoteMode((s) => !s)} className={`px-2 py-1 text-sm rounded ${internalNoteMode ? 'bg-yellow-50 border' : 'bg-neutral-50'}`}>Internal</button>
                <div className="flex-1 text-right text-xs text-neutral-400">{draftSavedText}</div>
              </div>

              <div className="flex items-start gap-3">
                <textarea ref={composerRef} value={draftText} onChange={(e) => setDraftText(e.target.value)} placeholder="Write a clear, patient-friendly reply..." className="flex-1 rounded-xl border border-teal-200 p-4 resize-none h-36 shadow-sm" />

                <div className="flex flex-col items-stretch gap-2 w-48">
                  <button className="w-full px-3 py-2 bg-white border rounded">Templates</button>
                  <button onClick={() => setShowTaskModal(true)} className="w-full px-3 py-2 bg-white border rounded">Task</button>
                  <button onClick={sendMessage} className="w-full px-3 py-2 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded shadow">Send Message</button>
                </div>
              </div>

              {attachments.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {attachments.map((a, idx) => (
                    <div key={idx} className="bg-neutral-50 px-3 py-1 rounded flex items-center gap-2 text-sm">
                      <span>{a.name}</span>
                      <button onClick={() => removeAttachment(idx)} className="text-xs text-red-500">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right */}
        <aside className="w-80 bg-white rounded-2xl shadow p-5 sticky top-6">
          <div className="text-sm font-semibold text-neutral-900">Patient Context</div>
          <div className="mt-3 space-y-3 text-sm text-neutral-600">
            <div>
              <div className="font-medium text-neutral-800">Safety Snapshot</div>
              <div className="mt-2 flex flex-col gap-2">
                <span className="text-xs bg-neutral-50 px-3 py-1 rounded-full">No known allergies</span>
                <span className="text-xs bg-red-50 text-red-700 px-3 py-1 rounded-full">High risk</span>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">Verified identity</span>
              </div>
            </div>

            <div>
              <div className="font-medium text-neutral-800">Current Medications</div>
              <ul className="mt-2 space-y-2">
                {(patient.medications || []).map((m: any, idx: number) => (
                  <li key={idx} className="bg-neutral-50 p-2 rounded text-sm">{m.name} {m.dose ? `• ${m.dose}` : ''} {m.freq ? `• ${m.freq}` : ''}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="font-medium text-neutral-800">Recent Labs</div>
              <ul className="mt-2 space-y-2">
                {(patient.labResults || []).map((l: any) => (
                  <li key={l.id} className="bg-neutral-50 p-2 rounded text-sm">{l.name} — {l.result} {l.unit || ''} • {l.date}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="font-medium text-neutral-800">Open Tasks</div>
              <ul className="mt-2 space-y-2">
                {tasks.length ? tasks.map((t: any) => <li key={t.id} className="bg-neutral-50 p-2 rounded text-sm">{t.title} • due {t.due || '—'}</li>) : <li className="text-sm text-neutral-500">No open tasks</li>}
              </ul>
            </div>

            <div>
              <div className="font-medium text-neutral-800">Quick Actions</div>
              <div className="mt-2 flex flex-col gap-2">
                <button onClick={() => router.push(`/dashboard/encounters/new?patientId=${patient.id}`)} className="text-sm bg-neutral-50 px-3 py-2 rounded">Start Encounter</button>
                <button onClick={() => router.push(`/dashboard/prescriptions/new?patientId=${patient.id}`)} className="text-sm bg-neutral-50 px-3 py-2 rounded">Prescribe</button>
                <button onClick={() => router.push(`/dashboard/records/${patient.id}`)} className="text-sm bg-neutral-50 px-3 py-2 rounded">View Full Chart</button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="font-semibold">Message templates</h3>
            <div className="mt-4 space-y-3">
              <button onClick={() => applyTemplate('Thank you for your message. We recommend taking ...')} className="w-full text-left p-3 bg-neutral-50 rounded">Medication guidance template</button>
              <button onClick={() => applyTemplate('We have received your results. Please see ...')} className="w-full text-left p-3 bg-neutral-50 rounded">Lab results template</button>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowTemplateModal(false)} className="px-4 py-2 bg-white border rounded">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="font-semibold">Create task</h3>
            <TaskForm onCreate={createTask} onCancel={() => setShowTaskModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function TaskForm({ onCreate, onCancel }: any) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  return (
    <div>
      <div className="mt-3">
        <label className="text-sm">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border rounded mt-1" />
      </div>
      <div className="mt-3">
        <label className="text-sm">Due</label>
        <input value={due} onChange={(e) => setDue(e.target.value)} type="date" className="w-full p-2 border rounded mt-1" />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-2 bg-white border rounded">Cancel</button>
        <button onClick={() => onCreate({ title, due })} className="px-3 py-2 bg-teal-600 text-white rounded">Create</button>
      </div>
    </div>
  );
}
