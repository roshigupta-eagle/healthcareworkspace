// Package audit defines the immutable-audit integration boundary.
package audit

import (
	"context"
	"time"

	"healthcareworkspace/communication/internal/domain"
)

type Event struct {
	ID             string
	TenantID       string
	OrganizationID string
	ActorID        string
	CallSessionID  string
	Action         string
	Outcome        string
	OccurredAt     time.Time
}

// Writer is separate from the append-only call state history. The latter is
// required for state-machine auditability; this port connects a future shared,
// immutable audit service without making a media provider authoritative.
type Writer interface {
	Write(ctx context.Context, event Event) error
}

type Unavailable struct{}

func (Unavailable) Write(context.Context, Event) error {
	return domain.NewProblem(domain.CodeAuditUnavailable, 503, "The immutable audit service is not configured.", true, nil)
}
