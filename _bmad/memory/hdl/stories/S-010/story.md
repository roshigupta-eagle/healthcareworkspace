# S-010 — System applies fallback pathway when AI confidence is below threshold

**Epic:** E-004
**Priority:** Medium
**Status:** not-started
**Assigned:** Amelia
**FHIR Resources:** ClinicalImpression
**Last Updated:** 2026-05-03

---

## User Story

As a **system**,
I want to **detect when AI confidence is below 40% and route to a safe default**,
so that **no patient is left without guidance even when the AI is uncertain**.

## Context

Refer to ADR-001 (FHIR R4), ADR-005 (AI model), ADR-006 (auth), ADR-007 (privacy).

## Acceptance Criteria

### AC-001 — Primary success path

**Given** all preconditions are met
**When** the user or system performs the primary action
**Then** the expected outcome is achieved and any FHIR resources created conform to HealthTriage profiles

**Status:** pending

---

### AC-002 — Error / edge case handled gracefully

**Given** an error condition or edge case occurs
**When** the system detects it
**Then** a clear, user-appropriate message is shown and no partial data is committed to FHIR

**Status:** pending

---

## Technical Notes

- Follow patterns established in S-001 through S-009
- All FHIR writes must pass \\\ before commit
- Any AI calls must use ephemeral image pattern (ADR-005)

## Definition of Done

- [ ] All AC items pass in automated tests
- [ ] FHIR resources validate against profile where applicable
- [ ] No P1 defects
- [ ] Code reviewed
