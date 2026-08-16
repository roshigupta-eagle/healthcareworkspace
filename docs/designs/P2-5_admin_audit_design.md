# P2-5 Design — Admin audit: server-side filters & export

Story: [docs/stories/P2-5_admin_audit_server_filters_export.md](docs/stories/P2-5_admin_audit_server_filters_export.md)

**Acceptance Criteria**
- Admin can filter by date/user/entity/action via server-side query.
- Export returns CSV of filtered set.

**Design / LLD**
- Implement `GET /api/admin/audit` with query params `start,end,user,entityType,action,format` using Prisma query filters.
- Add CSV generation when `format=csv`.
- Update UI to call this endpoint and present results/export.

**Files to edit**
- `ehr/src/app/admin/audit/page.tsx` and add `ehr/src/app/api/admin/audit/route.ts` (new)

**Tests / Validation**
- Filter and CSV content tests.

**Implementation tasks**
- Implement server filter endpoint and UI changes.
