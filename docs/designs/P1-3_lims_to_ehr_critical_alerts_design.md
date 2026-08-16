# P1-3 Design — LIMS → EHR critical-value notifications

Story: [docs/stories/P1-3_lims_to_ehr_critical_alerts.md](docs/stories/P1-3_lims_to_ehr_critical_alerts.md)

**Acceptance Criteria**
- LIMS posts valid alert JSON to `POST /api/lab-alerts` with `INTERNAL_SERVICE_TOKEN`.
- EHR validates token, publishes to `notificationBus`, and writes an `AuditEvent`.
- Clinicians receive event via SSE within 5s.

**Design / LLD**
- LIMS on `result` finalization posts payload matching `ehr/src/app/api/lab-alerts/route.ts` schema.
- Implement retry/backoff and idempotency using `orderId`+`resultedAt` as idempotency key.
- EHR `lab-alerts` route already implemented; ensure `logAuditEvent` called and `notificationBus.publish` used.

**Files to edit**
- [lims/internal/handler/results.go](lims/internal/handler/results.go)
- [ehr/src/app/api/lab-alerts/route.ts](ehr/src/app/api/lab-alerts/route.ts)

**Tests / Validation**
- Integration test: finalize result in LIMS and assert EHR receives and publishes event to SSE.

**Implementation tasks**
- Implement LIMS post on finalization, add idempotency and retries, and test.
