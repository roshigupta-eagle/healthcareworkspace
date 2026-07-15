"use client";

import React, { useEffect, useState } from 'react';

type Props = {
  data: number[];
  labels?: string[];
  colors?: string[];
  height?: number;
};

export default function BarChart({ data, labels = [], colors, height = 120 }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const max = Math.max(...data, 1);
  const palette = colors || ['#2563EB', '#8B5CF6', '#14B8A6', '#F59E0B', '#EF4444'];

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((v, i) => {
        const h = Math.round((v / max) * 100);
        const color = palette[i % palette.length];
        return (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div className="w-full bg-neutral-100 rounded-sm overflow-hidden" style={{ height: '100%' }}>
              <div
                style={{
                  height: mounted ? `${h}%` : '0%',
                  background: color,
                  transition: 'height 600ms cubic-bezier(.2,.9,.2,1)'
                }}
              />
            </div>
            <div className="mt-2 text-xs text-neutral-500 text-center">{labels[i] || ''}</div>
          </div>
        );
      })}
    </div>
  );
}
