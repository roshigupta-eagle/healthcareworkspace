"use client";
import React from 'react';
import type { Task } from '../../lib/clinicalTypes';

type Props = { tasks: Task[]; currentUserId: string };

function Card({ title, value, subtitle, color }: { title: string; value: string | number; subtitle?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
      <div>
        <div className="text-xs text-slate-500">{title}</div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color ?? 'bg-sky-100'}`}>
        <div className="text-white font-semibold">{title[0]}</div>
      </div>
    </div>
  );
}

export default function SummaryCards({ tasks, currentUserId }: Props) {
  const myTasks = tasks.filter((t) => t.assignedTo === currentUserId).length;
  const highPriority = tasks.filter((t) => t.priority === 'high' || t.priority === 'critical').length;
  const dueSoon = tasks.filter((t) => {
    if (!t.dueAt) return false;
    const d = new Date(t.dueAt);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff >= 0;
  }).length;
  const completed = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <Card title="My Tasks" value={myTasks} subtitle="Due today" color="bg-sky-600" />
      <Card title="High Priority" value={highPriority} subtitle="Needs attention" color="bg-rose-500" />
      <Card title="Due Soon" value={dueSoon} subtitle="Next 7 days" color="bg-amber-400" />
      <Card title="Completed" value={completed} subtitle="This week" color="bg-emerald-400" />
    </div>
  );
}
