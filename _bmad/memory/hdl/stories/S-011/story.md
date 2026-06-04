# S-011 — User sees triage pathway result with pathway icon and description

**Epic:** E-005 — Triage Result Presentation
**Priority:** High
**Status:** not-started
**Assigned:** Jordan
**FHIR Resources:** ClinicalImpression (read)
**Last Updated:** 2026-05-03

---

## User Story

As a **patient who has completed a triage session**,
I want to **see a clear, visual representation of my recommended care pathway**,
so that **I immediately understand what action to take**.

## Context

The result screen is the most critical UX surface in the app. It must communicate urgency clearly
(Emergency in red, GP in orange, etc.), always show the disclaimer, and be accessible (WCAG 2.1 AA).

## Acceptance Criteria

### AC-001 — Result screen shows pathway with correct icon and colour

**Given** the triage is complete and the pathway is determined
**When** the result screen is displayed
**Then** the pathway name and icon are shown with the pathway colour: Emergency=red, GP=orange, Specialist=blue, Pharmacy=green, Lab=purple, Home Remedy=teal

**Status:** pending

---

### AC-002 — Result screen shows disclaimer on every view

**Given** any triage result is displayed
**When** the result screen renders
**Then** the text "This is triage guidance only and not a medical diagnosis. Always consult a healthcare professional." is visible without scrolling on standard screen sizes (≥ 375px wide)

**Status:** pending

---

### AC-003 — Emergency pathway shows urgent action prompt

**Given** the triage pathway is `emergency`
**When** the result screen displays
**Then** a prominent "Call 911 or go to Emergency now" button is shown above all other content

**Status:** pending

---

### AC-004 — Result screen loads within 1 second of triage completion

**Given** the triage API call has returned successfully
**When** the app navigates to the result screen
**Then** the result screen is fully rendered within 1 second (measured from API response received)

**Status:** pending

---

## Technical Notes

- Pathway icons: use a healthcare icon set (e.g., React Native Paper icons or custom SVG)
- Colours must meet WCAG 2.1 AA contrast ratio (4.5:1 for normal text)
- Disclaimer font size: minimum 14sp; not in a colour that reduces contrast
- Emergency CTA: opens native phone dialer with "911" pre-filled or opens maps to nearest ER

## Definition of Done

- [ ] All AC items pass in automated tests (including snapshot test for disclaimer visibility)
- [ ] WCAG 2.1 AA contrast verified for all 6 pathway colours
- [ ] Emergency CTA tested on iOS and Android
- [ ] Code reviewed
