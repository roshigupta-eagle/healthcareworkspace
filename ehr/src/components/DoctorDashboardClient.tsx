"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useThemeLang } from './ThemeLangProvider';

type Props = {
  userId?: string;
};

function ProgressRing({ size = 72, stroke = 8, progress = 0, color = '#3b82f6' }: { size?: number; stroke?: number; progress: number; color?: string; }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (progress / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle r={radius} cx={0} cy={0} stroke="#e6eefc" strokeWidth={stroke} fill="transparent" />
        <circle
          r={radius}
          cx={0}
          cy={0}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset={0}
          fill="transparent"
          style={{ transition: 'stroke-dasharray 600ms ease' }}
          filter="url(#glow)"
        />
        <text x={0} y={4} textAnchor="middle" fontSize={14} fill="#0f172a" style={{ fontWeight: 700 }}>{Math.round(progress)}%</text>
      </g>
    </svg>
  );
}

export default function DoctorDashboardClient({ userId }: Props) {
  const router = useRouter();
  const { t } = useThemeLang();
  const [metrics, setMetrics] = useState({ completed: 12, active: 3, pending: 5, total: 20 });

  useEffect(() => {
    // Simulate real-time updates — replace with SSE / WebSocket for real data
    const id = setInterval(() => {
      setMetrics((m) => {
        // small random fluctuation for demo
        const delta = Math.floor(Math.random() * 3) - 1;
        const completed = Math.max(0, Math.min(m.total, m.completed + (Math.random() > 0.7 ? 1 : 0)));
        const pending = Math.max(0, m.total - completed - m.active);
        const active = Math.max(0, Math.min(m.total - completed, m.active + delta));
        return { ...m, completed, active, pending };
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const completionRate = metrics.total > 0 ? (metrics.completed / metrics.total) * 100 : 0;

  const cardBase = 'rounded-xl p-4 shadow-xl transition-transform transform hover:-translate-y-1';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className={`${cardBase} bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200`} role="group" aria-label={t('completedAppointments')}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-700">{t('completedAppointments')}</p>
            <p className="mt-2 text-2xl font-bold text-emerald-900">{metrics.completed}</p>
            <p className="mt-1 text-xs text-emerald-600">{t('viewList')}</p>
          </div>
          <div className="w-20 h-20 flex items-center justify-center">
            <ProgressRing progress={Math.min(100, metrics.completed / Math.max(1, metrics.total) * 100)} color="#16a34a" />
          </div>
        </div>
      </div>

      <div className={`${cardBase} bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-200`} role="group" aria-label={t('activePatients')}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-sky-700">{t('activePatients')}</p>
            <p className="mt-2 text-2xl font-bold text-sky-900">{metrics.active}</p>
            <p className="mt-1 text-xs text-sky-600">{t('patientsInClinic')}</p>
          </div>
          <div className="w-20 h-20 flex items-center justify-center">
            <ProgressRing progress={Math.min(100, (metrics.active / Math.max(1, metrics.total)) * 100)} color="#0ea5e9" />
          </div>
        </div>
      </div>

      <div className={`${cardBase} bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200`} role="group" aria-label={t('pendingPatients')}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-amber-700">{t('pendingPatients')}</p>
            <p className="mt-2 text-2xl font-bold text-amber-900">{metrics.pending}</p>
            <p className="mt-1 text-xs text-amber-600">{t('patientsToSee')}</p>
          </div>
          <div className="w-20 h-20 flex items-center justify-center">
            <ProgressRing progress={Math.min(100, (metrics.pending / Math.max(1, metrics.total)) * 100)} color="#f59e0b" />
          </div>
        </div>
      </div>

      <div className={`${cardBase} bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 flex items-center`} role="group" aria-label={t('completionRate')}>
        <div className="flex-1 p-2">
          <p className="text-xs font-semibold text-violet-700">{t('completionRate')}</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="w-28 h-28 flex items-center justify-center">
              <ProgressRing progress={Math.min(100, completionRate)} color="#7c3aed" />
            </div>
            <div>
              <p className="text-3xl font-bold text-violet-900">{Math.round(completionRate)}%</p>
              <p className="mt-1 text-sm text-violet-600">{metrics.completed} / {metrics.total} {t('scheduledToday')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
