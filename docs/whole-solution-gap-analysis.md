# Whole-Solution Gap Analysis — EHR + Pharmacy MS + LIMS

> Read-only audit. No code was changed. Author: Alex (FHIR SME Architect). Date: 2026-07-31.
> Companion to `docs/doctor-experience-review.md` (doctor-facing deep dive).

## 1. Architecture-level finding (most important)

The "solution" is three disconnected systems that do not talk to each other.

| System | Tech | Port | Persona served | Frontend? |
|---|---|---|---|---|
| EHR | Next.js 16 | 3000/3002 | Patient, Doctor, Nurse, Admin, Reception | Yes |
| Pharmacy MS | Go + chi | 8082 | Pharmacist (intended) | None |
| LIMS | Go + chi | 8083 | Lab technician (intended) | None |
| FHIR server | external | 8080 | shared data plane | n/a |

Evidence of siloing: a workspace-wide grep of `ehr/src` for `pharmacy`, `lims`, `8082`, `8083`,
`MedicationDispense` returns zero calls to either Go service. The EHR only talks to a FHIR server
at `localhost:8080` (`ehr/src/lib/fhir-client.ts`) and a cardiology API. The Go services expose
CORS "for EHR frontend" but nothing consumes them.

The integration designed but never wired: `ehr/src/app/api/lab-alerts/route.ts` says
"LIMS/PharmacyMS POST here when a critical result is detected." But LIMS' results handler only does
`slog.Warn("CRITICAL VALUE", ...)` with a comment "In production: publish to Redis..." — it never
POSTs to the EHR. The critical-value safety pipeline is a dead stub on both ends.

Top solution-level gaps:
1. No pharmacist UI and no lab-tech UI exist anywhere. Their backends exist as Go APIs; their personas have no screens.
2. The EHR''s own prescribing/lab-ordering writes to localStorage, not to Pharmacy MS / LIMS / FHIR. An order placed by a doctor never reaches the pharmacy or the lab.
3. Both Go services have zero authentication/authorization. Any caller can create/dispense prescriptions or release lab results.
4. No shared identity. EHR uses NextAuth; Go services have no notion of a user. `dispensed_by` / `resulted_by` / `orderer_id` are free-text strings with no verification.

## 2. Persona -> coverage matrix

| Persona | Has login role? | Has usable pages? | Verdict |
|---|---|---|---|
| Patient | PATIENT | dashboard, records | Real FHIR + audit — best-built persona |
| Doctor | DOCTOR | many (see doctor audit) | Rich UI, but writes are mock/localStorage |
| Nurse | NURSE | triage only | Very thin |
| Admin | ADMIN | users, audit | Functional |
| Reception / Scheduler | no role gate | /scheduling (public) | No persona, no auth |
| Pharmacist | PHARMACIST (referenced in notes allowlist only) | none | Missing entirely |
| Lab technician | none | none | Missing entirely |
| Billing | none | none | Missing entirely |

Registration (`ehr/src/app/register/page.tsx`) collects only name/email/password — no role selection;
everyone lands as PENDING and an admin assigns a role. But there are no destination pages for
pharmacist/lab-tech/billing even after assignment.

## 3. EHR — gaps by persona and page

### Patient portal
- `patient/dashboard/page.tsx` — Real FHIR + audit logging. Gaps: "Book Appointment" links to /scheduling (public, un-personalized); no lab results, no messages, no prescription refill request; counts have no empty-state guidance; fhirId falls back to id via any cast (fragile identity).
- `patient/records/page.tsx` — Shows conditions/meds/allergies/vitals from FHIR. Gaps: no lab results section (LIMS not integrated); no document/report download; no date formatting/units normalization; no pagination; heavy any typing.

### Nurse
- `triage/page.tsx` — CTAS wizard is genuinely good. Gaps: patient is a free-text name (no patient lookup / FHIR link); result POSTs to /api/triage best-effort with no error surface; no queue, no reassessment, no vitals capture, no handoff to a doctor''s queue. Nurses have no chart access, no med-admin, no care-plan pages.

### Admin
- `admin/users/page.tsx` — Approve/assign works via Prisma. Gaps: role list not shown here; no de-activation/audit of role changes visible; no pagination/search for large user bases.
- `admin/audit/page.tsx` — Reads AuditEvent (PHIPA framing). Gaps: capped at 200 rows, client-side filtering only (filters miss older events), no date-range/user search, no export, no tamper-evidence despite "immutable" claim.

### Reception / Scheduling
- `scheduling/*` — Listed as a public route in middleware.ts — anyone unauthenticated can view/book. Mock data (scheduling.mock.ts), no FHIR Appointment write, no provider availability, no conflict detection, no patient identity binding.

### Doctor (see docs/doctor-experience-review.md) — integration-relevant carry-over
- Prescriptions/lab orders write to localStorage only — never reach Pharmacy MS, LIMS, or FHIR.
- Allergy checking in the composer is weak exact-string matching; the real DUR engine in Pharmacy MS is never called.
- Clinical notes subsystem is strong (permissions, immutability, track-changes, audit) but in-memory only.

