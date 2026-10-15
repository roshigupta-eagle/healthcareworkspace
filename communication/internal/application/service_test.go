package application_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"healthcareworkspace/communication/internal/application"
	"healthcareworkspace/communication/internal/authorization"
	"healthcareworkspace/communication/internal/domain"
	"healthcareworkspace/communication/internal/media"
	"healthcareworkspace/communication/internal/persistence/memory"
)

type policyAuthorizer struct {
	scopes map[authorization.Action]authorization.CallScope
}

type recordingProvider struct {
	starts  []media.StartRequest
	hangups int
}

func (p *recordingProvider) Name() string { return "test-provider" }
func (p *recordingProvider) Start(_ context.Context, request media.StartRequest) (media.Session, error) {
	p.starts = append(p.starts, request)
	return media.Session{Provider: "test-provider", RoomID: "opaque-room"}, nil
}
func (p *recordingProvider) Answer(context.Context, media.Session) error { return nil }
func (p *recordingProvider) Hangup(context.Context, media.Session) error {
	p.hangups++
	return nil
}
func (p *recordingProvider) Hold(context.Context, media.Session) error   { return nil }
func (p *recordingProvider) Resume(context.Context, media.Session) error { return nil }
func (p *recordingProvider) Transfer(context.Context, media.Session, media.TransferRequest) error {
	return nil
}
func (p *recordingProvider) AddParticipant(context.Context, media.Session, string) error { return nil }
func (p *recordingProvider) RemoveParticipant(context.Context, media.Session, string) error {
	return nil
}
func (p *recordingProvider) StartRecording(context.Context, media.Session, string) error { return nil }
func (p *recordingProvider) StopRecording(context.Context, media.Session) error          { return nil }

type failingTransitionRepository struct{ application.Repository }

func (failingTransitionRepository) Transition(context.Context, application.TransitionRecord) error {
	return errors.New("durable transition failed")
}

type uncertainTransitionRepository struct{ application.Repository }

func (r uncertainTransitionRepository) Transition(ctx context.Context, record application.TransitionRecord) error {
	if err := r.Repository.Transition(ctx, record); err != nil {
		return err
	}
	return errors.New("connection dropped after commit")
}

func (a policyAuthorizer) Scope(_ context.Context, action authorization.Action, actor authorization.Actor) (authorization.CallScope, error) {
	if scope, ok := a.scopes[action]; ok {
		return scope, nil
	}
	return authorization.CallScope{TenantID: actor.TenantID, OrganizationID: actor.OrganizationID, OrganizationWide: true}, nil
}

func (policyAuthorizer) Authorize(context.Context, authorization.Action, authorization.Actor, *domain.CallSession) error {
	return nil
}

func testActor() authorization.Actor {
	return authorization.Actor{ID: "practitioner-a", TenantID: "tenant-a", OrganizationID: "organization-a"}
}

func createRequest(key, patientID string) application.CreateCallRequest {
	return application.CreateCallRequest{
		PatientID:      patientID,
		AppointmentID:  "appointment-" + patientID,
		CallType:       domain.CallTypeVideo,
		IdempotencyKey: key,
		Participants: []domain.CallParticipant{
			{ID: "clinician-" + patientID, SubjectID: "practitioner-a", Type: domain.ParticipantPractitioner, Role: domain.ParticipantRoleHost, State: domain.ParticipantStateAccepted},
			{ID: "participant-" + patientID, SubjectID: patientID, Type: domain.ParticipantPatient, Role: domain.ParticipantRoleMember, State: domain.ParticipantStateInvited},
		},
	}
}

func newService(repository application.Repository, authorizer authorization.Service, provider media.Provider) *application.Service {
	return application.New(application.Dependencies{
		Repository: repository,
		Authorizer: authorizer,
		Media:      provider,
		Now:        func() time.Time { return time.Date(2026, 9, 20, 12, 0, 0, 0, time.UTC) },
	})
}

func TestCreateCallIsIdempotentAndAuditable(t *testing.T) {
	ctx := context.Background()
	repository := memory.New()
	service := newService(repository, policyAuthorizer{}, media.Unavailable{})
	actor := testActor()

	created, err := service.CreateCall(ctx, actor, createRequest("key-1", "patient-a"))
	if err != nil {
		t.Fatalf("CreateCall() error = %v", err)
	}
	if created.Replayed || created.Session.State != domain.CallStateCreated {
		t.Fatalf("created result = %#v, want non-replayed created session", created)
	}
	if history := repository.History(created.Session.ID); len(history) != 1 || history[0].ToState != domain.CallStateCreated {
		t.Fatalf("history = %#v, want one created transition", history)
	}

	replayed, err := service.CreateCall(ctx, actor, createRequest("key-1", "patient-a"))
	if err != nil {
		t.Fatalf("replayed CreateCall() error = %v", err)
	}
	if !replayed.Replayed || replayed.Session.ID != created.Session.ID {
		t.Fatalf("replayed result = %#v, want original call %q", replayed, created.Session.ID)
	}

	_, err = service.CreateCall(ctx, actor, createRequest("key-1", "patient-b"))
	if problem, ok := domain.AsProblem(err); !ok || problem.Code != domain.CodeIdempotencyConflict {
		t.Fatalf("conflicting idempotency key error = %v, want %s", err, domain.CodeIdempotencyConflict)
	}
}

