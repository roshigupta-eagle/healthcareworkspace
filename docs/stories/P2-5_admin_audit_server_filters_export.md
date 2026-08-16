# P2-5: Improve `admin/audit` viewer (server-side filtering and export)

**Summary:** Add server-side filtering and CSV export for the admin PHIPA audit viewer.

**Acceptance Criteria:**
- Admin can filter by date range, user, entity type, and action via server-side query parameters.
- Export button returns CSV of the filtered results.
- UI remains performant for large datasets.

**LLD:**
- **API:** implement `GET /api/admin/audit?start=&end=&user=&entityType=&action=&format=csv` that queries Prisma and returns JSON or CSV.
- **Frontend:** add filter controls and export button to `admin/audit` page.
- **Tests:** verify filters and CSV content.

**Tasks:**
- [ ] Implement server-side audit endpoint with filters.
- [ ] Add CSV export.
- [ ] Update UI and tests.
