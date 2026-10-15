# Respiratory Low-Level Design

## Components
- `PatientFocusView`: selects patient and organ mode.
- `OrganExplorer`: viewer controls, labels, structure selection, and learning guide launcher.
- `LungAnatomy`: procedural right/left lung, lobes, fissures, trachea, carina, bronchi, pulmonary vessels, pleura, and diaphragm.
- `RespiratoryClinicalSnapshot`: above-fold status, attention, documented care, availability, and next recorded workflow item.
- `RespiratoryDetailPanel`: progressive tabs for overview, symptoms, vitals, PFTs, labs, imaging, conditions, medications, devices, procedures, tasks, and timeline.
- `organSnapshot.ts`: patient-scoped aggregation and registry-driven matching.

## State rules
- Organ changes clear transient selection and pending UI state.
- Patient changes clear prior patient selections and restart the snapshot request.
- Snapshot requests use `AbortController`; stale responses are ignored.
- Viewer readiness is reported after the parent organ-loading reset.
- Generic anatomy has no patient-derived lesion or finding markers.

## Data display rules
A value is displayed only when present in the selected patient source record. `Not recorded`, `Not documented`, `Pending`, and `Not available` are distinct states.

## Accessibility
The canvas has a descriptive accessible group, clickable DOM labels, a structure select, keyboard-oriented viewer controls, visible focus styles, reduced-motion handling, and a tabular/source-link alternative for clinical data.
