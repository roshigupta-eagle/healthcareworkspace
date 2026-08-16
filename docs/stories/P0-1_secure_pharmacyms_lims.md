# P0-1: Secure PharmacyMS and LIMS endpoints

**Summary:** Add authentication and role-based authorization middleware to the `pharmacyms` and `lims` services so only authenticated users and trusted services can call protected APIs.

**Acceptance Criteria:**
- Unauthenticated requests to protected endpoints return HTTP 401.
- JWTs with a `role` claim permit access only for authorized roles (e.g., `PHARMACIST`, `LAB_TECH`, `ADMIN`).
- `INTERNAL_SERVICE_TOKEN` allows service-to-service calls and is required for EHR ingestion endpoints.
- Unit and integration tests cover allowed/denied scenarios.

**LLD:**
- **Auth package:** add `internal/auth` in both services that validates JWTs via `github.com/golang-jwt/jwt/v5` and supports JWKS (`SERVICE_JWKS_URL`) mode.
- **Env:** add `SERVICE_JWT_SECRET` (HMAC fallback), `SERVICE_JWKS_URL`, and `INTERNAL_SERVICE_TOKEN`.
- **Middleware:** implement `RequireAuth(roles ...string)` chi middleware that:
  - Accepts `Authorization: Bearer <JWT>` or `Authorization: Bearer <INTERNAL_SERVICE_TOKEN>`.
  - Validates signature and `exp`/`nbf` claims and extracts `sub` and `role`.
  - Returns 401 on missing/invalid token, 403 on insufficient role.
- **Route protection:** protect `/api/v1/prescriptions*`, `/api/v1/dispenses*`, `/api/v1/orders*`, `/api/v1/results*`.
- **Audit:** on auth failure log details and on success emit lightweight audit envelope to EHR via `POST /api/internal/audit` (see P1-4).
- **Tests:** middleware unit tests + integration tests with test tokens and `INTERNAL_SERVICE_TOKEN`.

**Tasks:**
- [ ] Add `internal/auth` package to both services.
- [ ] Implement and unit-test `RequireAuth` middleware.
- [ ] Protect routes in `server.New`.
- [ ] Document env vars in `.env.example`.
- [ ] Add integration tests and smoke tests in staging.
