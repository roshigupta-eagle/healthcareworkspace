"use client";

import React from 'react';
import Link from 'next/link';

export default function ConcernSummaryCard({ title, value, href }: { title: string; value: string | number | null | undefined; href?: string }) {
  const content = (
    <div className="bg-white rounded-lg p-4 border border-[#E6EEF8] shadow-sm">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="mt-1 font-semibold text-[#121A2D]">{typeof value === 'number' ? value : (value || '—')}</div>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
