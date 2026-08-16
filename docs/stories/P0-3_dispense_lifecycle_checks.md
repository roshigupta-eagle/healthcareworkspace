# P0-3: Prevent dispensing when prescription is not active or refills exhausted

**Summary:** Enforce prescription lifecycle rules in `pharmacyms` so dispensers cannot record a dispense against inactive or exhausted prescriptions.

**Acceptance Criteria:**
- Creating a dispense for a prescription with status ≠ `active` returns HTTP 422 with descriptive error.
- Attempting to dispense more than remaining quantity/refills returns HTTP 422.
- Concurrent dispense attempts do not allow exceeding available quantity (transactional safety).
- Blocked attempts generate an audit record.

**LLD:**
- **DB logic:** compute remaining quantity/refills from `prescriptions` and `dispenses` tables; optionally add `remaining_refills` or recompute on-the-fly.
- **Handler changes:** `DispensesHandler.Create` will:
  - Fetch prescription within DB transaction using `SELECT ... FOR UPDATE` (or equivalent) to avoid race conditions.
  - Verify `prescription.status == 'active'`.
  - Validate requested quantity against remaining allowed quantity/refills.
  - Create `dispense` row and commit.
- **Errors:** return structured JSON `{ error, code }` for UX consumption.
- **Audit:** post envelope to EHR `POST /api/internal/audit` (P1-4) for both successful and blocked attempts.
- **Tests:** unit tests for validation logic and a concurrency integration test.

**Tasks:**
- [ ] Implement transactional check-and-create in `DispensesHandler`.
- [ ] Add DB helper methods for remaining refills/quantity.
- [ ] Add tests (unit + concurrent integration).
- [ ] Add error codes and map to UI messages.
