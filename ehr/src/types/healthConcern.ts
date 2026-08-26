export type ConcernClinicalStatus = 'active' | 'monitoring' | 'resolved';
export type ConcernVerification = 'confirmed' | 'provisional' | 'unconfirmed' | 'entered-in-error';
export type ConcernCategory = 'Health concern' | 'Problem' | 'Symptom' | 'Diagnosis';

/**
 * Workflow attention is intentionally separate from clinical status: a concern can be
 * clinically "active" while carrying no attention flag, and attention must only be set
 * by an explicit clinical signal (never fabricated from staleness alone).
 */
export type ConcernAttentionStatus = 'none' | 'needs-review' | 'follow-up-due' | 'critical';

export interface ConcernActor {
  id: string;
  name: string;
  role?: string;
}

export interface ConcernHistoryEntry {
  id: string;
  action: string;
  actor: ConcernActor;
  timestamp: string;
  details?: string;
}

export interface HealthConcern {
  id: string;
  patientId: string;
  term: string;
  category: ConcernCategory;
  clinicalStatus: ConcernClinicalStatus;
  attentionStatus: ConcernAttentionStatus;
  verification: ConcernVerification;
  severity?: string | null;
  onset?: string | null;
  recordedDate: string;
  lastReviewedAt?: string | null;
  responsibleProvider: ConcernActor | null;
  encounterId?: string | null;
  description?: string | null;
  source: 'Condition' | 'Vitals' | 'Note' | 'Encounter' | 'Patient reported';
  recorder: ConcernActor;
  pinned: boolean;
  followUpTaskId?: string | null;
  relatedNoteIds: string[];
  enteredInError?: { reason: string; by: ConcernActor; at: string } | null;
  resolution?: { reason?: string | null; note?: string | null; resolvedBy: ConcernActor; resolvedAt: string } | null;
  history: ConcernHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export function isResolved(concern: Pick<HealthConcern, 'clinicalStatus'>): boolean {
  return concern.clinicalStatus === 'resolved';
}
