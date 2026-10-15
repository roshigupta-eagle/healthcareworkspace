# FHIR and Terminology Decision — telehealth-browser-media

**Reviewer:** Alex (FHIR SME Architecture)
**Jurisdiction:** Ontario, Canada; FHIR R4

## Decision

This increment does not create, update, project, or exchange FHIR resources. `CallSession`, opaque LiveKit room IDs, temporary media identities, connection state, and short-lived join tokens remain operational implementation data.

## Prohibited mappings

- Do not map technical room or participant state to `Communication.status`.
- Do not create `Encounter`, `Communication`, `Task`, `DocumentReference`, `AuditEvent`, or `Provenance` as a side effect of joining local media.
- Do not select a terminology binding or claim conformance to an Ontario IG.

## Review conclusion

No FHIR or terminology implementation is in scope for the local media slice. Any future clinical record, consent, appointment, encounter, or audit projection requires a named Ontario/program IG and separate Alex/Morgan review.
