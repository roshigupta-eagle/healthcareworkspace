# Clinical Command Center Dashboard — Low-Level Design

## Routes
- UI page (server component, unchanged data-fetch contract): `ehr/src/app/dashboard/page.tsx`
  → now renders `ClinicalCommandCenter` instead of `DashboardHomeClient` directly (the latter
  is reused internally for My Day).
- API: `GET /api/patients/[patientId]/organ-snapshot?organ={organCode}` — returns an
  `OrganDashboardSnapshot`.
- API (existing, reused as-is): `GET /api/scheduling/patients?query=` (patient picker),
  `GET /api/patients/[patientId]` (identity), `GET /api/dashboard/summary` (My Day refresh).

## Component tree
- `ClinicalCommandCenter` (client, `ehr/src/components/command-center/ClinicalCommandCenter.tsx`)
  — owns `mode`, `patientId`, `organCode` state, synced to the URL via
  `useSearchParams`/`router.replace`.
  - `CommandTopBar` — sidebar toggle passthrough, global search reuse (`SearchBar`), org/
    location, notifications, help, clinician identity.
  - `CommandCenterHeader` — greeting (`summary.greeting`/`actor.name`), date/clinic/specialty,
    data freshness (`summary.generatedAt`), `+ New` menu, Customize (theme), Refresh.
  - `ModeSwitch` — `My Day | Patient Focus` segmented control; disables Patient Focus label
    with "Select a patient" affordance until one is chosen.
  - My Day → `DashboardHomeClient` (existing, unmodified logic; CSS tokens updated only).
  - Patient Focus → `PatientFocusView`
    - `PatientPickerModal` — search via `/api/scheduling/patients`.
    - `PatientOverviewPanel` — identity/MRN/age/blood type/allergies/PCP/risk/actions.
    - `PatientScheduleCard`, `ClinicalPulseRow` (patient-scoped, explicitly labelled), `CareTeamPanel`
    - `OrganExplorer`
      - `OrganCanvas` (dynamic import, `three` + `@react-three/fiber` + `@react-three/drei`) —
        orbits the camera around each organ's `focusPosition`/`focusRadius`, re-synced on every
        organ change via a child `OrganCameraSync` effect (the Canvas itself never remounts).
      - `OrganMesh.tsx` (exports `HumanBodyModel`) — the unified body scene: one persistent
        `BodyShell` (Lathe torso/limbs, presentation-aware) + per-organ meshes (`Blob`,
        `PairedBlob`, `PairedBean`, `Coil`, `SpineColumn`, `ReproductiveOrgans`), each toggled
        bright/dim by whether its organ code is currently selected.
      - Anatomy View dropdown selector + `"N of 16"` position indicator (same `ORGAN_REGISTRY`
        array as the arrows/dots — no duplicated organ list).
      - Body-presentation toggle (Female/Male/Neutral, visual preference only) shown for Whole Body.
      - `Viewer2DFallback` (SVG, used when WebGL/`prefers-reduced-motion` requires it)
      - Floating single-row viewer toolbar (Reset/Front/Back/Left/Right/Top/Zoom/Fullscreen)
      - Status overlay cards (2–4 mini cards, from `snapshot.overlays`)
    - `OrganDataPanel` — labs / conditions / medications / procedures / tasks / imaging tab
    - `charts/TrendChart` (generic) and `charts/BloodPressureCard` (BP-specific formatting)
    - `CarePathway`
    - `AiInsightsCard`
    - `ClinicalPulse`, `TodaysScheduleCard`, `SystemStatusCard` (restyled reuse of My Day data)

## Data Contracts / Types (TypeScript)

`ehr/src/lib/organRegistry.ts`
```ts
export type OrganCode = 'whole-body' | 'heart' | 'lungs' | 'brain' | 'kidneys' | 'liver'
  | 'stomach' | 'small-intestine' | 'large-intestine' | 'pancreas' | 'thyroid' | 'spleen'
  | 'musculoskeletal' | 'skin' | 'eyes-ent' | 'reproductive-urologic';

export type BaseShape = 'silhouette' | 'blob' | 'pairedBlob' | 'beanPair' | 'coil' | 'spine';
export type BodyPresentation = 'female' | 'male' | 'neutral';
export interface OrganGeometrySpec { baseShape: BaseShape; scale; lobes; bumpDepth; color; accentColor; accessories[]; coilTurns?; coilRadius?; }

export interface OrganRegistryEntry {
  organCode: OrganCode; displayName: string; organSystem: string;
  bodyStructureCodes: { system: 'http://snomed.info/sct'; code: string; display: string }[];
  geometry: OrganGeometrySpec;
  keywordMatchers: string[];        // condition/medication/careGap/task keyword fallback
  observationLoincCodes: string[];  // exact-match lab result LOINC codes (LOINC isn't prefix-hierarchical)
  vitalKeys: (keyof PatientVitals)[]; // direct vitals association (weight, bloodPressure, …)
  overlayMetrics: OrganOverlayMetric[]; // 2–4 status overlay definitions
  emptyStateText: string;
  focusPosition: [number, number, number]; // anatomical position within the unified body scene
  focusRadius: number;                     // camera distance from focusPosition when selected
  sensitiveData?: boolean;
}

// resolveBodyPresentation(documentedGender, override?) — override is visual-only, never
// mutates Patient data; used by the whole-body model and OrganMesh's HumanBodyModel.
```


