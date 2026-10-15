# Dashboard Data Source Map

Maps every widget on the Clinical Command Center Dashboard to its real backing store. Nothing
on this dashboard invents data — if a source is unavailable the UI shows an explicit empty or
error state (see HLD/LLD).

## My Day
| Widget | Store / function | Notes |
|---|---|---|
| Metrics row, Needs Attention, Schedule, Results, Communications, Orders, Documentation, System Status | `getDashboardSummary()` in [ehr/src/lib/dashboardSummary.ts](../../ehr/src/lib/dashboardSummary.ts) | Unchanged; aggregates `schedulingData`, `doctorWorkStore`, `clinicalCommunicationStore`, `orderStore` |

## Patient Focus — shared
| Widget | Store / function | Notes |
|---|---|---|
| Patient identity, MRN, DOB, allergies, risk | `getPatientById()` / `/api/patients/[patientId]` | Canonical `Patient` record |
| Patient picker | `/api/scheduling/patients?query=` → `getCanonicalPatientDirectory` | Reused from the appointment booking workflow |
| Care team / PCP | `careTeamStore.listCareTeam(patientId)` | |
| Allergies | `Patient.allergies` / `Patient.allergyDetails` | |

## Organ Explorer per-organ snapshot (`OrganDashboardSnapshot`)
| Data element | Store / function | Association method |
|---|---|---|
| Conditions | `conditionsStore.listConditions(patientId)` | LOINC/SNOMED not present on the record today → registry `keywordMatchers` against `condition.name`/`category` (centralized, documented) |
| Medications | `medicationsStore.listMedications(patientId)` | **Relational** when `medication.conditionId` references an organ-matched condition; keyword fallback against `name`/`indication` otherwise |
| Lab results | `Patient.labResults` (patientRecordStore) | **Coded** match on `labResult.code` (LOINC) against `observationLoincPrefixes` first; keyword fallback on `labResult.name` only when no code is present |
| Vitals (BP, HR, SpO2, weight, BMI, temperature) | `Patient.vitals` | **Direct** registry `vitalKeys` mapping — vitals categories are already body-system-specific, no heuristic needed |
| Tasks | `tasksStore.listTasks(patientId)` | Keyword match against `task.title`/`relatedResources[].display` |
| Care gaps | `careGapStore.listCareGaps(patientId)` | Keyword match against `item`/`category` |
| Timeline events | `timelineStore.listEvents(patientId)` | Keyword match against `title`/`summary`/`resourceType` |
| Referrals (→ Care Pathway) | `referralStore.listReferrals()` filtered by `patientId` | Keyword match against `specialty`/`subject` |
| Imaging | *(none — no `ImagingStudy`/DICOM store exists)* | Explorer always shows "No patient-specific imaging is available" and stays in `generic` model mode |
| Unmatched records | — | Counted and surfaced as **"Other / Unassigned Clinical Context"**, never dropped silently |

## Audit
| Event | Mechanism |
|---|---|
| Patient selected in Patient Focus | `logAuditEvent({action:'R', entityType:'Patient', ...})` via existing dev-guarded `ehr/src/lib/audit.ts` |
| Organ snapshot viewed | `logAuditEvent({action:'R', entityType:'OrganDashboardSnapshot', entityId:organCode, ...})` |

## Explicitly out of scope (no fabricated systems)
- DICOM/DICOMweb/PACS/OHIF viewer — not implemented; no such store/service exists in this
  repository today (verified by full-text search).
- FHIR `BodyStructure`, `ImagingStudy`, `ImagingSelection` resources — not modelled; the
  organ registry uses SNOMED body-structure **labels** only, not coded FHIR resources.
- Patient-specific segmentation — not implemented; `modelMode` is always `generic`.
- AI-generated health scores / nodule probabilities — intentionally not built (see spec §80,
  §81); `AiInsightsCard` only restates grounded, sourced facts already in the record.
