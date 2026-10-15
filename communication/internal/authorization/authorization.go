// Package authorization defines the control-plane authorization boundary.
package authorization

import (
	"context"
	"strings"

	"healthcareworkspace/communication/internal/domain"
)

// Actor must be constructed from trusted server-side identity claims. Browser
// headers and media-provider identities are never sufficient to create it.
type Actor struct {
	ID             string
	TenantID       string
	OrganizationID string
	Roles          []string
}

func (a Actor) Valid() bool {
	return strings.TrimSpace(a.ID) != "" && strings.TrimSpace(a.TenantID) != "" && strings.TrimSpace(a.OrganizationID) != ""
}

type Action string

const (
	ActionListCalls       Action = "list_calls"
	ActionCreateCall      Action = "create_call"
	ActionViewCall        Action = "view_call"
	ActionViewCallHistory Action = "view_call_history"
	ActionStartMedia      Action = "start_media"
	ActionEndMedia        Action = "end_media"
	ActionTransition      Action = "transition_call"
)

// CallScope is a server-derived persistence predicate for call reads. It is
// produced by a trusted policy implementation, never from an HTTP request,
// query parameter, or media-provider claim. A scope is deliberately narrow:
// an organization-wide grant or one or more patient/participant grants is
// required before a repository may read a CallSession.
type CallScope struct {
	TenantID              string
	OrganizationID        string
	OrganizationWide      bool
	PatientIDs            []string
	ParticipantSubjectIDs []string
}

// ValidFor rejects a policy result that is not bound to the trusted actor's
// tenant and organization. Empty non-organization-wide scopes fail closed.
func (s CallScope) ValidFor(actor Actor) bool {
	if !actor.Valid() || strings.TrimSpace(s.TenantID) != actor.TenantID || strings.TrimSpace(s.OrganizationID) != actor.OrganizationID {
		return false
	}
	return s.OrganizationWide || len(s.PatientIDs) > 0 || len(s.ParticipantSubjectIDs) > 0
}

// Allows mirrors the repository predicate for in-memory tests and for
// validating a proposed new session before it is persisted. Durable
// repositories must apply the equivalent predicate in SQL, not fetch first
// and filter in application memory.
func (s CallScope) Allows(session *domain.CallSession) bool {
	if session == nil || session.TenantID != s.TenantID || session.OrganizationID != s.OrganizationID {
		return false
	}
	if s.OrganizationWide {
		return true
	}
	if contains(s.PatientIDs, session.PatientID) {
		return true
	}
	for _, participant := range session.Participants {
		if contains(s.ParticipantSubjectIDs, participant.SubjectID) {
			return true
		}
	}
	return false
}

func contains(values []string, wanted string) bool {
	for _, value := range values {
		if value == wanted && wanted != "" {
			return true
		}
	}
	return false
}

// Service is intentionally agnostic about the eventual IAM, consent, proxy,
// care-team, and jurisdiction policy implementations.
type Service interface {
	// Scope must derive an SQL-enforceable predicate from trusted identity and
	// policy data before any call row is read or listed.
	Scope(ctx context.Context, action Action, actor Actor) (CallScope, error)
	Authorize(ctx context.Context, action Action, actor Actor, session *domain.CallSession) error
}

// Unavailable is the production-safe default before a trusted authorization
// integration is configured. It fails closed instead of accepting a header.
type Unavailable struct{}

func (Unavailable) Scope(context.Context, Action, Actor) (CallScope, error) {
	return CallScope{}, domain.NewProblem(domain.CodeAuthorizationUnavailable, 503, "The telehealth authorization service is not configured.", true, nil)
}

func (Unavailable) Authorize(context.Context, Action, Actor, *domain.CallSession) error {
	return domain.NewProblem(domain.CodeAuthorizationUnavailable, 503, "The telehealth authorization service is not configured.", true, nil)
}
