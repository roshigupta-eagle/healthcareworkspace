"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ClinicalTask } from '@/types/clinicalTask';
import type { DoctorNote, DoctorNoteSection, DoctorNoteType } from '@/types/doctorNote';
import type { Patient } from '@/app/dashboard/records/mockPatients';
import { useToast } from '@/components/Toast';
import { NOTE_TYPE_LABELS, formatNoteDate } from '@/components/doctor-notes/constants';
import { AlertIcon, CalendarIcon } from '@/components/doctor-notes/Icons';
import FollowUpTaskDrawer from '@/components/doctor-notes/FollowUpTaskDrawer';
import PatientSafetyBar from './PatientSafetyBar';
import TemplateStep from './TemplateStep';
import NoteSectionEditor from './NoteSectionEditor';
import SectionNavigator from './SectionNavigator';
import DocumentationRightRail from './DocumentationRightRail';
import AiDraftAssistant from './AiDraftAssistant';
import StickyActionBar from './StickyActionBar';
import PreviewView from './PreviewView';
import ReviewAndSignView from './ReviewAndSignView';
import type { DoctorNoteTemplate } from '@/lib/noteTemplates';

type Stage = 'setup' | 'editing' | 'preview' | 'review';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Props = {
  patient: Patient;
  patientId: string;
  initialNote: DoctorNote | null;
  currentUser: { id: string; name: string };
};

