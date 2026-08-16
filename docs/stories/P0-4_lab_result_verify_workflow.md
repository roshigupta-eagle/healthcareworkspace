# P0-4: Add verify/release workflow for lab results

**Summary:** Ensure lab results are entered as `preliminary` and require an authorized verifier to mark them `final`.

**Acceptance Criteria:**
- New results default to `preliminary` and cannot be created as `final` via the create endpoint.
- Only users with `LAB_VERIFIER`/`PATHOLOGIST` roles can update a result to `final` via `PATCH /api/v1/results/{id}/status`.
- Critical-value detection triggers alerts after finalization (configurable policy).
- Verification and finalization actions are auditable.

**LLD:**
- **DB:** ensure `lab_results` has `status`, add `verified_by TEXT NULL`, `verified_at TIMESTAMPTZ NULL` if absent.
- **API:**
  - `POST /api/v1/results` sets `status = 'preliminary'` and stores `resulted_by`.
  - `PATCH /api/v1/results/{id}/status` allows verifier role to set `final`/`amended`/`cancelled`.
- **Auth:** protect verify endpoint with `RequireAuth('LAB_VERIFIER','PATHOLOGIST')`.
- **Critical alerts:** only emit critical-value alert pipeline once a result transitions to `final` (or optionally on prelim if policy dictates).
- **UI:** LIMS or lab UI must show preliminary results in a verify queue.
- **Tests:** unit tests for create/verify flows and RBAC enforcement.

**Tasks:**
- [ ] Update DB schema if necessary.
- [ ] Implement `ResultsHandler.Verify` endpoint.
- [ ] Protect endpoints via auth middleware.
- [ ] Add tests and manual verification steps.
