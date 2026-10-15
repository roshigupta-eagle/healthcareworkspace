import type { Referral, ReferralBusinessState, ReferralEvent } from '@/lib/referralStore';

export type ReferralTransitionAction =
  | 'submit'
  | 'review'
  | 'route'
  | 'send'
  | 'confirm-received'
  | 'request-information'
  | 'resume-review'
  | 'accept'
  | 'waitlist'
  | 'decline'
  | 'schedule'
  | 'start'
  | 'complete-consult'
  | 'receive-outcome'
  | 'close'
  | 'cancel';

export type ReferralActor = {
  id: string;
  name: string;
  role: string;
};

export type ReferralTransition = {
  readonly action: ReferralTransitionAction;
  readonly nextState: ReferralBusinessState;
  readonly label: string;
};

const TRANSITIONS: Readonly<Record<ReferralBusinessState, readonly ReferralTransition[]>> = {
  Draft: [{ action: 'submit', nextState: 'Submitted', label: 'Submit referral' }, { action: 'cancel', nextState: 'Cancelled', label: 'Cancel referral' }],
  Submitted: [{ action: 'review', nextState: 'UnderReview', label: 'Review referral' }, { action: 'route', nextState: 'Routing', label: 'Route referral' }, { action: 'cancel', nextState: 'Cancelled', label: 'Cancel referral' }],
  Routing: [{ action: 'send', nextState: 'Delivered', label: 'Send referral' }, { action: 'request-information', nextState: 'NeedsInformation', label: 'Request information' }, { action: 'cancel', nextState: 'Cancelled', label: 'Cancel referral' }],
  Delivered: [{ action: 'confirm-received', nextState: 'Received', label: 'Record receipt' }, { action: 'cancel', nextState: 'Cancelled', label: 'Cancel referral' }],
  Received: [{ action: 'review', nextState: 'UnderReview', label: 'Review referral' }, { action: 'request-information', nextState: 'NeedsInformation', label: 'Request information' }, { action: 'cancel', nextState: 'Cancelled', label: 'Cancel referral' }],
  NeedsInformation: [{ action: 'resume-review', nextState: 'UnderReview', label: 'Resume review' }, { action: 'cancel', nextState: 'Cancelled', label: 'Cancel referral' }],
  UnderReview: [{ action: 'accept', nextState: 'Accepted', label: 'Record acceptance' }, { action: 'waitlist', nextState: 'Waitlisted', label: 'Record waitlist' }, { action: 'decline', nextState: 'Declined', label: 'Record decline' }, { action: 'request-information', nextState: 'NeedsInformation', label: 'Request information' }, { action: 'schedule', nextState: 'Scheduling', label: 'Begin scheduling' }, { action: 'cancel', nextState: 'Cancelled', label: 'Cancel referral' }],
  Accepted: [{ action: 'schedule', nextState: 'Scheduling', label: 'Begin scheduling' }, { action: 'cancel', nextState: 'Cancelled', label: 'Cancel referral' }],
  Redirected: [{ action: 'route', nextState: 'Routing', label: 'Route referral' }, { action: 'cancel', nextState: 'Cancelled', label: 'Cancel referral' }],
  Declined: [],
  Waitlisted: [{ action: 'schedule', nextState: 'Scheduling', label: 'Begin scheduling' }, { action: 'cancel', nextState: 'Cancelled', label: 'Cancel referral' }],
  Scheduling: [{ action: 'schedule', nextState: 'Scheduled', label: 'Record scheduled appointment' }, { action: 'cancel', nextState: 'Cancelled', label: 'Cancel referral' }],
  Scheduled: [{ action: 'start', nextState: 'InProgress', label: 'Start consultation' }, { action: 'cancel', nextState: 'Cancelled', label: 'Cancel referral' }],
  InProgress: [{ action: 'complete-consult', nextState: 'ConsultCompleted', label: 'Record consultation complete' }],
  ConsultCompleted: [{ action: 'receive-outcome', nextState: 'OutcomeReceived', label: 'Record outcome received' }],
  OutcomeReceived: [{ action: 'close', nextState: 'Closed', label: 'Close referral' }],
  Closed: [],
  Cancelled: [],
};

const AWAITING_SPECIALIST_STATES = new Set<ReferralBusinessState>(['Delivered', 'Received', 'UnderReview', 'Accepted', 'Waitlisted']);
const ACTION_REQUIRED_STATES = new Set<ReferralBusinessState>(['Draft', 'Submitted', 'Routing', 'NeedsInformation', 'UnderReview', 'Scheduling']);
const TERMINAL_STATES = new Set<ReferralBusinessState>(['Declined', 'Closed', 'Cancelled']);

export type ReferralLifecycleStageStatus = 'current' | 'recorded' | 'pending';

export type ReferralLifecycleStage = {
  readonly id: string;
  readonly label: string;
  readonly states: readonly ReferralBusinessState[];
  readonly status: ReferralLifecycleStageStatus;
  readonly recordedAt?: string;
};

type ReferralLifecycleDefinition = Pick<
  ReferralLifecycleStage,
  'id' | 'label' | 'states'
>;

