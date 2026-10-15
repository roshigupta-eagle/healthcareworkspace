# Respiratory LIMS Mapping

## Intended lifecycle
`ServiceRequest -> Specimen -> LIMS processing -> Observation -> DiagnosticReport -> review Task -> follow-up Communication`.

## Current state
Roshi has generic laboratory/order surfaces, but no respiratory specimen, culture, sputum, BAL, pleural-fluid, blood-gas, or PFT-result fixture for patient-003. The respiratory workspace therefore shows laboratory and microbiology as unavailable and links to the canonical patient laboratory workflow.

## Required future contract
Preserve order, specimen, analytical, report, review, acknowledgement, and action statuses independently. Rejected or inadequate specimens must remain visible. Result version, amendment, performer, laboratory, method, reference range, and provenance must travel with the result.
