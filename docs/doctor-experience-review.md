# Roshi EHR — Doctor Experience Review
**Scope:** Doctor-facing pages and workflows only. Patient portal, admin, super-admin, billing-only, and reception-only pages are excluded except where a doctor page links into them.
**Date:** 2026-07-31
**Reviewer:** GitHub Copilot (Claude Sonnet 5), acting as senior healthcare product designer / UX auditor / frontend architect / accessibility specialist / FHIR workflow expert.

## Methodology & disclosure (read first)

- **No code was changed.** This is a read-only audit. All findings are based on direct inspection of the source in `c:\code\healthcareworkspace\ehr\src` (page components, client components, API routes, middleware, Prisma schema) plus one live browser check.
- **Live browser verification:** I attempted to open `http://localhost:3002/dashboard/records/patient-001` and other doctor routes in a real browser session. The app redirected to `/login` (session not authenticated in that browser context), so I could not visually confirm rendered pixels for most routes in this pass. Every claim below about "what currently exists" is instead based on reading the actual React/Next.js component source that renders each route — i.e., what the code *will* produce — not a confirmed pixel-level screenshot. Where this matters (e.g., claiming a workflow "works end-to-end"), I have explicitly qualified the claim.
- **No tests were run.** Any reference to Playwright/Vitest below describes what test files exist, not confirmation that they currently pass.
- Every route inventoried was located and opened as a file in the repository; I did not invent any file paths, routes, or FHIR fields.

---

# 1. Doctor route inventory

| Page name | Current URL | Purpose | Main user | Main workflow | Connected pages | Entry point | Exit point | FHIR resources involved | Quality | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| Doctor Dashboard | `/doctor` | Command center: alerts, queue, today's schedule, action items | Doctor | Triage/plan the day | Appointments, Health Records, Records, Orders | Login → Sidebar "Doctor View" | Any linked card/button | None (mock only) | Medium — functional but shallow | High |
| Doctor Appointments | `/doctor/appointments` (re-exports `/dashboard/appointments`) | View/manage schedule, book, cancel, reschedule | Doctor, reception | Book/manage appointments | Scheduling, Booking, Patient chart | Dashboard header "Appointments" | Book page, patient chart | Appointment, Slot | Medium — feature-rich but not FHIR-persisted | High |
| Book Appointment | `/dashboard/appointments/book` | Two-pane booking workspace | Doctor, reception | Book new appointment | Appointments | "Book appointment" button | Appointments list | Appointment, Slot | Medium | Medium |
| Doctor Health Records (list) | `/doctor/health-records` | Prioritized list of active/recent patients | Doctor | Triage worklist | Health Record Detail | Dashboard header "View Health Records" | Detail page | None (mock only) | Low-Medium | High |
| Health Record Detail (FHIR) | `/doctor/health-records/[visitId]` | Encounter-centric chart with FHIR data + mock fallback | Doctor | Review encounter clinical data | SOAP note (broken link) | Health Records list | SOAP note (dead-end) | Encounter, Observation, Patient, MedicationRequest, AllergyIntolerance, Condition, DiagnosticReport, DocumentReference | Medium — best FHIR coverage in app | High |
| Doctor Patient Detail | `/doctor/patients/[visitId]` | Cardiology-style patient visit detail (mock) | Doctor | Review visit | Health Records | Various links | Back / View Patients | None (mock) | Medium | Medium |
| Doctor Urgent Patient Detail | `/doctor/urgent/[visitId]` | Urgent-case patient detail with vitals/procedures | Doctor | Handle urgent case | Health Records, Orders | Urgent alert links | Back | None (mock) | Medium | High |
| Doctor Encounter Detail | `/doctor/encounters/[encounterId]` | Renders `PatientDetailClient` for an encounter | Doctor | Review encounter | SOAP note | Health record / dashboard | SOAP note | None (mock) | Low — duplicate of Patient Detail | Medium |
| SOAP Note Editor | `/doctor/encounters/[encounterId]/soap` | Write/save SOAP note tied to an encounter | Doctor | Document encounter | Encounter detail | "Add SOAP Note" button (health record) | Save & Sign | DocumentReference (via `mapNoteToFHIR`) | Medium — works but is a second, disconnected notes system | High |
| Doctor Order Detail | `/doctor/orders/[orderId]` | View a single ordered procedure | Doctor | Track order status | Health records | Orders list (not found as page) | Back | None (mock) | Low | Medium |
| Doctor Analytics | `/doctor/analytics` | Premium charts/case timelines | Doctor, admin | Practice analytics | Dashboard | Direct link only | n/a | None (mock) | Low | Low |
| Patient Overview ("Patient Chart") | `/dashboard/records/[id]` | Full clinical chart: summary, vitals, timeline, conditions, meds, tasks, care team | Doctor | Central clinical review + launch actions | Encounters, Orders, Prescriptions, Messages, Allergies, AI summary | Health Records / Patient List / search | Start Encounter, Order Lab, Prescribe, Message | None live (mock `mockPatients.ts`); type shapes mirror Patient/Condition/MedicationRequest/Observation | Medium-High — richest UI, weakest data backing | Critical |
| Allergies detail | `/dashboard/records/[id]/allergies` | Allergy review + safety context | Doctor | Verify allergies before Rx/order | Patient Overview, Prescriptions | Header allergy link | Back | AllergyIntolerance (shape only) | Medium | High |
| AI Clinical Summary | `/dashboard/records/[id]/ai-clinical-summary` | Expanded AI summary | Doctor | Fast read of patient state | Patient Overview | "View Full Clinical Summary" | Message/Task buttons | None | Medium | Medium |
| Messages | `/dashboard/records/[id]/messages` | Clinician↔patient secure messaging | Doctor | Communicate with patient | Patient Overview | "Message" button | n/a | None (should be Communication) | Medium | High |
| Lab Order Composer | Rendered from "Order Lab" action (`/dashboard/orders/labs/new?patientId=`) | Compose and "submit" a lab order | Doctor | Order labs | Patient Overview | "Order Lab" button | Submit (localStorage only) | ServiceRequest (never created) | Low — no persistence | Critical |
| Prescription Composer | `/dashboard/prescriptions/new?patientId=` | Compose and "sign & send" a prescription | Doctor | Prescribe medication | Patient Overview | "Prescribe" button | Sign & Send (localStorage only) | MedicationRequest (never created) | Low — no persistence, weak safety checks | Critical |
| Lab Results Intelligence | Linked from Recent Results / Medication History | Trend + AI interpretation of labs | Doctor | Interpret results | Patient Overview | "View All Results" | n/a | DiagnosticReport, Observation (read-only client) | Medium | High |
| Medication History | Linked from Current Medications | Full medication list, refills, safety tab | Doctor | Reconcile/renew medications | Patient Overview, Prescriptions | "View Medication History" | "Renew Prescription" (no-op) | MedicationRequest/MedicationStatement (shape only) | Medium | High |
| Risk Profile | `/patients/[patientId]/risk-profile` | Clinical risk score, trend, factors, FHIR export | Doctor | Assess long-term risk | Patient Overview (not directly linked from it) | Direct link only | FHIR export | RiskAssessment-like structure exported via `mapRiskProfileToFHIR` | Medium | Medium |
| Tasks | *No route exists* (`UpcomingTasksCard` links to `/dashboard/records/{id}/tasks`) | — | — | — | Patient Overview | — | **404 — dead link** | Task (not implemented) | Missing | High |
| Referrals | *No route exists* (`Create Referral` links to `/dashboard/records/{id}/referrals/new`) | — | — | — | Patient Overview "More" menu | — | **404 — dead link** | ServiceRequest (referral, not implemented) | Missing | High |
| Care Gaps / Care Team / Activity / Timeline / Concerns / Conditions detail | *No routes exist* — footer links from Patient Overview cards | — | — | — | Patient Overview | — | **404 — dead links (7 of them)** | CarePlan/Goal, Provenance, Condition | Missing | Medium |

