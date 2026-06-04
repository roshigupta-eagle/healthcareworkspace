// Package cardiology implements the cardiologist practice simulation:
// state-machine driven patient visits, work queues, room management,
// and a full domain-event log.
package cardiology

import "time"

// ─── Visit States ─────────────────────────────────────────────────────────────

// VisitState is the FSM state for a single patient encounter.
type VisitState string

const (
	// ── Pre-arrival ──────────────────────────────────────────────────────────
	StateReferralReceived     VisitState = "REFERRAL_RECEIVED"     // referral in triage
	StateScheduling           VisitState = "SCHEDULING"            // receptionist finding slot
	StateAppointmentScheduled VisitState = "APPOINTMENT_SCHEDULED" // slot booked
	StateAppointmentConfirmed VisitState = "APPOINTMENT_CONFIRMED" // patient confirmed
	StatePreVisitForms        VisitState = "PRE_VISIT_FORMS"       // intake packet sent

	// ── Arrival / Front Desk ─────────────────────────────────────────────────
	StatePatientArrived VisitState = "PATIENT_ARRIVED" // patient at door
	StateCheckingIn     VisitState = "CHECKING_IN"     // receptionist processing
	StateCheckedIn      VisitState = "CHECKED_IN"      // copay & demographics done
	StateInWaitingRoom  VisitState = "IN_WAITING_ROOM" // seated, awaiting nurse

	// ── Nursing Assessment ───────────────────────────────────────────────────
	StateNursingAssessment VisitState = "NURSING_ASSESSMENT" // nurse taking vitals/hx
	StateInExamRoom        VisitState = "IN_EXAM_ROOM"       // patient roomed, ready for MD

	// ── Physician ────────────────────────────────────────────────────────────
	StatePhysicianPending     VisitState = "PHYSICIAN_PENDING"      // waiting for cardiologist
	StatePhysicianWithPatient VisitState = "PHYSICIAN_WITH_PATIENT" // MD in the room
	StateOrdersPlaced         VisitState = "ORDERS_PLACED"          // ECG/echo/labs ordered

	// ── Procedures ───────────────────────────────────────────────────────────
	StateProcedureQueued   VisitState = "PROCEDURE_QUEUED"   // waiting for tech
	StateInProcedure       VisitState = "IN_PROCEDURE"       // procedure running
	StateProcedureComplete VisitState = "PROCEDURE_COMPLETE" // done, pending report
	StateResultsPending    VisitState = "RESULTS_PENDING"    // results being processed
	StateResultsReady      VisitState = "RESULTS_READY"      // ready for MD review
	StateResultsReview     VisitState = "RESULTS_REVIEW"     // MD reading results

	// ── Completion ───────────────────────────────────────────────────────────
	StateConsultationComplete VisitState = "CONSULTATION_COMPLETE" // MD done
	StateCheckingOut          VisitState = "CHECKING_OUT"          // front desk checkout
	StateCheckoutComplete     VisitState = "CHECKOUT_COMPLETE"     // copay settled
	StateBillingPending       VisitState = "BILLING_PENDING"       // coding in progress
	StateFollowUpScheduled    VisitState = "FOLLOW_UP_SCHEDULED"   // return visit booked
	StateReferralSent         VisitState = "REFERRAL_SENT"         // outbound referral issued
	StateDischarged           VisitState = "DISCHARGED"            // visit closed

	// ── Exceptional ──────────────────────────────────────────────────────────
	StateOnHold    VisitState = "ON_HOLD" // paused (patient left for restroom, etc.)
	StateCancelled VisitState = "CANCELLED"
	StateNoShow    VisitState = "NO_SHOW"
)

// ─── Actor Roles ──────────────────────────────────────────────────────────────

type ActorRole string

const (
	RoleSystem       ActorRole = "SYSTEM"
	RoleReceptionist ActorRole = "RECEPTIONIST"
	RoleNurse        ActorRole = "NURSE"
	RoleCardiologist ActorRole = "CARDIOLOGIST"
	RoleTechnician   ActorRole = "TECHNICIAN" // ECG tech, sonographer
	RoleBilling      ActorRole = "BILLING"
	RoleAdmin        ActorRole = "ADMIN"
	RolePatient      ActorRole = "PATIENT"
)

// ─── Domain Event Types ───────────────────────────────────────────────────────

type EventType string

