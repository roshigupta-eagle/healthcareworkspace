// Package domain contains the provider-neutral telehealth calling model.
package domain

import (
	"errors"
	"fmt"
)

// ProblemCode is the stable machine-readable portion of an API problem.
// Codes describe operational failures only; they are not clinical terminology.
type ProblemCode string

const (
	CodeValidationFailed         ProblemCode = "VALIDATION_FAILED"
	CodeCallNotFound             ProblemCode = "CALL_NOT_FOUND"
	CodeCallStoreUnavailable     ProblemCode = "CALL_STORE_UNAVAILABLE"
	CodeAuthorizationUnavailable ProblemCode = "AUTHORIZATION_UNAVAILABLE"
	CodePermissionDenied         ProblemCode = "PERMISSION_DENIED"
	CodeConsentRestriction       ProblemCode = "CONSENT_RESTRICTION"
	CodeIllegalCallTransition    ProblemCode = "ILLEGAL_CALL_TRANSITION"
	CodeConcurrencyConflict      ProblemCode = "CONCURRENCY_CONFLICT"
	CodeIdempotencyConflict      ProblemCode = "IDEMPOTENCY_CONFLICT"
	CodeMediaProviderUnavailable ProblemCode = "MEDIA_PROVIDER_UNAVAILABLE"
	CodeMediaProviderFailure     ProblemCode = "MEDIA_PROVIDER_FAILURE"
	CodeMediaProviderTimeout     ProblemCode = "MEDIA_PROVIDER_TIMEOUT"
	CodeMediaProviderAuth        ProblemCode = "MEDIA_PROVIDER_AUTHENTICATION_FAILED"
	CodeRealtimeUnavailable      ProblemCode = "REALTIME_UNAVAILABLE"
	CodePushUnavailable          ProblemCode = "PUSH_UNAVAILABLE"
	CodeAuditUnavailable         ProblemCode = "AUDIT_UNAVAILABLE"
)

// Problem is safe to expose through the control-plane API. Detail must never
// contain PHI, media credentials, provider tokens, or raw provider payloads.
type Problem struct {
	Code      ProblemCode
	Status    int
	Detail    string
	Retryable bool
	Cause     error
}

func (p *Problem) Error() string {
	if p.Cause == nil {
		return fmt.Sprintf("%s: %s", p.Code, p.Detail)
	}
	return fmt.Sprintf("%s: %s: %v", p.Code, p.Detail, p.Cause)
}

func (p *Problem) Unwrap() error { return p.Cause }

// NewProblem constructs a stable error at a domain boundary.
func NewProblem(code ProblemCode, status int, detail string, retryable bool, cause error) *Problem {
	return &Problem{Code: code, Status: status, Detail: detail, Retryable: retryable, Cause: cause}
}

// AsProblem returns a typed problem when one is present in an error chain.
func AsProblem(err error) (*Problem, bool) {
	var problem *Problem
	if errors.As(err, &problem) {
		return problem, true
	}
	return nil, false
}
