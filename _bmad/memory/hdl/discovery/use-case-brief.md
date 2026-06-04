# Use Case Brief — HealthTriage
**Status:** complete — discovery resolved
**Phase:** Discovery
**Updated:** 2026-05-03

---

## Product Vision (Initial)

An AI-powered health triage application that uses live camera input from multiple devices to visually assess a user's condition and recommend the appropriate care pathway:
- **Emergency** — go now
- **Doctor (GP)** — book appointment
- **Specialist** — referral needed
- **Pharmacy** — OTC treatment
- **Lab** — tests needed first
- **Home remedy** — if non-urgent, what the user can do themselves

Also provides: probable causes (differential), and home remedy guidance when appropriate.

---

## Actors (validated)

| Actor | Role |
|---|---|
| Patient / User | Primary — captures their condition via camera on mobile device |
| Caregiver | Secondary — may capture on behalf of patient (child, elderly dependent) |
| Clinician (optional v1) | May review AI triage output when pathway = Emergency or Specialist |

---

## Success Criteria (validated)

- User points camera at affected area; app returns a triage recommendation within 10 seconds
- Triage recommendation is one of: Emergency / GP / Specialist / Pharmacy / Lab / Home Remedy
- App surfaces top 3 probable causes with confidence indicators (0–100%)
- If home remedy: specific, safe, actionable instructions provided
- Works on iOS and Android mobile devices (React Native v1)
- All triage recommendations include a clear disclaimer: "This is guidance only, not a medical diagnosis."
- No camera images are stored — images are processed ephemerally and discarded after AI classification

---

## Decisions Made

### Device & Platform
- **v1 scope:** Native mobile app (iOS + Android) via React Native
- **v2 stretch:** Web app (browser webcam)
- **Reason:** Native mobile gives reliable camera access, background permissions, and best UX for real-time capture

### Regulatory Posture
- **Classification:** Triage guidance tool — NOT a diagnostic tool
- **AI output framing:** "Possible causes" and "suggested care pathway" — not "diagnosis" or "prescription"
- **Regulatory path:** Canada — Health Canada Digital Health guidance; US — FDA enforcement discretion (wellness/low-risk triage aid)
- **Liability mitigation:** Clear disclaimer on every triage result; user must acknowledge before viewing
- **SaMD readiness:** Audit trail (FHIR resources), confidence scoring, no hard diagnostic claims

### Jurisdiction
- **Primary:** Canada (pan-Canadian, Ontario launch province)
  - Profiles: Health Infoway CA Core FHIR R4
  - Naming systems: `https://fhir.infoway-inforoute.ca/NamingSystem/`
  - Privacy: PHIPA (Ontario), PIPEDA (federal)
  - Terminology: SNOMED CT Canadian Edition, pCLOCD, Canadian Drug Product Database
- **Secondary (v1.1):** United States — US Core R4, HIPAA, ONC compliance

### Visual Conditions in Scope (v1)
1. Skin conditions — rashes, burns (first/second degree), bruises, contusions
2. Wound assessment — lacerations, punctures, swelling, signs of infection
3. Eye conditions — redness (conjunctivitis), discharge, swelling, foreign body
4. Visible facial changes — asymmetry (stroke screen — FAST assessment), drooping

### AI Model Architecture
- **Image analysis:** GPT-4o Vision API (OpenAI) — multimodal classification via HTTPS
- **Pathway routing:** Deterministic rule engine (Python/TypeScript) — auditable, no black-box
- **Image storage:** Ephemeral — image transmitted to AI service, result returned, image discarded
- **Confidence scoring:** Every output includes a confidence percentage; low-confidence results escalate to Emergency by default
- **Fallback:** If confidence < 40% on any condition → default to "Consult a doctor (GP)" pathway

### FHIR & Integration
- **FHIR server:** HAPI FHIR R4 (local Docker for dev; cloud-hosted for prod)
- **Authentication:** SMART on FHIR v2 with PKCE; anonymous mode allowed pre-login (triage only, no storage)
- **Resources created per triage:** Media (image metadata only), Observation (symptoms), ClinicalImpression (triage result), Encounter
- **EHR/LIMS/Pharmacy integration:** v2 backlog

### Consent
- Camera access requires explicit in-app consent before capture
- Triage storage requires account creation + PHIPA-compliant consent form
- Unauthenticated users: triage is run but no FHIR resources are stored

---

## Open Questions for Discovery Phase

### Product Scope
- [x] Web app, mobile app (iOS/Android), or both? → **Mobile v1 (React Native)**
- [x] Consumer-facing or clinical-facing? → **Consumer-facing v1; clinician review optional**
- [x] Which visual conditions are in scope for v1? → **Skin, wounds, eye, facial asymmetry**
- [x] Does the app accept symptom description text in addition to camera? → **Yes — optional text + optional voice (v1.1 for voice)**

### Regulatory
- [x] Target jurisdiction(s)? → **Canada (Ontario) primary; US secondary (v1.1)**
- [x] SaMD classification? → **Triage guidance tool — low-risk, not diagnostic SaMD**
- [x] AI recommendations diagnostic or guidance? → **Guidance only — explicit disclaimer required**
- [x] Who is liable? → **Disclaimer; no clinical liability; guidance only; escalate on doubt**

### Integration
- [x] Integrate with workspace systems? → **v2; v1 is standalone with HAPI FHIR**
- [x] Creates FHIR resources? → **Yes — Media, Observation, ClinicalImpression, Encounter**
- [x] Authentication? → **SMART on FHIR v2 PKCE; anonymous mode for unauthenticated triage**

### Data & AI
- [x] AI model? → **GPT-4o Vision API + deterministic rule engine**
- [x] Camera data stored? → **Ephemeral — not persisted**
- [x] Consent model? → **Explicit in-app consent before camera; PHIPA consent for storage**

---

## Data Element Inventory (complete)

| Element | Source | FHIR Resource | Profile | Notes |
|---|---|---|---|---|
| Visual image frame | Camera capture | `Media` | CA Core Media | Only metadata stored (no raw image) |
| Symptom text | User input | `Observation` | CA Core Observation | Optional; code = SNOMED CT |
| Triage recommendation | AI output | `ClinicalImpression` | HealthTriage ClinicalImpression | summary = pathway; finding[].item = causes |
| Probable causes | AI output | `ClinicalImpression.finding` | (above) | Up to 3; each with confidence extension |
| Home remedy instructions | AI output | `Communication` | CA Core Communication | payload.contentString; linked to Encounter |
| Care pathway referral | AI rule engine | `ServiceRequest` | CA Core ServiceRequest | Only for Emergency / Specialist pathways |
| Patient demographics | User input (optional) | `Patient` | CA Core Patient | Anonymous if not authenticated |
| Triage encounter | System | `Encounter` | CA Core Encounter | Links all resources; status = finished |
| Confidence score | AI output | ClinicalImpression extension | `ext-triage-confidence` | decimal 0.0–1.0 |
| Disclaimer acknowledgement | User action | `Consent` | CA Core Consent | Captured before result display |
| Assessment timestamp | System | All resources `.meta.lastUpdated` | — | UTC |
