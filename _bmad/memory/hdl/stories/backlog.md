# Story Backlog — HealthTriage

_Last updated 2026-05-03_

| Story ID | Epic | Title | Priority | Status | Assigned |
|---|---|---|---|---|---|
| S-001 | E-001 | User can register with email and create a HealthTriage account | High | not-started | Amelia |
| S-002 | E-001 | Authenticated user can sign in via SMART on FHIR v2 with PKCE | High | not-started | Amelia |
| S-003 | E-001 | User can view and access their triage history after login | Medium | not-started | Amelia |
| S-004 | E-002 | User must accept PHIPA consent before first triage | High | not-started | Amelia |
| S-005 | E-002 | User must grant camera permission before image capture | High | not-started | Amelia |
| S-006 | E-003 | User can capture a real-time camera image of affected area | High | not-started | Amelia |
| S-007 | E-003 | User can enter optional symptom text to supplement camera image | Medium | not-started | Amelia |
| S-008 | E-004 | System sends image to GPT-4o Vision API and receives condition classifications | High | not-started | Amelia |
| S-009 | E-004 | Rule engine routes AI classification to a triage pathway | High | not-started | Amelia |
| S-010 | E-004 | System applies fallback pathway when AI confidence is below threshold | High | not-started | Amelia |
| S-011 | E-005 | User sees triage pathway result with pathway icon and description | High | not-started | Jordan |
| S-012 | E-005 | User sees top 3 probable causes with confidence percentages | High | not-started | Jordan |
| S-013 | E-005 | User sees home remedy instructions for non-urgent pathways | Medium | not-started | Jordan |
| S-014 | E-005 | User sees mandatory disclaimer on every triage result screen | High | not-started | Jordan |
| S-015 | E-006 | System creates FHIR Patient, Encounter, Media, Observation on triage start | High | not-started | Amelia |
| S-016 | E-006 | System creates FHIR ClinicalImpression with pathway and findings on triage completion | High | not-started | Amelia |
| S-017 | E-006 | FHIR resources validate against HealthTriage CA Core profiles | High | not-started | Amelia |
| S-018 | E-007 | System creates FHIR ServiceRequest for Emergency and Specialist pathways | High | not-started | Amelia |
| S-019 | E-007 | System creates FHIR Communication with home remedy for Home Remedy pathway | Medium | not-started | Amelia |
| S-020 | E-008 | User can view list of past triage encounters in-app | Medium | not-started | Jordan |
