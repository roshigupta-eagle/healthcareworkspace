# AI Clinical Summary — High Level Design

Purpose
-------
Build an AI-assisted clinical summary page for Roshi EHR that helps clinicians rapidly understand a patient's current clinical state, sources, and uncertainty. The service aggregates FHIR/Roshi clinical data, generates a versioned summary with source attributions and a confidence score, and exposes a clinician-review workflow, sharing/export, and audit events.

Primary users
-------------
- Clinicians (MD/NP/PA)
- Nurses / Care Coordinators
- Pharmacists
- Audit & Compliance

High-level flow
---------------
1. Patient route accessed: `/dashboard/records/:patientId/ai-summary`
2. Server validates session & patient permissions
3. Clinical data aggregated (observations, labs, vitals, notes, meds)
4. Normalized data passed to summary generator (service)
5. Summary created and persisted with a version id, sources, and confidence factors
6. UI displays summary, metrics, timeline, recommendations, and actions
7. Clinician may review, accept/dismiss recommendations, regenerate, share, export or create tasks
8. All user actions are audited

System boundaries & responsibilities
----------------------------------
- UI: rendering, interaction, accessibility, and print/export UI
- Backend (API): secure endpoints for generation, retrieval, review, export, FHIR mapping, audit
- Storage: immutable summary versions and provenance (file-backed for prototype, DB in production)
- AI service: external or internal model used to synthesize findings (abstracted behind a generation API)
- FHIR mapping: produce Composition / DocumentReference + Provenance for each summary version

Security, privacy & audit
-------------------------
- Server-side authorization for all endpoints (user ↔ patient checks)
- Audit events for generation, review, export, share, print, and sensitive-source access
- Patient data never leaked to unauthenticated users; sharing requires explicit confirmation and is auditable

Performance & resilience
------------------------
- Cached latest summary for fast page loads
- Lazy-load heavy assets (confidence details, FHIR JSON, audit log)
- Generation runs asynchronously with progress stages and preserves previous versions

Notes
-----
This HLD is a product-level summary. The LLD contains the concrete route map, component tree, models, and API contracts used by the implementation artifacts in the repository.
