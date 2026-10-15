package application

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"healthcareworkspace/communication/internal/audit"
	"healthcareworkspace/communication/internal/authorization"
	"healthcareworkspace/communication/internal/domain"
	"healthcareworkspace/communication/internal/media"
	"healthcareworkspace/communication/internal/push"
	"healthcareworkspace/communication/internal/realtime"
)

type Dependencies struct {
	Repository Repository
	Authorizer authorization.Service
	Media      media.Provider
	Audit      audit.Writer
	Realtime   realtime.Publisher
	Push       push.Sender
	Now        func() time.Time
}

type Service struct {
	repository Repository
	authorizer authorization.Service
	media      media.Provider
	audit      audit.Writer
	realtime   realtime.Publisher
	push       push.Sender
	now        func() time.Time
}

func New(dependencies Dependencies) *Service {
	now := dependencies.Now
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &Service{
		repository: dependencies.Repository,
		authorizer: dependencies.Authorizer,
		media:      dependencies.Media,
		audit:      dependencies.Audit,
		realtime:   dependencies.Realtime,
		push:       dependencies.Push,
		now:        now,
	}
}

type CreateCallRequest struct {
	PatientID      string
	AppointmentID  string
	EncounterID    string
	ConversationID string
	CallType       domain.CallType
	Participants   []domain.CallParticipant
	IdempotencyKey string
	CorrelationID  string
}

type CreateCallResult struct {
	Session  *domain.CallSession
	Replayed bool
}

func (s *Service) CreateCall(ctx context.Context, actor authorization.Actor, request CreateCallRequest) (CreateCallResult, error) {
	if err := s.requireStoreAndAuthorization(); err != nil {
		return CreateCallResult{}, err
	}
	if !actor.Valid() {
		return CreateCallResult{}, domain.NewProblem(domain.CodeAuthorizationUnavailable, 503, "Trusted actor context is required to create a call.", true, nil)
	}
	if strings.TrimSpace(request.IdempotencyKey) == "" {
		return CreateCallResult{}, domain.NewProblem(domain.CodeValidationFailed, 400, "An idempotency key is required to create a call.", false, nil)
	}
	createScope, err := s.scope(ctx, authorization.ActionCreateCall, actor)
	if err != nil {
		return CreateCallResult{}, err
	}

	fingerprint := createFingerprint(actor, request)
	existing, err := s.repository.FindByIdempotency(ctx, createScope, actor.ID, request.IdempotencyKey)
	if err != nil && !errors.Is(err, ErrNotFound) {
		return CreateCallResult{}, mapRepositoryError(err)
	}
	if existing != nil {
		if existing.Fingerprint != fingerprint {
			return CreateCallResult{}, domain.NewProblem(domain.CodeIdempotencyConflict, 409, "This idempotency key was used for a different call request.", false, nil)
		}
		session, _, getErr := s.getAuthorized(ctx, actor, existing.CallID, authorization.ActionViewCall)
		if getErr != nil {
			return CreateCallResult{}, getErr
		}
		return CreateCallResult{Session: session, Replayed: true}, nil
	}

	session, history, err := domain.NewCallSession(domain.NewCallInput{
		TenantID:       actor.TenantID,
		OrganizationID: actor.OrganizationID,
		PatientID:      request.PatientID,
		AppointmentID:  request.AppointmentID,
		EncounterID:    request.EncounterID,
		ConversationID: request.ConversationID,
		CallType:       request.CallType,
		InitiatedBy:    actor.ID,
		Participants:   request.Participants,
		Now:            s.now(),
	})
	if err != nil {
		return CreateCallResult{}, err
	}
	if !createScope.Allows(session) {
		return CreateCallResult{}, permissionDenied("The caller is not permitted to create a call for the requested scope.")
	}
	if err := s.authorizer.Authorize(ctx, authorization.ActionCreateCall, actor, session); err != nil {
		return CreateCallResult{}, err
	}
	event := domain.NewCallEvent(session, "communication.call.created.v1", request.CorrelationID, "", history.OccurredAt)
	record := CreateRecord{
		Session: session,
		Scope:   createScope,
		History: history,
		Outbox:  event,
		Idempotency: IdempotencyRecord{
			TenantID: actor.TenantID, OrganizationID: actor.OrganizationID, ActorID: actor.ID,
			Key: request.IdempotencyKey, Fingerprint: fingerprint, CallID: session.ID, CreatedAt: history.OccurredAt,
		},
	}
	if err := s.repository.Create(ctx, record); err != nil {
		if errors.Is(err, ErrIdempotencyExists) {
			return s.resolveConcurrentCreate(ctx, actor, request, fingerprint, createScope)
		}
		return CreateCallResult{}, mapRepositoryError(err)
	}
	return CreateCallResult{Session: session}, nil
}

