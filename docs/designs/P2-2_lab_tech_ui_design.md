# P2-2 Design — Lab Tech UI: accessioning and verify

Story: [docs/stories/P2-2_lab_tech_ui_accessioning_and_verify.md](docs/stories/P2-2_lab_tech_ui_accessioning_and_verify.md)

**Acceptance Criteria**
- `/lab/orders` lists pending orders from LIMS.
- Lab tech can accession specimen and enter preliminary results; verifiers can finalize.
- Finalization triggers critical alerts when applicable.

**Design / LLD**
- EHR endpoints proxy LIMS: `GET /api/ehr/lab/orders`, `POST /api/ehr/lab/orders/{id}/accession`, `POST /api/ehr/lab/results`.
- Frontend pages `ehr/src/app/lab/orders/*` for list and detail.
- RBAC checks for LAB_TECH and LAB_VERIFIER roles.

**Files to edit**
- `ehr/src/app/lab/*` new pages
- `ehr/src/app/api/ehr/lab/*` server proxies

**Tests / Validation**
- End-to-end accession -> preliminary result -> verify -> alert flow.

**Implementation tasks**
- Implement pages and server proxies; add RBAC and tests.
