package authorization

import (
	"context"

	"healthcareworkspace/communication/internal/domain"
)

// TrustedBFF is used only after the HTTP boundary verifies the server-to-
// server credential. It scopes commands to the authenticated actor's tenant
// and organization; browser-provided headers never reach this boundary.
type TrustedBFF struct{}

func (TrustedBFF) Scope(_ context.Context, _ Action, actor Actor) (CallScope, error) {
	if !actor.Valid() {
		return CallScope{}, domain.NewProblem(domain.CodeAuthorizationUnavailable, 401, "A trusted service actor is required.", false, nil)
	}
	return CallScope{TenantID: actor.TenantID, OrganizationID: actor.OrganizationID, OrganizationWide: true}, nil
}

func (TrustedBFF) Authorize(_ context.Context, _ Action, actor Actor, session *domain.CallSession) error {
	if !actor.Valid() {
		return domain.NewProblem(domain.CodeAuthorizationUnavailable, 401, "A trusted service actor is required.", false, nil)
	}
	if session != nil && (session.TenantID != actor.TenantID || session.OrganizationID != actor.OrganizationID) {
		return domain.NewProblem(domain.CodePermissionDenied, 403, "The requested call is outside the trusted actor scope.", false, nil)
	}
	return nil
}
