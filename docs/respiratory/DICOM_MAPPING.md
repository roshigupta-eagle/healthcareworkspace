# Respiratory DICOM Mapping

## Current boundary
No ImagingStudy, DICOMweb, PACS, OHIF, series, or segmentation integration exists in this repository. The Lungs viewer is a generic procedural educational model and is explicitly labelled as such.

## Future contract
- ImagingStudy owns study, series, modality, body site, laterality, and subject references.
- DICOMweb owns image delivery and instance access.
- DiagnosticReport owns the authorized radiology report and impression.
- BodyStructure is used only for a documented patient-specific structure.
- Patient-specific annotations require exact authorized source references, validation state, reviewed state, and audit events.
- Generic geometry must never be deformed from a report and relabelled as segmentation.
