export const FHIR_ENCOUNTER_STATUSES = [
  'planned',
  'arrived',
  'triaged',
  'in-progress',
  'onleave',
  'finished',
  'cancelled',
  'entered-in-error',
  'unknown',
] as const;

export type EncounterFhirStatus = (typeof FHIR_ENCOUNTER_STATUSES)[number];

export type EncounterOperationalState = {
  label: string;
  category:
    | 'planned'
    | 'waiting'
    | 'triage'
    | 'active'
    | 'procedure'
    | 'results'
    | 'disposition'
    | 'completed'
    | 'exception'
    | 'unknown';
};

export type EncounterTransition = {
  event: string;
  toState: string;
  allowedRoles: string[];
};

const OPERATIONAL_STATES: Record<string, EncounterOperationalState> = {
  REFERRAL_RECEIVED: { label: 'Referral review', category: 'planned' },
  SCHEDULING: { label: 'Scheduling', category: 'planned' },
  APPOINTMENT_SCHEDULED: { label: 'Scheduled', category: 'planned' },
  APPOINTMENT_CONFIRMED: { label: 'Scheduled', category: 'planned' },
  PRE_VISIT_FORMS: { label: 'Pre-visit intake', category: 'planned' },
  PATIENT_ARRIVED: { label: 'Arrived', category: 'waiting' },
  CHECKING_IN: { label: 'Checking in', category: 'waiting' },
  CHECKED_IN: { label: 'Waiting', category: 'waiting' },
  IN_WAITING_ROOM: { label: 'Waiting', category: 'waiting' },
  NURSING_ASSESSMENT: { label: 'Triage in progress', category: 'triage' },
  IN_EXAM_ROOM: { label: 'In room', category: 'triage' },
  PHYSICIAN_PENDING: { label: 'Awaiting clinician', category: 'active' },
  PHYSICIAN_WITH_PATIENT: { label: 'With clinician', category: 'active' },
  ORDERS_PLACED: { label: 'Clinical work in progress', category: 'active' },
  PROCEDURE_QUEUED: { label: 'Procedure workflow', category: 'procedure' },
  IN_PROCEDURE: { label: 'In procedure', category: 'procedure' },
  PROCEDURE_COMPLETE: { label: 'Procedure complete', category: 'procedure' },
  RESULTS_PENDING: { label: 'Awaiting results', category: 'results' },
  RESULTS_READY: { label: 'Results ready', category: 'results' },
  RESULTS_REVIEW: { label: 'Results under review', category: 'results' },
  CONSULTATION_COMPLETE: { label: 'Awaiting disposition', category: 'disposition' },
  CHECKING_OUT: { label: 'Checking out', category: 'disposition' },
  CHECKOUT_COMPLETE: { label: 'Checkout complete', category: 'disposition' },
  BILLING_PENDING: { label: 'Billing workflow', category: 'disposition' },
  FOLLOW_UP_SCHEDULED: { label: 'Follow-up scheduled', category: 'disposition' },
  REFERRAL_SENT: { label: 'Referral sent', category: 'disposition' },
  DISCHARGED: { label: 'Completed', category: 'completed' },
  ON_HOLD: { label: 'On leave', category: 'exception' },
  CANCELLED: { label: 'Cancelled', category: 'exception' },
  NO_SHOW: { label: 'No show', category: 'exception' },
};

const TRANSITION_LABELS: Record<string, string> = {
  SCHEDULING_STARTED: 'Start scheduling',
  APPOINTMENT_SCHEDULED: 'Record appointment',
  APPOINTMENT_CONFIRMED: 'Confirm appointment',
  PATIENT_ARRIVED: 'Record arrival',
  CHECK_IN_STARTED: 'Start check-in',
  CHECK_IN_COMPLETED: 'Complete check-in',
  MOVED_TO_WAITING_ROOM: 'Move to waiting room',
  NURSING_STARTED: 'Start triage',
  VITALS_TAKEN: 'Record vitals',
  PATIENT_ROOMED: 'Assign room',
  PHYSICIAN_ASSIGNED: 'Assign practitioner',
  PHYSICIAN_ENTERED_ROOM: 'Start encounter',
  ORDER_PLACED: 'Record order workflow',
  PROCEDURE_QUEUED: 'Queue procedure',
  PROCEDURE_STARTED: 'Start procedure',
  PROCEDURE_COMPLETED: 'Record procedure completion',
  RESULTS_READY: 'Record results ready',
  RESULTS_REVIEW_STARTED: 'Start result review',
  CONSULTATION_COMPLETED: 'Complete consultation',
  CHECKOUT_STARTED: 'Start checkout',
  CHECKOUT_COMPLETED: 'Complete checkout',
  CLAIM_SUBMITTED: 'Record billing submission',
  FOLLOW_UP_SCHEDULED: 'Record follow-up',
  REFERRAL_SENT: 'Record referral sent',
  DISCHARGED: 'Finish encounter',
  CANCELLED: 'Cancel encounter',
  NO_SHOW: 'Record no show',
  PUT_ON_HOLD: 'Place on leave',
  RESUMED_FROM_HOLD: 'Resume encounter',
};

const ROOM_TRANSITIONS = new Set([
  'MOVED_TO_WAITING_ROOM',
  'PATIENT_ROOMED',
  'PROCEDURE_STARTED',
]);

export function isEncounterFhirStatus(value: unknown): value is EncounterFhirStatus {
  return typeof value === 'string' && FHIR_ENCOUNTER_STATUSES.includes(value as EncounterFhirStatus);
}

export function operationalStateFor(workflowState?: string | null): EncounterOperationalState {
  return workflowState && OPERATIONAL_STATES[workflowState]
    ? OPERATIONAL_STATES[workflowState]
    : { label: 'Operational state unavailable', category: 'unknown' };
}

export function encounterTransitionLabel(event: string): string {
  return TRANSITION_LABELS[event] || event.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function transitionRequiresRoom(event: string): boolean {
  return ROOM_TRANSITIONS.has(event);
}

export function transitionRequiresPractitioner(event: string): boolean {
  return event === 'PHYSICIAN_ASSIGNED';
}

export function isTerminalEncounterStatus(status?: string | null): boolean {
  return ['finished', 'cancelled', 'entered-in-error'].includes(status || '');
}

export function waitDurationMinutes(arrivedAt?: string | null, now = new Date()): number | null {
  if (!arrivedAt) return null;
  const arrived = Date.parse(arrivedAt);
  if (!Number.isFinite(arrived)) return null;
  return Math.max(0, Math.floor((now.getTime() - arrived) / 60_000));
}

export function configuredWaitThresholdMinutes(value = process.env.ENCOUNTER_WAIT_THRESHOLD_MINUTES): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 480 ? Math.floor(parsed) : 30;
}

export function cardiologyRoleFor(actorRole: string): string | null {
  const role = actorRole.toUpperCase();
  if (role === 'NURSE') return 'NURSE';
  if (['DOCTOR', 'CLINICIAN', 'PRACTITIONER'].includes(role)) return 'CARDIOLOGIST';
  if (role === 'RECEPTIONIST') return 'RECEPTIONIST';
  if (role === 'LAB_TECH') return 'TECHNICIAN';
  return null;
}