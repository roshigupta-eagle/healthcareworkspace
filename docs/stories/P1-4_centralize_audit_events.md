# P1-4: Centralize audit events from Go services into EHR audit viewer

**Summary:** Ensure PharmacyMS and LIMS send audit envelopes to EHR so `admin/audit` shows a unified audit trail.

**Acceptance Criteria:**
- On create/update actions (prescription create, dispense, order create, result finalize), services POST audit envelope to `POST /api/internal/audit` on EHR with `INTERNAL_SERVICE_TOKEN`.
- Admin `audit` UI shows these events with `agent`, `action`, `entityType`, and `detail`.
- Payloads are persisted via Prisma `auditEvent` table.

**LLD:**
- **Go services:** implement `internal/auditclient` that posts `{ agentId, agentRole, action, entityType, entityId, detail }` to EHR.
- **EHR:** implement `POST /api/internal/audit` server route validating `INTERNAL_SERVICE_TOKEN` and writing to `prisma.auditEvent`.
- **Mapping:** include `agent` object or `agentId` to be correlated to user records in EHR.
- **Tests:** post sample audit envelope and verify presence in `admin/audit`.

**Tasks:**
- [ ] Implement audit client in both Go services and call at key points.
- [ ] Add `POST /api/internal/audit` in EHR and tests.
- [ ] Update `admin/audit` to include `source` (system name).
