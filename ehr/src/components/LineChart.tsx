"use client";

import React from 'react';

type Props = {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  className?: string;
};

export default function LineChart({ data, width = 300, height = 80, color = '#60A5FA', showArea = false, className }: Props) {
  if (!data || data.length === 0) return <div className="text-sm text-slate-500">—</div>;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const lastX = (data.length - 1) / Math.max(1, data.length - 1) * width;

  const areaPath = `${linePath} L ${lastX} ${height} L 0 ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} preserveAspectRatio="none">
      {showArea && (
        <path d={areaPath} fill={color} fillOpacity={0.12} />
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
