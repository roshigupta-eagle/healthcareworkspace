"use client";

import React from 'react';
import type { WeightAchievement } from '@/lib/weightAchievements';

const RARITY_STYLES: Record<string, { chip: string; accent: string }> = {
  common: { chip: 'bg-blue-50 text-blue-700 border-blue-200', accent: '#3B82F6' },
  rare: { chip: 'bg-violet-50 text-violet-700 border-violet-200', accent: '#7C3AED' },
  epic: { chip: 'bg-pink-50 text-pink-700 border-pink-200', accent: '#DB2777' },
  legendary: { chip: 'bg-amber-50 text-amber-800 border-amber-200', accent: '#D97706' },
};

export default function AchievementDetailsDrawer({
  achievement,
  onClose,
  onSetGoal,
  onViewMeasurements,
}: {
  achievement: WeightAchievement;
  onClose: () => void;
  onSetGoal?: () => void;
  onViewMeasurements?: () => void;
}) {
  const rarity = RARITY_STYLES[achievement.rarity] || RARITY_STYLES.common;
  const pct = achievement.progress ? Math.min(100, Math.round((achievement.progress.current / (achievement.progress.target || 1)) * 100)) : achievement.status === 'completed' ? 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="weight-trend-drawer flex h-full flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100/80 text-violet-700 ring-1 ring-violet-600/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{achievement.title}</h2>
              <span className={`inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${rarity.chip}`}>{achievement.rarity}</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          <p className="text-slate-700">{achievement.description}</p>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Progress</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {achievement.status === 'completed' ? '✓ Completed' : achievement.progress ? `${achievement.progress.current} / ${achievement.progress.target}${achievement.progress.unit === '%' ? '%' : ''}` : achievement.status === 'not-started' ? 'Not Started' : ''}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: achievement.status === 'completed' ? '#10B981' : rarity.accent }} />
            </div>
          </div>

          {achievement.status === 'completed' && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Completed</div>
                <div className="font-bold text-slate-900 mt-0.5">{achievement.completedAt ? new Date(achievement.completedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '—'}</div>
              </div>
              <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          )}

          {achievement.requiresGoal && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Documented Goal</div>
              <p className="text-slate-600 mt-1">{achievement.status === 'not-started' ? 'No active weight goal is currently documented.' : 'Uses your active documented weight goal.'}</p>
              {achievement.status === 'not-started' && onSetGoal && (
                <button onClick={onSetGoal} className="mt-2 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-semibold hover:bg-violet-100">Set Goal</button>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">How Progress Is Calculated</div>
            <p className="text-slate-600 mt-1 leading-relaxed">{achievement.ruleDescription}</p>
          </div>

          {onViewMeasurements && (
            <button type="button" onClick={onViewMeasurements} className="w-full rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-left text-xs font-semibold text-violet-800 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
              View qualifying measurements in Log
            </button>
          )}

          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reward</span>
            <span className="font-bold text-slate-900">+{achievement.points} points</span>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-end">
          <button onClick={onClose} className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-900">Close</button>
        </div>
      </div>
    </div>
  );
}
