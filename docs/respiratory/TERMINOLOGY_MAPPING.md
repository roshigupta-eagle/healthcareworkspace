# Respiratory Terminology Mapping

## Intended terminology
- SNOMED CT: conditions, findings, procedures, and body structures.
- LOINC: respiratory observations, PFT components, blood gases, and laboratory analytes.
- UCUM: units for measurements and oxygen/device values.
- DICOM terminology: imaging modality and anatomy metadata.
- RxNorm or configured Canadian medication terminology: medications.
- ICD-10-CA/ICD-10 where billing/reporting requires it.

## Current implementation
The organ registry owns reviewed fallback keywords for the demo dataset, while exact LOINC matching takes precedence for laboratory data. Display text is not used as a clinical foreign key. Terminology selection for new FHIR profiles or bindings requires the terminology advisor and FHIR architect review.
