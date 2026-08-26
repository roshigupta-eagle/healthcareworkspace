"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DoctorNote } from '@/types/doctorNote';
import type { ClinicalTask } from '@/types/clinicalTask';
import { useToast } from '@/components/Toast';
import NotesSummaryStrip from './doctor-notes/NotesSummaryStrip';
import NotesFilterPanel, { DEFAULT_FILTERS, type NoteFilters } from './doctor-notes/NotesFilterPanel';
import NotesTimeline, { type QuickFilter } from './doctor-notes/NotesTimeline';
import SelectedNoteDetail from './doctor-notes/SelectedNoteDetail';
import NotesRightRail from './doctor-notes/NotesRightRail';
import FollowUpTaskDrawer from './doctor-notes/FollowUpTaskDrawer';
import AddendumDrawer from './doctor-notes/AddendumDrawer';
import CorrectionDialog from './doctor-notes/CorrectionDialog';
import EnteredInErrorDialog from './doctor-notes/EnteredInErrorDialog';
import NoteHistoryDrawer from './doctor-notes/NoteHistoryDrawer';
import { NotesLoadingSkeleton, NoNotesEmptyState, NotesPageError } from './doctor-notes/EmptyStates';
import { printNote, printNoteList } from './doctor-notes/printNote';
import type { NoteActionHandlers } from './doctor-notes/NoteActionsMenu';

type DrawerState =
  | { kind: 'none' }
  | { kind: 'follow-up'; note: DoctorNote }
  | { kind: 'addendum'; note: DoctorNote }
  | { kind: 'correction'; note: DoctorNote }
  | { kind: 'entered-in-error'; note: DoctorNote }
  | { kind: 'history'; note: DoctorNote };

function getRangeCutoff(range: NoteFilters['dateRange']): Date | null {
  const now = new Date();
  if (range === '30d') return new Date(now.getTime() - 30 * 86400000);
  if (range === '90d') return new Date(now.getTime() - 90 * 86400000);
  if (range === '6m') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 6);
    return d;
  }
  if (range === '1y') {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }
  return null;
}

