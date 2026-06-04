// Package tenant provides context-based tenant isolation for the SaaS FHIR server.
// Every database operation is scoped to the tenant extracted from the request context.
package tenant

import "context"

type contextKey struct{}

// DefaultTenant is the fallback tenant ID used in development mode.
const DefaultTenant = "default"

// FromContext extracts the tenant ID from ctx.
// Returns DefaultTenant if not set.
func FromContext(ctx context.Context) string {
	if v, ok := ctx.Value(contextKey{}).(string); ok && v != "" {
		return v
	}
	return DefaultTenant
}

// WithTenant returns a new context carrying the given tenant ID.
func WithTenant(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, contextKey{}, tenantID)
}
