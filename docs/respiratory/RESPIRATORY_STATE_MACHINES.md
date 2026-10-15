# Respiratory State Machines

## Viewer
`NO_PATIENT -> PATIENT_LOADING -> PATIENT_READY -> ORGAN_LOADING -> GENERIC_ANATOMY_READY`.

Imaging and segmentation states are intentionally unreachable until authorized sources exist.

## Snapshot
`IDLE -> LOADING -> READY | ERROR`.
Requests are cancelled on patient or organ change. A `READY` snapshot may have `dataQuality=partial`; readiness does not mean the record is complete.

## Respiratory test lifecycle
`ORDERED -> SCHEDULED -> COLLECTED -> IN_PROGRESS -> PRELIMINARY -> FINAL -> REVIEWED -> FOLLOW_UP`.
Amended/corrected versions and acknowledgement/action states remain separate. The frontend does not advance these states autonomously.
