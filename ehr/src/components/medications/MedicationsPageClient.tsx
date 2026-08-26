"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PatientProfileHeader from '@/components/PatientProfileHeader';
import type { MedicationRecord } from '@/lib/medicationsStore';
import type { PatientSafetyResult } from '@/lib/medicationSafetyStore';
import type { ReconciliationRecord } from '@/lib/medicationReconciliationStore';
import {
  medicationStatusLabel,
  sourceLabel,
  isRefillDue,
  overallSafetyStatus,
  alertsForMedication,
  severityTone,
  computeSnapshot,
  computeNeedsAttention,
  availableMedicationActions,
  formatDoseLine,
  accessibleMedicationSummary,
  type MedicationAction,
} from '@/lib/medications';
import { PillIcon, ShieldCheckIcon, RefreshCwIcon, ClipboardCheckIcon, HistoryIcon } from './icons';
import { SparklesIcon, AlertTriangleIcon, CheckCircleIcon } from '@/components/appointment-detail/icons';
import MedicationActionDialog, { type LifecycleAction } from './MedicationActionDialog';
import ModifyPrescriptionDrawer from './ModifyPrescriptionDrawer';
import RefillReviewDrawer from './RefillReviewDrawer';
import ReconciliationDrawer from './ReconciliationDrawer';
import MedicationHistoryDrawer from './MedicationHistoryDrawer';

type TabKey = 'overview' | 'timeline' | 'refills' | 'notes' | 'safety';
type FilterKey = 'all' | 'active' | 'refill-due' | 'safety-review' | 'recently-changed' | 'discontinued';

const STATUS_TONE: Record<string, string> = {
  active: 'bg-teal-50 text-teal-800 border-teal-200',
  'on-hold': 'bg-amber-50 text-amber-800 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  stopped: 'bg-orange-50 text-orange-700 border-orange-200',
  'entered-in-error': 'bg-rose-50 text-rose-700 border-rose-200',
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
};

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

