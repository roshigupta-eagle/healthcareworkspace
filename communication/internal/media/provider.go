// Package media contains provider-neutral media-plane contracts.
package media

import (
	"context"

	"healthcareworkspace/communication/internal/domain"
)

// StartRequest deliberately excludes patient names, identifiers, clinical
// context, and credentials. Provider room and participant identities must stay
// opaque. IdempotencyKey is the durable CallSession ID; a provider adapter must
// use it to deduplicate remote start side effects for the same call.
type StartRequest struct {
	CallID         string
	IdempotencyKey string
	TenantID       string
	OrganizationID string
	CallType       domain.CallType
	InitiatorID    string
}

type Session struct {
	Provider string
	RoomID   string
}

type TransferRequest struct {
	CallID        string
	ParticipantID string
}

// Provider owns media transport only. Roshi remains authoritative for the
// CallSession lifecycle and must corroborate provider events before transition.
type Provider interface {
	Name() string
	Start(ctx context.Context, request StartRequest) (Session, error)
	Answer(ctx context.Context, session Session) error
	Hangup(ctx context.Context, session Session) error
	Hold(ctx context.Context, session Session) error
	Resume(ctx context.Context, session Session) error
	Transfer(ctx context.Context, session Session, request TransferRequest) error
	AddParticipant(ctx context.Context, session Session, participantID string) error
	RemoveParticipant(ctx context.Context, session Session, participantID string) error
	StartRecording(ctx context.Context, session Session, consentReference string) error
	StopRecording(ctx context.Context, session Session) error
}

// Unavailable is honest provider-free behavior. It never fabricates a room,
// token, ringing state, or connected state.
type Unavailable struct {
	ProviderName string
}

func (u Unavailable) Name() string {
	if u.ProviderName == "" {
		return "unconfigured"
	}
	return u.ProviderName
}

func (u Unavailable) unavailable() error {
	return domain.NewProblem(domain.CodeMediaProviderUnavailable, 503, "No approved media provider is configured for telehealth calling.", true, nil)
}

func (u Unavailable) Start(context.Context, StartRequest) (Session, error) {
	return Session{}, u.unavailable()
}
func (u Unavailable) Answer(context.Context, Session) error { return u.unavailable() }
func (u Unavailable) Hangup(context.Context, Session) error { return u.unavailable() }
func (u Unavailable) Hold(context.Context, Session) error   { return u.unavailable() }
func (u Unavailable) Resume(context.Context, Session) error { return u.unavailable() }
func (u Unavailable) Transfer(context.Context, Session, TransferRequest) error {
	return u.unavailable()
}
func (u Unavailable) AddParticipant(context.Context, Session, string) error { return u.unavailable() }
func (u Unavailable) RemoveParticipant(context.Context, Session, string) error {
	return u.unavailable()
}
func (u Unavailable) StartRecording(context.Context, Session, string) error { return u.unavailable() }
func (u Unavailable) StopRecording(context.Context, Session) error          { return u.unavailable() }
