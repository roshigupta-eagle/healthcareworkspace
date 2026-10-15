# Tasks & Inbox Test Plan

## Existing automated coverage
- `ehr/src/__tests__/taskWorkflow.test.ts` covers task access, actor update permissions, source-linked completion safety, and FHIR task mapping.
- `ehr/src/__tests__/doctorWorkspace.test.ts` covers work snapshot behavior.

## Focused manual checks
1. Open `/dashboard/tasks?noauth=1&asUser=dev` and confirm real counts render.
2. Search by Patient, MRN, source label, and task title.
3. Switch List, Kanban, Timeline, and Calendar; confirm the same filtered task set is used.
4. Open Task Details; confirm Patient.id and exact source links.
5. Attempt completion of source-linked unreviewed work; confirm the server blocks it.
6. Create a task with a canonical Patient and optional source; confirm idempotent persistence.
7. Drag a canonical task; confirm transition validation uses the mutation endpoint.
8. Test keyboard drawer focus, Escape close, reduced motion, mobile List layout, and dark theme.
9. Run `npm --prefix ehr run lint`, `npm --prefix ehr run test:unit`, and `npm --prefix ehr run build`.

## Known repository baseline
The unit suite currently contains an unrelated Health Records fixture mismatch. It is reported rather than disabled.
