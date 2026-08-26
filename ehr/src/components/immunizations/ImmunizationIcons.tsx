import React from 'react';

export function Icon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m14 6 4 4" /><path d="m16 4 4 4" /><path d="m3 21 8.5-8.5" /><path d="m6 18 3 3" /><path d="m7 14 3 3" /><path d="m11 9 4 4" /><path d="m9 11 5-5 4 4-5 5" /></svg>;
}