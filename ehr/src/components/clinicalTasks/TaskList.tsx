"use client";

import React from 'react';
import type { Task, TabKey } from '../../lib/clinicalTypes';
import { smallDateLabel } from '@/lib/formatDate';

type Group = { key: string; items: Task[] };

type Props = {
  tasks: Task[];
  tab: TabKey;
  view?: 'focus' | 'list' | string;
  search?: string;
  onTabChange?: (tab: TabKey) => void;
  onSelect?: (taskId: string) => void;
  selectedId?: string;
  onToggleComplete?: (taskId: string) => void;
};

function isOverdue(t: Task) {
  return !!t.dueAt && new Date(t.dueAt) < new Date() && t.status !== 'completed';
}

function isCritical(t: Task) {
  return t.priority === 'critical' || (t.clinicalSeverity && t.clinicalSeverity.toLowerCase().includes('critical'));
}

function bucketForList(t: Task) {
  if (!t.dueAt) return 'Later';
  const d = new Date(t.dueAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.floor((d.setHours(0, 0, 0, 0) - startOfToday) / (24 * 3600 * 1000));
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return 'This Week';
  if (diffDays <= 31) return 'This Month';
  return 'Later';
}

function bucketForFocus(t: Task) {
  if (isCritical(t) || isOverdue(t)) return 'Immediate attention';
  if (t.dueAt) {
    const d = new Date(t.dueAt);
    const now = new Date();
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()) return 'Today';
    const diff = Math.ceil((d.getTime() - now.getTime()) / (24 * 3600 * 1000));
    if (diff <= 2) return 'Next';
    return 'Remaining';
  }
  return 'Remaining';
}

export default function TaskList({
  tasks,
  tab,
  view = 'list',
  search,
  onTabChange,
  onSelect,
  selectedId,
  onToggleComplete,
}: Props) {
  const groups: Group[] = React.useMemo(() => {
    if (view === 'focus') {
      const names = ['Immediate attention', 'Today', 'Next', 'Remaining'];
      return names.map((name) => ({ key: name, items: tasks.filter((t) => bucketForFocus(t) === name) }));
    }
    // default list view grouping matching design: Today, Tomorrow, This Week, This Month, Later
    const names = ['Today', 'Tomorrow', 'This Week', 'This Month', 'Later'];
    return names.map((name) => ({ key: name, items: tasks.filter((t) => bucketForList(t) === name) }));
  }, [tasks, view]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-[70vh] overflow-auto">
      <div className="mb-3 flex items-center justify-between">
        <div role="tablist" aria-label="Task filters" className="flex items-center gap-3">
          <button role="tab" aria-selected={tab === 'all'} onClick={() => onTabChange && onTabChange('all')} className={`px-3 py-1 text-sm rounded ${tab === 'all' ? 'border-b-2 border-sky-600 text-sky-700' : 'text-slate-600'}`}>All Tasks</button>
          <button role="tab" aria-selected={tab === 'my'} onClick={() => onTabChange && onTabChange('my')} className={`px-3 py-1 text-sm rounded ${tab === 'my' ? 'border-b-2 border-sky-600 text-sky-700' : 'text-slate-600'}`}>My Tasks</button>
          <button role="tab" aria-selected={tab === 'delegated'} onClick={() => onTabChange && onTabChange('delegated')} className={`px-3 py-1 text-sm rounded ${tab === 'delegated' ? 'border-b-2 border-sky-600 text-sky-700' : 'text-slate-600'}`}>Delegated</button>
          <button role="tab" aria-selected={tab === 'completed'} onClick={() => onTabChange && onTabChange('completed')} className={`px-3 py-1 text-sm rounded ${tab === 'completed' ? 'border-b-2 border-sky-600 text-sky-700' : 'text-slate-600'}`}>Completed</button>
        </div>
        <div className="text-xs text-slate-400">{tasks.length} tasks</div>
      </div>

      {groups.map((g) => (
        <div key={g.key} className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-slate-500">{g.key}</div>
                  <div className="text-xs text-slate-400">
                    {g.items.length > 0 ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs">{g.items.length}</span>
                      </span>
                    ) : null}
                  </div>
          </div>
          <div className="space-y-2">
            {g.items.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect && onSelect(t.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelect && onSelect(t.id);
                  if (e.key === 'ArrowDown') {
                    const rows = Array.from(document.querySelectorAll('[data-task-row]')) as HTMLElement[];
                    const currentIndex = rows.findIndex((r) => r === (e.currentTarget as HTMLElement));
                    const next = rows[(currentIndex + 1) % rows.length];
                    next?.focus();
                  }
                  if (e.key === 'ArrowUp') {
                    const rows = Array.from(document.querySelectorAll('[data-task-row]')) as HTMLElement[];
                    const currentIndex = rows.findIndex((r) => r === (e.currentTarget as HTMLElement));
                    const prev = rows[(currentIndex - 1 + rows.length) % rows.length];
                    prev?.focus();
                  }
                }}
                data-task-row
                tabIndex={0}
                className={`w-full text-left p-3 rounded-md flex items-center justify-between hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-200 ${
                  selectedId === t.id ? 'bg-sky-50 ring-1 ring-sky-100 border-l-4 border-sky-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    aria-label={`Complete ${t.title}`}
                    type="checkbox"
                    checked={t.status === 'completed'}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleComplete && onToggleComplete(t.id);
                    }}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900">{t.title}</div>
                    <div className="text-xs text-slate-500">{t.patient ? `${t.patient.givenName} ${t.patient.familyName}` : t.patientId} · {t.patient?.dob ? `${Math.max(0, new Date().getFullYear() - new Date(t.patient.dob).getFullYear())}yo` : ''} · {smallDateLabel(t.dueAt)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`text-xs px-2 py-1 rounded-full ${t.priority === 'critical' ? 'bg-rose-50 text-rose-700' : t.priority === 'high' ? 'bg-rose-100 text-rose-700' : t.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{t.priority}</div>
                  <div className="text-xs text-slate-400">{smallDateLabel(t.dueAt)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="mt-3 text-sm">
        <a href="#" className="text-sky-600">View all tasks →</a>
      </div>
    </div>
  );
}
