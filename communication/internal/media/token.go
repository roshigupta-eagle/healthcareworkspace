package media

import (
	"context"
	"time"
)

// JoinTokenRequest is a provider-neutral request for a short-lived media grant.
// All identifiers are opaque control-plane values; no clinical data is sent to a provider.
type JoinTokenRequest struct {
	RoomID       string
	Identity     string
	CanPublish   bool
	CanSubscribe bool
	TTL          time.Duration
}

type JoinGrant struct {
	ServerURL string
	Token     string
	ExpiresAt time.Time
}

// TokenIssuer is intentionally separate from Provider because only selected
// media adapters can mint browser credentials.
type TokenIssuer interface {
	IssueJoinToken(context.Context, JoinTokenRequest) (JoinGrant, error)
}
