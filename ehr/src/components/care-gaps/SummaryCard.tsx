import React from 'react';

export default function SummaryCard({ title, count, tone = 'neutral', active = false, onClick }: { title: string; count: number | string; tone?: string; active?: boolean; onClick?: () => void }) {
  const toneMap: any = {
    critical: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700', icon: '🔴' },
    overdue: { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700', icon: '🟠' },
    dueSoon: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', icon: '🟡' },
    recommended: { bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-700', icon: '🔵' },
    neutral: { bg: 'bg-white', border: 'border-gray-100', text: 'text-gray-800', icon: '◻️' },
  };
  const t = toneMap[tone] || toneMap.neutral;

  return (
    <button onClick={onClick} aria-pressed={active} className={`w-full text-left p-4 rounded-lg border ${t.border} ${t.bg} hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-200 ${active ? 'ring-2 ring-teal-200' : ''}`}>
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 h-10 w-10 rounded-md flex items-center justify-center text-lg" aria-hidden>{t.icon}</div>
        <div className="flex-1">
          <div className={`text-2xl font-semibold ${t.text}`}>{count}</div>
          <div className="text-sm font-medium text-gray-700 mt-1">{title}</div>
        </div>
      </div>
    </button>
  );
}
