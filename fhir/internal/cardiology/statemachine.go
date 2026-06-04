package cardiology

import "fmt"

// Transition describes one valid edge in the visit state machine.
type Transition struct {
	From         VisitState
	Event        EventType
	To           VisitState
	AllowedRoles []ActorRole
	// AutoEnqueue is the queue to create a work-item in when entering To state.
	// Empty means no automatic enqueue.
	AutoEnqueue QueueName
}

// transitions is the authoritative list of every valid state change.
// Order within the slice does not matter; lookups use transitionIndex.
var transitions = []Transition{
	// ── Referral → scheduling ─────────────────────────────────────────────────
	{StateReferralReceived, EvtSchedulingStarted, StateScheduling,
		[]ActorRole{RoleReceptionist, RoleAdmin}, ""},
	{StateReferralReceived, EvtAppointmentScheduled, StateAppointmentScheduled,
		[]ActorRole{RoleReceptionist, RoleAdmin, RoleSystem}, QueueScheduling},
	{StateScheduling, EvtAppointmentScheduled, StateAppointmentScheduled,
		[]ActorRole{RoleReceptionist, RoleAdmin, RoleSystem}, ""},
	{StateAppointmentScheduled, EvtAppointmentConfirmed, StateAppointmentConfirmed,
		[]ActorRole{RolePatient, RoleSystem, RoleReceptionist}, ""},
	{StateAppointmentScheduled, EvtCancelled, StateCancelled,
		[]ActorRole{RolePatient, RoleReceptionist, RoleAdmin}, ""},
	{StateAppointmentScheduled, EvtNoShow, StateNoShow,
		[]ActorRole{RoleSystem, RoleReceptionist}, ""},
	{StateAppointmentConfirmed, EvtIntakeSent, StatePreVisitForms,
		[]ActorRole{RoleSystem}, ""},
	{StatePreVisitForms, EvtIntakeCompleted, StateAppointmentConfirmed,
		[]ActorRole{RolePatient, RoleSystem}, ""},
	{StateAppointmentConfirmed, EvtNoShow, StateNoShow,
		[]ActorRole{RoleSystem, RoleReceptionist}, ""},
	{StateAppointmentConfirmed, EvtCancelled, StateCancelled,
		[]ActorRole{RolePatient, RoleReceptionist, RoleAdmin}, ""},

	// ── Patient arrives ───────────────────────────────────────────────────────
	{StateAppointmentConfirmed, EvtPatientArrived, StatePatientArrived,
		[]ActorRole{RolePatient, RoleSystem, RoleReceptionist}, QueueCheckIn},
	{StatePreVisitForms, EvtPatientArrived, StatePatientArrived,
		[]ActorRole{RolePatient, RoleSystem, RoleReceptionist}, QueueCheckIn},
	// Walk-ins start here directly
	{StatePatientArrived, EvtCheckInStarted, StateCheckingIn,
		[]ActorRole{RoleReceptionist}, ""},
	{StateCheckingIn, EvtCheckInCompleted, StateCheckedIn,
		[]ActorRole{RoleReceptionist}, ""},
	{StateCheckedIn, EvtMovedToWaitingRoom, StateInWaitingRoom,
		[]ActorRole{RoleReceptionist, RoleNurse}, QueueNursing},

	// ── Nursing assessment ────────────────────────────────────────────────────
	{StateInWaitingRoom, EvtNursingStarted, StateNursingAssessment,
		[]ActorRole{RoleNurse}, ""},
	// Vitals can be recorded multiple times without changing state
	{StateNursingAssessment, EvtVitalsTaken, StateNursingAssessment,
		[]ActorRole{RoleNurse}, ""},
	{StateNursingAssessment, EvtPatientRoomed, StateInExamRoom,
		[]ActorRole{RoleNurse}, QueuePhysician},

	// ── Physician consult ─────────────────────────────────────────────────────
	{StateInExamRoom, EvtPhysicianAssigned, StatePhysicianPending,
		[]ActorRole{RoleNurse, RoleCardiologist, RoleSystem}, ""},
	{StatePhysicianPending, EvtPhysicianEntered, StatePhysicianWithPatient,
		[]ActorRole{RoleCardiologist}, ""},
	// MD places procedure/lab orders
	{StatePhysicianWithPatient, EvtOrderPlaced, StateOrdersPlaced,
		[]ActorRole{RoleCardiologist}, ""},
	// MD wraps up without ordering further tests
	{StatePhysicianWithPatient, EvtConsultCompleted, StateConsultationComplete,
		[]ActorRole{RoleCardiologist}, QueueCheckout},

	// ── Procedure workflow ────────────────────────────────────────────────────
	{StateOrdersPlaced, EvtProcedureQueued, StateProcedureQueued,
		[]ActorRole{RoleSystem, RoleCardiologist, RoleNurse}, ""},
	{StateProcedureQueued, EvtProcedureStarted, StateInProcedure,
		[]ActorRole{RoleTechnician, RoleNurse}, ""},
	{StateInProcedure, EvtProcedureCompleted, StateProcedureComplete,
		[]ActorRole{RoleTechnician, RoleNurse}, ""},
	{StateProcedureComplete, EvtResultsReady, StateResultsReady,
		[]ActorRole{RoleSystem, RoleTechnician}, QueueResultsReview},
	{StateResultsReady, EvtResultsReviewStarted, StateResultsReview,
		[]ActorRole{RoleCardiologist}, ""},
	// MD reviews results and finalises consultation
	{StateResultsReview, EvtConsultCompleted, StateConsultationComplete,
		[]ActorRole{RoleCardiologist}, QueueCheckout},
	// MD sees results and orders another procedure
	{StateResultsReview, EvtOrderPlaced, StateOrdersPlaced,
		[]ActorRole{RoleCardiologist}, ""},
	// MD sees no abnormality during procedure, orders placed go straight to complete
	{StateOrdersPlaced, EvtConsultCompleted, StateConsultationComplete,
		[]ActorRole{RoleCardiologist}, QueueCheckout},

	// ── Checkout & billing ────────────────────────────────────────────────────
	{StateConsultationComplete, EvtCheckoutStarted, StateCheckingOut,
		[]ActorRole{RoleReceptionist, RolePatient}, ""},
	{StateCheckingOut, EvtCheckoutCompleted, StateCheckoutComplete,
		[]ActorRole{RoleReceptionist}, ""},
	{StateCheckoutComplete, EvtClaimSubmitted, StateBillingPending,
		[]ActorRole{RoleSystem, RoleBilling}, QueueBilling},
	{StateBillingPending, EvtFollowUpScheduled, StateFollowUpScheduled,
		[]ActorRole{RoleReceptionist, RoleSystem}, QueueFollowUp},
	{StateBillingPending, EvtReferralSent, StateReferralSent,
		[]ActorRole{RoleCardiologist, RoleSystem}, ""},
	{StateBillingPending, EvtDischarged, StateDischarged,
		[]ActorRole{RoleSystem}, ""},
	{StateFollowUpScheduled, EvtDischarged, StateDischarged,
		[]ActorRole{RoleSystem}, ""},
	{StateReferralSent, EvtDischarged, StateDischarged,
		[]ActorRole{RoleSystem}, ""},
}