// StartMedia asks the provider for a real media session before moving the call
// to ringing. With the default unavailable provider it returns 503 and leaves
// the durable CallSession in CREATED rather than fabricating remote activity.
func (s *Service) StartMedia(ctx context.Context, actor authorization.Actor, callID, correlationID string) (*domain.CallSession, error) {
	session, scope, err := s.getAuthorized(ctx, actor, callID, authorization.ActionStartMedia)
	if err != nil {
		return nil, err
	}
	if err := s.requireMedia(); err != nil {
		return nil, err
	}
	if session.State == domain.CallStateRinging && session.Provider != "" && session.ProviderRoomID != "" {
		// A caller may be retrying after an ambiguous database acknowledgement.
		// The durable provider binding is the successful, idempotent result.
		return session, nil
	}
	if session.State != domain.CallStateCreated {
		return nil, domain.NewProblem(domain.CodeIllegalCallTransition, 409, "Media can only start from a created call.", false, nil)
	}
	providerSession, err := s.media.Start(ctx, media.StartRequest{CallID: session.ID, IdempotencyKey: session.ID, TenantID: session.TenantID, OrganizationID: session.OrganizationID, CallType: session.CallType, InitiatorID: actor.ID})
	if err != nil {
		return session, err
	}
	if strings.TrimSpace(providerSession.Provider) == "" || strings.TrimSpace(providerSession.RoomID) == "" {
		return session, domain.NewProblem(domain.CodeMediaProviderFailure, 502, "The media provider did not return a usable opaque media session.", true, nil)
	}
	session.Provider = providerSession.Provider
	session.ProviderRoomID = providerSession.RoomID
	transition, err := session.Transition(domain.TransitionInput{ToState: domain.CallStateRinging, ReasonCode: "provider_session_created", Source: "media_provider", ActorID: actor.ID, OccurredAt: s.now()})
	if err != nil {
		return nil, err
	}
	if err := s.repository.Transition(ctx, TransitionRecord{Session: session, Scope: scope, ExpectedVersion: session.Version - 1, History: transition, Outbox: domain.NewCallEvent(session, "communication.call.ringing.v1", correlationID, transition.ID, transition.OccurredAt)}); err != nil {
		s.compensateMediaStart(ctx, scope, session, providerSession)
		return nil, mapRepositoryError(err)
	}
	return session, nil
}

// EndMedia releases the configured provider room before persisting the final
// control-plane state. It is idempotent for an already terminal session.
func (s *Service) EndMedia(ctx context.Context, actor authorization.Actor, callID, correlationID string) (*domain.CallSession, error) {
	session, scope, err := s.getAuthorized(ctx, actor, callID, authorization.ActionEndMedia)
	if err != nil {
		return nil, err
	}
	if session.State.IsTerminal() {
		return session, nil
	}
	if err := s.requireMedia(); err != nil {
		return session, err
	}
	if session.Provider == "" || session.ProviderRoomID == "" {
		return session, domain.NewProblem(domain.CodeIllegalCallTransition, 409, "The call has no active media session to end.", false, nil)
	}
	if err := s.media.Hangup(ctx, media.Session{Provider: session.Provider, RoomID: session.ProviderRoomID}); err != nil {
		return session, err
	}
	toState := domain.CallStateCompleted
	if session.State == domain.CallStateCreated || session.State == domain.CallStateRinging || session.State == domain.CallStateAccepted || session.State == domain.CallStateConnecting {
		toState = domain.CallStateCancelled
	}
	transition, err := session.Transition(domain.TransitionInput{ToState: toState, ReasonCode: "ended_by_authorized_actor", Source: "control_plane", ActorID: actor.ID, OccurredAt: s.now()})
	if err != nil {
		return session, err
	}
	if err := s.repository.Transition(ctx, TransitionRecord{Session: session, Scope: scope, ExpectedVersion: session.Version - 1, History: transition, Outbox: domain.NewCallEvent(session, "communication.call.ended.v1", correlationID, transition.ID, transition.OccurredAt)}); err != nil {
		return session, mapRepositoryError(err)
	}
	return session, nil
}

