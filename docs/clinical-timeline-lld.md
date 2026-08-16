# Clinical Timeline — Low-Level Design

## Component Tree
- `ClinicalTimelinePage` (server) — loads patient + permissions
- `ClinicalTimelineShell` (client) — orchestrates panels
- `TimelineFilterPanel` — left filters, saved views
- `TimelineEventList` — virtualized chronological list
- `TimelineDateGroup` — sticky date headers
- `TimelineEventCard` — event summary
- `TimelineDetailsPanel` — right-side details + tabs
- `TimelineSearch` — debounced search input
- `JumpToDateDialog`, `TimelineExportDialog`, `AnnotationDialog`

## Route behavior
- `GET /dashboard/records/:patientId/timeline` — page shell, server-side patient lookup
- `GET /api/patients/:patientId/timeline?range=&types=&q=&cursor=` — timeline query
- `GET /api/patients/:patientId/timeline/:eventId` — event details
- `GET /api/patients/:patientId/timeline/:eventId/fhir` — mapped FHIR resource
- `POST /api/patients/:patientId/timeline/annotations` — create annotation (permissioned)
- All API routes call `auth()` and server authorization checks

## Data Contracts / Types (TypeScript)
- `ClinicalTimelineEvent` {
  id: string;
  patientId: string;
  resourceType: string; // FHIR resource type
  resourceId: string; // original FHIR id
  eventType: 'encounter'|'note'|'result'|'medication'|'order'|'procedure'|'document'|'immunization'|'allergy'|'task'|'vital'|'message';
  title: string;
  summary?: string;
  status?: string;
  occurredAt?: string; // clinical date/time
  recordedAt?: string; // meta.lastUpdated or receipt time
  provider?: { id?: string; name?: string; role?: string } | null;
  organization?: { id?: string; name?: string } | null;
  encounterId?: string | null;
  source?: { system: string; id?: string; display?: string };
  severity?: 'normal'|'abnormal'|'critical'|'unknown';
  reviewState?: 'unreviewed'|'reviewed'|'acknowledged';
  relatedResources?: Array<{ type: string; id: string; display?: string }>;
  provenanceAvailable?: boolean;
}

## Hooks & Services
- `usePatient(patientId)` — reuse existing
- `useTimelineEvents(patientId, filters)` — client hook wrapping the API
- `timelineService` — server helper for normalized queries and FHIR adapters

## FHIR mapping
- Adapter functions per resource type to map resource -> `ClinicalTimelineEvent`
- `mapObservationToTimelineEvent`, `mapEncounterToTimelineEvent`, etc.

## Permission Rules
- `canViewPatient(patientId)` — server side
- `canViewSensitiveNotes`, `canExport`, `canAnnotate`, `canAcknowledge` — enforced server-side and used to toggle UI

## Event actions
- Review/Acknowledge result — writes audit + reviewState change in audit store
- Create annotation — separate annotation store
- Open Full Encounter — route to existing encounter page

## Pagination & Performance
- Cursor-based pagination (cursor = encoded last event timestamp + id)
- Virtualize event list (`react-virtual` or similar)
- Event counts cached and invalidated on background refresh

## Accessibility
- Event list as `role=list` with `role=listitem`
- Keyboard navigation (Arrow Up/Down, Enter, Escape)
- LiveRegion for counts and new-event banners

## Tests
- Unit: normalization, date grouping, permission logic
- Component: filter panel, event card, details panel
- E2E (Playwright): open timeline, select event, export, permissions

## File additions (planned)
- `ehr/src/types/clinicalTimeline.ts`
- `ehr/src/lib/timelineStore.ts` (file-backed dev store)
- `ehr/src/app/api/patients/[patientId]/timeline/route.ts`
- `ehr/src/app/api/patients/[patientId]/timeline/[eventId]/route.ts`
- `ehr/src/app/dashboard/records/[id]/timeline/page.tsx`
- `ehr/src/components/clinical-timeline/*` (components listed above)
- `docs/clinical-timeline-hld.md`, `docs/clinical-timeline-lld.md`

