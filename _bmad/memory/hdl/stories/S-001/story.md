# S-001 — User can register with email and create a HealthTriage account

**Epic:** E-001 — User Authentication & Onboarding
**Priority:** High
**Status:** not-started
**Assigned:** Amelia
**FHIR Resources:** Patient, Consent
**Last Updated:** 2026-05-03

---

## User Story

As a **new user (patient/caregiver)**,
I want to **register with my email address and create a HealthTriage account**,
so that **my triage history is saved and I can access it across devices**.

## Context

Registration creates a FHIR Patient resource linked to the Keycloak user account.
Anonymous triage is allowed, but saving results requires authentication (ADR-006).
No health card number is collected at registration — only email and basic demographics.

## Acceptance Criteria

### AC-001 — Registration form accepts email and password

**Given** the user is on the registration screen
**When** they enter a valid email address and a password meeting minimum requirements (8+ chars, 1 number)
**Then** the form accepts the input and enables the "Create Account" button

**Status:** pending

---

### AC-002 — Account creation creates FHIR Patient resource

**Given** the user submits valid registration data
**When** the account is created successfully in Keycloak
**Then** a FHIR Patient resource conformant to HTPatient profile is created in HAPI FHIR with the user's demographics

**Status:** pending

---

### AC-003 — Duplicate email shows clear error

**Given** the user enters an email already registered
**When** they submit the form
**Then** the app displays "An account with this email already exists" and does not create a duplicate account

**Status:** pending

---

### AC-004 — Password validation is enforced client-side

**Given** the user enters a password shorter than 8 characters or without a number
**When** they attempt to submit
**Then** an inline validation message appears before the form is submitted

**Status:** pending

---

## Technical Notes

- Keycloak user creation via Admin REST API (server-side only — never expose admin credentials to client)
- FHIR Patient.identifier[0].system = `https://fhir.infoway-inforoute.ca/NamingSystem/ca-on-patient-healthcare-id` (optional at registration; collected later)
- FHIR Patient must pass $validate against HTPatient profile before storage

## Definition of Done

- [ ] All AC items pass in automated tests
- [ ] FHIR Patient resource validates against HTPatient profile
- [ ] No P1 defects
- [ ] Code reviewed