const (
	EvtReferralReceived     EventType = "REFERRAL_RECEIVED"
	EvtSchedulingStarted    EventType = "SCHEDULING_STARTED"
	EvtAppointmentScheduled EventType = "APPOINTMENT_SCHEDULED"
	EvtAppointmentConfirmed EventType = "APPOINTMENT_CONFIRMED"
	EvtAppointmentReminded  EventType = "APPOINTMENT_REMINDED"
	EvtIntakeSent           EventType = "INTAKE_FORMS_SENT"
	EvtIntakeCompleted      EventType = "INTAKE_FORMS_COMPLETED"
	EvtPatientArrived       EventType = "PATIENT_ARRIVED"
	EvtCheckInStarted       EventType = "CHECK_IN_STARTED"
	EvtCheckInCompleted     EventType = "CHECK_IN_COMPLETED"
	EvtMovedToWaitingRoom   EventType = "MOVED_TO_WAITING_ROOM"
	EvtNursingStarted       EventType = "NURSING_STARTED"
	EvtVitalsTaken          EventType = "VITALS_TAKEN"
	EvtPatientRoomed        EventType = "PATIENT_ROOMED"
	EvtPhysicianAssigned    EventType = "PHYSICIAN_ASSIGNED"
	EvtPhysicianEntered     EventType = "PHYSICIAN_ENTERED_ROOM"
	EvtOrderPlaced          EventType = "ORDER_PLACED"
	EvtProcedureQueued      EventType = "PROCEDURE_QUEUED"
	EvtProcedureStarted     EventType = "PROCEDURE_STARTED"
	EvtProcedureCompleted   EventType = "PROCEDURE_COMPLETED"
	EvtResultsReady         EventType = "RESULTS_READY"
	EvtResultsReviewStarted EventType = "RESULTS_REVIEW_STARTED"
	EvtConsultCompleted     EventType = "CONSULTATION_COMPLETED"
	EvtCheckoutStarted      EventType = "CHECKOUT_STARTED"
	EvtCheckoutCompleted    EventType = "CHECKOUT_COMPLETED"
	EvtClaimSubmitted       EventType = "CLAIM_SUBMITTED"
	EvtFollowUpScheduled    EventType = "FOLLOW_UP_SCHEDULED"
	EvtReferralSent         EventType = "REFERRAL_SENT"
	EvtDischarged           EventType = "DISCHARGED"
	EvtCancelled            EventType = "CANCELLED"
	EvtNoShow               EventType = "NO_SHOW"
	EvtPutOnHold            EventType = "PUT_ON_HOLD"
	EvtResumedFromHold      EventType = "RESUMED_FROM_HOLD"
)

// ─── Priority & Visit Type ────────────────────────────────────────────────────

type Priority string

const (
	PriorityUrgent Priority = "URGENT" // Chest pain, acute arrhythmia
	PriorityHigh   Priority = "HIGH"   // ER referral, abnormal test
	PriorityNormal Priority = "NORMAL"
	PriorityLow    Priority = "LOW" // Routine follow-up
)

type VisitType string

const (
	VisitNewPatient   VisitType = "NEW_PATIENT"
	VisitFollowUp     VisitType = "FOLLOW_UP"
	VisitProcedure    VisitType = "PROCEDURE_ONLY"
	VisitUrgent       VisitType = "URGENT"
	VisitConsultation VisitType = "CONSULTATION"
)

// ─── Queue Names ──────────────────────────────────────────────────────────────

type QueueName string

const (
	QueueReferralReview QueueName = "REFERRAL_REVIEW"       // admin triages referral
	QueueScheduling     QueueName = "SCHEDULING"            // receptionist books slot
	QueueCheckIn        QueueName = "CHECK_IN"              // front-desk arrival
	QueueNursing        QueueName = "NURSING_ASSESSMENT"    // nurse vitals & hx
	QueuePhysician      QueueName = "PHYSICIAN_CONSULT"     // cardiologist sees patient
	QueueECG            QueueName = "PROCEDURE_ECG"         // ECG tech
	QueueEcho           QueueName = "PROCEDURE_ECHO"        // sonographer
	QueueStressTest     QueueName = "PROCEDURE_STRESS_TEST" // stress-test nurse/tech
	QueueHolter         QueueName = "PROCEDURE_HOLTER"      // holter setup/teardown
	QueueResultsReview  QueueName = "RESULTS_REVIEW"        // cardiologist reads results
	QueueCheckout       QueueName = "CHECKOUT"              // front-desk discharge
	QueueBilling        QueueName = "BILLING"               // billing codes claim
	QueueFollowUp       QueueName = "FOLLOW_UP_SCHEDULING"  // book return visit
)

// ─── Room Types ───────────────────────────────────────────────────────────────

const (
	RoomTypeWaiting    = "WAITING"
	RoomTypeCheckIn    = "CHECK_IN"
	RoomTypeExam       = "EXAM"
	RoomTypeECG        = "ECG"
	RoomTypeEcho       = "ECHO"
	RoomTypeStressTest = "STRESS_TEST"
	RoomTypeHolter     = "HOLTER"
	RoomTypeConsult    = "CONSULT"
	RoomTypeLab        = "LAB"
	RoomTypeCheckout   = "CHECKOUT"
	RoomTypeBilling    = "BILLING"
)

