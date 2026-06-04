// Package authmw provides JWT and API-key authentication middleware for the
// FHIR SaaS platform. Each authenticated request carries a tenant ID, a
// subject, and a role that downstream handlers can inspect via FromContext.
//
// Authentication modes:
//
//	Development (JWT_SECRET unset or ENV=development):
//	  X-Tenant-ID header accepted without verification (defaults to "default").
//
//	Production:
//	  Bearer JWT  — HS256-signed token with claims: tenant_id, sub, role, exp.
//	  API Key     — X-Tenant-ID + X-API-Key: HMAC-SHA256(secret,"apikey:"+tenantID) as hex.
package authmw

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"healthcareworkspace/fhir/internal/tenant"
)

// Claims holds the authentication context extracted from a token.
type Claims struct {
	TenantID string
	Sub      string
	Role     string
}

type claimsKey struct{}

// FromContext retrieves Claims from ctx.
// Returns a safe default (DefaultTenant, role=service) if not set.
func FromContext(ctx context.Context) *Claims {
	if c, ok := ctx.Value(claimsKey{}).(*Claims); ok {
		return c
	}
	return &Claims{TenantID: tenant.DefaultTenant, Role: "service"}
}

// Middleware returns HTTP middleware that authenticates every request and
// injects Claims + tenant ID into the request context.
// Routes that do not require auth (/health, /fhir/R4/metadata) should be
// mounted OUTSIDE the middleware-protected group.
func Middleware(jwtSecret, env string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Development bypass — accept any X-Tenant-ID or use "default".
			if jwtSecret == "" || env == "development" {
				tid := r.Header.Get("X-Tenant-ID")
				if tid == "" {
					tid = tenant.DefaultTenant
				}
				ctx := tenant.WithTenant(r.Context(), tid)
				ctx = context.WithValue(ctx, claimsKey{}, &Claims{
					TenantID: tid,
					Sub:      "dev",
					Role:     "admin",
				})
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			var claims *Claims
			var authErr error

			authHeader := r.Header.Get("Authorization")
			switch {
			case strings.HasPrefix(authHeader, "Bearer "):
				token := strings.TrimPrefix(authHeader, "Bearer ")
				claims, authErr = verifyJWT(token, jwtSecret)

			case r.Header.Get("X-Tenant-ID") != "":
				tid := r.Header.Get("X-Tenant-ID")
				apiKey := r.Header.Get("X-API-Key")
				claims, authErr = verifyAPIKey(apiKey, tid, jwtSecret)

			default:
				authErr = errors.New("missing Authorization header or X-Tenant-ID + X-API-Key")
			}

			if authErr != nil {
				writeUnauthorized(w, authErr.Error())
				return
			}

			ctx := tenant.WithTenant(r.Context(), claims.TenantID)
			ctx = context.WithValue(ctx, claimsKey{}, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ─── JWT ──────────────────────────────────────────────────────────────────────

// verifyJWT parses and verifies a HS256-signed JWT using the given secret.
// Expected claims: tenant_id (string), sub (string), role (string), exp (int64).
func verifyJWT(token, secret string) (*Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, errors.New("malformed token: expected 3 parts")
	}

	// Verify HMAC-SHA256 signature
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(parts[0] + "." + parts[1]))
	expectedSig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expectedSig), []byte(parts[2])) {
		return nil, errors.New("invalid token signature")
	}

	// Decode payload
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("decode payload: %w", err)
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(payload, &raw); err != nil {
		return nil, errors.New("invalid token payload")
	}

	// Validate expiry
	if exp, ok := raw["exp"].(float64); ok {
		if time.Now().Unix() > int64(exp) {
			return nil, errors.New("token expired")
		}
	}

	tid, _ := raw["tenant_id"].(string)
	if tid == "" {
		return nil, errors.New("missing tenant_id claim")
	}
	sub, _ := raw["sub"].(string)
	role, _ := raw["role"].(string)
	if role == "" {
		role = "service"
	}

	return &Claims{TenantID: tid, Sub: sub, Role: role}, nil
}

// ─── API Key ──────────────────────────────────────────────────────────────────

// verifyAPIKey validates an API key for a given tenant.
// Expected format: hex(HMAC-SHA256(secret, "apikey:"+tenantID))
func verifyAPIKey(apiKey, tenantID, secret string) (*Claims, error) {
	if apiKey == "" {
		return nil, errors.New("missing X-API-Key header")
	}
	if tenantID == "" {
		return nil, errors.New("missing X-Tenant-ID header")
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte("apikey:" + tenantID))
	expected := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(expected), []byte(apiKey)) {
		return nil, errors.New("invalid API key")
	}

	return &Claims{TenantID: tenantID, Sub: "service", Role: "service"}, nil
}

// ─── Error response ───────────────────────────────────────────────────────────

func writeUnauthorized(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "application/fhir+json")
	w.Header().Set("WWW-Authenticate", `Bearer realm="FHIR R4", charset="UTF-8"`)
	w.WriteHeader(http.StatusUnauthorized)
	// Safe: msg comes from internal error strings, not user input
	fmt.Fprintf(w, `{"resourceType":"OperationOutcome","issue":[{"severity":"error","code":"security","diagnostics":%q}]}`, msg)
}
