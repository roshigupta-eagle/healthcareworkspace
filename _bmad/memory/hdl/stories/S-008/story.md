# S-008 — System sends image to GPT-4o Vision API and receives condition classifications

**Epic:** E-004 — AI Triage Classification
**Priority:** High
**Status:** not-started
**Assigned:** Amelia
**FHIR Resources:** ClinicalImpression (internal stage)
**Last Updated:** 2026-05-03

---

## User Story

As the **HealthTriage system**,
I want to **send the captured image and symptom context to the GPT-4o Vision API**,
so that **I can receive structured condition classifications and confidence scores to power the triage decision**.

## Context

The AI Proxy Service (Python/FastAPI) wraps the GPT-4o Vision API. It constructs a structured prompt,
sends the base64 image, parses the JSON response, and returns a TriageClassificationDTO.
Images are ephemeral — never stored. PHI identifiers are never included in the API payload (ADR-005, ADR-007).

## Acceptance Criteria

### AC-001 — AI proxy constructs a well-formed prompt without PHI

**Given** the API receives an image and optional symptom list
**When** the AI proxy builds the GPT-4o request
**Then** the request contains: structured system prompt, base64 image, symptom text, and conditions-in-scope list — and does NOT contain: patient name, health card number, date of birth, or any identifier

**Status:** pending

---

### AC-002 — AI proxy returns structured TriageClassificationDTO

**Given** GPT-4o Vision API returns a valid response
**When** the AI proxy parses the response
**Then** it returns a TriageClassificationDTO with: conditions[] (each with code, display, confidence 0.0–1.0), probable_causes[] (up to 3), and optional home_remedy string

**Status:** pending

---

### AC-003 — API call uses TLS and response is validated

**Given** the AI proxy calls the GPT-4o endpoint
**When** the call completes
**Then** the connection used TLS 1.2+, the response is validated as JSON matching the expected schema, and any malformed response raises an error

**Status:** pending

---

### AC-004 — Image is discarded after API response

**Given** the GPT-4o call has returned (success or failure)
**When** the AI proxy function returns
**Then** the base64 image string is not stored in any variable, log, file, or cache

**Status:** pending

---

### AC-005 — API unavailability triggers graceful fallback

**Given** the GPT-4o API returns an error (5xx) or times out (>15s)
**When** the AI proxy receives the error
**Then** it returns an error TriageClassificationDTO with confidence=0.0 and reason="api_unavailable" — which the rule engine maps to pathway=gp

**Status:** pending

---

## Technical Notes

- GPT-4o Vision API endpoint: `https://api.openai.com/v1/chat/completions`
- Model: `gpt-4o` with `vision` capability
- Prompt response format: `{ "type": "json_object" }` — enforces structured output
- Timeout: 15 seconds; retry: 1 time on 5xx only
- Pytest: mock `openai.chat.completions.create` — never call real API in tests

## Definition of Done

- [ ] All AC items pass in automated tests (with mocked GPT-4o)
- [ ] No PHI in any API call payload (verified by test assertion)
- [ ] Image not present in any log (verified by log inspection test)
- [ ] Code reviewed