// compensateMediaStart prevents an uncommitted remote room from being orphaned
// after a durable compare-and-swap failure. It first reconciles the persisted
// session: a concurrently committed request using the same idempotency key is
// left intact. Cleanup is best effort and never changes the database error
// returned to the caller.
func (s *Service) compensateMediaStart(ctx context.Context, scope authorization.CallScope, attempted *domain.CallSession, providerSession media.Session) {
	reconciliationCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	persisted, err := s.repository.Get(reconciliationCtx, scope, attempted.ID)
	if err == nil && persisted.Provider == providerSession.Provider && persisted.ProviderRoomID == providerSession.RoomID {
		return
	}
	_ = s.media.Hangup(reconciliationCtx, providerSession)
}

// ApplyTransition is reserved for trusted control-plane workflows and verified
// provider events. Browser clients are not given a generic transition endpoint.
func (s *Service) ApplyTransition(ctx context.Context, actor authorization.Actor, callID string, input domain.TransitionInput, correlationID string) (*domain.CallSession, error) {
	session, scope, err := s.getAuthorized(ctx, actor, callID, authorization.ActionTransition)
	if err != nil {
		return nil, err
	}
	if input.ActorID == "" {
		input.ActorID = actor.ID
	}
	if input.OccurredAt.IsZero() {
		input.OccurredAt = s.now()
	}
	transition, err := session.Transition(input)
	if err != nil {
		return nil, err
	}
	eventType := fmt.Sprintf("communication.call.%s.v1", session.State)
	if err := s.repository.Transition(ctx, TransitionRecord{Session: session, Scope: scope, ExpectedVersion: session.Version - 1, History: transition, Outbox: domain.NewCallEvent(session, eventType, correlationID, transition.ID, transition.OccurredAt)}); err != nil {
		return nil, mapRepositoryError(err)
	}
	return session, nil
}

func (s *Service) GetCall(ctx context.Context, actor authorization.Actor, callID string) (*domain.CallSession, error) {
	session, _, err := s.getAuthorized(ctx, actor, callID, authorization.ActionViewCall)
	return session, err
}

// GetCallHistory remains readable through the call store and authorization
// boundary even if media, realtime, or push integrations are unavailable.
func (s *Service) GetCallHistory(ctx context.Context, actor authorization.Actor, callID string, limit int) (CallHistoryPage, error) {
	_, scope, err := s.getAuthorized(ctx, actor, callID, authorization.ActionViewCallHistory)
	if err != nil {
		return CallHistoryPage{}, err
	}
	if limit <= 0 || limit > 250 {
		limit = 100
	}
	page, err := s.repository.ListHistory(ctx, HistoryOptions{Scope: scope, CallID: callID, Limit: limit})
	if err != nil {
		return CallHistoryPage{}, mapRepositoryError(err)
	}
	return page, nil
}

