# Data Source Map

This map describes the source of truth for the clinical workspace. It contains no PHI.

## Operating Modes

| Mode | Patient source | Clinical read/write source | Scheduling source | FHIR behavior |
| --- | --- | --- | --- | --- |
| Preview/development | `getMockPatients()` through `patientDirectory` | JSON stores resolved by `resolveDataPath` | `previewSchedulingStore` and `scheduling_preview.json` | FHIR-shaped projections are emitted locally; the separate FHIR tenant is not mutated by preview scheduling |
| Authenticated production | Configured FHIR or configured clinical services per module | Module-specific persistence and service adapters | FHIR R4 Appointment, Slot, Patient, Practitioner, Location, Schedule | Requests carry configured service credentials and tenant context |

## Domain Map

| Domain | Canonical UI | Read source | Write source | FHIR resource or relationship | Identity rule |
| --- | --- | --- | --- | --- | --- |
| Patient directory | `/dashboard/patients`, `/dashboard/records`, picker controls | `patientDirectory`; local `mockPatients` in preview, FHIR scheduling Patient directory in production | Directory writes are outside this workspace's canonical preview flow | Patient | All downstream local clinical records use the canonical local patient ID in preview |
| Dashboard | `/dashboard` | `dashboardSummary` | Actions delegate to domain APIs | Patient, Appointment, Task, Communication, ServiceRequest, Observation/DiagnosticReport, DocumentReference | Aggregation filters records to patients visible to the actor |
| Documents | `/dashboard/documents`, `/dashboard/records/{id}/documents` | `documentStore` plus legacy patient document overlay | `documents.json` and `document-files` | DocumentReference; `subject` points to Patient; guarded attachment URL | `PatientDocument.patientId` is required for patient routes |
| Orders | `/dashboard/orders`, lab and doctor order routes | `orderStore` and validated order records | `clinical-orders.json` plus audit | ServiceRequest; `subject` points to Patient; result linkage is separate | Orders with a non-null patient ID must resolve in the active directory |
| Results and labs | patient lab/result routes and `/dashboard/records/labs` | Patient read model plus lab ingestion/integration adapters | Module-specific result persistence and event APIs | Observation and DiagnosticReport; order linkage is explicit when available | Result patient and order patient must match before linking |
| Tasks | `/dashboard/tasks`, patient task routes, doctor work | `tasksStore`, `doctorWorkStore` | Tasks JSON store and audit | Task; `for` points to Patient; `focus` may point to DocumentReference, Condition, or result | Patient-scoped task APIs validate the route patient before mutation |
| Communications | `/communication`, `/dashboard/messages`, patient messages | `clinicalCommunicationStore`, communication BFF | Communication JSON/BFF persistence | Communication; subject/patient context is application-controlled | Conversation patient ID must be retained through compose and deep links |
| Appointments | `/dashboard/appointments`, `/scheduling`, booking | `schedulingData` | FHIR scheduling mutation in production; preview scheduling store in development | Appointment participants include Patient, Practitioner, and Location; slot references are explicit | Preview and local clinical data use the same canonical local Patient ID |
| Encounters | `/dashboard/encounters`, doctor encounter routes | Encounter store and specialty adapter | Encounter APIs and SOAP DocumentReference route | Encounter.subject points to Patient; SOAP may project to DocumentReference | Encounter patient ID is checked against route context |
| Notes | patient notes and doctor notes | `doctorNotesStore` and note routes | Notes JSON and audit | DocumentReference-style projection with Patient subject; note lifecycle controls immutability | Signed notes are amended rather than overwritten |
| Allergies | patient allergies and header/banner | `allergyStore`, review/safety stores | Allergy JSON, review JSON, safety JSON | AllergyIntolerance.patient/subject points to Patient | Empty is authoritative only after source state is known; loading/unavailable are distinct |
| Conditions | patient condition routes | `healthConcernsStore` and patient read model | Condition/concern stores | Condition.subject points to Patient | Detail routes use recorded patient data, not fabricated fallback data |
| Medications | patient medication routes | medication and reconciliation stores plus patient read model | Medication and reconciliation JSON stores | MedicationRequest/MedicationStatement mapping is module-dependent | Actions are patient-scoped and audited |
| Care gaps | patient care-gap routes and Dashboard | care-gap store/read model | care-gap JSON and task workflows | CarePlan/Task relationship is project-specific | Gaps must not be inferred from a diagnosis alone |
| Timeline | patient timeline and activity routes | timeline/chart activity stores, patient resources | timeline/activity JSON stores | Event projections identify Patient and source resource | Server render time is stable to avoid hydration mismatch |
| Weight trend | patient weight-trend routes | weight measurement/goal stores | weight JSON stores and measurement APIs | Observation export is planned; local records remain source of truth | No measurements are synthesized when history is empty |
| AI summary | patient AI summary routes | `aiSummaryStore` plus selected patient evidence | summary/version/audit stores | Bundle includes Patient, Composition, DocumentReference, Provenance, and evidence resources | Evidence links retain source resource IDs and patient context |

## Scheduling Identity Boundary

The running FHIR service is seeded with its own cardiology fixture patients and appointments. Those IDs do not match the three local development patient IDs used by the EHR clinical read models. The application therefore uses:

- `previewSchedulingStore` for non-production preview scheduling, with local Patient IDs and persisted local appointments.
- `schedulingData` FHIR reads and `schedulingMutation` FHIR writes for authenticated production traffic.
- Explicit source labels in snapshots so the UI and audit records do not imply that unrelated FHIR fixtures are joined to local charts.

## Persistence Notes

`resolveDataPath` resolves the active EHR data directory. In the current workspace, runtime JSON files may exist under `ehr/data` or the nested legacy tree depending on the command and earlier fixture setup. New canonical modules should use `resolveDataPath` and must not construct a second hard-coded data root.

## Known Non-Canonical Sources

The following are retained prototype surfaces and are not sources for the canonical Dashboard, Orders, Documents, or preview Scheduling workflows:

- `cardiology/services/api.mock` and dependent cardiology pages/API routes.
- Older scheduling clients under `app/scheduling` that are not the `AppointmentsWorkspace` path.
- Legacy note and admin fallback services that explicitly use mock data.

These sources are listed as residual work in `PROJECT_INTEGRITY_AUDIT.md`; they should be migrated or retired before a production completeness claim.