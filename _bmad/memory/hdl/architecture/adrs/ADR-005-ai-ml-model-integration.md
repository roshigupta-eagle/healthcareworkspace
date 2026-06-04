# ADR-005 — AI and ML Model Integration

**Status:** Accepted
**Accepted:** 2026-05-03
**Date:** 2026-05-03
**Deciders:** Winston (Architect), John (PM)
**Tags:** ai, gpt-4o, vision, rule-engine, triage

---

## Context

HealthTriage's core capability is AI-powered visual triage. The AI component must:
1. Accept a camera-captured image (and optional symptom text)
2. Identify visible clinical signs (rash, wound, eye condition, facial asymmetry)
3. Classify the condition into one of 6 triage pathways
4. Return top 3 probable causes with confidence scores
5. Provide home remedy guidance for non-urgent cases

The AI must not present output as a medical diagnosis. Output must always be accompanied
by a confidence score; low-confidence results must escalate conservatively.

Two architectural concerns: (a) which model handles image analysis, and (b) how are
triage pathway routing decisions made (black-box AI vs auditable rule engine).

## Decision

**Hybrid architecture:**

1. **Image analysis layer**: GPT-4o Vision API (OpenAI) — accepts base64-encoded image
   and symptom context; returns structured JSON with condition classifications and confidence scores.

2. **Pathway routing layer**: Deterministic rule engine (TypeScript/Python) — maps
   classified conditions + confidence scores to triage pathways using explicit rules.
   This layer is auditable, testable, and not an AI black box.

3. **Image storage**: Ephemeral only — the image is base64-encoded in memory, sent to
   the GPT-4o Vision API over HTTPS, then discarded. No image is written to disk or FHIR.
   Only the AI output (condition codes, confidence scores, pathway) is persisted in FHIR.

4. **Fallback rule**: If GPT-4o returns confidence < 40% on all conditions, the rule engine
   defaults to pathway = `gp` (consult a doctor) regardless of any classification.

5. **Disclaimer**: Every triage result rendered in the UI includes: *"This is a triage guidance
   tool, not a medical diagnosis. Always consult a healthcare professional for medical advice."*

## Options Considered

| Option | Pros | Cons |
|---|---|---|
| GPT-4o Vision API + rule engine (selected) | Fast to market; proven image understanding; auditable routing; no training data needed | API cost per call; OpenAI dependency; PHI must not be sent in image (mitigated by ephemeral processing) |
| Custom-trained vision model | Full control; no API cost at scale | Months of training data collection; regulatory implications of custom ML model |
| Azure AI Health Insights | HIPAA-eligible; purpose-built for health | US-focused; limited Canadian SNOMED CT support; higher cost |
| Rules-only (no AI) | Fully deterministic; no AI risk | Cannot analyse images; defeats core product purpose |

## Consequences

**Positive:**
- No training pipeline or ML infrastructure required for v1
- GPT-4o Vision is state-of-the-art for image + text multimodal classification (2026)
- Deterministic rule engine makes routing auditable and testable (unit testable)
- Ephemeral image processing satisfies PHIPA data minimisation principle
- Confidence scoring enables conservative escalation for patient safety

**Negative / Trade-offs:**
- OpenAI API dependency — if API is unavailable, the app cannot perform triage (mitigation: graceful degradation to "consult a doctor" fallback)
- PHI risk in image (mitigated: images are never stored; API calls use TLS 1.2+; no patient identifiers included in image payload)
- Per-call cost — mitigated by caching rule engine output and not re-calling for duplicate conditions

## Healthcare Compliance Notes

**PHIPA (Ontario)**: Image is processed ephemerally and not stored — data minimisation principle satisfied.
No biometric data is retained. The FHIR ClinicalImpression resource stores only the AI output
(condition codes, confidence), not the source image.

**OpenAI data handling**: API calls must use the default API (not training-enabled tier).
Ensure OpenAI data processing agreement is in place before production launch.

**Liability**: AI output is triage guidance only. No clinical decision liability attaches
to the software. User consent and disclaimer acknowledgement are captured via FHIR Consent
resource before any triage is performed.

## References

- OpenAI GPT-4o Vision API: https://platform.openai.com/docs/guides/vision
- PHIPA data minimisation: Ontario Regulation 329/04, Section 6
- FHIR ClinicalImpression: https://hl7.org/fhir/R4/clinicalimpression.html
