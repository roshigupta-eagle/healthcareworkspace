"use client";

import React, { useState } from 'react';
import type { WeightGoal } from '@/lib/weightStore';

type Props = {
  patientId: string;
  existingGoal?: WeightGoal | null;
  currentWeight?: number;
  onClose: () => void;
  onSaved: (goalItem?: WeightGoal) => void;
};

export default function ManageGoalDrawer({ patientId, existingGoal, currentWeight, onClose, onSaved }: Props) {
  const [goalType, setGoalType] = useState<string>(existingGoal?.goalType || 'other');
  const [targetWeight, setTargetWeight] = useState<string>(existingGoal?.targetWeight != null ? String(existingGoal.targetWeight) : '');
  const [targetWeightMin, setTargetWeightMin] = useState<string>(existingGoal?.targetWeightMin != null ? String(existingGoal.targetWeightMin) : '');
  const [targetWeightMax, setTargetWeightMax] = useState<string>(existingGoal?.targetWeightMax != null ? String(existingGoal.targetWeightMax) : '');
  const [baselineWeight, setBaselineWeight] = useState<string>(existingGoal?.baselineWeight != null ? String(existingGoal.baselineWeight) : currentWeight != null ? String(currentWeight) : '');
  const [targetDate, setTargetDate] = useState<string>(existingGoal?.targetDate ? existingGoal.targetDate.slice(0, 10) : '');
  const [owner, setOwner] = useState<string>(existingGoal?.owner || 'clinician');
  const [status, setStatus] = useState<string>(existingGoal?.status || 'active');
  const [notes, setNotes] = useState<string>(existingGoal?.notes || 'Weight management plan established with endocrinology team.');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const needsTarget = ['target-weight', 'weight-reduction', 'weight-gain'].includes(goalType);
  const needsRange = goalType === 'target-range';
  const needsBaseline = ['target-weight', 'weight-reduction', 'weight-gain', 'maintain', 'percentage-loss'].includes(goalType);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const parseOptional = (value: string) => value.trim() ? Number(value) : undefined;
    const targetNum = parseOptional(targetWeight);
    const minNum = parseOptional(targetWeightMin);
    const maxNum = parseOptional(targetWeightMax);
    const baselineNum = parseOptional(baselineWeight);
    if (needsTarget && (targetNum == null || !Number.isFinite(targetNum))) { setErrorMsg('Enter a valid target weight in kg.'); return; }
    if (needsRange && (minNum == null || maxNum == null || !Number.isFinite(minNum) || !Number.isFinite(maxNum))) { setErrorMsg('Enter both target range bounds in kg.'); return; }
    if (needsBaseline && (baselineNum == null || !Number.isFinite(baselineNum))) { setErrorMsg('Enter a valid documented baseline weight in kg.'); return; }

    setSaving(true);

    try {
      const payload = {
        goalType,
        targetWeight: needsTarget ? targetNum : undefined,
        targetWeightMin: needsRange ? minNum : undefined,
        targetWeightMax: needsRange ? maxNum : undefined,
        baselineWeight: needsBaseline ? baselineNum : undefined,
        targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
        owner,
        status,
        notes: notes.trim() || undefined,
      };

      const res = await fetch(`/api/patients/${encodeURIComponent(patientId)}/weight-goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) { const body = await res.json().catch(() => null); throw new Error(body?.details?.join?.(' ') || body?.error || 'Failed to save weight goal.'); }

      const json = await res.json();
      setSaving(false);
      onSaved(json.item);
    } catch (err: unknown) {
      setSaving(false);
      setErrorMsg(err instanceof Error ? err.message : 'Error saving weight goal.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="weight-trend-drawer flex h-full flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100/80 text-violet-700 ring-1 ring-violet-600/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Manage Weight Goal</h2>
              <p className="text-xs text-slate-500">Establish or adjust longitudinal weight goals</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 p-4 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Goal Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Goal Type</label>
            <select
              value={goalType}
              onChange={(e) => setGoalType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="weight-reduction">Loss / Reduction</option>
              <option value="weight-gain">Gain</option>
              <option value="maintain">Maintain</option>
              <option value="target-range">Target Range</option>
              <option value="target-weight">Specific Target</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Target Weight Primary Input */}
          {needsTarget && <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-5 space-y-3 ring-1 ring-violet-500/10">
            <label className="block text-xs font-semibold uppercase tracking-wider text-violet-900">
              Target Weight (kg) *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.1"
                required
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="62.0"
                className="w-full text-3xl font-extrabold text-slate-900 bg-white border border-violet-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-xs tabular-nums"
              />
              <span className="text-lg font-bold text-violet-900/60">kg</span>
            </div>
          </div>}

          {needsRange && <div className="grid grid-cols-2 gap-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-5 ring-1 ring-violet-500/10">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-violet-900">Minimum target (kg) *</label>
              <input type="number" step="0.1" value={targetWeightMin} onChange={(e) => setTargetWeightMin(e.target.value)} className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-violet-900">Maximum target (kg) *</label>
              <input type="number" step="0.1" value={targetWeightMax} onChange={(e) => setTargetWeightMax(e.target.value)} className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>}

          {/* Baseline Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Goal Baseline (kg){needsBaseline ? ' *' : ''}</label>
              <input
                type="number"
                step="0.1"
                value={baselineWeight}
                onChange={(e) => setBaselineWeight(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Target Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          {/* Goal Owner & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Goal Ownership</label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="clinician">Clinician Prescribed</option>
                <option value="patient">Patient Self-Selected</option>
                <option value="shared">Shared Decision Making</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Goal Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="proposed">Proposed / In Review</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed / Maintained</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Plan Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Clinical Rationale & Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document Patient-Agreed Management Plan..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {/* Goal Audit History */}
          {existingGoal?.history && existingGoal.history.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Goal History</div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {existingGoal.history.map((h, idx) => (
                  <div key={idx} className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-600">
                    <span className="font-semibold text-slate-800">{h.actor || 'Clinician'}</span> {h.action} on{' '}
                    {new Date(h.when).toLocaleDateString()}: {h.details}
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"
          >
            {saving ? 'Saving Goal...' : 'Save Goal'}
          </button>
        </div>
      </div>
    </div>
  );
}