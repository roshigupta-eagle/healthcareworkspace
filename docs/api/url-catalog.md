# EHR URL catalog

Generated from `ehr/src/app` by `npm --prefix ehr run docs:routes`; do not edit by hand.
The unit test `routeConvention.test.ts` fails when this file is out of date.
Naming rules, backend service endpoints and sign-in accounts: [url-conventions.md](./url-conventions.md).

Total: 117 pages and 149 API routes. All URLs are absolute for the local server `http://localhost:3000`; `[name]` marks a path parameter to replace with a real identifier.

## Patient (7)

Patient portal. Role `PATIENT`; signs in to `http://localhost:3000/patient/dashboard`.

| Type | URL | Methods | Convention |
|---|---|---|---|
| Page | `http://localhost:3000/patient/appointments` | - | OK |
| Page | `http://localhost:3000/patient/communication` | - | OK |
| Page | `http://localhost:3000/patient/dashboard` | - | OK |
| Page | `http://localhost:3000/patient/documents` | - | OK |
| Page | `http://localhost:3000/patient/records` | - | OK |
| Page | `http://localhost:3000/patient/results` | - | OK |
| Page | `http://localhost:3000/patient/visits` | - | OK |

## Doctor (23)

Doctor workspace. Role `DOCTOR`; signs in to `http://localhost:3000/doctor`.

| Type | URL | Methods | Convention |
|---|---|---|---|
| API | `http://localhost:3000/api/doctor-view` | GET | OK |
| API | `http://localhost:3000/api/doctor-view/work/complete` | POST | OK |
| API | `http://localhost:3000/api/doctor-work-summary` | GET | OK |
| API | `http://localhost:3000/api/doctor/documents` | GET, POST | OK |
| API | `http://localhost:3000/api/doctor/messages` | GET, POST | OK |
| API | `http://localhost:3000/api/doctor/messages/[conversationId]` | GET, POST, PATCH | OK |
| API | `http://localhost:3000/api/doctor/work` | GET, POST | OK |
| API | `http://localhost:3000/api/doctor/work/[taskId]` | PATCH | OK |
| Page | `http://localhost:3000/dashboard/doctor/encounters` | - | OK |
| Page | `http://localhost:3000/dashboard/doctor/orders` | - | OK |
| Page | `http://localhost:3000/dashboard/doctor/patients` | - | OK |
| Page | `http://localhost:3000/doctor` | - | OK |
| Page | `http://localhost:3000/doctor/analytics` | - | OK |
| Page | `http://localhost:3000/doctor/appointments` | - | OK |
| Page | `http://localhost:3000/doctor/dashboard` | - | OK |
| Page | `http://localhost:3000/doctor/encounters/[encounterId]` | - | OK |
| Page | `http://localhost:3000/doctor/encounters/[encounterId]/soap` | - | OK |
| Page | `http://localhost:3000/doctor/health-records` | - | OK |
| Page | `http://localhost:3000/doctor/health-records/[visitId]` | - | OK |
| Page | `http://localhost:3000/doctor/health-records/patient/[patientId]` | - | OK |
| Page | `http://localhost:3000/doctor/orders/[orderId]` | - | OK |
| Page | `http://localhost:3000/doctor/patients/[visitId]` | - | OK |
| Page | `http://localhost:3000/doctor/urgent/[visitId]` | - | OK |

## Admin (14)

Administration console. Role `ADMIN`; signs in to `http://localhost:3000/admin`.

| Type | URL | Methods | Convention |
|---|---|---|---|
| Page | `http://localhost:3000/admin` | - | OK |
| Page | `http://localhost:3000/admin/analytics` | - | OK |
| Page | `http://localhost:3000/admin/audit` | - | OK |
| Page | `http://localhost:3000/admin/clinical-configuration` | - | OK |
| Page | `http://localhost:3000/admin/integrations` | - | OK |
| Page | `http://localhost:3000/admin/operations` | - | OK |
| Page | `http://localhost:3000/admin/patients` | - | OK |
| Page | `http://localhost:3000/admin/security` | - | OK |
| Page | `http://localhost:3000/admin/settings` | - | OK |
| Page | `http://localhost:3000/admin/telehealth` | - | OK |
| Page | `http://localhost:3000/admin/users` | - | OK |
| Page | `http://localhost:3000/admin/users/[id]` | - | Legacy: param-name |
| API | `http://localhost:3000/api/admin/users` | GET, POST | OK |
| API | `http://localhost:3000/api/admin/users/[userId]/approve` | POST, DELETE | OK |

