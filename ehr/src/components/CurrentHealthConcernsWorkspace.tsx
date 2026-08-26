'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HealthConcern } from '@/types/healthConcern';
import type { ClinicalTask } from '@/types/clinicalTask';
import type { DoctorNote } from '@/types/doctorNote';
import { useToast } from '@/components/Toast';
import ConcernSummaryStrip, { type SummaryFilter } from '@/components/health-concerns/SummaryStrip';
import ConcernFilterBar, { DEFAULT_CONCERN_FILTERS, type ConcernFilters } from '@/components/health-concerns/FilterBar';
import NeedsAttentionSection from '@/components/health-concerns/NeedsAttentionSection';
import SinceLastVisit from '@/components/health-concerns/SinceLastVisit';
import ConcernCard from '@/components/health-concerns/ConcernCard';
import ConcernDetailDrawer from '@/components/health-concerns/ConcernDetailDrawer';
import AddConcernDrawer from '@/components/health-concerns/AddConcernDrawer';
import ConcernFollowUpDrawer from '@/components/health-concerns/ConcernFollowUpDrawer';
import { ResolveConcernDialog, ReopenConcernDialog, ConcernEnteredInErrorDialog } from '@/components/health-concerns/ConcernDialogs';
import { ConcernsLoadingSkeleton, NoConcernsEmptyState, FilterEmptyState, ConcernsPageError } from '@/components/health-concerns/EmptyStates';
import type { ConcernActionHandlers } from '@/components/health-concerns/ConcernActionsMenu';

/** Kept for backward compatibility; the workspace now fetches authoritative data itself. */
export type HealthConcernListItem = HealthConcern;
export type HealthConcernsPatient = any;

type DialogState =
  | { kind: 'none' }
  | { kind: 'detail'; concern: HealthConcern }
  | { kind: 'add' }
  | { kind: 'follow-up'; concern: HealthConcern }
  | { kind: 'resolve'; concern: HealthConcern }
  | { kind: 'reopen'; concern: HealthConcern }
  | { kind: 'entered-in-error'; concern: HealthConcern };

