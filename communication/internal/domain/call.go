package domain

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// CallSession is Roshi's operational control-plane aggregate. It is not a
// FHIR resource and its lifecycle is intentionally independent from an
// Appointment or Encounter.
type CallSession struct {
	ID             string            `json:"id"`
	TenantID       string            `json:"tenantId"`
	OrganizationID string            `json:"organizationId"`
	PatientID      string            `json:"patientId,omitempty"`
	AppointmentID  string            `json:"appointmentId,omitempty"`
	EncounterID    string            `json:"encounterId,omitempty"`
	ConversationID string            `json:"conversationId,omitempty"`
	CallType       CallType          `json:"callType"`
	State          CallState         `json:"state"`
	Provider       string            `json:"provider,omitempty"`
	ProviderRoomID string            `json:"providerRoomId,omitempty"`
	InitiatedBy    string            `json:"initiatedBy"`
	Version        int64             `json:"version"`
	CreatedAt      time.Time         `json:"createdAt"`
	RingingAt      *time.Time        `json:"ringingAt,omitempty"`
	AcceptedAt     *time.Time        `json:"acceptedAt,omitempty"`
	ConnectingAt   *time.Time        `json:"connectingAt,omitempty"`
	ConnectedAt    *time.Time        `json:"connectedAt,omitempty"`
	EndedAt        *time.Time        `json:"endedAt,omitempty"`
	EndReason      string            `json:"endReason,omitempty"`
	Participants   []CallParticipant `json:"participants"`
}

// Clone keeps persistence implementations from exposing mutable aggregates.
func (s *CallSession) Clone() *CallSession {
	if s == nil {
		return nil
	}
	clone := *s
	clone.RingingAt = copyTime(s.RingingAt)
	clone.AcceptedAt = copyTime(s.AcceptedAt)
	clone.ConnectingAt = copyTime(s.ConnectingAt)
	clone.ConnectedAt = copyTime(s.ConnectedAt)
	clone.EndedAt = copyTime(s.EndedAt)
	clone.Participants = append([]CallParticipant(nil), s.Participants...)
	for index := range clone.Participants {
		clone.Participants[index].JoinedAt = copyTime(s.Participants[index].JoinedAt)
		clone.Participants[index].LeftAt = copyTime(s.Participants[index].LeftAt)
	}
	return &clone
}

func copyTime(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	copy := *value
	return &copy
}

// CallType is an operational media intent, not a coded clinical concept.
type CallType string

const (
	CallTypeAudio      CallType = "audio"
	CallTypeVideo      CallType = "video"
	CallTypeGroupAudio CallType = "group_audio"
	CallTypeGroupVideo CallType = "group_video"
)

func (t CallType) valid() bool {
	switch t {
	case CallTypeAudio, CallTypeVideo, CallTypeGroupAudio, CallTypeGroupVideo:
		return true
	default:
		return false
	}
}

func (t CallType) requiresPatientTelehealthContext() bool {
	return t == CallTypeVideo || t == CallTypeGroupVideo
}

// CallState captures media-control state. It deliberately does not represent
// Encounter state, clinical documentation status, or delivery/read state.
type CallState string

const (
	CallStateCreated      CallState = "CREATED"
	CallStateRinging      CallState = "RINGING"
	CallStateAccepted     CallState = "ACCEPTED"
	CallStateConnecting   CallState = "CONNECTING"
	CallStateActive       CallState = "ACTIVE"
	CallStateReconnecting CallState = "RECONNECTING"
	CallStateCompleted    CallState = "COMPLETED"
	CallStateDeclined     CallState = "DECLINED"
	CallStateMissed       CallState = "MISSED"
	CallStateCancelled    CallState = "CANCELLED"
	CallStateFailed       CallState = "FAILED"
)

func (s CallState) valid() bool {
	switch s {
	case CallStateCreated, CallStateRinging, CallStateAccepted,
		CallStateConnecting, CallStateActive, CallStateReconnecting,
		CallStateCompleted, CallStateDeclined, CallStateMissed, CallStateCancelled, CallStateFailed:
		return true
	default:
		return false
	}
}

