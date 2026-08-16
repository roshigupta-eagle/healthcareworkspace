# P0-3 Design — Dispense lifecycle checks

Story: [docs/stories/P0-3_dispense_lifecycle_checks.md](docs/stories/P0-3_dispense_lifecycle_checks.md)

**Acceptance Criteria**
- Dispenses for non-active prescriptions return 422.
- Dispenses that exceed remaining quantity/refills return 422.
- Concurrent dispenses cannot exceed available quantity.
- Blocked attempts generate an audit event.

**Design / LLD**
- Use DB transactions and SELECT FOR UPDATE to lock prescription row before creating dispense.
- Compute remaining quantity using SUM(dispenses.quantity).
- Return structured error JSON for client handling.
- Post audit envelope to EHR when blocked.

**Files to edit**
- pharmacyms/internal/handler/dispenses.go
- pharmacyms/internal/store/*.go

**Tests**
- Unit tests for remaining quantity logic and concurrency integration test.

**Tasks**
- Implement transactional check-and-create and add tests.
