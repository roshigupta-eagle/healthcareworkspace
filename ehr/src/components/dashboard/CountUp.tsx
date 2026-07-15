"use client";

import React, { useEffect, useRef, useState } from 'react';

type Props = {
  end: number;
  duration?: number; // ms
  decimals?: number;
  start?: number;
  className?: string;
};

export default function CountUp({ end, duration = 1000, decimals = 0, start = 0, className }: Props) {
  const [value, setValue] = useState(start);
  const rafRef = useRef<number | null>(null);
  const startTs = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startTs.current = null;

    const animate = (ts: number) => {
      if (!startTs.current) startTs.current = ts;
      const elapsed = ts - (startTs.current || 0);
      const progress = Math.min(1, elapsed / duration);
      const current = start + (end - start) * progress;
      setValue(Number(current.toFixed(decimals)));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration, decimals, start]);

  return <span className={className}>{value}</span>;
}
