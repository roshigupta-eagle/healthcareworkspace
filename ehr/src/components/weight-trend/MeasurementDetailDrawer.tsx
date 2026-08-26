"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { normalizeMeasurementStatus, type LogMeasurement } from '@/lib/weightLog';
import MarkEnteredInErrorDialog from './MarkEnteredInErrorDialog';

type Props = {
  patientId: string;
  measurement: LogMeasurement;
  needsReview?: boolean;
  initialMode?: 'view' | 'correcting';
  onClose: () => void;
  onUpdated: () => void;
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  final: { label: 'Final', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  corrected: { label: 'Corrected', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  preliminary: { label: 'Preliminary', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  'entered-in-error': { label: 'Entered in Error', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function MeasurementDetailDrawer({ patientId, measurement, needsReview, initialMode, onClose, onUpdated }: Props) {
  const [updating, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState(initialMode === 'correcting');
  const [correctedValue, setCorrectedValue] = useState<string>(measurement ? String(measurement.value) : '');
  const [correctedUnit, setCorrectedUnit] = useState<string>(measurement?.unit || 'kg');
  const [correctedAt, setCorrectedAt] = useState<string>(measurement?.occurredAt ? measurement.occurredAt.slice(0, 16) : '');
  const [correctionReason, setCorrectionReason] = useState('');
  const [markErrorOpen, setMarkErrorOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]')).filter((element) => !element.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  if (!measurement) return null;


  async function handleSaveCorrection() {
    const valNum = parseFloat(correctedValue);
    if (isNaN(valNum) || valNum <= 0 || valNum > 500) {
      setErrorMsg('Please enter a valid weight value.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/patients/${encodeURIComponent(patientId)}/measurements/weight/${encodeURIComponent(measurement.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            value: valNum,
            unit: correctedUnit,
            occurredAt: correctedAt ? new Date(correctedAt).toISOString() : measurement.occurredAt,
            correction: { correctedAt: new Date().toISOString(), previousValue: measurement.value, previousUnit: measurement.unit, reason: correctionReason.trim() || undefined },
          }),
        }
      );
      if (!res.ok) throw new Error('Failed to save correction');
      setSaving(false);
      onUpdated();
      onClose();
    } catch (err: unknown) {
      setSaving(false);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save correction');
    }
  }

  const occurredDate = measurement.occurredAt
    ? new Date(measurement.occurredAt).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
  const status = normalizeMeasurementStatus(measurement);
  const statusBadge = STATUS_BADGE[status] || STATUS_BADGE.final;
  const isEnteredInError = status === 'entered-in-error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="weight-measurement-title" className="weight-trend-drawer flex h-full flex-col bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100/80 text-teal-700 ring-1 ring-teal-600/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
            <div>
              <h2 id="weight-measurement-title" className="text-lg font-bold text-slate-900">Measurement Details</h2>
              <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusBadge.className}`}>{statusBadge.label}</span>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close measurement details"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
              {errorMsg}
            </div>
          )}

          {needsReview && (
            <div className="rounded-xl bg-amber-50 p-4 text-xs font-medium text-amber-900 ring-1 ring-amber-200 flex items-start gap-2">
              <svg className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <div className="font-semibold">Possible Data Issue</div>
                <p className="mt-0.5 text-amber-800">{measurement.dataQuality?.reason || 'The data-quality service requested a review of this measurement.'}</p>
              </div>
            </div>
          )}

          {!correcting ? (
            <div className="rounded-2xl border border-teal-100 bg-teal-50/30 p-5 space-y-2 text-center ring-1 ring-teal-500/10">
              <div className="text-xs font-semibold text-teal-800 uppercase tracking-wider">Documented Weight</div>
              <div className="text-4xl font-black text-slate-900 tabular-nums">
                {measurement.value} <span className="text-lg font-bold text-slate-500">{measurement.unit || 'kg'}</span>
              </div>
              <div className="text-xs font-medium text-slate-500">{occurredDate}</div>
            </div>
          ) : (
            <div className="rounded-2xl border border-teal-100 bg-teal-50/30 p-5 space-y-3 ring-1 ring-teal-500/10">
              <div className="text-xs font-semibold uppercase tracking-wider text-teal-900">Correct Measurement</div>
              <div className="flex items-center gap-2">
                <input type="number" step="0.1" value={correctedValue} onChange={(e) => setCorrectedValue(e.target.value)} className="w-full text-2xl font-bold text-slate-900 bg-white border border-teal-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <select value={correctedUnit} onChange={(e) => setCorrectedUnit(e.target.value)} className="text-sm font-semibold bg-white border border-teal-200 rounded-xl px-2 py-2">
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </div>
              <input type="datetime-local" value={correctedAt} onChange={(e) => setCorrectedAt(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <div>
                <label htmlFor="correction-reason" className="mb-1 block text-xs font-semibold text-slate-600">Correction reason</label>
                <textarea id="correction-reason" value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} rows={2} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Describe what was corrected and why" />
              </div>
              <p className="text-[11px] text-slate-500">The original value and timestamp are preserved in provenance history — this does not delete the finalized observation.</p>
            </div>
          )}

          {measurement.correction && !correcting && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-xs space-y-1.5">
              <div className="font-semibold text-blue-900 uppercase tracking-wide text-[11px]">Previous Version</div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Value</span>
                <span className="font-semibold text-slate-900">{measurement.correction.previousValue} {measurement.correction.previousUnit || 'kg'}</span>
              </div>
              {measurement.correction.correctedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Corrected</span>
                  <span className="font-semibold text-slate-900">{new Date(measurement.correction.correctedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })}</span>
                </div>
              )}
              {measurement.correction.reason && (
                <div className="text-slate-600">Reason: <span className="font-semibold text-slate-900">{measurement.correction.reason}</span></div>
              )}
            </div>
          )}

          {/* Detail Metadata Grid */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 divide-y divide-slate-100 text-xs">
            <div className="flex items-center justify-between pb-2">
              <span className="font-medium text-slate-500">Source</span>
              <span className="font-semibold text-slate-900 capitalize bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                {measurement.source?.replace('-', ' ') || 'Clinic'}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="font-medium text-slate-500">Recorded By</span>
              <span className="font-semibold text-slate-900">{measurement.recorder?.name || '—'}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="font-medium text-slate-500">Measurement Method</span>
              <span className="font-semibold text-slate-900 capitalize">{measurement.method?.replace('-', ' ') || '—'}</span>
            </div>

            {measurement.encounterId && (
              <div className="flex items-center justify-between py-2">
                <span className="font-medium text-slate-500">Related encounter</span>
                <Link href={`/dashboard/encounters/${encodeURIComponent(measurement.encounterId)}`} className="font-semibold text-teal-700 hover:underline">View encounter</Link>
              </div>
            )}

            {measurement.provenance?.sourceSystem && (
              <div className="flex items-center justify-between py-2">
                <span className="font-medium text-slate-500">Source system</span>
                <span className="font-semibold text-slate-900">{measurement.provenance.sourceSystem}</span>
              </div>
            )}

            {measurement.provenance?.createdAt && (
              <div className="flex items-center justify-between py-2">
                <span className="font-medium text-slate-500">Recorded</span>
                <span className="font-semibold text-slate-900">{new Date(measurement.provenance.createdAt).toLocaleDateString()}</span>
              </div>
            )}

            {measurement.enteredInErrorReason && (
              <div className="pt-2">
                <span className="block font-medium text-slate-500 mb-1">Entered-in-error reason</span>
                <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-rose-100">{measurement.enteredInErrorReason}</p>
              </div>
            )}

            {measurement.note && (
              <div className="pt-2">
                <span className="block font-medium text-slate-500 mb-1">Clinical Notes</span>
                <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 italic">{measurement.note}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between gap-3">
          {!correcting ? (
            <>
              <div className="flex items-center gap-2">
                {!isEnteredInError && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCorrecting(true)}
                      disabled={updating}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Correct
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarkErrorOpen(true)}
                      disabled={updating}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 focus:outline-none disabled:opacity-50"
                    >
                      Mark Entered in Error
                    </button>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Close
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCorrecting(false)}
                disabled={updating}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCorrection}
                disabled={updating}
                className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                {updating ? 'Saving…' : 'Save Correction'}
              </button>
            </>
          )}
        </div>
      </div>
      {markErrorOpen && (
        <MarkEnteredInErrorDialog
          patientId={patientId}
          measurement={measurement}
          onClose={() => setMarkErrorOpen(false)}
          onConfirmed={async () => { await onUpdated(); setMarkErrorOpen(false); }}
        />
      )}
    </div>
  );
}