# Brain Connected Atlas — implementation brief

**Status:** in progress
**Route:** `/dashboard?asUser=dev&mode=patient-focus&patientId=patient-003&organ=brain`

## Outcome

Add a generic, evidence-aware educational Brain Atlas to the Brain organ view. It must make every requested expansion Part 81–180 directly discoverable, provide five learner levels, and preserve the existing boundary between patient data and generic anatomy/education.

## Guardrails

- Never infer a diagnosis, finding, measurement, or care recommendation from `patient-003`.
- Mark the model and atlas as generic educational material, not patient imaging.
- Keep volatile guideline details behind links to authoritative sources and flag them for current-review.
- Include a conspicuous emergency message for sudden neurologic symptoms; do not encode treatment thresholds, doses, or procedural instructions.

## Acceptance checks

- Brain guide opens only from the registry-declared Brain entry and can be closed by Escape.
- Search, learner-level switching, keyboard navigation, evidence/source labels, and coverage audit work without network access.
- A data test proves Parts 81–180 are present exactly once, foundation coverage 1–80 is complete, sources are HTTPS, and required content fields exist.
- Existing local delivery remains intact; an external deploy target is not assumed when none is configured.