`ehr/src/lib/organSnapshot.ts`
```ts
export interface OrganDashboardSnapshot {
  patientId: string; organCode: OrganCode; organSystem: string; generatedAt: string;
  modelMode: 'generic' | 'patient-imaging' | 'segmentation';
  conditions: MatchedCondition[]; medications: MatchedMedication[];
  labResults: MatchedLabResult[]; vitals: MatchedVital[];
  tasks: MatchedTask[]; careGaps: MatchedCareGap[]; timelineEvents: MatchedTimelineEvent[];
  referrals: MatchedReferral[]; careTeam: MatchedCareTeamMember[];
  dataQuality: { state: 'ok' | 'partial'; notes: string[] };
  sourceReferences: { label: string; href: string }[];
  unassignedCount: number; // records that exist for the patient but didn't match this organ
}
```
Each `Matched*` type is the underlying store record plus `{ matchReason: 'code' | 'relational'
| 'keyword' | 'direct' }` so the UI can show *why* a record is attached to the organ (never
silently guessed).

## Hooks & Services
- `useOrganSnapshot(patientId, organCode)` — fetch + `AbortController` cancellation on rapid
  organ/patient switches; returns `{ state: 'loading'|'ready'|'error', data }`.
- `useOrganViewMachine(initialOrganCode)` — reducer implementing the state machine from the
  HLD; exposes `dispatch({type:'NEXT_ORGAN'|'PREVIOUS_ORGAN'|'ORGAN_SELECTED'|...})`.
- `usePatientPicker()` — debounced search against `/api/scheduling/patients`.

## FHIR mapping (conceptual → current store)
See `DATA_SOURCE_MAP.md` for the full table. Summary: `Condition→conditionsStore`,
`MedicationRequest→medicationsStore`, `Observation(vitals/labs)→Patient.vitals/labResults`,
`ServiceRequest→referralStore`/`orderStore`, `Task→tasksStore`, `CarePlan→`derived from
referrals+tasks+appointments (no dedicated store exists), `Communication→
clinicalCommunicationStore` (My Day only).

## Organ selection state & URL sync
`?mode=patient-focus&patientId=<id>&organ=<code>`. On mount, `ClinicalCommandCenter` reads the
URL once; every subsequent change updates the URL via `router.replace` (no history spam) so
back/forward across *patients* still works, matching HLD routing rules.

## Permission Rules
- Reuses `canAccessTaskPatient(patientId, actor)` — if false, the organ-snapshot API returns
  403 and the UI shows the existing "You do not have access to this patient" pattern.
- Reproductive/Urologic organ view additionally requires the acting role to be in
  `CLINICAL_WORKSPACE_ROLES` (already enforced) — no separate sensitive-data flag exists in
  the data model today, so the UI adds an explicit confirmation step before rendering that
  organ's data panel as a defence-in-depth measure.

## Error handling
- Organ snapshot fetch failure → `OrganDataPanel` shows "Clinical data for this view is
  temporarily unavailable." while the rest of the dashboard remains interactive.
- 3D model load failure → `OrganCanvas` reports `MODEL_FAILED`; `OrganExplorer` swaps to
  `Viewer2DFallback` automatically and offers **Retry**.

## Caching
- `organ-snapshot` route sets `Cache-Control: private, no-store` (matches every other
  per-patient route in this codebase — PHI is never cached).

## Tests
- Unit (Vitest): `ehr/src/__tests__/organRegistry.test.ts` — organ cycling/wrap order, registry
  lookup fallback, centralized keyword matcher, deterministic geometry noise (stable across
  renders), and `resolveBodyPresentation()` (documented sex, unknown→neutral, override wins,
  never mutates Patient data).
- E2E (Playwright): `ehr/tests/command-center.spec.ts` — My Day loads, switch to Patient Focus,
  pick a patient, cycle organs with the next arrow and the anatomy selector, verify the organ
  title/data panel update (no stale organ data), and the body-presentation toggle switches.

## File additions
```
docs/dashboard/{HLD,LLD,ORGAN_VIEW_REGISTRY,DATA_SOURCE_MAP}.md
ehr/src/lib/organRegistry.ts
ehr/src/lib/organSnapshot.ts
ehr/src/app/api/patients/[patientId]/organ-snapshot/route.ts
ehr/src/components/command-center/** (incl. organ-explorer/OrganMesh.tsx = HumanBodyModel)
ehr/src/components/command-center/command-center.css
ehr/tests/command-center.spec.ts
ehr/src/__tests__/organRegistry.test.ts
```
