# P2-1: Pharmacist UI — prescription queue and dispense workflow

**Summary:** Add a pharmacist-facing UI to the EHR where pharmacists can view active prescriptions, run DUR, counsel, and record dispenses.

**Acceptance Criteria:**
- `/pharmacy/queue` lists active prescriptions (paged), with patient demographics pulled via FHIR.
- `/pharmacy/prescriptions/{id}` shows full Rx, allergy and DUR history, and a `Dispense` action.
- Dispense UI calls `POST /api/ehr/pharmacy/dispense` which orchestrates `POST {PHARMACY}/api/v1/dispenses` and writes an audit event.
- Pharmacist actions are RBAC protected (`PHARMACIST` role).

**LLD:**
- **Frontend:** implement `ehr/src/app/pharmacy/queue/page.tsx` and `PharmacyPrescriptionDetailClient.tsx`.
- **EHR API:** add `GET /api/ehr/pharmacy/prescriptions` and `POST /api/ehr/pharmacy/dispense` server handlers to call downstream service using `INTERNAL_SERVICE_TOKEN`.
- **UX:** show DUR alerts prominently; require override reason for any soft/hard override.
- **Tests:** integration coverage for listing and dispense actions.

**Tasks:**
- [ ] Build server endpoints and client pages.
- [ ] Add RBAC checks and tests.
- [ ] Wire DUR and audit.
