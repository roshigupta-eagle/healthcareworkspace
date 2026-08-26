"use client";

import React from 'react';

type VitalPoint = { date: string; value: number; unit: string };

export default function CurrentWeightBadge({ latest, prev }: { latest?: VitalPoint | null; prev?: VitalPoint | null }) {
  const delta = latest && prev ? +(latest.value - prev.value).toFixed(1) : null;
  const deltaText = delta === null ? null : `${delta > 0 ? '+' : ''}${delta} ${latest?.unit ?? ''}`;
  const deltaClass = delta === null ? 'text-gray-500' : delta < 0 ? 'text-teal-700' : 'text-amber-700';

  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 rounded-md border border-gray-200 bg-white flex items-center justify-center shadow-sm">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="6" width="18" height="12" rx="2" fill="#f0fdf4" />
          <path d="M7 10h10v2H7z" fill="#059669" />
          <path d="M9 7h6v1H9z" fill="#10b981" opacity="0.9" />
        </svg>
      </div>
      <div>
        <div className="text-xs text-gray-500">Current Weight</div>
        <div className="text-sm font-semibold text-gray-900">{latest ? `${latest.value} ${latest.unit}` : '—'}</div>
        {delta !== null ? (
          <div className={`text-xs ${deltaClass}`}>{deltaText}</div>
        ) : (
          <div className="text-xs text-gray-400">No previous</div>
        )}
      </div>
    </div>
  );
}
