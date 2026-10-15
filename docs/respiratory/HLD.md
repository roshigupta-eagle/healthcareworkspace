# Respiratory Clinical Command Center

## Purpose
The Lungs Patient Focus view provides a patient-scoped respiratory workspace at `/dashboard` with `mode=patient-focus`, `patientId`, and `organ=lungs`.

## Current architecture
- Patient identity comes from the canonical patient record service.
- Conditions, medications, tasks, care gaps, timeline, care team, and referrals come from existing stores.
- `organSnapshot.ts` is a derived read model. It is never a second source of truth.
- The 3D scene is procedural generic anatomy. It is never presented as patient imaging or segmentation.
- Missing observations remain visibly missing. No clinical finding is inferred from an absent value.
- Existing authorization and audit routes remain the boundary for clinical data.

## User flow
Patient -> respiratory status -> generic anatomy -> source-aware clinical tabs -> existing patient record workflows.

## Explicit current gaps
This workspace has no ImagingStudy/DICOMweb pipeline, respiratory device telemetry, blood-gas store, PFT result store, governed respiratory CDS service, or external FHIR server integration. The UI exposes those states as unavailable rather than fabricating data.

## Non-goals
No autonomous diagnosis, prescribing, order placement, oxygen changes, critical-result acknowledgement, or patient-specific anatomical rendering is introduced.
