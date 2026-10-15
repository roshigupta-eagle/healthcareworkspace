package domain

import (
	"testing"
	"time"
)

func newTestCall(t *testing.T) *CallSession {
	t.Helper()
	session, history, err := NewCallSession(NewCallInput{
		TenantID:       "tenant-a",
		OrganizationID: "organization-a",
		PatientID:      "patient-a",
		AppointmentID:  "appointment-a",
		InitiatedBy:    "practitioner-a",
		CallType:       CallTypeVideo,
		Participants: []CallParticipant{
			{ID: "participant-clinician", SubjectID: "practitioner-a", Type: ParticipantPractitioner, Role: ParticipantRoleHost, State: ParticipantStateAccepted},
			{ID: "participant-a", SubjectID: "patient-a", Type: ParticipantPatient, Role: ParticipantRoleMember, State: ParticipantStateInvited},
		},
		Now: time.Date(2026, 9, 20, 12, 0, 0, 0, time.UTC),
	})
	if err != nil {
		t.Fatalf("NewCallSession() error = %v", err)
	}
	if history.ToState != CallStateCreated {
		t.Fatalf("initial history = %q, want created", history.ToState)
	}
	return session
}

func TestCallSessionAllowsOnlyLegalLifecycleTransitions(t *testing.T) {
	session := newTestCall(t)
	for _, next := range []CallState{CallStateRinging, CallStateAccepted, CallStateConnecting, CallStateActive, CallStateCompleted} {
		if _, err := session.Transition(TransitionInput{ToState: next, Source: "test", OccurredAt: time.Now().UTC()}); err != nil {
			t.Fatalf("transition to %q error = %v", next, err)
		}
	}
	if !session.State.IsTerminal() || session.EndedAt == nil {
		t.Fatalf("completed session must be terminal with ended timestamp: %#v", session)
	}
	if _, err := session.Transition(TransitionInput{ToState: CallStateActive, Source: "test"}); err == nil {
		t.Fatal("terminal call transition unexpectedly succeeded")
	} else if problem, ok := AsProblem(err); !ok || problem.Code != CodeIllegalCallTransition {
		t.Fatalf("terminal transition error = %v, want %s", err, CodeIllegalCallTransition)
	}
}

func TestCallSessionRejectsSkippedLifecycleTransition(t *testing.T) {
	session := newTestCall(t)
	if _, err := session.Transition(TransitionInput{ToState: CallStateActive, Source: "test"}); err == nil {
		t.Fatal("created to active transition unexpectedly succeeded")
	} else if problem, ok := AsProblem(err); !ok || problem.Code != CodeIllegalCallTransition {
		t.Fatalf("skipped transition error = %v, want %s", err, CodeIllegalCallTransition)
	}
}

func TestParticipantLifecycleIsSeparateFromCallLifecycle(t *testing.T) {
	session := newTestCall(t)
	for _, next := range []ParticipantState{ParticipantStateRinging, ParticipantStateAccepted, ParticipantStateJoining, ParticipantStateJoined, ParticipantStateLeft} {
		if _, err := session.TransitionParticipant("participant-a", next, "test", "practitioner-a", time.Now().UTC()); err != nil {
			t.Fatalf("participant transition to %q error = %v", next, err)
		}
	}
	if session.State != CallStateCreated {
		t.Fatalf("participant transition changed aggregate state to %q", session.State)
	}
	if session.Participants[1].LeftAt == nil {
		t.Fatal("left participant is missing left timestamp")
	}
}

func TestVideoCallRequiresPatientVisitAndClinicalHost(t *testing.T) {
	validInput := NewCallInput{
		TenantID:       "tenant-a",
		OrganizationID: "organization-a",
		PatientID:      "patient-a",
		AppointmentID:  "appointment-a",
		InitiatedBy:    "practitioner-a",
		CallType:       CallTypeVideo,
		Participants: []CallParticipant{
			{ID: "clinician-a", SubjectID: "practitioner-a", Type: ParticipantPractitioner, Role: ParticipantRoleHost, State: ParticipantStateAccepted},
			{ID: "patient-a", SubjectID: "patient-a", Type: ParticipantPatient, Role: ParticipantRoleMember, State: ParticipantStateInvited},
		},
	}

	tests := []struct {
		name   string
		mutate func(*NewCallInput)
		wantOK bool
	}{
		{name: "valid video", wantOK: true},
		{name: "valid group video", mutate: func(input *NewCallInput) { input.CallType = CallTypeGroupVideo }, wantOK: true},
		{name: "group video missing patient", mutate: func(input *NewCallInput) { input.CallType, input.PatientID = CallTypeGroupVideo, "" }},
		{name: "valid encounter context", mutate: func(input *NewCallInput) { input.AppointmentID, input.EncounterID = "", "encounter-a" }, wantOK: true},
		{name: "missing patient", mutate: func(input *NewCallInput) { input.PatientID = "" }},
		{name: "missing visit", mutate: func(input *NewCallInput) { input.AppointmentID = "" }},
		{name: "mismatched patient participant", mutate: func(input *NewCallInput) { input.Participants[1].SubjectID = "patient-b" }},
		{name: "missing clinician host", mutate: func(input *NewCallInput) { input.Participants[0].Role = ParticipantRoleMember }},
		{name: "nonclinical host", mutate: func(input *NewCallInput) { input.Participants[0].Type = ParticipantCaregiver }},
		{name: "host does not match initiator", mutate: func(input *NewCallInput) { input.Participants[0].SubjectID = "practitioner-b" }},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			input := validInput
			input.Participants = append([]CallParticipant(nil), validInput.Participants...)
			if test.mutate != nil {
				test.mutate(&input)
			}
			_, _, err := NewCallSession(input)
			if test.wantOK {
				if err != nil {
					t.Fatalf("NewCallSession() error = %v", err)
				}
				return
			}
			if problem, ok := AsProblem(err); !ok || problem.Code != CodeValidationFailed {
				t.Fatalf("NewCallSession() error = %v, want %s", err, CodeValidationFailed)
			}
		})
	}
}
