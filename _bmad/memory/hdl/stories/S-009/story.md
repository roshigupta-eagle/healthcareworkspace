# S-009 — Rule engine routes AI classification to a triage pathway

**Epic:** E-004 — AI Triage Classification
**Priority:** High
**Status:** not-started
**Assigned:** Amelia
**FHIR Resources:** ClinicalImpression
**Last Updated:** 2026-05-03

---

## User Story

As the **HealthTriage system**,
I want to **deterministically route AI condition classifications to one of six triage pathways**,
so that **the triage recommendation is auditable, testable, and safe — not a black-box AI decision**.

## Context

The rule engine is a pure TypeScript/Python function that takes AI condition classifications
and confidence scores and applies explicit routing rules. No AI is involved in this step.
This separation (ADR-005) makes the routing unit-testable and auditable for regulatory purposes.

## Acceptance Criteria

### AC-001 — Emergency conditions route to emergency pathway

**Given** the AI returns any condition matching the Emergency condition set (e.g., facial asymmetry with confidence ≥ 0.60, severe burn, deep laceration with bleeding)
**When** the rule engine evaluates the classification
**Then** the pathway is `emergency` regardless of other conditions present

**Status:** pending

---

### AC-002 — High-confidence skin/eye conditions route to gp or pharmacy

**Given** the AI returns a skin condition (rash, minor burn, bruise) or eye condition (redness, discharge) with confidence ≥ 0.70
**When** the rule engine evaluates
**Then** the pathway is `gp` (for conditions requiring examination) or `pharmacy` (for OTC-treatable conditions) per the routing table

**Status:** pending

---

### AC-003 — Wound conditions route to appropriate pathway by severity

**Given** the AI returns a wound classification
**When** the rule engine evaluates severity indicators (deep/severe → emergency, superficial → home-remedy or pharmacy)
**Then** the pathway matches the wound severity routing table

**Status:** pending

---

### AC-004 — Rule engine output is deterministic and unit-testable

**Given** the same input conditions and confidence scores
**When** the rule engine is called multiple times
**Then** the output is always identical (no randomness, no AI calls)

**Status:** pending

---

## Technical Notes

- Rule engine: pure function `route(conditions: TriageClassification[]): TriagePathway`
- Routing table defined as a static JSON config file (versioned in repo)
- Every routing rule has a rule ID (e.g., `RULE-EMERGENCY-001`) for audit trail
- ClinicalImpression.summary = pathway code from HealthTriage Pathway CodeSystem
- Rule engine test coverage target: 100% of routing table entries

## Definition of Done

- [ ] All AC items pass in automated tests
- [ ] 100% routing table coverage in unit tests
- [ ] Routing decisions logged with rule ID (audit trail)
- [ ] Code reviewed
