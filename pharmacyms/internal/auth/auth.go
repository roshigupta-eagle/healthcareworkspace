package auth

import (
"net/http"
"os"
"strings"
)

// RequireAuth provides a minimal auth middleware used by PharmacyMS routes.
// It accepts requests when either X-Internal-Token equals the configured
// INTERNAL_SERVICE_TOKEN, or when Authorization Bearer token equals
// SERVICE_JWT_SECRET. This is intentionally simple to avoid external JWT
// library dependencies in the dev environment.
func RequireAuth(allowedRoles ...string) func(next http.Handler) http.Handler {
return func(next http.Handler) http.Handler {
return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
// Internal token check
if token := os.Getenv("INTERNAL_SERVICE_TOKEN"); token != "" {
if r.Header.Get("X-Internal-Token") == token {
next.ServeHTTP(w, r)
return
}
}

// Authorization header fallback (simple equality check)
authH := r.Header.Get("Authorization")
if authH != "" && strings.HasPrefix(authH, "Bearer ") {
tok := strings.TrimPrefix(authH, "Bearer ")
if svc := os.Getenv("SERVICE_JWT_SECRET"); svc != "" && tok == svc {
next.ServeHTTP(w, r)
return
}
}

w.WriteHeader(http.StatusUnauthorized)
w.Header().Set("Content-Type", "application/json")
_, _ = w.Write([]byte(`{"error":"unauthorized"}`))
})
}
}
