# Respiratory Test Plan

## Implemented checks
- Unit: lung structure registry, defaults, metadata, and safe generic anatomy states.
- Unit: LungMaster guide content integrity.
- E2E: exact patient-003 Lungs route, viewer readiness, labels, patient facts, pending spirometry, structure selection, isolation, layer toggling, valid patient links, and LungMaster.
- Responsive: mobile dialog containment and no horizontal overflow.
- Build: production Next build.

## Required future checks
- FHIR profile/resource validation.
- LIMS specimen/result lifecycle.
- ImagingStudy/DICOMweb authorization and wrong-patient blocking.
- PFT source mapping and quality/version handling.
- Device and oxygen provenance.
- Critical-result acknowledgement workflow.
- Accessibility at 200% zoom, forced colors, and screen readers.
- Visual regression across desktop/tablet/mobile and light/dark themes.

Tests must use real source fixtures and must never pass by injecting fabricated clinical values.