### Cross-cutting EHR security gaps
- `middleware.ts` — non-prod bypasses: x-playwright header, ?playwright=1, and ?asUser=USER_ID impersonation with no allow-list, plus a devAllowed route list that serves /dashboard* with no auth. Gated on NODE_ENV !== production but a large foot-gun.
- No route gate for PHARMACIST / LAB_TECH / RECEPTIONIST / BILLING.

## 4. Pharmacy MS (Go) — gaps by endpoint (pharmacist persona)

| Method | Path | Gap |
|---|---|---|
| POST | /api/v1/dur/check | DUR engine, see below |
| GET | /api/v1/medications?q= | Free-text search only; DIN catalog has no RxNorm/ATC, no strength normalization |
| GET/POST | /api/v1/prescriptions | No auth; prescriber_id unverified free text |
| PATCH | /api/v1/prescriptions/{id}/status | Any status -> any status; no lifecycle rules, no audit |
| GET/POST | /api/v1/dispenses | Dispense does not check DUR, refills-remaining, or prescription status; no inventory decrement |

DUR engine (`dur.go`):
- Interaction "database" is 11 hard-coded pairs; allergy classes are 6 keyword lists. Uses strings.Contains on drug names, so it silently misses unexpected spellings and can false-positive.
- Comment admits "production should call an external API."
- DUR is not called during dispensing and is not called by the EHR — isolated endpoint with no consumer.

Pharmacist workflow gaps (no page + no logic): no prescription queue, no verification/counsel step,
no partial fills, no refill authorization request back to prescriber, no inventory/lot/expiry
management beyond a free-text field, no controlled-substance handling, no MedicationDispense FHIR
emission, no audit trail table at all.

## 5. LIMS (Go) — gaps by endpoint (lab-tech persona)

| Method | Path | Gap |
|---|---|---|
| GET | /api/v1/tests | LOINC column but no verification it''s populated; no specimen/method metadata |
| GET/POST | /api/v1/orders | No auth; orderer_id unverified; no accessioning/specimen record |
| PATCH | /api/v1/orders/{id}/status | Free status transitions, no rules, no audit |
| GET | /api/v1/orders/{id}/results | ok |
| GET/POST | /api/v1/results | See below |

Results workflow (`results.go`):
- No verify/release separation — a result is created directly at final; no tech-enters -> pathologist-verifies gate.
- Critical-value alert is a dead slog.Warn — never reaches the EHR /api/lab-alerts.
- amended status exists in schema but there is no amend/correction endpoint and no audit of corrections.
- Reference range is free-text; interpretation (N/H/L/HH/LL/A) is caller-supplied, not computed against ranges.
- No specimen tracking, no QC, no phlebotomy/collection step, no DiagnosticReport/Observation FHIR emission.
- No auth: anyone can POST a "final" lab result for any patient.

Lab-tech persona gaps (no page + no logic): no worklist, no accessioning screen, no specimen
management, no verification queue, no critical-value acknowledgment loop.

## 6. Cross-cutting gaps (all three systems)

1. No end-to-end order lifecycle: doctor order -> pharmacy/lab -> result -> back to chart is broken at every hop.
2. No unified audit: EHR has a Prisma AuditEvent table; Pharmacy MS and LIMS have no audit tables despite handling PHI and dispensing.
3. No authN/authZ on the clinical Go services — highest-risk finding.
4. No FHIR conformance despite schema comments claiming "MedicationRequest/ServiceRequest/Observation equivalent" — private JSON shapes, not FHIR resources.
5. Terminology not enforced: DIN/LOINC columns nullable and unvalidated; no RxNorm, no UCUM units validation, no SNOMED.
6. No service-to-service trust: EHR ingestion endpoint has optional INTERNAL_SERVICE_TOKEN, but senders don''t send it.

## 7. Suggested priority order

P0 — Safety/security
- Add authN/authZ to Pharmacy MS and LIMS; remove ?asUser= impersonation bypass from EHR middleware.
- Enforce prescription-status + refills checks before dispense; add verify/release gate before lab results go final.

P1 — Close the loop
- Wire doctor prescribing -> Pharmacy MS (and call DUR); wire doctor lab ordering -> LIMS; wire LIMS critical values -> /api/lab-alerts.
- Persist EHR prescriptions/orders/notes to DB (or FHIR) instead of localStorage/in-memory.

P2 — Build the missing personas
- Pharmacist queue/verify/dispense UI; lab-tech worklist/accession/verify UI; reception scheduling behind auth.

P3 — Interoperability and terminology
- Emit real FHIR MedicationRequest/MedicationDispense/ServiceRequest/DiagnosticReport/Observation; validate DIN/RxNorm, LOINC, UCUM.
