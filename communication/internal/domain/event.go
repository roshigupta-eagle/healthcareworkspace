package domain

import (
	"time"

	"github.com/google/uuid"
)

// OutboxEvent is a provider-neutral, PHI-minimized event persisted with the
// state change it describes. A publisher may deliver it only after commit.
type OutboxEvent struct {
	ID             string         `json:"id"`
	TenantID       string         `json:"tenantId"`
	OrganizationID string         `json:"organizationId"`
	AggregateType  string         `json:"aggregateType"`
	AggregateID    string         `json:"aggregateId"`
	EventType      string         `json:"eventType"`
	Version        int            `json:"version"`
	OccurredAt     time.Time      `json:"occurredAt"`
	CorrelationID  string         `json:"correlationId,omitempty"`
	CausationID    string         `json:"causationId,omitempty"`
	Data           map[string]any `json:"data"`
}

func NewCallEvent(session *CallSession, eventType, correlationID, causationID string, occurredAt time.Time) OutboxEvent {
	when := occurredAt.UTC()
	if when.IsZero() {
		when = time.Now().UTC()
	}
	return OutboxEvent{
		ID:             uuid.NewString(),
		TenantID:       session.TenantID,
		OrganizationID: session.OrganizationID,
		AggregateType:  "call_session",
		AggregateID:    session.ID,
		EventType:      eventType,
		Version:        1,
		OccurredAt:     when,
		CorrelationID:  correlationID,
		CausationID:    causationID,
		Data: map[string]any{
			"callId":   session.ID,
			"state":    session.State,
			"revision": session.Version,
		},
	}
}
