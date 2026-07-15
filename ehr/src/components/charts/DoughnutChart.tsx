"use client";

import React, { useMemo, useState, useEffect } from 'react';

type Props = {
  data: number[];
  labels?: string[];
  colors?: string[];
  size?: number;
  innerRadius?: number; // percent 0..50
};

export default function DoughnutChart({ data, labels = [], colors, size = 160, innerRadius = 48 }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const total = useMemo(() => data.reduce((s, v) => s + Math.max(0, v), 0), [data]);
  const defaultColors = ['#2563EB', '#14B8A6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];
  const palette = colors || defaultColors;

  const stops = useMemo(() => {
    let acc = 0;
    return data.map((v, i) => {
      const pct = total > 0 ? (v / total) * 100 : 0;
      const start = acc;
      acc += pct;
      const end = acc;
      return { start, end, color: palette[i % palette.length], label: labels[i] || '' };
    });
  }, [data, labels, palette, total]);

  const gradient = stops.map((s) => `${s.color} ${s.start}% ${s.end}%`).join(', ');
  const style = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: `conic-gradient(${gradient})`,
    transition: 'transform 400ms ease, opacity 400ms ease',
    transform: mounted ? 'scale(1)' : 'scale(0.95)',
    opacity: mounted ? 1 : 0,
  } as React.CSSProperties;

  const holeSize = `${innerRadius}%`;

  return (
    <div style={{ width: size, height: size }} className="flex items-center justify-center">
      <div style={style} aria-hidden className="relative">
        <div style={{ position: 'absolute', inset: '50%', transform: 'translate(-50%, -50%)' }}>
          <div style={{ width: `${100 - innerRadius * 2}%`, height: `${100 - innerRadius * 2}%`, borderRadius: '50%', background: 'white', transform: 'translate(-50%,-50%)' }} />
        </div>
      </div>
    </div>
  );
}