func (s CallState) IsTerminal() bool {
	switch s {
	case CallStateCompleted, CallStateDeclined, CallStateMissed, CallStateCancelled, CallStateFailed:
		return true
	default:
		return false
	}
}

// ParticipantType captures the business identity used by the control plane.
// It is not an authorization grant and it is not a FHIR coding.
type ParticipantType string

const (
	ParticipantPatient       ParticipantType = "patient"
	ParticipantPractitioner  ParticipantType = "practitioner"
	ParticipantNurse         ParticipantType = "nurse"
	ParticipantSpecialist    ParticipantType = "specialist"
	ParticipantCaregiver     ParticipantType = "caregiver"
	ParticipantInterpreter   ParticipantType = "interpreter"
	ParticipantRelatedPerson ParticipantType = "related_person"
	ParticipantObserver      ParticipantType = "observer"
)

func (t ParticipantType) valid() bool {
	switch t {
	case ParticipantPatient, ParticipantPractitioner, ParticipantNurse, ParticipantSpecialist,
		ParticipantCaregiver, ParticipantInterpreter, ParticipantRelatedPerson, ParticipantObserver:
		return true
	default:
		return false
	}
}

type ParticipantRole string

const (
	ParticipantRoleHost      ParticipantRole = "host"
	ParticipantRoleModerator ParticipantRole = "moderator"
	ParticipantRoleMember    ParticipantRole = "participant"
	ParticipantRoleObserver  ParticipantRole = "observer"
	ParticipantRoleInvitee   ParticipantRole = "invitee"
)

func (r ParticipantRole) valid() bool {
	switch r {
	case ParticipantRoleHost, ParticipantRoleModerator, ParticipantRoleMember, ParticipantRoleObserver, ParticipantRoleInvitee:
		return true
	default:
		return false
	}
}

type ParticipantState string

const (
	ParticipantStateInvited  ParticipantState = "invited"
	ParticipantStateRinging  ParticipantState = "ringing"
	ParticipantStateAccepted ParticipantState = "accepted"
	ParticipantStateJoining  ParticipantState = "joining"
	ParticipantStateJoined   ParticipantState = "joined"
	ParticipantStateLeft     ParticipantState = "left"
	ParticipantStateRemoved  ParticipantState = "removed"
	ParticipantStateDeclined ParticipantState = "declined"
	ParticipantStateMissed   ParticipantState = "missed"
)

func (s ParticipantState) valid() bool {
	switch s {
	case ParticipantStateInvited, ParticipantStateRinging, ParticipantStateAccepted,
		ParticipantStateJoining, ParticipantStateJoined, ParticipantStateLeft,
		ParticipantStateRemoved, ParticipantStateDeclined, ParticipantStateMissed:
		return true
	default:
		return false
	}
}

// CallParticipant stores opaque internal identifiers only. Display values are
// resolved by an authorized host and are never embedded in media identities.
type CallParticipant struct {
	ID            string           `json:"id"`
	SubjectID     string           `json:"subjectId"`
	Type          ParticipantType  `json:"type"`
	Role          ParticipantRole  `json:"role"`
	State         ParticipantState `json:"state"`
	MediaIdentity string           `json:"mediaIdentity,omitempty"`
	JoinedAt      *time.Time       `json:"joinedAt,omitempty"`
	LeftAt        *time.Time       `json:"leftAt,omitempty"`
}

func (p CallParticipant) validate() error {
	if strings.TrimSpace(p.ID) == "" || strings.TrimSpace(p.SubjectID) == "" {
		return NewProblem(CodeValidationFailed, 422, "A participant requires opaque participant and subject identifiers.", false, nil)
	}
	if !p.Type.valid() || !p.Role.valid() || !p.State.valid() {
		return NewProblem(CodeValidationFailed, 422, "A participant type, role, or state is not supported.", false, nil)
	}
	return nil
}