const LIFECYCLE_STAGES: readonly ReferralLifecycleDefinition[] = [
  { id: 'request', label: 'Referral request', states: ['Draft', 'Submitted'] },
  { id: 'review', label: 'Clinical review', states: ['NeedsInformation', 'UnderReview'] },
  { id: 'routing', label: 'Destination routing', states: ['Routing', 'Redirected'] },
  { id: 'specialist', label: 'Specialist response', states: ['Delivered', 'Received', 'Accepted', 'Waitlisted', 'Declined'] },
  { id: 'scheduling', label: 'Appointment scheduling', states: ['Scheduling', 'Scheduled'] },
  { id: 'consultation', label: 'Consultation', states: ['InProgress', 'ConsultCompleted'] },
  { id: 'outcome', label: 'Outcome and closure', states: ['OutcomeReceived', 'Closed'] },
  { id: 'cancelled', label: 'Referral cancelled', states: ['Cancelled'] },
];

function transitionTarget(event: ReferralEvent): ReferralBusinessState | undefined {
  if (!event.detail || typeof event.detail !== 'object') return undefined;
  const target = (event.detail as { to?: unknown }).to;
  return typeof target === 'string' && target in TRANSITIONS
    ? target as ReferralBusinessState
    : undefined;
}

export function referralLifecycleTimeline(
  referral: Pick<Referral, 'businessState' | 'events' | 'authoredOn' | 'createdAt'>,
): ReferralLifecycleStage[] {
  return LIFECYCLE_STAGES.map((stage) => {
    const isCurrent = stage.states.includes(referral.businessState);
    const matchingEvent = [...(referral.events || [])]
      .reverse()
      .find((event) => {
        const target = transitionTarget(event);
        return target ? stage.states.includes(target) : false;
      });
    const recordedAt = matchingEvent?.ts || (
      stage.id === 'request' ? referral.authoredOn || referral.createdAt : undefined
    );
    return {
      ...stage,
      status: isCurrent ? 'current' : recordedAt ? 'recorded' : 'pending',
      recordedAt,
    };
  });
}

export function availableReferralTransitions(state: ReferralBusinessState): readonly ReferralTransition[] {
  return TRANSITIONS[state] || [];
}

export function nextReferralTransition(state: ReferralBusinessState): ReferralTransition | null {
  return availableReferralTransitions(state)[0] || null;
}

export function isReferralTerminal(state: ReferralBusinessState): boolean {
  return TERMINAL_STATES.has(state);
}

export function referralNeedsAction(referral: Referral): boolean {
  return ACTION_REQUIRED_STATES.has(referral.businessState);
}

export function referralAwaitingSpecialist(referral: Referral): boolean {
  return AWAITING_SPECIALIST_STATES.has(referral.businessState);
}

export function referralPriorityRank(priority?: string): number {
  const normalized = (priority || 'routine').trim().toLowerCase();
  if (normalized === 'stat') return 0;
  if (normalized === 'urgent') return 1;
  if (normalized === 'high' || normalized === 'asap') return 2;
  return 3;
}

export function referralServiceRequestStatus(state: ReferralBusinessState): 'draft' | 'active' | 'completed' | 'revoked' {
  if (state === 'Draft') return 'draft';
  if (state === 'Cancelled' || state === 'Declined') return 'revoked';
  if (state === 'ConsultCompleted' || state === 'OutcomeReceived' || state === 'Closed') return 'completed';
  return 'active';
}

export function referralServiceRequestPriority(priority?: string): 'routine' | 'urgent' | 'asap' | 'stat' {
  const normalized = (priority || 'routine').trim().toLowerCase();
  if (normalized === 'stat') return 'stat';
  if (normalized === 'urgent') return 'urgent';
  if (normalized === 'high' || normalized === 'asap') return 'asap';
  return 'routine';
}

export function buildReferralServiceRequest(referral: Referral) {
  if (!referral.patientId || referral.patientId === 'unknown') throw new Error('A referral requires a canonical patient identifier.');
  return {
    resourceType: 'ServiceRequest' as const,
    id: referral.id,
    identifier: [{ system: 'urn:roshi:referral', value: referral.id }],
    status: referralServiceRequestStatus(referral.businessState),
    intent: 'order' as const,
    priority: referralServiceRequestPriority(referral.priority),
    subject: { reference: `Patient/${referral.patientId}` },
    code: { text: referral.serviceCode || referral.subject || 'Referral' },
    authoredOn: referral.authoredOn || referral.createdAt,
    requester: referral.requester?.id ? { reference: `Practitioner/${referral.requester.id}`, display: referral.requester.name } : referral.requester?.name ? { display: referral.requester.name } : undefined,
    performer: referral.performer?.id ? [{ reference: `Practitioner/${referral.performer.id}`, display: referral.performer.name }] : referral.performer?.name ? [{ display: referral.performer.name }] : undefined,
    reasonCode: referral.subject ? [{ text: referral.subject }] : undefined,
    note: referral.note ? [{ text: referral.note }] : undefined,
  };
}

export function transitionReferral(referral: Referral, action: ReferralTransitionAction, actor: ReferralActor, now = new Date()): { businessState: ReferralBusinessState; status: 'draft' | 'active' | 'completed' | 'revoked'; event: ReferralEvent } {
  const transition = availableReferralTransitions(referral.businessState).find((candidate) => candidate.action === action);
  if (!transition) throw new Error('REFERRAL_INVALID_TRANSITION');
  if (action === 'cancel' && !['ADMIN', 'DEV'].includes(actor.role)) throw new Error('REFERRAL_TRANSITION_FORBIDDEN');
  const eventAt = now.toISOString();
  return {
    businessState: transition.nextState,
    status: referralServiceRequestStatus(transition.nextState),
    event: {
      id: `evt-${eventAt}-${action}`,
      ts: eventAt,
      actor: actor.name,
      type: action,
      detail: { from: referral.businessState, to: transition.nextState },
    },
  };
}
