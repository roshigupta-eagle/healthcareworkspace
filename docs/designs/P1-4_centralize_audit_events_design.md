# P1-4 Design — Centralize audit events to EHR

Story: [docs/stories/P1-4_centralize_audit_events.md](docs/stories/P1-4_centralize_audit_events.md)

**Acceptance Criteria**
- Services POST audit envelopes to `POST /api/internal/audit` with `INTERNAL_SERVICE_TOKEN` on create/update actions.
- `admin/audit` UI shows these events with source and agent info.

**Design / LLD**
- Add `POST /api/internal/audit` server route in EHR that validates `INTERNAL_SERVICE_TOKEN` and writes to Prisma `auditEvent`.
- Create an `internal/auditclient` in Go services that posts audit envelopes including `source` and `agent` details.

**Files to edit**
- [ehr/src/app/api/internal/audit/route.ts] (new)
- [pharmacyms/internal/*] add audit client
- [lims/internal/*] add audit client

**Tests / Validation**
- Post sample audit envelope and ensure presence in `admin/audit` UI.

**Implementation tasks**
- Implement audit endpoint in EHR and client libs in services; add tests.