func TestUnavailableMediaDoesNotFabricateRingingState(t *testing.T) {
	ctx := context.Background()
	repository := memory.New()
	service := newService(repository, policyAuthorizer{}, media.Unavailable{})
	actor := testActor()
	created, err := service.CreateCall(ctx, actor, createRequest("key-2", "patient-a"))
	if err != nil {
		t.Fatalf("CreateCall() error = %v", err)
	}

	session, err := service.StartMedia(ctx, actor, created.Session.ID, "correlation-a")
	if problem, ok := domain.AsProblem(err); !ok || problem.Code != domain.CodeMediaProviderUnavailable {
		t.Fatalf("StartMedia() error = %v, want %s", err, domain.CodeMediaProviderUnavailable)
	}
	if session == nil || session.State != domain.CallStateCreated {
		t.Fatalf("StartMedia() session = %#v, want durable created session", session)
	}
	persisted, err := service.GetCall(ctx, actor, created.Session.ID)
	if err != nil {
		t.Fatalf("GetCall() error = %v", err)
	}
	if persisted.State != domain.CallStateCreated || persisted.ProviderRoomID != "" {
		t.Fatalf("persisted call was mutated by unavailable media: %#v", persisted)
	}
}

func TestMediaStartUsesDurableIdempotencyAndCleansUpUncommittedRoom(t *testing.T) {
	ctx := context.Background()
	backing := memory.New()
	provider := &recordingProvider{}
	service := newService(failingTransitionRepository{Repository: backing}, policyAuthorizer{}, provider)
	actor := testActor()
	created, err := service.CreateCall(ctx, actor, createRequest("key-2b", "patient-a"))
	if err != nil {
		t.Fatalf("CreateCall() error = %v", err)
	}
	if _, err := service.StartMedia(ctx, actor, created.Session.ID, "correlation-b"); err == nil {
		t.Fatal("StartMedia() unexpectedly succeeded after durable transition failure")
	}
	if len(provider.starts) != 1 || provider.starts[0].IdempotencyKey != created.Session.ID {
		t.Fatalf("provider starts = %#v, want call-ID idempotency key", provider.starts)
	}
	if provider.hangups != 1 {
		t.Fatalf("provider cleanup count = %d, want 1", provider.hangups)
	}
}

func TestMediaCleanupPreservesConcurrentlyCommittedRoom(t *testing.T) {
	ctx := context.Background()
	backing := memory.New()
	provider := &recordingProvider{}
	service := newService(uncertainTransitionRepository{Repository: backing}, policyAuthorizer{}, provider)
	actor := testActor()
	created, err := service.CreateCall(ctx, actor, createRequest("key-2c", "patient-a"))
	if err != nil {
		t.Fatalf("CreateCall() error = %v", err)
	}
	if _, err := service.StartMedia(ctx, actor, created.Session.ID, "correlation-c"); err == nil {
		t.Fatal("StartMedia() unexpectedly succeeded after uncertain transition")
	}
	if provider.hangups != 0 {
		t.Fatalf("provider cleanup count = %d, want 0 after reconciliation", provider.hangups)
	}
}

func TestReadAndListUsePolicyScopeWithoutMediaDependency(t *testing.T) {
	ctx := context.Background()
	repository := memory.New()
	actor := testActor()
	creator := newService(repository, policyAuthorizer{}, nil)
	first, err := creator.CreateCall(ctx, actor, createRequest("key-3", "patient-a"))
	if err != nil {
		t.Fatalf("first CreateCall() error = %v", err)
	}
	if _, err := creator.CreateCall(ctx, actor, createRequest("key-4", "patient-b")); err != nil {
		t.Fatalf("second CreateCall() error = %v", err)
	}

	restrictedScope := authorization.CallScope{TenantID: actor.TenantID, OrganizationID: actor.OrganizationID, PatientIDs: []string{"patient-a"}}
	reader := newService(repository, policyAuthorizer{scopes: map[authorization.Action]authorization.CallScope{
		authorization.ActionListCalls:       restrictedScope,
		authorization.ActionViewCall:        restrictedScope,
		authorization.ActionViewCallHistory: restrictedScope,
	}}, nil)
	page, err := reader.ListCalls(ctx, actor, 50)
	if err != nil {
		t.Fatalf("ListCalls() error = %v", err)
	}
	if len(page.Items) != 1 || page.Items[0].ID != first.Session.ID {
		t.Fatalf("scoped ListCalls() = %#v, want only %q", page.Items, first.Session.ID)
	}
	if _, err := reader.GetCall(ctx, actor, first.Session.ID); err != nil {
		t.Fatalf("scoped GetCall() error = %v", err)
	}
	history, err := reader.GetCallHistory(ctx, actor, first.Session.ID, 10)
	if err != nil {
		t.Fatalf("GetCallHistory() error = %v", err)
	}
	if len(history.Items) != 1 || history.Items[0].ToState != domain.CallStateCreated {
		t.Fatalf("GetCallHistory() = %#v, want durable created transition", history)
	}
	if _, err := reader.GetCall(ctx, actor, page.Items[0].ID+"-missing"); err == nil {
		t.Fatal("GetCall() unexpectedly returned a missing call")
	}

	otherOrganization := authorization.Actor{ID: actor.ID, TenantID: actor.TenantID, OrganizationID: "organization-b"}
	otherReader := newService(repository, policyAuthorizer{}, nil)
	if _, err := otherReader.GetCall(ctx, otherOrganization, first.Session.ID); err == nil {
		t.Fatal("cross-organization GetCall() unexpectedly succeeded")
	} else if problem, ok := domain.AsProblem(err); !ok || problem.Code != domain.CodeCallNotFound {
		t.Fatalf("cross-organization GetCall() error = %v, want non-disclosing %s", err, domain.CodeCallNotFound)
	}
}
