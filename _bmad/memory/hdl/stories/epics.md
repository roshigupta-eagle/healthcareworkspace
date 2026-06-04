# Epics — HealthTriage

_Generated 2026-05-03 by hdl-stories_

| Epic ID | Epic Title | Description | Primary Actor | FHIR Resources |
|---|---|---|---|---|
| E-001 | User Authentication & Onboarding | User can register, sign in via SMART on FHIR v2 PKCE, and access their triage history | Patient / Caregiver | Patient, Consent |
| E-002 | Consent & Privacy | User is informed of PHIPA rights, grants camera consent, and consents to triage data storage | Patient | Consent |
| E-003 | Symptom & Media Capture | User captures a camera image of their condition and optionally enters symptom text | Patient / Caregiver | Media, Observation, Encounter |
| E-004 | AI Triage Classification | System sends image to GPT-4o Vision API and routes result through deterministic rule engine | System | ClinicalImpression (internal) |
| E-005 | Triage Result Presentation | User receives triage pathway, probable causes, confidence score, and home remedy guidance with disclaimer | Patient | ClinicalImpression, Communication |
| E-006 | FHIR Resource Persistence | All triage data is stored as FHIR R4 resources conformant to HealthTriage profiles | System | All |
| E-007 | Care Pathway Routing | System creates appropriate downstream FHIR resources based on pathway (ServiceRequest for referrals) | System | ServiceRequest |
| E-008 | Triage History & Review | User can view past triage encounters; clinician can view patient triage results (read-only v1) | Patient, Clinician | ClinicalImpression, Encounter |
