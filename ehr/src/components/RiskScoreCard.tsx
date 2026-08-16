"use client";

import React from 'react';

interface Contributor { factor: string; weight: number; impact: string }
interface RiskProfile { score: number; category: string; contributors?: Contributor[]; generatedAt?: string; engineVersion?: string }

export default function RiskScoreCard({ patient, riskProfile }: { patient: { id: string; name?: string; mrn?: string }, riskProfile: RiskProfile }) {
  const pct = Math.max(0, Math.min(100, Math.round(riskProfile.score || 0)));
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#DDE7F0] shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <linearGradient id="g" x1="0" x2="1">
                <stop offset="0%" stopColor="#FF7A7A" />
                <stop offset="100%" stopColor="#D33A33" />
              </linearGradient>
            </defs>
            <g transform="translate(60,60)">
              <circle r={radius} cx="0" cy="0" fill="#F8FAFC" stroke="#E6EEF8" strokeWidth={8} />
              <circle r={radius} cx="0" cy="0" fill="transparent" stroke="url(#g)" strokeWidth={8} strokeLinecap="round" strokeDasharray={`${dash} ${circumference - dash}`} transform="rotate(-90)" />
              <text x="0" y="4" textAnchor="middle" fontSize="20" fontWeight={700} fill="#0B2553">{pct}</text>
              <text x="0" y="24" textAnchor="middle" fontSize="12" fill="#6B7280">/100</text>
            </g>
          </svg>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Risk Score</div>
              <div className="text-lg font-semibold text-[#121A2D]">{pct} / 100</div>
              <div className="mt-1 text-sm text-red-700 font-semibold">{riskProfile.category}</div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div>Confidence <span className="font-semibold">97%</span></div>
              <div className="mt-1">Engine <span className="font-semibold">{riskProfile.engineVersion || '—'}</span></div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-700">This score is calculated using chronic disease burden, medication complexity, recent utilization, social determinants of health, laboratory trends, and predictive analytics.</div>

          <div className="mt-4 flex items-center gap-2">
            <button className="px-3 py-2 bg-white border rounded text-sm">View Algorithm Details</button>
            <button className="px-3 py-2 bg-white border rounded text-sm">View Drivers</button>
          </div>
        </div>
      </div>
    </div>
  );
}
