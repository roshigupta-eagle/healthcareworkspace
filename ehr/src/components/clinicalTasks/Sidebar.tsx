"use client";
import React, { useState } from 'react';
import type { FC } from 'react';

type Props = {
  active?: string;
  taskCount?: number;
  inBasketCount?: number;
  onCollapse?: (collapsed: boolean) => void;
};

// Sidebar navigation removed per request. Intentionally blank.

const NavItem: FC<{ label: string; active?: boolean; badge?: number }> = ({ label, active, badge }) => {
  return (
    <li>
      <button
        className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
          active ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-slate-700'
        }`}
        aria-current={active ? 'page' : undefined}
      >
        <span className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-sm bg-slate-200 inline-block" aria-hidden />
          {label}
        </span>
        {badge ? <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{badge}</span> : null}
      </button>
    </li>
  );
};

export default function Sidebar({ active = 'Clinical Tasks', taskCount = 0, inBasketCount = 0, onCollapse }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  function toggle() {
    const n = !collapsed;
    setCollapsed(n);
    if (onCollapse) onCollapse(n);
  }

  return (
    <aside className={`flex-shrink-0 bg-white border-r ${collapsed ? 'w-20' : 'w-64'} p-4 h-screen`}>
      {/* Sidebar content intentionally removed per user request */}
    </aside>
  );
}
