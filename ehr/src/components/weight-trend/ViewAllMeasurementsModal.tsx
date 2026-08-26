"use client";

import React, { useState, useMemo } from 'react';
import { formatSignedWeight, formatWeight, toKg } from '@/lib/weightMath';
import type { WeightTrendMeasurement } from './weightTrendTypes';

type Props = {
  patientId: string;
  measurements: WeightTrendMeasurement[];
  displayUnit?: 'kg' | 'lb';
  analysisRange?: string;
  onClose: () => void;
  onSelectMeasurement: (item: WeightTrendMeasurement) => void;
};

export default function ViewAllMeasurementsModal({ patientId, measurements, displayUnit = 'kg', analysisRange = 'All', onClose, onSelectMeasurement }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [now] = useState(() => Date.now());

  const scoped = useMemo(() => {
    const days = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730 }[analysisRange];
    if (!days) return measurements;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return measurements.filter((measurement) => Date.parse(measurement.occurredAt) >= cutoff);
  }, [measurements, analysisRange, now]);

  const sorted = useMemo(() => {
    return [...scoped].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [scoped]);

  const filtered = useMemo(() => {
    return sorted.filter((m) => {
      const matchSearch =
        !searchTerm ||
        String(m.value).includes(searchTerm) ||
        (m.note && m.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.recorder?.name && m.recorder.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchSource = sourceFilter === 'all' || m.source === sourceFilter;
      return matchSearch && matchSource;
    });
  }, [sorted, searchTerm, sourceFilter]);

  function exportCsv() {
    const headers = ['ID', 'Date', `Weight (${displayUnit})`, 'Status', 'Source', 'Recorded By', 'Encounter', 'Note'];
    const rows = sorted.map((m) => [
      m.id,
      new Date(m.occurredAt).toISOString(),
      formatWeight(Number(m.value), m.unit, displayUnit),
      m.status || (m.enteredInError ? 'entered-in-error' : 'final'),
      m.source || 'clinic',
      m.recorder?.name || 'Dr. Aris Thorne',
      m.encounterId || '',
      `"${(m.note || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `patient-${patientId}-weight-history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Complete Weight Measurement History</h2>
            <p className="text-xs text-slate-500">Longitudinal body weight observations ({measurements.length} total readings; {analysisRange === 'All' ? 'all time' : `${analysisRange} window`})</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-6 py-3">
          <input
            type="text"
            placeholder="Filter by Value, Recorder, or Note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Source:</span>
            {['all', 'clinic', 'patient-reported', 'device', 'imported'].map((s) => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                  sourceFilter === s ? 'bg-teal-700 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Weight</th>
                <th className="py-3 px-3">Change</th>
                <th className="py-3 px-3">Source</th>
                <th className="py-3 px-3">Recorded By</th>
                <th className="py-3 px-3">Encounter</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((m, idx) => {
                const prev = filtered[idx + 1];
                const delta = prev ? +(toKg(Number(m.value), m.unit) - toKg(Number(prev.value), prev.unit)).toFixed(2) : null;
                return (
                  <tr key={m.id} className="hover:bg-teal-50/30 transition-colors group">
                    <td className="py-3 px-3 font-medium text-slate-900">
                      {new Date(m.occurredAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                      })}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {new Date(m.occurredAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 tabular-nums">
                      {formatWeight(Number(m.value), m.unit, displayUnit)}
                    </td>
                    <td className="py-3 px-3 font-semibold tabular-nums">
                      {delta === null ? (
                        <span className="text-slate-400">—</span>
                      ) : delta < 0 ? (
                        <span className="text-slate-700">{formatSignedWeight(delta, displayUnit)}</span>
                      ) : (
                        <span className="text-slate-700">{formatSignedWeight(delta, displayUnit)}</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 capitalize">
                        {m.source || 'clinic'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{m.recorder?.name || 'Dr. Aris Thorne'}</td>
                    <td className="py-3 px-3 font-mono text-teal-700">{m.encounterId || '—'}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectMeasurement(m)}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filtered.length} of {scoped.length} readings</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}