export default function MedicationsPageClient({ patient }: { patient: any }) {
  const patientId = patient.id;
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [safety, setSafety] = useState<PatientSafetyResult | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [aiGenerated, setAiGenerated] = useState(false);

  const [lifecycleAction, setLifecycleAction] = useState<LifecycleAction | null>(null);
  const [showModify, setShowModify] = useState(false);
  const [showRefillReview, setShowRefillReview] = useState(false);
  const [showReconcile, setShowReconcile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/medications`);
      if (!res.ok) throw new Error('Unable to load medication history.');
      const json = await res.json();
      setMedications(json.items || []);
      setSafety(json.safety || null);
      setReconciliation(json.reconciliation || null);
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load medication history right now.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (medications.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !medications.some((m) => m.id === selectedId)) {
      setSelectedId(medications[0].id);
    }
  }, [medications, selectedId]);

  const snapshot = useMemo(() => computeSnapshot(medications, safety, reconciliation), [medications, safety, reconciliation]);
  const attention = useMemo(() => computeNeedsAttention(medications, safety, reconciliation), [medications, safety, reconciliation]);
  const selected = useMemo(() => medications.find((m) => m.id === selectedId) || null, [medications, selectedId]);
  const selectedRefillDue = selected ? isRefillDue(selected) : false;
  const selectedActions = selected ? availableMedicationActions(selected, selectedRefillDue) : [];

  const filteredMedications = useMemo(() => {
    let list = medications;
    if (filter === 'active') list = list.filter((m) => m.status === 'active');
    else if (filter === 'refill-due') list = list.filter((m) => isRefillDue(m));
    else if (filter === 'safety-review') list = list.filter((m) => alertsForMedication(safety, m.id).length > 0);
    else if (filter === 'recently-changed') {
      list = list.filter((m) => {
        const last = m.history[m.history.length - 1];
        if (!last) return false;
        const days = (Date.now() - Date.parse(last.date)) / 86400000;
        return days <= 30;
      });
    } else if (filter === 'discontinued') list = list.filter((m) => m.status === 'stopped');
    else list = list.filter((m) => m.status !== 'entered-in-error');

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q) || (m.genericName || '').toLowerCase().includes(q) || (m.indication || '').toLowerCase().includes(q) || (m.prescribedBy || '').toLowerCase().includes(q));
    }
    return list;
  }, [medications, filter, search, safety]);

  function selectMedication(id: string) {
    setSelectedId(id);
    setActiveTab('overview');
  }

  function runAction(action: MedicationAction) {
    if (!selected) return;
    if (action === 'modify') setShowModify(true);
    else if (action === 'view-history') setShowHistory(true);
    else if (action === 'renew') setShowRefillReview(true);
    else if (action === 'hold' || action === 'resume' || action === 'discontinue' || action === 'correct' || action === 'mark-entered-in-error') setLifecycleAction(action);
    setMoreOpen(false);
  }

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-100 rounded-xl w-1/3" />
          <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}</div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-3 h-96 bg-slate-100 rounded-xl" />
            <div className="col-span-6 h-96 bg-slate-100 rounded-xl" />
            <div className="col-span-3 h-96 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 pb-28">
      <div className="mb-4">
        <Link href={`/dashboard/records/${patientId}`} className="inline-flex items-center text-sm text-teal-600 hover:underline gap-2">← Back to Patient</Link>
      </div>
      <PatientProfileHeader patient={patient} />

      {loadError && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center justify-between">
          <span>We couldn&apos;t load medication history. {loadError}</span>
          <button onClick={fetchAll} className="font-semibold underline">Try Again</button>
        </div>
      )}

      {/* Header */}
      <div className="mt-4 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Medication History</h1>
            <p className="mt-1 text-sm text-slate-500">Current medications, prescription history, refill activity and medication safety.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/dashboard/prescriptions/new?patientId=${encodeURIComponent(patientId)}`} className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800">+ Add / Prescribe Medication</Link>
            <button onClick={() => setShowReconcile(true)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Reconcile Medications</button>
            <Link href={`/dashboard/records/${patientId}/messages`} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Message Patient</Link>
          </div>
        </div>

        {/* Reconciliation status */}
        <div className="mt-4 flex items-center gap-3 flex-wrap text-xs">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-semibold ${snapshot.reconciliationStatus === 'current' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
            <ClipboardCheckIcon size={12} />
            {snapshot.reconciliationStatus === 'current' ? 'Reconciliation Current' : snapshot.reconciliationStatus === 'review-due' ? 'Reconciliation Review Due' : 'Never Reconciled'}
          </div>
          {reconciliation?.lastReconciledDate && (
            <span className="text-slate-500">Last reconciled {formatDate(reconciliation.lastReconciledDate)}{reconciliation.reconciledBy ? ` by ${reconciliation.reconciledBy}` : ''}</span>
          )}
        </div>

        {/* Snapshot */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3.5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0"><PillIcon size={16} /></div>
            <div>
              <div className="text-2xl font-bold text-teal-800">{snapshot.activeCount}</div>
              <div className="text-xs font-medium text-teal-700">Active Medications</div>
            </div>
          </div>
          <div className={`rounded-xl border p-3.5 flex items-start gap-3 ${snapshot.safetyStatus === 'clear' ? 'border-emerald-100 bg-emerald-50/60' : snapshot.safetyStatus === 'unavailable' ? 'border-slate-200 bg-slate-50' : snapshot.safetyStatus === 'critical' ? 'border-rose-100 bg-rose-50/60' : 'border-amber-100 bg-amber-50/60'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${snapshot.safetyStatus === 'clear' ? 'bg-emerald-100 text-emerald-700' : snapshot.safetyStatus === 'unavailable' ? 'bg-slate-200 text-slate-600' : snapshot.safetyStatus === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}><ShieldCheckIcon size={16} /></div>
            <div>
              <div className={`text-lg font-bold ${snapshot.safetyStatus === 'clear' ? 'text-emerald-800' : snapshot.safetyStatus === 'unavailable' ? 'text-slate-700' : snapshot.safetyStatus === 'critical' ? 'text-rose-800' : 'text-amber-800'}`}>
                {snapshot.safetyStatus === 'clear' ? 'Clear' : snapshot.safetyStatus === 'unavailable' ? 'Unavailable' : snapshot.safetyStatus === 'critical' ? 'Critical' : 'Review'}
              </div>
              <div className="text-xs font-medium text-slate-500">Safety Status</div>
            </div>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0"><RefreshCwIcon size={16} /></div>
            <div>
              <div className="text-2xl font-bold text-amber-800">{snapshot.refillsNeedingReview}</div>
              <div className="text-xs font-medium text-amber-700">Refills / Renewals{snapshot.refillsNeedingReview > 0 ? ' Needs Review' : ''}</div>
            </div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0"><ClipboardCheckIcon size={16} /></div>
            <div>
              <div className="text-lg font-bold text-blue-800">{snapshot.reconciliationStatus === 'current' ? 'Current' : snapshot.reconciliationStatus === 'review-due' ? 'Review Due' : 'None'}</div>
              <div className="text-xs font-medium text-blue-700">Medication Reconciliation</div>
            </div>
          </div>
        </div>
      </div>

      {/* Needs attention */}
      {attention.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-amber-100 p-4">
          <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Needs Attention</h2>
          <div className="space-y-2">
            {attention.map((a, i) => (
              <div key={i} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${a.tone === 'red' ? 'bg-rose-50/70 border-rose-100' : 'bg-amber-50/70 border-amber-100'}`}>
                <span><strong className="text-slate-900">{a.medicationName}</strong> — {a.reason}</span>
                {a.medicationId !== '__reconciliation__' && (
                  <button onClick={() => selectMedication(a.medicationId)} className={`text-xs font-semibold hover:underline flex-shrink-0 ${a.tone === 'red' ? 'text-rose-800' : 'text-amber-800'}`}>Review</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main workspace */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: navigator */}
        <aside className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm sticky top-40">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Medications</h3>
              <span className="text-xs text-slate-400">{snapshot.activeCount} Active</span>
            </div>
            <input aria-label="Search medications" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medication, indication…" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 mb-3" />
            <div className="flex flex-wrap gap-1.5 mb-3">
              {([
                ['all', 'All'],
                ['active', 'Active'],
                ['refill-due', 'Refill Due'],
                ['safety-review', 'Safety Review'],
                ['recently-changed', 'Recently Changed'],
                ['discontinued', 'Discontinued'],
              ] as [FilterKey, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${filter === key ? 'bg-teal-700 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{label}</button>
              ))}
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredMedications.length === 0 && <p className="text-sm text-slate-400 italic py-4 text-center">No medications match this view.</p>}
              {filteredMedications.map((m) => {
                const isSelected = m.id === selectedId;
                const refillDue = isRefillDue(m);
                return (
                  <button
                    key={m.id}
                    onClick={() => selectMedication(m.id)}
                    className={`w-full text-left rounded-lg p-3 transition-colors ${isSelected ? 'bg-teal-50/80 border-l-[3px] border-teal-600 ring-1 ring-teal-100' : 'border-l-[3px] border-transparent hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[13px] text-slate-900 uppercase tracking-tight truncate">{m.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${STATUS_TONE[m.status]}`}>{medicationStatusLabel(m.status)}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{formatDoseLine(m)}</div>
                    {m.indication && <div className="text-xs text-slate-400 mt-0.5">{m.indication}</div>}
                    {refillDue && <div className="text-xs text-amber-700 font-medium mt-1">Refill: Due {m.nextEligibleRefillDate ? formatDate(m.nextEligibleRefillDate) : 'now'}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center: hero + tabs */}
        <main className="lg:col-span-6 space-y-4">
          {!selected ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
              <h2 className="text-lg font-bold text-slate-900">No active medications documented</h2>
              <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">Medications will appear here when prescribed, reconciled or documented.</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Link href={`/dashboard/prescriptions/new?patientId=${encodeURIComponent(patientId)}`} className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800">+ Add / Prescribe Medication</Link>
                <button onClick={() => setShowReconcile(true)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Reconcile Medications</button>
              </div>
            </div>
          ) : (
            <>
              {/* Hero */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-2xl font-bold text-slate-900">{selected.name}</h2>
                      <span className="text-lg font-semibold text-slate-600">{selected.dose}{selected.unit}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${STATUS_TONE[selected.status]}`}>{medicationStatusLabel(selected.status)}</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-500">{selected.frequency || 'Frequency not documented'}</div>
                    <dl className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                      <div><dt className="text-xs text-slate-400">Primary indication</dt><dd className="font-medium text-slate-900">{selected.indication || 'No documented indication'}</dd></div>
                      <div><dt className="text-xs text-slate-400">Prescribed by</dt><dd className="font-medium text-slate-900">{selected.prescribedBy || '—'}</dd></div>
                      <div><dt className="text-xs text-slate-400">Started</dt><dd className="font-medium text-slate-900">{formatDate(selected.startDate)}</dd></div>
                    </dl>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {selectedActions.includes('renew') ? (
                      <button onClick={() => setShowRefillReview(true)} className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800">Review Refill</button>
                    ) : (
                      <button onClick={() => setShowModify(true)} disabled={!selectedActions.includes('modify')} className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">Manage Prescription</button>
                    )}
                    <Link href={`/dashboard/records/${patientId}/messages`} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Message Patient</Link>
                    <div className="relative">
                      <button onClick={() => setMoreOpen((v) => !v)} aria-haspopup="menu" aria-expanded={moreOpen} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">More</button>
                      {moreOpen && (
                        <div role="menu" className="absolute right-0 top-11 w-56 rounded-lg bg-white border border-slate-200 shadow-lg py-1 z-30">
                          {selectedActions.includes('modify') && <button role="menuitem" onClick={() => runAction('modify')} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Modify Prescription</button>}
                          {selectedActions.includes('hold') && <button role="menuitem" onClick={() => runAction('hold')} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Place On Hold</button>}
                          {selectedActions.includes('resume') && <button role="menuitem" onClick={() => runAction('resume')} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Resume Medication</button>}
                          {selectedActions.includes('discontinue') && <button role="menuitem" onClick={() => runAction('discontinue')} className="w-full text-left px-3 py-1.5 text-xs text-orange-700 hover:bg-orange-50">Discontinue</button>}
                          {selectedActions.includes('correct') && <button role="menuitem" onClick={() => runAction('correct')} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Correct Record</button>}
                          {selectedActions.includes('mark-entered-in-error') && <button role="menuitem" onClick={() => runAction('mark-entered-in-error')} className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50">Mark Entered in Error</button>}
                          <button role="menuitem" onClick={() => runAction('view-history')} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">View History</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="sr-only">{accessibleMedicationSummary(selected)}</p>
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                <div role="tablist" aria-label="Medication sections" className="flex gap-1 px-2 pt-2 border-b border-slate-100 overflow-x-auto">
                  {([
                    ['overview', 'Overview'],
                    ['timeline', 'Timeline'],
                    ['refills', 'Refills'],
                    ['notes', 'Notes'],
                    ['safety', 'Safety'],
                  ] as [TabKey, string][]).map(([key, label]) => (
                    <button key={key} role="tab" aria-selected={activeTab === key} onClick={() => setActiveTab(key)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${activeTab === key ? 'text-teal-700 border-teal-600' : 'text-slate-500 border-transparent hover:text-teal-600'}`}>
                      {label}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Purpose / Indication</h4>
                          <p className="text-slate-800">{selected.indication || 'No documented indication'}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Instructions</h4>
                          <p className="text-slate-800">{formatDoseLine(selected)}{selected.route ? ` · ${selected.route}` : ''}</p>
                          {selected.instructions && <p className="text-slate-600 mt-1">{selected.instructions}</p>}
                          {selected.prnReason && <p className="text-slate-600 mt-1">PRN reason: {selected.prnReason}</p>}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Last Reviewed</h4>
                          <p className="text-slate-800">{selected.lastReviewed ? `${formatDate(selected.lastReviewed)}${selected.reviewedBy ? ` · ${selected.reviewedBy}` : ''}` : 'Not yet reviewed'}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Prescription</h4>
                          <dl className="space-y-1.5">
                            <div className="flex justify-between"><dt className="text-slate-400">Prescribed by</dt><dd className="font-medium text-slate-900">{selected.prescribedBy || '—'}</dd></div>
                            <div className="flex justify-between"><dt className="text-slate-400">Start date</dt><dd className="font-medium text-slate-900">{formatDate(selected.startDate)}</dd></div>
                            {selected.endDate && <div className="flex justify-between"><dt className="text-slate-400">End date</dt><dd className="font-medium text-slate-900">{formatDate(selected.endDate)}</dd></div>}
                            {selected.quantity && <div className="flex justify-between"><dt className="text-slate-400">Quantity</dt><dd className="font-medium text-slate-900">{selected.quantity}</dd></div>}
                            {typeof selected.refillsAuthorized === 'number' && <div className="flex justify-between"><dt className="text-slate-400">Refills authorized</dt><dd className="font-medium text-slate-900">{selected.refillsAuthorized}</dd></div>}
                          </dl>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Recent Management</h4>
                          {selected.history.length === 0 ? <p className="text-slate-400 italic">No management events recorded.</p> : (
                            <p className="text-slate-800">Most recent: {selected.history[selected.history.length - 1].action.replace(/-/g, ' ')} by {selected.history[selected.history.length - 1].actor} on {formatDate(selected.history[selected.history.length - 1].date)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'timeline' && (
                    <div>
                      {selected.history.length === 0 ? <p className="text-slate-400 italic text-sm">No timeline events recorded.</p> : (
                        <div className="relative border-l-2 border-slate-100 ml-2 space-y-4">
                          {selected.history.slice().reverse().map((h, idx) => (
                            <div key={idx} className="pl-4 relative">
                              <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-teal-500" />
                              <div className="text-sm font-medium text-slate-800 capitalize">{h.action.replace(/-/g, ' ')}</div>
                              <div className="text-xs text-slate-400">{h.actor} · {formatDate(h.date)}</div>
                              {h.detail && <div className="text-xs text-slate-600 mt-1">{h.detail}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'refills' && (
                    <div className="space-y-4 text-sm">
                      <dl className="grid grid-cols-2 gap-4">
                        <div><dt className="text-xs text-slate-400">Refills remaining</dt><dd className="font-medium text-slate-900">{selected.refillsRemaining ?? '—'}</dd></div>
                        <div><dt className="text-xs text-slate-400">Last refill</dt><dd className="font-medium text-slate-900">{formatDate(selected.lastRefillDate)}</dd></div>
                        <div><dt className="text-xs text-slate-400">Next eligible refill</dt><dd className="font-medium text-slate-900">{formatDate(selected.nextEligibleRefillDate)}</dd></div>
                        <div><dt className="text-xs text-slate-400">Days supply</dt><dd className="font-medium text-slate-900">{selected.daysSupply ? `${selected.daysSupply} days` : '—'}</dd></div>
                        <div><dt className="text-xs text-slate-400">Pharmacy</dt><dd className="font-medium text-slate-900">{selected.pharmacy || '—'}</dd></div>
                      </dl>
                      {selectedRefillDue && (
                        <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4">
                          <div className="text-xs font-bold text-amber-800 uppercase tracking-wide">Refill Review</div>
                          <p className="text-sm text-amber-900 mt-1">1 prescription requires review — {selected.name} {selected.dose}{selected.unit}</p>
                          <button onClick={() => setShowRefillReview(true)} className="mt-2 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700">Review Refill</button>
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Refill History</h4>
                        {selected.history.filter((h) => h.action.includes('refill') || h.action === 'renewed').length === 0 ? (
                          <p className="text-slate-400 italic">No refill history recorded.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {selected.history.filter((h) => h.action.includes('refill') || h.action === 'renewed').slice().reverse().map((h, i) => (
                              <li key={i} className="text-slate-700">{formatDate(h.date)} — {h.action.replace(/-/g, ' ')} ({h.actor})</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'notes' && (
                    <div className="space-y-2 text-sm">
                      {(patient.notes || []).filter((n: any) => (n.snippet || '').toLowerCase().includes(selected.name.toLowerCase())).length === 0 ? (
                        <p className="text-slate-400 italic">No medication-specific notes documented.</p>
                      ) : (
                        (patient.notes || []).filter((n: any) => (n.snippet || '').toLowerCase().includes(selected.name.toLowerCase())).map((n: any) => (
                          <div key={n.id} className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                            <div className="text-xs font-medium text-slate-500">{n.author} · {n.date}</div>
                            <div className="text-slate-800 mt-0.5">{n.snippet}</div>
                          </div>
                        ))
                      )}
                      <Link href={`/dashboard/records/${patientId}/doctor-notes/new?medication=${encodeURIComponent(selected.name)}`} className="inline-block text-xs font-semibold text-teal-700 hover:underline">Add Medication Note →</Link>
                    </div>
                  )}

                  {activeTab === 'safety' && (
                    <div className="space-y-3 text-sm">
                      {overallSafetyStatus(safety) === 'unavailable' ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="font-semibold text-slate-800">Safety checks unavailable</div>
                          <p className="text-slate-600 mt-1">Medication information is still available, but automated safety checks could not be completed.</p>
                          <button onClick={fetchAll} className="mt-2 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100">Retry</button>
                        </div>
                      ) : (
                        <>
                          {alertsForMedication(safety, selected.id).length === 0 ? (
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-1 text-emerald-800">
                              <div className="flex items-center gap-1.5"><CheckCircleIcon size={14} /> No allergy conflicts found</div>
                              <div className="flex items-center gap-1.5"><CheckCircleIcon size={14} /> No known interaction conflicts found</div>
                              <div className="flex items-center gap-1.5"><CheckCircleIcon size={14} /> No duplicate therapy identified</div>
                              <p className="text-xs text-emerald-700 mt-1">Based on current available medication/allergy information.</p>
                            </div>
                          ) : (
                            alertsForMedication(safety, selected.id).map((a) => (
                              <div key={a.id} className={`rounded-xl border p-4 ${severityTone(a.severity) === 'red' ? 'border-rose-100 bg-rose-50/70' : 'border-amber-100 bg-amber-50/70'}`}>
                                <div className={`text-xs font-bold uppercase tracking-wide ${severityTone(a.severity) === 'red' ? 'text-rose-700' : 'text-amber-700'}`}>{a.type.replace('-', ' ')} · {a.severity}</div>
                                <p className={`mt-1 ${severityTone(a.severity) === 'red' ? 'text-rose-900' : 'text-amber-900'}`}>{a.message}</p>
                                <div className="text-xs text-slate-500 mt-1">Source: {a.source}</div>
                                {a.recommendedAction && <div className="text-xs text-slate-600 mt-1">Recommended: {a.recommendedAction}</div>}
                              </div>
                            ))
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>

        {/* Right rail */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <h5 className="text-sm font-bold text-slate-900">Medication Detail</h5>
            {selected ? (
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between"><dt className="text-slate-400">Generic name</dt><dd className="font-medium text-slate-900">{selected.genericName || '—'}</dd></div>
                {selected.brandNames && selected.brandNames.length > 0 && <div className="flex justify-between"><dt className="text-slate-400">Brand examples</dt><dd className="font-medium text-slate-900">{selected.brandNames.join(', ')}</dd></div>}
                <div className="flex justify-between"><dt className="text-slate-400">Route</dt><dd className="font-medium text-slate-900">{selected.route || '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Status</dt><dd className="font-medium text-slate-900">{medicationStatusLabel(selected.status)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Source</dt><dd className="font-medium text-slate-900">{sourceLabel(selected.source)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Last reviewed</dt><dd className="font-medium text-slate-900">{formatDate(selected.lastReviewed)}</dd></div>
              </dl>
            ) : <p className="text-sm text-slate-400 mt-2">Select a medication to show details.</p>}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-bold text-slate-900">Safety Checks</h5>
              <ShieldCheckIcon size={16} className="text-slate-400" />
            </div>
            {selected ? (
              overallSafetyStatus(safety) === 'unavailable' ? (
                <p className="text-xs text-slate-500 mt-2">Safety checks unavailable</p>
              ) : (
                <div className="mt-2 space-y-1.5 text-xs">
                  {['allergy', 'interaction', 'duplicate-therapy'].map((type) => {
                    const has = alertsForMedication(safety, selected.id).some((a) => a.type === type);
                    return (
                      <div key={type} className={`flex items-center gap-1.5 ${has ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {has ? <AlertTriangleIcon size={12} /> : <CheckCircleIcon size={12} />}
                        <span className="capitalize">{type.replace('-', ' ')}</span>
                      </div>
                    );
                  })}
                  {alertsForMedication(safety, selected.id).some((a) => a.type === 'monitoring') && (
                    <div className="flex items-center gap-1.5 text-amber-700"><AlertTriangleIcon size={12} /><span>Monitoring</span></div>
                  )}
                </div>
              )
            ) : <p className="text-xs text-slate-400 mt-2">—</p>}
            <button onClick={() => setActiveTab('safety')} className="mt-2 text-xs font-semibold text-teal-700 hover:underline">View Full Safety Review</button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <h5 className="text-sm font-bold text-slate-900">Related Information</h5>
            {selected?.conditionId ? (
              <div className="mt-2 text-xs">
                <div className="text-slate-400">Related condition</div>
                <Link href={`/dashboard/records/${patientId}/conditions`} className="font-medium text-teal-700 hover:underline">View Condition →</Link>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">No documented condition relationship.</p>
            )}
            {selected?.carePlanName ? (
              <div className="mt-2 text-xs">
                <div className="text-slate-400">Care plan</div>
                <div className="font-medium text-slate-900">{selected.carePlanName}</div>
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-400">No care plan documented.</div>
            )}
            <Link href={`/dashboard/records/${patientId}/timeline`} className="inline-block mt-2 text-xs font-semibold text-teal-700 hover:underline">View in Clinical Timeline →</Link>
          </div>

          <div className="bg-white rounded-xl border border-violet-100 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-bold text-violet-900 flex items-center gap-1.5"><SparklesIcon size={14} /> AI Medication Assistant</h5>
            </div>
            <div className="mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-violet-50 text-violet-700 border border-violet-100">Clinical review required</div>
            {selected && (
              !aiGenerated ? (
                <button onClick={() => setAiGenerated(true)} className="mt-3 w-full px-3 py-2 bg-violet-50 text-violet-700 rounded-lg text-sm font-semibold hover:bg-violet-100">Generate Medication Summary</button>
              ) : (
                <div className="mt-3 text-xs text-slate-700 space-y-1 bg-violet-50/40 rounded-lg p-3 border border-violet-100">
                  <div>{selected.name} {selected.dose}{selected.unit} {selected.frequency ? selected.frequency.toLowerCase() : ''}</div>
                  <div>Active since {formatDate(selected.startDate)}</div>
                  <div>Documented indication: {selected.indication || 'None documented'}</div>
                  <div>Last reviewed: {formatDate(selected.lastReviewed)}</div>
                  <div>Refill: {selectedRefillDue ? 'Review due' : 'Current'}</div>
                  <div>Safety: {overallSafetyStatus(safety) === 'clear' ? 'No recognized conflicts from available current data' : overallSafetyStatus(safety) === 'unavailable' ? 'Unavailable' : 'Review recommended'}</div>
                  <button onClick={() => setAiGenerated(false)} className="mt-1 text-[11px] font-semibold text-violet-700 hover:underline">Refresh</button>
                </div>
              )
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <h5 className="text-sm font-bold text-slate-900">Quick Actions</h5>
            <div className="mt-3 grid gap-2">
              {selected && selectedActions.includes('renew') && <button onClick={() => setShowRefillReview(true)} className="px-3 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800">Review / Renew Prescription</button>}
              {selected && (
                <Link href={`/dashboard/records/${patientId}/tasks?new=1&title=${encodeURIComponent(`Follow-up: ${selected.name}`)}`} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 text-center">Create Follow-Up Task</Link>
              )}
              <Link href={`/dashboard/records/${patientId}/messages`} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 text-center">Message Patient</Link>
              <button onClick={() => setShowReconcile(true)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Reconcile Medications</button>
              {selected && <button onClick={() => setShowHistory(true)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5"><HistoryIcon size={14} /> View Medication Timeline</button>}
              <button onClick={() => window.print()} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Print Medication List</button>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom bar */}
      <div className="fixed left-0 right-0 bottom-0 bg-white border-t border-slate-100 p-3 shadow-lg print:hidden">
        <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between">
          <div className="text-sm text-slate-700">Patient record: <strong>{patient.name}</strong></div>
          <div className="flex items-center gap-3">
            {selected && selectedActions.includes('renew') ? (
              <button onClick={() => setShowRefillReview(true)} className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800">Review Refill</button>
            ) : (
              <button onClick={() => selected && setShowModify(true)} disabled={!selected || !selectedActions.includes('modify')} className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800 disabled:opacity-40">Manage Prescription</button>
            )}
          </div>
        </div>
      </div>

      {lifecycleAction && selected && (
        <MedicationActionDialog patientId={patientId} medication={selected} action={lifecycleAction} onClose={() => setLifecycleAction(null)} onConfirmed={async () => { await fetchAll(); setLifecycleAction(null); }} />
      )}
      {showModify && selected && (
        <ModifyPrescriptionDrawer patientId={patientId} medication={selected} onClose={() => setShowModify(false)} onSaved={async () => { await fetchAll(); setShowModify(false); }} />
      )}
      {showRefillReview && selected && (
        <RefillReviewDrawer patientId={patientId} medication={selected} safety={safety} onClose={() => setShowRefillReview(false)} onResolved={async () => { await fetchAll(); setShowRefillReview(false); }} />
      )}
      {showReconcile && (
        <ReconciliationDrawer patientId={patientId} medications={medications} onClose={() => setShowReconcile(false)} onCompleted={async () => { await fetchAll(); setShowReconcile(false); }} />
      )}
      {showHistory && selected && <MedicationHistoryDrawer medication={selected} onClose={() => setShowHistory(false)} />}
    </div>
  );
}
