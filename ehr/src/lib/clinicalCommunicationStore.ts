import fs from 'fs/promises';
import path from 'path';
import { createHash, randomUUID } from 'crypto';
import { getPatientById } from '@/app/dashboard/records/mockPatients';
import { resolveDataPath } from '@/lib/dataPath';
import { CallProviderError, getCommunicationProviderStatus, getTelephonyCommunicationProvider, isCallProviderError, type CallProviderParticipant, type CallProviderResult } from '@/lib/communicationProviders';

export type CommunicationChannel = 'secure_message' | 'email' | 'call' | 'voicemail' | 'system';
export type ConversationState = 'open' | 'awaiting_response' | 'awaiting_action' | 'resolved' | 'closed' | 'archived';
export type MessageState = 'draft' | 'validating' | 'accepted' | 'routing' | 'active' | 'partially_delivered' | 'delivered' | 'resolved' | 'closed' | 'recalled' | 'superseded' | 'expired' | 'entered_in_error';
export type DeliveryState = 'queued' | 'routing' | 'sending' | 'accepted_by_endpoint' | 'delivered_to_system' | 'delivered_to_inbox' | 'read' | 'acknowledged' | 'actioned' | 'deferred' | 'retry_scheduled' | 'failed_transient' | 'failed_permanent' | 'bounced' | 'policy_blocked' | 'expired' | 'email_server_accepted';
export type CallState = 'created' | 'waiting_room' | 'dialing' | 'ringing' | 'connecting' | 'connected' | 'reconnecting' | 'on_hold' | 'transferring' | 'conferencing' | 'ending' | 'ended' | 'busy' | 'no_answer' | 'declined' | 'failed' | 'dropped' | 'cancelled';
export type VoicemailState = 'receiving' | 'processing' | 'available' | 'unread' | 'reviewed' | 'action_required' | 'resolved' | 'archived' | 'failed_processing';
export type ScanState = 'uploading' | 'uploaded' | 'scanning' | 'safe' | 'blocked' | 'failed' | 'available' | 'expired';
export type CommunicationPriority = 'routine' | 'urgent' | 'asap' | 'stat';

export type CommunicationActor = {
  id: string;
  name: string;
  role: string;
  organizationId?: string;
  organizationName?: string;
};

export type CommunicationParticipant = {
  id: string;
  type: 'patient' | 'related_person' | 'practitioner' | 'practitioner_role' | 'care_team' | 'organization' | 'healthcare_service' | 'endpoint' | 'inbox';
  name: string;
  role?: string;
  organizationName?: string;
  capabilities: string[];
};

export type CommunicationSourceContext = {
  resourceType: string;
  resourceId: string;
  resourceVersion?: string;
  display: string;
};

export type CommunicationAttachment = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  source?: CommunicationSourceContext;
  uploadedBy: CommunicationActor;
  createdAt: string;
  scanState: ScanState;
  scanner?: string;
  storageReference: string;
  patientId?: string;
};

export type PendingCommunicationAttachment = {
  attachment: CommunicationAttachment;
  issuedToActorId: string;
  issuedAt: string;
  expiresAt: string;
  consumedAt?: string;
  consumedByMessageId?: string;
};

export type CommunicationAcknowledgement = {
  id: string;
  actor: CommunicationActor;
  systemId: string;
  recordedAt: string;
  note?: string;
};

export type CommunicationMessage = {
  id: string;
  conversationId: string;
  sender: CommunicationActor;
  recipients: CommunicationParticipant[];
  channel: CommunicationChannel;
  subject?: string;
  bodyText: string;
  bodyHtml?: string;
  category: string;
  priority: CommunicationPriority;
  messageState: MessageState;
  createdAt: string;
  submittedAt?: string;
  sentAt?: string;
  receivedAt?: string;
  replyToMessageId?: string;
  supersedesMessageId?: string;
  requiresAcknowledgement: boolean;
  acknowledgementDeadline?: string;
  actionRequired: boolean;
  actionDueAt?: string;
  isInternalNote: boolean;
  attachments: CommunicationAttachment[];
  sourceContext?: CommunicationSourceContext;
  readBy: string[];
  acknowledgements: CommunicationAcknowledgement[];
  idempotencyKey?: string;
};

export type CommunicationDelivery = {
  id: string;
  messageId: string;
  recipientId: string;
  recipientName: string;
  channel: CommunicationChannel | 'fhir' | 'direct' | 'smime_email' | 'secure_email' | 'standard_email' | 'portal' | 'pms' | 'lims' | 'hospital';
  endpointLabel: string;
  state: DeliveryState;
  attempts: number;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  acceptedAt?: string;
  systemDeliveredAt?: string;
  inboxDeliveredAt?: string;
  readAt?: string;
  acknowledgedAt?: string;
  lastErrorCode?: string;
  lastErrorDetail?: string;
  fallbackOfDeliveryId?: string;
  manualConfirmation?: CommunicationManualDeliveryConfirmation;
  manualConfirmations?: CommunicationManualDeliveryConfirmation[];
};

export type CommunicationManualDeliveryConfirmation = {
  id: string;
  method: string;
  confirmedWith: string;
  confirmedAt: string;
  note: string;
  actor: CommunicationActor;
};

export type CommunicationCallParticipant = {
  id: string;
  name: string;
  role: string;
  joinedAt?: string;
  leftAt?: string;
  muted: boolean;
  onHold: boolean;
};

export type CommunicationCallAction = 'dial' | 'admit' | 'answer' | 'decline' | 'cancel' | 'hold' | 'resume' | 'transfer' | 'conference' | 'reconnect' | 'hangup' | 'end' | 'add_note' | 'set_disposition';

export type CommunicationCallHistoryEntry = {
  id: string;
  version: number;
  action: CommunicationCallAction | 'created' | 'provider_unavailable' | 'provider_failed' | 'provider_accepted' | 'provider_status' | 'legacy_record';
  fromState?: CallState;
  toState: CallState;
  requestedState?: CallState;
  occurredAt: string;
  actor?: CommunicationActor;
  result: 'applied' | 'provider_unavailable' | 'provider_failed' | 'legacy';
};

export type CommunicationCallWaitingRoom = {
  state: 'not_applicable' | 'waiting' | 'admitted' | 'removed';
  enteredAt?: string;
  admittedAt?: string;
};

export type CommunicationCallRecordingConsent = {
  state: 'not_required' | 'required' | 'granted' | 'denied';
  recordedAt?: string;
};

export type CommunicationCallQuality = {
  state: 'unknown' | 'good' | 'degraded' | 'poor';
  updatedAt?: string;
};

export type CommunicationCall = {
  id: string;
  conversationId: string;
  patientId?: string;
  appointmentId?: string;
  encounterId?: string;
  callType?: 'audio' | 'video' | 'group_audio' | 'group_video';
  initiatedBy: CommunicationActor;
  direction: 'inbound' | 'outbound';
  state: CallState;
  provider: string;
  providerCallId?: string;
  controlPlaneCallId?: string;
  startedAt: string;
  connectedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  dispositionCode?: string;
  recordingState: 'not_requested' | 'not_allowed' | 'consent_required' | 'recording' | 'recorded';
  transcriptionState: 'disabled' | 'not_requested' | 'processing' | 'available';
  participants: CommunicationCallParticipant[];
  notes: string[];
  errorCode?: string;
  errorDetail?: string;
  revision: number;
  stateHistory: CommunicationCallHistoryEntry[];
  waitingRoom?: CommunicationCallWaitingRoom;
  recordingConsent?: CommunicationCallRecordingConsent;
  quality?: CommunicationCallQuality;
};

export type TelehealthMeetingContext = {
  callId: string;
  eligible: boolean;
  code?: string;
  detail?: string;
  localDemoAllowed: boolean;
  patient?: { id: string; name: string };
  clinician?: { id: string; name: string; role: string };
  visit?: { label: string };
};

export type CommunicationVoicemail = {
  id: string;
  conversationId?: string;
  patientId?: string;
  callId: string;
  callerName: string;
  callerPhone: string;
  receivedAt: string;
  durationSeconds: number;
  state: VoicemailState;
  reviewedAt?: string;
  transcriptionState: 'disabled' | 'processing' | 'available';
  transcription?: string;
  assignedTo?: CommunicationActor;
  callbackState: 'not_requested' | 'requested' | 'completed';
};

export type CommunicationTask = {
  id: string;
  conversationId: string;
  sourceMessageId?: string;
  title: string;
  status: 'requested' | 'in_progress' | 'completed' | 'cancelled';
  priority: CommunicationPriority;
  assignedTo?: CommunicationActor;
  dueAt?: string;
  createdAt: string;
  completedAt?: string;
};