## Pharmacy (7)

Medication and prescribing screens and their EHR routes. Dispensing runs in the PharmacyMS service (see [url-conventions.md](./url-conventions.md#3-backend-services)). A pharmacist signs in to the shared dashboard; there is no dedicated pharmacy home page yet.

| Type | URL | Methods | Convention |
|---|---|---|---|
| API | `http://localhost:3000/api/patients/[patientId]/medication-reconciliation` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/medications` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/medications/[medicationId]` | GET, PATCH | OK |
| API | `http://localhost:3000/api/patients/[patientId]/medications/[medicationId]/review` | POST | OK |
| Page | `http://localhost:3000/dashboard/medications` | - | OK |
| Page | `http://localhost:3000/dashboard/prescriptions/new` | - | OK |
| Page | `http://localhost:3000/dashboard/records/[id]/medications` | - | Legacy: param-name |

## Laboratory (14)

Lab orders, results and review screens and their EHR routes. Orders and results are stored in the LIMS service (see [url-conventions.md](./url-conventions.md#3-backend-services)). A lab technician signs in to the shared dashboard; there is no dedicated lab home page yet.

| Type | URL | Methods | Convention |
|---|---|---|---|
| API | `http://localhost:3000/api/lab-alerts` | POST | OK |
| API | `http://localhost:3000/api/laboratory/dashboard` | GET | OK |
| API | `http://localhost:3000/api/labs/[id]/[labId]/pdf` | GET | Legacy: param-name |
| API | `http://localhost:3000/api/labs/[id]/[labId]/pdf/html` | GET | Legacy: param-name |
| API | `http://localhost:3000/api/orders/labs` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/lab-comparator` | GET | OK |
| API | `http://localhost:3000/api/patients/[patientId]/labs/[labId]/review` | POST | OK |
| Page | `http://localhost:3000/dashboard/laboratory` | - | OK |
| Page | `http://localhost:3000/dashboard/orders/labs/new` | - | OK |
| Page | `http://localhost:3000/dashboard/records/[id]/lab-results/[labId]` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/labs` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/labs/[labId]` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/upcoming-tests/[testId]` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/labs` | - | OK |

## Clinical workspace (188)

Shared screens and APIs used by clinical staff, including patient-scoped record APIs under `/api/patients/[patientId]`.

| Type | URL | Methods | Convention |
|---|---|---|---|
| API | `http://localhost:3000/api/alerts/acknowledge` | POST | OK |
| API | `http://localhost:3000/api/allergies` | GET, POST | OK |
| API | `http://localhost:3000/api/appointments` | GET | OK |
| API | `http://localhost:3000/api/appointments/checkin` | POST | OK |
| API | `http://localhost:3000/api/assign` | POST | OK |
| API | `http://localhost:3000/api/audit` | GET | OK |
| API | `http://localhost:3000/api/cardiology/dashboard` | GET | OK |
| API | `http://localhost:3000/api/cardiology/queueitems` | GET | OK |
| API | `http://localhost:3000/api/cardiology/stream` | GET | OK |
| API | `http://localhost:3000/api/cardiology/users` | GET | OK |
| API | `http://localhost:3000/api/cardiology/visits` | GET, POST | OK |
| API | `http://localhost:3000/api/cardiology/visits/[visitId]` | GET | OK |
| API | `http://localhost:3000/api/care-gaps` | GET, POST | OK |
| API | `http://localhost:3000/api/communication` | GET | OK |
| API | `http://localhost:3000/api/communication/[communicationId]/pin` | POST | OK |
| API | `http://localhost:3000/api/communication/v1/attachments/presign` | POST | OK |
| API | `http://localhost:3000/api/communication/v1/calls` | GET, POST | OK |
| API | `http://localhost:3000/api/communication/v1/calls/[callId]` | GET, PATCH | OK |
| API | `http://localhost:3000/api/communication/v1/calls/[callId]/end` | POST | OK |
| API | `http://localhost:3000/api/communication/v1/calls/[callId]/join` | POST | OK |
| API | `http://localhost:3000/api/communication/v1/calls/[callId]/meeting-context` | GET | OK |
| API | `http://localhost:3000/api/communication/v1/conversations` | GET, POST | OK |
| API | `http://localhost:3000/api/communication/v1/conversations/[conversationId]` | GET, POST, PATCH | OK |
| API | `http://localhost:3000/api/communication/v1/conversations/[conversationId]/tasks` | POST | OK |
| API | `http://localhost:3000/api/communication/v1/drafts` | GET, POST | OK |
| API | `http://localhost:3000/api/communication/v1/events` | GET | OK |
| API | `http://localhost:3000/api/communication/v1/inbox` | GET | OK |
| API | `http://localhost:3000/api/communication/v1/messages/[messageId]/acknowledgements` | POST | OK |
| API | `http://localhost:3000/api/communication/v1/messages/[messageId]/manual-delivery-confirmations` | POST | OK |
| API | `http://localhost:3000/api/communication/v1/messages/[messageId]/read` | POST | OK |
| API | `http://localhost:3000/api/communication/v1/messages/[messageId]/tasks` | POST | OK |
| API | `http://localhost:3000/api/communication/v1/templates` | GET | OK |
| API | `http://localhost:3000/api/communication/v1/voicemails/[voicemailId]` | PATCH | OK |
| API | `http://localhost:3000/api/dashboard/summary` | GET | OK |
| API | `http://localhost:3000/api/encounters` | GET | OK |
| API | `http://localhost:3000/api/encounters/[encounterId]` | GET | OK |
| API | `http://localhost:3000/api/encounters/[encounterId]/soap` | POST | OK |
| API | `http://localhost:3000/api/encounters/[encounterId]/transition` | POST | OK |
| API | `http://localhost:3000/api/health-records` | GET, POST | OK |
| API | `http://localhost:3000/api/health-records/[patientId]` | GET | OK |
| API | `http://localhost:3000/api/notes` | GET, POST | OK |
| API | `http://localhost:3000/api/notes/[noteId]` | GET, PATCH | OK |
| API | `http://localhost:3000/api/notes/[noteId]/addendum` | POST | OK |
| API | `http://localhost:3000/api/notes/[noteId]/comments` | POST | OK |
| API | `http://localhost:3000/api/notes/[noteId]/revisions/[revisionId]/accept` | POST | OK |
| API | `http://localhost:3000/api/notes/[noteId]/revisions/[revisionId]/reject` | POST | OK |
| API | `http://localhost:3000/api/notes/[noteId]/sign` | POST | OK |
| API | `http://localhost:3000/api/notifications/stream` | GET | OK |
| API | `http://localhost:3000/api/ohip/eligibility` | POST | OK |
| API | `http://localhost:3000/api/orders` | GET, POST | OK |
| API | `http://localhost:3000/api/orders/[orderId]` | GET | OK |
| API | `http://localhost:3000/api/orders/[orderId]/actions` | POST | OK |
| API | `http://localhost:3000/api/orders/[orderId]/events` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]` | GET | OK |
| API | `http://localhost:3000/api/patients/[patientId]/activity` | GET | OK |
| API | `http://localhost:3000/api/patients/[patientId]/ai-summary` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/ai-summary/export` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/ai-summary/fhir` | GET | OK |
| API | `http://localhost:3000/api/patients/[patientId]/ai-summary/patient-friendly` | POST, PATCH | OK |
| API | `http://localhost:3000/api/patients/[patientId]/ai-summary/regenerate` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/ai-summary/review` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/allergies` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/allergies/[allergyId]` | GET, PATCH | OK |
| API | `http://localhost:3000/api/patients/[patientId]/allergy-review` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/allergy-safety-retry` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/care-gaps` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/care-team` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/conditions` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/conditions/[conditionId]` | GET, PATCH | OK |
| API | `http://localhost:3000/api/patients/[patientId]/documents` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/documents/[documentId]` | GET, PATCH | OK |
| API | `http://localhost:3000/api/patients/[patientId]/documents/[documentId]/content` | GET | OK |
| API | `http://localhost:3000/api/patients/[patientId]/health-concerns` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/health-concerns/[concernId]` | GET, PATCH | OK |
| API | `http://localhost:3000/api/patients/[patientId]/health-concerns/[concernId]/entered-in-error` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/health-concerns/[concernId]/follow-up` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/health-concerns/[concernId]/pin` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/health-concerns/[concernId]/reopen` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/health-concerns/[concernId]/resolve` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/health-concerns/follow-up-tasks/[taskId]` | GET, PATCH | OK |
| API | `http://localhost:3000/api/patients/[patientId]/immunizations` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/measurements/weight` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/measurements/weight/[measurementId]` | PATCH | OK |
| API | `http://localhost:3000/api/patients/[patientId]/notes` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/notes/[noteId]` | GET, PATCH | OK |
| API | `http://localhost:3000/api/patients/[patientId]/notes/[noteId]/addendum` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/notes/[noteId]/correction` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/notes/[noteId]/duplicate` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/notes/[noteId]/entered-in-error` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/notes/[noteId]/follow-up` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/notes/[noteId]/history` | GET | OK |
| API | `http://localhost:3000/api/patients/[patientId]/notes/[noteId]/sign` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/notes/ai-draft` | POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/notes/follow-up-tasks/[taskId]` | GET, PATCH | OK |
| API | `http://localhost:3000/api/patients/[patientId]/tasks` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/tasks/[taskId]` | GET, PATCH | OK |
| API | `http://localhost:3000/api/patients/[patientId]/tasks/[taskId]/fhir` | GET | OK |
| API | `http://localhost:3000/api/patients/[patientId]/timeline` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/timeline/[eventId]` | GET, PATCH | OK |
| API | `http://localhost:3000/api/patients/[patientId]/timeline/[eventId]/fhir` | GET | OK |
| API | `http://localhost:3000/api/patients/[patientId]/trends/data` | GET | OK |
| API | `http://localhost:3000/api/patients/[patientId]/trends/metrics` | GET | OK |
| API | `http://localhost:3000/api/patients/[patientId]/visit-history` | GET | OK |
| API | `http://localhost:3000/api/patients/[patientId]/weight-goal` | GET, POST | OK |
| API | `http://localhost:3000/api/patients/[patientId]/weight-trend` | GET | OK |
| API | `http://localhost:3000/api/queue/complete` | POST | OK |
| API | `http://localhost:3000/api/referrals` | GET, POST | OK |
| API | `http://localhost:3000/api/referrals/[referralId]/transition` | POST | OK |
| API | `http://localhost:3000/api/scheduling/appointments` | GET | OK |
| API | `http://localhost:3000/api/scheduling/book` | POST | OK |
| API | `http://localhost:3000/api/scheduling/cancel` | POST | OK |
| API | `http://localhost:3000/api/scheduling/draft` | GET, PUT, DELETE | OK |
| API | `http://localhost:3000/api/scheduling/find` | GET | OK |
| API | `http://localhost:3000/api/scheduling/locations` | GET | OK |
| API | `http://localhost:3000/api/scheduling/patients` | GET | OK |
| API | `http://localhost:3000/api/scheduling/providers` | GET | OK |
| API | `http://localhost:3000/api/scheduling/reschedule` | POST | OK |
| API | `http://localhost:3000/api/scheduling/slots` | GET | OK |
| API | `http://localhost:3000/api/scheduling/status` | POST | OK |
| API | `http://localhost:3000/api/scheduling/workspace` | GET | OK |
| API | `http://localhost:3000/api/search` | GET | OK |
| API | `http://localhost:3000/api/tasks` | GET, POST | OK |
| API | `http://localhost:3000/api/tasks/[id]` | PATCH | Legacy: param-name |
| API | `http://localhost:3000/api/vitals` | GET, POST | OK |
| Page | `http://localhost:3000/cardiology` | - | OK |
| Page | `http://localhost:3000/cardiology-test` | - | OK |
| Page | `http://localhost:3000/clinical-tasks` | - | OK |
| Page | `http://localhost:3000/communication` | - | OK |
| Page | `http://localhost:3000/communication/calls` | - | OK |
| Page | `http://localhost:3000/communication/email` | - | OK |
| Page | `http://localhost:3000/communication/messages` | - | OK |
| Page | `http://localhost:3000/dashboard` | - | OK |
| Page | `http://localhost:3000/dashboard/appointments` | - | OK |
| Page | `http://localhost:3000/dashboard/appointments/[appointmentId]` | - | OK |
| Page | `http://localhost:3000/dashboard/appointments/book` | - | OK |
| Page | `http://localhost:3000/dashboard/documents` | - | OK |
| Page | `http://localhost:3000/dashboard/encounters` | - | OK |
| Page | `http://localhost:3000/dashboard/encounters/[encounterId]` | - | OK |
| Page | `http://localhost:3000/dashboard/encounters/new` | - | OK |
| Page | `http://localhost:3000/dashboard/messages` | - | OK |
| Page | `http://localhost:3000/dashboard/notes` | - | OK |
| Page | `http://localhost:3000/dashboard/orders` | - | OK |
| Page | `http://localhost:3000/dashboard/patients` | - | OK |
| Page | `http://localhost:3000/dashboard/records` | - | OK |
| Page | `http://localhost:3000/dashboard/records/[id]` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/activity` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/ai-clinical-summary` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/ai-clinical-summary/audit` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/ai-clinical-summary/history` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/ai-clinical-summary/provenance` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/allergies` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/appointments/[appointmentId]` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/care-gaps` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/care-team` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/concerns` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/conditions` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/conditions/[conditionId]` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/contact-preferences` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/doctor-notes` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/doctor-notes/new` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/documents` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/history` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/immunizations` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/immunizations/new` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/messages` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/notes` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/referrals` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/tasks` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/tasks/new` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/timeline` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/trends` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/records/[id]/weight-trend` | - | Legacy: param-name |
| Page | `http://localhost:3000/dashboard/referrals` | - | OK |
| Page | `http://localhost:3000/dashboard/referrals/new` | - | OK |
| Page | `http://localhost:3000/dashboard/tasks` | - | OK |
| Page | `http://localhost:3000/patients/[patientId]/current-health-concerns` | - | OK |
| Page | `http://localhost:3000/patients/[patientId]/documents` | - | OK |
| Page | `http://localhost:3000/patients/[patientId]/documents/[docId]/viewer` | - | OK |
| Page | `http://localhost:3000/patients/[patientId]/encounters` | - | OK |
| Page | `http://localhost:3000/patients/[patientId]/immunizations` | - | OK |
| Page | `http://localhost:3000/patients/[patientId]/medical-history` | - | OK |
| Page | `http://localhost:3000/patients/[patientId]/notes/[noteId]` | - | OK |
| Page | `http://localhost:3000/patients/[patientId]/risk-profile` | - | OK |
| Page | `http://localhost:3000/schedule/today` | - | OK |
| Page | `http://localhost:3000/scheduling` | - | OK |
| Page | `http://localhost:3000/telehealth/calls/[callId]/device-check` | - | OK |
| Page | `http://localhost:3000/telehealth/calls/[callId]/meeting` | - | OK |
| Page | `http://localhost:3000/triage` | - | OK |

## Public & platform (13)

Public pages, authentication and development-only routes (`/debug`, `/api/debug`).

| Type | URL | Methods | Convention |
|---|---|---|---|
| Page | `http://localhost:3000/` | - | OK |
| API | `http://localhost:3000/api/auth/[...nextauth]` | GET, POST | OK |
| API | `http://localhost:3000/api/auth/status` | GET | OK |
| API | `http://localhost:3000/api/debug/auth-check` | POST | OK |
| API | `http://localhost:3000/api/register` | POST | OK |
| Page | `http://localhost:3000/book-demo` | - | OK |
| Page | `http://localhost:3000/debug/weight-trend` | - | OK |
| Page | `http://localhost:3000/features` | - | OK |
| Page | `http://localhost:3000/login` | - | OK |
| Page | `http://localhost:3000/pending-approval` | - | OK |
| Page | `http://localhost:3000/register` | - | OK |
| Page | `http://localhost:3000/signup` | - | OK |
| Page | `http://localhost:3000/unauthorized` | - | OK |
