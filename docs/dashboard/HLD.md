# Clinical Command Center Dashboard — High-Level Design

## Purpose
The Roshi Dashboard (`/dashboard`) is the first screen a clinician sees. It must give an
instant, trustworthy picture of operational work ("My Day") and, for a selected patient, a
rich, FHIR-grounded clinical picture organized around body systems ("Patient Focus"). This
redesign upgrades the dashboard to a high-tech "Clinical Command Center" while reusing every
existing Roshi data source — no new systems of record are introduced.

## Users / Personas
- **Primary:** Physicians and nurse practitioners starting or continuing a clinical session.
- **Secondary:** Nurses, lab users, pharmacists, operations/admin staff — each see a
  role-appropriate subset (existing `roleInfo()` capability model in `dashboardSummary.ts`).

## Two modes
- **My Day** — operational priorities: today's schedule, tasks, results needing review,
  communications, orders, system status. This is the existing, already-working
  `DashboardHomeClient` read model (`getDashboardSummary()`), restyled to the new visual
  language. No business logic changes.
- **Patient Focus** — a selected patient's clinical picture organized by body system via the
  **Clinical Anatomy Explorer**. Entered by picking a patient from the canonical patient
  picker (`/api/scheduling/patients`), or automatically when the clinician already has a
  patient selected elsewhere in the app (deep link `?mode=patient&patientId=…`). The
  dashboard never auto-selects an arbitrary patient.

## System boundaries
- Aggregates existing read models: `dashboardSummary.ts`, `conditionsStore`,
  `medicationsStore`, `tasksStore`, `careGapStore`, `careTeamStore`, `timelineStore`,
  `referralStore`, and the canonical `Patient` record (`patientRecordStore` /
  `mockPatients.getPatientById`) for labs, vitals, and allergies.
- Does **not** create a second clinical database. The new `OrganDashboardSnapshot` (see LLD)
  is a derived, read-only projection computed on request; nothing is written back except
  audit events.
- Does **not** introduce DICOM/PACS/OHIF integration. The codebase has no `ImagingStudy`,
  `BodyStructure`, or DICOM viewer today (verified by inspection). The Organ Explorer
  therefore ships in **Generic Anatomical Model** mode only, clearly labelled as such, with
  an `Open Imaging` affordance wired to the existing Orders record whenever an imaging order
  exists for that patient — no fabricated imaging viewer is built.

## Route architecture
- Canonical route: `/dashboard` (unchanged).
- Deep-linking via query params (opaque IDs only, never names): `?mode=my-day|patient-focus`,
  `&patientId={id}`, `&organ={organCode}`. Existing `asUser=`/`noauth=` preview params are
  preserved for dev/preview auth exactly as today.
- Back/forward/refresh preserve mode, patient and organ selection because they are the
  source of truth in the URL, mirrored into component state.

## Authentication & Authorization
- Server component `page.tsx` keeps its existing `auth()` + `DASHBOARD_ROLES` gate.
- The new `/api/patients/[patientId]/organ-snapshot` route reuses
  `resolveDoctorWorkspaceActor()` + `canAccessTaskPatient()` — the same authorization
  primitives already enforced on every other per-patient API route. No parallel auth path is
  created.

## Data sources & FHIR
FHIR R4 resource intent (see `DATA_SOURCE_MAP.md` for the concrete mapping to current stores):
`Patient`, `Condition`, `MedicationRequest`, `Observation` (vitals/labs), `DiagnosticReport`,
`ServiceRequest` (referrals/orders), `Task`, `CarePlan`/`Goal` (care pathway, best-effort from
`ServiceRequest`/`Appointment`/`Task` since no dedicated CarePlan store exists),
`Communication`, `AuditEvent`/`Provenance`.

Body-site association uses a **centralized, registry-driven mapping** (see
`ORGAN_VIEW_REGISTRY.md`), not ad-hoc text matching scattered through components:
1. Lab results are matched primarily by LOINC `code`; keyword fallback is a documented,
   registry-owned list, only used for the demo dataset where codes are absent.
2. Medications are associated to an organ **transitively** through `conditionId` when a
   medication is linked to an organ-matched condition — a real relational link, not a guess.
3. Anything that cannot be matched with reasonable confidence is bucketed into
   **"Other / Unassigned Clinical Context"** rather than guessed, per policy.

