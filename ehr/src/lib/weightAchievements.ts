/**
 * Weight Trend → Achievements: authoritative, pure progress/status computation.
 *
 * CRITICAL correctness rules encoded here:
 *  - Entered-in-error measurements are excluded (never count toward progress).
 *  - All weight comparisons are unit-normalized to kg via weightMath.toKg.
 *  - A threshold that has been fully met (current >= target) is ALWAYS "completed" —
 *    there is no such thing as "25 / 25" while still "in-progress".
 *  - Goal-based achievements never assume weight loss is the desired direction; they
 *    delegate to weightMath.computeGoalProgress, which respects the documented goal type.
 *  - This is a pure function of canonical data (measurements + active goal) — calling it
 *    repeatedly (page refresh, retries) always yields the same result, so "unlocking" is
 *    naturally idempotent: there is no separate mutable "awarded" ledger to duplicate.
 */
import { canonicalMeasurements, computeGoalProgress, type GoalLike } from './weightMath';

export type AchievementCategory = 'tracking' | 'consistency' | 'goal' | 'long-term';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type AchievementStatus = 'not-started' | 'in-progress' | 'completed';

export interface AchievementProgress {
  current: number;
  target: number;
  unit?: string;
}

export interface WeightAchievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  points: number;
  status: AchievementStatus;
  progress?: AchievementProgress;
  completedAt?: string | null;
  ruleDescription: string;
  /** True when this achievement cannot progress without an active documented goal. */
  requiresGoal?: boolean;
}

export interface AchievementsSummary {
  completed: number;
  total: number;
  /** Points actually earned from completed achievements only — never the sum of all possible points. */
  points: number;
  completionPercent: number;
}

export interface AchievementsModel {
  list: WeightAchievement[];
  summary: AchievementsSummary;
  closestToUnlock: WeightAchievement | null;
}

export interface AchievementMeasurement {
  id: string;
  value: number;
  unit?: string;
  occurredAt: string;
  enteredInError?: boolean;
}

