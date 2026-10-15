# Project Integrity Audit

Status: in progress with the canonical clinical workspace paths verified. This document contains no patient names, contact details, or clinical values.

## Scope

The audit covers the EHR App Router pages and API routes, the local JSON read models, FHIR R4 integrations, role and preview authorization, persistence, patient identity propagation, document content access, responsive controls, and production validation.

The workspace contains two operating modes:

- Preview/development: canonical local development patients and JSON-backed clinical read models. Scheduling uses the local preview adapter because the running FHIR tenant is seeded with a different cardiology fixture population.
- Authenticated production: FHIR scheduling resources and configured clinical integrations are used where the route supports them. Preview query parameters are not accepted as a production bypass.

## Route Inventory

The inventory contains 96 App Router page files and 136 API route files. The following groups were crawled or reviewed as one workflow surface:

| Surface | Page routes | API route family | Result |
| --- | --- | --- | --- |
| Home and navigation | `/`, `/dashboard`, `/unauthorized`, `/login` | `/api/dashboard/summary`, auth/status | Canonical `/dashboard` is the role-aware home. Global and mobile navigation point to it. |
| Patient directory | `/dashboard/patients`, `/dashboard/records` | `/api/health-records`, `/api/health-records/{patientId}`, `/api/scheduling/patients` | Preview uses the shared canonical directory. |
| Patient chart | `/dashboard/records/{id}` and chart subroutes for history, timeline, notes, documents, labs, results, conditions, concerns, care gaps, care team, medications, immunizations, appointments, messages, trends, weight trend, and AI summary | `/api/patients/{patientId}/...` | Route family resolves local canonical patients and preserves patient IDs in linked APIs. |
| Scheduling | `/dashboard/appointments`, `/dashboard/appointments/book`, `/dashboard/appointments/{appointmentId}`, `/scheduling`, `/doctor/health-records/patient/{patientId}` | `/api/scheduling/*` | Preview adapter is persistent and Patient-reference safe. Production remains FHIR-backed. |
| Orders and results | `/dashboard/orders`, `/dashboard/orders/labs/new`, `/doctor/orders/{orderId}`, `/dashboard/records/labs`, patient lab/result routes | `/api/orders/*`, lab and result routes | Orders use separate FHIR, operational, transmission, and result-review states. |
| Documents and notes | `/dashboard/documents`, patient documents and viewers, doctor note routes | document, note, AI draft, SOAP routes | Uploads persist, are access checked, and expose a FHIR-shaped DocumentReference. |
| Tasks and communications | `/dashboard/tasks`, `/clinical-tasks`, `/communication/*`, patient task/message routes | task, doctor work, communication v1 routes | Canonical work sources are persisted; older demo routes remain isolated. |
| Admin and specialty demo | `/admin/*`, `/cardiology*`, `/doctor/*` legacy pages | `/api/admin/*`, `/api/cardiology/*` | Identified as mock/demo-backed or specialty-specific and excluded from canonical Dashboard claims. |

## Findings And Verification

