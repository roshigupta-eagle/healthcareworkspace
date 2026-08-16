# Clinical Timeline — High-Level Design

## Purpose
The Clinical Timeline provides a unified, chronological, clinician-facing view of a patient’s clinically relevant events across systems (encounters, notes, results, medications, orders, procedures, tasks, documents, immunizations, messages, care plans, and administrative events). It helps clinicians answer “what happened, when, and what next?” quickly and safely.

## Users
- Primary: Physicians, Nurse Practitioners, Physician Assistants, Nurses
- Secondary: Pharmacists, Allied Health, Care Coordinators

## Use cases
- Rapid review before or during an encounter
- Identify abnormal or critical results needing action
- Find linked notes, orders, and encounters
- Create follow-up tasks or orders from events
- Export a time-bound clinical summary

## System boundaries
- Aggregates FHIR R4 resources from internal Roshi services and external sources via FHIR adapters
- Does NOT modify source clinical resources except via authorized workflows (e.g., acknowledge, create follow-up tasks)
- Annotations are stored separately and do not overwrite source resources

## Route architecture
- Canonical route: `/dashboard/records/:patientId/timeline`
- Deep-linking: query params for `event`, `range`, `types`, `view`.
- Server-rendered page shell + client timeline workspace component.

## Authentication & Authorization
- Server-side check: `auth()` and `authorizationService.ensureAccessToPatient(patientId)` on page and API routes
- Permission flags drive visible actions and audit capabilities

## Data sources & FHIR
- Use FHIR R4 resources: `Encounter`, `Observation`, `DiagnosticReport`, `Composition`, `DocumentReference`, `MedicationRequest`, `MedicationStatement`, `ServiceRequest`, `Procedure`, `CarePlan`, `AllergyIntolerance`, `Immunization`, `Task`, `Provenance`, `AuditEvent`.
- TimelineService aggregates adapters and normalizes into `ClinicalTimelineEvent`.

## Timeline aggregation
- Query by patientId, date range, event types, and paging cursor
- Normalize using clear event time precedence per resource type (observation.effectiveDateTime, diagnosticreport.issued, encounter.period.start)
- Distinguish recorded/received date vs clinical occurrence date

## Search & Filtering
- Debounced server-backed search with authorization-aware scopes
- Event-type faceting with counts (cached per-patient range)
- Saved views persisted per user

## Event grouping & episodes
- Chronological and Episode Mode (grouped by Encounter or Care Episode)
- Episode model mirrors Encounter + related resources

## Details panel
- Lazy-load event-specific details and related FHIR resources
- Tabs: Summary, Visit Details, Notes, Orders, Vitals (appearance depends on event type)

## Export & Audit
- ExportService generates PDF / CSV / FHIR Bundle with configurable options
- Exports and sensitive views produce append-only audit entries

## Performance
- Cursor-based pagination and virtualization
- Date-window queries and incremental loading
- Prefetch adjacent detail on selection

## Accessibility
- WCAG 2.1 AA: keyboard navigation, visible focus, aria roles, live regions for counts and new-events

## Real-time updates
- SSE or WebSocket feed for new events with a calm, dismissible new-events banner

## Failure handling
- Independent skeletons for each panel
- Permission / patient-not-found / event-not-found states

## Deliverables
- HLD & LLD docs
- `ClinicalTimeline` page and components
- Normalized timeline types and FHIR adapters
- API routes for events, event details, FHIR JSON, audit
- Tests: unit + component + Playwright E2E test scaffold