function longestConsecutiveDayStreak(dateKeys: string[]): number {
  const days = Array.from(new Set(dateKeys)).map((d) => Date.parse(d)).sort((a, b) => a - b);
  let best = 0;
  let cur = 0;
  let prev: number | null = null;
  for (const d of days) {
    if (prev == null) { cur = 1; } else {
      const diffDays = Math.round((d - prev) / (1000 * 60 * 60 * 24));
      cur = diffDays === 1 ? cur + 1 : 1;
    }
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}

/** Resolves a goal-based achievement's completion signal even for non-numeric (maintenance/range) goals. */
function goalCompletionSignal(goal: GoalLike | null | undefined, currentWeightKg: number | null) {
  if (!goal) return { percent: null as number | null, achieved: false };
  const progress = computeGoalProgress(goal, currentWeightKg);
  if (progress.percent != null) return { percent: progress.percent, achieved: progress.percent >= 100 };
  const achieved = /^(Maintaining|Within)/.test(progress.label);
  return { percent: achieved ? 100 : null, achieved };
}

export function computeAchievements(rawMeasurements: AchievementMeasurement[], goal: GoalLike | null | undefined): AchievementsModel {
  const items = canonicalMeasurements(rawMeasurements);

  const first = items[0];
  const last = items[items.length - 1];
  const uniqueDateKeys = items.map((m) => new Date(m.occurredAt).toISOString().slice(0, 10));
  const streak = longestConsecutiveDayStreak(uniqueDateKeys);
  const daysSpan = items.length >= 2 ? Math.round((Date.parse(last.occurredAt) - Date.parse(first.occurredAt)) / (1000 * 60 * 60 * 24)) : 0;
  const { percent: goalPercent, achieved: goalAchieved } = goalCompletionSignal(goal, last?.weightKg ?? null);
  const TURNING_POINT_THRESHOLD = 20;

  const list: WeightAchievement[] = [
    {
      id: 'first',
      title: 'First Step',
      description: 'Record your first valid weight measurement.',
      category: 'tracking',
      rarity: 'common',
      points: 25,
      status: items.length >= 1 ? 'completed' : 'not-started',
      completedAt: items.length >= 1 ? first.occurredAt : null,
      ruleDescription: 'Completes once at least one valid weight measurement has been recorded. Entered-in-error measurements are excluded.',
    },
    {
      id: 'consistent',
      title: 'Getting Consistent',
      description: 'Log 7 valid weight measurements.',
      category: 'consistency',
      rarity: 'common',
      points: 50,
      progress: { current: Math.min(items.length, 7), target: 7 },
      status: items.length >= 7 ? 'completed' : items.length > 0 ? 'in-progress' : 'not-started',
      completedAt: items.length >= 7 ? items[6].occurredAt : null,
      ruleDescription: 'Counts valid documented weight measurements across all time. Entered-in-error measurements are excluded.',
    },
    {
      id: 'dedicated',
      title: 'Dedicated Tracker',
      description: 'Log 25 valid weight measurements.',
      category: 'consistency',
      rarity: 'rare',
      points: 100,
      progress: { current: Math.min(items.length, 25), target: 25 },
      status: items.length >= 25 ? 'completed' : items.length > 0 ? 'in-progress' : 'not-started',
      completedAt: items.length >= 25 ? items[24].occurredAt : null,
      ruleDescription: 'Counts valid documented weight measurements across all time. Entered-in-error measurements are excluded.',
    },
    {
      id: 'onestreak',
      title: 'One Week Streak',
      description: 'Log weight 7 days in a row.',
      category: 'consistency',
      rarity: 'common',
      points: 25,
      progress: { current: Math.min(streak, 7), target: 7 },
      status: streak >= 7 ? 'completed' : streak > 0 ? 'in-progress' : 'not-started',
      completedAt: streak >= 7 ? last?.occurredAt ?? null : null,
      ruleDescription: 'Measures the longest run of consecutive calendar days with at least one valid measurement.',
    },
    {
      id: 'iron',
      title: 'Iron Discipline',
      description: 'Log weight 30 days in a row.',
      category: 'long-term',
      rarity: 'epic',
      points: 250,
      progress: { current: Math.min(streak, 30), target: 30 },
      status: streak >= 30 ? 'completed' : streak > 0 ? 'in-progress' : 'not-started',
      completedAt: streak >= 30 ? last?.occurredAt ?? null : null,
      ruleDescription: 'Measures the longest run of consecutive calendar days with at least one valid measurement.',
    },
    {
      id: 'turning',
      title: 'Turning the Corner',
      description: "Show sustained progress toward your documented active weight goal.",
      category: 'goal',
      rarity: 'rare',
      points: 75,
      progress: goal && goalPercent != null ? { current: Math.min(goalPercent, TURNING_POINT_THRESHOLD), target: TURNING_POINT_THRESHOLD, unit: '%' } : undefined,
      status: !goal ? 'not-started' : goalPercent != null && goalPercent >= TURNING_POINT_THRESHOLD ? 'completed' : goalPercent != null && goalPercent > 0 ? 'in-progress' : 'not-started',
      completedAt: goal && goalPercent != null && goalPercent >= TURNING_POINT_THRESHOLD ? last?.occurredAt ?? null : null,
      ruleDescription: "Evaluates sustained progress against your active documented goal. Direction (loss, gain, or maintenance) is respected exactly as recorded — this never assumes weight loss is the goal.",
      requiresGoal: true,
    },
    {
      id: 'goal',
      title: 'Goal Achiever',
      description: 'Reach your documented active weight goal.',
      category: 'goal',
      rarity: 'legendary',
      points: 500,
      progress: goal && goalPercent != null ? { current: Math.min(goalPercent, 100), target: 100, unit: '%' } : undefined,
      status: !goal ? 'not-started' : goalAchieved ? 'completed' : 'in-progress',
      completedAt: goal && goalAchieved ? last?.occurredAt ?? null : null,
      ruleDescription: 'Evaluates progress against your active documented goal (target weight, gain, loss, maintenance, or range — exactly as recorded). Does not assume weight loss is the objective.',
      requiresGoal: true,
    },
    {
      id: 'longhaul',
      title: 'Long Haul',
      description: 'Track weight across 90+ days.',
      category: 'long-term',
      rarity: 'rare',
      points: 150,
      progress: { current: Math.min(daysSpan, 90), target: 90 },
      status: daysSpan >= 90 ? 'completed' : daysSpan > 0 ? 'in-progress' : 'not-started',
      completedAt: daysSpan >= 90 ? last?.occurredAt ?? null : null,
      ruleDescription: 'Measures the calendar-day span between your earliest and most recent valid weight measurement.',
    },
  ];

  const completedList = list.filter((a) => a.status === 'completed');
  const pointsEarned = completedList.reduce((s, a) => s + a.points, 0);
  const total = list.length;
  const completionPercent = total ? (completedList.length / total) * 100 : 0;

  const eligibleIncomplete = list.filter((a) => a.status !== 'completed' && !(a.requiresGoal && !goal));
  const closestToUnlock =
    eligibleIncomplete
      .map((a) => ({ a, ratio: a.progress ? a.progress.current / (a.progress.target || 1) : 0 }))
      .sort((x, y) => y.ratio - x.ratio)[0]?.a || null;

  return {
    list,
    summary: { completed: completedList.length, total, points: pointsEarned, completionPercent },
    closestToUnlock,
  };
}
