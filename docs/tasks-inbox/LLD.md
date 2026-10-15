# Tasks & Inbox LLD

## Read path
`page.tsx` resolves the authenticated or preview actor, then calls `getDoctorWorkSnapshot(actor.id, actor.name, actor.role)`. The client derives filtering and view projections from the returned `DoctorWorkSnapshot`.

## Write path
- Create: `POST /api/doctor/work`
- Update: `PATCH /api/doctor/work/{taskId}`
- Every mutation resolves the canonical task, checks patient access and actor permission, validates source relationships, and writes an audit event.
- Updates accept `expectedUpdatedAt`; version conflicts return `409`.
- Creates accept an idempotency key.

## UI layers
- Header: scope identity, refresh, create task.
- Snapshot: open, urgent, due today, overdue.
- Tabs and filters: projections over one task array.
- Views: List, Kanban, Timeline, Calendar.
- Task drawer: patient, source, status, due date, owner, instructions, actions, history.
- Intelligence strip: workload, recent activity, source-status truth.

## Responsive behavior
- Desktop defaults to List for scanability.
- Kanban remains available with horizontal lane scrolling.
- Mobile preserves List as the safe default and stacks intelligence panels.
- Drawer uses `WorkspaceDrawer` focus trapping and Escape handling.