// NewCallInput deliberately carries operational references only. FHIR mapping
// is a separately gated adapter and is not part of this aggregate.
type NewCallInput struct {
	TenantID       string
	OrganizationID string
	PatientID      string
	AppointmentID  string
	EncounterID    string
	ConversationID string
	CallType       CallType
	InitiatedBy    string
	Participants   []CallParticipant
	Now            time.Time
}

// StateTransition is append-only history for support, audit, and replay. Its
// fields contain opaque IDs and controlled reason/source values only.
type StateTransition struct {
	ID            string     `json:"id"`
	CallSessionID string     `json:"callSessionId"`
	FromState     *CallState `json:"fromState,omitempty"`
	ToState       CallState  `json:"toState"`
	ReasonCode    string     `json:"reasonCode,omitempty"`
	Source        string     `json:"source"`
	ActorID       string     `json:"actorId,omitempty"`
	OccurredAt    time.Time  `json:"occurredAt"`
}

// ParticipantStateTransition uses the same audit approach without conflating a
// participant's attendance with the aggregate call state.
type ParticipantStateTransition struct {
	ID            string           `json:"id"`
	CallSessionID string           `json:"callSessionId"`
	ParticipantID string           `json:"participantId"`
	FromState     ParticipantState `json:"fromState"`
	ToState       ParticipantState `json:"toState"`
	Source        string           `json:"source"`
	ActorID       string           `json:"actorId,omitempty"`
	OccurredAt    time.Time        `json:"occurredAt"`
}

func NewCallSession(input NewCallInput) (*CallSession, StateTransition, error) {
	if strings.TrimSpace(input.TenantID) == "" || strings.TrimSpace(input.OrganizationID) == "" || strings.TrimSpace(input.InitiatedBy) == "" {
		return nil, StateTransition{}, NewProblem(CodeValidationFailed, 422, "Tenant, organization, and initiating actor are required.", false, nil)
	}
	if !input.CallType.valid() {
		return nil, StateTransition{}, NewProblem(CodeValidationFailed, 422, "The call type is not supported.", false, nil)
	}
	if len(input.Participants) == 0 {
		return nil, StateTransition{}, NewProblem(CodeValidationFailed, 422, "A call requires at least one authorized participant.", false, nil)
	}

	now := input.Now.UTC()
	if now.IsZero() {
		now = time.Now().UTC()
	}
	participants := append([]CallParticipant(nil), input.Participants...)
	seen := make(map[string]struct{}, len(participants))
	seenSubjects := make(map[string]struct{}, len(participants))
	for index := range participants {
		if participants[index].ID == "" {
			participants[index].ID = uuid.NewString()
		}
		if participants[index].State == "" {
			participants[index].State = ParticipantStateInvited
		}
		if err := participants[index].validate(); err != nil {
			return nil, StateTransition{}, err
		}
		if _, duplicate := seen[participants[index].ID]; duplicate {
			return nil, StateTransition{}, NewProblem(CodeValidationFailed, 422, "Participant identifiers must be unique within a call.", false, nil)
		}
		if _, duplicate := seenSubjects[participants[index].SubjectID]; duplicate {
			return nil, StateTransition{}, NewProblem(CodeValidationFailed, 422, "Participant subjects must be unique within a call.", false, nil)
		}
		seen[participants[index].ID] = struct{}{}
		seenSubjects[participants[index].SubjectID] = struct{}{}
	}
	if input.CallType.requiresPatientTelehealthContext() {
		if err := validatePatientTelehealthContext(input, participants); err != nil {
			return nil, StateTransition{}, err
		}
	}

	session := &CallSession{
		ID:             uuid.NewString(),
		TenantID:       strings.TrimSpace(input.TenantID),
		OrganizationID: strings.TrimSpace(input.OrganizationID),
		PatientID:      strings.TrimSpace(input.PatientID),
		AppointmentID:  strings.TrimSpace(input.AppointmentID),
		EncounterID:    strings.TrimSpace(input.EncounterID),
		ConversationID: strings.TrimSpace(input.ConversationID),
		CallType:       input.CallType,
		State:          CallStateCreated,
		InitiatedBy:    strings.TrimSpace(input.InitiatedBy),
		Version:        1,
		CreatedAt:      now,
		Participants:   participants,
	}
	transition := StateTransition{
		ID:            uuid.NewString(),
		CallSessionID: session.ID,
		ToState:       CallStateCreated,
		ReasonCode:    "created",
		Source:        "control_plane",
		ActorID:       session.InitiatedBy,
		OccurredAt:    now,
	}
	return session, transition, nil
}