export default function DoctorNotesClient({ patient, initialShowComposer = false, initialRelatedConcernId = null, initialSelectedNoteId = null, initialToast = null }: { patient: any; initialShowComposer?: boolean; initialRelatedConcernId?: string | null; initialSelectedNoteId?: string | null; initialToast?: string | null }) {
  const toast = useToast();
  const router = useRouter();
  const patientId = patient?.id;

  const [notes, setNotes] = useState<DoctorNote[] | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<NoteFilters>(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [activeSummaryCard, setActiveSummaryCard] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedNoteId);

  const [drawer, setDrawer] = useState<DrawerState>({ kind: 'none' });
  const [followUpTasks, setFollowUpTasks] = useState<Record<string, ClinicalTask>>({});

  const pushToast = useCallback(
    (message: string, level: 'success' | 'error' | 'info' = 'info') => toast.push({ message, level }),
    [toast],
  );

  function goToNewNote() {
    const url = `/dashboard/records/${patientId}/doctor-notes/new${initialRelatedConcernId ? `?concernId=${encodeURIComponent(initialRelatedConcernId)}` : ''}`;
    router.push(url);
  }

  useEffect(() => {
    if (initialShowComposer) goToNewNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialShowComposer]);

  const toastShownRef = useRef(false);
  useEffect(() => {
    if (!initialToast || toastShownRef.current) return;
    toastShownRef.current = true;
    if (initialToast === 'note-signed') pushToast('Note signed successfully.', 'success');
    const url = new URL(window.location.href);
    url.searchParams.delete('toast');
    window.history.replaceState({}, '', url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToast]);

  const loadNotes = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/notes`, { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || 'Unable to load Doctor Notes.');
      setNotes(body.data || []);
      setCurrentUser(body.currentUser || null);
      setSelectedId((current) => current ?? body.data?.[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Doctor Notes.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Debounce free-text search only; other filters apply immediately.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  useEffect(() => {
    if (!selectedId || !notes) return;
    const note = notes.find((n) => n.id === selectedId);
    if (note?.followUpTaskId && !followUpTasks[note.followUpTaskId]) {
      fetch(`/api/patients/${encodeURIComponent(patientId)}/notes/follow-up-tasks/${encodeURIComponent(note.followUpTaskId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((task) => {
          if (task) setFollowUpTasks((prev) => ({ ...prev, [task.id]: task }));
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, notes]);

  const providers = useMemo(() => {
    const set = new Set<string>();
    (notes || []).forEach((n) => set.add(n.author.name));
    return Array.from(set).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    const cutoff = getRangeCutoff(filters.dateRange);
    return notes.filter((n) => {
      if (filters.type !== 'all' && n.type !== filters.type) return false;
      if (filters.provider !== 'all' && n.author.name !== filters.provider) return false;
      if (filters.status !== 'all' && n.status !== filters.status) return false;
      if (filters.followUp === 'has' && !n.followUpTaskId) return false;
      if (filters.followUp === 'none' && n.followUpTaskId) return false;
      if (filters.mine && currentUser && n.author.id !== currentUser.id && n.author.name !== currentUser.name) return false;
      if (filters.needsAction) {
        const mine = currentUser ? n.author.id === currentUser.id || n.author.name === currentUser.name : true;
        if (!(mine && (n.status === 'draft' || n.status === 'pending-signature'))) return false;
      }
      if (cutoff && new Date(n.createdAt) < cutoff) return false;
      if (debouncedSearch) {
        const haystack = [n.author.name, n.type, ...n.sections.flatMap((s) => [s.heading, s.body])].join(' ').toLowerCase();
        if (!haystack.includes(debouncedSearch)) return false;
      }

      switch (activeSummaryCard) {
        case 'total':
          return true;
        case 'recent': {
          const c = Date.now() - 30 * 86400000;
          return new Date(n.createdAt).getTime() >= c;
        }
        case 'followup':
          return !!n.followUpTaskId;
        case 'action':
          return n.status === 'draft' || n.status === 'pending-signature';
        default:
          return true;
      }
    });
  }, [notes, filters, debouncedSearch, currentUser, activeSummaryCard]);

  const selectedNote = useMemo(() => (notes || []).find((n) => n.id === selectedId) || filteredNotes[0] || null, [notes, selectedId, filteredNotes]);

  function refreshNoteInPlace(updated: DoctorNote) {
    setNotes((prev) => (prev ? prev.map((n) => (n.id === updated.id ? updated : n)) : prev));
  }

  function addNoteToList(created: DoctorNote) {
    setNotes((prev) => (prev ? [created, ...prev] : [created]));
    setSelectedId(created.id);
  }

  const actionHandlers: NoteActionHandlers = {
    onEdit: (note) => router.push(`/dashboard/records/${patientId}/doctor-notes/new?noteId=${encodeURIComponent(note.id)}`),
    onDuplicate: async (note) => {
      try {
        const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/notes/${encodeURIComponent(note.id)}/duplicate`, { method: 'POST' });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || 'failed');
        addNoteToList(body);
        pushToast('Duplicated as a new draft.', 'success');
        router.push(`/dashboard/records/${patientId}/doctor-notes/new?noteId=${encodeURIComponent(body.id)}`);
      } catch {
        pushToast('Unable to duplicate this note.', 'error');
      }
    },
    onPrint: (note) => printNote(note, patient?.name || 'Patient', 'print'),
    onExport: (note) => printNote(note, patient?.name || 'Patient', 'export'),
    onCreateFollowUp: (note) => setDrawer({ kind: 'follow-up', note }),
    onAddendum: (note) => setDrawer({ kind: 'addendum', note }),
    onCorrection: (note) => setDrawer({ kind: 'correction', note }),
    onEnteredInError: (note) => setDrawer({ kind: 'entered-in-error', note }),
    onViewHistory: (note) => setDrawer({ kind: 'history', note }),
  };

  function copyNoteText(note: DoctorNote) {
    const text = note.sections.map((s) => (s.heading ? `${s.heading}\n${s.body}` : s.body)).join('\n\n');
    navigator.clipboard?.writeText(text).then(
      () => pushToast('Note text copied.', 'success'),
      () => pushToast('Unable to copy note text.', 'error'),
    );
  }

  function messagePatient(draftText?: string) {
    const url = `/dashboard/records/${patientId}/messages${draftText ? `?draft=${encodeURIComponent(draftText)}` : ''}`;
    window.location.href = url;
  }

  if (loading && !notes) return <NotesLoadingSkeleton />;
  if (error && !notes) return <NotesPageError onRetry={loadNotes} />;

  return (
    <div className="w-full space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Doctor Notes</h1>
          <p className="mt-1 text-sm text-slate-500 max-w-xl">Clinical documentation, progress notes, follow-up notes and care-plan documentation.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={goToNewNote} className="px-3.5 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white shadow-sm hover:bg-teal-700 transition">
            + Add New Note
          </button>
          <button
            type="button"
            disabled={!filteredNotes.length}
            onClick={() => printNoteList(filteredNotes, patient?.name || 'Patient')}
            className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Print
          </button>
          <button
            type="button"
            disabled={!filteredNotes.length}
            onClick={() => printNoteList(filteredNotes, patient?.name || 'Patient')}
            className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Export
          </button>
          <button type="button" onClick={loadNotes} className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            Refresh
          </button>
        </div>
      </div>

      {!notes || notes.length === 0 ? (
        <NoNotesEmptyState onAddNote={goToNewNote} />
      ) : (
        <>
          <NotesSummaryStrip notes={notes} activeCard={activeSummaryCard} onSelectCard={setActiveSummaryCard} />

          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_300px] gap-4 items-start">
            <NotesFilterPanel filters={filters} onChange={setFilters} providers={providers} />

            <div className="space-y-4 min-w-0">
              <NotesTimeline
                notes={filteredNotes}
                quickFilter={quickFilter}
                onQuickFilterChange={setQuickFilter}
                selectedId={selectedNote?.id ?? null}
                onSelect={(n) => setSelectedId(n.id)}
                onCopyText={copyNoteText}
                actionHandlers={actionHandlers}
                onOpenFollowUpTask={(n) => setDrawer({ kind: 'follow-up', note: n })}
              />

              <SelectedNoteDetail
                note={selectedNote}
                followUpTask={selectedNote?.followUpTaskId ? followUpTasks[selectedNote.followUpTaskId] || null : null}
                actionHandlers={actionHandlers}
                onOpenFollowUpTask={(n) => setDrawer({ kind: 'follow-up', note: n })}
              />
            </div>

            <NotesRightRail
              notes={notes}
              selectedNote={selectedNote}
              patient={patient}
              onAddNewNote={goToNewNote}
              onCreateFollowUp={(n) => setDrawer({ kind: 'follow-up', note: n })}
              onMessagePatient={messagePatient}
              onPrintSelected={(n) => printNote(n, patient?.name || 'Patient', 'print')}
              onExportSelected={(n) => printNote(n, patient?.name || 'Patient', 'export')}
            />
          </div>
        </>
      )}

      {drawer.kind === 'follow-up' && (
        <FollowUpTaskDrawer
          patientId={patientId}
          note={drawer.note}
          existingTask={drawer.note.followUpTaskId ? followUpTasks[drawer.note.followUpTaskId] || null : null}
          onClose={() => setDrawer({ kind: 'none' })}
          onCreated={(task, updatedNote) => {
            setFollowUpTasks((prev) => ({ ...prev, [task.id]: task }));
            refreshNoteInPlace(updatedNote);
            setDrawer({ kind: 'none' });
          }}
          onCompleted={(task) => {
            setFollowUpTasks((prev) => ({ ...prev, [task.id]: task }));
          }}
          onToast={pushToast}
        />
      )}

      {drawer.kind === 'addendum' && (
        <AddendumDrawer
          patientId={patientId}
          note={drawer.note}
          onClose={() => setDrawer({ kind: 'none' })}
          onSaved={(updated) => {
            refreshNoteInPlace(updated);
            setDrawer({ kind: 'none' });
          }}
          onToast={pushToast}
        />
      )}

      {drawer.kind === 'correction' && (
        <CorrectionDialog
          patientId={patientId}
          note={drawer.note}
          onClose={() => setDrawer({ kind: 'none' })}
          onSaved={(updated) => {
            refreshNoteInPlace(updated);
            setDrawer({ kind: 'none' });
          }}
          onToast={pushToast}
        />
      )}

      {drawer.kind === 'entered-in-error' && (
        <EnteredInErrorDialog
          patientId={patientId}
          note={drawer.note}
          onClose={() => setDrawer({ kind: 'none' })}
          onSaved={(updated) => {
            refreshNoteInPlace(updated);
            setDrawer({ kind: 'none' });
          }}
          onToast={pushToast}
        />
      )}

      {drawer.kind === 'history' && <NoteHistoryDrawer patientId={patientId} note={drawer.note} onClose={() => setDrawer({ kind: 'none' })} />}
    </div>
  );
}
