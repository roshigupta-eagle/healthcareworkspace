# Roshi Clinical Work Orchestration Center

## Scope
Tasks & Inbox is a clinician work orchestration surface over the canonical Roshi task read model. It presents one authorized work set through List, Kanban, Timeline, and Calendar views.

## Existing architecture
- Route: `ehr/src/app/dashboard/tasks/page.tsx`
- Client: `ehr/src/components/doctor-workspace/DoctorTasksCommandCenter.tsx`
- Read model and authorization: `ehr/src/lib/doctorWorkStore.ts`
- Persistence and history: `ehr/src/lib/tasksStore.ts`
- API: `/api/doctor/work` and `/api/doctor/work/[taskId]`
- Source safety: `validateTaskSources`, `canAccessTaskPatient`, `canActorUpdateTask`, `canCompleteTask`

## Principles
- One canonical task ID across work views and patient context.
- Task status, source interpretation/review/acknowledgement, and clinical resolution remain separate.
- Source-linked work cannot be completed until its governed source workflow allows completion.
- Patient and source links use opaque IDs and backend authorization.
- Integration status is displayed only when an authoritative health source exists; otherwise the UI says not reported.

## Current repository boundary
The local implementation is file-backed and maps clinical tasks to FHIR Task shapes. External live FHIR, LIMS, PMS, DICOM, and realtime health-check services are not present in this workspace, so the UI does not claim those systems are connected.
