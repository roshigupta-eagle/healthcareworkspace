# P3-3: Implement critical-value pipeline (Redis pub/sub → SSE → notifications)

**Summary:** Replace `slog.Warn` in LIMS with a robust publish/subscribe pipeline: LIMS publishes to Redis, EHR subscribes and serves SSE for clinician notifications.

**Acceptance Criteria:**
- LIMS publishes critical alerts to Redis channel `critical_values` when a result is finalized and critical.
- EHR background worker subscribes, persists the alert, and pushes to connected SSE clients for `targetRoles`.
- Clinician acknowledgment is recorded in audit.

**LLD:**
- **Infra:** provision Redis (env `REDIS_URL`).
- **LIMS:** `PUBLISH critical_values <json>` on finalization.
- **EHR:** background subscriber saves event and calls `notificationBus.publish` for SSE streams; implement `POST /api/notifications/{id}/ack`.
- **Tests:** end-to-end Redis publish → SSE delivery tests.

**Tasks:**
- [ ] Add Redis dependency and config.
- [ ] Implement publisher in LIMS and subscriber in EHR.
- [ ] Add SSE ack endpoint and audit.