| Module | Route | Expected behavior | Current behavior | Root cause | Severity | Source | FHIR relationship | Fix | Test or evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | `/dashboard`, `/api/dashboard/summary` | Role-aware metrics and work links come from current source records. | Aggregate combines schedule, work, communication, orders, and source health. | Previous route rendered a static cardiology dashboard. | High | JSON read models plus scheduling adapter/FHIR | Appointment, Patient, ServiceRequest, Observation/DiagnosticReport, DocumentReference, Task, Communication | Added `dashboardSummary` and source-aware client. | Dashboard route/API smoke test; unit suite; production build previously passed. | Fixed |
| Orders | `/dashboard/orders`, `/api/orders/*` | Patient-specific orders must be searchable, lifecycle-safe, idempotent, and reviewable. | Worklist, duplicate review, signing, queueing, events, version conflicts, and ServiceRequest projection are implemented. | Placeholder rows did not represent an order lifecycle. | High | `orderStore`, `ehr/data/clinical-orders.json` when configured | `ServiceRequest.subject = Patient/{id}`; results remain separate | Added canonical order read model and action/event APIs. | Order unit tests and browser lifecycle checks. | Fixed |
| Orders | `/dashboard/orders` | Every visible order patient must resolve in the active directory. | Baseline ECG and blood work now use canonical local patient IDs. | Preserved rows referenced deleted legacy demo identities. | High | `orderStore` baseline records | ServiceRequest subject is now resolvable | Reconciled test context to canonical local patients. | `referenceIntegrity.test.ts` and order projection test. | Fixed |
| Scheduling | `/dashboard/appointments`, `/scheduling`, booking APIs | Preview selection and booking must use the same Patient identity and persist state. | Preview has three canonical local patients, generated future slots, persisted bookings, duplicate checks, and cancellation/reschedule state. | FHIR tenant fixture contains unrelated seeded Patient IDs and appointments. | High | `previewSchedulingStore`, `ehr/data/scheduling_preview.json` | Preview emits FHIR-shaped Appointment participants referencing local Patient IDs; production uses FHIR resources | Added development-only adapter and routed preview reads/writes through it. | Preview workspace, booking, Patient reference, occupancy, cancellation, and detail route smoke tests. | Fixed |
| Documents | `/dashboard/documents`, patient documents APIs | Upload must bind to selected patient, persist binary content, enforce access, detect duplicates, and expose a subject reference. | Upload and review persist locally; content route is private/no-store and authenticated in production. | Picker did not consistently receive the actor-scoped canonical directory; stored documents lacked a common projection. | High | `documentStore`, local document file store | `DocumentReference.subject = Patient/{id}`; attachment URL points to guarded content route | Shared patient directory, preview preservation, duplicate checksum check, FHIR projection. | Picker browser check; document API compile/lint; content route review. | Fixed |
| Patient banner | Patient chart routes | Allergy status must not display NKA while data is loading or unavailable. | Known, loading, and unavailable states are distinct; active allergy records overlay chart data. | Empty fixture values were treated as authoritative NKA. | High | `allergyStore`, `mockPatients`, `PatientProfileHeader` | AllergyIntolerance patient reference is local read-model aligned | Added explicit allergy state and authoritative overlay. | Sarah chart browser check; focused lint. | Fixed |
| Patient chart | `/dashboard/records/{id}` | Server and client timestamps must render consistently. | Timeline receives a stable server timestamp. | Render-time `Date.now()` caused hydration divergence. | Medium | Chart route and timeline component | Timeline events retain patient source identifiers | Passed stable render time to timeline. | Focused browser check; unit suite. | Fixed |
| Conditions | Patient condition routes | Detail view should show recorded condition data and real workflows. | Detail reads patient condition data and does not fabricate an unrelated condition or dead care-plan route. | Legacy component used fabricated fallback content. | Medium | Patient read model | Condition.subject references Patient | Removed fabricated fallback and dead action. | Focused lint and browser review. | Fixed |
| Weight trend | Patient weight routes | Empty history must remain empty and insights/actions must work. | No fake fallback measurements; actions open real drawers or persistence routes. | Component synthesized measurements and included a no-op insights control. | Medium | Weight stores and measurement APIs | Observation.subject should map to Patient in future FHIR export | Removed fake fallback and connected control. | Weight unit tests and focused lint. | Fixed |
| Patient actions | Patient Profile More Actions | Each command must navigate to an existing patient workflow. | Upload, task, condition, allergy, medication, note, and immunization actions use existing routes. | Several links targeted nonexistent `/new` or `/upload` pages. | Medium | `PatientProfileHeader` | Target workflows preserve Patient ID | Replaced dead targets with canonical routes and query state. | Focused lint; route scan. | Fixed |
| Legacy specialty surfaces | `/cardiology*`, selected `/doctor/*`, old scheduling clients | Must not be represented as the canonical production Dashboard. | Several remain mock/demo-backed and are visibly or structurally isolated. | Earlier prototype surfaces were retained for specialty demonstrations. | Medium | `cardiology/services/api.mock`, legacy clients | FHIR relationship is partial or simulated | Documented as residual scope; canonical links route to new workspaces. | Placeholder/mock scan and route inventory. | Open, contained |
| Whole repository lint | EHR source tree | Clean lint is the release gate. | Repository lint still reports approximately 891 errors and 346 warnings. | Large legacy surface remains `any`-heavy and includes old demo code. | High | ESLint | Not applicable | New canonical slices were linted individually; broad cleanup remains. | `npm --prefix ehr run lint` recorded failure. | Open |

## Security And Access Checks

- Preview access is restricted to non-production and recognized development query parameters.
- Production API routes use the shared doctor-workspace authorization resolver; patient document APIs additionally check patient access.
- Document content uses a server-side storage key, never a user-supplied filesystem path, and responds with private no-store headers.
- Document uploads enforce extension, MIME, size, and checksum duplicate checks.
- Scheduling mutations validate the selected slot, patient, provider/location expectations, idempotency, and lifecycle state.
- Cross-tenant FHIR behavior remains dependent on the FHIR service tenant middleware and integration credentials; a full multi-tenant authenticated probe is still required before production sign-off.

## Release Evidence

- Unit suite: 26 files and 171 tests passed after the latest integrity changes.
- Focused lint: canonical Dashboard, Orders, Documents, scheduling adapter, patient header, banner, and patient-detail routes pass.
- FHIR smoke: live FHIR Patient search returned a valid R4 searchset Bundle, but its seeded population is intentionally separate from local preview patients.
- Preview route smoke: Dashboard, Documents, Orders, scheduling workspace, booking, and canonical patient detail returned HTTP 200.
- Preview booking lifecycle: appointment Patient reference, slot occupancy, and slot release after cancellation verified.
- Full repository lint: not a release pass because legacy failures remain.
- Final full production build after the newest changes: pending at the time of this audit.

## Residual Risks

1. The authenticated multi-tenant and cross-patient API probe still needs to run against representative credentials.
2. The FHIR service's seeded Patient and Appointment population is not the same as the local preview population; the application now labels and isolates that boundary instead of silently joining the records.
3. Legacy mock/demo pages and APIs remain available under their old routes and need a product decision: retire, migrate, or explicitly mark as non-production.
4. Repository-wide lint and some older components require a separate modernization pass.
5. DocumentReference persistence to an external FHIR server is not yet implemented for local uploads; the application currently provides a FHIR-shaped projection and guarded local content URL.