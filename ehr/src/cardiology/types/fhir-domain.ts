/**
 * Cardiology Practice Domain Types
 *
 * FHIR-aligned interfaces for the cardiology workflow simulator.
 * These types bridge the API domain model with React component contracts.
 *
 * Key Design:
 * - All resources include FHIR resource IDs (`resourceId`) for potential FHIR export
 * - Timestamps are ISO 8601 strings
 * - Enums use SCREAMING_SNAKE_CASE to match domain constants
 * - Tenant scoping is always implicit (from session context)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Roles & Permission Model
// ─────────────────────────────────────────────────────────────────────────────

export enum CardiologyRole {
  RECEPTIONIST = 'RECEPTIONIST',
  NURSE = 'NURSE',
  CARDIOLOGIST = 'CARDIOLOGIST',
  TECHNICIAN = 'TECHNICIAN',
  BILLING = 'BILLING',
  ADMIN = 'ADMIN',
  PATIENT = 'PATIENT',
  SYSTEM = 'SYSTEM',
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  role: CardiologyRole;
  fhirPractitionerId?: string; // Links to FHIR Practitioner resource
  email: string;
  phone?: string;
  department?: string;
  avatarUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Room & Physical Space Model
// ─────────────────────────────────────────────────────────────────────────────

export enum RoomType {
  WAITING_ROOM = 'WAITING_ROOM',
  CHECK_IN_DESK = 'CHECK_IN_DESK',
  EXAM_ROOM = 'EXAM_ROOM',
  ECG_ROOM = 'ECG_ROOM',
  ECHO_LAB = 'ECHO_LAB',
  STRESS_TEST_LAB = 'STRESS_TEST_LAB',
  HOLTER_ROOM = 'HOLTER_ROOM',
  CONSULT_ROOM = 'CONSULT_ROOM',
  BLOOD_DRAW = 'BLOOD_DRAW',
  CHECKOUT_DESK = 'CHECKOUT_DESK',
  BILLING_OFFICE = 'BILLING_OFFICE',
}

export interface CardiovascularRoom {
  id: string;
  tenantId: string;
  roomNumber: string;
  roomType: RoomType;
  capacity: number;
  currentOccupancy: number;
  occupantNames: string[];
  isAvailable: boolean;
  equipment?: string[]; // e.g., ['ECG machine', 'Ultrasound']
  fhirLocationId?: string; // Links to FHIR Location resource
  lastUpdated: string; // ISO 8601
}

// ─────────────────────────────────────────────────────────────────────────────
// Visit Lifecycle & State Machine (23 states)
// ─────────────────────────────────────────────────────────────────────────────

export enum CardiovascularVisitState {
  // Referral & Scheduling
  REFERRAL_RECEIVED = 'REFERRAL_RECEIVED',
  SCHEDULING = 'SCHEDULING',
  APPOINTMENT_SCHEDULED = 'APPOINTMENT_SCHEDULED',
  APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED',
  PRE_VISIT_FORMS = 'PRE_VISIT_FORMS',

  // Arrival & Check-in
  PATIENT_ARRIVED = 'PATIENT_ARRIVED',
  CHECKING_IN = 'CHECKING_IN',
  CHECKED_IN = 'CHECKED_IN',
  IN_WAITING_ROOM = 'IN_WAITING_ROOM',

  // Nursing Assessment
  NURSING_ASSESSMENT = 'NURSING_ASSESSMENT',
  IN_EXAM_ROOM = 'IN_EXAM_ROOM',

  // Physician Consultation
  PHYSICIAN_PENDING = 'PHYSICIAN_PENDING',
  PHYSICIAN_WITH_PATIENT = 'PHYSICIAN_WITH_PATIENT',
  ORDERS_PLACED = 'ORDERS_PLACED',

  // Procedures
  PROCEDURE_QUEUED = 'PROCEDURE_QUEUED',
  IN_PROCEDURE = 'IN_PROCEDURE',
  PROCEDURE_COMPLETE = 'PROCEDURE_COMPLETE',
  RESULTS_READY = 'RESULTS_READY',

  // Results Review & Discharge
  RESULTS_REVIEW = 'RESULTS_REVIEW',
  CONSULTATION_COMPLETE = 'CONSULTATION_COMPLETE',
  CHECKING_OUT = 'CHECKING_OUT',
  CHECKOUT_COMPLETE = 'CHECKOUT_COMPLETE',
  BILLING_PENDING = 'BILLING_PENDING',
  FOLLOW_UP_SCHEDULED = 'FOLLOW_UP_SCHEDULED',
  DISCHARGED = 'DISCHARGED',

  // Exceptional states
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum VisitPriority {
  URGENT = 0,
  HIGH = 25,
  NORMAL = 50,
  LOW = 75,
}

export interface CardiovascularVisit {
  id: string;
  tenantId: string;
  patientId: string;
  patientName: string;
  patientDOB: string; // ISO 8601 date
  mrn: string; // Medical Record Number
  chiefComplaint: string;
  currentState: CardiovascularVisitState;
  previousState?: CardiovascularVisitState;
  priority: VisitPriority;
  currentRoomId?: string;
  assignedPhysicianId?: string;
  assignedPhysicianName?: string;
  arrivedAt?: string; // ISO 8601
  stateEnteredAt?: string; // ISO 8601
  dischargedAt?: string; // ISO 8601
  fhirEncounterId?: string; // Links to FHIR Encounter
  fhirAppointmentId?: string; // Links to FHIR Appointment
  fhirPatientId?: string; // Links to FHIR Patient
  notes?: string;
  isNewPatient: boolean;
  carePlan?: {
    symptoms?: string[];
    diagnosis?: string;
    nextSteps?: string;
    recommendedProcedure?: string;
  };
  proceduresOrdered?: CardiovascularProcedure[];
  vitals?: VitalSigns;
}

// ─────────────────────────────────────────────────────────────────────────────
// Procedures & Diagnostics
// ─────────────────────────────────────────────────────────────────────────────

export enum CardiovascularProcedureType {
  ECG = 'ECG',
  ECHO = 'ECHO',
  STRESS_TEST = 'STRESS_TEST',
  HOLTER = 'HOLTER',
}

export enum ProcedureStatus {
  ORDERED = 'ORDERED',
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
  RESULT_AVAILABLE = 'RESULT_AVAILABLE',
}

export interface CardiovascularProcedure {
  id: string;
  visitId: string;
  procedureType: CardiovascularProcedureType;
  status: ProcedureStatus;
  orderedBy: string; // Physician name
  orderedAt: string; // ISO 8601
  startedAt?: string; // ISO 8601
  completedAt?: string; // ISO 8601
  technicianId?: string;
  roomId?: string;
  findings?: string;
  criticalFindings?: boolean;
  fhirDiagnosticReportId?: string; // Links to FHIR DiagnosticReport
  fhirObservationIds?: string[]; // Links to FHIR Observations
}

export interface VitalSigns {
  temperatureC?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRateBpm?: number;
  respirationRate?: number;
  oxygenSaturationPercent?: number;
  recordedAt: string; // ISO 8601
  recordedBy: string; // Nurse name
}

// ─────────────────────────────────────────────────────────────────────────────
// Work Queue Model (13 queues)
// ─────────────────────────────────────────────────────────────────────────────

export enum QueueName {
  REFERRAL_REVIEW = 'REFERRAL_REVIEW',
  SCHEDULING = 'SCHEDULING',
  CHECK_IN = 'CHECK_IN',
  NURSING_ASSESSMENT = 'NURSING_ASSESSMENT',
  PHYSICIAN_CONSULT = 'PHYSICIAN_CONSULT',
  PROCEDURE_ECG = 'PROCEDURE_ECG',
  PROCEDURE_ECHO = 'PROCEDURE_ECHO',
  PROCEDURE_STRESS_TEST = 'PROCEDURE_STRESS_TEST',
  PROCEDURE_HOLTER = 'PROCEDURE_HOLTER',
  RESULTS_REVIEW = 'RESULTS_REVIEW',
  CHECKOUT = 'CHECKOUT',
  BILLING = 'BILLING',
  FOLLOW_UP_SCHEDULING = 'FOLLOW_UP_SCHEDULING',
}

export enum QueueItemStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export interface QueueItem {
  id: string;
  queueName: QueueName;
  visitId: string;
  patientName: string;
  priority: VisitPriority;
  status: QueueItemStatus;
  createdAt: string; // ISO 8601
  claimedBy?: string; // User ID
  claimedAt?: string; // ISO 8601
  completedAt?: string; // ISO 8601
  notes?: string;
  estimatedDurationMinutes?: number;
  assignedTo?: string; // optional assigned user id (dev-assignment)
}

export interface QueueStats {
  queueName: QueueName;
  pendingCount: number;
  inProgressCount: number;
  averageWaitMinutes: number;
  oldestItemAgeMinutes: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain Events (Append-Only Log)
// ─────────────────────────────────────────────────────────────────────────────

export enum DomainEventType {
  STATE_TRANSITION = 'STATE_TRANSITION',
  VITALS_RECORDED = 'VITALS_RECORDED',
  PROCEDURE_ORDERED = 'PROCEDURE_ORDERED',
  PROCEDURE_STARTED = 'PROCEDURE_STARTED',
  PROCEDURE_COMPLETED = 'PROCEDURE_COMPLETED',
  QUEUE_ITEM_CLAIMED = 'QUEUE_ITEM_CLAIMED',
  QUEUE_ITEM_COMPLETED = 'QUEUE_ITEM_COMPLETED',
  NOTES_ADDED = 'NOTES_ADDED',
}

export interface DomainEvent {
  id: string;
  tenantId: string;
  visitId: string;
  eventType: DomainEventType;
  sequenceNo: number; // BIGSERIAL, monotonically increasing
  fromState?: CardiovascularVisitState;
  toState?: CardiovascularVisitState;
  actorId: string; // User ID or SYSTEM
  actorRole: CardiologyRole;
  roomId?: string;
  notes?: string;
  payload?: Record<string, unknown>; // JSON blob for extensibility
  createdAt: string; // ISO 8601
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard & Aggregated Views
// ─────────────────────────────────────────────────────────────────────────────

export interface CardiologyDashboard {
  tenantId: string;
  generatedAt: string; // ISO 8601
  visits: {
    byState: Record<CardiovascularVisitState, number>;
    byPriority: Record<VisitPriority, number>;
    urgent: CardiovascularVisit[];
    recentDischarges: CardiovascularVisit[];
  };
  queues: QueueStats[];
  rooms: {
    total: number;
    occupied: number;
    available: number;
    byType: Record<RoomType, CardiovascularRoom[]>;
  };
  recentEvents: DomainEvent[];
  staffWorkload: {
    userId: string;
    userName: string;
    role: CardiologyRole;
    itemsInProgress: number;
    itemsCompleted24h: number;
  }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Transition & State Machine Metadata
// ─────────────────────────────────────────────────────────────────────────────

export interface StateTransition {
  fromState: CardiovascularVisitState;
  event: string; // Human-readable event name
  toState: CardiovascularVisitState;
  allowedRoles: CardiologyRole[];
  requiresRoomType?: RoomType;
  autoEnqueueName?: QueueName;
  description: string;
}

export interface AvailableTransition {
  event: string;
  toState: CardiovascularVisitState;
  allowedForCurrentUser: boolean;
  reason?: string; // Why not allowed, if applicable
}

// ─────────────────────────────────────────────────────────────────────────────
// API Request/Response Contracts
// ─────────────────────────────────────────────────────────────────────────────

export interface TransitionRequest {
  event: string;
  actorId: string;
  actorRole: CardiologyRole;
  roomId?: string;
  notes?: string;
}

export interface TransitionResponse {
  visitId: string;
  previousState: CardiovascularVisitState;
  newState: CardiovascularVisitState;
  eventId: string;
  timestamp: string; // ISO 8601
}

export interface CreateVisitRequest {
  patientId: string;
  patientName: string;
  patientDOB: string;
  mrn: string;
  chiefComplaint: string;
  priority: VisitPriority;
  isNewPatient: boolean;
  referralSource?: string;
  fhirPatientId?: string;
  fhirAppointmentId?: string;
}

export interface ClaimQueueItemRequest {
  userId: string;
  userRole: CardiologyRole;
}

export interface CompleteQueueItemRequest {
  userId: string;
  notes?: string;
}