// ─── Procedure Types (for order placement) ────────────────────────────────────

type ProcedureType string

const (
	ProcECG        ProcedureType = "ECG"
	ProcEcho       ProcedureType = "ECHO"
	ProcStressTest ProcedureType = "STRESS_TEST"
	ProcHolter     ProcedureType = "HOLTER_MONITOR"
	ProcBloodDraw  ProcedureType = "BLOOD_DRAW"
)

// ─── DB Row Models ────────────────────────────────────────────────────────────

// VisitStateRow mirrors the cardiology_visit_state table row.
type VisitStateRow struct {
	ID                  string
	TenantID            string
	EncounterID         string
	PatientID           string
	AppointmentID       *string
	ReferralID          *string
	CurrentState        VisitState
	PreviousState       *VisitState
	VisitType           VisitType
	Priority            Priority
	AssignedPhysicianID *string
	AssignedNurseID     *string
	CurrentRoomID       *string
	ChiefComplaint      *string
	ArrivedAt           *time.Time
	StateEnteredAt      time.Time
	DischargedAt        *time.Time
	Metadata            []byte
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

// EventRow mirrors the cardiology_events table row.
type EventRow struct {
	ID          string
	TenantID    string
	SequenceNo  int64
	EncounterID string
	PatientID   string
	EventType   EventType
	FromState   *VisitState
	ToState     VisitState
	ActorID     *string
	ActorRole   *ActorRole
	RoomID      *string
	Notes       *string
	Payload     []byte
	OccurredAt  time.Time
}

// QueueItem mirrors the cardiology_queue_items table row.
type QueueItem struct {
	ID            string
	TenantID      string
	QueueName     QueueName
	EncounterID   *string
	PatientID     string
	AppointmentID *string
	Title         string
	Description   *string
	Priority      int
	Status        string // PENDING | IN_PROGRESS | COMPLETED | CANCELLED
	AssignedToID  *string
	DueAt         *time.Time
	StartedAt     *time.Time
	CompletedAt   *time.Time
	Payload       []byte
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// Room mirrors the cardiology_rooms table row plus live occupancy data.
type Room struct {
	ID             string
	TenantID       string
	Name           string
	RoomType       string
	Capacity       int
	FHIRLocationID *string
	IsActive       bool
	Occupants      []RoomOccupant // populated on demand
}

// RoomOccupant is a currently-assigned patient in a room.
type RoomOccupant struct {
	EncounterID  string
	PatientID    string
	CurrentState VisitState
}

// ─── HTTP Request / Response DTOs ────────────────────────────────────────────

// CreateVisitRequest is the body for POST /cardiology/visits.
type CreateVisitRequest struct {
	PatientID      string    `json:"patientId"`
	AppointmentID  string    `json:"appointmentId,omitempty"`
	ReferralID     string    `json:"referralId,omitempty"`
	VisitType      VisitType `json:"visitType"`
	Priority       Priority  `json:"priority,omitempty"`
	ChiefComplaint string    `json:"chiefComplaint,omitempty"`
}

// TransitionRequest is the body for POST /cardiology/visits/{id}/transition.
type TransitionRequest struct {
	Event     EventType              `json:"event"`
	ActorID   string                 `json:"actorId"`
	ActorRole ActorRole              `json:"actorRole"`
	RoomID    string                 `json:"roomId,omitempty"`
	Notes     string                 `json:"notes,omitempty"`
	Payload   map[string]interface{} `json:"payload,omitempty"`
}

// ClaimRequest is the body for POST /cardiology/queues/{q}/items/{id}/claim.
type ClaimRequest struct {
	AssignedToID string `json:"assignedToId"`
}

// CompleteRequest is the body for POST /cardiology/queues/{q}/items/{id}/complete.
type CompleteRequest struct {
	Notes   string                 `json:"notes,omitempty"`
	Payload map[string]interface{} `json:"payload,omitempty"`
}

// QueueSummary is a single row in the GET /cardiology/queues response.
type QueueSummary struct {
	Name       QueueName `json:"name"`
	Pending    int       `json:"pending"`
	InProgress int       `json:"inProgress"`
}

// Dashboard is the response for GET /cardiology/dashboard.
type Dashboard struct {
	TotalVisitsToday int            `json:"totalVisitsToday"`
	VisitsByState    map[string]int `json:"visitsByState"`
	Queues           []QueueSummary `json:"queues"`
	Rooms            []Room         `json:"rooms"`
	RecentEvents     []EventRow     `json:"recentEvents"`
}
