// Package memory provides a deterministic repository for unit tests and local
// composition. Production wiring must use a durable repository backed by the
// PostgreSQL migration schema.
package memory

import (
	"context"
	"sort"
	"strings"
	"sync"

	"healthcareworkspace/communication/internal/application"
	"healthcareworkspace/communication/internal/authorization"
	"healthcareworkspace/communication/internal/domain"
)

type Repository struct {
	mu          sync.RWMutex
	sessions    map[string]*domain.CallSession
	idempotency map[string]application.IdempotencyRecord
	history     map[string][]domain.StateTransition
	outbox      map[string]domain.OutboxEvent
}

func New() *Repository {
	return &Repository{
		sessions:    make(map[string]*domain.CallSession),
		idempotency: make(map[string]application.IdempotencyRecord),
		history:     make(map[string][]domain.StateTransition),
		outbox:      make(map[string]domain.OutboxEvent),
	}
}

func (r *Repository) FindByIdempotency(ctx context.Context, scope authorization.CallScope, actorID, key string) (*application.IdempotencyRecord, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	record, found := r.idempotency[idempotencyKey(scope.TenantID, scope.OrganizationID, actorID, key)]
	if !found {
		return nil, nil
	}
	session := r.sessions[record.CallID]
	if !scope.Allows(session) {
		return nil, application.ErrNotFound
	}
	copy := record
	return &copy, nil
}

func (r *Repository) Create(ctx context.Context, record application.CreateRecord) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if record.Session == nil || !record.Scope.Allows(record.Session) || record.Idempotency.TenantID != record.Session.TenantID || record.Idempotency.OrganizationID != record.Session.OrganizationID {
		return application.ErrNotFound
	}
	key := idempotencyKey(record.Idempotency.TenantID, record.Idempotency.OrganizationID, record.Idempotency.ActorID, record.Idempotency.Key)
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, found := r.idempotency[key]; found {
		return application.ErrIdempotencyExists
	}
	if _, found := r.sessions[record.Session.ID]; found {
		return application.ErrConcurrency
	}
	r.sessions[record.Session.ID] = record.Session.Clone()
	r.idempotency[key] = record.Idempotency
	r.history[record.Session.ID] = append(r.history[record.Session.ID], record.History)
	r.outbox[record.Outbox.ID] = record.Outbox
	return nil
}

func (r *Repository) Get(ctx context.Context, scope authorization.CallScope, callID string) (*domain.CallSession, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	session := r.sessions[callID]
	if !scope.Allows(session) {
		return nil, application.ErrNotFound
	}
	return session.Clone(), nil
}

func (r *Repository) List(ctx context.Context, options application.ListOptions) (application.CallPage, error) {
	if err := ctx.Err(); err != nil {
		return application.CallPage{}, err
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	items := make([]*domain.CallSession, 0)
	for _, session := range r.sessions {
		if options.Scope.Allows(session) {
			items = append(items, session.Clone())
		}
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].CreatedAt.Equal(items[j].CreatedAt) {
			return items[i].ID > items[j].ID
		}
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})
	if options.Limit > 0 && len(items) > options.Limit {
		items = items[:options.Limit]
	}
	return application.CallPage{Items: items}, nil
}

func (r *Repository) ListHistory(ctx context.Context, options application.HistoryOptions) (application.CallHistoryPage, error) {
	if err := ctx.Err(); err != nil {
		return application.CallHistoryPage{}, err
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	if !options.Scope.Allows(r.sessions[options.CallID]) {
		return application.CallHistoryPage{}, application.ErrNotFound
	}
	history := r.history[options.CallID]
	items := make([]domain.StateTransition, len(history))
	for index := range history {
		items[index] = cloneTransition(history[index])
	}
	if options.Limit > 0 && len(items) > options.Limit {
		items = items[:options.Limit]
	}
	return application.CallHistoryPage{Items: items}, nil
}

func (r *Repository) Transition(ctx context.Context, record application.TransitionRecord) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if record.Session == nil || !record.Scope.Allows(record.Session) {
		return application.ErrNotFound
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	stored := r.sessions[record.Session.ID]
	if !record.Scope.Allows(stored) {
		return application.ErrNotFound
	}
	if stored.Version != record.ExpectedVersion {
		return application.ErrConcurrency
	}
	r.sessions[record.Session.ID] = record.Session.Clone()
	r.history[record.Session.ID] = append(r.history[record.Session.ID], record.History)
	r.outbox[record.Outbox.ID] = record.Outbox
	return nil
}

// History is test/support-only access to append-only state records. It returns
// a copy so callers cannot mutate the stored audit trail.
func (r *Repository) History(callID string) []domain.StateTransition {
	r.mu.RLock()
	defer r.mu.RUnlock()
	items := make([]domain.StateTransition, len(r.history[callID]))
	for index := range r.history[callID] {
		items[index] = cloneTransition(r.history[callID][index])
	}
	return items
}

func cloneTransition(value domain.StateTransition) domain.StateTransition {
	copy := value
	if value.FromState != nil {
		from := *value.FromState
		copy.FromState = &from
	}
	return copy
}

func idempotencyKey(parts ...string) string {
	return strings.Join(parts, "\x00")
}
