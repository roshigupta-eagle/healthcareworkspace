# P0-4 Design — Lab result verify workflow

Story: [docs/stories/P0-4_lab_result_verify_workflow.md](docs/stories/P0-4_lab_result_verify_workflow.md)

**Acceptance Criteria**
- New results default to preliminary and cannot be created as final via create.
- Only LAB_VERIFIER/PATHOLOGIST roles can set final.
- Critical alerts emitted after finalization.
- Verification is auditable.

**Design / LLD**
- Add PATCH /api/v1/results/{id}/status for verifiers.
- Ensure POST /api/v1/results sets status=preliminary regardless of input.
- On finalization, trigger critical-value pipeline and post audit.

**Files to edit**
- lims/internal/handler/results.go
- lims/internal/store/*.go

**Tests**
- Unit tests for create/verify flows and integration test to assert alert emission.

**Tasks**
- Implement status update handler, RBAC checks, and tests.
