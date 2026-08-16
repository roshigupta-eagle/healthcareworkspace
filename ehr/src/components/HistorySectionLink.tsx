"use client";

import Link from 'next/link';
import React from 'react';

export default function HistorySectionLink({ href, title, subtitle, count, children }: { href: string; title: string; subtitle?: string; count?: number | string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="block">
      <div className="bg-white rounded-lg p-4 border border-[#E6EEF8] shadow-sm hover:shadow-md transition-shadow duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[#0F1724]">{title}</div>
            {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
          </div>
          <div className="text-right">
            {typeof count !== 'undefined' && <div className="text-sm font-semibold text-teal-600">{count}</div>}
            <div className="text-xs text-gray-400">View →</div>
          </div>
        </div>
        {children && <div className="mt-3 text-sm text-gray-700">{children}</div>}
      </div>
    </Link>
  );
}
