"use client";

import React, { useState } from 'react';

type Props = {
  patientId: string;
  existingMeasurements?: any[];
  onClose: () => void;
  onSaved: (newItem?: any) => void;
};

export default function AddMeasurementDrawer({ patientId, existingMeasurements = [], onClose, onSaved }: Props) {
  const [value, setValue] = useState<string>('68.0');
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [occurredAt, setOccurredAt] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [source, setSource] = useState<string>('clinic');
  const [method, setMethod] = useState<string>('standing-scale');
  const [encounterId, setEncounterId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [recorderName, setRecorderName] = useState<string>('Dr. Aris Thorne');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);
  const [showMore, setShowMore] = useState(false);

  // Check duplicate on change
  function checkForDuplicate(valNum: number, timeStr: string) {
    if (!valNum || !timeStr) return null;
    const dateStr = new Date(timeStr).toDateString();
    return existingMeasurements.find((m) => {
      const mDateStr = new Date(m.occurredAt).toDateString();
      return mDateStr === dateStr && Math.abs(Number(m.value) - valNum) < 0.2;
    });
  }

  async function handleSubmit(e: React.FormEvent, forceSave = false) {
    e.preventDefault();
    setErrorMsg(null);

    const valNum = parseFloat(value);
    if (isNaN(valNum) || valNum <= 0 || valNum > 500) {
      setErrorMsg('Please enter a valid weight measurement (e.g. 68.0).');
      return;
    }

    if (!forceSave) {
      const dup = checkForDuplicate(valNum, occurredAt);
      if (dup) {
        setDuplicateWarning(dup);
        return;
      }
    }

    setSaving(true);
    setDuplicateWarning(null);

    try {
      const payload = {
        value: valNum,
        unit,
        occurredAt: new Date(occurredAt).toISOString(),
        source,
        method,
        encounterId: encounterId || undefined,
        note: note.trim() || undefined,
        recorder: { id: 'u-current', name: recorderName },
        sourceResource: {
          resourceType: 'Observation',
          code: '29463-7',
          display: 'Body weight',
        },
      };

      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/measurements/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Server returned an error while saving.');
      }

      const json = await res.json();
      setSaving(false);
      onSaved(json.item);
    } catch (err: any) {
      setSaving(false);
      setErrorMsg(err?.message || 'Failed to save measurement. Please try again.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="weight-trend-drawer flex h-full flex-col bg-white shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100/80 text-teal-700 ring-1 ring-teal-600/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Add Weight Measurement</h2>
              <p className="text-xs text-slate-500">Record a new longitudinal weight observation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Content Form */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 ring-1 ring-rose-200 flex items-start gap-2">
              <svg className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200 text-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-900 text-xs">
                <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Similar measurement already exists
              </div>
              <p className="text-xs text-amber-800">
                A weight reading of <span className="font-bold">{duplicateWarning.value} {duplicateWarning.unit}</span> was recorded on{' '}
                {new Date(duplicateWarning.occurredAt).toLocaleDateString()}.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-xs font-medium hover:bg-amber-800"
                >
                  Save Anyway
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-medium text-amber-900 bg-white hover:bg-amber-100"
                >
                  Review Form
                </button>
              </div>
            </div>
          )}

          {/* Primary Numeric Input */}
          <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-5 space-y-3 ring-1 ring-teal-500/10">
            <label className="block text-xs font-semibold uppercase tracking-wider text-teal-900">
              Weight Measurement *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.1"
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="68.0"
                className="w-full text-3xl font-extrabold text-slate-900 bg-white border border-teal-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs tabular-nums"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'kg' | 'lb')}
                className="text-base font-bold text-slate-700 bg-white border border-teal-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-xs"
              >
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Date & Time of Measurement *</label>
            <input
              type="datetime-local"
              required
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Measurement Source *</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
            >
              <option value="clinic">Clinic (In-Person Medical Grade)</option>
              <option value="patient-reported">Patient Reported (Home Measurement)</option>
              <option value="device">Connected Device (Cellular / Smart Scale)</option>
              <option value="imported">Imported / EHR Integration</option>
            </select>
          </div>

          {/* Clinician / Recorder */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Recorded By</label>
            <input
              type="text"
              value={recorderName}
              onChange={(e) => setRecorderName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {/* Toggle More Details */}
          <div>
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              <span>{showMore ? '− Hide optional details' : '+ Show optional details (method, encounter, notes)'}</span>
            </button>
          </div>

          {showMore && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Measurement Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="standing-scale">Standing Calibrated Scale</option>
                  <option value="wheelchair-scale">Wheelchair Scale</option>
                  <option value="bed-scale">Bed Scale</option>
                  <option value="self-reported">Self-Reported / Uncalibrated</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Associated Encounter ID</label>
                <input
                  type="text"
                  placeholder="e.g. enc-1301"
                  value={encounterId}
                  onChange={(e) => setEncounterId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Clinical Notes</label>
                <textarea
                  rows={3}
                  placeholder="Note clothing, time of day, fasting status or relevant context..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
          )}
        </form>

        {/* Drawer Footer Actions */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Measurement</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}