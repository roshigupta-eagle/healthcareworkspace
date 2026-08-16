# P2-2: Lab Tech UI — accessioning, result entry, verify queue

**Summary:** Create a lab technician UI for accessioning orders, entering results (preliminary), and a verification queue for finalization.

**Acceptance Criteria:**
- `/lab/orders` lists pending/in-progress orders from LIMS.
- Lab tech can accession an order (specimen id, lot), enter preliminary results, and submit for verification.
- Verifiers can mark results final; finalization triggers critical-value alerts if applicable.

**LLD:**
- **Frontend:** `ehr/src/app/lab/orders/page.tsx` and `LabOrderDetailClient.tsx` for entry/verify.
- **EHR API:** proxy endpoints to LIMS for listing/creating/patching orders/results using `INTERNAL_SERVICE_TOKEN`.
- **Data:** include accession metadata when calling LIMS `POST /api/v1/orders/{id}/accession` (extend API if needed).
- **Tests:** UI tests for accession and verify flows.

**Tasks:**
- [ ] Implement lab UI pages.
- [ ] Extend LIMS API if needed to record accession metadata.
- [ ] Protect verifier endpoints with RBAC.
- [ ] Add integration tests.
