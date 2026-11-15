# URL and endpoint conventions

Scope: the EHR web app (`ehr/`) and the Go services it works with (`fhir/`, `lims/`, `pharmacyms/`).
The full list of EHR pages and API routes is generated in [url-catalog.md](./url-catalog.md).

## 1. Applications and base URLs (development)

| Application | Base URL | Port source |
|---|---|---|
| EHR (Next.js) | `http://localhost:3000` | `next dev` default |
| FHIR service | `http://localhost:8081` | `fhir/.env`, `PORT` |
| PharmacyMS | `http://localhost:8082` | `pharmacyms/.env.example`, `PORT` |
| LIMS | `http://localhost:8083` | `lims/.env.example`, `PORT` |

## 2. Rules for EHR URLs

These rules are enforced by `ehr/src/__tests__/routeConvention.test.ts`.

1. **Static segments** are lowercase kebab-case (`clinical-configuration`, `health-concerns`).
2. **Dynamic segments** are named after their entity and end in `Id`: `[patientId]`, `[encounterId]`, `[labId]`. Never a bare `[id]`.
3. **Pages** never live under `/api`; **route handlers** (`route.ts`) always live under `/api`.
4. **Audience prefix** decides who a page is for:

   | Prefix | Audience | Meaning |
   |---|---|---|
   | `/patient/...` | Patient | The signed-in patient's own portal (singular: "me"). |
   | `/patients/{patientId}/...` | Staff | A patient chosen by staff (plural: a collection). |
   | `/doctor/...` | Doctor | Doctor workspace. |
   | `/admin/...` | Admin | Administration console. |
   | `/dashboard/...` | Clinical staff | Shared clinical workspace, including laboratory and medication screens. |

5. **API paths are resource-oriented**: plural nouns identify the resource and the HTTP method is the action.

   | Intent | Request |
   |---|---|
   | List / create | `GET` / `POST /api/{resources}` |
   | Read / update / delete | `GET` / `PATCH` / `DELETE /api/{resources}/{resourceId}` |
   | Child collection | `/api/{resources}/{resourceId}/{children}` |
   | Patient-scoped data | `/api/patients/{patientId}/{children}` |

6. **State changes that are not plain updates** use a named sub-resource of the record, with `POST`: `/{id}/transition`, `/sign`, `/approve`, `/resolve`, `/join`. Do not add verb-led top-level paths such as `/api/book` or `/api/assign`.
7. **Versioning**: new contract-style APIs go under `/api/v1/...` (as `/api/communication/v1`). Existing unversioned routes stay as they are until they are migrated.
8. **Filters** are query parameters (`?status=`, `?q=`), never path segments.
9. **Every new URL needs a per-request authorization check** (see section 6), not only the login requirement in `ehr/src/proxy.ts`.

## 3. Backend services

All Go services use `chi`, expose `GET /health`, and return clean paths (trailing slashes are stripped).
Their roles are declared with `auth.RequireAuth(...)`; GET routes declare no role.

### Laboratory: LIMS (`lims/`, port 8083)

| Method | Path | Declared roles |
|---|---|---|
| GET | `/health` | none |
| GET | `/api/v1/tests` | none |
| GET | `/api/v1/orders` | none |
| POST | `/api/v1/orders` | `DOCTOR`, `ADMIN` |
| PATCH | `/api/v1/orders/{id}/status` | none declared |
| GET | `/api/v1/orders/{id}/results` | none |
| GET | `/api/v1/results?order={uuid}` | none |
| POST | `/api/v1/results` | `LAB_TECH`, `LAB_VERIFIER`, `PATHOLOGIST`, `ADMIN` |
| PATCH | `/api/v1/results/{id}/status` | `LAB_VERIFIER`, `PATHOLOGIST`, `ADMIN` |

Routes under `/api/v1` register only when `DATABASE_URL` is configured and the connection succeeds.

### Pharmacy: PharmacyMS (`pharmacyms/`, port 8082)

| Method | Path | Declared roles |
|---|---|---|
| GET | `/health` | none |
| POST | `/api/v1/dur/check` | none (always available, no database needed) |
| GET | `/api/v1/medications?q=` | none |
| GET | `/api/v1/prescriptions?patient=&status=` | none |
| POST | `/api/v1/prescriptions` | `DOCTOR`, `ADMIN` |
| PATCH | `/api/v1/prescriptions/{id}/status` | `DOCTOR`, `ADMIN` |
| GET | `/api/v1/dispenses?prescription={uuid}` | none |
| POST | `/api/v1/dispenses` | `PHARMACIST`, `ADMIN` |

