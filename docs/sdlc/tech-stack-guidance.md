# Technology Stack Guidance

## Stack overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                                │
│  React 18+ │ TypeScript (strict) │ Module Federation │ TanStack Query │
│  XState │ Zod │ Design Tokens │ Storybook                           │
├──────────────────────────────────────────────────────────────────────┤
│                       API GATEWAY / BFF                               │
│  Go (chi/echo) │ OAuth 2.0 / SMART on FHIR │ Rate Limiting          │
├──────────────────────────────────────────────────────────────────────┤
│                    BACKEND SERVICES LAYER                             │
│  Go (primary) │ Rust (perf-critical) │ Temporal │ gRPC + REST        │
├──────────────────────────────────────────────────────────────────────┤
│                       FHIR LAYER                                      │
│  HAPI FHIR JPA │ Profile validation │ Terminology │ Subscriptions    │
├──────────────────────────────────────────────────────────────────────┤
│                      DATA LAYER                                       │
│  PostgreSQL + PgBouncer │ Redis │ MongoDB/DynamoDB │ Goose migrations │
├──────────────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE                                     │
│  Docker │ Kubernetes │ GitHub Actions │ OpenTelemetry │ Prometheus    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## React & TypeScript

**Owner:** Jordan (UI Developer)

### Standards

- React 18+ with concurrent features
- TypeScript `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`
- No `any` — use `unknown` + type guards or Zod schemas
- Branded types for all identifiers: `PatientId`, `EncounterId`, `PractitionerId`
- Discriminated unions for all state machines and API response shapes
- `as const` objects over TypeScript `enum`
- Zod validation at every external boundary (FHIR responses, REST API responses)

### Architecture

- 4-layer component architecture: Pages → Features → Shared Components → Data Layer
- Data layer owns all FHIR/REST calls; maps FHIR resources to domain models
- TanStack Query for server state; cache keys include jurisdiction + resource type
- XState for multi-step clinical workflows (eReferral, prescriptions, consent)
- Module Federation for microfrontend decomposition along FHIR domain boundaries

### Microfrontend boundaries

| MFE | Domain | Key components |
|---|---|---|
| `mfe-patient-summary` | Patient, Condition, AllergyIntolerance | PatientHeader, ConditionList, AllergyList |
| `mfe-medications` | MedicationRequest, MedicationDispense | MedList, PrescribeIT integration |
| `mfe-labs` | DiagnosticReport, Observation | LabResultsTable, TrendChart, CriticalAlert |
| `mfe-referrals` | ServiceRequest, Task | ReferralForm, ReferralStatus |
| `mfe-provider-directory` | Practitioner, Organization | ProviderSearch, OrgDirectory |

---

## Go

**Owner:** Amelia (Backend Dev), Winston (Architect)

### Standards

- Go 1.22+ with generics where they reduce boilerplate
- Standard library preferred over third-party dependencies
- HTTP router: `chi` or `echo`
- Structured logging: `slog`
- Error handling: `errors.Is`/`errors.As`, no panic in business logic
- Context propagation: `context.Context` on every handler and service method
- Database access: `pgx` (not `database/sql`) for PostgreSQL
- Testing: `testing` + `testify` for assertions; table-driven tests mandatory
- Linting: `golangci-lint` with strict config

### Service patterns

```
cmd/                    ← entry points
internal/
  handler/              ← HTTP handlers (thin — delegate to service)
  service/              ← business logic
  repository/           ← database access (pgx)
  fhir/                 ← FHIR client + resource mapping
  temporal/             ← Temporal workflow/activity definitions
  model/                ← domain models (not FHIR resources)
  config/               ← configuration
pkg/                    ← shared packages (avoid; prefer internal/)
migrations/             ← Goose SQL migrations
```

### Go ↔ FHIR integration

- Go services call HAPI FHIR via REST; never bypass the FHIR layer for direct DB access
- Map FHIR resources to Go domain structs at the service boundary — no raw FHIR in business logic
- Use Alex's FHIR API contracts for every integration

---

## Rust

**Owner:** Amelia (Backend Dev)

### When to use Rust

- Performance-critical data pipelines (lab result ingestion, bulk FHIR export)
- Cryptographic operations (PHI encryption, signature verification)
- WebAssembly modules shared between frontend and backend

### Standards

- Edition 2021+
- `clippy` with `pedantic` warnings
- `serde` + `serde_json` for serialization
- `tokio` for async runtime
- `sqlx` for PostgreSQL (compile-time query checking)
- Error handling: `thiserror` for library errors, `anyhow` for application errors

---