export default function NoteEditorPage({ patient, patientId, initialNote, currentUser }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [stage, setStage] = useState<Stage>(initialNote ? 'editing' : 'setup');
  const [type, setType] = useState<DoctorNoteType>(initialNote?.type || 'progress');
  const [sections, setSections] = useState<DoctorNoteSection[]>(initialNote?.sections || []);
  const [noteId, setNoteId] = useState<string | null>(initialNote?.id || null);
  const [version, setVersion] = useState<number>(initialNote?.version || 1);
  const [followUpTaskId, setFollowUpTaskId] = useState<string | null>(initialNote?.followUpTaskId || null);
  const [existingFollowUpTask, setExistingFollowUpTask] = useState<ClinicalTask | null>(null);

  const [saveState, setSaveState] = useState<SaveState>(initialNote ? 'saved' : 'idle');
  const [dirty, setDirty] = useState(false);
  const [conflict, setConflict] = useState<DoctorNote | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [signing, setSigning] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [selectedText, setSelectedText] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushToast(message: string, level: 'success' | 'error' | 'info' = 'info') {
    toast.push({ message, level });
  }

  const persist = useCallback(
    async (nextSections: DoctorNoteSection[], nextType: DoctorNoteType, currentNoteId: string, currentVersion: number) => {
      setSaveState('saving');
      try {
        const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/notes/${encodeURIComponent(currentNoteId)}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sections: nextSections, type: nextType, version: currentVersion }),
        });
        if (res.status === 409) {
          const body = await res.json().catch(() => null);
          setConflict(body?.latest || null);
          setSaveState('error');
          return;
        }
        if (!res.ok) {
          setSaveState('error');
          return;
        }
        const updated: DoctorNote = await res.json();
        setVersion(updated.version);
        setSaveState('saved');
        setDirty(false);
      } catch {
        setSaveState('error');
      }
    },
    [patientId],
  );

  useEffect(() => {
    if (stage !== 'editing' || !noteId || !dirty) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persist(sections, type, noteId, version), 1200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, type, dirty]);

  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveDraftNow();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, sections, type, version]);

  async function startFromTemplate(template: DoctorNoteTemplate | null) {
    const chosenSections = template ? template.sections.map((s) => ({ ...s })) : [{ heading: '', body: '' }];
    const chosenType = template?.type || type;
    setType(chosenType);
    setSections(chosenSections);
    setStage('editing');
    setSaveState('saving');
    setCreationError(null);

    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/notes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: chosenType, sections: chosenSections, templateId: template?.id || null }),
      });
      if (!res.ok) throw new Error('failed');
      const created: DoctorNote = await res.json();
      setNoteId(created.id);
      setVersion(created.version);
      setSaveState('saved');
    } catch {
      setSaveState('error');
      setStage('setup');
      setCreationError("We couldn't start a new note.");
    }
  }

  function updateSectionBody(index: number, body: string) {
    setActiveSectionIndex(index);
    setSections((prev) => {
      if (prev[index]?.body === body) return prev;
      const next = prev.map((s, i) => (i === index ? { ...s, body } : s));
      setDirty(true);
      setSaveState('idle');
      return next;
    });
  }

  function insertAiDraft(text: string) {
    setSections((previous) => previous.map((section, index) => index === activeSectionIndex ? { ...section, body: section.body.trim() ? `${section.body.trim()}\n\n${text}` : text } : section));
    setDirty(true);
    setSaveState('idle');
  }

  function replaceSelectedText(text: string) {
    if (!selectedText.trim()) return;
    setSections((previous) => previous.map((section, index) => index === activeSectionIndex ? { ...section, body: section.body.includes(selectedText) ? section.body.replace(selectedText, text) : `${section.body}\n\n${text}` } : section));
    setSelectedText('');
    setDirty(true);
    setSaveState('idle');
  }

  async function saveDraftNow() {
    if (!noteId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await persist(sections, type, noteId, version);
    pushToast('Draft saved.', 'success');
  }

  function attemptBack() {
    if (dirty) {
      setShowUnsavedDialog(true);
      return;
    }
    router.push(`/dashboard/records/${patientId}/doctor-notes`);
  }

  async function handleSign() {
    if (!noteId) return;
    setSigning(true);
    try {
      if (dirty) await persist(sections, type, noteId, version);
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/notes/${encodeURIComponent(noteId)}/sign`, { method: 'POST' });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        pushToast(body?.error || 'Unable to sign this note.', 'error');
        setSigning(false);
        return;
      }
      router.push(`/dashboard/records/${patientId}/doctor-notes?noteId=${encodeURIComponent(noteId)}&toast=note-signed`);
    } catch {
      pushToast('Unable to sign this note.', 'error');
      setSigning(false);
    }
  }

  function openFollowUp() {
    if (!noteId) return;
    if (followUpTaskId) {
      fetch(`/api/patients/${encodeURIComponent(patientId)}/notes/follow-up-tasks/${encodeURIComponent(followUpTaskId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((task) => setExistingFollowUpTask(task))
        .catch(() => {});
    }
    setFollowUpOpen(true);
  }

  function messagePatient(draftText?: string) {
    const url = `/dashboard/records/${patientId}/messages${draftText ? `?draft=${encodeURIComponent(draftText)}` : ''}`;
    router.push(url);
  }

  const upcoming = patient?.upcoming?.[0];
  const noteForFollowUp: DoctorNote | null =
    noteId && sections.length
      ? {
          id: noteId,
          patientId,
          type,
          status: 'draft',
          author: currentUser,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sections,
          followUpTaskId,
          pinned: false,
          addenda: [],
          correction: null,
          enteredInError: null,
          history: [],
          version,
        }
      : null;

  const saveStatusText = saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : '';

  if (conflict) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left">
          <AlertIcon size={18} className="text-amber-600 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-800">This note changed while you were editing.</div>
            <p className="mt-1 text-sm text-amber-700">Reload to see the latest version before continuing.</p>
          </div>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSections(conflict.sections);
              setVersion(conflict.version);
              setConflict(null);
              setDirty(false);
              setSaveState('idle');
            }}
            className="px-3 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700"
          >
            Reload Latest Version
          </button>
          <button type="button" onClick={attemptBack} className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            Back to Doctor Notes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-slate-100 bg-white px-5 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <button type="button" onClick={attemptBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800">
            ← Back to Doctor Notes
          </button>
          {stage === 'editing' && (
            <button type="button" onClick={() => setFocusMode((v) => !v)} className="text-xs font-medium text-slate-500 hover:text-slate-700">
              {focusMode ? 'Exit Focus' : 'Focus Mode'}
            </button>
          )}
        </div>

        {!focusMode && (
          <PatientSafetyBar
            allergies={patient?.allergies || []}
            riskLevel={patient?.riskLevel}
            onViewAllergies={() => router.push(`/dashboard/records/${patientId}/allergies`)}
            onViewRisk={() => router.push(`/patients/${patientId}/risk-profile`)}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{stage === 'setup' ? 'New Doctor Note' : `New ${NOTE_TYPE_LABELS[type]}`}</h1>
            <p className="text-sm text-slate-500">
              {patient?.name} · {formatNoteDate(new Date().toISOString())}
            </p>
          </div>
          {stage === 'editing' && (
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${saveState === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-800 border border-amber-100'}`}>
              Draft · {saveStatusText || 'Not saved yet'}
            </span>
          )}
        </div>

        {creationError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 flex items-center justify-between">
            {creationError}
            <button type="button" onClick={() => setStage('setup')} className="font-semibold hover:underline">
              Try Again
            </button>
          </div>
        )}

        {!focusMode && stage === 'editing' && upcoming && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2 text-sm text-slate-700">
            <CalendarIcon size={14} className="text-sky-600" />
            {upcoming.type} · {formatNoteDate(upcoming.date)} · {upcoming.doctor}
            {upcoming.location && <> · {upcoming.location}</>}
          </div>
        )}
      </div>

      {showUnsavedDialog && (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3">
          <div className="mx-auto max-w-3xl flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-amber-800">You have unsaved changes.</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await saveDraftNow();
                  setShowUnsavedDialog(false);
                  router.push(`/dashboard/records/${patientId}/doctor-notes`);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-teal-600 text-white hover:bg-teal-700"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/records/${patientId}/doctor-notes`)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-amber-200 text-amber-800"
              >
                Discard Changes
              </button>
              <button type="button" onClick={() => setShowUnsavedDialog(false)} className="px-3 py-1.5 text-xs font-medium text-amber-700">
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1">
        {stage === 'setup' && <TemplateStep type={type} onTypeChange={setType} onChoose={startFromTemplate} />}

        {stage === 'preview' && <PreviewView sections={sections} onBackToEdit={() => setStage('editing')} onReviewAndSign={() => setStage('review')} />}

        {stage === 'review' && (
          <ReviewAndSignView
            patientName={patient?.name}
            type={type}
            authorName={currentUser.name}
            sections={sections}
            followUpTaskId={followUpTaskId}
            signing={signing}
            onBackToEdit={() => setStage('editing')}
            onSign={handleSign}
          />
        )}

        {stage === 'editing' && (
          <div className="mx-auto max-w-[1600px] px-5 py-6 grid grid-cols-1 lg:grid-cols-[24px_minmax(0,1fr)_360px] gap-6">
            <div>
              <SectionNavigator sections={sections.map((s) => ({ heading: s.heading, complete: s.body.trim().length > 0 }))} />
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              {sections.map((s, i) => (
                <NoteSectionEditor key={i} heading={s.heading} body={s.body} required={/plan/i.test(s.heading)} onChange={(body) => updateSectionBody(i, body)} onSelectionText={(text) => { setActiveSectionIndex(i); setSelectedText(text); }} />
              ))}
            </div>

            <div>{!focusMode && <div className="space-y-4"><AiDraftAssistant patientId={patientId} patient={patient} sections={sections} selectedText={selectedText} onInsertDraft={insertAiDraft} onReplaceSelection={replaceSelectedText} /><DocumentationRightRail patient={patient} sections={sections} onCreateFollowUp={openFollowUp} onMessagePatient={messagePatient} noteReady={!!noteId} hideAi /></div>}</div>
          </div>
        )}
      </div>

      {stage === 'editing' && (
        <StickyActionBar saveStatusText={saveStatusText} saveState={saveState} onSaveDraft={saveDraftNow} onPreview={() => setStage('preview')} onReviewAndSign={() => setStage('review')} />
      )}

      {followUpOpen && noteForFollowUp && (
        <FollowUpTaskDrawer
          patientId={patientId}
          note={noteForFollowUp}
          existingTask={existingFollowUpTask}
          onClose={() => setFollowUpOpen(false)}
          onCreated={(task) => {
            setFollowUpTaskId(task.id);
            setExistingFollowUpTask(task);
            setFollowUpOpen(false);
          }}
          onCompleted={(task) => setExistingFollowUpTask(task)}
          onToast={pushToast}
        />
      )}
    </div>
  );
}
