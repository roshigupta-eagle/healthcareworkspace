# S-005 — User must grant camera permission before image capture

**Epic:** E-002
**Priority:** Medium
**Status:** not-started
**Assigned:** Amelia
**FHIR Resources:** (none)
**Last Updated:** 2026-05-03

---

## User Story

As a **patient**,
I want to **be asked for camera permission before any image is taken**,
so that **I maintain control over my device's camera**.

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