export default function CurrentHealthConcernsWorkspace({ patient, patientId }: { patient: any; patientId: string; initialConcerns?: HealthConcern[] }) {
  const toast = useToast();

  const [concerns, setConcerns] = useState<HealthConcern[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quickFilter, setQuickFilter] = useState<SummaryFilter>('all');
  const [filters, setFilters] = useState<ConcernFilters>(DEFAULT_CONCERN_FILTERS);
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const [showResolved, setShowResolved] = useState(false);

  const [followUpTasks, setFollowUpTasks] = useState<Record<string, ClinicalTask>>({});
  const [relatedNotes, setRelatedNotes] = useState<DoctorNote[]>([]);

  const pushToast = useCallback((message: string, level: 'success' | 'error' | 'info' = 'info') => toast.push({ message, level }), [toast]);

  const loadConcerns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/health-concerns`, { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || 'Unable to load health concerns.');
      setConcerns(body.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load health concerns.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadConcerns();
  }, [loadConcerns]);

  useEffect(() => {
    (concerns || []).forEach((c) => {
      if (c.followUpTaskId && !followUpTasks[c.followUpTaskId]) {
        fetch(`/api/patients/${encodeURIComponent(patientId)}/health-concerns/follow-up-tasks/${encodeURIComponent(c.followUpTaskId)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((task) => {
            if (task) setFollowUpTasks((prev) => ({ ...prev, [task.id]: task }));
          })
          .catch(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concerns]);

  function refreshConcernInPlace(updated: HealthConcern) {
    setConcerns((prev) => (prev ? prev.map((c) => (c.id === updated.id ? updated : c)) : prev));
    setDialog((d) => (d.kind !== 'none' && 'concern' in d && d.concern.id === updated.id ? { ...d, concern: updated } as DialogState : d));
  }

  const providers = useMemo(() => {
    const set = new Set<string>();
    (concerns || []).forEach((c) => c.responsibleProvider && set.add(c.responsibleProvider.name));
    return Array.from(set).sort();
  }, [concerns]);

  const lastVisit = patient?.lastVisit ? new Date(patient.lastVisit) : null;

  function updatedSinceLastVisit(c: HealthConcern): boolean {
    return !!lastVisit && new Date(c.updatedAt) > lastVisit;
  }

  const filteredConcerns = useMemo(() => {
    if (!concerns) return [];
    const q = filters.search.trim().toLowerCase();
    return concerns.filter((c) => {
      if (!showResolved && c.clinicalStatus === 'resolved' && quickFilter !== 'resolved') return false;
      if (quickFilter === 'active' && c.clinicalStatus !== 'active') return false;
      if (quickFilter === 'monitoring' && c.clinicalStatus !== 'monitoring') return false;
      if (quickFilter === 'resolved' && c.clinicalStatus !== 'resolved') return false;
      if (quickFilter === 'needs-review' && !(c.attentionStatus === 'needs-review' || c.attentionStatus === 'follow-up-due')) return false;
      if (filters.provider !== 'all' && c.responsibleProvider?.name !== filters.provider) return false;
      if (filters.category !== 'all' && c.category !== filters.category) return false;
      if (filters.hasFollowUp === 'has' && !c.followUpTaskId) return false;
      if (filters.hasFollowUp === 'none' && c.followUpTaskId) return false;
      if (filters.updatedSinceLastVisit && !updatedSinceLastVisit(c)) return false;
      if (filters.assignedToMe && !c.responsibleProvider) return false;
      if (q && !`${c.term} ${c.description || ''} ${c.responsibleProvider?.name || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [concerns, filters, quickFilter, showResolved]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolvedCount = (concerns || []).filter((c) => c.clinicalStatus === 'resolved').length;
  const hasActiveFilters = quickFilter !== 'all' || filters.provider !== 'all' || filters.category !== 'all' || filters.updatedSinceLastVisit || filters.assignedToMe || filters.hasFollowUp !== 'all' || !!filters.search;

  function clearAllFilters() {
    setQuickFilter('all');
    setFilters(DEFAULT_CONCERN_FILTERS);
  }

  async function openDetails(concern: HealthConcern) {
    setDialog({ kind: 'detail', concern });
    try {
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/notes`);
      if (res.ok) {
        const body = await res.json();
        setRelatedNotes((body.data || []).filter((n: DoctorNote) => n.relatedConcernId === concern.id));
      }
    } catch {
      setRelatedNotes([]);
    }
  }

  function quickNote(concern: HealthConcern) {
    window.location.href = `/dashboard/records/${patientId}/doctor-notes?composer=1&concernId=${encodeURIComponent(concern.id)}`;
  }

  function quickNoteGeneral() {
    window.location.href = `/dashboard/records/${patientId}/doctor-notes?composer=1`;
  }

  const actionHandlers: ConcernActionHandlers = {
    onPinToggle: async (concern) => {
      try {
        const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/health-concerns/${encodeURIComponent(concern.id)}/pin`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ pinned: !concern.pinned }),
        });
        if (!res.ok) throw new Error('failed');
        const updated = await res.json();
        refreshConcernInPlace(updated);
      } catch {
        pushToast('Unable to update pin state.', 'error');
      }
    },
    onResolve: (concern) => setDialog({ kind: 'resolve', concern }),
    onReopen: (concern) => setDialog({ kind: 'reopen', concern }),
    onEnteredInError: (concern) => setDialog({ kind: 'entered-in-error', concern }),
    onViewTimeline: (concern) => {
      window.location.href = `/dashboard/records/${patientId}/timeline?q=${encodeURIComponent(concern.term)}`;
    },
    onViewChartActivity: () => {
      window.location.href = `/dashboard/records/${patientId}/activity`;
    },
    hasChartActivity: Array.isArray(patient?.chartActivity) && patient.chartActivity.length > 0,
  };

  const addedSinceVisit = (concerns || []).filter((c) => lastVisit && new Date(c.createdAt) > lastVisit);
  const reviewedSinceVisit = (concerns || []).filter((c) => lastVisit && c.lastReviewedAt && new Date(c.lastReviewedAt) > lastVisit);
  const followUpsSinceVisit = (concerns || []).filter((c) => lastVisit && c.history.some((h) => h.action === 'follow-up task created' && new Date(h.timestamp) > lastVisit));

  if (loading && !concerns) return <ConcernsLoadingSkeleton />;
  if (error && !concerns) return <ConcernsPageError onRetry={loadConcerns} />;

  const dialogConcern = dialog.kind !== 'none' && 'concern' in dialog ? dialog.concern : null;

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Current Health Concerns</h1>
          <p className="mt-1 text-sm text-slate-500 max-w-xl">Active symptoms, problems and clinical concerns currently being monitored or managed.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setDialog({ kind: 'add' })} className="px-3.5 py-2 text-sm font-semibold rounded-md bg-teal-600 text-white shadow-sm hover:bg-teal-700 transition">
            + Add Concern
          </button>
          <button type="button" onClick={quickNoteGeneral} className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50">
            Quick Note
          </button>
        </div>
      </div>

      {!concerns || concerns.length === 0 ? (
        <NoConcernsEmptyState onAdd={() => setDialog({ kind: 'add' })} onViewResolved={() => setShowResolved(true)} />
      ) : (
        <>
          <ConcernSummaryStrip concerns={concerns} active={quickFilter} onSelect={setQuickFilter} />

          <SinceLastVisit
            lastVisit={patient?.lastVisit}
            addedSince={addedSinceVisit}
            reviewedSince={reviewedSinceVisit}
            followUpsCreatedSince={followUpsSinceVisit}
            onViewChanges={() => setFilters({ ...filters, updatedSinceLastVisit: true })}
          />

          <ConcernFilterBar quickFilter={quickFilter} onQuickFilterChange={setQuickFilter} filters={filters} onFiltersChange={setFilters} providers={providers} />

          <NeedsAttentionSection concerns={filteredConcerns} onOpenDetails={openDetails} />

          <section>
            <h2 className="text-[15px] font-semibold text-slate-900 mb-2.5">Active &amp; Monitoring</h2>
            {filteredConcerns.length === 0 ? (
              <FilterEmptyState onClear={clearAllFilters} />
            ) : (
              <div className="space-y-2.5">
                {filteredConcerns
                  .slice()
                  .sort((a, b) => Number(b.pinned) - Number(a.pinned))
                  .map((c) => (
                    <ConcernCard
                      key={c.id}
                      concern={c}
                      followUpTask={c.followUpTaskId ? followUpTasks[c.followUpTaskId] || null : null}
                      updatedSinceLastVisit={updatedSinceLastVisit(c)}
                      onOpenDetails={openDetails}
                      onQuickNote={quickNote}
                      onCreateFollowUp={(concern) => setDialog({ kind: 'follow-up', concern })}
                      actionHandlers={actionHandlers}
                    />
                  ))}
              </div>
            )}
          </section>

          {!showResolved && resolvedCount > 0 && (
            <button type="button" onClick={() => setShowResolved(true)} className="text-sm font-semibold text-teal-700 hover:text-teal-800">
              View Resolved Concerns ({resolvedCount}) →
            </button>
          )}
        </>
      )}

      {dialog.kind === 'detail' && dialogConcern && (
        <ConcernDetailDrawer
          concern={dialogConcern}
          patient={patient}
          followUpTask={dialogConcern.followUpTaskId ? followUpTasks[dialogConcern.followUpTaskId] || null : null}
          relatedNotes={relatedNotes}
          onClose={() => setDialog({ kind: 'none' })}
          onQuickNote={quickNote}
          onCreateFollowUp={(concern) => setDialog({ kind: 'follow-up', concern })}
          actionHandlers={actionHandlers}
        />
      )}

      {dialog.kind === 'add' && (
        <AddConcernDrawer
          patientId={patientId}
          defaultProvider={patient?.lastAttendingDoctor}
          onClose={() => setDialog({ kind: 'none' })}
          onSaved={() => {
            setDialog({ kind: 'none' });
            loadConcerns();
          }}
          onToast={pushToast}
        />
      )}

      {dialog.kind === 'follow-up' && dialogConcern && (
        <ConcernFollowUpDrawer
          patientId={patientId}
          concern={dialogConcern}
          existingTask={dialogConcern.followUpTaskId ? followUpTasks[dialogConcern.followUpTaskId] || null : null}
          onClose={() => setDialog({ kind: 'none' })}
          onCreated={(task, updatedConcern) => {
            setFollowUpTasks((prev) => ({ ...prev, [task.id]: task }));
            refreshConcernInPlace(updatedConcern);
            setDialog({ kind: 'none' });
          }}
          onCompleted={(task) => setFollowUpTasks((prev) => ({ ...prev, [task.id]: task }))}
          onToast={pushToast}
        />
      )}

      {dialog.kind === 'resolve' && dialogConcern && (
        <ResolveConcernDialog
          patientId={patientId}
          concern={dialogConcern}
          onClose={() => setDialog({ kind: 'none' })}
          onSaved={(updated) => {
            refreshConcernInPlace(updated);
            setDialog({ kind: 'none' });
          }}
          onToast={pushToast}
        />
      )}

      {dialog.kind === 'reopen' && dialogConcern && (
        <ReopenConcernDialog
          patientId={patientId}
          concern={dialogConcern}
          onClose={() => setDialog({ kind: 'none' })}
          onSaved={(updated) => {
            refreshConcernInPlace(updated);
            setDialog({ kind: 'none' });
          }}
          onToast={pushToast}
        />
      )}

      {dialog.kind === 'entered-in-error' && dialogConcern && (
        <ConcernEnteredInErrorDialog
          patientId={patientId}
          concern={dialogConcern}
          onClose={() => setDialog({ kind: 'none' })}
          onSaved={(updated) => {
            refreshConcernInPlace(updated);
            setDialog({ kind: 'none' });
          }}
          onToast={pushToast}
        />
      )}
    </div>
  );
}
