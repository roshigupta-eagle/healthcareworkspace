# Health Trends — High Level Design

## Purpose
The Health Trends page provides clinicians with a longitudinal, clinically-safe view of patient measurements (vitals, labs, measurements) to support rapid assessment, trend interpretation, and safe clinical actions.

## Users
- Primary: physicians, nurse practitioners, clinical pharmacists
- Secondary: nurses, allied health, care coordinators

## Use Cases
- Quickly confirm the latest value and whether it is improving/stable/worsening
- Investigate measurement provenance (encounter, lab, device)
- Identify missing or stale monitoring (eg. no A1C in 12 months)
- Export a clinical trends report for handover or audit

## System Boundaries
- Reads canonical clinical data from FHIR-formatted Observation/DiagnosticReport resources (app-level file-backed stores in dev)
- Writes audit events using `logAuditEvent()` server helper
- Does not modify authoritative lab systems in this iteration

## Route
- Canonical route: /dashboard/records/:patientId/trends
- URL params: ?metric=<id>&range=<preset|custom>&point=<obs-id>

## Authentication & Authorization
- Server-side `auth()` guards the page and API routes
- Permission checks for actions: view, export, print, add, correct, review — enforced server-side and reflected in UI

## Metric categories
- Blood pressure (systolic/diastolic; components from same observation when available)
- Lipids (LDL, HDL, Total, Triglycerides)
- Weight & BMI
- Diabetes (HbA1c, Glucose)
- Renal (eGFR, Creatinine)
- Others (configured via metric registry)

## Chart strategy
- Default: one metric family at a time (eg. Blood Pressure family -> show systolic+diastolic with same unit)
- Small-multiples mode: separate aligned charts per metric with own y-axis
- Compare mode: two compatible series only, with explicit axis labeling
- No mixing of unrelated units on a single axis

## FHIR resources
- Observations as primary source; DiagnosticReport and ServiceRequest linked where applicable
- Export produces FHIR Bundles via `mapTrendsToFHIR()` helpers

## Data normalization
- Preserve original units; convert only when clinically validated (not auto-normalized)
- For BP, use Observation.component pattern when present

## Reference/target ranges
- Render patient or organizational target as shaded band with labeled source

## Selected-point workflow
- Selecting a point highlights chart, scrolls table, opens detail panel, and updates URL
- Keyboard: Left/Right/Home/End/Escape/Enter behavior implemented

## Export & Print
- Export dialog offers PDF/CSV/FHIR Bundle
- Export actions recorded in audit log
- Print uses dedicated print stylesheet and hides interactive controls

## Audit & Provenance
- All sensitive reads and exports call server-side audit helpers
- Provenance panel exposes performer, device, encounter, and correction history

## Data quality & missing data
- Show gaps for missing data; do not interpolate across long gaps
- Exclude entered-in-error by default (available via filter)

## Performance
- Range-limited queries, downsampling, lazy load details and FHIR inspector

## Accessibility
- WCAG 2.1 AA: semantic markup, keyboard support, live region announcements for refresh and errors
