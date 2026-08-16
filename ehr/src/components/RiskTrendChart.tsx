"use client";

import React from 'react';

export default function RiskTrendChart({ score, history = [] }: { score: number; history?: number[] }) {
  const points = history.length ? history : [60, 62, 65, 68, 72, 75, score];
  const w = 600; const h = 160; const pad = 12;
  const max = Math.max(...points, 100);
  const min = Math.min(...points, 0);
  const scaleX = (i: number) => pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);
  const scaleY = (v: number) => h - pad - ((v - min) / Math.max(1, max - min)) * (h - pad * 2);
  const d = points.map((v, i) => `${i===0? 'M':'L'} ${scaleX(i)} ${scaleY(v)}`).join(' ');

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="160" role="img" aria-label="Risk trend chart">
        <defs>
          <linearGradient id="trend-grad" x1="0" x2="0">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={w} height={h} fill="transparent" />
        <path d={d} fill="none" stroke="#0B5FFF" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((v, i) => (<circle key={i} cx={scaleX(i)} cy={scaleY(v)} r={3} fill="#0B5FFF" />))}
      </svg>
    </div>
  );
}
