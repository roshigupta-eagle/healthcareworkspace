// Package realtime defines post-commit freshness signalling.
package realtime

import (
	"context"

	"healthcareworkspace/communication/internal/domain"
)

// Publisher may publish only persisted outbox events. It never becomes the
// durable source of a call state transition.
type Publisher interface {
	Publish(ctx context.Context, event domain.OutboxEvent) error
}

type Unavailable struct{}

func (Unavailable) Publish(context.Context, domain.OutboxEvent) error {
	return domain.NewProblem(domain.CodeRealtimeUnavailable, 503, "Realtime signalling is not configured.", true, nil)
}
