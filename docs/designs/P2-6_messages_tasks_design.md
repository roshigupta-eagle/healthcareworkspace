# P2-6 Design — Persist messages and tasks with audit

Story: [docs/stories/P2-6_persist_messages_tasks.md](docs/stories/P2-6_persist_messages_tasks.md)

**Acceptance Criteria**
- Messages stored in DB and create audit events.
- Tasks persisted, assignable, and auditable.

**Design / LLD**
- Add migrations for `messages` and `tasks` tables (columns: id, sender, recipient, body, created_at, read_at; tasks: id, assignee, state, payload).
- Implement API handlers and update frontend to use them.
- Post audit envelopes to EHR audit on create/read/update.

**Files to edit**
- `ehr/prisma/migrations` add new SQL
- `ehr/src/app/api/messages/*`, `ehr/src/app/api/tasks/*`

**Tests / Validation**
- Message create/read tests and audit verification.

**Implementation tasks**
- Add migrations, APIs, UI updates, and audit calls.