## PostgreSQL + PgBouncer

**Owner:** Amelia (Backend Dev)

### Standards

- PostgreSQL 16+
- PgBouncer in transaction pooling mode
- Connection pool sizing: `max_connections = num_services × connections_per_service`
- All schemas versioned via Goose migrations — never manual DDL
- UUID v7 for primary keys (time-ordered)
- `JSONB` columns for semi-structured clinical data only when a dedicated table is premature
- Row-level security (RLS) for multi-tenant data isolation
- `pg_stat_statements` enabled for query analysis

### Naming conventions

| Object | Convention | Example |
|---|---|---|
| Tables | `snake_case`, plural | `medication_requests` |
| Columns | `snake_case` | `patient_id`, `created_at` |
| Indexes | `idx_{table}_{columns}` | `idx_medication_requests_patient_id` |
| Foreign keys | `fk_{table}_{ref_table}` | `fk_medication_requests_patients` |
| Constraints | `chk_{table}_{rule}` | `chk_patients_birth_date_past` |

---

## Goose (database migrations)

**Owner:** Amelia (Backend Dev)

### Standards

- One migration file per change: `YYYYMMDDHHMMSS_{description}.sql`
- Every migration has both `-- +goose Up` and `-- +goose Down` sections
- Down migrations must be tested — no irreversible migrations without ADR
- Migrations run in CI before integration tests
- No data manipulation in schema migrations — use separate data migration scripts

---

## Redis

**Owner:** Amelia (Backend Dev)

### Use cases

| Use case | Key pattern | TTL | Eviction |
|---|---|---|---|
| Session cache | `session:{userId}:{sessionId}` | 30 min | `volatile-lru` |
| FHIR resource cache | `fhir:{jurisdiction}:{resourceType}:{id}` | 5 min | `allkeys-lru` |
| Rate limiting | `ratelimit:{clientId}:{endpoint}` | 1 min | `volatile-ttl` |
| Pub/sub | `events:{domain}:{event}` | N/A | N/A |

### Standards

- Redis 7+ with ACLs enabled
- No PHI in Redis cache keys or values without encryption
- Connection pooling via client library
- Sentinel or Cluster mode for production HA

---

## NoSQL (MongoDB / DynamoDB)

**Owner:** Amelia (Backend Dev)

### When to use

- Audit logs (append-only, high-volume)
- Clinical document attachments and metadata
- Unstructured clinical notes before they are mapped to FHIR
- Event sourcing / CQRS read models

### Standards

- MongoDB 7+ with schema validation
- Document design: embed frequently-accessed data; reference when the subdocument has an independent lifecycle
- No PHI without field-level encryption

---

## Temporal

**Owner:** Amelia (Backend Dev), Winston (Architect)

### When to use

- Long-running clinical workflows (prescription routing, eReferral lifecycle, lab order → result → review)
- Saga patterns requiring compensation (failed dispense → cancel request)
- Scheduled tasks (bulk FHIR export, compliance report generation)
- Cross-service orchestration

### Standards

- Workflows in Go (`go.temporal.io/sdk`)
- Activities are idempotent — safe to retry
- Use `workflow.SideEffect` for non-deterministic operations
- Activity timeouts: start-to-close ≤ 30 seconds for API calls; heartbeat for long operations
- Signal channels for human-in-the-loop (pharmacist approval, physician review)
- Versioning: use `workflow.GetVersion` for backward-compatible workflow changes

### Workflow naming

| Pattern | Example |
|---|---|
| `{Domain}{Action}Workflow` | `PrescriptionRouteWorkflow` |
| `{Domain}{Action}Activity` | `ValidateDrugInteractionActivity` |

---

## HAPI FHIR

**Owner:** Alex (FHIR SME)

See Alex's FHIR architecture section in the architecture template. Key decisions:

- JPA Server for resource persistence and search
- IG NPM packages loaded for profile validation
- Terminology server integration (SNOMED CT CA, LOINC/pCLOCD, UCUM)
- Interceptors: audit, consent, validation, security
- Multi-tenancy via HAPI partitioning (if needed)
- Search parameter indexing aligned with clinical query patterns

---

## CI/CD (GitHub Actions)

### Pipeline stages

```
commit → lint → build → unit test → integration test → FHIR conformance → security scan → deploy (staging) → E2E test → deploy (production)
```

### Standards

- Goose migrations run before integration tests
- FHIR conformance tests validate against IG NPM packages
- Security scan: Trivy (container), gosec (Go), ESLint security plugin (TypeScript)
- Deploy: blue-green with automated rollback on health check failure
