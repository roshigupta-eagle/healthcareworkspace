# S-004 — User must accept PHIPA consent before first triage

**Epic:** E-002 — Consent & Privacy
**Priority:** High
**Status:** not-started
**Assigned:** Amelia
**FHIR Resources:** Consent
**Last Updated:** 2026-05-03

---

## User Story

As a **patient using HealthTriage**,
I want to **understand and control how my health data is used**,
so that **I can make an informed decision about sharing my information**.

## Context

PHIPA (Ontario) requires informed consent before collecting personal health information.
A FHIR Consent resource records this consent with scope, category, patient reference, and policy rule.
Consent is collected once per account; re-consent triggered on policy changes. ADR-007.

## Acceptance Criteria

### AC-001 — Consent screen shown before first triage

**Given** the user has a new account and has not yet consented
**When** they attempt to start a triage session
**Then** the consent screen is displayed before any camera access or data collection begins

**Status:** pending

---

### AC-002 — Consent screen contains required PHIPA elements

**Given** the consent screen is displayed
**When** the user reads it
**Then** the screen contains: (1) what data is collected, (2) how it is used, (3) that images are ephemeral, (4) PHIPA rights summary, (5) contact for privacy questions

**Status:** pending

---

### AC-003 — Accepting consent creates FHIR Consent resource

**Given** the user taps "I Accept"
**When** consent is recorded
**Then** a FHIR Consent resource is created with: status=active, scope=patient-privacy, policyRule reference to PHIPA, dateTime=now(), patient reference, and category=LSPRO

**Status:** pending

---

### AC-004 — Declining consent blocks triage and shows alternative

**Given** the user taps "Decline"
**When** consent is declined
**Then** triage is not started, no FHIR resources are created, and the user is shown: "You must accept the privacy policy to use HealthTriage. You can use anonymous mode without saving results."

**Status:** pending

---

## Technical Notes

- Consent.policyRule = PHIPA reference: `http://laws.justice.gc.ca/eng/acts/P-8.6/`
- Consent.category[0].coding = `{ system: "http://loinc.org", code: "59284-0" }` (Patient Consent)
- Consent resource must pass $validate before storage
- Consent version tracked via Consent.sourceAttachment or meta.versionId

## Definition of Done

- [ ] All AC items pass in automated tests
- [ ] FHIR Consent resource validates against CAConsent profile
- [ ] No triage proceeds without Consent resource existing for authenticated users
- [ ] Code reviewed