Except `/api/v1/dur`, routes register only when `DATABASE_URL` is configured and the connection succeeds.

### FHIR service (`fhir/`, port 8081)

| Path | Notes |
|---|---|
| `GET /health` | no auth |
| `GET /fhir/R4/metadata` | CapabilityStatement, no auth |
| `/fhir/R4/{resourceType}` | `GET` search, `POST` create |
| `/fhir/R4/{resourceType}/{id}` | `GET` read, `PUT` update, `DELETE` delete |
| `GET /fhir/R4/{resourceType}/{id}/_history[/{vid}]` | history and version read |
| `/cardiology/visits[/{encounterId}[/transition\|events\|transitions]]` | cardiology visit workflow |
| `/cardiology/queues[/{name}[/items/{id}/claim\|complete]]`, `/cardiology/rooms`, `/cardiology/dashboard` | queues, rooms, dashboard |
| `/cardiology/simulate/{seed\|advance\|reset}` | simulator, development use |
| `/lab/ingest/{hl7v2\|fhir}`, `/lab/queue`, `/lab/records[/{id}[/match\|retry]]` | lab result ingestion |

Everything except `/health` and `/fhir/R4/metadata` requires the JWT middleware.

### Rules for service endpoints

- Business APIs live under `/api/v1/{resources}`; FHIR keeps its standard `/fhir/R4` layout.
- Path parameters are `{id}` or a named entity; resources are plural nouns.
- LIMS and PharmacyMS allow cross-origin calls only from `ALLOWED_ORIGIN` (default `http://localhost:3000`).
- Ports are set by `PORT`; the code default must match `.env.example`.

## 4. Signing in (local server)

Every role signs in at `http://localhost:3000/login` and is sent to its own home page. A `returnTo` query value is honoured only when it is a same-site path. Signed-in users who open `/login` or `/register` are redirected to their home page. The mapping lives in `ehr/src/lib/roleHome.ts`.

| Role | Username | Password | Lands at |
|---|---|---|---|
| Admin | `admin@example.com` | `Admin#Local2026` | `http://localhost:3000/admin` |
| Doctor (Dr. Aris Thorne) | `doctor@example.com` | `Doctor#Local2026` | `http://localhost:3000/doctor` |
| Nurse (Nurse Sarah Lee) | `nurse@example.com` | `Nurse#Local2026` | `http://localhost:3000/dashboard` |
| Pharmacist | `pharmacist@example.com` | `Pharmacist#Local2026` | `http://localhost:3000/dashboard` |
| Lab technician | `labtech@example.com` | `LabTech#Local2026` | `http://localhost:3000/dashboard` |
| Receptionist | `receptionist@example.com` | `Reception#Local2026` | `http://localhost:3000/schedule/today` |
| Billing | `billing@example.com` | `Billing#Local2026` | `http://localhost:3000/` |
| Patient care assistant | `pca@example.com` | `Pca#Local2026` | `http://localhost:3000/` |
| Patient (Sarah Jenkins, `patient-001`) | `patient@example.com` | `Patient#Local2026` | `http://localhost:3000/patient/dashboard` |
| Pending approval | `pending@example.com` | `Pending#Local2026` | sign-in is refused until an admin approves the account |

These are local-development accounts only, defined once in `ehr/src/lib/devAccounts.ts`. `devAuthStore.ts` seeds them in memory when `NODE_ENV` is not `production`, and the Playwright helper and the role test read the same list. In production they do not exist; accounts come from the identity provider (section 6).

The doctor and nurse names match members of the seeded care team of `patient-001`, which is what gives them access to that record. They cannot open `patient-002` or `patient-003`.

Billing and patient care assistant have no EHR feature yet (there is no billing screen, and no care-assistant workflow), so they land on the public home page and cannot open any patient data. Pharmacists and lab technicians use the shared `/dashboard`; there is no dedicated pharmacy or lab home page.

### Access policy

The rule is least privilege: a role sees only what its job needs, and administrators run the system without reading patient health records. This is enforced for every patient-scoped request in `ehr/src/proxy.ts` (the Next.js 16 name for middleware; it runs on Node.js, which the record-level check needs), using `ehr/src/lib/patientAccessPolicy.ts` and `ehr/src/lib/patientCareTeam.ts`, so a new `/api/patients/{patientId}/...` route is protected without extra code. Page-level role sets are in `ehr/src/lib/doctorWorkspaceAuth.ts`.