// transitionKey is the lookup key for the transition index.
type transitionKey struct {
	From  VisitState
	Event EventType
}

var transitionIndex = make(map[transitionKey]Transition, len(transitions))

func init() {
	for _, t := range transitions {
		transitionIndex[transitionKey{t.From, t.Event}] = t
	}
}

// LookupTransition returns the Transition for (fromState, event) or an error
// when the combination is not defined.
func LookupTransition(from VisitState, event EventType) (Transition, error) {
	t, ok := transitionIndex[transitionKey{from, event}]
	if !ok {
		return Transition{}, fmt.Errorf(
			"no transition defined: %s -[%s]-> ?", from, event)
	}
	return t, nil
}

// IsRoleAllowed reports whether role is permitted to fire this transition.
func IsRoleAllowed(t Transition, role ActorRole) bool {
	for _, r := range t.AllowedRoles {
		if r == role {
			return true
		}
	}
	return false
}

// ─── Helper: auto-advance by state ────────────────────────────────────────────

// AutoAdvanceEvent returns the next system-driven event for a state, if any.
// Used by the simulator's /advance endpoint to progress visits hands-free.
var autoAdvanceEvents = map[VisitState]EventType{
	StateAppointmentConfirmed: EvtPatientArrived,
	StatePatientArrived:       EvtCheckInStarted,
	StateCheckingIn:           EvtCheckInCompleted,
	StateCheckedIn:            EvtMovedToWaitingRoom,
	StateInWaitingRoom:        EvtNursingStarted,
	StateNursingAssessment:    EvtPatientRoomed,
	StateInExamRoom:           EvtPhysicianAssigned,
	StatePhysicianPending:     EvtPhysicianEntered,
	StatePhysicianWithPatient: EvtOrderPlaced,
	StateOrdersPlaced:         EvtProcedureQueued,
	StateProcedureQueued:      EvtProcedureStarted,
	StateInProcedure:          EvtProcedureCompleted,
	StateProcedureComplete:    EvtResultsReady,
	StateResultsReady:         EvtResultsReviewStarted,
	StateResultsReview:        EvtConsultCompleted,
	StateConsultationComplete: EvtCheckoutStarted,
	StateCheckingOut:          EvtCheckoutCompleted,
	StateCheckoutComplete:     EvtClaimSubmitted,
	StateBillingPending:       EvtDischarged,
}

// AutoAdvanceEvent looks up the SYSTEM-driven next event for a state.
// Returns ("", false) when the state requires a human actor.
func AutoAdvanceEvent(state VisitState) (EventType, bool) {
	evt, ok := autoAdvanceEvents[state]
	return evt, ok
}

// ValidTransitionsFrom returns all events that can be fired from state.
func ValidTransitionsFrom(state VisitState) []Transition {
	var out []Transition
	for _, t := range transitions {
		if t.From == state {
			out = append(out, t)
		}
	}
	return out
}
