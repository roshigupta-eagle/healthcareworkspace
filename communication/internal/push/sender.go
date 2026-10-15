// Package push defines notification delivery without exposing clinical content.
package push

import (
	"context"

	"healthcareworkspace/communication/internal/domain"
)

type IncomingCall struct {
	CallID         string
	TenantID       string
	OrganizationID string
	ParticipantID  string
}

// Sender receives only opaque IDs. An authorized client must fetch details
// after notification rather than receiving PHI in a push payload.
type Sender interface {
	SendIncomingCall(ctx context.Context, notification IncomingCall) error
}

type Unavailable struct{}

func (Unavailable) SendIncomingCall(context.Context, IncomingCall) error {
	return domain.NewProblem(domain.CodePushUnavailable, 503, "Push notification delivery is not configured.", true, nil)
}
