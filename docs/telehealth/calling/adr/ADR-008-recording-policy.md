# ADR-008: Recording and Transcription Are Disabled by Default

**Status:** Accepted for the current scope; any enablement is separately gated.

## Context

Clinical call recording and transcription create high-risk sensitive media, consent, retention, access, jurisdiction, and provider obligations. No approved recording/transcription provider, policy, storage, retention schedule, access model, or consent workflow is configured.

## Decision

Set the default organizational policy to `recording_enabled = false`. Do not automatically record, transcribe, or send audio/video/transcripts to AI. The calling phase records only operational call state and permitted technical quality summaries.

If a future approved organization requests recording, require explicit organization policy, authorized user action, applicable consent/notice, provider action, durable audit, secure storage, authorized access, retention/deletion, and incident/recovery procedures before use.

## Alternatives

- Record all calls by default: rejected.
- Treat media connection as consent: rejected.
- Implement transcription as a harmless technical feature: rejected.

## Consequences

- The UI must not show recording/transcription as active or available unless all gates are satisfied.
- Call disposition and technical quality remain separate from media content.
- Future requirements need a dedicated policy/data-protection assessment and provider implementation.

## Risks

Jurisdiction-specific consent, retention, data residency, privileged workflow, notification, participant visibility, and accessibility requirements are unverified. This ADR does not establish legal compliance.

## Rollback and replaceability

The safe default is no recording. Any later feature flag can be disabled before new recordings begin; retention, access, and deletion obligations for already created recordings require their own approved process.