## Organ Explorer architecture
- A **unified anatomical digital twin** is rendered with `three.js` / `@react-three/fiber` +
  `@react-three/drei` (`OrbitControls`): one persistent body (procedural Lathe-revolved
  head/torso profile + limbs, male/female/neutral proportions) with every organ positioned at
  its registry-declared anatomical `focusPosition`. Selecting an organ highlights that mesh and
  dims the rest of the body (a "ghosted" internal view); Whole Body/Skin keep the exterior
  opaque and modestly clothed with no organs shown. This avoids depending on unlicensed
  third-party organ model downloads while giving genuine mouse/touch 3D interaction (orbit,
  zoom, pan, reset, front/back/left/right) and a real "navigate the patient's body" experience
  rather than isolated floating meshes.
- **Body presentation** (`resolveBodyPresentation()`) derives shoulder/hip proportions and,
  for the Reproductive/Urologic system only, which schematic internal organs render, from the
  patient's documented administrative sex — with an explicit, clinician-facing visual-preference
  override that never mutates Patient data. The exterior body is always modestly clothed
  (opaque garment bands); internal reproductive anatomy is schematic, non-explicit, and only
  ever rendered in the internal ghosted view, never on the clothed exterior.
- A 2D SVG fallback (`Viewer2DFallback`) renders when WebGL is unavailable or the user
  prefers reduced motion, so the center panel is never blank.
- An explicit state machine (`organViewMachine.ts`) drives the viewer: `NO_PATIENT` →
  `PATIENT_LOADING` → `PATIENT_READY` → `ORGAN_LOADING` → `GENERIC_ANATOMY_READY` (imaging /
  segmentation states are modelled but unreachable today since no imaging pipeline exists —
  they are ready for future DICOM integration without a rewrite).
- Besides the arrows and carousel dots, a searchable **Anatomy View** dropdown and an
  `"N of 16"` position indicator give direct access to any organ without cycling.

## Event-driven updates
Reuses the dashboard's existing polling pattern (`fetch(..., {cache:'no-store'})` on an
interval, as already used by `Sidebar`/`GlobalHeader` for work counts) rather than building a
second realtime transport. A lightweight "Updates available" affordance avoids yanking the
panel a clinician is actively reading.

## Role-aware layouts
My Day already filters by role via `capabilities` in `DashboardSummary`. Patient Focus panels
each declare the roles they are relevant to (e.g., PMS/pharmacy widgets hidden from lab
roles) using the same role set already enforced server-side.

## Security
- All patient data continues to flow through server-authorized API routes; the client never
  receives another patient's data. Switching patients cancels in-flight requests
  (`AbortController`) and clears component state before the new patient's data is requested.
- No PHI is placed in query strings beyond opaque `patientId` and `organ` codes.

## Performance
- The 3D engine (`OrganCanvas`) is dynamically imported (`next/dynamic`, `ssr:false`) so it
  never blocks the critical dashboard shell (identity, alerts, schedule) from rendering.
- Organ snapshot requests are cancelled/replaced on rapid arrow clicks; only the latest
  request's response is committed to state.

## Accessibility & theming
- Full keyboard control of the organ viewer (arrow keys, Tab/Enter), a data-table alternative
  for every chart, and a screen-reader text summary of the current organ snapshot.
- Dark/light mode reuse the existing `.dark` class + design-system CSS variable contract
  (`ehr/src/design-system/tokens`) — new semantic tokens (`--organ-highlight`,
  `--imaging-overlay`, command-center surfaces) are added following the same pattern, not a
  parallel theme system.

## Deployment
No CI/CD pipeline exists in this repository (verified). "Deploy" for this feature means:
production build (`npm run build`) passes, then the existing local service manager
(`scripts/manage-services.ps1 -Action restart -Component ehr`) is used to bring the change
live for the already-configured local HTTPS proxy / dev server — consistent with how every
other feature in this repo has shipped. No new hosting/infra is introduced.

## Deliverables
- This HLD/LLD, `ORGAN_VIEW_REGISTRY.md`, `DATA_SOURCE_MAP.md`.
- Organ registry + organ snapshot read model + API route.
- Command Center shell (top bar, header, mode switch), Patient Focus (picker, overview,
  organ explorer, status overlays, trend charts, care pathway, AI insights), My Day restyle.
- Unit tests (registry, mapping, BP formatting, state machine) + component checks + a
  Playwright E2E flow.
