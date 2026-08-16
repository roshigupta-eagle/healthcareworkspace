# P3-3 Design — Critical-value pipeline (Redis → SSE → notifications)

Story: [docs/stories/P3-3_critical_value_pipeline.md](docs/stories/P3-3_critical_value_pipeline.md)

**Acceptance Criteria**
- LIMS publishes critical alerts to Redis; EHR subscribes and pushes SSE notifications.
- Clinician acknowledgement recorded in audit.

**Design / LLD**
- Provision `REDIS_URL` and integrate `github.com/go-redis/redis/v8` in LIMS and EHR.
- LIMS: on result finalization `PUBLISH critical_values <json>`.
- EHR: background worker subscribes `SUBSCRIBE critical_values`, persists event, and publishes to SSE via `notificationBus`.
- Add `/api/notifications/{id}/ack` endpoint that records ack and posts audit.

**Files to edit**
- `lims/internal/handler/results.go`
- `ehr/src/notifications/*` background worker and ack route

**Tests / Validation**
- Integration test: publish to Redis -> SSE client receives event.

**Implementation tasks**
- Add Redis integration and worker; tests.