func (s *Service) ListCalls(ctx context.Context, actor authorization.Actor, limit int) (CallPage, error) {
	if err := s.requireStoreAndAuthorization(); err != nil {
		return CallPage{}, err
	}
	if !actor.Valid() {
		return CallPage{}, domain.NewProblem(domain.CodeAuthorizationUnavailable, 503, "Trusted actor context is required to list calls.", true, nil)
	}
	scope, err := s.scope(ctx, authorization.ActionListCalls, actor)
	if err != nil {
		return CallPage{}, err
	}
	if err := s.authorizer.Authorize(ctx, authorization.ActionListCalls, actor, nil); err != nil {
		return CallPage{}, err
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	page, err := s.repository.List(ctx, ListOptions{Scope: scope, Limit: limit})
	if err != nil {
		return CallPage{}, mapRepositoryError(err)
	}
	return page, nil
}

func (s *Service) getAuthorized(ctx context.Context, actor authorization.Actor, callID string, action authorization.Action) (*domain.CallSession, authorization.CallScope, error) {
	if err := s.requireStoreAndAuthorization(); err != nil {
		return nil, authorization.CallScope{}, err
	}
	if !actor.Valid() {
		return nil, authorization.CallScope{}, domain.NewProblem(domain.CodeAuthorizationUnavailable, 503, "Trusted actor context is required for this call operation.", true, nil)
	}
	scope, err := s.scope(ctx, action, actor)
	if err != nil {
		return nil, authorization.CallScope{}, err
	}
	session, err := s.repository.Get(ctx, scope, callID)
	if err != nil {
		return nil, authorization.CallScope{}, mapRepositoryError(err)
	}
	if err := s.authorizer.Authorize(ctx, action, actor, session); err != nil {
		return nil, authorization.CallScope{}, err
	}
	return session, scope, nil
}

func (s *Service) requireStoreAndAuthorization() error {
	if s == nil || s.repository == nil {
		return domain.NewProblem(domain.CodeCallStoreUnavailable, 503, "The telehealth call store is not configured.", true, nil)
	}
	if s.authorizer == nil {
		return domain.NewProblem(domain.CodeAuthorizationUnavailable, 503, "The telehealth authorization service is not configured.", true, nil)
	}
	return nil
}

func (s *Service) requireMedia() error {
	if s == nil || s.media == nil {
		return domain.NewProblem(domain.CodeMediaProviderUnavailable, 503, "No approved media provider is configured for telehealth calling.", true, nil)
	}
	return nil
}

func (s *Service) scope(ctx context.Context, action authorization.Action, actor authorization.Actor) (authorization.CallScope, error) {
	if !actor.Valid() {
		return authorization.CallScope{}, domain.NewProblem(domain.CodeAuthorizationUnavailable, 503, "Trusted actor context is required for this call operation.", true, nil)
	}
	scope, err := s.authorizer.Scope(ctx, action, actor)
	if err != nil {
		return authorization.CallScope{}, err
	}
	if !scope.ValidFor(actor) {
		return authorization.CallScope{}, domain.NewProblem(domain.CodeAuthorizationUnavailable, 503, "The authorization service returned an invalid call scope.", true, nil)
	}
	return scope, nil
}

func (s *Service) resolveConcurrentCreate(ctx context.Context, actor authorization.Actor, request CreateCallRequest, fingerprint string, scope authorization.CallScope) (CreateCallResult, error) {
	existing, err := s.repository.FindByIdempotency(ctx, scope, actor.ID, request.IdempotencyKey)
	if err != nil || existing == nil {
		return CreateCallResult{}, domain.NewProblem(domain.CodeCallStoreUnavailable, 503, "The idempotent call creation outcome could not be confirmed. Retry with the same key.", true, err)
	}
	if existing.Fingerprint != fingerprint {
		return CreateCallResult{}, domain.NewProblem(domain.CodeIdempotencyConflict, 409, "This idempotency key was used for a different call request.", false, nil)
	}
	session, _, err := s.getAuthorized(ctx, actor, existing.CallID, authorization.ActionViewCall)
	if err != nil {
		return CreateCallResult{}, err
	}
	return CreateCallResult{Session: session, Replayed: true}, nil
}

func permissionDenied(detail string) error {
	return domain.NewProblem(domain.CodePermissionDenied, 403, detail, false, nil)
}

func createFingerprint(actor authorization.Actor, request CreateCallRequest) string {
	participantParts := make([]string, 0, len(request.Participants))
	for _, participant := range request.Participants {
		participantParts = append(participantParts, strings.Join([]string{participant.ID, participant.SubjectID, string(participant.Type), string(participant.Role), string(participant.State)}, "|"))
	}
	value := strings.Join([]string{actor.TenantID, actor.OrganizationID, actor.ID, request.PatientID, request.AppointmentID, request.EncounterID, request.ConversationID, string(request.CallType), strings.Join(participantParts, ",")}, "\n")
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func mapRepositoryError(err error) error {
	if err == nil {
		return nil
	}
	if _, ok := domain.AsProblem(err); ok {
		return err
	}
	switch {
	case errors.Is(err, ErrNotFound):
		return domain.NewProblem(domain.CodeCallNotFound, 404, "The requested call is not available in the current tenant context.", false, err)
	case errors.Is(err, ErrConcurrency):
		return domain.NewProblem(domain.CodeConcurrencyConflict, 409, "The call changed before this action could be committed. Refresh and retry.", true, err)
	default:
		return domain.NewProblem(domain.CodeCallStoreUnavailable, 503, "The telehealth call store is unavailable.", true, err)
	}
}
