# P2-4: CTAS triage → patient lookup and create handoff task

**Summary:** Enhance triage so the CTAS form can search FHIR `Patient` and create a handoff task assigned to a clinic/provider queue.

**Acceptance Criteria:**
- CTAS form supports patient search via FHIR `Patient` search.
- Completing triage creates a `triage_record` or FHIR `Task` and assigns it to a provider queue or user.
- Handoff is visible in the `QueueWorkbench` for assigned clinicians.

**LLD:**
- **Frontend:** extend `CTASWizard` to include patient lookup.
- **Server:** `POST /api/ehr/triage` creates DB `triage_records` and optionally a FHIR `Task`.
- **Queueing:** integrate with `QueueWorkbench` data source.
- **Tests:** end-to-end triage -> queue propagation.

**Tasks:**
- [ ] Add patient search UI.
- [ ] Implement triage server handler and persistence.
- [ ] Integrate with queue UI and tests.
