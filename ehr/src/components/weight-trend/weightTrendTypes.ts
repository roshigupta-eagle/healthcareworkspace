import type { Patient } from '@/app/dashboard/records/mockPatients';
import type { GoalLike, WeightSummary } from '@/lib/weightMath';
import type { LogMeasurement } from '@/lib/weightLog';

export type WeightTrendMeasurement = LogMeasurement & {
  weightKg?: number;
  sourceResource?: { resourceType?: string; id?: string; display?: string };
  history?: Array<Record<string, unknown>>;
  version?: number;
};

export type WeightTrendGoal = GoalLike & {
  id?: string;
  patientId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  replacedBy?: string;
  history?: Array<Record<string, unknown>>;
  version?: number;
};

export type WeightTrendEvent = {
  id: string;
  patientId?: string;
  date: string;
  type?: string;
  category?: string;
  title: string;
  actor?: string;
  details?: string;
  icon?: string;
  recordHref?: string;
};

export type WeightTrendStats = WeightSummary<WeightTrendMeasurement> & { periodCount: number };
export type WeightTrendPatient = Patient;
