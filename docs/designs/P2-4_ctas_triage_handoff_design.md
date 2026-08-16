# P2-4 Design — CTAS triage → patient lookup & handoff

Story: [docs/stories/P2-4_ctas_triage_handoff.md](docs/stories/P2-4_ctas_triage_handoff.md)

**Acceptance Criteria**
- CTAS supports FHIR `Patient` search.
- Completing triage creates `triage_record` or FHIR `Task` assigned to a queue/provider.
- Handoff visible in `QueueWorkbench`.

**Design / LLD**
- Add patient lookup client to `CTASWizard` that calls `fhirSearch('Patient', ...)`.
- `POST /api/ehr/triage` server route to persist `triage_records` and assign to queue.
- Integrate `QueueWorkbench` to surface new tasks.

**Files to edit**
- `ehr/src/components/ctas/*` and `ehr/src/app/api/ehr/triage/route.ts` (new)

**Tests / Validation**
- E2E triage -> queue propagation.

**Implementation tasks**
- Add patient search, server persistence, and queue integration.