| Role | Patient health data (`/api/patients/{id}/...`, chart pages) | Other areas |
|---|---|---|
| Doctor, nurse, clinician, practitioner | Every section, only for patients on their care team | Clinical dashboard, encounters, orders (doctor), scheduling, cardiology, search of patients |
| Pharmacist | Medications and allergies sections only (allergies read-only), any patient | Medications workspace |
| Lab technician | Labs and lab-comparator, read only, any patient | Laboratory workspace |
| Patient | Own record only, read only: allergies, medications, immunizations, conditions, care gaps, visit history, trends | Patient portal |
| Receptionist | None | Scheduling (`/schedule/today`, `/scheduling`, `/api/scheduling/*`) |
| Admin | None | Admin console, user approval, administrative scheduling, cardiology queue assignment, search of users |
| Billing, patient care assistant | None | None yet |

Pharmacists and lab technicians are not checked against a care team because the app has no order or prescription relationship to check yet; they are limited by section instead. Add that relationship when orders are persisted (see section 6).

Denied requests return HTTP 403 JSON for `/api/...` and redirect to `/unauthorized` for pages. An administrator who needs a patient record has no path today; a time-limited, reason-required and audited "break-glass" access would have to be built first.

### Testing every role

With the dev server running, `npm --prefix ehr run test:roles` signs in through the real login API as each account and checks that wrong passwords, unknown users and the pending account are refused, that anonymous visitors are sent to `/login`, and that each role opens its own areas and is turned away from the others, including record-level cases (`patient-001` versus `patient-002`). The expected access per URL is the `ACCESS` table in `ehr/tests/integration/roleAccess.test.ts`; extend it when you add a protected URL. The test skips itself when no server is reachable at `EHR_BASE_URL` (default `http://localhost:3000`). The policy itself has unit tests in `ehr/src/__tests__/patientAccessPolicy.test.ts`.

## 5. Known deviations

Existing URLs that do not follow section 2. They are not renamed here because links, bookmarks and tests depend on them. The four `[id]` patterns are the only ones the test allows; the rest cannot be detected by name alone.

| # | Deviation | Target |
|---|---|---|
| 1 | `[id]` in 37 URLs: all of `/dashboard/records/[id]/...`, `/admin/users/[id]`, `/api/tasks/[id]`, `/api/labs/[id]/[labId]/pdf[/html]`. Renaming the folder does **not** change the URL (`[id]` and `[patientId]` both produce `/dashboard/records/123`); only the 37 files that read `params.id` change. | `[patientId]`, `[userId]`, `[taskId]`; move lab PDFs under `/api/patients/{patientId}/labs/{labId}/pdf` (this one does change a URL) |
| 2 | Two lab detail pages: `/dashboard/records/[id]/labs/[labId]` and `/dashboard/records/[id]/lab-results/[labId]` | keep one |
| 3 | Two doctor page trees: `/doctor/...` and `/dashboard/doctor/...`; `/doctor/patients/[visitId]` is keyed by visit, not patient | one tree; name params for what they identify |
| 4 | Doctor APIs in three namespaces: `/api/doctor/*`, `/api/doctor-view/*`, `/api/doctor-work-summary` | `/api/doctor/...` |
| 5 | Patient data outside `/api/patients/{patientId}`: `/api/health-records`, `/api/allergies`, `/api/care-gaps`, `/api/vitals`, and `/api/notes` (duplicates `/api/patients/{patientId}/notes`) | patient-scoped paths |
| 6 | Verb-led paths: `/api/scheduling/{book,cancel,reschedule,find,draft,status}`, `/api/assign`, `/api/queue/complete`, `/api/alerts/acknowledge`, `/api/appointments/checkin`, `/api/doctor-view/work/complete` | resource plus HTTP method, or a named sub-resource (rule 6) |
| 7 | Concatenated word `/api/cardiology/queueitems` | `queue-items` |
| 8 | Only `/api/communication/v1` is versioned; `/api/communication` and `/api/communication/[communicationId]/pin` are outside `v1` | move under `v1` |
| 9 | Sign-up has two pages: `/register` and `/signup` | one page |
| 10 | Service base URLs are hard-coded with different defaults and env names: `lib/fhir-client.ts` and `cardiology/services/api.client.ts` default to port 8080, while other modules default to 8081 (FHIR service port); env names include `FHIR_SERVER_URL`, `FHIR_BASE_URL`, `NEXT_PUBLIC_FHIR_API_URL`, `CARDIOLOGY_API_URL`, `NEXT_PUBLIC_CARDIOLOGY_API_URL`. The EHR source has no configured base URL for LIMS or PharmacyMS | one server-side endpoint module reading one env name per service |