**Routing problems recorded (doctor page → broken or wrong destination):**
1. `KeyConditionsCard` links to `/dashboard/records/{id}/conditions/{slug}` — no such dynamic route exists (only `/dashboard/records/[id]/conditions/[conditionId]` with a different ID scheme; slugs won't match real condition IDs).
2. `ClinicalTimeline`, `CurrentHealthConcernsCard`, `UpcomingTasksCard`, `CareGapsCard`, `CareTeamCard`, `RecentChartActivityCard`, `UpcomingAppointmentCard` all have "View All …" footer links to routes that do not exist (`/timeline`, `/concerns`, `/tasks`, `/care-gaps`, `/care-team`, `/activity`, `/appointments/{apptId}`).
3. `FHIRHealthRecord.tsx` "Add SOAP Note" button routes to `/doctor/encounters/{visitId}/soap` using a **health-record `visitId`**, but the SOAP route expects an **encounter ID** from a different mock domain (`fetchVisitDetail`/cardiology) — the two ID spaces are not guaranteed to match, so this is a likely dead-end/mismatch, not a confirmed working link.
4. `PatientProfileHeader` "More" menu items for Create Referral, Create Task, Upload Document all point to non-existent routes.
5. The header user-menu link (`/profile`) has no corresponding page in the codebase — dead link for every role, including doctors.
6. There are **three parallel, disconnected "patient chart" implementations** that a doctor can land on depending on entry point: `/doctor/patients/[visitId]` (cardiology mock), `/dashboard/records/[id]` (the rich Patient Overview), and `/patients/[patientId]/*` (risk-profile, documents, encounters, immunizations, medical-history, notes — a third data shape). None of them cross-link consistently, so a doctor can view different "versions" of the same patient depending on which link they clicked.

---

# 2–3. Review method

Applied uniformly to every page below: Purpose → Current structure → Major design review → Minor design review → Workflow review → Clinical safety review → Accessibility review → Responsive review → Performance review → Security/permission review → FHIR review, then the required page template (route, purpose, summary, what's working, problems, layout improvements, minor improvements, missing tools, button/link table, recommended sections, clinical/FHIR requirements, accessibility, responsive, performance, security, priority, next steps, next page).

To keep this report navigable, full page templates are provided for every page that has a distinct URL and is reachable; pages that are pure duplicates of another page's client component (e.g., `/doctor/encounters/[encounterId]` which just re-renders `PatientDetailClient`) are cross-referenced rather than repeated verbatim.

---

# Page: Doctor Dashboard

## Route
`/doctor`

## Main purpose
Give the doctor a single landing page to see who needs attention now (urgent alerts), what's in their queue, what's on today's schedule, and what administrative items (unsigned notes, critical results, refill requests) need action.

## Current page summary
`src/app/doctor/page.tsx` is a thin client wrapper (`ProtectedLayout` + `DashboardShell`). `DashboardShell` lays out a 12-column grid: header, 3 summary metric cards, then a left column (Urgent Alerts, Queue Workbench with My Queue/Rooms/All Queues tabs) and a right sidebar (Today's Appointments, Action Center). All data comes from `src/lib/mock/dashboardService.ts` — in-memory mock functions with artificial delay, not a database or FHIR server.

## What is working well
- Clear F-pattern layout: alerts and queue (highest priority) get the widest column; schedule and quick links sit in the sidebar.
- Acknowledge / Check-in / Complete actions use real optimistic UI with loading and disabled states, not just static mockups.
- Action Center gives one-click counts into filtered result/notes/orders/refill queues — a good "inbox zero" pattern.
- `aria-labelledby` is present on the major landmark sections (Urgent Alerts, Queue Workbench).

## Main problems
- **Everything is mock data with no persistence** — `getUrgentAlerts()`, `getMyQueueItems()`, `getAppointmentsToday()`, `getActionCenterCounts()` return hardcoded arrays; acknowledging an alert or completing a queue item calls a `POST` API that does not mutate any real store (state only updates client-side, optimistically, and is lost on refresh).
- **Rooms tab and All Queues tab are explicit placeholders** (`// Minimal placeholder — real implementation should call roomService`).
- **"Open" link on Today's Appointments card is hardcoded to `/doctor/appointments`** instead of being patient-specific — a doctor clicking "Open" on any appointment lands on the generic appointments list, not that patient's record.
- Header nav shows a hardcoded clinician identity ("Dr. Sarah Lee", "Toronto Cardiology Clinic") instead of the signed-in user's real name/session data.
- `window.confirm()` is used for the "Acknowledge alert" safety-relevant confirmation — not screen-reader-friendly, not stylable, not testable reliably.
- No date/time context for "today" beyond a hardcoded now(); no timezone handling documented.

## Major layout improvements to build
1. Add a persistent, sticky "patient search" affordance at the top of the dashboard shell (currently the app-level global search exists but is not scoped/optimized for clinical lookup by MRN).
2. Replace the 3-tab Queue Workbench with real tri-state data (My Queue / Rooms / All Queues) backed by an actual queueing service, and add empty/error states consistent with the rest of the dashboard widgets.
3. Add a "Notes requiring signature" and "Orders awaiting signature" surfaced directly on the dashboard (not just as a link with a count) since these are safety-critical outstanding items for a doctor.
4. Replace hardcoded "Dr. Sarah Lee" header identity with the authenticated session user (`session.user.name`), and make the Facility selector reflect the doctor's actual assigned facility/tenant.

## Minor visual improvements to build
- Add visible focus rings (`focus:ring` currently has no color/width specified) across all header nav buttons.
- Add `role="tab"`/`aria-selected` to the Queue Workbench tab buttons (currently plain buttons with conditional class names).
- Replace `window.confirm()` in Urgent Alerts with an accessible confirm dialog (existing `ClinicalAlert`/Modal patterns in the design system should be reused).
- Add relative time formatting ("2 min ago") consistently instead of mixed absolute/locale time strings.

## Missing tools or sections
- No patient search bar on the dashboard itself.
- No "Notes requiring signature" widget (data exists via Action Center count only).
- No real room/queue backend (Rooms tab, All Queues tab are stubs).
- No notification center / toast system — errors surface via `alert()`.

## Button and link review

| Control | Current behavior | Expected behavior | Destination or action | Problem |
|---|---|---|---|---|
| "View Patients" | Navigates | Navigate to patient list | `/dashboard/records` | None |
| "View Encounters" | Navigates | Navigate to encounters | `/dashboard/encounters` | None |
| "Appointments" | Navigates | Navigate to appointments | `/doctor/appointments` | None |
| "View Orders" | Navigates | Navigate to orders | `/dashboard/orders` | Route existence not verified in this pass |
| "View Health Records" | Navigates | Navigate to health records | `/doctor/health-records` | None |
| Urgent Alert "Open Patient" | Navigates | Open that patient's chart | `/dashboard/records/{patientId}` | None — correctly patient-specific |
| Urgent Alert "Acknowledge" | `POST /api/alerts/acknowledge`, optimistic update, `window.confirm()` gate | Same, with accessible confirm | Same endpoint | Native confirm dialog; no true persistence |
| Queue item "Open" | Navigates | Open patient chart | `/dashboard/records/{patientId}` | None |
| Queue item "Complete" | `POST /api/queue/complete`, optimistic update | Same | Same endpoint | No persistence; `alert()` on failure |
| Today's Appointment "Open" | Navigates | Open **that appointment/patient** | Hardcoded `/doctor/appointments` | **Bug** — ignores which row was clicked |
| Today's Appointment "Check In" | `POST /api/appointments/checkin` | Same | Same endpoint | No Encounter created on check-in |
| Action Center links (5) | Navigate with query filters | Same | `/dashboard/results`, `/dashboard/notes`, `/dashboard/refills`, `/dashboard/orders` | Target routes not verified to exist in this pass |

## Recommended page sections
1. Patient context / search
2. Safety alerts (urgent + unsigned notes + critical results merged into one "needs attention" module)
3. Main workflow (queue)
4. Supporting information (today's schedule)
5. Quick actions
6. Audit/FHIR inspector (dev-only)

## Clinical and FHIR requirements
- Urgent alerts should map to FHIR `Flag` or `DetectedIssue` resources with `patient` reference.
- Queue items ("Result review") should map to FHIR `Task` with `for` (patient) and `focus` (Observation/DiagnosticReport) references.
- Check-in should create a FHIR `Encounter` with `status: arrived`.

## Accessibility improvements
- Add `role="tab"` / `aria-selected` / keyboard arrow-key navigation to Queue Workbench tabs.
- Replace `window.confirm`/`alert` with accessible dialog and toast components.
- Specify visible `focus:ring-2 focus:ring-offset-2` colors on all header buttons.

## Responsive improvements
- Large desktop: current 12-col grid (8/4 split) is appropriate.
- Standard desktop: unchanged.
- Tablet: right sidebar (Today's Appointments, Action Center) should stack below main column — grid classes already use `col-span-12 lg:col-span-8/4`, so this should work, but was not visually confirmed.
- Mobile: 5 header nav buttons will wrap awkwardly; should collapse into a menu below `sm` breakpoint.

## Performance improvements
- Mock service calls run in parallel already (`Promise.all` pattern used elsewhere); dashboard widgets should each independently `Suspense`/skeleton rather than blocking the whole shell.
- No caching layer for repeatedly-fetched dashboard summary — add short TTL cache once backed by a real API.

## Security and permission improvements
- Add explicit role check in `/doctor/page.tsx` itself (currently relies solely on middleware + `ProtectedLayout`); a defense-in-depth server check should confirm `role === 'DOCTOR' || 'ADMIN'` like other doctor pages do.
- Remove/guard the `devAllowed` middleware bypass list (`/dashboard/encounters`, `/dashboard/appointments`, `/dashboard/records`, `/dashboard`) so it can never be reachable outside strict non-production builds (see Section 12/13 for full detail).

## Priority
**High** — this is the first page every doctor sees every day; broken "Open" link and mock-only actions undermine trust immediately, but it is not a critical patient-safety blocker on its own.

## What to build next on this page
1. Fix the hardcoded "Open" link on Today's Appointments to route to the specific patient.
2. Wire dashboard summary/alerts/queue to real Task/Flag/Encounter data (or a real backing service) instead of mock arrays.
3. Add a "Notes/Orders awaiting signature" module with direct links to sign.
4. Replace `window.confirm`/`alert` with accessible dialog/toast components.
5. Bind header identity to the authenticated session.

## What page should be reviewed or built after this one
**Doctor Appointments** — it's the first link a doctor clicks from the dashboard and shares the same mock scheduling backend, so fixing data flow there benefits both pages together.

---

# Page: Doctor Appointments

## Route
`/doctor/appointments` (re-exports `src/app/dashboard/appointments/page.tsx`)

## Main purpose
Let a doctor see today's/this week's schedule, find open slots, book, cancel, and reschedule appointments, and jump into a patient's chart from an appointment.

## Current page summary
Server component computes today/week counts and free-slot counts from mock `fetchAppointments()`/`fetchSlots()`, renders 4 summary cards, a "Book appointment"/"Find slots" header action pair, and an embedded `<iframe src="https://cal.com/demo">` alongside an upcoming-meetings list. The richer scheduling UI (`SchedulingCalendarClient`, used at `/scheduling`) supports Today/Week/Month/All views, provider/location filters, a 7-status multi-select filter, and modals for booking and appointment details (cancel, auto-reschedule).

## What is working well
- Real, working filter/search logic (`useMemo`-based, provider/location/status/text) in `SchedulingCalendarClient`.
- Cancel workflow correctly frees the associated slot back to `free` status.
- Good visual differentiation of appointment status via `Badge` variants.
- Booking flow (`CalBookingClient`) has a genuinely two-pane, date-picker + slot-list + patient-search UX pattern that's close to production-quality interaction design.

## Main problems
- **Booking uses `window.prompt()`** to collect a patient name ("Select a free slot to book (demo)") — not a real patient search/selection, no MRN, no duplicate-patient protection.
- **"Reschedule (auto)" has no user-facing slot choice** — it silently reschedules to *the first available slot* rather than letting the doctor pick a new time, which is a workflow gap for a clinical scheduling tool.
- **No "Start Encounter" action anywhere in the appointments UI** — a doctor cannot go from "patient has arrived" to starting a clinical encounter from this page; they must separately navigate to the chart and click "Start Encounter" there.
- **No explicit "No-show" button** even though `noshow` exists as a filterable status.
- **"Manage Providers" button has no `onClick` handler** — a visible, clickable dead button for ADMIN/SYSTEM roles.
- **Cal.com iframe is an unauthenticated demo embed** (`https://cal.com/demo`) with no lazy-loading — this is a third-party embed inside a page that also displays real appointment/patient names, a data-leakage and layout-shift concern.
- All data is mock (`scheduling.mock.ts`); appointment booking/cancel/reschedule never reach a FHIR server.

## Major layout improvements to build
1. Add a "Start Encounter" primary action directly on each appointment row/card for arrived patients.
2. Replace the Cal.com demo iframe with either a real Cal.com production embed behind lazy-loading, or remove it entirely from a page that shows real patient data.
3. Give the booking flow a real patient search/autocomplete (reusing the "patient search" pattern already built in `CalBookingClient`) instead of `window.prompt()`.
4. Let "Reschedule" open the same slot-selection UI used for booking, rather than auto-picking a slot.

## Minor visual improvements to build
- "◀"/"▶" navigation glyphs in `CalBookingClient` need `aria-label="Previous week"/"Next week"`.
- Status filter chips need `aria-pressed` and visible focus outlines.
- Standardize date/time formatting (`toLocaleString`/`toLocaleTimeString` used inconsistently across components) to a single shared formatter.

## Missing tools or sections
- No "No-show" action.
- No conflict detection when booking overlapping slots for the same provider.
- No reminder/notification status column (SMS/email sent?).
- No waitlist.

## Button and link review

| Control | Current behavior | Expected behavior | Destination or action | Problem |
|---|---|---|---|---|
| "Book appointment" | Navigates | Open booking workspace | `/dashboard/appointments/book` | None |
| "Find slots" | Navigates | Open slot finder | `/scheduling` | None |
| View toggle (Today/Week/Month/All) | Client state change | Same | n/a | None |
| Status filter chips (7) | Toggle in a `Set` | Same | n/a | No `aria-pressed` |
| "Prev"/"Today"/"Next" | Shift cursor date | Same | n/a | None |
| "Book" (calendar toolbar) | Opens booking modal | Same | Modal | None |
| "Manage Providers" (ADMIN/SYSTEM only) | No `onClick` | Open provider management | Undefined | **Dead button** |
| Slot "Book" (modal) | `window.prompt()` for name, then books | Real patient search + book | `bookAppointment()` mock | No real patient selection |
| Appointment "Details" | Opens details modal | Same | Modal | None |
| Details modal "Cancel" | `confirm()`, `cancelAppointment()`, frees slot | Same, accessible dialog | Mock function | Native `confirm()` |
| Details modal "Reschedule (auto)" | Auto-picks a slot, no user choice | Let user pick new slot | Mock function | UX gap |

## Recommended page sections
1. Patient/appointment search + filters
2. Day/Week/Month/List view toggle
3. Today's appointments with Start Encounter/Check-in/No-show inline actions
4. Booking workspace
5. Provider/room schedule (admin)
6. Audit/FHIR detail (dev)

## Clinical and FHIR requirements
- `Appointment`, `Slot`, `Schedule` for booking; `Encounter` created on check-in/Start Encounter; `Patient` reference validated against a real patient index (not free-text name entry).

## Accessibility improvements
- Add ARIA labels to icon-only navigation controls, `aria-pressed` on filter chips, replace `confirm()`/`prompt()` with accessible modals.

## Responsive improvements
- Month/Week grid views (`grid-cols-7`) need an explicit mobile fallback to a single-day agenda view; not evidenced in the code that one exists.

## Performance improvements
- Lazy-load the Cal.com iframe (or remove it); virtualize the "All" flat list view once appointment counts grow beyond a page.

## Security and permission improvements
- "Manage Providers" visibility check exists client-side only; must also be enforced server-side once implemented.
- Appointments API already filters by clinician ID server-side for `DOCTOR` role — good pattern to replicate elsewhere.

## Priority
**High** — booking/rescheduling/cancelling are daily-use workflows; the missing Start Encounter and prompt()-based booking are meaningful friction and safety-adjacent gaps (patient identity capture).

## What to build next on this page
1. Add "Start Encounter" action per arrived appointment.
2. Replace `window.prompt` patient capture with real patient search tied to MRN.
3. Make "Manage Providers" functional or remove it.
4. Let reschedule show real slot choices.
5. Replace/lazy-load the Cal.com iframe.

## What page should be reviewed or built after this one
**Patient Overview (`/dashboard/records/[id]`)** — because "Start Encounter" and "Open Patient" from appointments both land there; consistent context (last seen, allergies) should be visible before the doctor leaves the appointments page.

---

# Page: Doctor Health Records (List)

## Route
`/doctor/health-records`

## Main purpose
Give doctors a priority-sorted worklist of active/recent patients so the highest-urgency cases are reviewed first.

## Current page summary
Server component does a proper role check (`role !== 'DOCTOR' && role !== 'ADMIN'` → redirect) and a dev `asUser` override, then renders `HealthRecordsListClient` with a hardcoded doctor identity card ("Dr. Alice Chen, Cardiology"), a priority doughnut chart, and a patient table (name, state, priority badge, diagnosis, optional medications column, follow-up date, "View" action).

## What is working well
- Correct server-side role gate (one of the few pages that duplicates the middleware check defensively).
- Priority-first sorting matches real clinical triage intent.
- Medications-visibility toggle is a sensible density control for a list view.

## Main problems
- **Doctor identity card is hardcoded** ("Dr. Alice Chen") regardless of who is actually logged in.
- **No search or filter controls** on the list itself (name/MRN search, state filter) — described in the review brief as expected but absent in the code read.
- **No loading/error/empty state** — the component assumes `initialDashboard` is always populated.
- **No MRN/DOB visible in the list**, only in the detail view — makes patient identification on a shared/multi-patient list slower and riskier (wrong-patient selection risk).
- **No FHIR integration at all** — 100% mock (`fetchDashboard()`), unlike the detail page one level down which does attempt FHIR.

## Major layout improvements to build
1. Add patient search (name/MRN) and state/priority filters above the table.
2. Add MRN + DOB columns for safe patient identification.
3. Bind the doctor identity card to the session user.

## Minor visual improvements to build
- Add loading skeleton and an explicit "no active patients" empty state.
- Add `aria-label`/table semantics (`scope="col"`) to table headers.

## Missing tools or sections
- Search/filter bar, MRN/DOB columns, recently-viewed patients, assigned-to-me filter, empty/error states.

## Button and link review

| Control | Current behavior | Expected behavior | Destination or action | Problem |
|---|---|---|---|---|
| Row "View" | `router.push('/doctor/health-records/{id}')` | Same | Detail page | None |
| "Show medications" checkbox | Toggles column | Same | n/a | None |

## Recommended page sections
1. Search & filters
2. Priority summary (doughnut/urgent counts)
3. Patient worklist table (with MRN/DOB)
4. Empty/error/loading states

## Clinical and FHIR requirements
`Patient` (list identity), `Encounter` (status/priority), `Condition` (diagnosis column) — currently none of these are live.

## Accessibility improvements
Add table header scope, aria-labels on the checkbox and priority badges, and heading hierarchy for the chart section.

## Responsive improvements
Table should convert to stacked cards below `md`; not evidenced in code.

## Performance improvements
Add pagination/virtualization once patient count grows beyond the current small mock set.

## Security and permission improvements
Already checks role server-side — good. Should also filter to "patients assigned to this doctor" rather than a clinic-wide list, unless clinic-wide visibility is an intended feature.

## Priority
**High** — this is the doctor's daily triage worklist; missing search/MRN is a real workflow slowdown.

## What to build next on this page
1. Add search + filters.
2. Add MRN/DOB columns.
3. Bind doctor identity to session.
4. Add loading/empty/error states.

## What page should be reviewed or built after this one
**Health Record Detail (`/doctor/health-records/[visitId]`)** — the very next click from every row in this list.

---

# Page: Health Record Detail (FHIR-backed)

## Route
`/doctor/health-records/[visitId]`

## Main purpose
Show a single encounter's full clinical picture — vitals, meds, allergies, conditions, labs, notes — pulled live from FHIR where possible.

## Current page summary
Server component performs a proper role check (`DOCTOR`/`ADMIN`/`NURSE`), logs a `logAuditEvent` read event, then tries a parallel FHIR fetch (`getEncounterDetail`, `getObservationsByEncounter`, `getDocumentReferencesByEncounter`, then `getPatientByFhirId`, `getMedicationRequestsByPatient`, `getAllergyIntolerancesByPatient`, `getConditionsByPatient`, `getDiagnosticReportsByPatient`). On success it renders `FHIRHealthRecord` (tabbed: Summary/Vitals/Medications/Allergies/Conditions/Labs/Notes). On FHIR failure it falls back to `HealthRecordDetailClient`, a mock-data version with a visible amber "Showing local data — FHIR server currently unreachable" banner.

## What is working well
- **This is the single best-implemented clinical-safety pattern in the app**: real audit logging on every view, a genuine FHIR-first-with-mock-fallback strategy, and an honest on-screen banner when FHIR is down (rather than silently showing stale/wrong data).
- Allergies tab has an explicit, high-contrast "NKDA" green confirmation state and a red/⚠ state when allergies exist — correct clinical pattern.
- Conditions tab shows the FHIR coding system (ICD-10-CA vs SNOMED) next to each condition — a genuinely FHIR-literate detail most EHR UIs skip.
- Tab badges only render when a section has data (no distracting "0" badges).

## Main problems
- **"Add SOAP Note" button routes to `/doctor/encounters/{visitId}/soap` using the health-record's `visitId`**, but the SOAP page/encounter mock domain use a different ID space (`fetchVisitDetail`) — this is a likely broken handoff between two independently-built subsystems.
- **Labs tab only shows report title/date/status, not actual result values** — a doctor cannot see the actual lab number without leaving this tab (no traversal of `DiagnosticReport.result` → `Observation`).
- **Vitals tab status mapping only distinguishes `final` vs "not final"** — no handling for `preliminary`/`amended`/`corrected`, which are clinically meaningful FHIR states.
- **Notes tab renders `DocumentReference.content[0].attachment.data` as plain preformatted text** — no rich rendering, and a base64 note blob is a fragile place to store a clinical note when the app also has a full structured `ClinicalNote` model elsewhere.
- **No `role="tablist"`/`aria-selected`** on the tab buttons.
- **No retry logic and no structured error/staleness indicator** beyond the single banner — a doctor has no way to know *when* the FHIR server was last reachable or retry without a full page reload.

## Major layout improvements to build
1. Fix or remove the "Add SOAP Note" link until the ID spaces are reconciled — link it to the unified Notes system (`/api/notes` + `NoteEditor`) instead of the separate SOAP mock system.
2. Expand the Labs tab to show actual result values (traverse `DiagnosticReport.result[]` → `Observation.valueQuantity`), not just report metadata.
3. Add a persistent "data as of {timestamp}, source: FHIR|local" indicator on every tab, not just a one-time banner.

## Minor visual improvements to build
- Add `role="tablist"`, `role="tab"`, `aria-selected` to the tab bar.
- Handle `preliminary`/`amended`/`corrected` Observation statuses with distinct badge colors, not just final/not-final.
- Wrap the ⚠ allergy icon in an `aria-label` rather than relying on color+emoji alone.

## Missing tools or sections
- Actual lab result values, retry/refresh control, provenance/audit-history viewer inline on the page (audit *event* is logged, but not shown to the doctor).

## Button and link review

| Control | Current behavior | Expected behavior | Destination or action | Problem |
|---|---|---|---|---|
| Tab buttons (7) | `setTab(t)` | Same, with tab semantics | n/a | Missing ARIA tab roles |
| "Add SOAP Note" (Summary & Notes tabs) | Navigates | Create a linked clinical note | `/doctor/encounters/{visitId}/soap` | **Likely ID-space mismatch / dead-end** |

## Recommended page sections
1. Patient identity + allergy/risk banner (persistent, not just in Summary tab)
2. Encounter status/context
3. Tabs: Summary, Vitals, Medications, Allergies, Conditions, Labs, Notes
4. Data source/freshness indicator
5. Audit/provenance viewer

## Clinical and FHIR requirements
`Encounter`, `Observation`, `Patient`, `MedicationRequest`, `AllergyIntolerance`, `Condition`, `DiagnosticReport`, `DocumentReference`, and (for audit) `Provenance`/`AuditEvent`. Add `Observation` traversal from `DiagnosticReport.result` for actual lab values.

## Accessibility improvements
ARIA tab roles, aria-label on allergy warning icon, focus management on tab switch.

## Responsive improvements
Tabs should convert to a scrollable chip row or select dropdown on mobile; not confirmed in code.

## Performance improvements
The 30-second `revalidate` cache on FHIR reads is a reasonable default; consider per-resource cache tuning (e.g., allergies change rarely, vitals change often).

## Security and permission improvements
Role check and audit logging are already correctly implemented here — use this page as the template for the rest of the app.

## Priority
**Critical** — this is the most clinically complete page in the app and the template for FHIR-safety patterns; the dead SOAP-note link is a direct workflow break for documentation.

## What to build next on this page
1. Fix the SOAP note link/ID mismatch (or route into the unified Notes API).
2. Add real lab values to the Labs tab.
3. Add ARIA tab roles.
4. Add persistent data-freshness/source indicator.
5. Handle additional Observation statuses.

## What page should be reviewed or built after this one
**SOAP Note Editor (`/doctor/encounters/[encounterId]/soap`)** — directly reachable from this page's broken link, and duplicative of the unified Notes system reviewed under Clinical Notes below.

---

# Page: Doctor Patient Detail & Doctor Urgent Patient Detail

## Route
`/doctor/patients/[visitId]` and `/doctor/urgent/[visitId]`

## Main purpose
Cardiology-flavored patient visit detail (demographics, medical overview, last visit, visit history, symptoms, injuries, chronic conditions) with the urgent variant adding vitals and procedures/orders sidebars for emergent cases.

## Current page summary
Both are server components loading `fetchVisitDetail`/`fetchDashboard` mocks and rendering a large client component (`PatientDetailClient` / `UrgentPatientDetailClient`) with a 3-column patient-summary grid, medical overview, last-visit, visit-history accordion, symptoms, injuries, and chronic-conditions cards. Both attempt a client-side refresh via `fetch('/api/cardiology/visits/{id}')` that silently swallows errors.

## What is working well
- Good information density for a "everything about this visit" page: primary physician, allergy+severity, emergency contact, and prior-visit notes are all present.
- Urgent variant adds vitals (Temp/BP/HR/SpO₂) and an ordered-procedures list, appropriately prioritized for the urgent-care context.
- Consistent empty-state text across every card ("No symptoms recorded.", "No injuries recorded.", etc.).

## Main problems
- **This is effectively a third, parallel patient-chart implementation**, separate from `/dashboard/records/[id]` (Patient Overview) and `/patients/[patientId]/*`. A doctor arriving here sees a different layout, different data fields (no vitals trend, no care team, no AI summary), and different navigation than the "main" patient chart.
- **Client-side data refresh silently swallows fetch errors** (`catch (e) { // ignore }`) — a doctor has no indication that background refresh failed.
- **No allergy-reviewed-date, no risk level, no verified/data-freshness indicator** on either variant.
- No FHIR integration at all (100% mock, unlike the FHIR Health Record Detail page one level up in the doctor route tree).

## Major layout improvements to build
1. Decide on and converge to a single patient chart implementation (recommend `/dashboard/records/[id]` Patient Overview as the canonical one, given its richer card system) and redirect/deprecate the other two.
2. Surface fetch failures from the silent background refresh as a visible "couldn't refresh — showing last-loaded data" banner.

## Minor visual improvements to build
Add `aria-label`s to metric boxes ("Seen (est)", "Priority") which are currently just styled `div`s with no semantic meaning for screen readers.

## Missing tools or sections
Vitals trend, allergy-reviewed date, risk level, verified/data-freshness indicator, care team, AI summary — all present in the sibling Patient Overview page but absent here.

## Button and link review

| Control | Current behavior | Expected behavior | Destination or action | Problem |
|---|---|---|---|---|
| "View Patients" / "Back" | Navigate | Same | Various | None observed |

## Recommended page sections
Converge onto the Patient Overview section order (see below) rather than maintaining a separate order.

## Clinical and FHIR requirements
Same resource set as Patient Overview; currently mock-only.

## Accessibility improvements
Add `<section role="region">`/aria-labelledby to each card; add aria-labels to metric boxes.

## Responsive improvements
Not confirmed; 3-column summary grid likely needs single-column stacking on mobile.

## Performance improvements
Background refresh polling behavior not confirmed to be interval-based vs one-shot; if interval-based, ensure cleanup and backoff on repeated failure.

## Security and permission improvements
Neither page's server component was confirmed to perform its own role check in this pass beyond what the shared health-records detail page does — verify each has an explicit role gate, not just middleware.

## Priority
**High** for Urgent Patient Detail (used in emergent scenarios), **Medium** for the standard Patient Detail (largely superseded by Patient Overview).

## What to build next on this page
1. Converge to one canonical patient chart (biggest structural fix in the whole app).
2. Surface background-refresh failures.
3. Add allergy/risk/freshness indicators to match Patient Overview.

## What page should be reviewed or built after this one
**Patient Overview (`/dashboard/records/[id]`)** — the intended consolidation target.

---

# Page: Patient Overview ("Doctor's Patient Chart")

## Route
`/dashboard/records/[id]`

## Main purpose
The doctor's primary, single-screen clinical chart for one patient: identity/allergy/risk banner, AI summary, vitals trend, full clinical timeline, active concerns, tasks, next appointment, key conditions, recent results, recent notes, current medications, medical history (allergies/immunizations/visits/documents), chart activity, care gaps, and care team — plus the four primary clinical actions (Start Encounter, Order Lab, Prescribe, Message).

## Current page summary
This is the page built earlier in this workspace session. Server component loads `getPatientById()` (100% mock data, `mockPatients.ts`) and renders, in order: `PatientProfileHeader` (sticky identity/risk/action banner), a 6/6 grid of `AIHealthSummaryCard` + `VitalsTrendCard`, a full-width `ClinicalTimeline`, a 5/3/4 grid of `CurrentHealthConcernsCard`/`UpcomingTasksCard`/`UpcomingAppointmentCard`, a 4/4/4/12 grid of `KeyConditionsCard`/`RecentResultsCard`/`RecentClinicalNotesCard`/`CurrentMedicationsCard`, `MedicalHistorySection` (4 mini-cards), and a 4/4/4 grid of `RecentChartActivityCard`/`CareGapsCard`/`CareTeamCard`.

## What is working well
- Section order matches the requested "identity → safety → summary → main workflow → supporting detail → history → audit" pattern well.
- Genuinely accessible patterns in several cards: `role="status"` empty states, `role="tablist"`/`aria-selected` on the Clinical Timeline filter chips, `aria-hidden` on decorative timeline dots, labeled `<select>` controls in Vitals Trend, `aria-label` on unreviewed-result indicators.
- `PatientProfileHeader` correctly surfaces allergy info first (leftmost, high priority), a clinical-risk badge, last-seen + attending doctor, primary physician, and a "Data Updated" timestamp — this is one of very few places in the whole app with an explicit data-freshness indicator.
- AI Health Summary card includes an explicit disclaimer ("AI-generated summary for clinician review — not a confirmed diagnosis") — correct clinical-safety pattern for AI content.
- "Start Encounter" is the clear primary CTA in the header, matching the requested spec.

## Main problems
- **All data is mock (`mockPatients.ts`)** — no FHIR read/write anywhere on this page. It is the richest UI in the app sitting on the weakest data layer.
- **Seven "View All …" footer links across six different cards point to routes that do not exist**: Timeline, Concerns, Tasks, Care Gaps, Care Team, Chart Activity, and per-appointment detail (see routing-problems list in Section 1). Every one of these is a dead end for a doctor who clicks "see more."
- **`KeyConditionsCard` builds a slugified URL from the condition name** (`condition.name.toLowerCase().replace(/\s+/g,'-')`) rather than using a stable condition ID — fragile and likely mismatched with the one real conditions-detail route that does exist (`/dashboard/records/[id]/conditions/[conditionId]`).
- **"More" menu items** (Add Clinical Note, Upload Document, Create Task, Add Condition, Record Allergy, Add Immunization, Add Medication, Create Referral) mix working routes (allergies/new, conditions/new appear to exist) with non-existent ones (tasks/new, referrals/new, documents/upload) with no visual distinction between the two — a doctor cannot tell which menu items are real.
- **Verification status is described as "hard-coded" in `PatientBanner`** rather than reflecting a genuine identity-verification workflow.
- Several cards lack `aria-label` on color-only status/tone badges (WCAG 1.4.1 use-of-color risk).

## Major layout improvements to build
1. Either build the seven missing subpages (Timeline, Concerns, Tasks, Care Gaps, Care Team, Activity, per-appointment detail) or remove/disable their "View All" links until built, so the page never presents a false affordance.
2. Fix `KeyConditionsCard` to use the patient's actual condition ID (matching `/dashboard/records/[id]/conditions/[conditionId]`) instead of a derived slug.
3. Visually distinguish implemented vs. not-yet-implemented "More" menu actions (or hide the unimplemented ones behind a feature flag) so doctors don't hit dead ends from the primary action menu.
4. Replace the mock `getPatientById()` data source with real FHIR reads (`Patient`, `Condition`, `AllergyIntolerance`, `MedicationRequest`, `Observation`, `DiagnosticReport`, `DocumentReference`) using the same fetch-with-fallback pattern already proven in `/doctor/health-records/[visitId]`.

## Minor visual improvements to build
- Add `aria-label` to tone/status badges in `AIHealthSummaryCard`, `CurrentMedicationsCard`, `CareGapsCard`, `UpcomingTasksCard`.
- Add `role="table"`/proper table semantics wrapper to `CurrentMedicationsCard`.
- Add aria-labels distinguishing "View Appointment" vs "Message Clinic" links in `UpcomingAppointmentCard`.

## Missing tools or sections
- Real audit/provenance trail (currently `RecentChartActivityCard` is mock-only).
- A genuine identity-verification status/workflow (currently hardcoded "verified").
- Signed-note / unsigned-note status surfaced directly on this page (it lives instead only in the separate Notes system and Dashboard Action Center).

## Button and link review

| Control | Current behavior | Expected behavior | Destination or action | Problem |
|---|---|---|---|---|
| "Start Encounter" | Navigates | Start a clinical encounter for this patient | `/dashboard/encounters/new?patientId={id}` | Route existence for `/dashboard/encounters/new` not verified in this pass |
| "Order Lab" | Navigates | Open lab order composer | `/dashboard/orders/labs/new?patientId={id}` | Composer exists but only saves to `localStorage` (see Orders section) |
| "Prescribe" | Navigates | Open prescription composer | `/dashboard/prescriptions/new?patientId={id}` | Composer exists but only saves to `localStorage` (see Prescriptions section) |
| "Message" | Navigates | Open patient messaging | `/dashboard/records/{id}/messages` | Works; no audit logging on send (see Messages section) |
| "More" menu (8 items) | Navigate to various sub-routes | Same | Mixed — allergies/new & conditions/new exist; tasks/new, referrals/new, documents/upload do not | **4 of 8 items are dead links** |
| "View Full Clinical Summary" | Navigates | Open AI summary detail | `/dashboard/records/{id}/ai-clinical-summary` | Exists |
| "View All Concerns" / "View All Tasks" / "View All Care Gaps" / "View Care Team" / "View All Activity" / "View Full Timeline" | Navigate | Same | Various | **All 6 are dead links (no route)** |
| KeyConditionsCard condition links | Navigate via slug | Open condition detail | `/dashboard/records/{id}/conditions/{slug}` | **Likely mismatched ID scheme** |
| "View All Results" | Navigates | Open filtered labs list | `/dashboard/records/labs?patient={id}` | Filtered view not independently confirmed |
| "View All Notes" | Navigates | Open notes list | `/dashboard/records/{id}/doctor-notes` | Route likely exists (referenced elsewhere) but not independently verified in this pass |
| "View Medication History" | Navigates | Open medication history | `/dashboard/records/{id}/medications` | Not independently verified |
| MedicalHistorySection mini-card links (4) | Navigate | Same | Allergies (exists), others not verified | Mixed confidence |

## Recommended page sections
1. Patient identity + allergy/risk/verification banner (current header — good, keep)
2. Safety alerts / AI summary
3. Vitals trend + Clinical timeline (main workflow)
4. Current concerns / tasks / next appointment
5. Conditions / results / notes / medications
6. Medical history
7. Chart activity, care gaps, care team (audit & coordination)

## Clinical and FHIR requirements
`Patient`, `Condition`, `AllergyIntolerance`, `MedicationRequest`/`MedicationStatement`, `Observation` (vitals + labs), `DiagnosticReport`, `DocumentReference` (notes/documents), `Encounter` (timeline/history), `CarePlan`/`Goal` (care gaps), `CareTeam`, `Provenance`/`AuditEvent` (chart activity), `Task` (upcoming tasks), `Appointment` (upcoming appointment).

## Accessibility improvements
Add aria-labels to remaining color-only badges; add `role="table"` to the medications table; audit every "View All" link for either implementation or removal (a broken link is itself an accessibility/trust failure, not just a missing feature).

## Responsive improvements
- Large desktop: current 12-col multi-row grid is appropriate.
- Standard desktop: unchanged.
- Tablet: 5/3/4 and 4/4/4/12 grids need to collapse to 1–2 columns; not visually confirmed in this pass.
- Mobile: header action row (Start Encounter/Order Lab/Prescribe/Message/More) will need to collapse into a primary button + overflow menu.

## Performance improvements
Once wired to FHIR, apply the same 30s `revalidate` caching pattern used in `/doctor/health-records/[visitId]`; lazy-load `VitalsTrendCard`'s chart library if it's heavy; paginate `ClinicalTimeline` beyond the current `max-h-[420px]` scroll container instead of loading all events at once.

## Security and permission improvements
Add a server-side role check to `/dashboard/records/[id]/page.tsx` itself (not confirmed to exist in this pass, unlike the doctor health-records detail page which does check role explicitly) and an audit-log write on every chart view, matching the pattern in `/doctor/health-records/[visitId]`.

## Priority
**Critical** — this is the doctor's primary daily tool and the most work has already been invested here; the mock data layer and seven dead "View All" links are the two biggest gaps standing between the current UI and a trustworthy clinical tool.

## What to build next on this page
1. Add a server-side role check + audit-log write to this page (matching `/doctor/health-records/[visitId]`).
2. Fix or remove the 6 dead "View All" footer links and the 4 dead "More" menu items.
3. Fix `KeyConditionsCard`'s ID-slug mismatch.
4. Begin migrating from `mockPatients.ts` to real FHIR reads, reusing the fetch-with-fallback + freshness-banner pattern already proven elsewhere in the app.
5. Add `aria-label`s to remaining color-only badges.

## What page should be reviewed or built after this one
**Clinical Notes / SOAP Note Editor**, then **Orders/Prescriptions composers** — these are the three actions launched directly from this page's header, and all three currently write to nowhere durable (Notes has real Prisma-ready persistence pending; Orders/Prescriptions write to `localStorage` only).

---

# Page: Clinical Notes (Unified Notes System + SOAP Editor)

## Route
Unified notes: embedded via `NoteEditor`/`NotesWorkbench` (no single dedicated top-level route found in this pass; used within encounter/patient contexts). Legacy/parallel SOAP editor: `/doctor/encounters/[encounterId]/soap`.

## Main purpose
Let a doctor (or other permitted role) author, edit, sign, and amend clinical documentation with a full audit trail, and prevent silent edits to signed notes.

## Current page summary
Two independent systems exist:
1. **Unified Notes** (`src/notes/*`, `src/components/notes/*`, `src/app/api/notes/**`): Tiptap rich-text editor with 600ms-debounced autosave, role-based note-type permissions (`NOTE_TYPE_ALLOWLIST`, `SIGNING_ROLES`), word-level LCS-diff track-changes with accept/reject and automatic rebase of pending revisions, signed-note immutability enforced at three layers (UI hides editor, API 403s edits, service throws), addenda for post-sign amendments, and full audit logging (`withAudit`) on every mutation. Persistence is currently **in-memory only** (`service.mock.ts`) with a ready-but-unused Prisma schema (`ClinicalNote`, `NoteRevision`, `NoteComment`, `NoteAddendum`).
2. **SOAPNoteEditor** (`src/components/clinical/SOAPNoteEditor.tsx`, used at `/doctor/encounters/[encounterId]/soap`): a simpler 4-textarea (Subjective/Objective/Assessment/Plan) form with a single "Save & Sign Note" button that posts to `/api/encounters/{encounterId}/soap` — **a completely separate persistence path with no track-changes, no version history, and no shared permission model with the unified system.**

## What is working well
- Server-side permission enforcement on **every** unified-notes API route (`requireActor()` + explicit `canAuthor`/`canEditNote`/`canSign`/`canAddendum`/`canReviewChanges` checks) — this is genuinely production-grade access control logic.
- Signed-note immutability is enforced redundantly at UI, API, and service layers — correct defense-in-depth for a clinical-safety requirement ("signed notes that can still be silently edited").
- Word-level diff + colorized track-changes overlay + accept/reject-with-rebase is a sophisticated, well-designed collaborative editing model, rare to see this well-built in a demo-stage app.
- Every mutating action (create, edit, sign, addendum, accept/reject revision, comment) is wrapped in `withAudit()`, writing to a Prisma `AuditEvent` table with agent, action, outcome, entity type/ID.
- A Prisma schema for the full notes model already exists and is schema-complete, meaning the persistence migration is a matter of wiring, not redesign.

## Main problems
- **Phase 1 in-memory persistence**: all notes are lost on every server restart (one seed note only). This is explicitly acknowledged in the code/comments, not hidden.
- **Two disconnected notes systems** for what should be one clinical-documentation feature — a SOAP note authored via `/doctor/encounters/[encounterId]/soap` does not get track-changes, does not appear in the unified sign/amend workflow, and uses a separate API route (`/api/encounters/{encounterId}/soap`) with its own (unverified in this pass) permission model.
- **No co-sign / multi-signature workflow** — only a single `signedBy`/`signedAt` pair; no way for a resident's note to require attending co-signature, a common real-world requirement.
- **No slash-commands or smart phrases** — only button-triggered whole-template insertion (SOAP/Progress/Nursing/Medication Review/Lab Annotation/Administrative/Consult templates).
- **No offline-state handling** documented for the editor (autosave failures show "Save failed" but no offline queueing/retry visible in this pass).
- **`NoteComment` model exists in Prisma and API (`/api/notes/{noteId}/comments`) but the UI for browsing/creating comments was not confirmed to be fully wired** in this pass.

## Major layout improvements to build
1. Merge the SOAP editor into the unified Notes system (treat SOAP as one of the existing `NoteType`s, which it already is in the permission matrix) rather than maintaining a second persistence path.
2. Wire the Prisma-backed repository in place of `service.mock.ts` before any real clinical use.
3. Add a co-sign workflow (extend `NoteRevision`/note status to support "pending co-signature").

## Minor visual improvements to build
- Surface the comments UI fully (author, anchor position, resolve/reply) if not already complete.
- Add a persistent "autosave last succeeded at HH:MM:SS" indicator near the Save/Sign controls.

## Missing tools or sections
Slash-commands/smart phrases, co-sign, version rollback ("revert to version" is explicitly not implemented — history is append-only, which is actually correct for audit integrity, but a "restore as new draft from this version" action is still missing).

## Button and link review

| Control | Current behavior | Expected behavior | Destination or action | Problem |
|---|---|---|---|---|
| "Sign note" | Visible only if no pending revisions and status is draft; `POST /api/notes/{id}/sign` | Same | API | Correct guard logic |
| Template insert buttons | Insert full template text | Same | n/a | No slash-command alternative |
| "Add addendum" | Visible only on signed notes; `POST /api/notes/{id}/addendum` | Same | API | Correct guard logic |
| Track-changes "Accept"/"Reject" | Per-revision accept/reject, full or partial by op ID | Same | API with automatic rebase | Correctly implemented |
| SOAP "Save & Sign Note" | Requires ≥1 of 4 sections filled; `POST /api/encounters/{id}/soap` | Should route through unified sign workflow | Separate API | **Disconnected from unified permissions/audit/track-changes** |

## Recommended page sections
1. Patient/encounter context banner (allergies, risk)
2. Note type + template picker
3. Editor with live track-changes overlay
4. Pending-revisions review (accept/reject)
5. Sign / addendum controls
6. Revision history (immutable)
7. Comments

## Clinical and FHIR requirements
Map to `Composition` and/or `DocumentReference` for interoperability export; map audit events to `Provenance`. Ensure `NoteRevision`/`NoteAddendum` are represented in any FHIR export as `Provenance.entity` chains, not silently dropped.

## Accessibility improvements
Confirm keyboard operability of the Tiptap toolbar (bold/italic/lists/headings) and that track-changes color+strikethrough/underline is not the *only* signal (add textual "Added"/"Deleted by {author}" — already present via `title` attribute, but `title` tooltips are not reliably screen-reader accessible; consider visually-hidden text as a supplement).

## Responsive improvements
Not confirmed in this pass; the editor toolbar likely needs to wrap or collapse into an overflow menu on narrow viewports.

## Performance improvements
600ms debounce on autosave is reasonable; once backed by Postgres, add optimistic concurrency handling (the rebase logic already anticipates concurrent authors, which is good).

## Security and permission improvements
This subsystem is the strongest security model in the app — server-side permission checks on every route, immutable audit trail, three-layer signed-note protection. **Use this as the reference pattern** when hardening Orders/Prescriptions, which currently have none of these protections.

## Priority
**Critical** — clinical documentation integrity (signed-note immutability, audit trail) is foundational; the in-memory persistence and the disconnected SOAP editor are the two blocking issues before real use.

## What to build next on this page
1. Wire the existing Prisma schema to replace `service.mock.ts`.
2. Retire or merge `SOAPNoteEditor`/`/api/encounters/{id}/soap` into the unified notes API.
3. Add co-sign workflow.
4. Fully wire the comments UI if incomplete.
5. Add slash-command template insertion.

## What page should be reviewed or built after this one
**Orders and Results** — because signed notes often reference orders/results, and neither Orders nor Prescriptions currently have any of the audit/permission rigor built for Notes; that rigor should be extended to them next.

---

# Page: Orders and Results

## Route
Lab Order Composer: reached via "Order Lab" from Patient Overview (`/dashboard/orders/labs/new?patientId=`). Results review: `LabResultsIntelligenceClient`/`LabResultDetailClient` reached via "View All Results"/result links. Order detail: `/doctor/orders/[orderId]`.

## Main purpose
Let a doctor search a lab catalog, select tests with clinical rationale and specimen/priority details, submit the order, and later review/interpret the results with trend context.

## Current page summary
`LabOrderComposer` is a genuinely well-designed multi-step UI (stepper: Search → Select → Details → Safety → Review → Submit) with a real lab catalog, panel grouping, patient-friendly instruction generation, and a "safety warnings" box that checks for duplicate recent orders (via `localStorage`) and a missing clinical reason. `LabResultsIntelligenceClient` shows trend charts and a rules-of-thumb "AI analysis" (e.g., flags elevated troponin as "Urgent — consult cardiology"). `/doctor/orders/[orderId]` shows a single mock procedure's detail.

## What is working well
- The stepper UX and safety-warning box are strong interaction-design patterns, and the duplicate-order check (even though `localStorage`-based) demonstrates the *right instinct*.
- The troponin/urgent-result branching logic in `analyzeTestData()` correctly recognizes clinically time-sensitive results and recommends escalation language.
- `getDiagnosticReportsByPatient`/`getServiceRequestsByPatient` FHIR-search functions already exist and are correctly parameterized (`patient`, `_sort: -date`, `_count`).

## Main problems (clinical-safety critical)
- **`submitOrderFinal()` writes only to `localStorage`** — no `ServiceRequest` FHIR resource is ever created, no server-side persistence, no transmission to a lab system. An order a doctor believes they "submitted" exists only in that browser's local storage.
- **No allergy/interaction checking on lab orders** (arguably less critical than for meds, but contrast/specimen-related flags — e.g., iodine allergy before a contrast study — are entirely absent).
- **No signature/prescriber-identity binding** on the order — no captured "ordered by Dr. X at timestamp Y."
- **No audit logging** — `logAuditEvent`/`withAudit` is never called from the Lab Order Composer.
- **Results are 100% hardcoded mock metrics** (`initialMetrics` object) with a rules-of-thumb string-based "AI analysis," not a real clinical decision support engine — the "Urgent — consult cardiology" language could create false confidence if mistaken for a validated CDS alert.
- **`LabResultDetailClient` has literal placeholder text** (`"List placeholder"`, `"Summary placeholder"`) still in the shipped component.
- **`ClinicalAlert` component (`drug-drug`, `drug-allergy`, `dose-range`, `duplicate-therapy`, `guideline-recommendation`, `contraindication` types, with full audit-metadata support) exists in the design system but is never instantiated anywhere in the order or prescription flow** — a fully-designed safety-alert system sitting unused.

## Major layout improvements to build
1. Replace `localStorage`-only submission with real `ServiceRequest` creation via `fhirCreate()` (the function already exists in `fhir-client.ts` and is unused).
2. Instantiate the existing `ClinicalAlert` component for lab-order and prescription safety warnings instead of ad hoc `useMemo` warning arrays.
3. Add audit logging (`withAudit`) to order submission, matching the Notes system's pattern.
4. Complete `LabResultDetailClient` (remove "placeholder" text; wire real aside/list/summary content).
5. Expand the Labs tab / result detail to traverse `DiagnosticReport.result` → `Observation` for actual values (cross-reference with the Health Record Detail page finding).

## Minor visual improvements to build
Add a persistent "ordered by / signed at" line once signature capture exists; label the AI analysis panel explicitly as "rules-based guidance — not a validated CDS alert" until a real CDS engine is wired.

## Missing tools or sections
Order status tracking against a real lab system, critical-result acknowledgment workflow, patient-notification-of-results tracking, linking a result directly into a note.

## Button and link review

| Control | Current behavior | Expected behavior | Destination or action | Problem |
|---|---|---|---|---|
| "Add" (test/panel) | Adds to selection; checks `localStorage` for recent duplicate | Same, ideally server-checked | Client state | Duplicate-check is per-browser only |
| "Generate simple patient instructions" | Auto-fills instructions text | Same | Client state | None |
| "Review & Submit" | Advances stepper | Same | Client state | None |
| Final submit (Review step) | Saves to `localStorage`, shows transient "sent" confirmation | Should create FHIR `ServiceRequest` and persist server-side | `localStorage` only | **Critical — no real persistence** |

## Recommended page sections
1. Patient/allergy/risk context
2. Test search/catalog + panels
3. Clinical reason + specimen/priority details
4. Safety checks (real `ClinicalAlert` instances)
5. Review & sign
6. Status tracking / results linkage

## Clinical and FHIR requirements
`ServiceRequest` (orders), `DiagnosticReport` + `Observation` (results), `Provenance`/`AuditEvent` (who ordered/signed), `AllergyIntolerance` (contrast/specimen safety checks).

## Accessibility improvements
Ensure the multi-step stepper announces step changes to screen readers (`aria-current="step"` pattern); label safety-warning icons with text, not color alone.

## Responsive improvements
Stepper likely needs a condensed mobile variant (numbered dropdown instead of horizontal stepper); not confirmed in code.

## Performance improvements
Once backed by FHIR, cache `DiagnosticReport`/`ServiceRequest` reads with the same 30s pattern used elsewhere; virtualize the lab catalog if it grows large.

## Security and permission improvements
Add `canOrder`-style server-side permission checks (mirroring the Notes system's `canAuthor`/`canSign` pattern) and audit logging before this can be used with real patients.

## Priority
**Critical** — an order workflow that never actually creates a durable, transmittable order is the single largest clinical-safety/functional gap identified in this review.

## What to build next on this page
1. Wire `fhirCreate('ServiceRequest', …)` on submit.
2. Add audit logging to order submission.
3. Instantiate `ClinicalAlert` for real safety warnings.
4. Remove placeholder text in `LabResultDetailClient`.
5. Add real lab values to result views.

## What page should be reviewed or built after this one
**Prescriptions and Medications** — it shares the exact same architectural gap (localStorage-only submission, unused `ClinicalAlert`, no audit logging) and is higher-risk because it involves medication dosing.

---

# Page: Prescriptions and Medications

## Route
Prescription Composer: `/dashboard/prescriptions/new?patientId=` (reached via "Prescribe" on Patient Overview). Medication history: reached via "View Medication History."

## Main purpose
Let a doctor search a medication catalog, specify SIG/dose/quantity/refills/pharmacy, review safety warnings, and sign/send a prescription; separately, let a doctor review a patient's medication history and renew/reconcile.

## Current page summary
`PrescriptionComposerSerene` is a 4-step stepper (Search → Details → Safety → Review) over a small hardcoded medication catalog (6 drugs) and 3 hardcoded pharmacies, with autosave-to-`localStorage` every 900ms and a final "Sign & Send" (`finalize()`) that also only writes to `localStorage`. `MedicationHistoryClient` shows summary tiles, a filterable medication list, a detail panel (prescriber/indication/related lab/start date), and Overview/Timeline/Refills/Notes/Safety tabs — the Safety tab shows static green checkmarks ("No major interactions found", "No duplicate therapy found") that are not backed by a rules engine.

## What is working well
- The 4-step stepper and autosave draft pattern are good interaction design.
- Allergy-name matching against `patient.allergies` before submission is a real (if minimal) safety check.
- Medication History's tabbed detail panel (Overview/Timeline/Refills/Notes/Safety) is a sensible information architecture for reconciliation work.

## Main problems (clinical-safety critical — highest severity in the whole review)
- **`finalize()` writes only to `localStorage`** and shows the alert **"Prescription saved to local history (dev)"** — this is an explicit, developer-visible acknowledgment that no real prescription is ever transmitted anywhere. No `MedicationRequest` FHIR resource is created; `fhirCreate` exists but is unused for this purpose.
- **No signature capture** — "Sign & Send" does not bind a prescriber identity, credential, or timestamp to the order beyond the client-side `ts: Date.now()`.
- **No drug–drug interaction checking, no duplicate-therapy detection, no dose-range validation, no contraindication rules** — the only check is `allergies.includes(s.name)`, an exact case-sensitive string match with no RxNorm/ingredient-level matching, so a patient allergic to "penicillin" would not be flagged for a prescription of "Amoxicillin" (a penicillin-class drug) since the strings don't match.
- **The "Multiple medications: review interactions" message is a static string**, shown whenever more than one drug is selected, regardless of whether any real interaction exists — this can create false reassurance or false alarm, neither of which is clinically useful.
- **Medication History's Safety tab checkmarks ("No major interactions found") are hardcoded, not computed** — this is a serious finding: a doctor could reasonably read a green checkmark as a validated safety confirmation when it is, in fact, static markup with no underlying rule evaluation.
- **No audit logging** on any prescription action.
- **PharmacyMS exists as a separate Go microservice in the workspace but is never called** by the EHR frontend — the 3 pharmacy choices are hardcoded, disconnected from the real service that presumably exists to receive/process prescriptions.
- **"Renew Prescription" button in Medication History has no defined action.**

## Major layout improvements to build
1. **Do not allow this composer to be used with real patients until `MedicationRequest` creation, real interaction/allergy/dose checking, and signature capture are implemented** — flag this clearly to product/clinical stakeholders as a go/no-go gate, not a nice-to-have.
2. Replace the static "No major interactions found" Safety tab with real computed results (or, if no rules engine exists yet, replace the checkmark UI with an explicit "Not yet checked — manual review required" state so it cannot be mistaken for a passed safety check).
3. Wire the existing `ClinicalAlert` component with real severity levels for allergy/interaction/dose findings.
4. Integrate with the PharmacyMS service (or explicitly document that it is out of scope) instead of hardcoding 3 fake pharmacies.

## Minor visual improvements to build
Replace the exact-string allergy match with at least an ingredient-family-aware check (e.g., penicillin-class); label the autosave indicator clearly ("Draft saved locally — not yet sent").

## Missing tools or sections
Real interaction/dose/duplicate-therapy checking, signature capture, pharmacy integration, audit logging, refill-request workflow, medication reconciliation against an external source-of-truth.

## Button and link review

| Control | Current behavior | Expected behavior | Destination or action | Problem |
|---|---|---|---|---|
| "Add" (medication) | Adds to selection | Same | Client state | None |
| SIG/Quantity/Refills inputs | Editable | Same | Client state | No validation against dosing limits |
| "Proceed to Send" | Advances stepper | Same | Client state | None |
| **"Sign & Send"** | `finalize()` → `localStorage` only, alert "saved to local history (dev)" | Create FHIR `MedicationRequest`, capture signature, audit log, transmit to pharmacy | Nowhere durable | **Critical — prescription is never actually sent** |
| "Renew Prescription" (Medication History) | No defined action | Create renewal `MedicationRequest` | Undefined | **Dead button** |
| "Message Patient" | Navigates | Same | `/dashboard/records/{id}/messages` | None |

## Recommended page sections
1. Patient/allergy/risk context
2. Medication search
3. Dose/route/frequency/duration/quantity/refills/pharmacy details
4. Safety checks (real interaction/allergy/dose engine)
5. Review & sign (with captured signature/timestamp/prescriber identity)
6. Transmission status (to pharmacy)

## Clinical and FHIR requirements
`MedicationRequest` (new prescriptions), `MedicationStatement` (patient-reported current meds), `AllergyIntolerance` (real checking), `Provenance` (signature/audit). Map to RxNorm codes for interaction/allergy-class checking rather than free-text drug names.

## Accessibility improvements
Ensure the safety-warning panel is announced via `role="alert"`/`aria-live` when new warnings appear after adding a medication.

## Responsive improvements
Not confirmed; stepper likely needs mobile-condensed treatment as with the Lab Order Composer.

## Performance improvements
Once real, cache RxNorm/interaction-database lookups; the medication catalog (currently 6 hardcoded drugs) will need search-as-you-type against a real formulary.

## Security and permission improvements
Add `canPrescribe` server-side permission check (there is no such check anywhere in this flow currently) and audit logging before any real use.

## Priority
**Critical** — the combination of "no real interaction/dose checking," "static false-positive/negative safety messaging," and "prescription never actually transmitted" makes this the single highest clinical-risk page in the application if it were ever used with real patients before remediation.

## What to build next on this page
1. Implement real `MedicationRequest` creation via `fhirCreate`.
2. Replace static Safety-tab checkmarks with a real (or explicitly "not yet checked") state.
3. Add RxNorm-aware allergy/interaction/duplicate-therapy checking.
4. Add signature capture + audit logging.
5. Either integrate PharmacyMS or clearly document pharmacy transmission as out of scope for this phase.

## What page should be reviewed or built after this one
**Messages, Tasks, and Referrals** — the next layer of doctor coordination workflows, several of which (Tasks, Referrals) do not exist at all yet.

---

# Page: Messages

## Route
`/dashboard/records/[id]/messages`

## Main purpose
Let a doctor exchange secure messages with a patient about their care, including internal (staff-only) notes not visible to the patient.

## Current page summary
`MessagesClient` renders a conversation list (with tags: Unread, Needs Reply, Urgent, Labs, Meds) and a thread view supporting patient/clinician messages, draft replies, internal notes (visually distinct, yellow), templates, attachments, and a "create task" modal (client-side only, not persisted).

## What is working well
- Internal-note visual distinction (yellow highlight, "not visible to patient") is the correct pattern for a mixed clinician/patient thread.
- Tagging system (Unread/Needs Reply/Urgent/Labs/Meds) gives useful triage signal.
- Draft support before sending is present.

## Main problems
- **No FHIR `Communication` resource mapping** — messages are not persisted as structured, interoperable clinical communications.
- **No audit logging** — `logAuditEvent` is never called from the Messages page or its API, a PHIPA-relevant gap since this page transmits PHI in free text.
- **No page-level role check found in this pass** — access is inherited entirely from the `/dashboard` route family in middleware, with no explicit server-side check that only the patient's own care team should see this thread.
- The in-message "create task" modal creates a client-side-only task, feeding into the same non-persisted Tasks gap described below.

## Major layout improvements to build
Add `logAuditEvent` calls on message send/view; add an explicit server-side check that the requesting doctor is part of this patient's care team (not just "any authenticated DOCTOR").

## Minor visual improvements to build
Add read/delivered status indicators; add consent/context banner reminding staff this channel may not be appropriate for urgent clinical matters.

## Missing tools or sections
FHIR `Communication` persistence, audit trail, consent tracking, message search.

## Button and link review

| Control | Current behavior | Expected behavior | Destination or action | Problem |
|---|---|---|---|---|
| "Message" (Patient Overview header) | Navigates | Same | `/dashboard/records/{id}/messages` | Works |
| Create-task (in-thread modal) | Creates local-only task | Should create real `Task` | Client state only | No persistence |

## Recommended page sections
1. Patient context banner
2. Conversation list with tags/filters
3. Thread view (patient + internal notes distinguished)
4. Templates/attachments
5. Audit trail

## Clinical and FHIR requirements
`Communication` (messages), `Consent` (if patient messaging requires opt-in), `Provenance`/`AuditEvent`.

## Accessibility improvements
Ensure internal-note color distinction has a text label as well ("Internal note — not visible to patient" — appears to already be present per the research; confirm it's not color-only).

## Responsive improvements
Not confirmed in this pass.

## Performance improvements
Not confirmed; conversation list should paginate/virtualize once message volume grows.

## Security and permission improvements
Add explicit care-team-membership check server-side; add audit logging for every read/send (PHI exposure).

## Priority
**High** — PHI is exchanged here with no audit trail, which is a compliance gap even though the feature itself works.

## What to build next on this page
1. Add audit logging on send/view.
2. Add explicit care-team/role check server-side.
3. Persist the in-thread "create task" action to a real Task record once Tasks exist.

## What page should be reviewed or built after this one
**Tasks** — directly referenced by this page's task-creation modal, and currently entirely unimplemented.

---

# Page: Tasks

## Route
**None exists.** `UpcomingTasksCard` on Patient Overview and the Messages "create task" modal both imply a Tasks feature, linking to `/dashboard/records/{id}/tasks` and `/tasks`, neither of which resolves to a real page.

## Main purpose (intended)
Track clinical follow-up work items (e.g., "Lipid Panel due," "Call patient re: refill") with due dates, priority, assignment, and completion status.

## Current page summary
Only a mock data shape exists (`patient.clinicalTasks`: `{ id, title, dueDate, priority, assignedTo, status, relatedTo }`), rendered read-only inside `UpcomingTasksCard` on Patient Overview. There is no create/complete/reassign workflow, no dedicated list page, and no FHIR `Task` integration.

## Main problems
This is a fully missing feature masquerading as a partially-built one: buttons and links referencing it exist ("Create Follow-up Task," "View All Tasks," the Messages create-task modal), but none of them lead anywhere real.

## What should be built next
1. Build a real Tasks list page (`/dashboard/tasks` or `/doctor/tasks`) with assigned-to-me, due-date, priority, and overdue filtering.
2. Back it with a FHIR `Task` resource (or an interim Prisma model, mirroring the `ClinicalNote` pattern already proven in the Notes system).
3. Wire the existing "Create Follow-up Task," "Create Task" (Patient Overview More menu), and Messages create-task modal to actually create these records.
4. Add completion/reassignment actions with audit logging.

## Clinical and FHIR requirements
`Task` (with `for`, `owner`, `requester`, `status`, `priority`, `executionPeriod`), optionally linked to `Encounter`/`Observation`/`ServiceRequest` via `Task.focus`.

## Priority
**High** — multiple existing UI entry points already promise this feature; leaving them as dead links actively erodes trust in the rest of the app.

## What page should be reviewed or built after this one
**Referrals** — the same "promised but not implemented" pattern applies there too.

---

# Page: Referrals

## Route
**None exists.** Patient Overview's "More" menu includes "Create Referral" linking to `/dashboard/records/{id}/referrals/new`, which does not resolve.

## Main purpose (intended)
Let a doctor create and track a referral to a specialist/organization, including triage, missing-document tracking, priority, and scheduling follow-up.

## Current page summary
Only enum states exist in the Cardiology domain model (`REFERRAL_RECEIVED`, `REFERRAL_REVIEW`) and one documentation mention of a "Referral → Scheduling → Arrival → Nursing → Physician" workflow — neither is generalized into an actual page, API route, or FHIR mapping for the wider EHR.

## Main problems
Same as Tasks: a visible, clickable "Create Referral" menu item leads nowhere.

## What should be built next
1. Build a Referrals workspace with new/triage/status views.
2. Map to FHIR `ServiceRequest` (referral pattern: `intent: order`, `category: referral`).
3. Wire the existing "Create Referral" menu item once the page exists.
4. Add specialist/organization directory, missing-document checklist, and follow-up scheduling.

## Clinical and FHIR requirements
`ServiceRequest` (referral), `Organization`/`PractitionerRole` (specialist target), `DocumentReference` (supporting documents), `Task` (follow-up).

## Priority
**High** — same reasoning as Tasks: an existing, visible dead link.

## What page should be reviewed or built after this one
Return to **Doctor Experience — Shared Improvements** below, since Tasks and Referrals are the last individually-reviewable pages and the remaining work is cross-cutting.

---

# Doctor Dashboard review (consolidated checklist)

| Expected element | Present? | Notes |
|---|---|---|
| Patient search | ❌ | Global header search exists but is not dashboard-scoped/MRN-optimized |
| Today's appointments | ✅ | `TodayAppointmentsCard`, mock data |
| Urgent alerts | ✅ | `UrgentAlertsCard`, mock data, acknowledge workflow |
| Waiting patients | ⚠️ Partial | "Waiting Now" summary count only, no list |
| Results requiring review | ⚠️ Partial | Count only via Action Center, no inline list |
| Notes requiring signature | ⚠️ Partial | Count only via Action Center ("Unsigned notes") |
| Prescription requests | ❌ | Not present on dashboard |
| Orders awaiting signature | ⚠️ Partial | Count only via Action Center |
| Messages | ❌ | Not surfaced on dashboard |
| Tasks | ✅ | "My Queue" tab (mock) |
| Referrals | ❌ | Not present anywhere in the app |
| Room status | ⚠️ Placeholder | "Rooms" tab is an explicit stub |
| Recent patients | ❌ | Not present |
| Quick actions | ✅ | Header nav buttons |
| Notification center | ❌ | No toast/notification system; uses `alert()`/`confirm()` |

**What should be built next (without changing the page):** a real "needs attention" module combining unsigned notes, critical results, and orders awaiting signature into an actionable inline list (not just counts); a recent-patients list; a real notification/toast system to replace `alert()`/`confirm()`.

---

# Doctor Appointments page review (consolidated checklist)

| Expected element | Present? | Notes |
|---|---|---|
| Day view | ✅ | `SchedulingCalendarClient` "Today" |
| Week view | ✅ | 7-day grid |
| List view | ✅ | "All" flat list |
| Provider schedule | ⚠️ Partial | Provider filter dropdown, not a per-provider schedule board |
| Room view | ❌ | Not present |
| Search | ✅ | Free-text search |
| Date filter | ✅ | Prev/Today/Next cursor navigation |
| Appointment status filters | ✅ | 7-status multi-select |
| Check-in | ✅ | `TodayAppointmentsCard` |
| Start encounter | ❌ | Not present anywhere in appointments UI |
| Reschedule | ⚠️ Partial | Auto-only, no user slot choice |
| Cancel | ✅ | With native `confirm()` |
| No-show | ❌ | Status filterable but no action to set it |
| Booking workflow | ✅ | Two-pane `CalBookingClient`, but patient capture via `prompt()`/basic search |
| Appointment details | ✅ | Modal |
| Patient context | ⚠️ Partial | Name/time/provider/type only, no allergy/risk shown |
| Waitlist | ❌ | Not present |
| Conflict detection | ❌ | Not evidenced |
| Reminder status | ❌ | Not present |
| Loading and empty states | ⚠️ Partial | Present in dashboard widgets; not confirmed in `SchedulingCalendarClient`/`CalBookingClient` |

**What should be added or improved next:** Start Encounter action, user-selectable reschedule, No-show action, patient allergy/risk context in appointment details, conflict detection, reminder-status column.

---

# Doctor Health Records page review (consolidated checklist)

| Expected element | Present? | Notes |
|---|---|---|
| Patient search | ❌ | Absent from list page |
| MRN search | ❌ | Absent |
| Recently viewed patients | ❌ | Absent |
| Assigned patients | ⚠️ Unclear | List appears clinic-wide, not confirmed "assigned to me" filter |
| High-risk patients | ✅ | Priority sort + doughnut chart |
| Patient list | ✅ | Table |
| Filters | ❌ | Only a medications-visibility toggle, no state/priority filter |
| Patient details | ✅ | Detail page (FHIR + mock fallback) |
| Medical history | ✅ | On detail page |
| Conditions | ✅ | Conditions tab |
| Allergies | ✅ | Allergies tab (strong NKDA/critical pattern) |
| Immunizations | ⚠️ Not confirmed on this page | Present on Patient Overview instead |
| Medications | ✅ | Medications tab |
| Results | ✅ | Labs tab (metadata only, no values) |
| Notes | ✅ | Notes tab (base64 attachment rendering) |
| Documents | ✅ | Via DocumentReference in detail |
| Timeline | ❌ | Not on this page (exists on Patient Overview instead) |
| FHIR data | ✅ | Detail page has genuine FHIR-first fetch |
| Audit history | ⚠️ Logged, not shown | `logAuditEvent` write exists; no viewer on this page |
| Data freshness | ✅ | Amber banner on FHIR fallback |
| Permissions | ✅ | Server-side role check present |
| Empty and error states | ⚠️ Partial | List page has none; detail page has the FHIR-fallback banner |

**What should be added or improved next:** search/filter on the list page, actual lab values (not just metadata) on the detail page, and a visible audit-history viewer.

---

# Doctor Experience — Shared Improvements

- **Navigation:** Consolidate the three parallel patient-chart implementations (`/dashboard/records/[id]`, `/doctor/patients/[visitId]`, `/patients/[patientId]/*`) into one. Fix the dead `/profile` header link. Bind all hardcoded clinician-name displays ("Dr. Sarah Lee," "Dr. Alice Chen") to the authenticated session.
- **Search:** Add a single, MRN-aware patient search available from every doctor page (dashboard, health records list, appointments), not just a generic global search box.
- **Patient context:** Standardize a single "patient context header" component (identity, MRN, DOB, allergies, risk, verification, last-updated) and require every doctor-facing patient page to use it, instead of each page inventing its own summary layout.
- **Action bars:** Standardize the primary-action set (Start Encounter, Order Lab, Prescribe, Message, More) across every place a patient is shown, and visually distinguish implemented vs. unimplemented "More" menu items.
- **Notifications:** Replace all `window.alert()`/`window.confirm()`/`window.prompt()` calls (found in the Dashboard, Appointments, Lab Order Composer, and Prescription Composer) with an accessible toast/dialog system.
- **Status colors:** A shared status-color/badge mapping already exists in several components (`STATUS_CLASS` patterns repeat near-identically in `UpcomingTasksCard` and `CareGapsCard`) — extract into one shared design-system utility instead of duplicating per-component.
- **Date and time formatting:** Multiple inconsistent formatting calls (`toLocaleTimeString`, `toLocaleString`, `toLocaleDateString` with different options) should be centralized into shared formatter utilities.
- **Empty/error/loading states:** Present and well-written in most Patient Overview cards and Dashboard widgets; absent on the Health Records list page and several Doctor Patient/Urgent Detail data refreshes (which silently swallow fetch errors). Standardize a shared `WidgetEmptyState`/`WidgetLoadingSkeleton`/error pattern (already exists — just not applied everywhere).
- **Responsive layouts:** Not verified via live browser in this pass for any page; recommend a dedicated responsive QA pass at desktop/tablet/mobile breakpoints once dead links and data-layer issues are fixed.
- **Accessibility:** Recurring gaps across nearly every page: missing `role="tab"`/`aria-selected` on custom tab bars, color-only status indicators without text/aria-label, native `confirm()`/`prompt()` dialogs, incomplete focus-ring styling.
- **Permission handling:** The Notes system's `requireActor()` + explicit `canX()` server-side check pattern is the strongest in the app and should be replicated for Orders, Prescriptions, Tasks, and Referrals once built.
- **Authentication behavior:** The `devAllowed` middleware bypass list, `?asUser=`, `?playwright=1`, and `x-playwright` header bypasses are all gated on `NODE_ENV !== 'production'`, but there is no logged warning when they fire and no additional safeguard if `NODE_ENV` is ever misconfigured in a deployed environment. This is the single highest-severity **security** finding in the review.
- **Audit history:** Excellent, consistent pattern in the Notes system and on `/doctor/health-records/[visitId]`; completely absent from Messages, Orders, and Prescriptions, which is inconsistent for a single application.
- **FHIR inspectors:** No dev-mode "raw FHIR resource" inspector was found anywhere in the doctor UI; consider adding one (dev-only) to speed up future FHIR-integration debugging.
- **Performance:** No virtualization/pagination found on any list (patient lists, timeline, medication catalogs); fine at current mock-data scale, will not be fine at real-world scale.
- **Monitoring:** No Sentry/Prometheus references found in the doctor-facing code paths reviewed.
- **Testing:** Only 7 test files exist in the whole `ehr` app, and only 2 are doctor-related (`tests/e2e/cardiology.spec.ts`, `test/cardiology.test.ts`); no Playwright coverage found for appointment booking, note signing, order submission, or prescription submission.

---

# Technical review checklist

## Notes and audit persistence
- **PostgreSQL/Prisma migrations:** Schema (`ClinicalNote`, `NoteRevision`, `NoteComment`, `NoteAddendum`, `AuditEvent`) already exists and is schema-complete; `service.mock.ts` is the current runtime, not Prisma. **Next step: wire the repository, not redesign the schema.**
- **Immutable versions / append-only audit history:** Already implemented correctly for Notes (`revisionHistory` push-only, `AuditEvent` create-only). Not yet extended to Orders/Prescriptions/Messages.
- **Signed-note protection:** Already implemented at 3 layers for Notes. Not applicable yet to Orders/Prescriptions since they have no "signing" persistence at all.

## Permissions
- `serverAuth()` equivalent (`requireActor()`/`isActor()`) exists and is used consistently across all Notes API routes.
- `permissions.canView/canEdit/canSign` exist for Notes (`canAuthor`, `canEditNote`, `canSign`, `canAddendum`, `canReviewChanges`). **`canPrescribe` and `canOrder` do not exist anywhere in the codebase** — this should be built before Orders/Prescriptions are hardened.
- Backend enforcement on doctor routes: strong for `/doctor/health-records/[visitId]` and all `/api/notes/**`; weak-to-absent for Orders, Prescriptions, Messages, and (not independently confirmed) `/dashboard/records/[id]`.

## Testing
Recommend Playwright coverage for: appointment booking, check-in, start encounter (once built), note creation, note autosave, note signing, revision accept/reject, result acknowledgment (once built), prescription review/sign (once built), back navigation, session restoration. Currently **none of these flows have E2E coverage** based on the 7 test files found.

## Monitoring
No Prometheus/Sentry/route-performance/API-latency/failed-save/failed-export/WebSocket-health monitoring was found anywhere in the doctor-facing code paths reviewed. This should be planned for Phase 4 (see roadmap).

## Performance
Lazy loading, route-level code splitting, and Cal.com iframe lazy-loading are all currently absent (the Cal.com iframe loads unconditionally on the Appointments page). Caching exists only via the FHIR client's 30s `revalidate` on GET reads. No pagination/virtualization found on any list.

## Real-time UX
No WebSockets/SSE found anywhere in the doctor-facing code. Urgent alerts, appointment changes, queue updates, new results, and message notifications are all currently manual-refresh-only.

## Security
- HTTPS/secure-cookie/CSP/secret-rotation/env-var-management were not directly inspected in this pass (out of scope of the file set reviewed) and should be covered in a dedicated infra/security review.
- CSRF: not confirmed either way in this pass.
- **Session/auth dev-bypasses** (`asUser`, `x-playwright`, `devAllowed` routes) are the most significant concrete finding — see Shared Improvements above.
- PHI-safe logging: `logAuditEvent` stores `entityType`/`entityId`/`description`/`detail`, not raw PHI content — this is a reasonable pattern, but was not verified against every call site for accidental PHI leakage in the `detail` field.

## Data export
`mapNoteToFHIR`/`mapRiskProfileToFHIR`/`fhir/mappers.ts` exist for outbound mapping in a few places (SOAP notes, risk profile). No generalized `Composition`/`DocumentReference` export, signed-PDF, or JSON-download feature was found for the unified Notes system. No export-audit-event pattern confirmed.

---

# Final roadmap

## Phase 1 — Critical clinical safety and routing
**Goals:** Make the app safe to demo/pilot without silently misleading a clinician.
**Pages involved:** Doctor Dashboard, Patient Overview, Lab Order Composer, Prescription Composer, all pages with dead "View All"/"More menu" links.
**Main tasks:** Fix the hardcoded "Open" appointment link; fix/remove the 10+ dead links identified across Patient Overview and PatientProfileHeader; replace static "No major interactions found"/"Medication conflict: None found" text with either real checks or an honest "not yet checked" state; add server-side role checks + audit logging to Patient Overview, Orders, and Prescriptions (matching the Notes/Health-Record-Detail pattern); lock down the `devAllowed`/`asUser`/`x-playwright` middleware bypasses so they cannot activate outside strict local dev.
**Dependencies:** None — these are the lowest-effort, highest-trust fixes.
**Risks:** Removing/hiding "More" menu items or footer links may look like feature regression to stakeholders unless communicated as "hiding not-yet-built features" rather than "removing features."
**Expected result:** No doctor-facing page presents a false affordance (a button/link that goes nowhere) or a false safety confirmation (a static "all clear" that isn't computed).

## Phase 2 — Core doctor workflows
**Goals:** Make Appointments, Encounters/Notes, Orders, Results, and Prescriptions actually persist and enforce permissions.
**Pages involved:** Doctor Appointments, Clinical Notes (unified), Lab Order Composer, Results, Prescription Composer.
**Main tasks:** Wire the existing Prisma schema for Notes; merge the SOAP editor into the unified Notes system; add `ServiceRequest`/`MedicationRequest` FHIR creation for Orders/Prescriptions; add `canOrder`/`canPrescribe` permission functions and server-side enforcement; add real RxNorm-aware allergy/interaction checking; add a Start Encounter action to Appointments; add real lab result values to the Labs tab.
**Dependencies:** Phase 1 (routing/permission scaffolding) should land first so new features aren't built on top of dead links.
**Risks:** Real interaction-checking requires a drug database/rules engine that does not currently exist anywhere in the codebase — likely the single largest net-new component in this phase.
**Expected result:** A doctor can book an appointment, start an encounter, write and sign a note, order a lab, and prescribe a medication, with each action durably persisted, permission-checked, and audit-logged.

## Phase 3 — Coordination workflows
**Goals:** Build the entirely-missing Tasks and Referrals features; extend audit logging to Messages; converge the three parallel patient-chart implementations into one.
**Pages involved:** Tasks (new), Referrals (new), Messages, Patient Overview, Doctor Patient/Urgent Detail (to be deprecated/merged).
**Main tasks:** Build `Task` and referral (`ServiceRequest`) backed pages; wire every existing "Create Task"/"Create Referral"/"View All Tasks" link to them; add audit logging to Messages; pick Patient Overview as the canonical patient chart and redirect the other two implementations into it (or explicitly retire them).
**Dependencies:** Phase 1's link inventory; Phase 2's permission patterns (`canX` functions) should be extended to Tasks/Referrals.
**Risks:** Converging three patient-chart implementations may surface data-shape mismatches (different mock `Patient`-like types across `mockPatients.ts`, cardiology `fetchVisitDetail`, and `patients/[patientId]` routes) that need reconciliation before deletion.
**Expected result:** No dead links remain anywhere in the doctor experience; a doctor sees one consistent patient chart regardless of entry point.

## Phase 4 — Performance and reliability
**Goals:** Prepare the app for real patient volumes and add operational visibility.
**Pages involved:** All list views (Health Records list, Appointments "All" view, Medication catalog, Clinical Timeline).
**Main tasks:** Add pagination/virtualization to lists; lazy-load the Cal.com iframe (or replace it); add Sentry error monitoring and Prometheus route/API-latency metrics; add Playwright E2E coverage for the workflows listed in the Technical Review Checklist; introduce a real-time layer (WebSockets/SSE) for urgent alerts, queue updates, and new results.
**Dependencies:** Phase 2 must have real backing data sources before performance work is meaningful (no point optimizing a mock-array render).
**Risks:** Real-time infrastructure is a nontrivial new dependency; scope carefully (start with urgent alerts only, expand later).
**Expected result:** The app behaves predictably under realistic data volumes and failures are visible to engineering, not just to the affected doctor.

## Phase 5 — Advanced capabilities
**Goals:** Move from "functionally correct" to "clinically differentiated."
**Pages involved:** AI Health Summary, Lab Results Intelligence, Clinical Notes.
**Main tasks:** Replace rules-of-thumb "AI analysis" text (troponin/lipid branching logic) with a real, validated clinical decision support integration, clearly labeled and audited as such; extend AI Health Summary with real model-backed generation (currently rule-based on mock fields) with clear provenance of what generated each statement; add co-sign workflows, organization-level note templates, and real-time note collaboration; add FHIR bulk export for population health/reporting use cases.
**Dependencies:** Phases 1–4 must be complete — advanced capabilities on top of mock data or unaudited safety checks would compound risk rather than reduce it.
**Risks:** Any AI-generated clinical content must be clearly labeled as such (the existing disclaimer in `AIHealthSummaryCard` is a good starting pattern to extend, not replace).
**Expected result:** The doctor experience differentiates on genuinely useful clinical intelligence, built on a foundation that is already safe, persistent, and auditable.

---

# Final summary table

| Page | Current quality | Main missing feature | Priority | What to build next |
|---|---:|---|---|---|
| Doctor Dashboard (`/doctor`) | Medium | Real backing data; fixed appointment "Open" link | High | Wire real Task/Flag data; fix hardcoded link; add signature/order queues inline |
| Doctor Appointments (`/doctor/appointments`) | Medium | Start Encounter action; real patient selection in booking | High | Add Start Encounter; replace `prompt()`-based booking; user-selectable reschedule |
| Doctor Health Records list (`/doctor/health-records`) | Low-Medium | Search/filter; MRN/DOB columns | High | Add search, filters, MRN/DOB, bind identity to session |
| Health Record Detail (`/doctor/health-records/[visitId]`) | Medium-High | Real lab values; fixed SOAP-note link | Critical | Fix SOAP link/ID mismatch; add lab values; add ARIA tab roles |
| Doctor Patient/Urgent Detail (`/doctor/patients`, `/doctor/urgent`) | Medium | Convergence with Patient Overview | High (urgent) / Medium | Converge to one patient chart; surface silent fetch failures |
| Patient Overview (`/dashboard/records/[id]`) | Medium-High | Real FHIR data; 10+ dead links fixed | Critical | Fix dead links; fix condition-ID slug bug; begin FHIR migration; add role check + audit log |
| Clinical Notes (unified + SOAP) | Medium-High | Persistent DB; merge two systems | Critical | Wire Prisma; merge SOAP into unified system; add co-sign |
| Lab Order Composer | Low | Real `ServiceRequest` persistence; real safety alerts | Critical | Wire `fhirCreate`; instantiate `ClinicalAlert`; add audit log |
| Results / Lab Results Intelligence | Low-Medium | Real lab values; labeled-as-rules-based AI text | High | Traverse `DiagnosticReport.result`; relabel AI analysis honestly |
| Prescription Composer | Low | Real `MedicationRequest`; real interaction checking; signature | Critical | Wire `fhirCreate`; add RxNorm-aware checks; add signature + audit log |
| Medication History | Medium | Real (not static) Safety tab | High | Replace static checkmarks with computed or "not yet checked" state |
| Messages (`/dashboard/records/[id]/messages`) | Medium | Audit logging; FHIR `Communication` mapping | High | Add audit log on send/view; add care-team check |
| Tasks | Missing | Entire feature | High | Build page + `Task` backing; wire existing dead links |
| Referrals | Missing | Entire feature | High | Build page + `ServiceRequest`(referral) backing; wire existing dead link |
| Doctor Analytics (`/doctor/analytics`) | Low | Real data | Low | Defer until core workflows are real |

---

*End of report. No pages were modified. No packages were installed. No tests were executed as part of this review.*
