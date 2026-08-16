# P1-3: LIMS → EHR critical-value notifications

**Summary:** When a lab result is finalized with a critical interpretation, LIMS must POST a standardized alert to EHR `/api/lab-alerts` using `INTERNAL_SERVICE_TOKEN`. EHR publishes to the notification bus and logs an audit event.

**Acceptance Criteria:**
- LIMS posts the alert JSON that validates against EHR `alertSchema` and includes `patientFhirId`, `testName`, `value`, `interpretation`.
- EHR validates `INTERNAL_SERVICE_TOKEN` and, on success, publishes to `notificationBus` and writes an `AuditEvent`.
- Clinicians subscribed via SSE receive the event within 5 seconds in staging.

**LLD:**
- **LIMS:** after finalizing result, call `POST https://{EHR}/api/lab-alerts` with JSON and `Authorization: Bearer {INTERNAL_SERVICE_TOKEN}`.
- **EHR:** existing `lab-alerts` route already validates token; ensure it also calls `logAuditEvent` and persists the event if needed.
- **Security:** rotate `INTERNAL_SERVICE_TOKEN` via secrets management; only LIMS/PharmacyMS have token.
- **Tests:** integration testing of LIMS -> EHR with valid and invalid tokens.

**Tasks:**
- [ ] Implement POST call in LIMS result-finalization code.
- [ ] Verify EHR ingests and publishes; add audit write.
- [ ] Add integration tests.