## 6. Findings that need follow-up

These are observations from reading the code, not changes made here.

1. **Patient-scoped data (fixed).** Every `/api/patients/{patientId}/...` request and the chart pages (`/patients/{id}/...`, `/dashboard/records/{id}/...`, `/doctor/health-records/patient/{id}`) are now authorized centrally in `proxy.ts` by role, section and care team (section 4, Access policy). Before this, the per-role test showed allergies, medications and other sections returning 200 to every signed-in role for any patient id. `/api/search` now returns users only to administrators and patients/visits only to clinical staff; `/cardiology` and `/api/cardiology/*` are limited to clinical staff and administrators.

   Still open: routes that are not under `/api/patients/{id}` and return patient data are not covered by that gate. A text scan found 46 route files with no recognizable auth helper; for example `/api/labs/[id]/[labId]/pdf` (patient name, MRN and DOB) has no authorization of its own beyond a signed-in session. Review the other routes in that scan and move any that return patient data under `/api/patients/{patientId}/...` (rule 5 in section 2) so the central gate covers them.
2. **Role gates (fixed).** Lab technicians can open the laboratory workspace and its API (`LABORATORY_WORKSPACE_ROLES`); pharmacists the medications workspace (`MEDICATION_WORKSPACE_ROLES`, which previously had no role check at all); receptionists and administrators the scheduling pages and APIs (`SCHEDULING_WORKSPACE_ROLES`). `ADMIN` was removed from the clinical role sets and from the hard-coded clinical role lists, so administrators no longer read patient health data. All sets are in `ehr/src/lib/doctorWorkspaceAuth.ts`.
3. **Service roles.** Per [platform-admin-operations-matrix.md](../operations/platform-admin-operations-matrix.md), LIMS and PharmacyMS do not yet enforce the roles they declare, and the FHIR service has no resource-level authorization policy. GET routes in both services declare no role.
4. **Sign-in redirect (fixed).** `/login` and `/register` used to redirect everyone to `/doctor?noauth=1`, which made sign-in unusable. They now render, and sign-in routes each role to its own home page (section 4). The same change fixed the check that treated every path starting with `/patient` as the patient portal, which also caught the staff `/patients/...` chart pages.
5. **`/debug`, `/api/debug/auth-check` and `/cardiology-test`** are development routes; `/debug` is listed as a public route in `proxy.ts`.

### Authorization with an external SaaS identity provider

Planned direction: the SaaS tool handles sign-in, passwords and MFA, and issues a token carrying the user's role. This repository still has to decide and enforce what each role may call. Work needed:

1. **Replace the credentials provider** in `ehr/src/lib/auth.ts` with the provider's OIDC connection, map its role claim to the roles in `roleHome.ts`, and remove `devAuthStore.ts` and `devAccounts.ts`. Create one test user per role in the provider's non-production tenant and point `ehr/tests/integration/roleAccess.test.ts` at them.
2. **Route policy** (the policy in section 4 stays in this repository; the SaaS tool only supplies identity and role). Replace the care-team lookup in `patientCareTeam.ts` with the tool's relationship data if it provides one.
3. **Pharmacy and lab record-level checks**: once orders and prescriptions are persisted, limit pharmacists and lab technicians to patients who have an active prescription or lab order, instead of any patient.
4. **Move remaining patient-data routes** found in finding 1 under `/api/patients/{patientId}/...`.
5. **Service-to-service calls**: LIMS, PharmacyMS and the FHIR service must validate the same provider's tokens and enforce the roles they already declare.
6. **Audit** every denied and PHI-access decision, and build time-limited, reason-required, audited break-glass access for the rare case an administrator needs a record.

## 7. Adding or changing a URL

1. Follow section 2.
2. Add an authorization check to the page or handler.
3. Run `npm --prefix ehr run docs:routes` to refresh [url-catalog.md](./url-catalog.md), then commit it with your change.
4. Run `npm --prefix ehr exec vitest -- run src/__tests__/routeConvention.test.ts`. It fails on a naming violation, on a stale legacy exception, or on an out-of-date catalog.
5. If you fix a legacy URL, delete its entry from `LEGACY_EXCEPTIONS` in `ehr/src/__tests__/support/routeInventory.ts` and update section 5.
