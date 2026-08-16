# P2-1 Design — Pharmacist UI: queue and dispense workflow

Story: [docs/stories/P2-1_pharmacist_ui_prescription_queue.md](docs/stories/P2-1_pharmacist_ui_prescription_queue.md)

**Acceptance Criteria**
- `/pharmacy/queue` lists active prescriptions with paging.
- Detail page shows Rx, patient FHIR data, allergies/DUR, and `Dispense` action.
- Dispense action orchestrates calls through EHR APIs and records audit.

**Design / LLD**
- Add EHR server endpoints under `ehr/src/app/api/ehr/pharmacy/` to proxy and orchestrate calls to PharmacyMS.
- Frontend pages: `ehr/src/app/pharmacy/queue/page.tsx` and `.../prescriptions/[id]/page.tsx` with client components for actions.
- RBAC: pages protected in `middleware.ts` for `PHARMACIST` role.

**Files to edit**
- `ehr/src/app/pharmacy/*` new pages
- `ehr/src/app/api/ehr/pharmacy/*` server routes

**Tests / Validation**
- UI tests for queue listing and dispense flow that assert calls to PharmacyMS and audit events.

**Implementation tasks**
- Implement server proxies and pages; wire RBAC; add tests.
