# P0-1 Design — Secure PharmacyMS and LIMS endpoints

Story: [docs/stories/P0-1_secure_pharmacyms_lims.md](docs/stories/P0-1_secure_pharmacyms_lims.md)

**Acceptance Criteria**
- Unauthenticated requests to protected endpoints return 401.
- JWTs with `role` claim only allow authorized roles for endpoints.
- `INTERNAL_SERVICE_TOKEN` allows service-to-service calls.
- Unit and integration tests validate allowed/denied flows.

**Design / LLD**
- Add `internal/auth` package to both services implementing JWT validation (HMAC via SERVICE_JWT_SECRET) and optional JWKS via SERVICE_JWKS_URL.
- Implement chi middleware `RequireAuth(roles ...string)` that validates tokens or `INTERNAL_SERVICE_TOKEN` and enforces role checks.

**Files to edit**
- pharmacyms/internal/server/server.go
- pharmacyms/internal/handler/*.go
- pharmacyms/.env.example
- lims/internal/server/server.go
- lims/internal/handler/*.go

**Tests**
- Unit tests for token validation and middleware.
- Integration tests: protected endpoint with no token -> 401; invalid token -> 401; wrong role -> 403; internal token -> 200.

**Tasks**
- Implement internal/auth package, RequireAuth middleware, protect routes, add env vars to examples, and add tests.