export type CommunicationEvent = {
  id: string;
  eventType: string;
  occurredAt: string;
  actor?: CommunicationActor;
  conversationId: string;
  messageId?: string;
  deliveryId?: string;
  callId?: string;
  voicemailId?: string;
  taskId?: string;
  description: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type CommunicationConversation = {
  id: string;
  tenantId: string;
  patientId?: string;
  encounterId?: string;
  appointmentId?: string;
  topic: string;
  category: string;
  priority: CommunicationPriority;
  sensitivity: 'normal' | 'sensitive' | 'restricted';
  state: ConversationState;
  ownerTeamId?: string;
  participants: CommunicationParticipant[];
  createdBy: CommunicationActor;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  messages: CommunicationMessage[];
  deliveries: CommunicationDelivery[];
  attachments: CommunicationAttachment[];
  calls: CommunicationCall[];
  voicemails: CommunicationVoicemail[];
  tasks: CommunicationTask[];
  events: CommunicationEvent[];
};

export type CommunicationDirectoryEntry = CommunicationParticipant & {
  verifiedEmail?: string;
  phoneE164?: string;
  preferredChannel: 'secure_message' | 'email' | 'call' | 'portal';
  endpointStatus: 'up' | 'degraded' | 'down' | 'unknown';
};

export type CommunicationDraft = {
  id: string;
  actorId: string;
  revision: number;
  conversationId?: string;
  patientId?: string;
  recipientId?: string;
  channel: CommunicationChannel;
  subject: string;
  bodyText: string;
  category: string;
  priority: CommunicationPriority;
  requiresAcknowledgement: boolean;
  isInternalNote: boolean;
  attachments: CommunicationAttachment[];
  updatedAt: string;
};

type SubmittedCommunicationDraft = {
  id: string;
  actorId: string;
  submittedAt: string;
};

export type PatientCommunicationContext = {
  id: string;
  name: string;
  dob: string;
  age?: number;
  gender?: string;
  mrn: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  recentLabs: string[];
  openTasks: string[];
  preferredChannel: string;
  riskLevel: string;
  identityVerified: boolean;
};

export type ConversationSummary = {
  id: string;
  patientId?: string;
  patientName?: string;
  participantName: string;
  participantRole?: string;
  organizationName?: string;
  topic: string;
  category: string;
  priority: CommunicationPriority;
  state: ConversationState;
  lastActivityAt: string;
  preview: string;
  channel: CommunicationChannel;
  channels: CommunicationChannel[];
  unread: boolean;
  actionRequired: boolean;
  awaitingResponse: boolean;
  deliveryIssue: boolean;
  attachmentCount: number;
  callCount: number;
  voicemailCount: number;
};

export type CommunicationHubSnapshot = {
  actor: CommunicationActor;
  generatedAt: string;
  folders: {
    inbox: number;
    sent: number;
    drafts: number;
    awaitingResponse: number;
    needsAction: number;
    urgent: number;
    calls: number;
    voicemail: number;
    deliveryIssues: number;
    archived: number;
  };
  conversations: ConversationSummary[];
  drafts: CommunicationDraft[];
  directory: CommunicationDirectoryEntry[];
  providerStatus: {
    email: { available: boolean; reason: string };
    telephony: { available: boolean; reason: string };
    secureMessaging: { available: boolean; reason?: string };
  };
};

export type CommunicationConversationView = CommunicationConversation & {
  patientContext?: PatientCommunicationContext;
  timeline: CommunicationEvent[];
  summary: {
    text: string;
    generatedBy: 'rules' | 'configured_ai';
    sourceMessageIds: string[];
  };
};

type CommunicationStoreData = {
  conversations: CommunicationConversation[];
  drafts: CommunicationDraft[];
  submittedDrafts: SubmittedCommunicationDraft[];
  directory: CommunicationDirectoryEntry[];
  pendingAttachments: PendingCommunicationAttachment[];
};

const STORE_FILE = resolveDataPath('communication_hub.json');
const ALLOWED_ATTACHMENT_TYPES = new Set(['application/pdf', 'application/json', 'image/png', 'image/jpeg', 'image/tiff', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']);
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const PENDING_ATTACHMENT_TTL_MS = 15 * 60_000;
let writeQueue = Promise.resolve();
const subscribers = new Set<(event: CommunicationEvent) => void>();

type CallActionReceipt = {
  idempotencyKey: string;
  action: CommunicationCallAction;
  requestHash: string;
  outcome: 'applied' | 'provider_unavailable';
  recordedAt: string;
};

type StoredCommunicationCall = CommunicationCall & {
  actionReceipts?: CallActionReceipt[];
};

export type CommunicationCallListOptions = {
  patientId?: string;
  conversationId?: string;
  statuses?: CallState[];
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
};

export type CommunicationCallListResult = {
  calls: CommunicationCall[];
  nextCursor?: string;
};

export type CommunicationCallActionResult = {
  call: CommunicationCall;
  providerUnavailable: boolean;
  replayed: boolean;
};

const CALL_STATES = new Set<CallState>(['created', 'waiting_room', 'dialing', 'ringing', 'connecting', 'connected', 'reconnecting', 'on_hold', 'transferring', 'conferencing', 'ending', 'ended', 'busy', 'no_answer', 'declined', 'failed', 'dropped', 'cancelled']);
const CALL_TERMINAL_STATES = new Set<CallState>(['ended', 'busy', 'no_answer', 'declined', 'failed', 'dropped', 'cancelled']);
const CALL_STATE_TRANSITIONS: Record<CallState, readonly CallState[]> = {
  created: ['waiting_room', 'dialing', 'ringing', 'failed', 'cancelled'],
  waiting_room: ['dialing', 'ringing', 'failed', 'cancelled'],
  dialing: ['ringing', 'connecting', 'busy', 'no_answer', 'failed', 'dropped', 'cancelled'],
  ringing: ['connecting', 'connected', 'busy', 'no_answer', 'declined', 'failed', 'dropped', 'cancelled'],
  connecting: ['connected', 'failed', 'dropped', 'cancelled'],
  connected: ['on_hold', 'transferring', 'conferencing', 'reconnecting', 'ending', 'dropped', 'failed'],
  reconnecting: ['connected', 'ending', 'dropped', 'failed'],
  on_hold: ['connected', 'ending', 'dropped', 'failed'],
  transferring: ['connected', 'ending', 'ended', 'failed', 'dropped'],
  conferencing: ['connected', 'ending', 'ended', 'failed', 'dropped'],
  ending: ['ended', 'failed', 'dropped'],
  ended: [],
  busy: [],
  no_answer: [],
  declined: [],
  failed: [],
  dropped: [],
  cancelled: [],
};
const CALL_MEDIA_ACTION_TARGETS: Record<Exclude<CommunicationCallAction, 'add_note' | 'set_disposition'>, CallState> = {
  dial: 'dialing',
  admit: 'dialing',
  answer: 'connecting',
  decline: 'declined',
  cancel: 'cancelled',
  hold: 'on_hold',
  resume: 'connected',
  transfer: 'transferring',
  conference: 'conferencing',
  reconnect: 'reconnecting',
  hangup: 'ending',
  end: 'ending',
};

export function isCommunicationCallState(value: string): value is CallState {
  return CALL_STATES.has(value as CallState);
}

export function isCommunicationCallAction(value: string): value is CommunicationCallAction {
  return value === 'dial' || value === 'admit' || value === 'answer' || value === 'decline' || value === 'cancel' || value === 'hold' || value === 'resume' || value === 'transfer' || value === 'conference' || value === 'reconnect' || value === 'hangup' || value === 'end' || value === 'add_note' || value === 'set_disposition';
}

function actor(id: string, name: string, role: string, organizationName?: string): CommunicationActor & CommunicationParticipant {
  return { id, type: 'practitioner', name, role, organizationName, capabilities: [] };
}

function actorParticipant(value: CommunicationActor): CommunicationParticipant {
  return { id: value.id, type: 'practitioner', name: value.name, role: value.role, organizationName: value.organizationName, capabilities: [] };
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function addEvent(conversation: CommunicationConversation, event: Omit<CommunicationEvent, 'id' | 'conversationId'>) {
  const created: CommunicationEvent = { id: randomUUID(), conversationId: conversation.id, ...event };
  conversation.events.push(created);
  conversation.updatedAt = created.occurredAt;
  conversation.lastActivityAt = created.occurredAt;
  for (const subscriber of subscribers) subscriber(created);
  return created;
}

function patientContext(patientId?: string): PatientCommunicationContext | undefined {
  if (!patientId) return undefined;
  const patient = getPatientById(patientId);
  if (!patient) return undefined;
  return {
    id: patient.id,
    name: patient.name,
    dob: patient.dob,
    age: patient.age,
    gender: patient.gender,
    mrn: patient.mrn,
    allergies: patient.allergies || ['No known allergies'],
    conditions: patient.conditions || [],
    medications: (patient.medications || []).slice(0, 4).map((medication) => [medication.name, medication.dose, medication.freq].filter(Boolean).join(' - ')),
    recentLabs: (patient.labResults || []).slice(0, 4).map((lab) => `${lab.name}: ${lab.result}${lab.unit ? ` ${lab.unit}` : ''} - ${lab.date}`),
    openTasks: (patient.clinicalTasks || []).filter((task) => task.status !== 'completed').slice(0, 4).map((task) => task.title),
    preferredChannel: patient.preferredContactMethod || 'Portal message',
    riskLevel: patient.riskLevel || 'Moderate',
    identityVerified: true,
  };
}

function seedStore(): CommunicationStoreData {
  const doctor = actor('dev-doctor', 'Dr. Maya Chen', 'DOCTOR', 'Maple Health');
  const pharmacist = { id: 'org-maple-pharmacy', type: 'organization' as const, name: 'Maple Pharmacy', role: 'Pharmacy team', organizationName: 'Maple Pharmacy', capabilities: ['ROSHI_SECURE_MESSAGE', 'SECURE_EMAIL', 'PHONE'] };
  const laboratory = { id: 'org-toronto-diagnostics', type: 'organization' as const, name: 'Toronto Diagnostic Lab', role: 'Laboratory', organizationName: 'Toronto Diagnostic Lab', capabilities: ['ROSHI_SECURE_MESSAGE', 'FHIR_MESSAGE', 'SECURE_EMAIL', 'PHONE'] };
  const patientSarah = { id: 'patient-001', type: 'patient' as const, name: 'Sarah Jenkins', role: 'Patient', capabilities: ['PORTAL', 'ROSHI_SECURE_MESSAGE'] };
  const patientMichael = { id: 'patient-002', type: 'patient' as const, name: 'Michael Thompson', role: 'Patient', capabilities: ['PORTAL', 'ROSHI_SECURE_MESSAGE'] };
  const pharmacyMessage: CommunicationMessage = {
    id: 'msg-pharmacy-1', conversationId: 'conv-pharmacy', sender: actor('pharmacist-maple', 'Jordan Singh', 'PHARMACIST', 'Maple Pharmacy'), recipients: [doctor], channel: 'secure_message', subject: 'Metformin dose clarification', bodyText: 'Could you confirm whether Sarah should continue metformin 500 mg twice daily? Our dispensing record is due for renewal.', category: 'Medication', priority: 'urgent', messageState: 'accepted', createdAt: minutesAgo(18), requiresAcknowledgement: true, acknowledgementDeadline: new Date(Date.now() + 2 * 60 * 60_000).toISOString(), actionRequired: true, actionDueAt: new Date(Date.now() + 6 * 60 * 60_000).toISOString(), isInternalNote: false, attachments: [], readBy: [], acknowledgements: [], idempotencyKey: 'seed-pharmacy-1',
  };
  const pharmacyReply: CommunicationMessage = {
    id: 'msg-pharmacy-2', conversationId: 'conv-pharmacy', sender: doctor, recipients: [pharmacist], channel: 'secure_message', subject: 'Re: Metformin dose clarification', bodyText: 'Confirmed: continue metformin 500 mg twice daily. Please proceed with the renewal.', category: 'Medication', priority: 'urgent', messageState: 'accepted', createdAt: minutesAgo(11), submittedAt: minutesAgo(11), requiresAcknowledgement: false, actionRequired: false, isInternalNote: false, attachments: [], readBy: [doctor.id], acknowledgements: [], idempotencyKey: 'seed-pharmacy-2',
  };
  const pharmacyConversation: CommunicationConversation = {
    id: 'conv-pharmacy', tenantId: 'default', patientId: 'patient-001', topic: 'Metformin dose clarification', category: 'Medication', priority: 'urgent', sensitivity: 'sensitive', state: 'awaiting_response', participants: [pharmacist, doctor], createdBy: pharmacist as CommunicationActor, createdAt: minutesAgo(20), updatedAt: minutesAgo(11), lastActivityAt: minutesAgo(11), messages: [pharmacyMessage, pharmacyReply], deliveries: [
      { id: 'delivery-pharmacy-pms', messageId: pharmacyReply.id, recipientId: pharmacist.id, recipientName: pharmacist.name, channel: 'pms', endpointLabel: 'Maple Pharmacy PMS', state: 'deferred', attempts: 3, lastAttemptAt: minutesAgo(10), nextAttemptAt: new Date(Date.now() + 14 * 60_000).toISOString(), lastErrorCode: 'ENDPOINT_UNAVAILABLE', lastErrorDetail: 'Pharmacy PMS is temporarily unavailable.' },
      { id: 'delivery-pharmacy-email', messageId: pharmacyReply.id, recipientId: pharmacist.id, recipientName: pharmacist.name, channel: 'secure_email', endpointLabel: 'Secure email fallback', state: 'queued', attempts: 0, nextAttemptAt: minutesAgo(10), lastErrorCode: 'EMAIL_PROVIDER_UNAVAILABLE', lastErrorDetail: 'No approved email provider is configured; delivery remains queued.', fallbackOfDeliveryId: 'delivery-pharmacy-pms' },
    ], attachments: [], calls: [{ id: 'call-pharmacy-1', conversationId: 'conv-pharmacy', initiatedBy: pharmacist as CommunicationActor, direction: 'inbound', state: 'failed', provider: 'not-configured', startedAt: minutesAgo(8), endedAt: minutesAgo(8), dispositionCode: 'provider_unavailable', recordingState: 'not_allowed', transcriptionState: 'disabled', participants: [{ id: pharmacist.id, name: pharmacist.name, role: 'Pharmacist', muted: false, onHold: false }, { id: doctor.id, name: doctor.name, role: 'Doctor', muted: false, onHold: false }], notes: ['Synthetic fixture: no approved telephony provider is configured.'], errorCode: 'TELEPHONY_UNAVAILABLE', revision: 1, stateHistory: [{ id: 'call-history-pharmacy-1', version: 1, action: 'legacy_record', toState: 'failed', occurredAt: minutesAgo(8), actor: pharmacist as CommunicationActor, result: 'legacy' }] }], voicemails: [], tasks: [{ id: 'task-pharmacy-1', conversationId: 'conv-pharmacy', sourceMessageId: pharmacyMessage.id, title: 'Confirm metformin dose with Maple Pharmacy', status: 'in_progress', priority: 'urgent', assignedTo: doctor, dueAt: new Date(Date.now() + 6 * 60 * 60_000).toISOString(), createdAt: minutesAgo(17) }], events: [
      { id: 'event-pharmacy-1', eventType: 'message.recorded', occurredAt: minutesAgo(18), conversationId: 'conv-pharmacy', messageId: pharmacyMessage.id, actor: pharmacyMessage.sender, description: 'Synthetic development fixture: pharmacy communication recorded locally' },
      { id: 'event-pharmacy-2', eventType: 'delivery.deferred', occurredAt: minutesAgo(10), conversationId: 'conv-pharmacy', messageId: pharmacyReply.id, deliveryId: 'delivery-pharmacy-pms', description: 'Maple Pharmacy PMS unavailable; primary delivery remains queued' },
      { id: 'event-pharmacy-3', eventType: 'delivery.queued', occurredAt: minutesAgo(10), conversationId: 'conv-pharmacy', messageId: pharmacyReply.id, deliveryId: 'delivery-pharmacy-email', description: 'Secure email fallback remains queued; no approved provider is configured' },
      { id: 'event-pharmacy-4', eventType: 'call.failed', occurredAt: minutesAgo(8), conversationId: 'conv-pharmacy', callId: 'call-pharmacy-1', description: 'Call could not start because no approved telephony provider is configured' },
    ],
  };
  const labMessage: CommunicationMessage = {
    id: 'msg-lab-1', conversationId: 'conv-lab', sender: actor('lab-tech-toronto', 'Avery Brooks', 'LAB_TECH', 'Toronto Diagnostic Lab'), recipients: [doctor], channel: 'secure_message', subject: 'Specimen issue - CBC order', bodyText: 'The specimen for Michael Thompson was insufficient for processing. Please advise whether a recollection should be ordered.', category: 'Lab', priority: 'urgent', messageState: 'accepted', createdAt: minutesAgo(95), requiresAcknowledgement: true, acknowledgementDeadline: new Date(Date.now() + 60 * 60_000).toISOString(), actionRequired: true, actionDueAt: new Date(Date.now() + 3 * 60 * 60_000).toISOString(), isInternalNote: false, attachments: [], readBy: [], acknowledgements: [], idempotencyKey: 'seed-lab-1',
  };
  const labConversation: CommunicationConversation = {
    id: 'conv-lab', tenantId: 'default', patientId: 'patient-002', topic: 'Specimen issue - CBC order', category: 'Lab', priority: 'urgent', sensitivity: 'sensitive', state: 'awaiting_action', participants: [laboratory, doctor], createdBy: laboratory as CommunicationActor, createdAt: minutesAgo(100), updatedAt: minutesAgo(95), lastActivityAt: minutesAgo(95), messages: [labMessage], deliveries: [], attachments: [], calls: [], voicemails: [], tasks: [], events: [{ id: 'event-lab-1', eventType: 'message.received', occurredAt: minutesAgo(95), conversationId: 'conv-lab', messageId: labMessage.id, actor: labMessage.sender, description: 'Laboratory message received - acknowledgement required' }],
  };
  const patientMessage: CommunicationMessage = {
    id: 'msg-patient-1', conversationId: 'conv-patient', sender: patientSarah as unknown as CommunicationActor, recipients: [doctor], channel: 'secure_message', subject: 'Follow-up appointment', bodyText: 'Could I reschedule my follow-up appointment to next week?', category: 'Appointment', priority: 'routine', messageState: 'accepted', createdAt: minutesAgo(210), requiresAcknowledgement: false, actionRequired: true, isInternalNote: false, attachments: [], readBy: [], acknowledgements: [], idempotencyKey: 'seed-patient-1',
  };
  const patientConversation: CommunicationConversation = {
    id: 'conv-patient', tenantId: 'default', patientId: 'patient-001', topic: 'Follow-up appointment', category: 'Appointment', priority: 'routine', sensitivity: 'normal', state: 'open', participants: [patientSarah, doctor], createdBy: patientSarah as unknown as CommunicationActor, createdAt: minutesAgo(220), updatedAt: minutesAgo(210), lastActivityAt: minutesAgo(210), messages: [patientMessage], deliveries: [], attachments: [], calls: [{ id: 'call-patient-1', conversationId: 'conv-patient', patientId: 'patient-001', initiatedBy: doctor, direction: 'outbound', state: 'no_answer', provider: 'not-configured', startedAt: minutesAgo(260), endedAt: minutesAgo(259), recordingState: 'not_requested', transcriptionState: 'disabled', participants: [{ id: doctor.id, name: doctor.name, role: 'Doctor', joinedAt: minutesAgo(260), leftAt: minutesAgo(259), muted: false, onHold: false }], notes: [], revision: 1, stateHistory: [{ id: 'call-history-patient-1', version: 1, action: 'legacy_record', toState: 'no_answer', occurredAt: minutesAgo(259), actor: doctor, result: 'legacy' }] }], voicemails: [{ id: 'vm-patient-1', conversationId: 'conv-patient', patientId: 'patient-001', callId: 'call-patient-1', callerName: 'Sarah Jenkins', callerPhone: '+1 (416) 555-0132', receivedAt: minutesAgo(240), durationSeconds: 48, state: 'unread', transcriptionState: 'available', transcription: 'Sarah is asking for a callback about rescheduling her follow-up appointment.', callbackState: 'not_requested' }], tasks: [], events: [{ id: 'event-patient-1', eventType: 'call.no_answer', occurredAt: minutesAgo(259), conversationId: 'conv-patient', callId: 'call-patient-1', description: 'Outbound call had no answer' }, { id: 'event-patient-2', eventType: 'voicemail.available', occurredAt: minutesAgo(240), conversationId: 'conv-patient', voicemailId: 'vm-patient-1', description: 'Voicemail available for review' }, { id: 'event-patient-3', eventType: 'message.received', occurredAt: minutesAgo(210), conversationId: 'conv-patient', messageId: patientMessage.id, actor: patientMessage.sender, description: 'Patient message received in care-team inbox' }],
  };
  const directory: CommunicationDirectoryEntry[] = [
    { ...pharmacist, verifiedEmail: 'secure-inbox@maple-pharmacy.example', phoneE164: '+14165550190', preferredChannel: 'secure_message', endpointStatus: 'down' },
    { ...laboratory, verifiedEmail: 'clinical@toronto-diagnostics.example', phoneE164: '+14165550210', preferredChannel: 'secure_message', endpointStatus: 'up' },
    { ...patientSarah, verifiedEmail: 'sarah.jenkins@example.com', phoneE164: '+14165550132', preferredChannel: 'portal', endpointStatus: 'up' },
    { ...patientMichael, verifiedEmail: 'michael.thompson@example.com', phoneE164: '+14165550144', preferredChannel: 'portal', endpointStatus: 'up' },
  ];
  return { conversations: [pharmacyConversation, labConversation, patientConversation], drafts: [], submittedDrafts: [], directory, pendingAttachments: [] };
}

async function readStore(options: { strict?: boolean } = {}): Promise<CommunicationStoreData> {
  try {
    const parsed = JSON.parse(await fs.readFile(STORE_FILE, 'utf8')) as Partial<CommunicationStoreData>;
    if (Array.isArray(parsed.conversations) && Array.isArray(parsed.directory)) {
      const drafts = Array.isArray(parsed.drafts) ? parsed.drafts.map((draft) => ({ ...draft, revision: Number.isInteger(draft.revision) && draft.revision >= 0 ? draft.revision : 0, category: draft.category || 'General', priority: draft.priority || 'routine', requiresAcknowledgement: draft.requiresAcknowledgement === true, isInternalNote: draft.isInternalNote === true, attachments: Array.isArray(draft.attachments) ? draft.attachments : [] })) : [];
      const submittedDrafts = Array.isArray(parsed.submittedDrafts) ? parsed.submittedDrafts.filter((draft): draft is SubmittedCommunicationDraft => Boolean(draft) && typeof draft.id === 'string' && typeof draft.actorId === 'string' && typeof draft.submittedAt === 'string').slice(-500) : [];
      return { conversations: parsed.conversations, drafts, submittedDrafts, directory: parsed.directory, pendingAttachments: Array.isArray(parsed.pendingAttachments) ? parsed.pendingAttachments : [] };
    }
    if (options.strict) throw new Error('INVALID_COMMUNICATION_STORE');
  } catch (error) {
    if (options.strict && (error as { code?: string }).code !== 'ENOENT') throw error;
    // Seed the local development store below.
  }
  const seeded = seedStore();
  await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(seeded, null, 2), 'utf8');
  return seeded;
}

async function writeStore(data: CommunicationStoreData) {
  await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
  const temporaryFile = `${STORE_FILE}.${process.pid}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(temporaryFile, STORE_FILE);
}

async function readCallStore() {
  try {
    return await readStore({ strict: true });
  } catch {
    throw new Error('CALL_STORE_UNAVAILABLE');
  }
}

async function writeCallStore(data: CommunicationStoreData) {
  try {
    await writeStore(data);
  } catch {
    throw new Error('CALL_STORE_UNAVAILABLE');
  }
}

async function withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = writeQueue;
  let release!: () => void;
  writeQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try { return await operation(); } finally { release(); }
}

function legacyCallHistory(call: CommunicationCall): CommunicationCallHistoryEntry {
  return {
    id: `legacy-call-${call.id}`,
    version: 1,
    action: 'legacy_record',
    toState: isCommunicationCallState(call.state) ? call.state : 'failed',
    occurredAt: call.endedAt || call.startedAt,
    actor: call.initiatedBy,
    result: 'legacy',
  };
}

function callHistoryForPresentation(call: CommunicationCall) {
  const candidates = Array.isArray((call as { stateHistory?: unknown }).stateHistory) ? (call as { stateHistory: unknown[] }).stateHistory : [];
  const history = candidates.flatMap<CommunicationCallHistoryEntry>((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const entry = candidate as Partial<CommunicationCallHistoryEntry>;
    const toState = typeof entry.toState === 'string' ? entry.toState : '';
    const fromState = typeof entry.fromState === 'string' ? entry.fromState : '';
    const requestedState = typeof entry.requestedState === 'string' ? entry.requestedState : '';
    if (typeof entry.id !== 'string' || !isCommunicationCallState(toState) || typeof entry.occurredAt !== 'string') return [];
    const result = entry.result === 'applied' || entry.result === 'provider_unavailable' || entry.result === 'provider_failed' || entry.result === 'legacy' ? entry.result : 'legacy';
    const action = entry.action === 'created' || entry.action === 'provider_unavailable' || entry.action === 'provider_failed' || entry.action === 'provider_accepted' || entry.action === 'provider_status' || entry.action === 'legacy_record' || (typeof entry.action === 'string' && isCommunicationCallAction(entry.action)) ? entry.action : 'legacy_record';
    const normalized: CommunicationCallHistoryEntry = {
      id: entry.id,
      version: Number.isInteger(entry.version) && Number(entry.version) > 0 ? Number(entry.version) : 1,
      action,
      fromState: isCommunicationCallState(fromState) ? fromState : undefined,
      toState,
      requestedState: isCommunicationCallState(requestedState) ? requestedState : undefined,
      occurredAt: entry.occurredAt,
      actor: entry.actor,
      result,
    };
    return [normalized];
  }).sort((left, right) => left.version - right.version || Date.parse(left.occurredAt) - Date.parse(right.occurredAt) || left.id.localeCompare(right.id));
  return history.length ? history : [legacyCallHistory(call)];
}

function ensureCallHistory(call: CommunicationCall) {
  const history = callHistoryForPresentation(call);
  call.stateHistory = history;
  call.revision = Math.max(Number.isInteger(call.revision) && call.revision > 0 ? call.revision : 0, ...history.map((entry) => entry.version));
  return call;
}

function appendCallHistory(call: CommunicationCall, entry: Omit<CommunicationCallHistoryEntry, 'id' | 'version'>) {
  ensureCallHistory(call);
  const version = call.revision + 1;
  const created: CommunicationCallHistoryEntry = { id: randomUUID(), version, ...entry };
  call.revision = version;
  call.stateHistory.push(created);
  return created;
}

function transitionCallState(call: CommunicationCall, toState: CallState, input: { action: CommunicationCallHistoryEntry['action']; actor?: CommunicationActor; occurredAt: string; result?: CommunicationCallHistoryEntry['result']; errorCode?: string }) {
  ensureCallHistory(call);
  const fromState = call.state;
  if (!CALL_STATE_TRANSITIONS[fromState]?.includes(toState)) throw new Error('CALL_STATE_CONFLICT');
  call.state = toState;
  if (toState === 'connected' && !call.connectedAt) call.connectedAt = input.occurredAt;
  if (CALL_TERMINAL_STATES.has(toState)) {
    call.endedAt = call.endedAt || input.occurredAt;
    if (call.connectedAt) {
      const duration = Date.parse(call.endedAt) - Date.parse(call.connectedAt);
      if (Number.isFinite(duration) && duration >= 0) call.durationSeconds = Math.floor(duration / 1000);
    }
  }
  if (input.errorCode) call.errorCode = input.errorCode;
  return appendCallHistory(call, { action: input.action, fromState, toState, occurredAt: input.occurredAt, actor: input.actor, result: input.result || 'applied' });
}

function actionReceipts(call: CommunicationCall) {
  const storedCall = call as StoredCommunicationCall;
  if (!Array.isArray(storedCall.actionReceipts)) storedCall.actionReceipts = [];
  return storedCall.actionReceipts;
}

function callActionHash(action: CommunicationCallAction, note?: string, dispositionCode?: string) {
  return createHash('sha256').update(JSON.stringify({ action, note: note?.trim() || undefined, dispositionCode: dispositionCode?.trim() || undefined })).digest('hex');
}

function presentLocalCall(call: CommunicationCall): CommunicationCall {
  const storedCall = { ...(call as StoredCommunicationCall) };
  delete storedCall.actionReceipts;
  const stateHistory = callHistoryForPresentation(call);
  const revision = Math.max(Number.isInteger(call.revision) && call.revision > 0 ? call.revision : 0, ...stateHistory.map((entry) => entry.version));
  const visible: CommunicationCall = { ...storedCall, revision, stateHistory };
  if (visible.provider !== 'not-configured' || visible.state === 'failed') return visible;
  const occurredAt = visible.endedAt || visible.startedAt;
  const providerUnavailableHistory: CommunicationCallHistoryEntry = {
    id: `provider-unavailable-${visible.id}`,
    version: revision + 1,
    action: 'provider_unavailable',
    fromState: visible.state,
    toState: 'failed',
    occurredAt,
    actor: visible.initiatedBy,
    result: 'provider_unavailable',
  };
  return { ...visible, state: 'failed', endedAt: visible.endedAt || visible.startedAt, errorCode: visible.errorCode || 'TELEPHONY_UNAVAILABLE', revision: providerUnavailableHistory.version, stateHistory: [...stateHistory, providerUnavailableHistory] };
}

type CallCursor = { startedAt: string; id: string };

function encodeCallCursor(call: CommunicationCall) {
  return Buffer.from(JSON.stringify({ startedAt: call.startedAt, id: call.id } satisfies CallCursor)).toString('base64url');
}

function decodeCallCursor(cursor: string): CallCursor {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<CallCursor>;
    if (typeof parsed.startedAt !== 'string' || typeof parsed.id !== 'string' || !Number.isFinite(Date.parse(parsed.startedAt)) || !parsed.id) throw new Error('invalid');
    return { startedAt: parsed.startedAt, id: parsed.id };
  } catch {
    throw new Error('CALL_CURSOR_INVALID');
  }
}

function callStartedAt(call: CommunicationCall) {
  const timestamp = Date.parse(call.startedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareCallsNewestFirst(left: CommunicationCall, right: CommunicationCall) {
  return callStartedAt(right) - callStartedAt(left) || right.id.localeCompare(left.id);
}

function followsCallCursor(call: CommunicationCall, cursor: CallCursor) {
  const cursorTimestamp = Date.parse(cursor.startedAt);
  const timestamp = callStartedAt(call);
  return timestamp < cursorTimestamp || (timestamp === cursorTimestamp && call.id.localeCompare(cursor.id) < 0);
}

function isParticipant(conversation: CommunicationConversation, actorId: string) {
  return conversation.participants.some((participant) => participant.id === actorId) || conversation.messages.some((message) => message.sender.id === actorId || message.recipients.some((recipient) => recipient.id === actorId));
}

function assertRecipientMatchesPatientContext(recipient: CommunicationDirectoryEntry, patientId?: string) {
  if (recipient.type === 'patient' && (!patientId || recipient.id !== patientId)) throw new Error('PATIENT_CONTEXT_MISMATCH');
}

function samePatientScope(left?: string, right?: string) {
  return (left || undefined) === (right || undefined);
}

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((id, index) => id === sortedRight[index]);
}

function queueUnconfiguredDelivery(input: { messageId: string; recipient: CommunicationParticipant; channel: CommunicationChannel; now: string }): CommunicationDelivery {
  const provider = input.channel === 'email' ? 'email' : 'secure messaging';
  return {
    id: randomUUID(),
    messageId: input.messageId,
    recipientId: input.recipient.id,
    recipientName: input.recipient.name,
    channel: input.channel,
    endpointLabel: input.recipient.name,
    state: 'queued',
    attempts: 0,
    nextAttemptAt: input.now,
    lastErrorCode: input.channel === 'email' ? 'EMAIL_PROVIDER_UNAVAILABLE' : 'SECURE_MESSAGING_PROVIDER_UNAVAILABLE',
    lastErrorDetail: `No approved ${provider} delivery provider is configured; delivery remains queued.`,
  };
}

/**
 * Older local fixture files predate the provider-free boundary and may contain
 * delivery/call success states. Present them as unverified without rewriting a
 * developer's local data file; only a configured provider receipt may restore
 * those external states.
 */
function presentLocalConversation(conversation: CommunicationConversation, viewerId?: string): CommunicationConversation {
  const visibleMessages = conversation.messages.filter((message) => !message.isInternalNote || !viewerId || message.sender.id === viewerId);
  const hiddenMessageIds = new Set(conversation.messages.filter((message) => !visibleMessages.some((visible) => visible.id === message.id)).map((message) => message.id));
  const messages = visibleMessages.map((message) => {
    const normalized = { ...message };
    delete normalized.sentAt;
    delete normalized.receivedAt;
    const claimedExternalState = ['routing', 'active', 'partially_delivered', 'delivered', 'delivered_to_inbox'].includes(String(message.messageState));
    return { ...normalized, messageState: claimedExternalState ? 'accepted' : message.messageState };
  });
  const deliveries = conversation.deliveries.map((delivery) => {
    const claimedExternalState = ['accepted_by_endpoint', 'delivered_to_system', 'delivered_to_inbox', 'read', 'acknowledged', 'actioned', 'email_server_accepted'].includes(delivery.state);
    if (!claimedExternalState) return delivery;
    const normalized = { ...delivery };
    delete normalized.acceptedAt;
    delete normalized.systemDeliveredAt;
    delete normalized.inboxDeliveredAt;
    delete normalized.readAt;
    delete normalized.acknowledgedAt;
    delete normalized.lastAttemptAt;
    delete normalized.nextAttemptAt;
    return { ...normalized, state: 'queued' as const, attempts: 0, lastErrorCode: 'PROVIDER_NOT_CONFIGURED', lastErrorDetail: 'External delivery is not verified because no approved provider is configured.' };
  });
  const calls = conversation.calls.map(presentLocalCall);
  const events = conversation.events.filter((event) => !event.messageId || !hiddenMessageIds.has(event.messageId)).map((event) => {
    if (['delivery.inbox_delivered', 'delivery.system_delivered', 'delivery.fallback_started'].includes(event.eventType)) return { ...event, eventType: 'delivery.queued', description: 'Local record: external delivery is not verified because no provider is configured.' };
    if (event.eventType === 'call.ended') return { ...event, eventType: 'call.failed', description: 'Local record: call completion is not verified because no telephony provider is configured.' };
    return event;
  });
  const visibleAttachmentIds = new Set(messages.flatMap((message) => message.attachments.map((attachment) => attachment.id)));
  const attachments = conversation.attachments.filter((attachment) => visibleAttachmentIds.has(attachment.id));
  const tasks = conversation.tasks.filter((task) => !task.sourceMessageId || !hiddenMessageIds.has(task.sourceMessageId));
  return { ...conversation, messages, deliveries, attachments, calls, events, tasks };
}

function consumeIssuedAttachments(store: CommunicationStoreData, input: { attachmentIds: string[]; actor: CommunicationActor; patientId?: string; messageId: string }) {
  const attachmentIds = [...new Set(input.attachmentIds)];
  if (attachmentIds.length !== input.attachmentIds.length) throw new Error('ATTACHMENT_INVALID');
  const pending = attachmentIds.map((id) => store.pendingAttachments.find((item) => item.attachment.id === id));
  if (pending.some((item) => !item)) throw new Error('ATTACHMENT_NOT_FOUND');
  for (const item of pending as PendingCommunicationAttachment[]) {
    if (item.issuedToActorId !== input.actor.id || item.attachment.uploadedBy.id !== input.actor.id) throw new Error('ATTACHMENT_NOT_OWNED');
    if (item.consumedAt) throw new Error('ATTACHMENT_ALREADY_USED');
    if (!item.expiresAt || Date.parse(item.expiresAt) <= Date.now()) throw new Error('ATTACHMENT_EXPIRED');
    if (item.attachment.scanState !== 'available') throw new Error('ATTACHMENT_NOT_SAFE');
    if (!samePatientScope(item.attachment.patientId, input.patientId)) throw new Error('PATIENT_CONTEXT_MISMATCH');
  }
  const consumedAt = new Date().toISOString();
  for (const item of pending as PendingCommunicationAttachment[]) {
    item.consumedAt = consumedAt;
    item.consumedByMessageId = input.messageId;
  }
  return (pending as PendingCommunicationAttachment[]).map((item) => item.attachment);
}

function resolveIssuedDraftAttachments(store: CommunicationStoreData, input: { attachmentIds: string[]; actor: CommunicationActor; patientId?: string }) {
  const attachmentIds = [...new Set(input.attachmentIds)];
  if (attachmentIds.length !== input.attachmentIds.length) throw new Error('ATTACHMENT_INVALID');
  const pending = attachmentIds.map((attachmentId) => {
    const item = store.pendingAttachments.find((candidate) => candidate.attachment.id === attachmentId);
    if (!item) throw new Error('ATTACHMENT_NOT_FOUND');
    if (item.issuedToActorId !== input.actor.id) throw new Error('ATTACHMENT_NOT_OWNED');
    if (item.consumedAt) throw new Error('ATTACHMENT_ALREADY_USED');
    if (!item.expiresAt || Date.parse(item.expiresAt) <= Date.now()) throw new Error('ATTACHMENT_EXPIRED');
    if (item.attachment.scanState !== 'available') throw new Error('ATTACHMENT_NOT_SAFE');
    if (!samePatientScope(item.attachment.patientId, input.patientId)) throw new Error('PATIENT_CONTEXT_MISMATCH');
    return item;
  });
  return pending.map((item) => item.attachment);
}

function completeCommunicationDraft(store: CommunicationStoreData, actor: CommunicationActor, draftId?: string) {
  if (!draftId) return;
  const submitted = store.submittedDrafts.find((draft) => draft.id === draftId);
  if (submitted) {
    if (submitted.actorId !== actor.id) throw new Error('DRAFT_NOT_OWNED');
    throw new Error('DRAFT_ALREADY_SUBMITTED');
  }
  const index = store.drafts.findIndex((draft) => draft.id === draftId);
  if (index >= 0) {
    if (store.drafts[index]!.actorId !== actor.id) throw new Error('DRAFT_NOT_OWNED');
    store.drafts.splice(index, 1);
  }
  store.submittedDrafts.push({ id: draftId, actorId: actor.id, submittedAt: new Date().toISOString() });
  if (store.submittedDrafts.length > 500) store.submittedDrafts.splice(0, store.submittedDrafts.length - 500);
}

function summary(conversation: CommunicationConversation, actorId: string): ConversationSummary {
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const other = conversation.participants.find((participant) => participant.id !== actorId) || conversation.participants[0];
  const unread = conversation.messages.some((message) => !message.readBy.includes(actorId) && message.sender.id !== actorId && !message.isInternalNote);
  const deliveryIssue = conversation.deliveries.some((delivery) => ['queued', 'deferred', 'retry_scheduled', 'failed_transient', 'failed_permanent', 'bounced', 'policy_blocked'].includes(delivery.state));
  const patient = conversation.patientId ? getPatientById(conversation.patientId) : undefined;
  const channelValues: CommunicationChannel[] = [...conversation.messages.map((message) => message.channel)];
  if (conversation.calls.length) channelValues.push('call');
  if (conversation.voicemails.length) channelValues.push('voicemail');
  const channels = [...new Set(channelValues)];
  return { id: conversation.id, patientId: conversation.patientId, patientName: patient?.name, participantName: other?.name || 'Unassigned', participantRole: other?.role, organizationName: other?.organizationName, topic: conversation.topic, category: conversation.category, priority: conversation.priority, state: conversation.state, lastActivityAt: conversation.lastActivityAt, preview: lastMessage?.bodyText || (conversation.calls.length ? 'Call activity recorded' : conversation.voicemails.length ? 'Voicemail activity recorded' : 'No messages yet'), channel: lastMessage?.channel || (conversation.calls.length ? 'call' : conversation.voicemails.length ? 'voicemail' : 'system'), channels, unread, actionRequired: conversation.messages.some((message) => message.actionRequired) || conversation.tasks.some((task) => task.status !== 'completed'), awaitingResponse: conversation.state === 'awaiting_response', deliveryIssue, attachmentCount: conversation.attachments.length, callCount: conversation.calls.length, voicemailCount: conversation.voicemails.length };
}

function buildTimeline(conversation: CommunicationConversation) {
  const messageEvents = conversation.messages.map((message) => ({ id: `message-${message.id}`, eventType: message.isInternalNote ? 'internal_note.added' : `message.${message.channel}`, occurredAt: message.sentAt || message.receivedAt || message.createdAt, conversationId: conversation.id, messageId: message.id, actor: message.sender, description: message.isInternalNote ? 'Internal note added - not visible to patient' : `${message.sender.name} recorded a ${message.channel.replace('_', ' ')} communication` } satisfies CommunicationEvent));
  return [...conversation.events, ...messageEvents].sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt));
}

function buildSummary(conversation: CommunicationConversation) {
  const sourceMessageIds = conversation.messages.map((message) => message.id);
  const latest = conversation.messages[conversation.messages.length - 1];
  const actions = conversation.tasks.filter((task) => task.status !== 'completed').length;
  const deliveryIssues = conversation.deliveries.filter((delivery) => ['deferred', 'retry_scheduled', 'failed_transient', 'failed_permanent', 'bounced'].includes(delivery.state)).length;
  const text = latest ? `${latest.sender.name} last communicated about ${conversation.topic.toLowerCase()}. ${actions ? `${actions} follow-up task${actions === 1 ? '' : 's'} remain${actions === 1 ? 's' : ''} open.` : 'No open follow-up task is recorded.'}${deliveryIssues ? ` ${deliveryIssues} delivery path${deliveryIssues === 1 ? ' is' : 's are'} still unresolved.` : ''}` : `No messages have been recorded for ${conversation.topic.toLowerCase()}.`;
  return { text, generatedBy: 'rules' as const, sourceMessageIds };
}

export async function getCommunicationHubSnapshot(actor: CommunicationActor, options: { query?: string; folder?: string; channel?: string; patientId?: string } = {}): Promise<CommunicationHubSnapshot> {
  let store = await readStore();
  const activeCallIds = store.conversations
    .filter((conversation) => isParticipant(conversation, actor.id))
    .flatMap((conversation) => conversation.calls)
    .filter(shouldSynchronizeProviderCall)
    .map((call) => call.id);
  if (activeCallIds.length) {
    await Promise.all(activeCallIds.map((callId) => synchronizeCommunicationCall(callId, actor).catch(() => null)));
    store = await readStore();
  }
  const query = (options.query || '').trim().toLowerCase();
  const drafts = store.drafts.filter((draft) => draft.actorId === actor.id && (!options.patientId || draft.patientId === options.patientId)).sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  const all = store.conversations.map((conversation) => presentLocalConversation(conversation, actor.id)).filter((conversation) => isParticipant(conversation, actor.id) && (!options.patientId || conversation.patientId === options.patientId));
  const summaries = all.map((conversation) => summary(conversation, actor.id)).filter((item) => !query || [item.topic, item.patientName, item.participantName, item.organizationName, item.preview, item.category].filter(Boolean).join(' ').toLowerCase().includes(query)).filter((item) => {
    switch (options.folder) {
      case 'sent': return item.channel !== 'voicemail' && !item.unread;
      case 'awaitingResponse': return item.awaitingResponse;
      case 'needsAction': return item.actionRequired;
      case 'urgent': return ['urgent', 'asap', 'stat'].includes(item.priority);
      case 'calls': return item.callCount > 0;
      case 'voicemail': return item.voicemailCount > 0;
      case 'deliveryIssues': return item.deliveryIssue;
      case 'archived': return item.state === 'archived';
      case 'drafts': return false;
      default: return item.state !== 'archived';
    }
  }).filter((item) => !options.channel || options.channel === 'all' || item.channels.includes(options.channel as CommunicationChannel)).sort((left, right) => Date.parse(right.lastActivityAt) - Date.parse(left.lastActivityAt));
  const folderCounts = all.map((item) => summary(item, actor.id));
  const providers = getCommunicationProviderStatus();
  return { actor, generatedAt: new Date().toISOString(), folders: { inbox: folderCounts.filter((item) => item.state !== 'archived' && item.unread).length, sent: folderCounts.filter((item) => !item.unread).length, drafts: drafts.length, awaitingResponse: folderCounts.filter((item) => item.awaitingResponse).length, needsAction: folderCounts.filter((item) => item.actionRequired).length, urgent: folderCounts.filter((item) => ['urgent', 'asap', 'stat'].includes(item.priority)).length, calls: folderCounts.filter((item) => item.callCount > 0).length, voicemail: folderCounts.filter((item) => item.voicemailCount > 0).length, deliveryIssues: folderCounts.filter((item) => item.deliveryIssue).length, archived: folderCounts.filter((item) => item.state === 'archived').length }, conversations: summaries, drafts, directory: store.directory, providerStatus: { email: providers.email, telephony: providers.telephony, secureMessaging: { available: false, reason: 'Local acceptance is available, but no external secure-messaging provider is configured.' } } };
}

export async function getCommunicationConversation(conversationId: string, actor: CommunicationActor): Promise<CommunicationConversationView | null> {
  let store = await readStore();
  const activeCallIds = store.conversations.find((item) => item.id === conversationId)?.calls.filter(shouldSynchronizeProviderCall).map((call) => call.id) || [];
  if (activeCallIds.length) {
    await Promise.all(activeCallIds.map((callId) => synchronizeCommunicationCall(callId, actor).catch(() => null)));
    store = await readStore();
  }
  const storedConversation = store.conversations.find((item) => item.id === conversationId);
  if (!storedConversation || !isParticipant(storedConversation, actor.id)) return null;
  const conversation = presentLocalConversation(storedConversation, actor.id);
  return { ...conversation, patientContext: patientContext(conversation.patientId), timeline: buildTimeline(conversation), summary: buildSummary(conversation) };
}

export async function createCommunicationConversation(input: { actor: CommunicationActor; patientId?: string; recipientId?: string; subject: string; bodyText: string; category: string; priority: CommunicationPriority; channel: CommunicationChannel; idempotencyKey: string; attachmentIds?: string[]; draftId?: string; requiresAcknowledgement?: boolean; isInternalNote?: boolean }): Promise<CommunicationConversation> {
  return withWriteLock(async () => {
    const store = await readStore();
    const recipient = input.isInternalNote ? undefined : store.directory.find((entry) => entry.id === input.recipientId);
    if (!recipient && !input.isInternalNote) throw new Error('RECIPIENT_NOT_FOUND');
    if (recipient?.id === input.actor.id) throw new Error('RECIPIENT_NOT_AUTHORIZED');
    if (input.patientId && !getPatientById(input.patientId)) throw new Error('PATIENT_CONTEXT_MISMATCH');
    if (recipient) assertRecipientMatchesPatientContext(recipient, input.patientId);
    const existing = store.conversations.find((conversation) => conversation.messages.some((message) => message.sender.id === input.actor.id && message.idempotencyKey === input.idempotencyKey));
    if (existing) {
      const existingMessage = existing.messages.find((message) => message.sender.id === input.actor.id && message.idempotencyKey === input.idempotencyKey)!;
      const sameRequest = existing.patientId === input.patientId
        && sameIds(existingMessage.recipients.map((item) => item.id), recipient ? [recipient.id] : [])
        && existingMessage.subject === input.subject.trim()
        && existingMessage.bodyText === input.bodyText.trim()
        && existingMessage.category === input.category
        && existingMessage.priority === input.priority
        && existingMessage.channel === input.channel
        && existingMessage.requiresAcknowledgement === (input.requiresAcknowledgement === true)
        && existingMessage.isInternalNote === (input.isInternalNote === true)
        && sameIds(existingMessage.attachments.map((attachment) => attachment.id), input.attachmentIds || []);
      if (!sameRequest) throw new Error('IDEMPOTENCY_CONFLICT');
      return presentLocalConversation(existing, input.actor.id);
    }
    const now = new Date().toISOString();
    const conversationId = randomUUID();
    const messageId = randomUUID();
    completeCommunicationDraft(store, input.actor, input.draftId);
    const attachments = consumeIssuedAttachments(store, { attachmentIds: input.attachmentIds || [], actor: input.actor, patientId: input.patientId, messageId });
    const message: CommunicationMessage = { id: messageId, conversationId, sender: input.actor, recipients: recipient ? [recipient] : [], channel: input.channel, subject: input.subject.trim(), bodyText: input.bodyText.trim(), category: input.category, priority: input.priority, messageState: 'accepted', createdAt: now, submittedAt: now, requiresAcknowledgement: input.requiresAcknowledgement === true, actionRequired: false, isInternalNote: input.isInternalNote === true, attachments, readBy: [input.actor.id], acknowledgements: [], idempotencyKey: input.idempotencyKey };
    const conversation: CommunicationConversation = { id: conversationId, tenantId: 'default', patientId: input.patientId, topic: input.subject.trim(), category: input.category, priority: input.priority, sensitivity: input.patientId ? 'sensitive' : 'normal', state: 'open', participants: [actorParticipant(input.actor), ...(recipient ? [recipient] : [])], createdBy: input.actor, createdAt: now, updatedAt: now, lastActivityAt: now, messages: [message], deliveries: [], attachments, calls: [], voicemails: [], tasks: [], events: [] };
    store.conversations.unshift(conversation);
    addEvent(conversation, { eventType: 'message.accepted', occurredAt: now, actor: input.actor, messageId: message.id, description: 'Message accepted by Roshi and persisted locally' });
    if (!message.isInternalNote && recipient) {
      const delivery = queueUnconfiguredDelivery({ messageId: message.id, recipient, channel: input.channel, now });
      conversation.deliveries.push(delivery);
      addEvent(conversation, { eventType: 'delivery.queued', occurredAt: now, actor: input.actor, messageId: message.id, deliveryId: delivery.id, description: `${recipient.name} delivery is queued; no approved provider is configured` });
    } // No provider delivery is attempted here.
    await writeStore(store);
    return presentLocalConversation(conversation, input.actor.id);
  });
}

export async function appendCommunicationMessage(input: { conversationId: string; actor: CommunicationActor; patientId?: string; recipientId?: string; bodyText: string; subject?: string; channel?: CommunicationChannel; category?: string; priority?: CommunicationPriority; idempotencyKey: string; attachmentIds?: string[]; draftId?: string; isInternalNote?: boolean; requiresAcknowledgement?: boolean }): Promise<CommunicationConversation | null> {
  return withWriteLock(async () => {
    const store = await readStore();
    const conversation = store.conversations.find((item) => item.id === input.conversationId);
    if (!conversation || !isParticipant(conversation, input.actor.id)) return null;
    if (input.patientId && input.patientId !== conversation.patientId) throw new Error('PATIENT_CONTEXT_MISMATCH');
    const recipientCandidates = conversation.participants.filter((participant) => participant.id !== input.actor.id);
    const recipient = input.isInternalNote ? undefined : input.recipientId ? recipientCandidates.find((participant) => participant.id === input.recipientId) : recipientCandidates.length === 1 ? recipientCandidates[0] : undefined;
    if (!recipient && !input.isInternalNote) throw new Error(input.recipientId || recipientCandidates.length <= 1 ? 'RECIPIENT_NOT_AUTHORIZED' : 'RECIPIENT_SELECTION_REQUIRED');
    const existing = conversation.messages.find((message) => message.sender.id === input.actor.id && message.idempotencyKey === input.idempotencyKey);
    if (existing) {
      const sameRequest = existing.bodyText === input.bodyText.trim()
        && sameIds(existing.recipients.map((item) => item.id), recipient ? [recipient.id] : [])
        && existing.subject === (input.subject || `Re: ${conversation.topic}`)
        && existing.channel === (input.channel || 'secure_message')
        && existing.category === (input.category || conversation.category)
        && existing.priority === (input.priority || conversation.priority)
        && existing.requiresAcknowledgement === (input.requiresAcknowledgement === true)
        && existing.isInternalNote === (input.isInternalNote === true)
        && sameIds(existing.attachments.map((attachment) => attachment.id), input.attachmentIds || []);
      if (!sameRequest) throw new Error('IDEMPOTENCY_CONFLICT');
      return presentLocalConversation(conversation, input.actor.id);
    }
    if (['closed', 'archived'].includes(conversation.state)) throw new Error('CONVERSATION_CLOSED');
    const now = new Date().toISOString();
    const messageId = randomUUID();
    completeCommunicationDraft(store, input.actor, input.draftId);
    const attachments = consumeIssuedAttachments(store, { attachmentIds: input.attachmentIds || [], actor: input.actor, patientId: conversation.patientId, messageId });
    const message: CommunicationMessage = { id: messageId, conversationId: conversation.id, sender: input.actor, recipients: recipient ? [recipient] : [], channel: input.channel || 'secure_message', subject: input.subject || `Re: ${conversation.topic}`, bodyText: input.bodyText.trim(), category: input.category || conversation.category, priority: input.priority || conversation.priority, messageState: 'accepted', createdAt: now, submittedAt: now, replyToMessageId: conversation.messages[conversation.messages.length - 1]?.id, requiresAcknowledgement: input.requiresAcknowledgement === true, actionRequired: false, isInternalNote: input.isInternalNote === true, attachments, readBy: [input.actor.id], acknowledgements: [], idempotencyKey: input.idempotencyKey };
    conversation.messages.push(message);
    conversation.attachments.push(...attachments);
    if (!message.isInternalNote && recipient) {
      const delivery = queueUnconfiguredDelivery({ messageId: message.id, recipient, channel: message.channel, now });
      conversation.deliveries.push(delivery);
      addEvent(conversation, { eventType: 'delivery.queued', occurredAt: now, actor: input.actor, messageId: message.id, deliveryId: delivery.id, description: `${recipient.name} delivery is queued; no approved provider is configured` });
    }
    addEvent(conversation, { eventType: message.isInternalNote ? 'internal_note.added' : 'message.submitted', occurredAt: now, actor: input.actor, messageId: message.id, description: message.isInternalNote ? 'Internal note added - not visible to patient' : 'Message submitted and retained in the conversation' });
    await writeStore(store);
    return presentLocalConversation(conversation, input.actor.id);
  });
}

export async function markCommunicationRead(conversationId: string, actor: CommunicationActor, patientId?: string) {
  return withWriteLock(async () => {
    const store = await readStore();
    const conversation = store.conversations.find((item) => item.id === conversationId);
    if (!conversation || !isParticipant(conversation, actor.id)) return null;
    if (patientId && patientId !== conversation.patientId) throw new Error('PATIENT_CONTEXT_MISMATCH');
    const now = new Date().toISOString();
    conversation.messages = conversation.messages.map((message) => message.readBy.includes(actor.id) ? message : { ...message, readBy: [...message.readBy, actor.id] });
    addEvent(conversation, { eventType: 'recipient.read', occurredAt: now, actor, description: `${actor.name} opened the conversation` });
    await writeStore(store);
    return presentLocalConversation(conversation, actor.id);
  });
}

export async function acknowledgeCommunicationMessage(messageId: string, actor: CommunicationActor, note?: string, idempotencyKey?: string, patientId?: string) {
  return withWriteLock(async () => {
    const store = await readStore();
    const conversation = store.conversations.find((item) => item.messages.some((message) => message.id === messageId));
    const message = conversation?.messages.find((item) => item.id === messageId);
    if (!conversation || !message || !isParticipant(conversation, actor.id)) return null;
    if (patientId && patientId !== conversation.patientId) throw new Error('PATIENT_CONTEXT_MISMATCH');
    if (!message.requiresAcknowledgement || message.sender.id === actor.id || !message.recipients.some((recipient) => recipient.id === actor.id)) throw new Error('ACKNOWLEDGEMENT_NOT_AUTHORIZED');
    if (message.acknowledgements.some((acknowledgement) => acknowledgement.actor.id === actor.id)) return presentLocalConversation(conversation, actor.id);
    message.acknowledgements.push({ id: randomUUID(), actor, systemId: 'roshi-communication-hub', recordedAt: new Date().toISOString(), note });
    addEvent(conversation, { eventType: 'recipient.acknowledged', occurredAt: new Date().toISOString(), actor, messageId, description: `${actor.name} acknowledged the communication`, metadata: { note: note || null, idempotencyKey: idempotencyKey || null } });
    await writeStore(store);
    return presentLocalConversation(conversation, actor.id);
  });
}

export async function createCommunicationTask(input: { conversationId: string; messageId?: string; actor: CommunicationActor; patientId?: string; title: string; priority: CommunicationPriority; dueAt?: string; idempotencyKey: string }) {
  return withWriteLock(async () => {
    const store = await readStore();
    const conversation = store.conversations.find((item) => item.id === input.conversationId);
    if (!conversation || !isParticipant(conversation, input.actor.id)) return null;
    if (input.patientId && input.patientId !== conversation.patientId) throw new Error('PATIENT_CONTEXT_MISMATCH');
    if (input.messageId && !conversation.messages.some((message) => message.id === input.messageId)) throw new Error('MESSAGE_NOT_FOUND');
    const replay = conversation.events.find((event) => event.eventType === 'task.created' && event.metadata?.idempotencyKey === input.idempotencyKey);
    if (replay?.taskId) return conversation.tasks.find((task) => task.id === replay.taskId) || null;
    const now = new Date().toISOString();
    const task: CommunicationTask = { id: randomUUID(), conversationId: conversation.id, sourceMessageId: input.messageId, title: input.title.trim(), status: 'requested', priority: input.priority, assignedTo: input.actor, dueAt: input.dueAt, createdAt: now };
    conversation.tasks.push(task);
    addEvent(conversation, { eventType: 'task.created', occurredAt: now, actor: input.actor, messageId: input.messageId, taskId: task.id, description: `Task created: ${task.title}`, metadata: { idempotencyKey: input.idempotencyKey } });
    await writeStore(store);
    return task;
  });
}

export async function resolveCommunicationConversation(conversationId: string, actor: CommunicationActor, state: ConversationState = 'resolved', idempotencyKey?: string, patientId?: string) {
  return withWriteLock(async () => {
    const store = await readStore();
    const conversation = store.conversations.find((item) => item.id === conversationId);
    if (!conversation || !isParticipant(conversation, actor.id)) return null;
    if (patientId && patientId !== conversation.patientId) throw new Error('PATIENT_CONTEXT_MISMATCH');
    if (idempotencyKey && conversation.events.some((event) => event.eventType === `conversation.${state}` && event.metadata?.idempotencyKey === idempotencyKey)) return presentLocalConversation(conversation, actor.id);
    if (['closed', 'archived'].includes(conversation.state)) throw new Error('CONVERSATION_CLOSED');
    conversation.state = state;
    addEvent(conversation, { eventType: `conversation.${state}`, occurredAt: new Date().toISOString(), actor, description: `Conversation marked ${state.replace('_', ' ')}`, metadata: { idempotencyKey: idempotencyKey || null } });
    await writeStore(store);
    return presentLocalConversation(conversation, actor.id);
  });
}

export async function recordManualDeliveryConfirmation(input: { messageId: string; deliveryId: string; actor: CommunicationActor; patientId?: string; method: string; confirmedWith: string; confirmedAt: string; note: string; idempotencyKey: string }) {
  return withWriteLock(async () => {
    const store = await readStore();
    const conversation = store.conversations.find((item) => item.messages.some((message) => message.id === input.messageId));
    if (!conversation || !isParticipant(conversation, input.actor.id)) return null;
    if (input.patientId && input.patientId !== conversation.patientId) throw new Error('PATIENT_CONTEXT_MISMATCH');
    const replay = conversation.events.find((event) => event.eventType === 'manual_delivery_confirmation.recorded' && event.metadata?.idempotencyKey === input.idempotencyKey);
    if (replay) {
      if (replay.messageId !== input.messageId || replay.deliveryId !== input.deliveryId) throw new Error('IDEMPOTENCY_CONFLICT');
      return presentLocalConversation(conversation, input.actor.id);
    }
    const delivery = conversation.deliveries.find((item) => item.id === input.deliveryId && item.messageId === input.messageId);
    if (!delivery) throw new Error('DELIVERY_NOT_FOUND');
    const confirmation = { id: randomUUID(), method: input.method, confirmedWith: input.confirmedWith, confirmedAt: input.confirmedAt, note: input.note, actor: input.actor };
    delivery.manualConfirmations = [...(delivery.manualConfirmations || (delivery.manualConfirmation ? [delivery.manualConfirmation] : [])), confirmation];
    delivery.manualConfirmation = confirmation;
    addEvent(conversation, { eventType: 'manual_delivery_confirmation.recorded', occurredAt: new Date().toISOString(), actor: input.actor, messageId: input.messageId, deliveryId: delivery.id, description: `Manual delivery confirmation recorded by ${input.method}`, metadata: { idempotencyKey: input.idempotencyKey, manualConfirmationId: confirmation.id, method: confirmation.method, confirmedWith: confirmation.confirmedWith, confirmedAt: confirmation.confirmedAt, note: confirmation.note } });
    await writeStore(store);
    return presentLocalConversation(conversation, input.actor.id);
  });
}

export async function createCommunicationAttachment(input: { actor: CommunicationActor; patientId?: string; filename: string; contentType: string; sizeBytes: number; source?: CommunicationSourceContext }) {
  if (input.patientId && !getPatientById(input.patientId)) throw new Error('PATIENT_CONTEXT_MISMATCH');
  if (input.source && (!input.patientId || input.source.resourceType !== 'Patient' || input.source.resourceId !== input.patientId)) throw new Error('PATIENT_CONTEXT_MISMATCH');
  const valid = ALLOWED_ATTACHMENT_TYPES.has(input.contentType) && input.sizeBytes >= 0 && input.sizeBytes <= MAX_ATTACHMENT_BYTES;
  const now = new Date().toISOString();
  const attachment: CommunicationAttachment = { id: randomUUID(), filename: input.filename.trim().slice(0, 200), contentType: input.contentType, sizeBytes: input.sizeBytes, sha256: 'unavailable-until-upload', source: input.source, uploadedBy: input.actor, createdAt: now, scanState: valid ? 'available' : 'blocked', scanner: 'local-metadata-policy', storageReference: `local://communication-attachments/${randomUUID()}`, patientId: input.patientId };
  if (!valid) return attachment;
  await withWriteLock(async () => {
    const store = await readStore();
    store.pendingAttachments.push({ attachment, issuedToActorId: input.actor.id, issuedAt: now, expiresAt: new Date(Date.parse(now) + PENDING_ATTACHMENT_TTL_MS).toISOString() });
    await writeStore(store);
  });
  return attachment;
}

export async function saveCommunicationDraft(input: { id: string; revision: number; actor: CommunicationActor; conversationId?: string; patientId?: string; recipientId?: string; channel: 'secure_message' | 'email'; subject: string; bodyText: string; category?: string; priority?: CommunicationPriority; requiresAcknowledgement?: boolean; isInternalNote?: boolean; attachmentIds?: string[] }) {
  return withWriteLock(async () => {
    const store = await readStore();
    const submitted = store.submittedDrafts.find((draft) => draft.id === input.id);
    if (submitted) throw new Error(submitted.actorId === input.actor.id ? 'DRAFT_ALREADY_SUBMITTED' : 'DRAFT_NOT_OWNED');
    if (input.patientId && !getPatientById(input.patientId)) throw new Error('PATIENT_CONTEXT_MISMATCH');
    const conversation = input.conversationId ? store.conversations.find((item) => item.id === input.conversationId) : undefined;
    if (input.conversationId && (!conversation || !isParticipant(conversation, input.actor.id))) throw new Error('CONVERSATION_NOT_FOUND');
    if (conversation && !samePatientScope(input.patientId, conversation.patientId)) throw new Error('PATIENT_CONTEXT_MISMATCH');
    const patientId = conversation?.patientId || input.patientId;
    const recipient = input.recipientId ? store.directory.find((entry) => entry.id === input.recipientId) : undefined;
    if (input.recipientId && !recipient) throw new Error('RECIPIENT_NOT_FOUND');
    if (conversation && recipient && !conversation.participants.some((participant) => participant.id === recipient.id)) throw new Error('RECIPIENT_NOT_AUTHORIZED');
    if (recipient) assertRecipientMatchesPatientContext(recipient, patientId);
    const index = store.drafts.findIndex((item) => item.id === input.id);
    if (index >= 0 && store.drafts[index]!.actorId !== input.actor.id) throw new Error('DRAFT_NOT_OWNED');
    if (index >= 0 && store.drafts[index]!.revision !== input.revision) throw new Error('DRAFT_VERSION_CONFLICT');
    const attachments = resolveIssuedDraftAttachments(store, { attachmentIds: input.attachmentIds || [], actor: input.actor, patientId });
    const draft: CommunicationDraft = { id: input.id, actorId: input.actor.id, revision: index >= 0 ? store.drafts[index]!.revision + 1 : 1, conversationId: input.conversationId, patientId, recipientId: input.isInternalNote ? undefined : input.recipientId, channel: input.channel, subject: input.subject, bodyText: input.bodyText, category: input.category || 'General', priority: input.priority || 'routine', requiresAcknowledgement: input.requiresAcknowledgement === true, isInternalNote: input.isInternalNote === true, attachments, updatedAt: new Date().toISOString() };
    if (index >= 0) store.drafts[index] = draft; else store.drafts.push(draft);
    await writeStore(store);
    return draft;
  });
}

export async function getCommunicationDrafts(actor: CommunicationActor, patientId?: string) {
  const store = await readStore();
  return store.drafts.filter((draft) => draft.actorId === actor.id && (!patientId || draft.patientId === patientId)).sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export async function listCommunicationCalls(actor: CommunicationActor, options: CommunicationCallListOptions = {}): Promise<CommunicationCallListResult> {
  const statuses = options.statuses || [];
  if (!statuses.every((status) => isCommunicationCallState(status))) throw new Error('CALL_STATUS_INVALID');
  const from = options.from ? Date.parse(options.from) : undefined;
  const to = options.to ? Date.parse(options.to) : undefined;
  if (options.from && !Number.isFinite(from)) throw new Error('CALL_DATE_INVALID');
  if (options.to && !Number.isFinite(to)) throw new Error('CALL_DATE_INVALID');
  if (from !== undefined && to !== undefined && from > to) throw new Error('CALL_DATE_RANGE_INVALID');
  const limit = options.limit ?? 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('CALL_LIMIT_INVALID');
  const cursor = options.cursor ? decodeCallCursor(options.cursor) : undefined;
  const store = await readCallStore();
  const calls = store.conversations
    .filter((conversation) => isParticipant(conversation, actor.id))
    .flatMap((conversation) => conversation.calls.map((call) => presentLocalCall({ ...call, patientId: call.patientId || conversation.patientId })))
    .filter((call) => !options.patientId || call.patientId === options.patientId)
    .filter((call) => !options.conversationId || call.conversationId === options.conversationId)
    .filter((call) => statuses.length === 0 || statuses.includes(call.state))
    .filter((call) => from === undefined || callStartedAt(call) >= from)
    .filter((call) => to === undefined || callStartedAt(call) <= to)
    .sort(compareCallsNewestFirst)
    .filter((call) => !cursor || followsCallCursor(call, cursor));
  const page = calls.slice(0, limit);
  const refreshedPage = await Promise.all(page.map(async (call) => {
    if (!shouldSynchronizeProviderCall(call)) return call;
    return (await synchronizeCommunicationCall(call.id, actor, call.patientId).catch(() => null)) || call;
  }));
  return { calls: refreshedPage, nextCursor: calls.length > page.length && page.length > 0 ? encodeCallCursor(page[page.length - 1]!) : undefined };
}

export async function getCommunicationCall(callId: string, actor: CommunicationActor, patientId?: string): Promise<CommunicationCall | null> {
  const synchronized = await synchronizeCommunicationCall(callId, actor, patientId).catch(() => null);
  if (synchronized) return synchronized;
  const store = await readCallStore();
  const conversation = store.conversations.find((candidate) => candidate.calls.some((call) => call.id === callId));
  const call = conversation?.calls.find((candidate) => candidate.id === callId);
  if (!conversation || !call || !isParticipant(conversation, actor.id)) return null;
  const scopedPatientId = call.patientId || conversation.patientId;
  if (patientId && patientId !== scopedPatientId) return null;
  return presentLocalCall({ ...call, patientId: scopedPatientId });
}

// This returns display data only after the ordinary call-record authorization
// check. It deliberately does not turn a Patient reference, a portal contact,
// or an Appointment reference into a clinical authorization decision.
export async function getTelehealthMeetingContext(callId: string, actor: CommunicationActor, patientId?: string): Promise<TelehealthMeetingContext | null> {
  const store = await readCallStore();
  const conversation = store.conversations.find((candidate) => candidate.calls.some((call) => call.id === callId));
  const call = conversation?.calls.find((candidate) => candidate.id === callId);
  if (!conversation || !call || !isParticipant(conversation, actor.id)) return null;
  const scopedPatientId = call.patientId || conversation.patientId;
  if (patientId && patientId !== scopedPatientId) return null;

  const base: TelehealthMeetingContext = { callId, eligible: false, localDemoAllowed: false };
  if (!call.controlPlaneCallId || call.provider !== 'livekit') return { ...base, code: 'MEDIA_JOIN_NOT_AVAILABLE', detail: 'This call has no active LiveKit control-plane session.' };
  if (CALL_TERMINAL_STATES.has(call.state)) return { ...base, code: 'CALL_NOT_JOINABLE', detail: 'This call is already complete or unavailable for media join.' };
  if (!scopedPatientId) return { ...base, code: 'TELEHEALTH_PATIENT_CONTEXT_REQUIRED', detail: 'A verified patient context is required before a telehealth meeting can be opened.' };

  const patient = patientParticipantFor(conversation, scopedPatientId);
  if (!patient) return { ...base, code: 'TELEHEALTH_PATIENT_PARTICIPANT_REQUIRED', detail: 'The verified patient must be an authorized participant before a telehealth meeting can be opened.' };
  const clinician = conversation.participants.find((participant) => participant.id === actor.id && (participant.type === 'practitioner' || participant.type === 'practitioner_role'));
  if (!clinician) return { ...base, code: 'TELEHEALTH_CLINICIAN_PARTICIPANT_REQUIRED', detail: 'An authorized clinician participant is required before a telehealth meeting can be opened.' };
  const appointmentId = call.appointmentId || conversation.appointmentId;
  const encounterId = call.encounterId || conversation.encounterId;
  if (!appointmentId && !encounterId) return { ...base, code: 'TELEHEALTH_VISIT_CONTEXT_REQUIRED', detail: 'A verified Appointment or Encounter context is required before a telehealth meeting can be opened.' };
  if (!call.callType || !isVideoCallType(call.callType)) return { ...base, code: 'TELEHEALTH_VIDEO_CALL_REQUIRED', detail: 'Only a verified video visit may request a telehealth media credential.' };

  const context = {
    ...base,
    patient: { id: patient.id, name: patient.name },
    clinician: { id: clinician.id, name: clinician.name, role: clinician.role || actor.role },
    visit: { label: appointmentId ? 'Scheduled telehealth visit' : 'Encounter-linked telehealth visit' },
  };
  if (!localTelehealthDemoEnabled()) {
    return { ...context, code: 'TELEHEALTH_ELIGIBILITY_UNAVAILABLE', detail: 'Patient-account, care-relationship, and visit authorization must be verified by the configured telehealth eligibility service before media access is granted.' };
  }
  return { ...context, eligible: true, localDemoAllowed: true, detail: 'Synthetic local-development eligibility is enabled. This is not production patient access.' };
}

// Ending a meeting is a control-plane operation. Disconnecting browser media
// alone must not be presented as a completed call, so the durable provider
// result is required before the local timeline is changed.
export async function endCommunicationCall(input: { callId: string; actor: CommunicationActor; patientId?: string; correlationId?: string }): Promise<CommunicationCall | null> {
  return withWriteLock(async () => {
    const store = await readCallStore();
    const conversation = store.conversations.find((candidate) => candidate.calls.some((call) => call.id === input.callId));
    const call = conversation?.calls.find((candidate) => candidate.id === input.callId);
    if (!conversation || !call || !isParticipant(conversation, input.actor.id)) return null;
    const scopedPatientId = call.patientId || conversation.patientId;
    if (input.patientId && input.patientId !== scopedPatientId) return null;
    if (CALL_TERMINAL_STATES.has(call.state)) return presentLocalCall({ ...call, patientId: scopedPatientId });
    if (!call.controlPlaneCallId || call.provider !== 'livekit') throw new Error('MEDIA_END_NOT_AVAILABLE');

    const result = await getTelephonyCommunicationProvider().endCall({
      actor: { id: input.actor.id, role: input.actor.role },
      callId: call.controlPlaneCallId,
      correlationId: input.correlationId || randomUUID(),
    });
    const occurredAt = new Date().toISOString();
    applyProviderCallResult(call, result, input.actor, occurredAt, 'provider_status');
    addEvent(conversation, {
      eventType: 'call.provider_ended',
      occurredAt,
      actor: input.actor,
      callId: call.id,
      description: 'Call provider confirmed that media ended',
      metadata: { provider: result.provider, controlPlaneCallId: result.callId },
    });
    await writeCallStore(store);
    return presentLocalCall({ ...call, patientId: scopedPatientId });
  });
}

export async function updateCommunicationCall(input: { callId: string; actor: CommunicationActor; patientId?: string; action: CommunicationCallAction; idempotencyKey: string; note?: string; dispositionCode?: string }): Promise<CommunicationCallActionResult | null> {
  return withWriteLock(async () => {
    if (!input.idempotencyKey.trim()) throw new Error('IDEMPOTENCY_REQUIRED');
    if (!isCommunicationCallAction(input.action)) throw new Error('CALL_ACTION_UNSUPPORTED');
    const store = await readCallStore();
    const conversation = store.conversations.find((candidate) => candidate.calls.some((call) => call.id === input.callId));
    const call = conversation?.calls.find((candidate) => candidate.id === input.callId);
    if (!conversation || !call || !isParticipant(conversation, input.actor.id)) return null;
    if (input.patientId && input.patientId !== (call.patientId || conversation.patientId)) throw new Error('PATIENT_CONTEXT_MISMATCH');
    const note = input.note?.trim();
    const dispositionCode = input.dispositionCode?.trim();
    const requestHash = callActionHash(input.action, note, dispositionCode);
    const replay = actionReceipts(call).find((receipt) => receipt.idempotencyKey === input.idempotencyKey);
    if (replay) {
      if (replay.action !== input.action || replay.requestHash !== requestHash) throw new Error('IDEMPOTENCY_CONFLICT');
      return { call: presentLocalCall({ ...call, patientId: call.patientId || conversation.patientId }), providerUnavailable: replay.outcome === 'provider_unavailable', replayed: true };
    }
    const now = new Date().toISOString();
    if (input.action === 'add_note') {
      if (!note || note.length > 4000) throw new Error('CALL_NOTE_INVALID');
      call.notes.push(note);
      appendCallHistory(call, { action: input.action, fromState: call.state, toState: call.state, occurredAt: now, actor: input.actor, result: 'applied' });
      actionReceipts(call).push({ idempotencyKey: input.idempotencyKey, action: input.action, requestHash, outcome: 'applied', recordedAt: now });
      addEvent(conversation, { eventType: 'call.note_added', occurredAt: now, actor: input.actor, callId: call.id, description: 'Call note recorded locally', metadata: { idempotencyKey: input.idempotencyKey, action: input.action, noteLength: note.length } });
      await writeCallStore(store);
      return { call: presentLocalCall({ ...call, patientId: call.patientId || conversation.patientId }), providerUnavailable: false, replayed: false };
    }
    if (input.action === 'set_disposition') {
      if (!dispositionCode || dispositionCode.length > 100 || !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(dispositionCode)) throw new Error('CALL_DISPOSITION_INVALID');
      if (!CALL_TERMINAL_STATES.has(call.state)) throw new Error('CALL_STATE_CONFLICT');
      call.dispositionCode = dispositionCode;
      appendCallHistory(call, { action: input.action, fromState: call.state, toState: call.state, occurredAt: now, actor: input.actor, result: 'applied' });
      actionReceipts(call).push({ idempotencyKey: input.idempotencyKey, action: input.action, requestHash, outcome: 'applied', recordedAt: now });
      addEvent(conversation, { eventType: 'call.disposition_recorded', occurredAt: now, actor: input.actor, callId: call.id, description: 'Call disposition recorded locally', metadata: { idempotencyKey: input.idempotencyKey, action: input.action, dispositionCode } });
      await writeCallStore(store);
      return { call: presentLocalCall({ ...call, patientId: call.patientId || conversation.patientId }), providerUnavailable: false, replayed: false };
    }
    const requestedState = CALL_MEDIA_ACTION_TARGETS[input.action];
    if (!requestedState) throw new Error('CALL_ACTION_UNSUPPORTED');
    if (!CALL_STATE_TRANSITIONS[call.state]?.includes(requestedState)) throw new Error('CALL_STATE_CONFLICT');
    appendCallHistory(call, { action: input.action, fromState: call.state, toState: call.state, requestedState, occurredAt: now, actor: input.actor, result: 'provider_unavailable' });
    actionReceipts(call).push({ idempotencyKey: input.idempotencyKey, action: input.action, requestHash, outcome: 'provider_unavailable', recordedAt: now });
    addEvent(conversation, { eventType: 'call.provider_unavailable', occurredAt: now, actor: input.actor, callId: call.id, description: `Call ${input.action} could not run because no approved telephony provider is configured`, metadata: { idempotencyKey: input.idempotencyKey, action: input.action, requestedState } });
    await writeCallStore(store);
    return { call: presentLocalCall({ ...call, patientId: call.patientId || conversation.patientId }), providerUnavailable: true, replayed: false };
  });
}

function isVideoCallType(callType: NonNullable<CommunicationCall['callType']>) {
  return callType === 'video' || callType === 'group_video';
}

function localTelehealthDemoEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.TELEHEALTH_LOCAL_DEMO_ENABLED === 'true';
}

function patientParticipantFor(conversation: CommunicationConversation, patientId: string | undefined) {
  return patientId ? conversation.participants.find((participant) => participant.type === 'patient' && participant.id === patientId) : undefined;
}

function videoCallEligibilityProblem(conversation: CommunicationConversation, recipient: CommunicationParticipant, patientId: string | undefined) {
  if (!patientId || !patientParticipantFor(conversation, patientId)) return 'TELEHEALTH_PATIENT_PARTICIPANT_REQUIRED';
  if (recipient.type !== 'patient' || recipient.id !== patientId) return 'TELEHEALTH_PATIENT_RECIPIENT_REQUIRED';
  if (!conversation.appointmentId && !conversation.encounterId) return 'TELEHEALTH_VISIT_CONTEXT_REQUIRED';
  // A directory capability, email address, or phone number is not an account
  // eligibility decision. The only local exception is an explicit synthetic
  // demo switch; production must integrate a clinical authorization source.
  if (!localTelehealthDemoEnabled()) return 'TELEHEALTH_ELIGIBILITY_UNAVAILABLE';
  return undefined;
}

export async function startCommunicationCall(input: { actor: CommunicationActor; conversationId: string; patientId?: string; recipientId?: string; callType?: CommunicationCall['callType']; idempotencyKey: string; correlationId?: string }) {
  return withWriteLock(async () => {
    const store = await readCallStore();
    const conversation = store.conversations.find((item) => item.id === input.conversationId);
    if (!conversation || !isParticipant(conversation, input.actor.id)) return null;
    const recipientCandidates = conversation.participants.filter((participant) => participant.id !== input.actor.id);
    const recipient = input.recipientId ? recipientCandidates.find((participant) => participant.id === input.recipientId) : recipientCandidates.length === 1 ? recipientCandidates[0] : undefined;
    if (input.patientId && input.patientId !== conversation.patientId) throw new Error('PATIENT_CONTEXT_MISMATCH');
    if (!recipient) throw new Error(input.recipientId || recipientCandidates.length <= 1 ? 'RECIPIENT_NOT_AUTHORIZED' : 'RECIPIENT_SELECTION_REQUIRED');
    const replay = conversation.events.find((event) => ['call.provider_accepted', 'call.failed'].includes(event.eventType) && event.metadata?.idempotencyKey === input.idempotencyKey);
    if (replay?.callId) {
      const existing = conversation.calls.find((call) => call.id === replay.callId);
      const expectedPatientId = input.patientId || conversation.patientId;
      const sameRecipient = existing?.participants.some((participant) => participant.id === recipient.id) === true;
      if (!existing || existing.patientId !== expectedPatientId || !sameRecipient) throw new Error('IDEMPOTENCY_CONFLICT');
      return presentLocalCall(existing);
    }
    if (['closed', 'archived'].includes(conversation.state)) throw new Error('CONVERSATION_CLOSED');
    const callType = input.callType || 'audio';
    if (!['audio', 'video', 'group_audio', 'group_video'].includes(callType)) throw new Error('CALL_TYPE_INVALID');
    if (isVideoCallType(callType)) {
      const problem = videoCallEligibilityProblem(conversation, recipient, input.patientId || conversation.patientId);
      if (problem) throw new Error(problem);
    }
    const now = new Date().toISOString();
    const call: CommunicationCall = {
      id: randomUUID(),
      conversationId: conversation.id,
      patientId: input.patientId || conversation.patientId,
      appointmentId: conversation.appointmentId,
      encounterId: conversation.encounterId,
      callType,
      initiatedBy: input.actor,
      direction: 'outbound',
      state: 'created',
      provider: 'pending',
      startedAt: now,
      recordingState: 'not_allowed',
      transcriptionState: 'disabled',
      participants: [{ id: input.actor.id, name: input.actor.name, role: input.actor.role, joinedAt: now, muted: false, onHold: false }],
      notes: [],
      revision: 1,
      stateHistory: [{ id: randomUUID(), version: 1, action: 'created', toState: 'created', occurredAt: now, actor: input.actor, result: 'applied' }],
      waitingRoom: { state: 'not_applicable' },
      recordingConsent: { state: 'not_required' },
      quality: { state: 'unknown' },
    };
    call.participants.push({ id: recipient.id, name: recipient.name, role: recipient.role || 'Contact', muted: false, onHold: false });
    conversation.calls.push(call);
    await writeCallStore(store);
    try {
      const providerResult = await getTelephonyCommunicationProvider().initiateCall({
        actor: { id: input.actor.id, role: input.actor.role },
        patientId: call.patientId,
        appointmentId: call.appointmentId,
        encounterId: call.encounterId,
        conversationId: call.conversationId,
        callType,
        participants: providerParticipants(input.actor, recipient, callType),
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId || randomUUID(),
      });
      applyProviderCallResult(call, providerResult, input.actor, now, 'provider_accepted');
      addEvent(conversation, { eventType: 'call.provider_accepted', occurredAt: now, actor: input.actor, callId: call.id, description: 'Call provider accepted the call request', metadata: { idempotencyKey: input.idempotencyKey, provider: providerResult.provider, controlPlaneCallId: providerResult.callId } });
      await writeCallStore(store);
      return presentLocalCall(call);
    } catch (error) {
      const failure = isCallProviderError(error)
        ? error
        : new CallProviderError({ code: 'CALL_PROVIDER_FAILURE', status: 500, detail: 'The call provider could not process the request.', retryable: true });
      call.provider = 'not-configured';
      call.errorDetail = failure.detail;
      transitionCallState(call, 'failed', { action: failure.status === 503 ? 'provider_unavailable' : 'provider_failed', actor: input.actor, occurredAt: now, result: failure.status === 503 ? 'provider_unavailable' : 'provider_failed', errorCode: failure.code });
      addEvent(conversation, { eventType: 'call.failed', occurredAt: now, actor: input.actor, callId: call.id, description: 'Call provider did not accept the request', metadata: { idempotencyKey: input.idempotencyKey, errorCode: failure.code, status: failure.status } });
      await writeCallStore(store);
      throw failure;
    }
  });
}

function providerParticipants(actor: CommunicationActor, recipient: CommunicationParticipant, callType: NonNullable<CommunicationCall['callType']>): CallProviderParticipant[] {
  return [
    { id: `actor-${actor.id}`, subjectId: actor.id, type: providerActorType(actor.role), role: 'host', state: isVideoCallType(callType) ? 'accepted' : 'invited' },
    { id: `recipient-${recipient.id}`, subjectId: recipient.id, type: providerParticipantType(recipient.type), role: 'participant', state: 'invited' },
  ];
}

function providerActorType(role: string): CallProviderParticipant['type'] {
  if (role.toUpperCase().includes('NURSE')) return 'nurse';
  if (role.toUpperCase().includes('SPECIALIST')) return 'specialist';
  return 'practitioner';
}

function providerParticipantType(type: CommunicationParticipant['type']): CallProviderParticipant['type'] {
  if (type === 'patient' || type === 'related_person' || type === 'practitioner') return type;
  if (type === 'practitioner_role') return 'practitioner';
  return 'observer';
}

function applyProviderCallResult(call: CommunicationCall, result: CallProviderResult, actor: CommunicationActor, occurredAt: string, action: CommunicationCallHistoryEntry['action']) {
  call.provider = result.provider;
  call.controlPlaneCallId = result.callId;
  call.providerCallId = result.providerCallId;
  delete call.errorCode;
  delete call.errorDetail;
  const target = providerStateToLocalState(result.state);
  for (const nextState of providerTransitionPath(call.state, target)) {
    transitionCallState(call, nextState, { action, actor, occurredAt, result: 'applied' });
  }
}

function providerStateToLocalState(state: string): CallState {
  switch (state.trim().toUpperCase()) {
    case 'CREATED': return 'created';
    case 'RINGING': return 'ringing';
    case 'ACCEPTED':
    case 'CONNECTING': return 'connecting';
    case 'ACTIVE': return 'connected';
    case 'RECONNECTING': return 'reconnecting';
    case 'COMPLETED': return 'ended';
    case 'DECLINED': return 'declined';
    case 'MISSED': return 'no_answer';
    case 'CANCELLED': return 'cancelled';
    case 'FAILED': return 'failed';
    default: throw new CallProviderError({ code: 'CALL_PROVIDER_RESPONSE_INVALID', status: 502, detail: 'The call provider returned an unsupported call state.', retryable: true });
  }
}

function providerTransitionPath(from: CallState, to: CallState): CallState[] {
  if (CALL_TERMINAL_STATES.has(from)) return [];
  if (CALL_TERMINAL_STATES.has(to) && CALL_STATE_TRANSITIONS[from]?.includes(to)) return [to];
  const paths: Record<CallState, CallState[]> = {
    created: ['created'],
    waiting_room: ['created', 'waiting_room'],
    dialing: ['created', 'dialing'],
    ringing: ['created', 'dialing', 'ringing'],
    connecting: ['created', 'dialing', 'ringing', 'connecting'],
    connected: ['created', 'dialing', 'ringing', 'connecting', 'connected'],
    reconnecting: ['created', 'dialing', 'ringing', 'connecting', 'connected', 'reconnecting'],
    on_hold: ['created', 'dialing', 'ringing', 'connecting', 'connected', 'on_hold'],
    transferring: ['created', 'dialing', 'ringing', 'connecting', 'connected', 'transferring'],
    conferencing: ['created', 'dialing', 'ringing', 'connecting', 'connected', 'conferencing'],
    ending: ['created', 'dialing', 'ringing', 'connecting', 'connected', 'ending'],
    ended: ['created', 'dialing', 'ringing', 'connecting', 'connected', 'ending', 'ended'],
    busy: ['created', 'dialing', 'busy'],
    no_answer: ['created', 'dialing', 'ringing', 'no_answer'],
    declined: ['created', 'dialing', 'ringing', 'declined'],
    failed: ['created', 'failed'],
    dropped: ['created', 'dialing', 'ringing', 'connecting', 'connected', 'dropped'],
    cancelled: ['created', 'cancelled'],
  };
  const path = paths[to];
  const currentIndex = path.indexOf(from);
  return currentIndex >= 0 ? path.slice(currentIndex + 1) : [];
}

function shouldSynchronizeProviderCall(call: CommunicationCall) {
  return Boolean(call.controlPlaneCallId) && !CALL_TERMINAL_STATES.has(call.state);
}

async function synchronizeCommunicationCall(callId: string, actor: CommunicationActor, patientId?: string): Promise<CommunicationCall | null> {
  const store = await readCallStore();
  const conversation = store.conversations.find((candidate) => candidate.calls.some((call) => call.id === callId));
  const call = conversation?.calls.find((candidate) => candidate.id === callId);
  if (!conversation || !call || !isParticipant(conversation, actor.id)) return null;
  const scopedPatientId = call.patientId || conversation.patientId;
  if (patientId && patientId !== scopedPatientId) return null;
  if (!shouldSynchronizeProviderCall(call) || !call.controlPlaneCallId) return presentLocalCall({ ...call, patientId: scopedPatientId });
  let result: CallProviderResult;
  try {
    result = await getTelephonyCommunicationProvider().getCallStatus({ actor: { id: actor.id, role: actor.role }, callId: call.controlPlaneCallId, correlationId: randomUUID() });
  } catch {
    // The provider client logs a redacted failure. Existing durable state stays readable.
    return presentLocalCall({ ...call, patientId: scopedPatientId });
  }
  return withWriteLock(async () => {
    const currentStore = await readCallStore();
    const currentConversation = currentStore.conversations.find((candidate) => candidate.calls.some((candidate) => candidate.id === callId));
    const currentCall = currentConversation?.calls.find((candidate) => candidate.id === callId);
    if (!currentConversation || !currentCall || !isParticipant(currentConversation, actor.id)) return null;
    const beforeState = currentCall.state;
    applyProviderCallResult(currentCall, result, actor, new Date().toISOString(), 'provider_status');
    if (beforeState !== currentCall.state) {
      addEvent(currentConversation, { eventType: `call.${currentCall.state}`, occurredAt: new Date().toISOString(), actor, callId: currentCall.id, description: `Call provider reported ${currentCall.state.replaceAll('_', ' ')}`, metadata: { provider: result.provider, controlPlaneCallId: result.callId } });
      await writeCallStore(currentStore);
    }
    return presentLocalCall({ ...currentCall, patientId: currentCall.patientId || currentConversation.patientId });
  });
}

export async function updateCommunicationVoicemail(voicemailId: string, actor: CommunicationActor, action: 'review' | 'callback' | 'resolve', idempotencyKey: string, patientId?: string) {
  return withWriteLock(async () => {
    const store = await readStore();
    const conversation = store.conversations.find((item) => item.voicemails.some((voicemail) => voicemail.id === voicemailId));
    const voicemail = conversation?.voicemails.find((item) => item.id === voicemailId);
    if (!conversation || !voicemail || !isParticipant(conversation, actor.id)) return null;
    if (patientId && patientId !== conversation.patientId) throw new Error('PATIENT_CONTEXT_MISMATCH');
    if (conversation.events.some((event) => event.eventType === `voicemail.${action}d` && event.metadata?.idempotencyKey === idempotencyKey)) return voicemail;
    const now = new Date().toISOString();
    if (action === 'review') { voicemail.state = 'reviewed'; voicemail.reviewedAt = now; }
    if (action === 'callback') voicemail.callbackState = 'requested';
    if (action === 'resolve') voicemail.state = 'resolved';
    addEvent(conversation, { eventType: `voicemail.${action}d`, occurredAt: now, actor, voicemailId, description: `Voicemail ${action}d by ${actor.name}`, metadata: { idempotencyKey } });
    await writeStore(store);
    return voicemail;
  });
}

export function subscribeCommunicationEvents(listener: (event: CommunicationEvent) => void) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function getPatientCommunicationContext(patientId?: string) {
  return patientContext(patientId);
}

export function getCommunicationProviderLimits() {
  return { maxAttachmentBytes: MAX_ATTACHMENT_BYTES, allowedAttachmentTypes: [...ALLOWED_ATTACHMENT_TYPES] };
}
export async function markCommunicationMessageRead(messageId: string, actor: CommunicationActor, patientId?: string) {
  const store = await readStore();
  const conversation = store.conversations.find((item) => item.messages.some((message) => message.id === messageId));
  return conversation ? markCommunicationRead(conversation.id, actor, patientId) : null;
}

export async function getCommunicationMessageConversationId(messageId: string) {
  const store = await readStore();
  return store.conversations.find((conversation) => conversation.messages.some((message) => message.id === messageId))?.id || null;
}
