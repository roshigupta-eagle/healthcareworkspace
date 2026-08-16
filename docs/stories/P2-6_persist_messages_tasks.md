# P2-6: Persist messages and tasks with audit trail

**Summary:** Replace in-memory messages and tasks with persistent DB tables and ensure all changes are audit-logged.

**Acceptance Criteria:**
- Sending a message creates a `messages` DB row and an `AuditEvent`.
- Viewing messages results in `R` audit events when appropriate.
- Tasks are persisted and can be assigned, completed, and audited.

**LLD:**
- **DB:** add `messages` table (`id, conversation_id, sender_id, recipient_id, body, created_at, read_at`) and `tasks` table.
- **API:** implement `POST /api/messages`, `GET /api/messages?patient=`, `PATCH /api/tasks/{id}` etc.
- **Audit:** call `POST /api/internal/audit` for message create/read and task actions.
- **Frontend:** update message client to use persisted APIs.

**Tasks:**
- [ ] Create DB migrations for `messages` and `tasks`.
- [ ] Implement API handlers and UI updates.
- [ ] Add audit call sites and tests.
