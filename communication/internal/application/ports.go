// Package application coordinates provider-neutral telehealth use cases.
package application

import (
	"context"
	"errors"
	"time"

	"healthcareworkspace/communication/internal/authorization"
	"healthcareworkspace/communication/internal/domain"
)

var (
	ErrNotFound          = errors.New("call not found")
	ErrConcurrency       = errors.New("call version conflict")
	ErrIdempotencyExists = errors.New("idempotency key already exists")
)

type IdempotencyRecord struct {
	TenantID       string
	OrganizationID string
	ActorID        string
	Key            string
	Fingerprint    string
	CallID         string
	CreatedAt      time.Time
}

type CreateRecord struct {
	Session     *domain.CallSession
	Scope       authorization.CallScope
	History     domain.StateTransition
	Outbox      domain.OutboxEvent
	Idempotency IdempotencyRecord
}

type TransitionRecord struct {
	Session         *domain.CallSession
	Scope           authorization.CallScope
	ExpectedVersion int64
	History         domain.StateTransition
	Outbox          domain.OutboxEvent
}

type ListOptions struct {
	Scope  authorization.CallScope
	Limit  int
	Cursor string
}

type CallPage struct {
	Items      []*domain.CallSession
	NextCursor string
}

type HistoryOptions struct {
	Scope  authorization.CallScope
	CallID string
	Limit  int
}

type CallHistoryPage struct {
	Items      []domain.StateTransition
	NextCursor string
}

// Repository commits a session, its append-only history, and its outbox event
// together. It intentionally has no FHIR responsibility.
type Repository interface {
	FindByIdempotency(ctx context.Context, scope authorization.CallScope, actorID, key string) (*IdempotencyRecord, error)
	Create(ctx context.Context, record CreateRecord) error
	Get(ctx context.Context, scope authorization.CallScope, callID string) (*domain.CallSession, error)
	List(ctx context.Context, options ListOptions) (CallPage, error)
	ListHistory(ctx context.Context, options HistoryOptions) (CallHistoryPage, error)
	Transition(ctx context.Context, record TransitionRecord) error
}