// validatePatientTelehealthContext makes the minimum operational binding for a
// video room explicit. It does not replace the authorization, consent, care
// relationship, or visit-eligibility policy enforced outside this aggregate.
func validatePatientTelehealthContext(input NewCallInput, participants []CallParticipant) error {
	patientID := strings.TrimSpace(input.PatientID)
	if patientID == "" {
		return NewProblem(CodeValidationFailed, 422, "Video calls require a patient context.", false, nil)
	}
	if strings.TrimSpace(input.AppointmentID) == "" && strings.TrimSpace(input.EncounterID) == "" {
		return NewProblem(CodeValidationFailed, 422, "Video calls require an appointment or encounter context.", false, nil)
	}

	patientParticipant := false
	clinicalHost := false
	initiatorID := strings.TrimSpace(input.InitiatedBy)
	for _, participant := range participants {
		if participant.Type == ParticipantPatient && participant.SubjectID == patientID {
			patientParticipant = true
		}
		if participant.SubjectID == initiatorID && participant.Role == ParticipantRoleHost && isClinicalParticipant(participant.Type) {
			clinicalHost = true
		}
	}
	if !patientParticipant {
		return NewProblem(CodeValidationFailed, 422, "Video calls require a participant matching the patient context.", false, nil)
	}
	if !clinicalHost {
		return NewProblem(CodeValidationFailed, 422, "Video calls require a clinician host participant.", false, nil)
	}
	return nil
}

func isClinicalParticipant(participantType ParticipantType) bool {
	switch participantType {
	case ParticipantPractitioner, ParticipantNurse, ParticipantSpecialist:
		return true
	default:
		return false
	}
}

type TransitionInput struct {
	ToState    CallState
	ReasonCode string
	Source     string
	ActorID    string
	OccurredAt time.Time
}

// Transition applies one legal aggregate state change and returns the
// append-only record that persistence must commit in the same transaction.
func (s *CallSession) Transition(input TransitionInput) (StateTransition, error) {
	if s == nil || !s.State.valid() {
		return StateTransition{}, NewProblem(CodeValidationFailed, 422, "The call session is invalid.", false, nil)
	}
	if strings.TrimSpace(input.Source) == "" {
		return StateTransition{}, NewProblem(CodeValidationFailed, 422, "A transition source is required for the audit history.", false, nil)
	}
	if !input.ToState.valid() || !canTransition(s.State, input.ToState) {
		return StateTransition{}, NewProblem(CodeIllegalCallTransition, 409, fmt.Sprintf("The call cannot transition from %s to %s.", s.State, input.ToState), false, nil)
	}
	when := input.OccurredAt.UTC()
	if when.IsZero() {
		when = time.Now().UTC()
	}
	from := s.State
	s.State = input.ToState
	s.Version++
	s.setStateTimestamp(input.ToState, when)
	if input.ToState.IsTerminal() {
		s.EndReason = strings.TrimSpace(input.ReasonCode)
	}
	return StateTransition{
		ID:            uuid.NewString(),
		CallSessionID: s.ID,
		FromState:     &from,
		ToState:       input.ToState,
		ReasonCode:    strings.TrimSpace(input.ReasonCode),
		Source:        strings.TrimSpace(input.Source),
		ActorID:       strings.TrimSpace(input.ActorID),
		OccurredAt:    when,
	}, nil
}

