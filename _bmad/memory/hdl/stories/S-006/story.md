# S-006 — User can capture a real-time camera image of affected area

**Epic:** E-003 — Symptom & Media Capture
**Priority:** High
**Status:** not-started
**Assigned:** Amelia
**FHIR Resources:** Media, Encounter
**Last Updated:** 2026-05-03

---

## User Story

As a **patient or caregiver**,
I want to **point my phone camera at the affected area and capture an image**,
so that **the AI can visually assess my condition and provide triage guidance**.

## Context

Camera access requires explicit OS-level permission (iOS + Android).
The captured image is converted to base64 in memory and sent to the AI Proxy Service.
No image is written to device storage or FHIR — only a Media resource with metadata (no URL content) is stored (ADR-005).

## Acceptance Criteria

### AC-001 — App requests camera permission before capture

**Given** the user taps "Capture Image" for the first time
**When** the app needs camera access
**Then** the OS permission dialog is shown; the camera does not open until permission is granted

**Status:** pending

---

### AC-002 — Camera opens with triage guidance overlay

**Given** camera permission has been granted
**When** the capture screen opens
**Then** the camera viewfinder shows with an overlay instruction: "Point camera at the affected area and tap to capture"

**Status:** pending

---

### AC-003 — Captured image is displayed for confirmation

**Given** the user taps the capture button
**When** the image is captured
**Then** the captured image is displayed in a preview screen with "Use This Photo" and "Retake" buttons

**Status:** pending

---

### AC-004 — Confirming image creates FHIR Media resource (metadata only)

**Given** the user taps "Use This Photo"
**When** the image is accepted
**Then** a FHIR Media resource is created with: status=completed, type=image, subject=Patient/{id}, encounter=Encounter/{id}, content.contentType=image/jpeg — and no image URL or data is stored in FHIR

**Status:** pending

---

### AC-005 — Image is discarded after AI processing

**Given** the user has confirmed the image and triage is processed
**When** the AI classification completes
**Then** the base64 image is cleared from memory and is not accessible in any app state, log, or network cache

**Status:** pending

---

## Technical Notes

- React Native Camera: use `expo-camera` or `react-native-vision-camera`
- Image compression to 720p before base64 encoding (reduces API payload size)
- FHIR Media.content.url = absent (explicitly omitted — not stored); Media.content.contentType = "image/jpeg"
- Image cleared from state after `POST /triage` returns a response

## Definition of Done

- [ ] All AC items pass in automated tests
- [ ] Image not present in FHIR Media resource or any log
- [ ] Permission denial handled gracefully (no crash)
- [ ] Code reviewed