func (s *CallSession) setStateTimestamp(state CallState, when time.Time) {
	switch state {
	case CallStateRinging:
		setTimeIfMissing(&s.RingingAt, when)
	case CallStateAccepted:
		setTimeIfMissing(&s.AcceptedAt, when)
	case CallStateConnecting:
		setTimeIfMissing(&s.ConnectingAt, when)
	case CallStateActive:
		setTimeIfMissing(&s.ConnectedAt, when)
	default:
		if state.IsTerminal() {
			setTimeIfMissing(&s.EndedAt, when)
		}
	}
}

func setTimeIfMissing(target **time.Time, when time.Time) {
	if *target != nil {
		return
	}
	copy := when
	*target = &copy
}

func canTransition(from, to CallState) bool {
	allowed := map[CallState]map[CallState]bool{
		CallStateCreated:      {CallStateRinging: true, CallStateCancelled: true, CallStateFailed: true},
		CallStateRinging:      {CallStateAccepted: true, CallStateDeclined: true, CallStateMissed: true, CallStateCancelled: true, CallStateFailed: true},
		CallStateAccepted:     {CallStateConnecting: true, CallStateCancelled: true, CallStateFailed: true},
		CallStateConnecting:   {CallStateActive: true, CallStateCancelled: true, CallStateFailed: true},
		CallStateActive:       {CallStateReconnecting: true, CallStateCompleted: true, CallStateCancelled: true, CallStateFailed: true},
		CallStateReconnecting: {CallStateActive: true, CallStateCompleted: true, CallStateCancelled: true, CallStateFailed: true},
	}
	return allowed[from][to]
}

func (s *CallSession) TransitionParticipant(participantID string, to ParticipantState, source, actorID string, occurredAt time.Time) (ParticipantStateTransition, error) {
	if s == nil || !to.valid() {
		return ParticipantStateTransition{}, NewProblem(CodeValidationFailed, 422, "The participant transition is invalid.", false, nil)
	}
	if strings.TrimSpace(source) == "" {
		return ParticipantStateTransition{}, NewProblem(CodeValidationFailed, 422, "A participant transition source is required for the audit history.", false, nil)
	}
	when := occurredAt.UTC()
	if when.IsZero() {
		when = time.Now().UTC()
	}
	for index := range s.Participants {
		participant := &s.Participants[index]
		if participant.ID != participantID {
			continue
		}
		if !canTransitionParticipant(participant.State, to) {
			return ParticipantStateTransition{}, NewProblem(CodeIllegalCallTransition, 409, fmt.Sprintf("The participant cannot transition from %s to %s.", participant.State, to), false, nil)
		}
		from := participant.State
		participant.State = to
		if to == ParticipantStateJoined {
			setTimeIfMissing(&participant.JoinedAt, when)
		}
		if to == ParticipantStateLeft || to == ParticipantStateRemoved || to == ParticipantStateDeclined || to == ParticipantStateMissed {
			setTimeIfMissing(&participant.LeftAt, when)
		}
		return ParticipantStateTransition{ID: uuid.NewString(), CallSessionID: s.ID, ParticipantID: participant.ID, FromState: from, ToState: to, Source: strings.TrimSpace(source), ActorID: strings.TrimSpace(actorID), OccurredAt: when}, nil
	}
	return ParticipantStateTransition{}, NewProblem(CodeCallNotFound, 404, "The participant is not part of this call.", false, nil)
}

func canTransitionParticipant(from, to ParticipantState) bool {
	allowed := map[ParticipantState]map[ParticipantState]bool{
		ParticipantStateInvited:  {ParticipantStateRinging: true, ParticipantStateAccepted: true, ParticipantStateDeclined: true, ParticipantStateRemoved: true, ParticipantStateMissed: true},
		ParticipantStateRinging:  {ParticipantStateAccepted: true, ParticipantStateDeclined: true, ParticipantStateMissed: true, ParticipantStateRemoved: true},
		ParticipantStateAccepted: {ParticipantStateJoining: true, ParticipantStateRemoved: true},
		ParticipantStateJoining:  {ParticipantStateJoined: true, ParticipantStateLeft: true, ParticipantStateRemoved: true},
		ParticipantStateJoined:   {ParticipantStateLeft: true, ParticipantStateRemoved: true},
	}
	return allowed[from][to]
}
